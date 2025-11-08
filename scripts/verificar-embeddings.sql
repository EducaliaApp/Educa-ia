-- Verificar que los embeddings están guardados en PostgreSQL

-- 1. Ver documentos con embeddings
SELECT 
    id,
    titulo,
    procesado,
    embedding IS NOT NULL as tiene_embedding,
    array_length(embedding, 1) as dimensiones_embedding,
    embedding_model,
    fecha_procesamiento
FROM documentos_oficiales
WHERE procesado = TRUE
ORDER BY fecha_procesamiento DESC
LIMIT 10;

-- 2. Contar documentos con/sin embeddings
SELECT 
    COUNT(*) FILTER (WHERE embedding IS NOT NULL) as con_embedding,
    COUNT(*) FILTER (WHERE embedding IS NULL) as sin_embedding,
    COUNT(*) as total
FROM documentos_oficiales;

-- 3. Probar búsqueda vectorial (si hay embeddings)
-- Esto solo funciona si los embeddings están en la BD
SELECT 
    titulo,
    1 - (embedding <=> (SELECT embedding FROM documentos_oficiales LIMIT 1)) as similitud
FROM documentos_oficiales
WHERE embedding IS NOT NULL
ORDER BY embedding <=> (SELECT embedding FROM documentos_oficiales LIMIT 1)
LIMIT 5;

-- 4. Ver tamaño de almacenamiento de embeddings
SELECT 
    pg_size_pretty(pg_total_relation_size('documentos_oficiales')) as tamaño_tabla,
    COUNT(*) as total_documentos,
    COUNT(*) FILTER (WHERE embedding IS NOT NULL) as con_embeddings
FROM documentos_oficiales;
