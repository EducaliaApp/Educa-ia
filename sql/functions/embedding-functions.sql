-- sql/functions/embedding-functions.sql
-- Funciones para generar embeddings con pg_vector

-- Función RPC para generar embedding de documento
CREATE OR REPLACE FUNCTION generar_embedding_documento(
  p_documento_id UUID,
  p_texto TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Marcar que se procesó el embedding
  UPDATE documentos_oficiales 
  SET 
    embedding_procesado = TRUE,
    embedding_error = NULL,
    updated_at = NOW()
  WHERE id = p_documento_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    UPDATE documentos_oficiales 
    SET 
      embedding_procesado = FALSE,
      embedding_error = SQLERRM,
      updated_at = NOW()
    WHERE id = p_documento_id;
    
    RETURN FALSE;
END;
$$;

-- Función para buscar documentos similares
CREATE OR REPLACE FUNCTION buscar_documentos_similares(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  titulo text,
  tipo_documento text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.titulo,
    d.tipo_documento,
    (1 - (d.embedding <=> query_embedding)) as similarity
  FROM documentos_oficiales d
  WHERE d.embedding IS NOT NULL
    AND (1 - (d.embedding <=> query_embedding)) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;