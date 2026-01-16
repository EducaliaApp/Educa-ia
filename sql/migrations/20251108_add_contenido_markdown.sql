-- Migration: Agregar columna contenido_markdown a documentos_oficiales
-- Fecha: 2025-11-08
-- Descripción: Almacena el contenido extraído en formato Markdown del PDF

-- Agregar columna contenido_markdown
ALTER TABLE documentos_oficiales 
ADD COLUMN IF NOT EXISTS contenido_markdown TEXT;

-- Comentario
COMMENT ON COLUMN documentos_oficiales.contenido_markdown IS 
'Contenido del documento extraído en formato Markdown. Usado por el pipeline ETL fase 2 (transform).';

-- Índice para búsquedas full-text (opcional, mejora performance de búsquedas)
CREATE INDEX IF NOT EXISTS idx_documentos_contenido_markdown_gin 
ON documentos_oficiales 
USING gin(to_tsvector('spanish', contenido_markdown));

-- Comentario en índice
COMMENT ON INDEX idx_documentos_contenido_markdown_gin IS 
'Índice GIN para búsquedas full-text en contenido Markdown (idioma español)';
