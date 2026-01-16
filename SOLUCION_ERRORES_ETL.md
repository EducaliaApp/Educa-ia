# Solución de Errores ETL - Panel Admin

## Problemas Identificados

### 1. Error CORS en Edge Function
```
Access to fetch at 'https://...supabase.co/functions/v1/extraer-bases-curriculares' 
from origin 'https://educa-ia-six.vercel.app' has been blocked by CORS policy
```

**Causa**: La Edge Function no tenía encabezados CORS configurados.

### 2. Errores 500 al obtener datos
```
Failed to load resource: the server responded with a status of 500 ()
Error fetching procesos: Object
Error fetching documentos: Object
```

**Causa**: 
- Las funciones RPC no tenían `SECURITY DEFINER`, lo que impedía bypass de RLS
- La Edge Function usaba autenticación de servicio en lugar de autenticación de usuario
- Faltaban permisos `EXECUTE` en las funciones RPC para usuarios autenticados
- Faltaban políticas de storage para el bucket `documentos-transformados`

## Cambios Realizados

### 1. Edge Function: `/supabase/functions/extraer-bases-curriculares/index.ts`

#### Agregados encabezados CORS
```typescript
// CORS headers - Configurar origen específico en producción
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Manejo de preflight
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders })
}
```

**Mejora de Seguridad**: El origen CORS es configurable via variable de entorno `ALLOWED_ORIGIN` para restringir acceso en producción.

#### Cambiada autenticación de servicio a usuario
**Antes**:
```typescript
import { crearClienteServicio, UnauthorizedError } from '../shared/service-auth.ts'
const supabase = crearClienteServicio(req)
```

**Después**:
```typescript
import { crearClienteSupabase, autenticarUsuario } from '../shared/utils.ts'

const authHeader = req.headers.get('Authorization')
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Authorization header es requerido' }), ...)
}

const supabase = crearClienteSupabase(authHeader)
const user = await autenticarUsuario(supabase)

// Verificar rol admin
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (profileError) {
  console.error('[AUTH] Error obteniendo perfil:', profileError)
  return new Response(JSON.stringify({ error: 'Error verificando permisos' }), { status: 500 })
}

if (!profile || profile.role !== 'admin') {
  console.warn('[AUTH] Acceso denegado - usuario no admin:', user.id)
  return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 })
}
```

**Mejora de Seguridad**: 
- Manejo explícito de errores de base de datos
- Logging de intentos de acceso no autorizado para auditoría

#### Agregado user.id a llamadas RPC
```typescript
const { data: proceso } = await supabase.rpc('iniciar_proceso_etl', {
  p_nombre: 'extraer_bases_curriculares',
  p_tipo_proceso: 'extraccion',
  p_descripcion: '...',
  p_configuracion: JSON.stringify({ force }),
  p_ejecutado_por: user.id,  // <- Agregado
})
```

### 2. Migración: `/supabase/migrations/20250116001_fix_etl_rpc_permissions.sql`

#### Agregado SECURITY DEFINER a funciones RPC
Las funciones ahora pueden bypass RLS para realizar operaciones:
- `iniciar_proceso_etl`
- `finalizar_proceso_etl`
- `agregar_log_proceso_etl`

```sql
CREATE OR REPLACE FUNCTION iniciar_proceso_etl(...)
RETURNS UUID
SECURITY DEFINER  -- <- Permite bypass de RLS
SET search_path = public
AS $$ 
DECLARE
    v_proceso_id UUID;
    v_ejecutor UUID;
BEGIN
    -- Determinar ejecutor con manejo explícito de NULL
    v_ejecutor := COALESCE(p_ejecutado_por, auth.uid());
    
    -- Log si no hay ejecutor (importante para auditoría)
    IF v_ejecutor IS NULL THEN
        RAISE WARNING 'iniciar_proceso_etl: No se pudo determinar ejecutor';
    END IF;
    
    INSERT INTO procesos_etl (...)
    VALUES (..., v_ejecutor)
    RETURNING id INTO v_proceso_id;
    
    RETURN v_proceso_id;
END;
$$ LANGUAGE plpgsql;
```

**Mejora de Seguridad**: Manejo explícito de NULL con warning logging cuando no se puede determinar el ejecutor.

#### Otorgados permisos EXECUTE
```sql
GRANT EXECUTE ON FUNCTION iniciar_proceso_etl(...) TO authenticated;
GRANT EXECUTE ON FUNCTION finalizar_proceso_etl(...) TO authenticated;
GRANT EXECUTE ON FUNCTION agregar_log_proceso_etl(...) TO authenticated;
```

#### Creadas políticas de storage
```sql
-- Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-transformados', 'documentos-transformados', false)
ON CONFLICT (id) DO NOTHING;

-- Política: admins tienen acceso total
CREATE POLICY "Admin full access on documentos-transformados bucket"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'documentos-transformados' 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);
```

## Pasos para Desplegar

### 1. Aplicar Migraciones en Supabase

**Opción A: Via Supabase Dashboard**
1. Ir a SQL Editor en dashboard de Supabase
2. Copiar contenido de `/supabase/migrations/20250116001_fix_etl_rpc_permissions.sql`
3. Ejecutar el script

**Opción B: Via CLI (si está configurado)**
```bash
supabase db push
```

### 2. Desplegar Edge Function

**Via Supabase CLI**:
```bash
# Desde el directorio raíz del proyecto
supabase functions deploy extraer-bases-curriculares
```

**O via Dashboard**:
1. Ir a Edge Functions en Supabase Dashboard
2. Editar `extraer-bases-curriculares`
3. Reemplazar el código con el actualizado

### 3. Verificar Variables de Entorno

Asegurarse que las siguientes variables estén configuradas en el proyecto:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Y en Supabase para las Edge Functions:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ALLOWED_ORIGIN` (recomendado): URL del frontend para CORS, ej: `https://educa-ia-six.vercel.app`

**Nota**: Si no se configura `ALLOWED_ORIGIN`, se usa wildcard `*` (menos seguro).

### 4. Desplegar Frontend (si es necesario)

Si el frontend está en Vercel, hacer push a la rama para que se despliegue automáticamente:
```bash
git push origin main
```

## Verificación

### 1. Probar acceso a tablas
Ir a `/admin/etl` y verificar que:
- La tabla de "Procesos Recientes" cargue sin errores 500
- La tabla de "Documentos Generados" cargue sin errores 500

### 2. Probar extracción
1. Click en "Ejecutar Extracción"
2. No debe aparecer error CORS
3. Debe mostrar mensaje de éxito o error específico (no genérico)

### 3. Verificar logs
En Supabase Dashboard > Edge Functions > extraer-bases-curriculares > Logs
- Verificar que las solicitudes lleguen
- No deben aparecer errores de autenticación
- Los logs deben mostrar progreso de extracción

## Notas Técnicas

### ¿Por qué SECURITY DEFINER?
Las funciones RPC necesitan `SECURITY DEFINER` para poder:
1. Insertar/actualizar en `procesos_etl` sin ser bloqueado por RLS
2. Insertar en `documentos_transformados` sin ser bloqueado por RLS
3. Las políticas RLS verifican `auth.uid()` que puede no estar disponible en contexto de función

### ¿Por qué cambiar autenticación?
- `service-auth.ts`: Requiere service role key, solo para operaciones internas
- `utils.ts`: Usa el token del usuario autenticado, apropiado para operaciones desde frontend
- Permite verificar rol admin a nivel de usuario
- Mantiene trazabilidad (`ejecutado_por` = user.id)

### Flujo de Autenticación
1. Usuario hace login en frontend
2. Frontend obtiene access token de Supabase
3. Frontend envía token en header `Authorization: Bearer <token>`
4. Edge Function valida token con `autenticarUsuario()`
5. Edge Function verifica rol admin consultando `profiles`
6. Edge Function ejecuta operaciones usando cliente autenticado

## Rollback (si es necesario)

Si hay problemas, revertir migraciones:
```sql
-- Quitar SECURITY DEFINER (volver a versión anterior)
DROP FUNCTION IF EXISTS iniciar_proceso_etl(VARCHAR, VARCHAR, TEXT, JSONB, UUID);
DROP FUNCTION IF EXISTS finalizar_proceso_etl(UUID, VARCHAR, INTEGER, INTEGER, INTEGER, JSONB, TEXT[], JSONB);
DROP FUNCTION IF EXISTS agregar_log_proceso_etl(UUID, TEXT);

-- Recrear sin SECURITY DEFINER (usar versión de 20250115002_procesos_etl.sql)
```

## Contacto
Si hay problemas con el despliegue, verificar:
1. Logs de Edge Functions en Supabase
2. Console del navegador en `/admin/etl`
3. Network tab para ver requests fallidos
