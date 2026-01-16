-- Migración: Sistema de Rúbricas MBE 2025
-- Descripción: Tabla principal para almacenar rúbricas del Marco para la Buena Enseñanza
-- Autor: ProfeFlow
-- Fecha: 2025-01-07

-- Crear tabla principal de rúbricas
CREATE TABLE IF NOT EXISTS rubricas_mbe (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Identificación del indicador
  indicador_id TEXT NOT NULL,
  nombre_indicador TEXT NOT NULL,
  descripcion_general TEXT,

  -- Contexto de aplicación
  año_vigencia INTEGER NOT NULL DEFAULT 2025,
  nivel_educativo TEXT NOT NULL,
  asignatura TEXT,
  modalidad TEXT DEFAULT 'regular',

  -- Módulo y tarea
  modulo INTEGER NOT NULL CHECK (modulo IN (1, 2, 3)),
  tarea INTEGER,

  -- Peso ponderado (para cálculo de puntaje final)
  peso_porcentaje NUMERIC(5,2),

  -- Estructura de evaluación (JSONB)
  niveles_desempeno JSONB NOT NULL,

  -- Metadata oficial
  fuente_oficial TEXT,
  pagina_manual INTEGER,
  notas_aclaratorias TEXT,
  ejemplos TEXT[],

  -- Estado y versión
  activo BOOLEAN DEFAULT TRUE,
  version TEXT DEFAULT '1.0',

  -- Constraint única
  UNIQUE(indicador_id, año_vigencia, nivel_educativo, COALESCE(asignatura, ''))
);

-- Comentarios en la tabla
COMMENT ON TABLE rubricas_mbe IS 'Rúbricas oficiales del Marco para la Buena Enseñanza (MBE) 2025';
COMMENT ON COLUMN rubricas_mbe.indicador_id IS 'ID único del indicador (ej: M1_I1, M2_I3)';
COMMENT ON COLUMN rubricas_mbe.niveles_desempeno IS 'JSONB con estructura de niveles: destacado, competente, basico, insatisfactorio';
COMMENT ON COLUMN rubricas_mbe.peso_porcentaje IS 'Peso del indicador en el cálculo del puntaje final del módulo';

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_rubricas_contexto
  ON rubricas_mbe(año_vigencia, nivel_educativo, asignatura, activo);

CREATE INDEX IF NOT EXISTS idx_rubricas_modulo
  ON rubricas_mbe(modulo, tarea);

CREATE INDEX IF NOT EXISTS idx_rubricas_indicador
  ON rubricas_mbe(indicador_id);

CREATE INDEX IF NOT EXISTS idx_rubricas_niveles
  ON rubricas_mbe USING GIN (niveles_desempeno);

-- Trigger para updated_at
CREATE TRIGGER rubricas_mbe_updated_at
  BEFORE UPDATE ON rubricas_mbe
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabla para almacenar evaluaciones de indicadores
CREATE TABLE IF NOT EXISTS evaluaciones_indicador (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Referencias
  tarea_id UUID NOT NULL REFERENCES tareas_portafolio(id) ON DELETE CASCADE,
  indicador_id TEXT NOT NULL,
  rubrica_id UUID REFERENCES rubricas_mbe(id) ON DELETE SET NULL,

  -- Resultado de la evaluación
  nivel_alcanzado TEXT NOT NULL CHECK (nivel_alcanzado IN ('Destacado', 'Competente', 'Básico', 'Insatisfactorio')),
  puntaje NUMERIC(3,1) NOT NULL CHECK (puntaje IN (4.0, 3.0, 2.0, 1.0)),

  -- Condiciones evaluadas
  condiciones_cumplidas INTEGER NOT NULL,
  condiciones_totales INTEGER NOT NULL,
  condiciones_evaluadas JSONB,

  -- Feedback detallado
  justificacion TEXT,
  para_siguiente_nivel TEXT,
  evidencias_textuales TEXT[],
  fortalezas TEXT[],
  recomendaciones JSONB,

  -- Correcciones automáticas
  correccion_aplicada BOOLEAN DEFAULT FALSE,
  nota_correccion TEXT,

  -- Estadísticas comparativas
  promedio_nacional NUMERIC(3,2),
  desviacion_estandar NUMERIC(3,2),
  percentil INTEGER CHECK (percentil >= 0 AND percentil <= 100),

  -- Metadata de evaluación
  modelo_ia TEXT,
  tokens_utilizados INTEGER,
  tiempo_evaluacion_ms INTEGER,

  UNIQUE(tarea_id, indicador_id)
);

COMMENT ON TABLE evaluaciones_indicador IS 'Resultados de evaluaciones de indicadores MBE usando IA';
COMMENT ON COLUMN evaluaciones_indicador.condiciones_evaluadas IS 'JSONB con detalles de cada condición evaluada';
COMMENT ON COLUMN evaluaciones_indicador.recomendaciones IS 'JSONB con recomendaciones priorizadas para mejorar';

-- Índices para evaluaciones_indicador
CREATE INDEX IF NOT EXISTS idx_evaluaciones_tarea
  ON evaluaciones_indicador(tarea_id);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_indicador
  ON evaluaciones_indicador(indicador_id);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_nivel
  ON evaluaciones_indicador(nivel_alcanzado);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_puntaje
  ON evaluaciones_indicador(puntaje);

-- Trigger para updated_at
CREATE TRIGGER evaluaciones_indicador_updated_at
  BEFORE UPDATE ON evaluaciones_indicador
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabla para estadísticas agregadas
CREATE TABLE IF NOT EXISTS estadisticas_indicadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contexto
  indicador_id TEXT NOT NULL,
  año INTEGER NOT NULL,
  nivel_educativo TEXT NOT NULL,
  asignatura TEXT,

  -- Estadísticas
  total_evaluaciones INTEGER DEFAULT 0,
  puntaje_promedio NUMERIC(3,2),
  desviacion_estandar NUMERIC(3,2),

  -- Distribución por nivel
  porcentaje_destacado NUMERIC(5,2),
  porcentaje_competente NUMERIC(5,2),
  porcentaje_basico NUMERIC(5,2),
  porcentaje_insatisfactorio NUMERIC(5,2),

  -- Última actualización
  ultima_actualizacion TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(indicador_id, año, nivel_educativo, COALESCE(asignatura, ''))
);

COMMENT ON TABLE estadisticas_indicadores IS 'Estadísticas agregadas de evaluaciones por indicador para comparación y benchmarking';

-- Índice
CREATE INDEX IF NOT EXISTS idx_estadisticas_contexto
  ON estadisticas_indicadores(indicador_id, año, nivel_educativo, asignatura);

-- Trigger para updated_at
CREATE TRIGGER estadisticas_indicadores_updated_at
  BEFORE UPDATE ON estadisticas_indicadores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar estadísticas
CREATE OR REPLACE FUNCTION actualizar_estadisticas_indicador(
  p_indicador_id TEXT,
  p_año INTEGER,
  p_nivel_educativo TEXT,
  p_asignatura TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_total INTEGER;
  v_promedio NUMERIC(3,2);
  v_desviacion NUMERIC(3,2);
  v_pct_destacado NUMERIC(5,2);
  v_pct_competente NUMERIC(5,2);
  v_pct_basico NUMERIC(5,2);
  v_pct_insatisfactorio NUMERIC(5,2);
BEGIN
  -- Calcular estadísticas desde evaluaciones_indicador
  SELECT
    COUNT(*),
    AVG(puntaje)::NUMERIC(3,2),
    STDDEV(puntaje)::NUMERIC(3,2),
    (COUNT(*) FILTER (WHERE nivel_alcanzado = 'Destacado')::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2),
    (COUNT(*) FILTER (WHERE nivel_alcanzado = 'Competente')::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2),
    (COUNT(*) FILTER (WHERE nivel_alcanzado = 'Básico')::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2),
    (COUNT(*) FILTER (WHERE nivel_alcanzado = 'Insatisfactorio')::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2)
  INTO
    v_total,
    v_promedio,
    v_desviacion,
    v_pct_destacado,
    v_pct_competente,
    v_pct_basico,
    v_pct_insatisfactorio
  FROM evaluaciones_indicador ei
  JOIN tareas_portafolio tp ON ei.tarea_id = tp.id
  JOIN modulos_portafolio mp ON tp.modulo_id = mp.id
  JOIN portafolios p ON mp.portafolio_id = p.id
  WHERE
    ei.indicador_id = p_indicador_id
    AND p.nivel_educativo = p_nivel_educativo
    AND (p_asignatura IS NULL OR p.asignatura = p_asignatura)
    AND EXTRACT(YEAR FROM ei.created_at) = p_año;

  -- Upsert en estadisticas_indicadores
  INSERT INTO estadisticas_indicadores (
    indicador_id,
    año,
    nivel_educativo,
    asignatura,
    total_evaluaciones,
    puntaje_promedio,
    desviacion_estandar,
    porcentaje_destacado,
    porcentaje_competente,
    porcentaje_basico,
    porcentaje_insatisfactorio,
    ultima_actualizacion
  ) VALUES (
    p_indicador_id,
    p_año,
    p_nivel_educativo,
    p_asignatura,
    v_total,
    v_promedio,
    v_desviacion,
    v_pct_destacado,
    v_pct_competente,
    v_pct_basico,
    v_pct_insatisfactorio,
    NOW()
  )
  ON CONFLICT (indicador_id, año, nivel_educativo, COALESCE(asignatura, ''))
  DO UPDATE SET
    total_evaluaciones = EXCLUDED.total_evaluaciones,
    puntaje_promedio = EXCLUDED.puntaje_promedio,
    desviacion_estandar = EXCLUDED.desviacion_estandar,
    porcentaje_destacado = EXCLUDED.porcentaje_destacado,
    porcentaje_competente = EXCLUDED.porcentaje_competente,
    porcentaje_basico = EXCLUDED.porcentaje_basico,
    porcentaje_insatisfactorio = EXCLUDED.porcentaje_insatisfactorio,
    ultima_actualizacion = NOW();

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_estadisticas_indicador IS 'Recalcula y actualiza las estadísticas agregadas de un indicador específico';

-- Función para obtener rúbricas según contexto
CREATE OR REPLACE FUNCTION obtener_rubricas_contexto(
  p_año INTEGER,
  p_nivel_educativo TEXT,
  p_asignatura TEXT,
  p_modulo INTEGER,
  p_tarea INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  indicador_id TEXT,
  nombre_indicador TEXT,
  niveles_desempeno JSONB,
  peso_porcentaje NUMERIC(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.indicador_id,
    r.nombre_indicador,
    r.niveles_desempeno,
    r.peso_porcentaje
  FROM rubricas_mbe r
  WHERE
    r.año_vigencia = p_año
    AND r.nivel_educativo = p_nivel_educativo
    AND (r.asignatura = p_asignatura OR r.asignatura IS NULL)
    AND r.modulo = p_modulo
    AND (p_tarea IS NULL OR r.tarea = p_tarea OR r.tarea IS NULL)
    AND r.activo = TRUE
  ORDER BY r.indicador_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION obtener_rubricas_contexto IS 'Obtiene rúbricas filtradas por contexto educativo y módulo/tarea';

-- RLS Policies
ALTER TABLE rubricas_mbe ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones_indicador ENABLE ROW LEVEL SECURITY;
ALTER TABLE estadisticas_indicadores ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer rúbricas activas
CREATE POLICY "Rúbricas visibles para todos los usuarios autenticados"
  ON rubricas_mbe FOR SELECT
  TO authenticated
  USING (activo = TRUE);

-- Política: Solo admins pueden insertar/actualizar rúbricas
CREATE POLICY "Solo admins pueden modificar rúbricas"
  ON rubricas_mbe FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política: Profesores ven evaluaciones de sus propias tareas
CREATE POLICY "Profesores ven evaluaciones de sus tareas"
  ON evaluaciones_indicador FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM tareas_portafolio tp
      JOIN modulos_portafolio mp ON tp.modulo_id = mp.id
      JOIN portafolios p ON mp.portafolio_id = p.id
      WHERE tp.id = evaluaciones_indicador.tarea_id
      AND p.profesor_id = auth.uid()
    )
  );

-- Política: Service role puede hacer todo
CREATE POLICY "Service role acceso completo a evaluaciones"
  ON evaluaciones_indicador FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Política: Estadísticas visibles para todos
CREATE POLICY "Estadísticas visibles para todos"
  ON estadisticas_indicadores FOR SELECT
  TO authenticated
  USING (TRUE);

-- Grants
GRANT SELECT ON rubricas_mbe TO authenticated;
GRANT SELECT ON evaluaciones_indicador TO authenticated;
GRANT SELECT ON estadisticas_indicadores TO authenticated;
GRANT ALL ON rubricas_mbe TO service_role;
GRANT ALL ON evaluaciones_indicador TO service_role;
GRANT ALL ON estadisticas_indicadores TO service_role;
