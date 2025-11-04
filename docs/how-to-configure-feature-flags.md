# How To Configure Feature Flags usando Hypertune y Vercel

Esta guía explica cómo integrar y operar los feature flags de Hypertune dentro del proyecto desplegado en Vercel. Sigue los pasos en orden para asegurar que los entornos local, de previsualización y producción compartan la misma configuración de flags.

## 1. Conecta el proyecto con Vercel

1. Inicia sesión en Vercel y agrega el repositorio si aún no lo has hecho.
2. En tu entorno local, vincula el proyecto existente con:
   ```bash
   vercel link
   ```
   Esto creará el archivo `.vercel/project.json` y asociará el proyecto local con el dashboard de Vercel.

## 2. Sincroniza las variables de entorno

1. En el dashboard de Vercel, define las variables de entorno necesarias (por ejemplo, claves de Supabase, OpenAI y Hypertune).
2. Descarga la versión más reciente de las variables para desarrollo local:
   ```bash
   vercel env pull .env.development.local
   ```
   Ajusta el nombre del archivo si necesitas otro target (por ejemplo `.env.local`).
   > 🛠️ Si necesitas forzar manualmente los flags sin depender de Hypertune, puedes definir las variables `NEXT_PUBLIC_FEATURE_MENU_ITEM_INICIO`, `NEXT_PUBLIC_FEATURE_MENU_ITEM_PLANIFICA`, `NEXT_PUBLIC_FEATURE_MENU_ITEM_EVALUA`, `NEXT_PUBLIC_FEATURE_MENU_ITEM_MI_CARRERA`, `NEXT_PUBLIC_FEATURE_MENU_ITEM_EMPLEO` y `NEXT_PUBLIC_FEATURE_MENU_ITEM_SALUD`. Asigna valores `true`/`false` (o `1`/`0`) según corresponda.

## 3. Crea tu primer feature flag en Hypertune

1. Desde Vercel, abre la integración **Hypertune** y pulsa **Open in Hypertune**.
2. En el panel de Hypertune crea un nuevo proyecto (si no existe) y define al menos un flag. Por ejemplo:
   - **Key**: `menuItemInicio`
   - **Tipo**: booleano
   - **Default**: `true`
3. Publica los cambios para que las declaraciones estén disponibles para la generación de tipos.

## 4. Instala los paquetes necesarios

Ejecuta en la raíz del proyecto:
```bash
npm install flags @flags-sdk/hypertune hypertune server-only @vercel/edge-config
```
Esto añade el SDK de Flags, el adaptador de Hypertune, las utilidades para entornos server-only y la integración de Edge Config usada por Hypertune.

## 5. Configura las variables de Hypertune para la generación de tipos

Añade las siguientes variables en tu archivo de entorno (`.env.development.local`, `.env.local` o el que prefieras) **exactamente con estos nombres**:
```env
HYPERTUNE_FRAMEWORK=nextApp
HYPERTUNE_OUTPUT_DIRECTORY_PATH=generated
```
> ℹ️ **No uses el prefijo `NEXT_`**. Hypertune lee estas claves en tiempo de build/CLI, no desde el runtime del navegador. Prefijarlas con `NEXT_` las expondría como variables públicas de Next.js sin aportar ningún beneficio y además impediría que el generador detecte los nombres esperados.
Estas variables indican a Hypertune el framework que utilizas (Next.js App Router) y dónde debe escribir los tipos generados.

## 6. Genera los tipos de Hypertune

Con las variables configuradas, ejecuta:
```bash
npx hypertune
```
El comando descargará las definiciones de tus flags y generará el archivo `generated/hypertune.ts`. Comprueba que el archivo esté versionado en git para compartir los tipos con el resto del equipo.

## 7. Crea `flags.ts`

Genera el archivo `flags.ts` en la raíz del proyecto (o revisa que exista). Debe exportar:
- Una función `identify` que construye el contexto (`Context`) usado por Hypertune.
- Un `hypertuneAdapter` creado con `createHypertuneAdapter`.
- Una función por cada flag declarada (por ejemplo `menuItemInicioFlag`).
- Un helper como `getRoadmapCategoryFlags` para resolver múltiples flags simultáneamente.

Ejemplo simplificado:
```ts
import 'server-only'
import { Identify } from 'flags'
import { dedupe, flag } from 'flags/next'
import { createHypertuneAdapter } from '@flags-sdk/hypertune'
import {
  createSource,
  flagFallbacks,
  vercelFlagDefinitions as flagDefinitions,
  Context,
  RootFlagValues,
} from './generated/hypertune'

const identify: Identify<Context> = dedupe(async () => {
  return {
    environment: process.env.NODE_ENV,
    user: null,
  }
})

const hypertuneAdapter = createHypertuneAdapter<RootFlagValues, Context>({
  createSource,
  flagFallbacks,
  flagDefinitions,
  identify,
})

export const menuItemInicioFlag = flag(
  hypertuneAdapter.declarations.menuItemInicio,
)
```
Adapta el contenido de `identify` al contexto real de tu aplicación (por ejemplo, leer el ID del usuario autenticado desde cookies o headers).

## 8. Consume los flags en componentes del servidor

Para usar los flags dentro de componentes del App Router, importa y evalúa las funciones asíncronas expuestas en `flags.ts`:

```tsx
import { menuItemInicioFlag } from '@/flags'

export default async function DashboardInicio() {
  const menuItemInicioEnabled = await menuItemInicioFlag()

  if (!menuItemInicioEnabled) {
    return null
  }

  return <section>Contenido de Inicio</section>
}
```

También puedes evaluar varios flags simultáneamente utilizando el helper `getRoadmapCategoryFlags` y pasarlos como props a componentes cliente.

## 9. Implementa los flags en el dashboard

En este repositorio, el layout del dashboard (`app/(dashboard)/layout.tsx`) obtiene el estado de los flags y lo pasa al componente `Sidebar`. Asegúrate de que las nuevas secciones que agregues verifiquen el flag correspondiente antes de renderizarse.

## 10. Despliega y verifica

1. Sube los cambios al repositorio y despliega en Vercel.
2. En Hypertune, actualiza reglas y segmentaciones según sea necesario (por ejemplo, habilitar un flag solo para administradores).
3. Recarga la aplicación en cada entorno para confirmar que los cambios de Hypertune se reflejan sin necesidad de redeploy.

---

Con estos pasos tendrás un pipeline completo para administrar feature flags con Hypertune y Vercel, garantizando que cualquier persona del equipo pueda crear, probar y lanzar funcionalidades de forma progresiva.
