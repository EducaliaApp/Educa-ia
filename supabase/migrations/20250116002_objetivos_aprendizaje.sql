-- ============================================
-- TABLA: objetivos_aprendizaje
-- Almacena los Objetivos de Aprendizaje (OA, OAH, OAA) extraídos
-- desde el sitio de Currículum Nacional de Chile
-- ============================================

CREATE TABLE IF NOT EXISTS objetivos_aprendizaje (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificación del objetivo
    codigo VARCHAR(50) NOT NULL, -- "AR01 OA 01", "MA04 OAH a", "LE05 OAA A"
    tipo_objetivo VARCHAR(20) NOT NULL CHECK (tipo_objetivo IN ('contenido', 'habilidad', 'actitud')),

    -- Clasificación curricular
    categoria VARCHAR(100) NOT NULL, -- "Educación Básica 1° a 6°", "Educación Parvularia", etc.
    asignatura VARCHAR(100) NOT NULL, -- "Matemática", "Lenguaje y Comunicación", etc.
    eje VARCHAR(200), -- "Números y operaciones", "Lectura", etc.
    nivel VARCHAR(50) NOT NULL, -- "1° Básico", "2° Básico", etc.
    curso VARCHAR(50) NOT NULL, -- "1° Básico", "2° Básico", etc.

    -- Contenido del objetivo
    objetivo TEXT NOT NULL, -- Descripción completa del objetivo
    priorizado BOOLEAN DEFAULT FALSE, -- Si es objetivo basal/priorizado

    -- Actividades relacionadas (máximo 4)
    actividades JSONB DEFAULT '[]'::jsonb,
    -- [{"titulo": "...", "url": "..."}, ...]

    -- Metadata de extracción
    url_fuente TEXT, -- URL de donde se extrajo
    fecha_extraccion TIMESTAMPTZ DEFAULT NOW(),
    version VARCHAR(20), -- Versión de las bases curriculares (ej. "2025")
    proceso_etl_id UUID REFERENCES procesos_etl(id), -- Referencia al proceso ETL que lo creó

    -- Búsqueda de texto completo
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('spanish', coalesce(codigo, '')), 'A') ||
        setweight(to_tsvector('spanish', coalesce(asignatura, '')), 'B') ||
        setweight(to_tsvector('spanish', coalesce(objetivo, '')), 'C')
    ) STORED,

    -- Metadata adicional
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Control de versiones
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: Un código único por categoría, nivel y versión
    UNIQUE(codigo, categoria, nivel, version)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_oa_categoria ON objetivos_aprendizaje(categoria);
CREATE INDEX IF NOT EXISTS idx_oa_asignatura ON objetivos_aprendizaje(asignatura);
CREATE INDEX IF NOT EXISTS idx_oa_nivel ON objetivos_aprendizaje(nivel);
CREATE INDEX IF NOT EXISTS idx_oa_codigo ON objetivos_aprendizaje(codigo);
CREATE INDEX IF NOT EXISTS idx_oa_tipo ON objetivos_aprendizaje(tipo_objetivo);
CREATE INDEX IF NOT EXISTS idx_oa_priorizado ON objetivos_aprendizaje(priorizado) WHERE priorizado = TRUE;
CREATE INDEX IF NOT EXISTS idx_oa_search ON objetivos_aprendizaje USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_oa_version ON objetivos_aprendizaje(version) WHERE version IS NOT NULL;

-- Índice compuesto para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_oa_categoria_asignatura_nivel
    ON objetivos_aprendizaje(categoria, asignatura, nivel);

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE objetivos_aprendizaje IS 'Almacena los Objetivos de Aprendizaje extraídos de las Bases Curriculares del MINEDUC';

COMMENT ON COLUMN objetivos_aprendizaje.codigo IS 'Código único del objetivo (ej: MA04 OA 01, LE05 OAH a, CN03 OAA A)';
COMMENT ON COLUMN objetivos_aprendizaje.tipo_objetivo IS 'Tipo de objetivo: contenido (OA), habilidad (OAH) o actitud (OAA)';
COMMENT ON COLUMN objetivos_aprendizaje.categoria IS 'Categoría del nivel educativo según Currículum Nacional';
COMMENT ON COLUMN objetivos_aprendizaje.asignatura IS 'Nombre de la asignatura o ámbito';
COMMENT ON COLUMN objetivos_aprendizaje.eje IS 'Eje o núcleo curricular del objetivo';
COMMENT ON COLUMN objetivos_aprendizaje.priorizado IS 'Indica si es un objetivo basal o priorizado';
COMMENT ON COLUMN objetivos_aprendizaje.actividades IS 'Array JSON con actividades sugeridas del sitio oficial';
COMMENT ON COLUMN objetivos_aprendizaje.search_vector IS 'Vector de búsqueda de texto completo generado automáticamente';
COMMENT ON COLUMN objetivos_aprendizaje.version IS 'Año de la versión de las bases curriculares (ej: 2025)';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE objetivos_aprendizaje ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer los objetivos
CREATE POLICY "Objetivos de aprendizaje son públicos"
    ON objetivos_aprendizaje
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Política: Solo admins pueden insertar/actualizar/eliminar
CREATE POLICY "Solo admins pueden modificar objetivos"
    ON objetivos_aprendizaje
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'maintainer')
        )
    );

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para buscar objetivos por texto
CREATE OR REPLACE FUNCTION buscar_objetivos_aprendizaje(
    p_query TEXT,
    p_categoria TEXT DEFAULT NULL,
    p_asignatura TEXT DEFAULT NULL,
    p_nivel TEXT DEFAULT NULL,
    p_tipo_objetivo TEXT DEFAULT NULL,
    p_solo_priorizados BOOLEAN DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    codigo VARCHAR,
    tipo_objetivo VARCHAR,
    categoria VARCHAR,
    asignatura VARCHAR,
    eje VARCHAR,
    nivel VARCHAR,
    objetivo TEXT,
    priorizado BOOLEAN,
    rank REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        oa.id,
        oa.codigo,
        oa.tipo_objetivo,
        oa.categoria,
        oa.asignatura,
        oa.eje,
        oa.nivel,
        oa.objetivo,
        oa.priorizado,
        ts_rank(oa.search_vector, websearch_to_tsquery('spanish', p_query)) as rank
    FROM objetivos_aprendizaje oa
    WHERE
        (p_query IS NULL OR oa.search_vector @@ websearch_to_tsquery('spanish', p_query))
        AND (p_categoria IS NULL OR oa.categoria = p_categoria)
        AND (p_asignatura IS NULL OR oa.asignatura = p_asignatura)
        AND (p_nivel IS NULL OR oa.nivel = p_nivel)
        AND (p_tipo_objetivo IS NULL OR oa.tipo_objetivo = p_tipo_objetivo)
        AND (p_solo_priorizados IS NULL OR oa.priorizado = p_solo_priorizados)
    ORDER BY rank DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION buscar_objetivos_aprendizaje IS 'Busca objetivos de aprendizaje usando búsqueda de texto completo con filtros opcionales';

-- Función para obtener estadísticas de objetivos
CREATE OR REPLACE FUNCTION estadisticas_objetivos_aprendizaje(
    p_categoria TEXT DEFAULT NULL,
    p_asignatura TEXT DEFAULT NULL
)
RETURNS TABLE (
    categoria VARCHAR,
    asignatura VARCHAR,
    total_objetivos BIGINT,
    objetivos_contenido BIGINT,
    objetivos_habilidades BIGINT,
    objetivos_actitudes BIGINT,
    objetivos_priorizados BIGINT
)
LANGUAGE sql
AS $$
    SELECT
        oa.categoria,
        oa.asignatura,
        COUNT(*) as total_objetivos,
        COUNT(*) FILTER (WHERE oa.tipo_objetivo = 'contenido') as objetivos_contenido,
        COUNT(*) FILTER (WHERE oa.tipo_objetivo = 'habilidad') as objetivos_habilidades,
        COUNT(*) FILTER (WHERE oa.tipo_objetivo = 'actitud') as objetivos_actitudes,
        COUNT(*) FILTER (WHERE oa.priorizado = TRUE) as objetivos_priorizados
    FROM objetivos_aprendizaje oa
    WHERE
        (p_categoria IS NULL OR oa.categoria = p_categoria)
        AND (p_asignatura IS NULL OR oa.asignatura = p_asignatura)
    GROUP BY oa.categoria, oa.asignatura
    ORDER BY oa.categoria, oa.asignatura;
$$;

COMMENT ON FUNCTION estadisticas_objetivos_aprendizaje IS 'Obtiene estadísticas agrupadas de objetivos por categoría y asignatura';

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_objetivos_aprendizaje_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_objetivos_aprendizaje_updated_at
    BEFORE UPDATE ON objetivos_aprendizaje
    FOR EACH ROW
    EXECUTE FUNCTION update_objetivos_aprendizaje_updated_at();
