# ProfeFlow - Copilot Instructions

## Orientation
- Next.js 14 App Router with TypeScript + Tailwind; every user-facing string must remain in Spanish.
- Supabase backend (PostgreSQL + RLS) powers auth, créditos, planificaciones, portafolios; AI features rely on OpenAI y Anthropic.
- Key roots: app/ (routes, server components), components/ (UI + dashboards), lib/supabase/* (client factories, types), supabase/functions/ (Deno Edge Functions).

## Architecture & Auth
- `middleware.ts` injects Supabase SSR auth, redirects sin sesión a `/login` y exige `profiles.role === 'admin'` bajo `/admin`.
- `app/(dashboard)/layout.tsx` (server) ejecuta `ensureProfileForUser` de `lib/supabase/profiles.ts`; fallas firman la sesión y envían a `/onboarding`.
- Acciones en `app/(auth)/actions.ts` unifican login/signup/signout; conserva URLs de retorno y mensajes en línea con el flujo actual.

## Supabase Conventions
- Usa la fábrica correcta: servidor (`lib/supabase/server.ts`), navegador (`lib/supabase/client.ts`) o service role (`lib/supabase/admin.ts`); jamás expongas el cliente admin en componentes cliente.
- Valida `env` mediante `lib/supabase/config.ts`; captura `MissingSupabaseEnvError` con `isMissingSupabaseEnvError` para responder con pistas en español.
- Contratos de datos viven en `lib/supabase/types.ts`; reutiliza `Profile`, `Planificacion`, `Evaluacion` para respetar los JSONB esperados.

## AI & Credit Flows
- `app/api/planificaciones/generar/route.ts`: autentica sesión, aplica límites mensuales en `profiles`, llama a OpenAI, persiste el plan JSON y aumenta contadores.
- `hooks/useAIAnalysis.ts` invoca Edge Functions (`supabase/functions/analizar-planificacion`, `analizar-portafolio-completo`, etc.) enviando el bearer token; espera logging de costo/latencia y actualizaciones vía RPC.
- Edge Functions corren en Deno; importa vía `https://esm.sh/*`, valida encabezados Supabase y registra `prompt_tokens`, `completion_tokens` y `costo_usd` antes de escribir en `analisis_ia_portafolio`.

## Supabase Edge Functions
- `supabase/functions/*` usa Deno + `deno.json`; ejecuta pruebas con `deno task test`, `test:integration`, etc. No uses `npm` ni dependencias Node no soportadas.
- Autenticación siempre con `Authorization` del request → `crearClienteSupabase` en `shared/utils.ts` → `supabase.auth.getUser()`; si falla responde 401.
- Reutiliza utilidades en `shared/` (`Logger`, `calcularCosto`, `document-processor`) para registrar en `function_logs`, guardar análisis en `analisis_ia_portafolio`/`evaluaciones_indicador` y disparar métricas vía RPC como `actualizarMetricas`.
- Búsquedas contextuales usan RPC `buscar_rubricas_similares` (vector embeddings); mantén prompts y respuestas JSON alineados con los tipos en `shared/types.ts`.

## UI & Data Patterns
- Arma UI con `components/ui/*` y `cn()`; dashboards dependen de `components/Sidebar.tsx`, `ToastProvider` y esqueletos en `components/skeletons/`.
- Exportaciones PDF pasan por `components/ExportPDFButton.tsx`; conserva la lógica de watermark según `profile.plan`.
- Feature flags usan Hypertune (`flags.ts`, `lib/flags/*`); evalúa en servidor y propaga a Sidebar/dashboards para ocultar secciones.

## Developer Workflows
- Comandos base: `npm run dev`, `npm run build && npm run start`, `npm run lint`; inicializa BD aplicando `sql/schema/*.sql` y luego `supabase/migrations/`.
- Scripts admin en `scripts/` (`create-admin.js`, `seed-rubricas-mbe.ts`, `run-migrations.ts`) requieren service role; no los mezcles en bundles cliente.
- Al tocar esquema: agrega migración SQL, sincroniza `lib/supabase/types.ts` y revisa Edge Functions que lean esos campos.

## Gotchas
- Toda copia UI/API debe quedar en español neutro chileno.
- RLS es estricto: usa el cliente service role para lecturas/escrituras cruzadas (bootstrap de perfiles, panel admin).
- Nuevos prompts LIA o exports deben mantener formatos JSON esperados y actualizar contadores de crédito de forma consistente.