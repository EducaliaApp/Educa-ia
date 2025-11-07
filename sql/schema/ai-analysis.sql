-- Tabla para entidades educativas extraídas por LIA
CREATE TABLE IF NOT EXISTS entidades_educativas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID NOT NULL REFERENCES documentos_oficiales(id) ON DELETE CASCADE,
    
    -- Tipo y contenido de la entidad
    tipo VARCHAR(50) NOT NULL, -- 'objetivo_aprendizaje', 'criterio_evaluacion', 'estandar_mbe'
    texto TEXT NOT NULL,
    
    -- Clasificación semántica
    dominio_mbe VARCHAR(1), -- A, B, C, D
    nivel_taxonomico VARCHAR(50), -- 'recordar', 'comprender', 'aplicar', etc.
    asignaturas_relacionadas TEXT[], -- Array de asignaturas
    
    -- Metadata de LIA
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columnas a documentos_oficiales para LIA
ALTER TABLE documentos_oficiales 
ADD COLUMN IF NOT EXISTS clasificacion_ia JSONB,
ADD COLUMN IF NOT EXISTS entidades_extraidas INTEGER DEFAULT 0;

-- Tabla para análisis de cambios inteligentes
CREATE TABLE IF NOT EXISTS cambios_inteligentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID NOT NULL REFERENCES documentos_oficiales(id),
    
    -- Cambios detectados por LIA
    cambios_detectados JSONB NOT NULL,
    impacto_maximo VARCHAR(20) NOT NULL, -- 'critico', 'alto', 'medio', 'bajo'
    
    -- Análisis de coherencia
    coherencia_score DECIMAL(3,2),
    inconsistencias JSONB,
    
    -- Recomendaciones
    recomendaciones_accion TEXT[],
    
    detectado_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_entidades_tipo ON entidades_educativas(tipo, dominio_mbe);
CREATE INDEX IF NOT EXISTS idx_entidades_documento ON entidades_educativas(documento_id);
CREATE INDEX IF NOT EXISTS idx_cambios_impacto ON cambios_inteligentes(impacto_maximo, detectado_at DESC);

-- RLS para seguridad
ALTER TABLE entidades_educativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cambios_inteligentes ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Usuarios pueden ver entidades" ON entidades_educativas
    FOR SELECT USING (true);

CREATE POLICY "Administradores pueden ver cambios" ON cambios_inteligentes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );