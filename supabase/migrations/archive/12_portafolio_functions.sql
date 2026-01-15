-- ============================================
-- MIGRATION 12: Portafolio Functions
-- ============================================

-- Function: Calcular progreso del portafolio
DROP FUNCTION IF EXISTS calcular_progreso_portafolio(uuid);
CREATE OR REPLACE FUNCTION calcular_progreso_portafolio(p_portafolio_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  total_tareas integer;
  tareas_completadas integer;
  progreso integer;
BEGIN
  -- Contar total de tareas en el portafolio
  SELECT COUNT(*)
  INTO total_tareas
  FROM tareas_portafolio t
  JOIN modulos_portafolio m ON t.modulo_id = m.id
  WHERE m.portafolio_id = p_portafolio_id;
  
  -- Contar tareas completadas
  SELECT COUNT(*)
  INTO tareas_completadas
  FROM tareas_portafolio t
  JOIN modulos_portafolio m ON t.modulo_id = m.id
  WHERE m.portafolio_id = p_portafolio_id
    AND t.completado = TRUE;
  
  -- Calcular porcentaje
  IF total_tareas > 0 THEN
    progreso := ROUND((tareas_completadas::decimal / total_tareas) * 100);
  ELSE
    progreso := 0;
  END IF;
  
  -- Actualizar portafolio
  UPDATE portafolios
  SET progreso_porcentaje = progreso,
      updated_at = NOW()
  WHERE id = p_portafolio_id;
  
  RETURN progreso;
END;
$$;

-- Function: Incrementar métricas de uso
DROP FUNCTION IF EXISTS incrementar_metricas_uso(uuid, date, int, int, int, int, int, int, decimal);
CREATE OR REPLACE FUNCTION incrementar_metricas_uso(
  p_profesor_id uuid,
  p_fecha date,
  analisis_planificacion int DEFAULT 0,
  analisis_evaluacion int DEFAULT 0,
  analisis_reflexion int DEFAULT 0,
  analisis_clase_grabada int DEFAULT 0,
  analisis_trabajo_colaborativo int DEFAULT 0,
  tokens_usados int DEFAULT 0,
  costo_usd decimal DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO metricas_uso (
    profesor_id,
    fecha,
    analisis_planificacion,
    analisis_evaluacion,
    analisis_reflexion,
    analisis_clase_grabada,
    analisis_trabajo_colaborativo,
    tokens_usados,
    costo_usd
  ) VALUES (
    p_profesor_id,
    p_fecha,
    analisis_planificacion,
    analisis_evaluacion,
    analisis_reflexion,
    analisis_clase_grabada,
    analisis_trabajo_colaborativo,
    tokens_usados,
    costo_usd
  )
  ON CONFLICT (profesor_id, fecha)
  DO UPDATE SET
    analisis_planificacion = metricas_uso.analisis_planificacion + EXCLUDED.analisis_planificacion,
    analisis_evaluacion = metricas_uso.analisis_evaluacion + EXCLUDED.analisis_evaluacion,
    analisis_reflexion = metricas_uso.analisis_reflexion + EXCLUDED.analisis_reflexion,
    analisis_clase_grabada = metricas_uso.analisis_clase_grabada + EXCLUDED.analisis_clase_grabada,
    analisis_trabajo_colaborativo = metricas_uso.analisis_trabajo_colaborativo + EXCLUDED.analisis_trabajo_colaborativo,
    tokens_usados = metricas_uso.tokens_usados + EXCLUDED.tokens_usados,
    costo_usd = metricas_uso.costo_usd + EXCLUDED.costo_usd,
    updated_at = NOW();
END;
$$;

-- Function: Buscar rúbricas similares
DROP FUNCTION IF EXISTS buscar_rubricas_similares(vector, float, int, int, text, nivel_educativo, text);
CREATE OR REPLACE FUNCTION buscar_rubricas_similares(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  p_año_vigencia int DEFAULT NULL,
  p_asignatura text DEFAULT NULL,
  p_nivel nivel_educativo DEFAULT NULL,
  p_modalidad text DEFAULT 'regular'
)
RETURNS TABLE (
  id uuid,
  asignatura text,
  nivel_educativo nivel_educativo,
  modalidad text,
  dominio dominio_mbe,
  estandar_numero int,
  nombre_estandar text,
  descripcion_estandar text,
  contenido_texto text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.asignatura,
    r.nivel_educativo,
    r.modalidad,
    r.dominio,
    r.estandar_numero,
    r.nombre_estandar,
    r.descripcion_estandar,
    r.contenido_texto,
    1 - (r.embedding <=> query_embedding) as similarity
  FROM rubricas_mbe r
  WHERE 
    (p_año_vigencia IS NULL OR r.año_vigencia = p_año_vigencia)
    AND (p_asignatura IS NULL OR r.asignatura = p_asignatura)
    AND (p_nivel IS NULL OR r.nivel_educativo = p_nivel)
    AND (p_modalidad IS NULL OR r.modalidad = p_modalidad)
    AND 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to portafolio tables
DROP TRIGGER IF EXISTS portafolios_updated_at ON portafolios;
CREATE TRIGGER portafolios_updated_at
  BEFORE UPDATE ON portafolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS modulos_updated_at ON modulos_portafolio;
CREATE TRIGGER modulos_updated_at
  BEFORE UPDATE ON modulos_portafolio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tareas_updated_at ON tareas_portafolio;
CREATE TRIGGER tareas_updated_at
  BEFORE UPDATE ON tareas_portafolio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS videos_updated_at ON videos_clase;
CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON videos_clase
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS metricas_updated_at ON metricas_uso;
CREATE TRIGGER metricas_updated_at
  BEFORE UPDATE ON metricas_uso
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Verification
SELECT 'Portafolio functions migration completed' as status;