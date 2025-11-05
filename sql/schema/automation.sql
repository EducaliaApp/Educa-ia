-- Agregar columnas para automatización a documentos_oficiales
ALTER TABLE documentos_oficiales 
ADD COLUMN IF NOT EXISTS estado_procesamiento VARCHAR(50),
ADD COLUMN IF NOT EXISTS progreso_procesamiento INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS etapa_actual VARCHAR(50),
ADD COLUMN IF NOT EXISTS error_procesamiento TEXT,
ADD COLUMN IF NOT EXISTS etapa_fallida VARCHAR(50);

-- Tabla para reintentos automáticos
CREATE TABLE IF NOT EXISTS reintentos_procesamiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID NOT NULL REFERENCES documentos_oficiales(id) ON DELETE CASCADE,
    
    -- Programación del reintento
    programado_para TIMESTAMPTZ NOT NULL,
    intentos INTEGER DEFAULT 0,
    
    -- Información del error
    ultimo_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para métricas de procesamiento
CREATE TABLE IF NOT EXISTS metricas_procesamiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tipo de operación
    tipo VARCHAR(50) NOT NULL, -- 'lote', 'individual', 'auto_healing'
    
    -- Métricas básicas
    documentos_procesados INTEGER DEFAULT 0,
    documentos_fallidos INTEGER DEFAULT 0,
    tiempo_total_ms BIGINT NOT NULL,
    
    -- Configuración usada
    concurrencia_usada INTEGER,
    
    -- Metadata adicional
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columna para compresión de chunks
ALTER TABLE chunks_documentos 
ADD COLUMN IF NOT EXISTS comprimido BOOLEAN DEFAULT FALSE;

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_docs_estado_procesamiento ON documentos_oficiales(estado_procesamiento, updated_at);
CREATE INDEX IF NOT EXISTS idx_reintentos_programados ON reintentos_procesamiento(programado_para, intentos);
CREATE INDEX IF NOT EXISTS idx_metricas_tipo ON metricas_procesamiento(tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chunks_comprimido ON chunks_documentos(comprimido, created_at);

-- Vista para documentos pendientes
CREATE OR REPLACE VIEW documentos_pendientes AS
SELECT 
    id,
    titulo,
    tipo_documento,
    año_vigencia,
    storage_path,
    estado_procesamiento,
    progreso_procesamiento,
    etapa_actual,
    created_at
FROM documentos_oficiales 
WHERE procesado = FALSE 
  AND (estado_procesamiento IS NULL OR estado_procesamiento != 'fallido_permanente')
ORDER BY created_at ASC;

-- Vista para métricas de rendimiento
CREATE OR REPLACE VIEW metricas_rendimiento AS
SELECT 
    DATE(created_at) as fecha,
    tipo,
    COUNT(*) as operaciones,
    SUM(documentos_procesados) as total_procesados,
    SUM(documentos_fallidos) as total_fallidos,
    AVG(tiempo_total_ms) as tiempo_promedio_ms,
    AVG(concurrencia_usada) as concurrencia_promedio
FROM metricas_procesamiento 
GROUP BY DATE(created_at), tipo
ORDER BY fecha DESC, tipo;

-- Función para limpiar datos antiguos automáticamente
CREATE OR REPLACE FUNCTION limpiar_datos_antiguos()
RETURNS void AS $$
BEGIN
    -- Limpiar logs de sistema (mantener solo últimos 30 días)
    DELETE FROM system_logs 
    WHERE timestamp < NOW() - INTERVAL '30 days'
      AND level != 'error';
    
    -- Limpiar métricas antiguas (mantener solo últimos 90 días)
    DELETE FROM metricas_procesamiento 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Limpiar reintentos completados antiguos
    DELETE FROM reintentos_procesamiento 
    WHERE created_at < NOW() - INTERVAL '7 days'
      AND intentos >= 3;
      
    RAISE NOTICE 'Limpieza de datos antiguos completada';
END;
$$ LANGUAGE plpgsql;

-- RLS para nuevas tablas
ALTER TABLE reintentos_procesamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_procesamiento ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Administradores pueden gestionar reintentos" ON reintentos_procesamiento
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Administradores pueden ver métricas" ON metricas_procesamiento
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );