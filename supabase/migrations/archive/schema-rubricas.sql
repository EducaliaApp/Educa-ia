-- ============================================
-- MIGRACIÓN: SISTEMA COMPLETO DE RÚBRICAS
-- ============================================

-- Actualizar tabla de rúbricas con estructura completa
ALTER TABLE rubricas_mbe 
  DROP COLUMN IF EXISTS focos,
  DROP COLUMN IF EXISTS criterios,
  DROP COLUMN IF EXISTS niveles_desempeño,
  ADD COLUMN IF NOT EXISTS indicador_id TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS nombre_indicador TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS descripcion_indicador TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS evidencia_revisar JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS nivel_insatisfactorio JSONB NOT NULL,
  ADD COLUMN IF NOT EXISTS nivel_basico JSONB NOT NULL,
  ADD COLUMN IF NOT EXISTS nivel_competente JSONB NOT NULL,
  ADD COLUMN IF NOT EXISTS nivel_destacado JSONB NOT NULL,
  ADD COLUMN IF NOT EXISTS notas_aclaratorias JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS condiciones_verificables JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS peso_ponderacion DECIMAL(3,2) DEFAULT 1.0;

-- Crear índice único por indicador
CREATE UNIQUE INDEX IF NOT EXISTS idx_rubricas_indicador 
  ON rubricas_mbe(nivel_educativo, año_vigencia, modalidad, indicador_id);

-- ============================================
-- TABLA: EVALUACIONES POR INDICADOR
-- ============================================

CREATE TABLE IF NOT EXISTS evaluaciones_indicador (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analisis_id UUID NOT NULL REFERENCES analisis_ia_portafolio(id) ON DELETE CASCADE,
  indicador_id TEXT NOT NULL,
  nombre_indicador TEXT NOT NULL,
  
  -- Resultado de la evaluación
  nivel_alcanzado TEXT NOT NULL CHECK (nivel_alcanzado IN ('Insatisfactorio', 'Básico', 'Competente', 'Destacado')),
  puntaje DECIMAL(3,1) NOT NULL CHECK (puntaje >= 1.0 AND puntaje <= 4.0),
  confianza DECIMAL(3,2) CHECK (confianza >= 0 AND confianza <= 1),
  
  -- Detalles de verificación
  condiciones_evaluadas JSONB NOT NULL DEFAULT '[]',
  condiciones_cumplidas INTEGER DEFAULT 0,
  condiciones_totales INTEGER DEFAULT 0,
  
  -- Evidencias
  evidencias_textuales JSONB DEFAULT '[]',
  justificacion TEXT NOT NULL,
  
  -- Gap analysis
  para_siguiente_nivel TEXT,
  acciones_concretas JSONB DEFAULT '[]',
  
  -- Metadatos
  tiempo_evaluacion_ms INTEGER,
  tokens_usados INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evaluaciones_analisis ON evaluaciones_indicador(analisis_id);
CREATE INDEX idx_evaluaciones_indicador ON evaluaciones_indicador(indicador_id);
CREATE INDEX idx_evaluaciones_nivel ON evaluaciones_indicador(nivel_alcanzado);

-- ============================================
-- TABLA: HISTORIAL DE MEJORAS
-- ============================================

CREATE TABLE IF NOT EXISTS historial_mejoras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profesor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tarea_id UUID NOT NULL REFERENCES tareas_portafolio(id) ON DELETE CASCADE,
  indicador_id TEXT NOT NULL,
  
  -- Progreso
  nivel_anterior TEXT NOT NULL,
  nivel_nuevo TEXT NOT NULL,
  puntaje_anterior DECIMAL(3,1) NOT NULL,
  puntaje_nuevo DECIMAL(3,1) NOT NULL,
  mejora_puntos DECIMAL(3,1) GENERATED ALWAYS AS (puntaje_nuevo - puntaje_anterior) STORED,
  
  -- Qué cambió
  cambios_realizados TEXT,
  tiempo_entre_versiones INTERVAL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_historial_profesor ON historial_mejoras(profesor_id);
CREATE INDEX idx_historial_tarea ON historial_mejoras(tarea_id);

-- ============================================
-- TABLA: ESTADÍSTICAS COMPARATIVAS
-- ============================================

CREATE TABLE IF NOT EXISTS estadisticas_indicadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  indicador_id TEXT NOT NULL,
  nivel_educativo nivel_educativo NOT NULL,
  asignatura TEXT NOT NULL,
  año_evaluacion INTEGER NOT NULL,
  
  -- Distribución de niveles
  total_evaluaciones INTEGER DEFAULT 0,
  count_insatisfactorio INTEGER DEFAULT 0,
  count_basico INTEGER DEFAULT 0,
  count_competente INTEGER DEFAULT 0,
  count_destacado INTEGER DEFAULT 0,
  
  -- Estadísticas
  promedio_puntaje DECIMAL(3,2),
  mediana_puntaje DECIMAL(3,1),
  desviacion_estandar DECIMAL(3,2),
  
  -- Percentiles
  percentil_25 DECIMAL(3,1),
  percentil_50 DECIMAL(3,1),
  percentil_75 DECIMAL(3,1),
  percentil_90 DECIMAL(3,1),
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(indicador_id, nivel_educativo, asignatura, año_evaluacion)
);

CREATE INDEX idx_stats_indicador ON estadisticas_indicadores(indicador_id);
CREATE INDEX idx_stats_nivel ON estadisticas_indicadores(nivel_educativo);

-- ============================================
-- FUNCIÓN: Actualizar estadísticas
-- ============================================

CREATE OR REPLACE FUNCTION actualizar_estadisticas_indicador(
  p_indicador_id TEXT,
  p_nivel_educativo nivel_educativo,
  p_asignatura TEXT,
  p_año INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total INTEGER;
  v_promedio DECIMAL;
  v_mediana DECIMAL;
BEGIN
  -- Calcular estadísticas desde evaluaciones
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      AVG(puntaje) as promedio,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY puntaje) as mediana,
      STDDEV(puntaje) as desv_std,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY puntaje) as p25,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY puntaje) as p50,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY puntaje) as p75,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY puntaje) as p90,
      SUM(CASE WHEN nivel_alcanzado = 'Insatisfactorio' THEN 1 ELSE 0 END) as c_insuf,
      SUM(CASE WHEN nivel_alcanzado = 'Básico' THEN 1 ELSE 0 END) as c_basico,
      SUM(CASE WHEN nivel_alcanzado = 'Competente' THEN 1 ELSE 0 END) as c_comp,
      SUM(CASE WHEN nivel_alcanzado = 'Destacado' THEN 1 ELSE 0 END) as c_dest
    FROM evaluaciones_indicador ei
    JOIN analisis_ia_portafolio ai ON ei.analisis_id = ai.id
    JOIN tareas_portafolio t ON ai.tarea_id = t.id
    JOIN modulos_portafolio m ON t.modulo_id = m.id
    JOIN portafolios p ON m.portafolio_id = p.id
    WHERE ei.indicador_id = p_indicador_id
      AND p.nivel_educativo = p_nivel_educativo
      AND p.asignatura = p_asignatura
      AND p.año_evaluacion = p_año
  )
  INSERT INTO estadisticas_indicadores (
    indicador_id,
    nivel_educativo,
    asignatura,
    año_evaluacion,
    total_evaluaciones,
    count_insatisfactorio,
    count_basico,
    count_competente,
    count_destacado,
    promedio_puntaje,
    mediana_puntaje,
    desviacion_estandar,
    percentil_25,
    percentil_50,
    percentil_75,
    percentil_90
  )
  SELECT 
    p_indicador_id,
    p_nivel_educativo,
    p_asignatura,
    p_año,
    total,
    c_insuf,
    c_basico,
    c_comp,
    c_dest,
    promedio,
    mediana,
    desv_std,
    p25,
    p50,
    p75,
    p90
  FROM stats
  ON CONFLICT (indicador_id, nivel_educativo, asignatura, año_evaluacion)
  DO UPDATE SET
    total_evaluaciones = EXCLUDED.total_evaluaciones,
    count_insatisfactorio = EXCLUDED.count_insatisfactorio,
    count_basico = EXCLUDED.count_basico,
    count_competente = EXCLUDED.count_competente,
    count_destacado = EXCLUDED.count_destacado,
    promedio_puntaje = EXCLUDED.promedio_puntaje,
    mediana_puntaje = EXCLUDED.mediana_puntaje,
    desviacion_estandar = EXCLUDED.desviacion_estandar,
    percentil_25 = EXCLUDED.percentil_25,
    percentil_50 = EXCLUDED.percentil_50,
    percentil_75 = EXCLUDED.percentil_75,
    percentil_90 = EXCLUDED.percentil_90,
    updated_at = NOW();
END;
$$;

-- ============================================
-- POLÍTICAS RLS
-- ============================================

ALTER TABLE evaluaciones_indicador ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_mejoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE estadisticas_indicadores ENABLE ROW LEVEL SECURITY;

-- Políticas para evaluaciones_indicador
CREATE POLICY "Profesores ven evaluaciones de sus análisis"
  ON evaluaciones_indicador FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analisis_ia_portafolio ai
      JOIN tareas_portafolio t ON ai.tarea_id = t.id
      JOIN modulos_portafolio m ON t.modulo_id = m.id
      JOIN portafolios p ON m.portafolio_id = p.id
      WHERE ai.id = evaluaciones_indicador.analisis_id
        AND p.profesor_id = auth.uid()
    )
  );

-- Políticas para historial_mejoras
CREATE POLICY "Profesores ven su propio historial"
  ON historial_mejoras FOR SELECT
  USING (auth.uid() = profesor_id);

-- Estadísticas son públicas para usuarios autenticados
CREATE POLICY "Usuarios autenticados leen estadísticas"
  ON estadisticas_indicadores FOR SELECT
  USING (auth.role() = 'authenticated');