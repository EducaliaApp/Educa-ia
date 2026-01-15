-- ============================================
-- MIGRATION 08: Document System Schema
-- ============================================

-- Create fuentes_documentacion table
CREATE TABLE IF NOT EXISTS fuentes_documentacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación de la fuente
    nombre VARCHAR(200) NOT NULL,
    url_base TEXT NOT NULL,
    tipo_fuente VARCHAR(50) NOT NULL,
    
    -- Configuración de scraping
    patron_url TEXT,
    selectores_css JSONB,
    frecuencia_check INTERVAL DEFAULT '1 day',
    
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

-- Create documentos_oficiales table
CREATE TABLE IF NOT EXISTS documentos_oficiales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fuente_id UUID REFERENCES fuentes_documentacion(id),
    
    -- Identificación del documento
    titulo VARCHAR(500) NOT NULL,
    url_original TEXT NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL,
    
    -- Clasificación
    año_vigencia INTEGER NOT NULL,
    asignatura VARCHAR(100),
    nivel_educativo VARCHAR(100),
    modalidad VARCHAR(50),
    
    -- Versión y control de cambios
    version VARCHAR(50) NOT NULL,
    hash_contenido VARCHAR(64) NOT NULL,
    es_version_actual BOOLEAN DEFAULT TRUE,
    
    -- Storage
    storage_path TEXT NOT NULL,
    tamaño_bytes BIGINT,
    formato VARCHAR(20),
    
    -- Procesamiento
    procesado BOOLEAN DEFAULT FALSE,
    contenido_texto TEXT,
    contenido_estructurado JSONB,
    
    -- Fechas
    fecha_publicacion DATE,
    fecha_descarga TIMESTAMPTZ DEFAULT NOW(),
    fecha_procesamiento TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(url_original, version)
);

-- Create chunks_documentos table
CREATE TABLE IF NOT EXISTS chunks_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID NOT NULL REFERENCES documentos_oficiales(id) ON DELETE CASCADE,
    
    -- Contenido del chunk
    contenido TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    
    -- Metadata del chunk
    seccion VARCHAR(200),
    subseccion VARCHAR(200),
    pagina_numero INTEGER,
    
    -- Clasificación semántica
    dominio_mbe VARCHAR(1),
    estandar_numero INTEGER,
    tipo_contenido VARCHAR(50),
    
    -- Vector embedding para RAG
    embedding vector(1536),
    
    -- Metadata adicional
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(documento_id, chunk_index)
);

-- Create historial_cambios_documentos table
CREATE TABLE IF NOT EXISTS historial_cambios_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID NOT NULL REFERENCES documentos_oficiales(id),
    
    -- Versiones comparadas
    version_anterior VARCHAR(50),
    version_nueva VARCHAR(50) NOT NULL,
    
    -- Cambios detectados
    tipo_cambio VARCHAR(50) NOT NULL,
    
    diff_resumen TEXT,
    diff_detallado JSONB,
    
    -- Impacto
    impacto_estimado VARCHAR(20),
    requiere_reindexacion BOOLEAN DEFAULT TRUE,
    
    -- Notificaciones
    usuarios_notificados INTEGER DEFAULT 0,
    fecha_notificacion TIMESTAMPTZ,
    
    detectado_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create urls_monitoreadas table
CREATE TABLE IF NOT EXISTS urls_monitoreadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fuente_id UUID NOT NULL REFERENCES fuentes_documentacion(id),
    
    url TEXT NOT NULL UNIQUE,
    tipo_contenido VARCHAR(50) NOT NULL,
    
    -- Configuración de extracción
    selector_enlaces TEXT,
    patron_validacion TEXT,
    
    -- Estado
    activo BOOLEAN DEFAULT TRUE,
    ultimo_check TIMESTAMPTZ,
    cantidad_documentos_encontrados INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_docs_vigencia ON documentos_oficiales(año_vigencia, es_version_actual);
CREATE INDEX IF NOT EXISTS idx_docs_tipo ON documentos_oficiales(tipo_documento, es_version_actual);
CREATE INDEX IF NOT EXISTS idx_docs_asignatura ON documentos_oficiales(asignatura, año_vigencia);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON chunks_documentos USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_chunks_dominio ON chunks_documentos(dominio_mbe, estandar_numero);
CREATE INDEX IF NOT EXISTS idx_chunks_tipo ON chunks_documentos(tipo_contenido);

-- Create functions
CREATE OR REPLACE FUNCTION marcar_version_anterior()
RETURNS TRIGGER AS $$
BEGIN
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

-- Create trigger
DROP TRIGGER IF EXISTS trigger_version_actual ON documentos_oficiales;
CREATE TRIGGER trigger_version_actual
    BEFORE INSERT OR UPDATE ON documentos_oficiales
    FOR EACH ROW
    EXECUTE FUNCTION marcar_version_anterior();

-- Create RAG search function
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

-- Enable RLS
ALTER TABLE fuentes_documentacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_oficiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_cambios_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE urls_monitoreadas ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public read for authenticated users)
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer fuentes" ON fuentes_documentacion;
CREATE POLICY "Usuarios autenticados pueden leer fuentes" ON fuentes_documentacion
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer documentos" ON documentos_oficiales;
CREATE POLICY "Usuarios autenticados pueden leer documentos" ON documentos_oficiales
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer chunks" ON chunks_documentos;
CREATE POLICY "Usuarios autenticados pueden leer chunks" ON chunks_documentos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admin-only policies for management
DROP POLICY IF EXISTS "Administradores pueden gestionar fuentes" ON fuentes_documentacion;
CREATE POLICY "Administradores pueden gestionar fuentes" ON fuentes_documentacion
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Verification
SELECT 'Document system migration completed' as status;