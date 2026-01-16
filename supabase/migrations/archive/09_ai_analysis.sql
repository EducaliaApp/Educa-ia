-- ============================================
-- MIGRATION 09: AI Analysis Extensions
-- ============================================

-- Create entidades_educativas table
CREATE TABLE IF NOT EXISTS entidades_educativas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID NOT NULL REFERENCES documentos_oficiales(id) ON DELETE CASCADE,
    
    -- Tipo y contenido de la entidad
    tipo VARCHAR(50) NOT NULL,
    texto TEXT NOT NULL,
    
    -- Clasificación semántica
    dominio_mbe VARCHAR(1),
    nivel_taxonomico VARCHAR(50),
    asignaturas_relacionadas TEXT[],
    
    -- Metadata de LIA
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cambios_inteligentes table
CREATE TABLE IF NOT EXISTS cambios_inteligentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID NOT NULL REFERENCES documentos_oficiales(id),
    
    -- Cambios detectados por LIA
    cambios_detectados JSONB NOT NULL,
    impacto_maximo VARCHAR(20) NOT NULL,
    
    -- Análisis de coherencia
    coherencia_score DECIMAL(3,2),
    inconsistencias JSONB,
    
    -- Recomendaciones
    recomendaciones_accion TEXT[],
    
    detectado_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add AI analysis columns to documentos_oficiales
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documentos_oficiales' AND column_name='clasificacion_ia') THEN
        ALTER TABLE documentos_oficiales ADD COLUMN clasificacion_ia JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documentos_oficiales' AND column_name='entidades_extraidas') THEN
        ALTER TABLE documentos_oficiales ADD COLUMN entidades_extraidas INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_entidades_tipo ON entidades_educativas(tipo, dominio_mbe);
CREATE INDEX IF NOT EXISTS idx_entidades_documento ON entidades_educativas(documento_id);
CREATE INDEX IF NOT EXISTS idx_cambios_impacto ON cambios_inteligentes(impacto_maximo, detectado_at DESC);

-- Enable RLS
ALTER TABLE entidades_educativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cambios_inteligentes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuarios pueden ver entidades" ON entidades_educativas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Administradores pueden ver cambios" ON cambios_inteligentes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Verification
SELECT 'AI analysis migration completed' as status;