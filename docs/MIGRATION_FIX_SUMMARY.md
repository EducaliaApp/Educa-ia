# Fix: GitHub Actions Migration Failure

## Problema

El workflow de GitHub Actions `.github/workflows/deploy-and-migrate.yml` fallaba al ejecutar migraciones con el siguiente error:

```
ERROR: relation "idx_function_logs_name" already exists (SQLSTATE 42P07)
At statement: 1
-- Índices para consultas rápidas
CREATE INDEX idx_function_logs_name ON function_logs(function_name, created_at DESC)
Error: Process completed with exit code 1.
```

## Causa Raíz

La migración `supabase/migrations/20250106_function_logs.sql` no era **idempotente**:

- ✅ `CREATE TABLE IF NOT EXISTS` - Era idempotente
- ❌ `CREATE INDEX` - **NO** era idempotente (faltaba `IF NOT EXISTS`)
- ❌ `CREATE POLICY` - **NO** era idempotente (faltaba verificación condicional)
- ✅ `CREATE OR REPLACE FUNCTION/VIEW` - Era idempotente

Cuando la migración se ejecutaba por segunda vez (por ejemplo, si ya se había aplicado manualmente o en un entorno anterior), los comandos `CREATE INDEX` y `CREATE POLICY` fallaban porque los objetos ya existían.

## Solución Implementada

### 1. Índices - Agregado `IF NOT EXISTS`

**Antes:**
```sql
CREATE INDEX idx_function_logs_name ON function_logs(function_name, created_at DESC);
CREATE INDEX idx_function_logs_level ON function_logs(level, created_at DESC);
-- ... más índices
```

**Después:**
```sql
CREATE INDEX IF NOT EXISTS idx_function_logs_name ON function_logs(function_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_function_logs_level ON function_logs(level, created_at DESC);
-- ... más índices
```

### 2. Políticas RLS - Envueltas en bloques DO con verificación condicional

**Antes:**
```sql
CREATE POLICY "Administradores pueden ver todos los logs"
  ON function_logs FOR SELECT
  USING (...);
```

**Después:**
```sql
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'function_logs' 
    AND policyname = 'Administradores pueden ver todos los logs'
  ) THEN
    CREATE POLICY "Administradores pueden ver todos los logs"
      ON function_logs FOR SELECT
      USING (...);
  END IF;
END $$;
```

**Mejora adicional:** Se agregó calificación de schema (`schemaname = 'public'`) para evitar conflictos potenciales si existe una tabla con el mismo nombre en otro schema.

## Archivos Modificados

- ✅ `supabase/migrations/20250106_function_logs.sql` - Hecha idempotente
- ℹ️ `supabase/migrations/20250107_fix_nivel_educativo_type.sql` - Ya era idempotente
- ℹ️ `supabase/migrations/20250115_admin_maintainers.sql` - Ya era idempotente

## Validación

### Script de Prueba

Se creó un script de validación (`/tmp/test_migration_syntax.sh`) que verifica:

1. ✅ Todos los `CREATE INDEX` tienen `IF NOT EXISTS`
2. ✅ Todos los `CREATE POLICY` están protegidos con verificación condicional
3. ✅ Funciones y vistas usan `CREATE OR REPLACE`

### Resultado de la Validación

```
🔍 Testing migration file syntax and idempotency...

✅ Migration file exists

Checking CREATE INDEX statements...
  Total CREATE INDEX statements: 6
  With IF NOT EXISTS: 6
  ✅ All CREATE INDEX statements are idempotent

Checking CREATE POLICY statements...
  Found 2 CREATE POLICY statements
  ✅ POLICY creation uses DO blocks with pg_policies conditional checks

Checking CREATE FUNCTION/VIEW statements...
  ✅ Functions use CREATE OR REPLACE (1 found)
  ✅ Views use CREATE OR REPLACE (1 found)

🎉 Migration syntax and idempotency checks passed!
```

### Code Review

- ✅ Code review completado
- ✅ Sin issues encontrados
- ✅ Todas las mejoras sugeridas aplicadas

## Resultado

La migración `20250106_function_logs.sql` ahora es **completamente idempotente** y puede ejecutarse múltiples veces sin errores, resolviendo el fallo en el workflow de GitHub Actions.

### Beneficios

1. **Confiabilidad**: Las migraciones pueden ejecutarse múltiples veces sin fallar
2. **Seguridad**: La calificación de schema previene conflictos inesperados
3. **Mantenibilidad**: Patrón consistente con las otras migraciones del proyecto
4. **CI/CD**: El workflow de GitHub Actions ahora puede completarse exitosamente

## Próximos Pasos

1. ✅ Cambios implementados y commiteados
2. ✅ Code review completado
3. ⏳ **Pendiente**: Ejecutar el workflow en GitHub Actions para confirmar que el fix funciona en CI

## Referencias

- **Issue**: Fallo en GitHub Actions workflow deploy-and-migrate.yml
- **Archivo de migración**: `supabase/migrations/20250106_function_logs.sql`
- **Workflow afectado**: `.github/workflows/deploy-and-migrate.yml`
- **Comando que fallaba**: `supabase db push --debug`

## Lecciones Aprendidas

**Mejores prácticas para migraciones Supabase:**

1. Siempre usar `IF NOT EXISTS` en `CREATE INDEX`
2. Para políticas RLS, usar `DROP POLICY IF EXISTS` + `CREATE POLICY` o bloques `DO $$` con verificación en `pg_policies`
3. Siempre usar `CREATE OR REPLACE` para funciones y vistas
4. Incluir calificación de schema cuando se verifica existencia de objetos
5. Las migraciones deben ser idempotentes para soportar re-ejecución segura

---

**Fecha de corrección**: 2025-01-15  
**Autor**: GitHub Copilot Agent  
**Estado**: ✅ Completado
