-- Tabla para notificaciones administrativas
CREATE TABLE IF NOT EXISTS notificaciones_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tipo y contenido
    tipo VARCHAR(50) NOT NULL, -- 'cambios_documentos', 'error_sistema', 'procesamiento_completado'
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    
    -- Prioridad y estado
    prioridad VARCHAR(20) DEFAULT 'media', -- 'critica', 'alta', 'media', 'baja'
    leida BOOLEAN DEFAULT FALSE,
    
    -- Metadata adicional
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Fechas
    fecha TIMESTAMPTZ DEFAULT NOW(),
    fecha_leida TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_notificaciones_admin_fecha ON notificaciones_admin(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_admin_tipo ON notificaciones_admin(tipo, leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_admin_prioridad ON notificaciones_admin(prioridad, leida);

-- RLS para seguridad
ALTER TABLE notificaciones_admin ENABLE ROW LEVEL SECURITY;

-- Solo administradores pueden ver notificaciones
CREATE POLICY "Administradores pueden ver notificaciones" ON notificaciones_admin
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );