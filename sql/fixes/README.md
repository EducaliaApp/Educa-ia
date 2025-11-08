# Fixes SQL - Documentos Oficiales

## Error: "Could not find the 'metadata' column"

### Causa
La columna `metadata` no existe en la tabla `documentos_oficiales`.

### Solución

#### Opción 1: Ejecutar migración (Recomendado)

```bash
# En Supabase SQL Editor
psql -f sql/fixes/add-metadata-column.sql
```

O copiar y pegar en Supabase Dashboard → SQL Editor:

```sql
-- Agregar columna metadata
ALTER TABLE documentos_oficiales 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_documentos_metadata 
ON documentos_oficiales USING GIN (metadata);
```

#### Opción 2: La Edge Function ya maneja el error

Si no puedes ejecutar la migración, la Edge Function ahora funciona sin la columna `metadata`. La información de subcategoría se guarda en `tipo_documento` en su lugar.

### Verificar

```sql
-- Verificar que la columna existe
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'documentos_oficiales' 
AND column_name = 'metadata';
```

## Limpieza de Duplicados

Si tienes documentos duplicados:

```bash
# 1. Identificar duplicados
psql -f sql/fixes/remove-duplicates.sql

# 2. Revisar resultados

# 3. Descomentar secciones DELETE y ejecutar nuevamente
```

## Orden de Ejecución

1. ✅ `add-metadata-column.sql` - Agregar columna metadata
2. ✅ `remove-duplicates.sql` - Limpiar duplicados existentes
3. ✅ Ejecutar monitor de documentos

## Notas

- La columna `metadata` es opcional pero recomendada
- Permite almacenar información adicional como subcategoría
- Si no existe, el sistema funciona normalmente
