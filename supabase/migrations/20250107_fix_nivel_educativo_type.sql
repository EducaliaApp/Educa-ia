-- ============================================
-- FIX: Asegurar que nivel_educativo use el tipo ENUM
-- ============================================

-- Si la columna existe como TEXT, convertirla a ENUM
DO $$
BEGIN
  -- Verificar si la columna es de tipo text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rubricas_mbe'
      AND column_name = 'nivel_educativo'
      AND data_type IN ('text', 'character varying')
  ) THEN
    -- Convertir de TEXT a ENUM con casting
    ALTER TABLE rubricas_mbe
      ALTER COLUMN nivel_educativo TYPE nivel_educativo USING nivel_educativo::nivel_educativo;

    RAISE NOTICE 'Columna nivel_educativo convertida de TEXT a ENUM';
  ELSE
    RAISE NOTICE 'Columna nivel_educativo ya es de tipo ENUM';
  END IF;
END $$;

-- Recrear función con mejor manejo de tipos
DROP FUNCTION IF EXISTS buscar_rubricas_similares(vector, float, int, int, text, nivel_educativo, text);
CREATE OR REPLACE FUNCTION buscar_rubricas_similares(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  p_año_vigencia int DEFAULT NULL,
  p_asignatura text DEFAULT NULL,
  p_nivel text DEFAULT NULL,  -- Cambiado a TEXT para mejor compatibilidad
  p_modalidad text DEFAULT 'regular'
)
RETURNS TABLE (
  id uuid,
  asignatura text,
  nivel_educativo text,  -- Retornar como TEXT
  modalidad text,
  dominio text,  -- Retornar como TEXT
  estandar_numero int,
  nombre_estandar text,
  descripcion_estandar text,
  contenido_texto text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.asignatura,
    r.nivel_educativo::text,  -- Cast explícito a TEXT
    r.modalidad,
    r.dominio::text,  -- Cast explícito a TEXT
    r.estandar_numero,
    r.nombre_estandar,
    r.descripcion_estandar,
    r.contenido_texto,
    (1 - (r.embedding <=> query_embedding))::float as similarity
  FROM rubricas_mbe r
  WHERE
    (p_año_vigencia IS NULL OR r.año_vigencia = p_año_vigencia)
    AND (p_asignatura IS NULL OR r.asignatura = p_asignatura)
    AND (p_nivel IS NULL OR r.nivel_educativo::text = p_nivel)  -- Cast explícito
    AND (p_modalidad IS NULL OR r.modalidad = p_modalidad)
    AND r.embedding IS NOT NULL  -- Solo buscar en rúbricas con embedding
    AND (1 - (r.embedding <=> query_embedding)) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION buscar_rubricas_similares IS 'Busca rúbricas similares usando embeddings vectoriales con manejo robusto de tipos ENUM';
