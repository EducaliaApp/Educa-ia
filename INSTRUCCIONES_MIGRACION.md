# 📋 Instrucciones para Ejecutar Migraciones en Supabase

## 🎯 Objetivo
Ejecutar 2 migraciones SQL en tu base de datos de Supabase para completar la configuración de ProfeFlow.

---

## 📍 Paso 1: Abrir SQL Editor

1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard/project/cqfhayframohiulwauny
2. En el menú lateral izquierdo, haz clic en **"SQL Editor"**
3. Haz clic en **"New query"** (o el botón `+`)

---

## 📄 Paso 2: Ejecutar Primera Migración - Rúbricas MBE

### Archivo: `supabase/migrations/schema-rubricas.sql` (255 líneas)

**¿Qué hace?**
- Actualiza la estructura de la tabla `rubricas_mbe`
- Crea tabla `evaluaciones_indicador` para almacenar evaluaciones por indicador
- Crea tabla `historial_mejoras` para tracking de progreso
- Crea tabla `estadisticas_indicadores` para comparativas
- Agrega funciones y políticas RLS

**Instrucciones:**
1. Abre el archivo: `supabase/migrations/schema-rubricas.sql`
2. Copia TODO el contenido del archivo
3. Pega en el SQL Editor de Supabase
4. Haz clic en **"Run"** (o presiona Ctrl/Cmd + Enter)
5. Verifica que aparezca **"Success. No rows returned"**

---

## 📄 Paso 3: Ejecutar Segunda Migración - Function Logs

### Archivo: `supabase/migrations/20250106_function_logs.sql` (97 líneas)

**¿Qué hace?**
- Crea tabla `function_logs` para logging de Edge Functions
- Agrega índices para búsqueda rápida
- Crea función `cleanup_old_function_logs()` para limpieza automática
- Crea vista `function_logs_summary` para monitoreo
- Agrega políticas RLS

**Instrucciones:**
1. En el mismo SQL Editor, haz clic en **"New query"** para crear otra consulta
2. Abre el archivo: `supabase/migrations/20250106_function_logs.sql`
3. Copia TODO el contenido del archivo
4. Pega en el SQL Editor
5. Haz clic en **"Run"**
6. Verifica que aparezca **"Success. No rows returned"**

---

## ✅ Paso 4: Verificar que las Migraciones se Ejecutaron

Ejecuta esta consulta en el SQL Editor para verificar:

\`\`\`sql
-- Verificar que las tablas se crearon correctamente
SELECT
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'function_logs',
    'evaluaciones_indicador',
    'historial_mejoras',
    'estadisticas_indicadores'
  )
ORDER BY table_name;
\`\`\`

**Resultado esperado:**
```
table_name                  | column_count
---------------------------+-------------
estadisticas_indicadores   | 15
evaluaciones_indicador     | 14
function_logs              | 11
historial_mejoras          | 10
```

Si ves estas 4 tablas, ¡las migraciones se ejecutaron correctamente! ✅

---

## 🔄 Paso 5: Volver a este Terminal

Una vez que hayas ejecutado las migraciones en Supabase SQL Editor:

1. Vuelve a este terminal
2. Avísame escribiendo: "Migraciones ejecutadas"
3. Yo procederé a ejecutar el script de seeding de rúbricas MBE

---

## ⚠️ Notas Importantes

- Si recibes algún error sobre "relation already exists", significa que la tabla ya existe. Puedes ignorarlo o usar `DROP TABLE IF EXISTS nombre_tabla CASCADE;` antes de crear la tabla.
- Si tienes algún error, copia el mensaje completo y compártelo conmigo.
- Las políticas RLS protegen los datos, solo los usuarios autenticados y admins pueden acceder.

---

## 🆘 ¿Problemas?

Si encuentras algún error:
1. Copia el mensaje de error completo
2. Compártelo conmigo
3. Te ayudaré a resolverlo

---

**Ubicación de los archivos:**
- 📄 `supabase/migrations/schema-rubricas.sql`
- 📄 `supabase/migrations/20250106_function_logs.sql`

**Dashboard de Supabase:**
- 🔗 https://supabase.com/dashboard/project/cqfhayframohiulwauny
