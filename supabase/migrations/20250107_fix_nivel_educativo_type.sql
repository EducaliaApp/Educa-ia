-- ============================================
-- FIX: Asegurar que nivel_educativo use el tipo ENUM
-- ============================================

-- Enfoque más eficiente en memoria: crear nueva columna y migrar datos
DO $$
BEGIN
  -- Verificar si la columna es de tipo text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rubricas_mbe'
      AND column_name = 'nivel_educativo'
      AND data_type IN ('text', 'character varying')
  ) THEN
    -- Agregar nueva columna temporal con tipo ENUM
    ALTER TABLE rubricas_mbe ADD COLUMN nivel_educativo_new nivel_educativo;
    
    -- Migrar datos en lotes pequeños para evitar problemas de memoria
    UPDATE rubricas_mbe 
    SET nivel_educativo_new = nivel_educativo::nivel_educativo
    WHERE nivel_educativo_new IS NULL;
    
    -- Eliminar columna antigua y renombrar la nueva
    ALTER TABLE rubricas_mbe DROP COLUMN nivel_educativo;
    ALTER TABLE rubricas_mbe RENAME COLUMN nivel_educativo_new TO nivel_educativo;
    
    -- Hacer la columna NOT NULL si es necesario
    ALTER TABLE rubricas_mbe ALTER COLUMN nivel_educativo SET NOT NULL;

    RAISE NOTICE 'Columna nivel_educativo convertida de TEXT a ENUM';
  ELSE
    RAISE NOTICE 'Columna nivel_educativo ya es de tipo ENUM';
  END IF;
END $$;

-- Agregar columna embedding si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rubricas_mbe'
      AND column_name = 'embedding'
  ) THEN
    ALTER TABLE rubricas_mbe ADD COLUMN embedding vector(1536);
    RAISE NOTICE 'Columna embedding agregada a rubricas_mbe';
  ELSE
    RAISE NOTICE 'Columna embedding ya existe en rubricas_mbe';
  END IF;
END $$;

-- Crear índice vectorial si no existe
CREATE INDEX IF NOT EXISTS idx_rubricas_embedding
  ON rubricas_mbe USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Recrear función con mejor manejo de tipos
DROP FUNCTION IF EXISTS buscar_rubricas_similares CASCADE;
CREATE OR REPLACE FUNCTION buscar_rubricas_similares(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  indicador_id text,
  nombre_indicador text,
  nivel_educativo text,
  asignatura text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.indicador_id,
    r.nombre_indicador,
    r.nivel_educativo::text,
    COALESCE(r.asignatura, ''),
    (1 - (r.embedding <=> query_embedding))::float as similarity
  FROM rubricas_mbe r
  WHERE
    r.embedding IS NOT NULL
    AND (1 - (r.embedding <=> query_embedding)) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION buscar_rubricas_similares IS 'Busca rúbricas similares usando embeddings vectoriales con manejo robusto de tipos ENUM';
