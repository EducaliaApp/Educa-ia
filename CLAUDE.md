# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

ProfeFlow is a SaaS platform for Chilean teachers that generates curriculum-aligned lesson plans and evaluates student work using AI. The app is specifically designed for the Chilean educational system (MINEDUC curriculum) and includes portfolio analysis for teacher evaluation using the Marco para la Buena Enseñanza (MBE) framework.

**Critical**: All user-facing copy stays in Spanish.

## Tech Stack

- Next.js 14 App Router + TypeScript + Tailwind
- Supabase (PostgreSQL with Row Level Security)
- AI: OpenAI GPT-4 + Anthropic Claude
- Edge Functions: Deno TypeScript (in `supabase/functions/`)
- Feature Flags: Hypertune

## Development Commands

```bash
# Development
npm run dev              # Start dev server on port 3000

# Build
npm run build           # Build for production
npm start               # Run production build
npm run lint            # Run ESLint

# Database & Admin
npm run admin:create         # Create admin user (requires .env.local)
npm run admin:create-sql     # Generate SQL for manual admin creation
npm run admin:setup          # Instructions for RLS policies
npm run seed:rubricas        # Seed MBE rubrics to database
npm run migrate             # Run migrations

# Feature Flags
npm run flags:test      # Test feature flag status
```

## Environment Setup

Required `.env.local` variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=sk-...

# Optional
ANTHROPIC_API_KEY=...
RESEND_API_KEY=...
NEXT_PUBLIC_SITE_URL=...
```

See `docs/SETUP-ENV.md` for detailed setup. Bootstrap database by running schema files in `sql/schema/` in Supabase SQL Editor, then migrations in `supabase/migrations/`.

## Architecture

### Routing Structure

- **`app/(auth)/`**: Public auth pages (`/login`, `/register`, `/forgot-password`)
- **`app/(dashboard)/dashboard/`**: Protected teacher dashboard
- **`app/admin/`**: Admin panel (requires `profiles.role === 'admin'`)
- **`app/api/`**: Next.js API routes

### Auth & Middleware Flow

**`middleware.ts`** wires Supabase SSR auth:
- Protects `/dashboard` and `/admin` routes
- Admin routes require `profiles.role === 'admin'` check
- Redirects authenticated users away from `/login`

**`app/(dashboard)/layout.tsx`** (server component):
- Calls `ensureProfileForUser()` from `lib/supabase/profiles.ts`
- Creates/updates profile from `auth.users` metadata
- On failure: signs out and redirects to `/onboarding?status=profile-error`

**`app/(auth)/actions.ts`**: Centralized login/signup/signout server actions

### Supabase Client Selection

**Critical pattern**: Choose clients by context:

- **Server components/routes**: `createClient()` from `lib/supabase/server.ts` (SSR-aware)
- **Client components**: `createBrowserClient()` from `lib/supabase/client.ts`
- **Admin/service operations**: `createAdminClient()` from `lib/supabase/admin.ts`
  - **Never expose admin client to browser**
  - Used to bypass RLS (profile creation, admin operations)

### Configuration & Error Handling

**`lib/supabase/config.ts`**: Centralized env validation
- Throws `MissingSupabaseEnvError` with Spanish hints
- Accepts both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL` (fallback pattern)
- Wrap API routes with `isMissingSupabaseEnvError()` when surfacing failures

### Database Patterns

**Types**: `lib/supabase/types.ts` contains `Database`, `Profile`, `Planificacion`, `Evaluacion` types

**Key tables**:
- `profiles`: Extends `auth.users`, manages plan (free/pro), credits, role
- `planificaciones`: AI-generated lesson plans (JSONB `contenido` field)
- `portafolios`, `tareas_portafolio`: Portfolio system for MBE evaluation
- `analisis_ia_portafolio`: AI analysis results with cost/latency tracking
- `rubricas_mbe`: Official MBE 2025 rubrics with vector embeddings
- `metricas_uso`: Usage metrics per user

**RLS**: All tables have Row Level Security enabled. Users can only access their own data (filtered by `user_id`). Admin users have broader access. Service role bypasses RLS.

### AI Generation Workflows

#### 1. Plan Generation (Next.js API Route)

**`app/api/planificaciones/generar/route.ts`**:
1. Authenticate via Supabase
2. Fetch `profiles` → check plan & credit limits
3. For FREE plan: verify `creditos_usados_planificaciones < creditos_planificaciones`
4. Call OpenAI `chat.completions` with Chilean curriculum prompt
5. Parse JSON response, insert into `planificaciones` table
6. Increment `creditos_usados_planificaciones`

**Credit System**:
- FREE: 5 planificaciones/month, 3 evaluaciones/month, PDF with watermark
- PRO: Unlimited, PDF without watermark

#### 2. Portfolio Analysis (Edge Functions)

**Frontend**: `hooks/useAIAnalysis.ts` fetches Supabase Edge Functions with session bearer token

**Edge Function Example**: `supabase/functions/analizar-planificacion/index.ts`
1. Authenticate via `Authorization` header
2. Fetch task context from `tareas_portafolio` + joins
3. Retrieve MBE rubrics via vector similarity search (`buscar_rubricas_similares` RPC)
4. Construct detailed prompt with official MBE criteria
5. Call OpenAI/Claude with `response_format: { type: 'json_object' }`
6. Calculate `categoria_logro` (A-E scale) and `nivel_desempeño`
7. Save analysis to `analisis_ia_portafolio` with tokens/cost/latency
8. Update `metricas_uso` via RPC

**Important**: Edge functions run on Deno. Set `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` in Supabase dashboard under Edge Functions secrets.

### UI Conventions

- Base components: `components/ui/*` (Button, Card, Select, Toast)
- Compose Tailwind with `cn()` from `lib/utils.ts`
- Layout chrome: `Sidebar` and `ToastProvider` in dashboard layout
- PDF exports: `components/ExportPDFButton.tsx` (jsPDF + watermark for FREE plans)

### Feature Flags

- Library: Hypertune (`@flags-sdk/hypertune`)
- Usage: `await getRoadmapCategoryFlags()` (server-side only)
- Controls visibility in `Sidebar` component

## Important Patterns from Copilot Instructions

### Planificacion JSONB Structure

```typescript
contenido: {
  titulo: string
  objetivosAprendizaje: string[]
  clases: Array<{
    numero: number
    titulo: string
    objetivo: string
    inicio: string
    desarrollo: string
    cierre: string
    materiales: string[]
    indicadores: string[]
  }>
  evaluacion: string
  recursos: string[]
}
```

### AI Prompt Best Practices

- Lesson plans: See `app/api/planificaciones/generar/route.ts` for curriculum-aligned prompt
- MBE analysis: See `supabase/functions/analizar-planificacion/index.ts` for evaluation criteria
- Use `temperature: 0.7` for creative generation, `0.3` for consistent evaluation
- Always validate `OPENAI_API_KEY` exists before calling API

### Cost Tracking in Edge Functions

Track AI usage in `analisis_ia_portafolio`:
- `prompt_tokens`, `completion_tokens`
- `costo_usd` (calculated per model pricing)
- `latencia_ms`
- Update aggregated metrics via `incrementar_metricas_uso` RPC

## Common Workflows

### Adding a New Edge Function

1. Create `supabase/functions/[name]/index.ts`
2. Use Deno imports: `https://esm.sh/openai@4`, `https://deno.land/std@0.168.0/http/server.ts`
3. Authenticate via `req.headers.get('Authorization')`
4. Call AI model, track tokens/cost/latency
5. Save results to database
6. Update metrics via `actualizarMetricas()` or RPC
7. Deploy: Set secrets in Supabase dashboard first

### Updating Database Schema

1. Add migration: `supabase/migrations/[number]_[description].sql`
2. Update RLS policies if needed
3. Update `lib/supabase/types.ts` if schema changes
4. For initial setup, run schema files in order:
   - `sql/schema/supabase-schema.sql`
   - `sql/schema/portafolio-schema.sql`
   - `sql/schema/ai-analysis.sql`
   - Then numbered migrations

### Credit Limit Enforcement

Always check before AI operations:
```typescript
if (profile.plan === 'free') {
  if (profile.creditos_usados_planificaciones >= profile.creditos_planificaciones) {
    return NextResponse.json(
      { error: 'Has alcanzado el límite de planificaciones para tu plan FREE' },
      { status: 403 }
    )
  }
}
```

## Key Gotchas

- **Edge Functions**: Use Deno imports (`https://esm.sh/`), not Node.js `require()`
- **Admin Client**: Never expose `createAdminClient()` to browser code
- **Profile Creation**: Must use admin client to bypass RLS in `ensureProfileForUser()`
- **Spanish Errors**: All user-facing messages in Spanish, including validation errors
- **JSONB Queries**: Use `->>` for text, `->` for JSON objects in Supabase queries
- **TypeScript**: `supabase/functions` excluded from `tsconfig.json` (Deno environment)
- **Path Aliases**: `@/` maps to project root
- **RLS Policies**: Setup via `sql/admin/supabase-admin-setup.sql`

## Code Style

- TypeScript strict mode enabled
- Prefer server components over client components
- Use `'use client'` directive only for hooks/event handlers
- Import types from `lib/supabase/types.ts` for database operations
- Edge functions record cost/latency and lean on Supabase RPC helpers (see `sql/`)