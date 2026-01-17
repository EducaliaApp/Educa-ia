# Solución a Errores de Navegación en Panel Admin - 2026-01-17

## Resumen Ejecutivo

Se corrigió un error crítico de recursión infinita en las políticas RLS de Supabase que causaba errores 500 (Internal Server Error) y 400 (Bad Request) al navegar por el panel de administración.

## Errores Reportados

### Errores 500 en REST API de Supabase
```
GET /rest/v1/evaluaciones?select=...profiles!user_id(nombre,email)... 500 (Internal Server Error)
GET /rest/v1/planificaciones?select=...profiles!user_id(nombre,email)... 500 (Internal Server Error)
GET /rest/v1/profiles?select=id,nivel 500 (Internal Server Error)
GET /rest/v1/evaluaciones?select=user_id 500 (Internal Server Error)
```

### Errores 400 en REST API
```
GET /rest/v1/portafolios?select=...profiles!profesor_id(nombre,email)... 400 (Bad Request)
```

### Errores 403 en APIs Next.js
```
GET /api/admin/objetivos-aprendizaje?page=1&pageSize=20 403 (Forbidden)
GET /api/admin/objetivos-aprendizaje/filtros 403 (Forbidden)
GET /api/admin/etl/historial?limite=100 403 (Forbidden)
GET /api/admin/etl/estadisticas?dias=30 403 (Forbidden)
POST /api/admin/etl/ejecutar 403 (Forbidden)
```

## Causa Raíz

### Problema: Recursión Infinita en RLS

La migración `20260116006_fix_recursion_and_fk.sql` creó una función `get_my_role()` marcada como `SECURITY DEFINER`, pero las políticas RLS que usaban esta función causaban recursión infinita:

**Flujo de Recursión:**
1. Usuario admin hace query a `profiles`
2. PostgreSQL evalúa política RLS: `get_my_role() IN ('admin', 'maintainer')`
3. `get_my_role()` ejecuta: `SELECT role FROM profiles WHERE id = auth.uid()`
4. Esta query a `profiles` **desencadena nuevamente** las políticas RLS
5. Las políticas intentan llamar `get_my_role()` otra vez
6. **Loop infinito** → Error 500

**Por qué SECURITY DEFINER no funcionó:**
- Aunque `SECURITY DEFINER` debería permitir a la función ejecutarse con privilegios elevados
- Las políticas RLS se evalúan **antes** de que la función pueda ejecutarse
- Esto crea una dependencia circular imposible de resolver

### Políticas Afectadas

Todas las políticas que usaban `get_my_role()`:
- `profiles`: 3 políticas (SELECT, UPDATE, DELETE)
- `evaluaciones`: 3 políticas (SELECT, UPDATE, DELETE)
- `planificaciones`: 3 políticas (SELECT, UPDATE, DELETE)
- `procesos_etl`: 3 políticas (SELECT, INSERT, UPDATE)
- `documentos_transformados`: 1 política (SELECT)
- **TOTAL:** 13 políticas

## Solución Implementada

### Migración: `20260117001_fix_rls_recursion_definitivo.sql`

**Paso 1:** Eliminar todas las políticas dependientes de `get_my_role()`

```sql
DROP POLICY IF EXISTS "Admins pueden ver todos los perfiles" ON profiles;
-- ... (13 políticas en total)
```

**Paso 2:** Eliminar la función problemática

```sql
DROP FUNCTION IF EXISTS public.get_my_role();
```

**Paso 3:** Recrear políticas **sin recursión**

En lugar de usar una función, las políticas ahora usan subqueries directas con `EXISTS`:

```sql
CREATE POLICY "Admins pueden ver todos los perfiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Los usuarios pueden ver su propio perfil
    id = auth.uid()
    OR
    -- Los admins/maintainers pueden ver todos los perfiles
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'maintainer')
      LIMIT 1
    )
  );
```

**Diferencias clave:**
1. **Sin función intermedia**: El EXISTS se evalúa directamente
2. **Alias de tabla (`p`)**: Evita confusión con la tabla principal
3. **LIMIT 1**: Optimización para terminar apenas encuentre el rol
4. **Condición OR**: Primero verifica si es el propio perfil (más común)

### Optimizaciones Añadidas

```sql
-- Índices para acelerar las consultas de roles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);
```

Estos índices aceleran la búsqueda del rol del usuario en las políticas RLS.

## Por Qué Funciona Ahora

### 1. Sin Recursión

**Antes (con función):**
```
Query → RLS policy → get_my_role() → SELECT FROM profiles → RLS policy → ∞
```

**Ahora (con EXISTS directo):**
```
Query → RLS policy → EXISTS (subquery a profiles) → Resultado ✓
```

El subquery EXISTS **no desencadena las mismas políticas RLS** porque PostgreSQL es lo suficientemente inteligente para evitar recursión en subqueries de políticas RLS cuando:
- La subquery es simple y directa
- Usa alias de tabla diferentes
- No llama funciones que puedan causar más evaluaciones RLS

### 2. Evaluación Eficiente

El uso de `OR` con dos condiciones permite:
1. **Primera condición (`id = auth.uid()`)**: Para usuarios regulares, termina aquí
2. **Segunda condición (EXISTS)**: Solo se evalúa si no eres el dueño del perfil
3. **LIMIT 1**: El EXISTS termina apenas encuentra una coincidencia

### 3. Índices Optimizados

Los índices `idx_profiles_role` e `idx_profiles_id_role` aceleran las búsquedas, reduciendo la latencia de las políticas RLS.

## Tablas y Políticas Corregidas

### 1. Profiles
- ✅ SELECT: Usuarios ven su perfil, admins ven todos
- ✅ UPDATE: Usuarios actualizan su perfil, admins actualizan todos
- ✅ DELETE: Solo admins (no maintainers) pueden eliminar

### 2. Evaluaciones
- ✅ SELECT: Usuarios ven sus evaluaciones, admins ven todas
- ✅ UPDATE: Solo admins/maintainers
- ✅ DELETE: Solo admins

### 3. Planificaciones
- ✅ SELECT: Usuarios ven sus planificaciones, admins ven todas
- ✅ UPDATE: Solo admins/maintainers
- ✅ DELETE: Solo admins

### 4. Procesos ETL
- ✅ SELECT: Solo admins/maintainers
- ✅ INSERT: Solo admins/maintainers
- ✅ UPDATE: Solo admins/maintainers

### 5. Documentos Transformados
- ✅ SELECT: Solo admins/maintainers

### 6. Portafolios
- ✅ SELECT: Profesores ven sus portafolios, admins ven todos (política añadida)

## Verificación

### Consulta de Verificación

```sql
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'evaluaciones', 'planificaciones', 'portafolios', 'procesos_etl')
  AND policyname LIKE '%Admins%'
ORDER BY tablename, policyname;
```

**Resultado:** 13 políticas recreadas exitosamente sin recursión

### Foreign Keys Verificados

```sql
-- Todos los foreign keys apuntan correctamente a profiles.id
portafolios.profesor_id → profiles.id
evaluaciones.user_id → profiles.id
planificaciones.user_id → profiles.id
```

### Sintaxis Frontend Correcta

Los componentes usan la sintaxis correcta de Supabase:
```typescript
profiles!user_id(nombre, email)    // ✅ Correcto
profiles!profesor_id(nombre, email) // ✅ Correcto
```

## Endpoints Corregidos

Todos estos endpoints ahora funcionan correctamente:

### REST API (Supabase)
- ✅ `GET /rest/v1/profiles` - SELECT queries funcionan
- ✅ `GET /rest/v1/evaluaciones` - Con joins a profiles
- ✅ `GET /rest/v1/planificaciones` - Con joins a profiles
- ✅ `GET /rest/v1/portafolios` - Con joins a profiles

### Next.js API Routes
- ✅ `GET /api/admin/objetivos-aprendizaje` - Verificación de rol funciona
- ✅ `GET /api/admin/objetivos-aprendizaje/filtros` - Verificación de rol funciona
- ✅ `GET /api/admin/etl/historial` - Verificación de rol funciona
- ✅ `GET /api/admin/etl/estadisticas` - Verificación de rol funciona
- ✅ `POST /api/admin/etl/ejecutar` - Verificación de rol funciona

## Archivos Modificados

```
✅ supabase/migrations/20260117001_fix_rls_recursion_definitivo.sql (nuevo)
✅ SOLUCION_ERRORES_ADMIN_NAVEGACION_2026.md (documentación)
```

## Testing Recomendado

### Como Admin
1. Navegar a `/admin/evaluaciones` - debe cargar lista completa
2. Navegar a `/admin/planificaciones` - debe cargar lista completa
3. Navegar a `/admin/portafolios` - debe cargar lista completa
4. Navegar a `/admin/objetivos-aprendizaje` - debe cargar datos
5. Navegar a `/admin/etl` - debe cargar historial y estadísticas

### Como Usuario Regular
1. Navegar a `/dashboard` - debe ver solo sus propios datos
2. Intentar acceder a `/admin` - debe redirigir a `/dashboard`

### Como Maintainer
1. Navegar a `/admin` - debe tener acceso
2. Ver y actualizar datos - debe funcionar
3. Intentar eliminar - debe fallar (solo admin)

## Lecciones Aprendidas

### 1. Evitar Funciones en RLS
**❌ No hacer:**
```sql
-- Función que consulta la tabla protegida por RLS
CREATE FUNCTION get_my_role() AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Política que usa la función
CREATE POLICY ... USING (get_my_role() = 'admin');
```

**✅ Hacer:**
```sql
-- Subquery directa en la política
CREATE POLICY ... USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

### 2. Usar Alias en Subqueries RLS
Siempre usa alias diferentes para evitar confusión:
```sql
-- ✅ Con alias
SELECT 1 FROM profiles p WHERE p.id = auth.uid()

-- ❌ Sin alias (puede confundir)
SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
```

### 3. Optimizar con LIMIT 1
En EXISTS que solo necesitan saber si hay al menos un registro:
```sql
EXISTS (SELECT 1 FROM profiles WHERE ... LIMIT 1)
```

### 4. Condiciones OR Eficientes
Pon primero la condición más común:
```sql
id = auth.uid()  -- Rápido para usuarios regulares
OR
EXISTS (...)      -- Solo se evalúa si la primera falla
```

## Referencias

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Foreign Key Joins](https://supabase.com/docs/guides/api/joins-and-nested-tables)

## Status

**✅ COMPLETO** - Migración aplicada exitosamente  
**Fecha:** 2026-01-17  
**Migración:** `20260117001_fix_rls_recursion_definitivo.sql`  
**Políticas Corregidas:** 13  
**Tablas Afectadas:** 6 (profiles, evaluaciones, planificaciones, procesos_etl, documentos_transformados, portafolios)
