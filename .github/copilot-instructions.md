# ProfeFlow - Copilot Instructions

## Orientation
- Next.js 14 App Router + TypeScript + Tailwind; all user-facing copy stays in Spanish.
- App serves Chilean teachers; curriculum + evaluación flows rely on Supabase-backed JSON.
- Key directories: app/ (routes), components/, lib/supabase/, supabase/functions/ (Edge Functions in Deno).

## Auth & Routing
- `middleware.ts` wires Supabase SSR auth, redirects `/login`, protects `/dashboard` and `/admin` (requires `profiles.role === 'admin'`).
- `app/(dashboard)/layout.tsx` (server component) calls `ensureProfileForUser` from `lib/supabase/profiles.ts`; on failure it signs out and sends teachers to `/onboarding`.
- `app/(auth)/actions.ts` centralizes login/signup/signout; keep redirect targets aligned with middleware expectations.

## Supabase Usage
- Choose clients by context: server (`lib/supabase/server.ts`), client (`lib/supabase/client.ts`), admin/service role (`lib/supabase/admin.ts`); never expose the admin client to the browser.
- `lib/supabase/config.ts` aggregates env fallbacks and throws `MissingSupabaseEnvError` with Spanish hints; wrap API routes with `isMissingSupabaseEnvError` when surfacing failures.
- Database shapes live in `lib/supabase/types.ts`; reuse `Profile`, `Planificacion`, `Evaluacion` types to keep inserts/updates aligned with the schema.

## AI & Credits
- Plan generation: `app/api/planificaciones/generar/route.ts` → Supabase auth → credit checks (`profiles.creditos_*`) → OpenAI `chat.completions` → insert into `planificaciones` → increment credit counters.
- Frontend analyses use `hooks/useAIAnalysis.ts`, which fetches Supabase Edge Functions like `supabase/functions/analizar-planificacion` with the session bearer token; keep function env vars (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) in Supabase.
- Edge functions record cost/latency and lean on Supabase RPC helpers (see `sql/`), so coordinate schema updates with function expectations.

## UI Conventions
- Base building blocks sit in `components/ui/*`; compose Tailwind classes with `cn()` from `lib/utils.ts` and honor provided `variant`/`size` props.
- Persist layout chrome via `Sidebar` and `ToastProvider`; new dashboard/admin sections should extend this skeleton instead of reinventing wrappers.
- PDF exports extend `components/ExportPDFButton.tsx` (jsPDF + watermark for FREE plans); reuse helper patterns when adding exports.

## Workflows
- Local dev: `npm run dev`; production build: `npm run build && npm run start`; lint before PRs with `npm run lint`.
- Bootstrap environment via `SETUP-ENV.md`; run Supabase schema under `sql/schema/` before exercising API routes.
- Edge Functions are TypeScript on Deno (`supabase/functions/*`); deploy through Supabase CLI and always gate them with Supabase auth headers as shown in existing handlers.