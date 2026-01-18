# ProfeFlow - Copilot Instructions

## Orientation
ProfeFlow is a SaaS platform for Chilean teachers using Next.js 14 App Router + TypeScript + Tailwind. Core features: AI-powered lesson planning aligned with MINEDUC curriculum, portfolio analysis for teacher evaluation (Marco para la Buena Enseñanza), and credit-based usage tracking.

**Critical**: All user-facing text must be in Spanish (neutral Chilean).

## Architecture Overview

### Routing & Auth Flow
- **`proxy.ts`** (middleware): Handles Supabase SSR auth; redirects unauthenticated users to `/login`; enforces `profiles.role === 'admin'` for `/admin/*` routes
- **`app/(dashboard)/layout.tsx`**: Server component that runs `ensureProfileForUser()` from `lib/supabase/profiles.ts` to bootstrap profiles from `auth.users`; failures trigger signout → `/onboarding?status=profile-error`
- **`app/(auth)/actions.ts`**: Centralized server actions for login/signup/signout with redirect handling

### Supabase Client Selection (CRITICAL)
Choose the correct factory based on context:
- **Server components/routes**: `createClient()` from `lib/supabase/server.ts` (SSR-aware cookies)
- **Client components**: `createBrowserClient()` from `lib/supabase/client.ts`
- **Admin operations**: `createAdminClient()` from `lib/supabase/admin.ts` (bypasses RLS)
  - ⚠️ **Never** expose admin client to browser bundles
  - Used for profile bootstrapping, cross-user admin operations

Example:
```typescript
// Server component
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Client component
import { createBrowserClient } from '@/lib/supabase/client'
const supabase = createBrowserClient()
```

### Database & Types
- Schema defined in `sql/schema/*.sql` (apply first), then `supabase/migrations/*.sql`
- Type contracts in `lib/supabase/types.ts` (Database interface); use `Profile`, `Planificacion`, `Evaluacion` types
- RLS is strict: admin client bypasses; regular clients respect `auth.uid()` policies
- Vector search uses `pgvector` extension; RPC functions like `buscar_rubricas_similares()` handle similarity queries

## AI & Credit System

### Credit Flow Pattern
1. **Route handler** (`app/api/planificaciones/generar/route.ts`):
   - Authenticate: `supabase.auth.getUser()`
   - Fetch profile: check `creditos_usados_* >= creditos_*` for plan limits (FREE plan enforced)
   - Call OpenAI/Anthropic
   - Persist result (JSON in DB)
   - Increment `creditos_usados_planificaciones` via update

2. **Edge Functions** (`supabase/functions/*`):
   - **Runtime**: Deno (not Node); import via `https://esm.sh/*`
   - **Auth**: Extract `Authorization` header → `crearClienteSupabase()` in `shared/utils.ts` → `supabase.auth.getUser()`
   - **Cost tracking**: Use `calcularCosto()` to compute `costo_usd` from `prompt_tokens`/`completion_tokens`; write to `analisis_ia_portafolio` or `function_logs`
   - **Testing**: `deno task test`, `deno task test:integration` (see `supabase/functions/deno.json`)

Example Edge Function auth:
```typescript
import { crearClienteSupabase, autenticarUsuario } from '../shared/utils.ts'

const supabase = crearClienteSupabase(req.headers.get('Authorization'))
const user = await autenticarUsuario(supabase) // throws if unauthorized
```

### RAG & Embeddings
- Documents stored in `documentos_oficiales` with `embedding` (vector) column
- RPC functions (`sql/functions/embedding-functions.sql`): `generar_embedding_documento()`, `buscar_documentos_similares()`
- Edge Function `generar-embedding-documento` processes PDFs → chunks → embeddings → storage

## Feature Flags
- **Source**: Hypertune SDK (`flags.ts`, `lib/flags/*`)
- **Pattern**: Evaluate flags in server components/routes; pass boolean props to client components
- **Usage**: `menuItemInicioFlag.get()` returns boolean; controls Sidebar menu visibility

Example:
```typescript
// Server component
import { menuItemPlanificaFlag } from '@/flags'
const showPlanifica = menuItemPlanificaFlag.get()
return <Sidebar showPlanifica={showPlanifica} />
```

## UI Patterns
- **Styling**: Tailwind + `lib/utils.ts`'s `cn()` utility for class merging
- **Components**: `components/ui/*` for primitives; `components/admin/*` for admin dashboard
- **Loading states**: Use skeletons from `components/skeletons/DashboardShellSkeleton.tsx`
- **PDF exports**: `components/ExportPDFButton.tsx` handles watermarking based on `profile.plan`

## Developer Workflows

### Local Development
```bash
npm run dev                  # Start dev server (port 3000)
npm run build && npm start   # Production build + server
npm run lint                 # ESLint
```

### Database Setup
1. Apply schema: Run `sql/schema/*.sql` in Supabase SQL Editor (order: `supabase-schema.sql`, `ai-analysis.sql`, `portafolio-schema.sql`)
2. Run migrations: `supabase/migrations/*.sql` (sorted by filename timestamp)
3. Verify types: Regenerate `lib/supabase/types.ts` if schema changes

### Admin Operations
```bash
npm run admin:create        # Create admin user (requires .env.local)
npm run seed:rubricas       # Seed MBE rubrics (tsx script)
```

### Testing Edge Functions
```bash
cd supabase/functions
deno task test              # Run all tests
deno task test:monitor      # Test specific function
```

### ETL & Scraping
- **Edge Function**: `extraer-bases-curriculares` scrapes MINEDUC curriculum
- **Admin UI**: `/admin/etl` dashboard for monitoring processes
- **Storage**: Generated CSVs → `documentos-transformados` bucket
- **Tables**: `procesos_etl` (process logs), `documentos_transformados` (file metadata)

## Critical Gotchas

### Environment Variables
- **Required**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`
- **Validation**: `lib/supabase/config.ts` throws `MissingSupabaseEnvError` with Spanish hints
- **Pattern**: Catch with `isMissingSupabaseEnvError()` in API routes

### RLS & Admin Access
- Admin routes protected by `proxy.ts` middleware checking `profiles.role === 'admin'`
- Use admin client for operations that need to bypass RLS (profile creation, cross-user queries)
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client

### Migration Naming
- Format: `YYYYMMDD###_description.sql` (e.g., `20260117001_fix_rls_recursion.sql`)
- CI/CD: GitHub Actions auto-applies migrations on merge to `main` (see `.github/workflows/deploy-and-migrate.yml`)

### Spanish-Only UI
- All error messages, labels, buttons must be in Spanish
- Use neutral Chilean Spanish (avoid regionalisms)
- Example: "planificaciones" not "planes", "créditos" not "creditos"

## Roles & Permissions System

### Architecture
ProfeFlow uses a **dual-layer role system**:
1. **Legacy field**: `profiles.role` (string: 'admin' | 'user') - kept for backwards compatibility
2. **Modern system**: `profiles.role_id` → `roles.id` (UUID foreign key) with flexible permissions

### Role Structure (table: `roles`)
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  nombre TEXT NOT NULL,           -- Display name: "Administrador", "Usuario Estándar"
  codigo TEXT UNIQUE NOT NULL,    -- System code: 'admin', 'user', 'maintainer'
  descripcion TEXT,               -- Role description
  permisos JSONB DEFAULT '[]',    -- Feature permissions array
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

### Default Roles
- **admin**: Full system access (user management, ETL, AI config, analytics)
- **user**: Standard teacher access (create planificaciones, portfolio analysis)
- **maintainer** (optional): Technical ops role (ETL monitoring, system health)

### Permission Checking Patterns

#### Middleware Level (`proxy.ts`)
```typescript
import { isUserAdmin } from '@/lib/supabase/admin'

// Protects ALL /admin/* routes
if (request.nextUrl.pathname.startsWith('/admin')) {
  const userIsAdmin = await isUserAdmin(user.id)
  if (!userIsAdmin) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
}
```

#### API Route Level
```typescript
import { createClient } from '@/lib/supabase/server'
import { isUserAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  
  // CRITICAL: Always use admin client helper to bypass RLS
  const isAdmin = await isUserAdmin(user.id)
  if (!isAdmin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  
  // Now safe to use createAdminClient() for cross-user operations
  const adminClient = createAdminClient()
  // ... admin operations
}
```

#### Component Level (Sidebar, UI)
```typescript
// Server component
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

const isAdmin = profile.role === 'admin'

return <Sidebar showAdminMenu={isAdmin} />
```

### Admin Operations

#### User Management API (`/api/admin/usuarios`)
- **GET**: Fetches all users via `profiles_with_roles` view (joins profiles + roles)
- **POST**: Creates user in `auth.users` + `profiles` with auto-confirmed email
- **PUT**: Updates user profile, credits, and role assignment
- **DELETE**: Soft-deletes users (removes from auth, marks inactive in profiles)

Example POST payload:
```json
{
  "email": "profesor@escuela.cl",
  "password": "temp123",
  "nombre": "María González",
  "asignatura": "Matemáticas",
  "nivel": "8° Básico",
  "plan": "free",
  "roleId": "uuid-from-roles-table"
}
```

#### Role Management API (`/api/admin/roles`)
- **GET**: Lists all roles with permissions
- **POST**: Creates custom roles with JSONB permissions array
- **PUT**: Updates role metadata and permissions
- **DELETE**: Deactivates roles (sets `activo = false`)

### RLS Security Model

**Critical**: Admin client (`createAdminClient()`) bypasses ALL RLS policies. Use only for:
- Profile bootstrapping in `ensureProfileForUser()`
- Cross-user admin operations (user list, credit adjustments)
- System-level queries (ETL stats, analytics aggregates)

**Regular client** (`createClient()`) respects RLS:
```sql
-- profiles table: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Admin bypass happens at client level, NOT via policy
```

### Permission Expansion Pattern

To add granular permissions (e.g., `can_manage_etl`, `can_view_analytics`):

1. **Update roles table**:
```typescript
// In migration or via Supabase Studio
UPDATE roles 
SET permisos = '["planificaciones.create", "etl.execute", "analytics.view"]'::jsonb
WHERE codigo = 'maintainer'
```

2. **Check in API route**:
```typescript
const { data: profile } = await adminClient
  .from('profiles_with_roles')
  .select('role_permisos')
  .eq('id', userId)
  .single()

const permisos = profile.role_permisos || []
if (!permisos.includes('etl.execute')) {
  return NextResponse.json({ error: 'Permiso insuficiente' }, { status: 403 })
}
```

3. **Helper function** (recommended):
```typescript
// lib/supabase/permissions.ts
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('profiles_with_roles')
    .select('role_permisos')
    .eq('id', userId)
    .single()
  
  return (data?.role_permisos || []).includes(permission)
}
```

### Key Files Reference
- Auth & Roles: `proxy.ts`, `lib/supabase/admin.ts`, `app/api/admin/{usuarios,roles}/route.ts`
- AI: `app/api/planificaciones/generar/route.ts`, `supabase/functions/analizar-*/index.ts`
- DB: `sql/schema/*.sql`, `supabase/migrations/20250115001_user_role_management.sql`, `lib/supabase/types.ts`
- Docs: `docs/USER_ROLE_MANAGEMENT.md`, `docs/ETL_BASES_CURRICULARES.md`, `docs/DEPLOYMENT_GUIDE.md`, `CLAUDE.md`