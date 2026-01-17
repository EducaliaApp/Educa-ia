# 🔧 Migraciones Corregidas - ProfeFlow

## ⚠️ Los errores que encontraste fueron:

1. ❌ **Error en `function_logs`**: "constraint already exists"
   - **Causa**: La tabla ya fue creada parcialmente en un intento anterior
   - **Solución**: Nueva migración con `IF NOT EXISTS`

2. ❌ **Error en `schema-rubricas`**: "type 'nivel_educativo' does not exist"
   - **Causa**: Los ENUMs no fueron creados primero
   - **Solución**: Crear ENUMs antes de las tablas

---

## ✅ SOLUCIÓN: Ejecutar en este ORDEN

### 📍 Paso 1: Crear ENUMs (NUEVO)

**Archivo**: `supabase/migrations/00_create_enums.sql`

**¿Qué hace?**
- Crea todos los ENUMs necesarios (`nivel_educativo`, `nivel_desempeño`, etc.)
- Usa `IF NOT EXISTS` para evitar errores si ya existen
- Crea extensiones `uuid-ossp` y `vector`

**Instrucciones:**
1. Abre Supabase SQL Editor: https://supabase.com/dashboard/project/cqfhayframohiulwauny/sql
2. Haz clic en **"New query"**
3. Copia y pega TODO el contenido de `supabase/migrations/00_create_enums.sql`
4. Haz clic en **"Run"**
5. ✅ Deberías ver una tabla con los 6 ENUMs creados

**Resultado esperado:**
```
NOTICE: ENUM nivel_educativo creado
NOTICE: ENUM nivel_desempeño creado
NOTICE: ENUM categoria_logro creado
NOTICE: ENUM dominio_mbe creado
NOTICE: ENUM estado_portafolio creado
NOTICE: ENUM tipo_analisis creado
```

---

### 📍 Paso 2: Crear tabla function_logs (CORREGIDA)

**Archivo**: `supabase/migrations/01_function_logs_fixed.sql`

**¿Qué hace?**
- Crea la tabla `function_logs` con `IF NOT EXISTS`
- Verifica si la constraint existe antes de crearla (soluciona el error)
- Crea índices, políticas RLS, y funciones de limpieza

**Instrucciones:**
1. En el mismo SQL Editor, haz clic en **"New query"**
2. Copia y pega TODO el contenido de `supabase/migrations/01_function_logs_fixed.sql`
3. Haz clic en **"Run"**
4. ✅ Deberías ver "Success"

**Resultado esperado:**
```
NOTICE: Constraint function_logs_level_check ya existe (o fue creada)
Success. No rows returned.
```

---

### 📍 Paso 3: Schema de rúbricas (CORREGIDO)

**Archivo**: `supabase/migrations/02_schema_rubricas_fixed.sql`

**¿Qué hace?**
- Actualiza la tabla `rubricas_mbe` con nuevas columnas
- Crea tablas: `evaluaciones_indicador`, `historial_mejoras`, `estadisticas_indicadores`
- Crea funciones y políticas RLS
- Ahora funciona porque los ENUMs ya existen

**Instrucciones:**
1. Haz clic en **"New query"** nuevamente
2. Copia y pega TODO el contenido de `supabase/migrations/02_schema_rubricas_fixed.sql`
3. Haz clic en **"Run"**
4. ✅ Deberías ver "Success"

**Resultado esperado:**
```
Success. No rows returned.

Resultado final:
tabla creada | total
-------------|------
Tablas creadas | 3
```

---

## ✅ Verificación Final

Después de ejecutar las 3 migraciones, ejecuta esta consulta para verificar:

```sql
-- Verificar ENUMs
SELECT typname FROM pg_type
WHERE typtype = 'e'
  AND typname IN ('nivel_educativo', 'nivel_desempeño', 'categoria_logro', 'dominio_mbe', 'estado_portafolio', 'tipo_analisis')
ORDER BY typname;

-- Verificar tablas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'function_logs',
    'evaluaciones_indicador',
    'historial_mejoras',
    'estadisticas_indicadores'
  )
ORDER BY table_name;
```

**Resultado esperado:**

**ENUMs (6 total):**
```
typname
-------------------
categoria_logro
dominio_mbe
estado_portafolio
nivel_desempeño
nivel_educativo
tipo_analisis
```

**Tablas (4 total):**
```
table_name
---------------------------
estadisticas_indicadores
evaluaciones_indicador
function_logs
historial_mejoras
```

---

## 🎯 Resumen de Archivos

| Orden | Archivo | Propósito |
|-------|---------|-----------|
| 1️⃣ | `00_create_enums.sql` | Crear ENUMs necesarios |
| 2️⃣ | `01_function_logs_fixed.sql` | Tabla de logging (corregida) |
| 3️⃣ | `02_schema_rubricas_fixed.sql` | Tablas de rúbricas (corregida) |

---

## 🆘 Si todavía hay errores

**Si ves "relation already exists":**
```sql
-- Puedes eliminar la tabla y volver a crearla
DROP TABLE IF EXISTS nombre_tabla CASCADE;
```

**Si ves "column already exists":**
- Ignora el error, la columna ya existe
- O comenta esa línea en el script

**Si ves otro error:**
1. Copia el mensaje completo
2. Compártelo conmigo
3. Te ayudaré a resolverlo

---

## ✅ Cuando termines

Escribe: **"Migraciones corregidas ejecutadas"**

Yo procederé a:
1. ✅ Ejecutar el script de seeding de rúbricas MBE
2. ✅ Verificar que todo funciona
3. ✅ Limpiar las credenciales
4. ✅ Recordarte regenerar el service_role_key

---

**Ubicación de los nuevos archivos:**
- 📄 `supabase/migrations/00_create_enums.sql` (NUEVO)
- 📄 `supabase/migrations/01_function_logs_fixed.sql` (CORREGIDO)
- 📄 `supabase/migrations/02_schema_rubricas_fixed.sql` (CORREGIDO)

**Dashboard de Supabase:**
- 🔗 https://supabase.com/dashboard/project/cqfhayframohiulwauny/sql
