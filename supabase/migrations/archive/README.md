# Archived Migrations

## ¿Por qué están estos archivos aquí?

Estos archivos de migración fueron movidos a este directorio de archivo porque **no siguen el formato de nombre requerido** por Supabase CLI para migraciones automáticas.

## Formato Requerido

Supabase CLI requiere que las migraciones sigan este patrón de nombre:

```
YYYYMMDDHHmmss_description.sql
```

Por ejemplo:
- ✅ `20250106_function_logs.sql`
- ✅ `20250115_admin_maintainers.sql`
- ❌ `01_function_logs_fixed.sql` (formato incorrecto)
- ❌ `schema-rubricas.sql` (formato incorrecto)

## ¿Qué hacer con estos archivos?

### Si estas migraciones ya fueron aplicadas manualmente en producción:
- ✅ Déjalas aquí como referencia histórica
- ✅ No las vuelvas a aplicar

### Si estas migraciones NO han sido aplicadas en producción:
1. Revisa el contenido de cada archivo
2. Si es necesario aplicarlas:
   - Opción A: Créalas manualmente en Supabase SQL Editor
   - Opción B: Crea nuevas migraciones con el formato correcto usando:
     ```bash
     supabase migration new description_here
     ```
   - Luego copia el contenido del archivo archivado a la nueva migración

## Lista de archivos archivados

### Migraciones base (00-12):
- `00_create_enums.sql` - Creación de ENUMs (posiblemente duplicado por `20250106_function_logs.sql`)
- `01_function_logs_fixed.sql` - Tabla function_logs (duplicado por `20250106_function_logs.sql`)
- `02_schema_rubricas_fixed.sql` - Schema de rúbricas
- `03_seed_rubricas_ejemplo.sql` - Datos de ejemplo de rúbricas
- `03_seed_rubricas_ejemplo_fixed.sql` - Versión corregida del anterior
- `04_fix_rubricas_rls.sql` - Políticas RLS para rúbricas
- `05_seed_rubricas_simple.sql` - Seed simplificado de rúbricas
- `06_main_schema.sql` - Schema principal (profiles, etc.)
- `07_portafolio_schema.sql` - Schema de portafolios
- `08_document_system.sql` - Sistema de documentos
- `09_ai_analysis.sql` - Análisis con IA
- `10_automation.sql` - Features de automatización
- `11_system_monitoring.sql` - Monitoreo del sistema
- `12_portafolio_functions.sql` - Funciones de portafolio

### Otros:
- `99_verificacion_rubricas.sql` - Script de verificación
- `schema-rubricas.sql` - Schema de rúbricas (formato incorrecto)

## Referencia

Para más información sobre el formato de migraciones de Supabase:
- [Supabase Migration Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/supabase-db-push)
