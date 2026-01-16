-- ============================================
-- MIGRATION 11: System Monitoring
-- ============================================

-- Create system_logs table
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL,
    level VARCHAR(10) NOT NULL,
    component VARCHAR(100) NOT NULL,
    event VARCHAR(200) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create health_metrics table
CREATE TABLE IF NOT EXISTS health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    overall_status VARCHAR(20) NOT NULL,
    checks JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notificaciones_admin table (if not exists)
CREATE TABLE IF NOT EXISTS notificaciones_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    leida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'system_logs_level_check'
    ) THEN
        ALTER TABLE system_logs
        ADD CONSTRAINT system_logs_level_check
        CHECK (level IN ('info', 'warn', 'error'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'health_metrics_status_check'
    ) THEN
        ALTER TABLE health_metrics
        ADD CONSTRAINT health_metrics_status_check
        CHECK (overall_status IN ('healthy', 'degraded', 'unhealthy'));
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_metrics_timestamp ON health_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_metrics_status ON health_metrics(overall_status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_admin_leida ON notificaciones_admin(leida, created_at DESC);

-- Enable RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_admin ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only)
DROP POLICY IF EXISTS "Administradores pueden ver logs" ON system_logs;
CREATE POLICY "Administradores pueden ver logs" ON system_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Administradores pueden ver métricas" ON health_metrics;
CREATE POLICY "Administradores pueden ver métricas" ON health_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Administradores pueden ver notificaciones" ON notificaciones_admin;
CREATE POLICY "Administradores pueden ver notificaciones" ON notificaciones_admin
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create function to log system events
CREATE OR REPLACE FUNCTION log_system_event(
    p_level VARCHAR(10),
    p_component VARCHAR(100),
    p_event VARCHAR(200),
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
    INSERT INTO system_logs (timestamp, level, component, event, metadata)
    VALUES (NOW(), p_level, p_component, p_event, p_metadata);
END;
$$ LANGUAGE plpgsql;

-- Create function to record health metrics
CREATE OR REPLACE FUNCTION record_health_metrics(
    p_overall_status VARCHAR(20),
    p_checks JSONB
)
RETURNS void AS $$
BEGIN
    INSERT INTO health_metrics (overall_status, checks, timestamp)
    VALUES (p_overall_status, p_checks, NOW());
END;
$$ LANGUAGE plpgsql;

-- Verification
SELECT 'System monitoring migration completed' as status;