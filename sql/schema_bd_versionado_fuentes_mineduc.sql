-- ============================================
-- SISTEMA DE DOCUMENTACIÓN OFICIAL
-- ============================================

CREATE TABLE fuentes_documentacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación de la fuente
    nombre VARCHAR(200) NOT NULL,
    url_base TEXT NOT NULL,
    tipo_fuente VARCHAR(50) NOT NULL, 
    -- 'docentemas', 'cpeip', 'mineduc', 'biblioteca_digital'
    
    -- Configuración de scraping
    patron_url TEXT, -- Regex o patrón para identificar documentos
    selectores_css JSONB, -- Selectores para extraer contenido
    frecuencia_check INTERVAL DEFAULT '1 day', -- Cada cuánto revisar
    
    -- Estado
    activo BOOLEAN DEFAULT TRUE,
    ultimo_check TIMESTAMPTZ,
    ultimo_cambio_detectado TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(url_base)
);

-- Documentos oficiales descargados
CREATE TABLE documentos_oficiales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fuente_id UUID NOT NULL REFERENCES fuentes_documentacion(id),
    
    -- Identificación del documento
    titulo VARCHAR(500) NOT NULL,
    url_original TEXT NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL, 
    -- 'manual_portafolio', 'rubrica', 'mbe', 'instructivo', 'resolucion'
    
    -- Clasificación
    año_vigencia INTEGER NOT NULL,
    asignatura VARCHAR(100),
    nivel_educativo VARCHAR(100),
    modalidad VARCHAR(50), -- 'regular', 'especial', 'adultos', etc.
    
    -- Versión y control de cambios
    version VARCHAR(50) NOT NULL, -- ej: "2025-v1", "2025-v2"
    hash_contenido VARCHAR(64) NOT NULL, -- SHA-256 del contenido
    es_version_actual BOOLEAN DEFAULT TRUE,
    
    -- Storage
    storage_path TEXT NOT NULL, -- Ruta en Supabase Storage
    tamaño_bytes BIGINT,
    formato VARCHAR(20), -- 'pdf', 'html', 'docx'
    
    -- Procesamiento
    procesado BOOLEAN DEFAULT FALSE,
    contenido_texto TEXT, -- Texto extraído
    contenido_estructurado JSONB, -- Contenido parseado y estructurado
    
    -- Fechas
    fecha_publicacion DATE,
    fecha_descarga TIMESTAMPTZ DEFAULT NOW(),
    fecha_procesamiento TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(url_original, version)
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_docs_vigencia ON documentos_oficiales(año_vigencia, es_version_actual);
CREATE INDEX idx_docs_tipo ON documentos_oficiales(tipo_documento, es_version_actual);
CREATE INDEX idx_docs_asignatura ON documentos_oficiales(asignatura, año_vigencia);

-- Chunks de documentos para RAG
CREATE TABLE chunks_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID NOT NULL REFERENCES documentos_oficiales(id) ON DELETE CASCADE,
    
    -- Contenido del chunk
    contenido TEXT NOT NULL,
    chunk_index INTEGER NOT NULL, -- Posición en el documento
    
    -- Metadata del chunk
    seccion VARCHAR(200), -- "Módulo 1", "Criterio A.1", etc.
    subseccion VARCHAR(200),
    pagina_numero INTEGER,
    
    -- Clasificación semántica
    dominio_mbe VARCHAR(1), -- A, B, C, D
    estandar_numero INTEGER,
    tipo_contenido VARCHAR(50), 
    -- 'descriptor', 'ejemplo', 'rubrica', 'instructivo'
    
    -- Vector embedding para RAG
    embedding vector(1536),
    
    -- Metadata adicional
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(documento_id, chunk_index)
);

-- Índice vectorial para búsqueda semántica
CREATE INDEX idx_chunks_embedding ON chunks_documentos 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Índice para filtrado por metadata
CREATE INDEX idx_chunks_dominio ON chunks_documentos(dominio_mbe, estandar_numero);
CREATE INDEX idx_chunks_tipo ON chunks_documentos(tipo_contenido);

-- Historial de cambios en documentos
CREATE TABLE historial_cambios_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID NOT NULL REFERENCES documentos_oficiales(id),
    
    -- Versiones comparadas
    version_anterior VARCHAR(50),
    version_nueva VARCHAR(50) NOT NULL,
    
    -- Cambios detectados
    tipo_cambio VARCHAR(50) NOT NULL, 
    -- 'contenido_modificado', 'nuevo_documento', 'documento_eliminado'
    
    diff_resumen TEXT, -- Resumen de cambios
    diff_detallado JSONB, -- Diff completo
    
    -- Impacto
    impacto_estimado VARCHAR(20), -- 'alto', 'medio', 'bajo'
    requiere_reindexacion BOOLEAN DEFAULT TRUE,
    
    -- Notificaciones
    usuarios_notificados INTEGER DEFAULT 0,
    fecha_notificacion TIMESTAMPTZ,
    
    detectado_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuración de URLs a monitorear
CREATE TABLE urls_monitoreadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fuente_id UUID NOT NULL REFERENCES fuentes_documentacion(id),
    
    url TEXT NOT NULL UNIQUE,
    tipo_contenido VARCHAR(50) NOT NULL, -- 'listado', 'documento_directo'
    
    -- Configuración de extracción
    selector_enlaces TEXT, -- CSS selector para encontrar links a documentos
    patron_validacion TEXT, -- Regex para validar que es documento relevante
    
    -- Estado
    activo BOOLEAN DEFAULT TRUE,
    ultimo_check TIMESTAMPTZ,
    cantidad_documentos_encontrados INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para marcar versiones anteriores como no actuales
CREATE OR REPLACE FUNCTION marcar_version_anterior()
RETURNS TRIGGER AS $$
BEGIN
    -- Cuando se inserta una nueva versión actual
    IF NEW.es_version_actual = TRUE THEN
        UPDATE documentos_oficiales
        SET es_version_actual = FALSE
        WHERE url_original = NEW.url_original
          AND id != NEW.id
          AND es_version_actual = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_version_actual
    BEFORE INSERT OR UPDATE ON documentos_oficiales
    FOR EACH ROW
    EXECUTE FUNCTION marcar_version_anterior();

-- Función para buscar chunks similares (RAG)
CREATE OR REPLACE FUNCTION buscar_chunks_similares(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    p_año_vigencia int DEFAULT NULL,
    p_dominio_mbe varchar DEFAULT NULL,
    p_tipo_contenido varchar DEFAULT NULL
)
RETURNS TABLE (
    chunk_id uuid,
    documento_id uuid,
    titulo_documento varchar,
    contenido text,
    seccion varchar,
    similarity float,
    metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.documento_id,
        d.titulo,
        c.contenido,
        c.seccion,
        1 - (c.embedding <=> query_embedding) as similarity,
        c.metadata
    FROM chunks_documentos c
    JOIN documentos_oficiales d ON d.id = c.documento_id
    WHERE 
        d.es_version_actual = TRUE
        AND (p_año_vigencia IS NULL OR d.año_vigencia = p_año_vigencia)
        AND (p_dominio_mbe IS NULL OR c.dominio_mbe = p_dominio_mbe)
        AND (p_tipo_contenido IS NULL OR c.tipo_contenido = p_tipo_contenido)
        AND (1 - (c.embedding <=> query_embedding)) > match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;