-- Función para optimizar índices de embeddings
-- Crea índices HNSW para búsquedas vectoriales rápidas

CREATE OR REPLACE FUNCTION optimizar_indices_embeddings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resultado jsonb;
  indices_creados integer := 0;
BEGIN
  -- Crear índice HNSW para embeddings si no existe
  -- HNSW es más rápido que IVFFlat para búsquedas de vecinos cercanos
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'documentos_oficiales' 
    AND indexname = 'idx_documentos_embedding_hnsw'
  ) THEN
    EXECUTE 'CREATE INDEX idx_documentos_embedding_hnsw 
             ON documentos_oficiales 
             USING hnsw (embedding vector_cosine_ops)
             WITH (m = 16, ef_construction = 64)';
    indices_creados := indices_creados + 1;
  END IF;
  
  -- Analizar tabla para actualizar estadísticas
  EXECUTE 'ANALYZE documentos_oficiales';
  
  resultado := jsonb_build_object(
    'success', true,
    'indices_creados', indices_creados,
    'mensaje', 'Índices optimizados correctamente'
  );
  
  RETURN resultado;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Comentario
COMMENT ON FUNCTION optimizar_indices_embeddings() IS 
'Optimiza índices de embeddings para búsquedas vectoriales rápidas usando HNSW';
