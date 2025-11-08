-- Agregar columna metadata a documentos_oficiales si no existe

-- Verificar si la columna existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documentos_oficiales' 
        AND column_name = 'metadata'
    ) THEN
        -- Agregar columna metadata como JSONB
        ALTER TABLE documentos_oficiales 
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        
        RAISE NOTICE 'Columna metadata agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna metadata ya existe';
    END IF;
END $$;

-- Crear índice GIN para búsquedas eficientes en metadata
CREATE INDEX IF NOT EXISTS idx_documentos_metadata 
ON documentos_oficiales USING GIN (metadata);

-- Verificar resultado
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'documentos_oficiales' 
AND column_name = 'metadata';
