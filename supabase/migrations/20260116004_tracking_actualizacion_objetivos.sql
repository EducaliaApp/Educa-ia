-- ============================================
-- MIGRACIÓN: Sistema de Tracking de Actualizaciones
-- ============================================
--
-- Agrega campos para tracking de cambios en objetivos_aprendizaje:
-- - hash_contenido: Hash SHA-256 para detectar cambios
-- - ultima_verificacion: Última vez que se verificó el objetivo
-- - ultima_actualizacion: Última vez que se actualizó el contenido
--
-- Permite:
-- - Actualizar solo objetivos que han cambiado
-- - Auditoría de cuándo se actualizó cada objetivo
-- - Estadísticas de actualización por categoría
-- ============================================

-- Agregar campos para tracking
ALTER TABLE objetivos_aprendizaje
ADD COLUMN IF NOT EXISTS hash_contenido VARCHAR(64),
ADD COLUMN IF NOT EXISTS ultima_verificacion TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS ultima_actualizacion TIMESTAMPTZ DEFAULT NOW();

-- Índices para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_objetivos_ultima_verificacion
ON objetivos_aprendizaje(ultima_verificacion DESC);

CREATE INDEX IF NOT EXISTS idx_objetivos_ultima_actualizacion
ON objetivos_aprendizaje(ultima_actualizacion DESC);

CREATE INDEX IF NOT EXISTS idx_objetivos_categoria_verificacion
ON objetivos_aprendizaje(categoria, ultima_verificacion DESC);

-- Comentarios
COMMENT ON COLUMN objetivos_aprendizaje.hash_contenido IS
'Hash SHA-256 del contenido para detectar cambios. Incluye: codigo, objetivo, eje, priorizado, actividades';

COMMENT ON COLUMN objetivos_aprendizaje.ultima_verificacion IS
'Última vez que se verificó este objetivo durante un proceso de scraping';

COMMENT ON COLUMN objetivos_aprendizaje.ultima_actualizacion IS
'Última vez que se actualizó el contenido de este objetivo (hubo cambios reales)';

-- Vista para estadísticas de actualización por categoría
CREATE OR REPLACE VIEW estadisticas_actualizacion_objetivos AS
SELECT
  categoria,
  COUNT(*) as total_objetivos,
  COUNT(CASE WHEN ultima_actualizacion > NOW() - INTERVAL '7 days' THEN 1 END) as actualizados_ultima_semana,
  COUNT(CASE WHEN ultima_actualizacion > NOW() - INTERVAL '30 days' THEN 1 END) as actualizados_ultimo_mes,
  COUNT(CASE WHEN ultima_actualizacion > NOW() - INTERVAL '90 days' THEN 1 END) as actualizados_ultimo_trimestre,
  COUNT(CASE WHEN ultima_verificacion > NOW() - INTERVAL '7 days' THEN 1 END) as verificados_ultima_semana,
  MAX(ultima_actualizacion) as ultima_actualizacion_categoria,
  MAX(ultima_verificacion) as ultima_verificacion_categoria,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (NOW() - ultima_actualizacion)) / 86400.0),
    1
  ) as dias_promedio_desde_actualizacion,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (NOW() - ultima_verificacion)) / 86400.0),
    1
  ) as dias_promedio_desde_verificacion
FROM objetivos_aprendizaje
WHERE ultima_actualizacion IS NOT NULL
GROUP BY categoria
ORDER BY categoria;

-- Grant para authenticated users
GRANT SELECT ON estadisticas_actualizacion_objetivos TO authenticated;

-- Comentario en la vista
COMMENT ON VIEW estadisticas_actualizacion_objetivos IS
'Estadísticas de actualización de objetivos de aprendizaje por categoría curricular';

-- Vista para objetivos desactualizados (más de 90 días sin actualizar)
CREATE OR REPLACE VIEW objetivos_desactualizados AS
SELECT
  id,
  codigo,
  categoria,
  asignatura,
  nivel,
  curso,
  ultima_actualizacion,
  ultima_verificacion,
  EXTRACT(DAY FROM (NOW() - ultima_actualizacion))::integer as dias_sin_actualizar,
  EXTRACT(DAY FROM (NOW() - ultima_verificacion))::integer as dias_sin_verificar
FROM objetivos_aprendizaje
WHERE
  ultima_actualizacion IS NOT NULL
  AND ultima_actualizacion < NOW() - INTERVAL '90 days'
ORDER BY ultima_actualizacion ASC;

-- Grant para authenticated users
GRANT SELECT ON objetivos_desactualizados TO authenticated;

-- Comentario en la vista
COMMENT ON VIEW objetivos_desactualizados IS
'Objetivos de aprendizaje que no han sido actualizados en más de 90 días';

-- RPC Function para obtener estadísticas de una ejecución ETL
CREATE OR REPLACE FUNCTION estadisticas_ejecucion_etl(p_proceso_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'proceso_id', p_proceso_id,
    'objetivos_nuevos', (
      SELECT COUNT(*)
      FROM objetivos_aprendizaje
      WHERE proceso_etl_id = p_proceso_id
        AND created_at = ultima_actualizacion
    ),
    'objetivos_actualizados', (
      SELECT COUNT(*)
      FROM objetivos_aprendizaje
      WHERE proceso_etl_id = p_proceso_id
        AND created_at < ultima_actualizacion
    ),
    'objetivos_sin_cambios', (
      SELECT COUNT(*)
      FROM objetivos_aprendizaje
      WHERE proceso_etl_id = p_proceso_id
        AND ultima_verificacion > ultima_actualizacion
    ),
    'por_categoria', (
      SELECT json_object_agg(
        categoria,
        json_build_object(
          'total', total,
          'nuevos', nuevos,
          'actualizados', actualizados
        )
      )
      FROM (
        SELECT
          categoria,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at = ultima_actualizacion) as nuevos,
          COUNT(*) FILTER (WHERE created_at < ultima_actualizacion) as actualizados
        FROM objetivos_aprendizaje
        WHERE proceso_etl_id = p_proceso_id
        GROUP BY categoria
      ) subq
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant para authenticated users
GRANT EXECUTE ON FUNCTION estadisticas_ejecucion_etl(UUID) TO authenticated;

-- Comentario en la función
COMMENT ON FUNCTION estadisticas_ejecucion_etl(UUID) IS
'Retorna estadísticas detalladas de una ejecución ETL específica';

-- Inicializar campos para registros existentes (solo si son NULL)
UPDATE objetivos_aprendizaje
SET
  ultima_verificacion = COALESCE(ultima_verificacion, updated_at, created_at),
  ultima_actualizacion = COALESCE(ultima_actualizacion, updated_at, created_at)
WHERE ultima_verificacion IS NULL OR ultima_actualizacion IS NULL;
