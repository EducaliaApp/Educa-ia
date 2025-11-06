-- ============================================
-- TABLA: function_logs
-- Sistema de logging para Edge Functions
-- ============================================

CREATE TABLE IF NOT EXISTS function_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identificación de la function
  function_name VARCHAR(100) NOT NULL,
  request_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Nivel de log
  level VARCHAR(10) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),

  -- Contenido del log
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Contexto de ejecución
  execution_time_ms INTEGER,
  memory_used_mb DECIMAL(10,2),

  -- Stack trace en caso de error
  stack_trace TEXT,
  error_details JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Índices para búsqueda eficiente
  CONSTRAINT function_logs_level_check CHECK (level IN ('debug', 'info', 'warn', 'error'))
);

-- Índices para consultas rápidas
CREATE INDEX idx_function_logs_name ON function_logs(function_name, created_at DESC);
CREATE INDEX idx_function_logs_level ON function_logs(level, created_at DESC);
CREATE INDEX idx_function_logs_user ON function_logs(user_id, created_at DESC);
CREATE INDEX idx_function_logs_request ON function_logs(request_id);
CREATE INDEX idx_function_logs_created ON function_logs(created_at DESC);

-- Índice en JSONB para búsqueda en metadata
CREATE INDEX idx_function_logs_metadata ON function_logs USING GIN (metadata);

-- RLS: Solo admins y service role pueden ver logs
ALTER TABLE function_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Administradores pueden ver todos los logs"
  ON function_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Service role puede insertar logs"
  ON function_logs FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS anyway

-- Función para limpiar logs antiguos automáticamente (mantener últimos 30 días)
CREATE OR REPLACE FUNCTION cleanup_old_function_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM function_logs
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND level NOT IN ('error'); -- Mantener errores por más tiempo

  DELETE FROM function_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND level = 'error'; -- Mantener errores por 90 días

  RAISE NOTICE 'Limpieza de logs antiguos completada';
END;
$$ LANGUAGE plpgsql;

-- Vista para logs recientes por función
CREATE OR REPLACE VIEW function_logs_summary AS
SELECT
  function_name,
  level,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence,
  AVG(execution_time_ms) as avg_execution_ms
FROM function_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY function_name, level
ORDER BY function_name, level;

-- Comentarios
COMMENT ON TABLE function_logs IS 'Registro de logs de Edge Functions para debugging y monitoreo';
COMMENT ON COLUMN function_logs.function_name IS 'Nombre de la Edge Function que generó el log';
COMMENT ON COLUMN function_logs.level IS 'Nivel de severidad: debug, info, warn, error';
COMMENT ON COLUMN function_logs.metadata IS 'Datos adicionales en formato JSON';
COMMENT ON COLUMN function_logs.execution_time_ms IS 'Tiempo de ejecución en milisegundos';
