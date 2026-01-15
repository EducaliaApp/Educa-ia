# Solución a Errores 500/400 en Páginas de Administración

## Resumen Ejecutivo
Se corrigieron errores críticos en las páginas de administración que causaban fallos 500 (Internal Server Error) y 400 (Bad Request) al cargar datos desde Supabase.

## Problema Detectado

### Errores en Consola del Navegador
```
GET https://...supabase.co/rest/v1/evaluaciones?select=...profiles:user_id(nombre,email)... 500 (Internal Server Error)
GET https://...supabase.co/rest/v1/planificaciones?select=...profiles:user_id(nombre,email)... 500 (Internal Server Error)
GET https://...supabase.co/rest/v1/portafolios?select=...profiles:profesor_id(nombre,email)... 400 (Bad Request)
```

### Páginas Afectadas
1. `/admin/evaluaciones` - No cargaba lista de evaluaciones
2. `/admin/planificaciones` - No cargaba lista de planificaciones
3. `/admin/portafolios` - No cargaba lista de portafolios docentes

## Causa Raíz

### Sintaxis Incorrecta de Relaciones Foráneas en Supabase
Las consultas usaban una sintaxis incorrecta para las relaciones de clave foránea:

❌ **Sintaxis INCORRECTA:**
```typescript
profiles:user_id (nombre, email)
```

✅ **Sintaxis CORRECTA:**
```typescript
profiles!user_id(nombre, email)
```

### Diferencias Clave
1. **Separador**: Usar `!` (exclamación) en lugar de `:` (dos puntos)
2. **Espacios**: NO debe haber espacio entre el nombre de la relación y el paréntesis
3. **Formato**: `tabla!columna_fk(campos)` es el patrón correcto

## Solución Implementada

### Archivos Modificados

#### 1. app/admin/evaluaciones/page.tsx
**Línea 57**
```diff
- profiles:user_id (nombre, email)
+ profiles!user_id(nombre, email)
```

#### 2. app/admin/planificaciones/page.tsx
**Línea 59**
```diff
- profiles:user_id (nombre, email)
+ profiles!user_id(nombre, email)
```

#### 3. app/admin/portafolios/page.tsx
**Línea 68**
```diff
- profiles:profesor_id (nombre, email)
+ profiles!profesor_id(nombre, email)
```

## Contexto Técnico

### Estructura de Base de Datos
```sql
-- La tabla profiles extiende auth.users
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  nombre TEXT,
  ...
);

-- evaluaciones y planificaciones referencian profiles(id) via user_id
CREATE TABLE evaluaciones (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ...
);

CREATE TABLE planificaciones (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ...
);

-- portafolios referencia auth.users(id) directamente via profesor_id
CREATE TABLE portafolios (
  id UUID PRIMARY KEY,
  profesor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ...
);
```

### Cómo Funciona la Sintaxis Correcta
El patrón `profiles!user_id(nombre, email)` le indica a Supabase:
- Hacer un JOIN con la tabla `profiles`
- Usar la columna `user_id` como clave foránea
- Seleccionar solo los campos `nombre` y `email` de profiles
- El `!` indica que es una relación de clave foránea explícita

## Verificación

### Checklist de Validación
- [x] Sintaxis corregida en las 3 páginas admin
- [x] Code review completado sin issues
- [x] CodeQL security scan completado sin vulnerabilidades
- [x] Sin errores de TypeScript
- [x] Cambios mínimos y precisos

### Resultados Esperados
Después de este fix:
1. ✅ `/admin/evaluaciones` carga correctamente la lista con nombres y emails de usuarios
2. ✅ `/admin/planificaciones` carga correctamente la lista con información de usuarios
3. ✅ `/admin/portafolios` carga correctamente la lista con información de profesores
4. ✅ No más errores 500/400 en la consola del navegador

## Lecciones Aprendidas

### Sintaxis de Relaciones en Supabase
Para consultas con relaciones foráneas en Supabase:
- Usar `!` para relaciones explícitas: `tabla!columna_fk(campos)`
- No usar espacios antes del paréntesis
- Documentación oficial: [Supabase Foreign Key Joins](https://supabase.com/docs/guides/api/joins-and-nested-tables)

### Prevención de Errores Similares
1. Verificar la sintaxis de Supabase en la documentación oficial
2. Usar el mismo patrón consistente en toda la aplicación
3. Revisar otros archivos que puedan tener sintaxis similar incorrecta

## Referencias
- [Supabase API - Joining Tables](https://supabase.com/docs/guides/api/joins-and-nested-tables)
- Commit: `Fix Supabase foreign key syntax in admin pages`
- Archivos modificados: 3
- Líneas modificadas: 3
