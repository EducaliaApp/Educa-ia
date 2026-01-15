-- ============================================
-- SISTEMA DE PROCESOS ETL
-- Tabla para registrar y monitorear procesos de extracción y transformación
-- ============================================

-- Tabla principal de procesos ETL
CREATE TABLE IF NOT EXISTS procesos_etl (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación del proceso
    nombre VARCHAR(200) NOT NULL, -- 'extraer_bases_curriculares', 'extraer_rubricas', etc.
    tipo_proceso VARCHAR(50) NOT NULL, -- 'extraccion', 'transformacion', 'carga'
    descripcion TEXT,
    
    -- Estado de ejecución
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente', 
    -- 'pendiente', 'en_progreso', 'completado', 'error', 'cancelado'
    
    -- Métricas de ejecución
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    duracion_ms BIGINT,
    
    -- Registros procesados
    total_registros INTEGER DEFAULT 0,
    registros_exitosos INTEGER DEFAULT 0,
    registros_fallidos INTEGER DEFAULT 0,
    
    -- Archivos generados
    archivos_generados JSONB DEFAULT '[]'::jsonb,
    -- [{"nombre": "bases_curriculares.csv", "path": "...", "size": 123456, "url": "..."}]
    
    -- Logs y errores
    logs TEXT[], -- Array de mensajes de log
    errores JSONB DEFAULT '[]'::jsonb,
    -- [{"timestamp": "...", "mensaje": "...", "detalle": "..."}]
    
    -- Configuración usada
    configuracion JSONB DEFAULT '{}'::jsonb,
    
    -- Usuario que ejecutó (opcional, para auditoría)
    ejecutado_por UUID REFERENCES profiles(id),
    
    -- Metadata adicional
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para documentos extraídos/transformados
CREATE TABLE IF NOT EXISTS documentos_transformados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proceso_etl_id UUID NOT NULL REFERENCES procesos_etl(id) ON DELETE CASCADE,
    
    -- Información del documento
    nombre_archivo VARCHAR(500) NOT NULL,
    tipo_documento VARCHAR(100) NOT NULL, -- 'bases_curriculares', 'objetivos_aprendizaje', etc.
    formato VARCHAR(20) NOT NULL, -- 'csv', 'json', 'xlsx'
    
    -- Storage
    storage_bucket VARCHAR(100) NOT NULL, -- 'documentos-transformados'
    storage_path TEXT NOT NULL,
    tamaño_bytes BIGINT,
    
    -- URL de acceso (temporal o permanente)
    url_descarga TEXT,
    url_expira_en TIMESTAMPTZ,
    
    -- Metadata del contenido
    num_registros INTEGER,
    columnas TEXT[], -- Array de nombres de columnas (para CSV/tablas)
    resumen_contenido JSONB DEFAULT '{}'::jsonb,
    
    -- Control de versión
    version VARCHAR(50),
    es_version_actual BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_procesos_etl_estado ON procesos_etl(estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_procesos_etl_nombre ON procesos_etl(nombre, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_procesos_etl_tipo ON procesos_etl(tipo_proceso, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_docs_transformados_proceso ON documentos_transformados(proceso_etl_id);
CREATE INDEX IF NOT EXISTS idx_docs_transformados_tipo ON documentos_transformados(tipo_documento, created_at DESC);

-- Vista para procesos recientes
CREATE OR REPLACE VIEW procesos_etl_recientes AS
SELECT 
    id,
    nombre,
    tipo_proceso,
    estado,
    fecha_inicio,
    fecha_fin,
    duracion_ms,
    total_registros,
    registros_exitosos,
    registros_fallidos,
    CASE 
        WHEN registros_exitosos > 0 AND total_registros > 0 
        THEN ROUND((registros_exitosos::decimal / total_registros::decimal) * 100, 2)
        ELSE 0 
    END as tasa_exito_porcentaje,
    (SELECT COUNT(*) FROM documentos_transformados WHERE proceso_etl_id = procesos_etl.id) as num_archivos,
    created_at,
    updated_at
FROM procesos_etl
ORDER BY created_at DESC
LIMIT 50;

-- Función para actualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION actualizar_updated_at_procesos_etl()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS trigger_actualizar_updated_at_procesos_etl ON procesos_etl;
CREATE TRIGGER trigger_actualizar_updated_at_procesos_etl
    BEFORE UPDATE ON procesos_etl
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at_procesos_etl();

-- Función para registrar inicio de proceso ETL
CREATE OR REPLACE FUNCTION iniciar_proceso_etl(
    p_nombre VARCHAR,
    p_tipo_proceso VARCHAR,
    p_descripcion TEXT DEFAULT NULL,
    p_configuracion JSONB DEFAULT '{}'::jsonb,
    p_ejecutado_por UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_proceso_id UUID;
BEGIN
    INSERT INTO procesos_etl (
        nombre,
        tipo_proceso,
        descripcion,
        estado,
        fecha_inicio,
        configuracion,
        ejecutado_por
    ) VALUES (
        p_nombre,
        p_tipo_proceso,
        p_descripcion,
        'en_progreso',
        NOW(),
        p_configuracion,
        p_ejecutado_por
    ) RETURNING id INTO v_proceso_id;
    
    RETURN v_proceso_id;
END;
$$ LANGUAGE plpgsql;

-- Función para finalizar proceso ETL
CREATE OR REPLACE FUNCTION finalizar_proceso_etl(
    p_proceso_id UUID,
    p_estado VARCHAR,
    p_total_registros INTEGER DEFAULT 0,
    p_registros_exitosos INTEGER DEFAULT 0,
    p_registros_fallidos INTEGER DEFAULT 0,
    p_archivos_generados JSONB DEFAULT '[]'::jsonb,
    p_logs TEXT[] DEFAULT ARRAY[]::TEXT[],
    p_errores JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID AS $$
DECLARE
    v_fecha_inicio TIMESTAMPTZ;
BEGIN
    -- Obtener fecha de inicio
    SELECT fecha_inicio INTO v_fecha_inicio
    FROM procesos_etl
    WHERE id = p_proceso_id;
    
    -- Actualizar proceso
    UPDATE procesos_etl
    SET 
        estado = p_estado,
        fecha_fin = NOW(),
        duracion_ms = EXTRACT(EPOCH FROM (NOW() - v_fecha_inicio)) * 1000,
        total_registros = p_total_registros,
        registros_exitosos = p_registros_exitosos,
        registros_fallidos = p_registros_fallidos,
        archivos_generados = p_archivos_generados,
        logs = p_logs,
        errores = p_errores
    WHERE id = p_proceso_id;
END;
$$ LANGUAGE plpgsql;

-- Función para agregar log a proceso ETL
CREATE OR REPLACE FUNCTION agregar_log_proceso_etl(
    p_proceso_id UUID,
    p_mensaje TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE procesos_etl
    SET logs = array_append(logs, '[' || NOW() || '] ' || p_mensaje)
    WHERE id = p_proceso_id;
END;
$$ LANGUAGE plpgsql;

-- Políticas RLS para procesos_etl (solo admin)
ALTER TABLE procesos_etl ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_transformados ENABLE ROW LEVEL SECURITY;

-- Admin puede hacer todo
CREATE POLICY "Admin full access on procesos_etl"
    ON procesos_etl FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin full access on documentos_transformados"
    ON documentos_transformados FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Usuarios pueden ver sus propios procesos
CREATE POLICY "Users can view own procesos_etl"
    ON procesos_etl FOR SELECT
    USING (ejecutado_por = auth.uid());

-- Comentarios en tablas
COMMENT ON TABLE procesos_etl IS 'Registro de procesos ETL para extracción y transformación de datos';
COMMENT ON TABLE documentos_transformados IS 'Documentos generados por procesos ETL (CSV, JSON, etc.)';
COMMENT ON COLUMN procesos_etl.estado IS 'Estado actual: pendiente, en_progreso, completado, error, cancelado';
COMMENT ON COLUMN procesos_etl.archivos_generados IS 'Array JSON con información de archivos generados';
COMMENT ON COLUMN documentos_transformados.storage_path IS 'Ruta completa en Supabase Storage';
