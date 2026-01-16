-- ============================================
-- SCHEMA: PORTAFOLIO DOCENTE CHILE 2025
-- Basado en documentación oficial MINEDUC
-- ============================================

-- EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE nivel_educativo AS ENUM (
  'parvularia',
  'basica_1_6',
  'basica_7_8_media',
  'media_tp',
  'epja',
  'especial_regular',
  'especial_neep',
  'hospitalaria',
  'encierro',
  'lengua_indigena'
);

CREATE TYPE nivel_desempeño AS ENUM (
  'Destacado',
  'Competente',
  'Básico',
  'Insuficiente'
);

CREATE TYPE categoria_logro AS ENUM ('A', 'B', 'C', 'D', 'E');

CREATE TYPE dominio_mbe AS ENUM ('A', 'B', 'C', 'D');

CREATE TYPE estado_portafolio AS ENUM (
  'borrador',
  'en_revision',
  'completado',
  'enviado'
);

CREATE TYPE tipo_analisis AS ENUM (
  'inicial',
  'revision',
  'final'
);

-- ============================================
-- TABLA: PORTAFOLIOS
-- ============================================

CREATE TABLE portafolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profesor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metadatos
  año_evaluacion INTEGER NOT NULL,
  asignatura TEXT NOT NULL,
  nivel_educativo nivel_educativo NOT NULL,
  modalidad TEXT DEFAULT 'regular',
  
  -- Estado
  estado estado_portafolio DEFAULT 'borrador',
  progreso_porcentaje INTEGER DEFAULT 0 CHECK (progreso_porcentaje >= 0 AND progreso_porcentaje <= 100),
  
  -- Evaluación
  puntaje_estimado_ia DECIMAL(3,1) CHECK (puntaje_estimado_ia >= 1.0 AND puntaje_estimado_ia <= 4.0),
  categoria_logro categoria_logro,
  nivel_desempeño_estimado nivel_desempeño,
  confianza_evaluacion DECIMAL(3,2) CHECK (confianza_evaluacion >= 0 AND confianza_evaluacion <= 1),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  
  UNIQUE(profesor_id, año_evaluacion)
);

CREATE INDEX idx_portafolios_profesor ON portafolios(profesor_id);
CREATE INDEX idx_portafolios_año ON portafolios(año_evaluacion);
CREATE INDEX idx_portafolios_estado ON portafolios(estado);

-- ============================================
-- TABLA: MÓDULOS
-- ============================================

CREATE TABLE modulos_portafolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portafolio_id UUID NOT NULL REFERENCES portafolios(id) ON DELETE CASCADE,
  
  numero_modulo INTEGER NOT NULL CHECK (numero_modulo BETWEEN 1 AND 3),
  
  -- Metadatos específicos del módulo
  curso_aplicacion TEXT, -- Curso donde se implementan las tareas
  numero_estudiantes INTEGER,
  fecha_inicio DATE,
  fecha_fin DATE,
  
  -- Estado del módulo
  completado BOOLEAN DEFAULT FALSE,
  progreso_porcentaje INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(portafolio_id, numero_modulo)
);

CREATE INDEX idx_modulos_portafolio ON modulos_portafolio(portafolio_id);

-- ============================================
-- TABLA: TAREAS
-- ============================================

CREATE TABLE tareas_portafolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modulo_id UUID NOT NULL REFERENCES modulos_portafolio(id) ON DELETE CASCADE,
  
  numero_tarea INTEGER NOT NULL CHECK (numero_tarea BETWEEN 1 AND 5),
  nombre_tarea TEXT NOT NULL,
  
  -- Contenido de la tarea (JSONB para flexibilidad según tipo de tarea)
  contenido JSONB NOT NULL DEFAULT '{}',
  
  -- Archivos adjuntos
  archivos_adjuntos TEXT[], -- URLs de archivos en storage
  
  -- Estado
  completado BOOLEAN DEFAULT FALSE,
  fecha_completado TIMESTAMPTZ,
  
  -- Secciones completadas (para tareas con subsecciones)
  secciones_completadas TEXT[] DEFAULT '{}', -- ej: ['A', 'B']
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(modulo_id, numero_tarea)
);

CREATE INDEX idx_tareas_modulo ON tareas_portafolio(modulo_id);
CREATE INDEX idx_tareas_completado ON tareas_portafolio(completado);

-- ============================================
-- TABLA: VIDEOS CLASE (MÓDULO 2)
-- ============================================

CREATE TABLE videos_clase (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarea_id UUID NOT NULL REFERENCES tareas_portafolio(id) ON DELETE CASCADE,
  
  -- Video
  storage_path TEXT NOT NULL,
  url_video TEXT,
  duracion_segundos INTEGER,
  tamaño_bytes BIGINT,
  
  -- Procesamiento
  procesado BOOLEAN DEFAULT FALSE,
  transcripcion TEXT,
  transcripcion_embedding vector(1536),
  
  -- Metadatos de grabación
  fecha_grabacion DATE,
  tecnico_grabacion TEXT,
  comprobante_firmado BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tarea_id)
);

CREATE INDEX idx_videos_tarea ON videos_clase(tarea_id);
CREATE INDEX idx_videos_procesado ON videos_clase(procesado);

-- ============================================
-- TABLA: ANÁLISIS LIA
-- ============================================

CREATE TABLE analisis_ia_portafolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarea_id UUID NOT NULL REFERENCES tareas_portafolio(id) ON DELETE CASCADE,
  
  -- Modelo usado
  modelo_usado TEXT NOT NULL, -- 'gpt-4-turbo-preview', 'claude-3-5-sonnet-20241022'
  tipo_analisis tipo_analisis DEFAULT 'inicial',
  version INTEGER DEFAULT 1,
  
  -- Análisis completo (estructura según interfaces TypeScript)
  analisis JSONB NOT NULL,
  
  -- Métricas
  puntaje_estimado DECIMAL(3,1) CHECK (puntaje_estimado >= 1.0 AND puntaje_estimado <= 4.0),
  categoria_logro categoria_logro,
  nivel_desempeño nivel_desempeño,
  
  -- Uso de recursos
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  costo_usd DECIMAL(10,6) NOT NULL,
  latencia_ms INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tarea_id, tipo_analisis, version)
);

CREATE INDEX idx_analisis_tarea ON analisis_ia_portafolio(tarea_id);
CREATE INDEX idx_analisis_modelo ON analisis_ia_portafolio(modelo_usado);
CREATE INDEX idx_analisis_fecha ON analisis_ia_portafolio(created_at);

-- ============================================
-- TABLA: RÚBRICAS MBE
-- ============================================

CREATE TABLE rubricas_mbe (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Clasificación
  asignatura TEXT NOT NULL,
  nivel_educativo nivel_educativo NOT NULL,
  año_vigencia INTEGER NOT NULL,
  modalidad TEXT DEFAULT 'regular',
  
  -- MBE
  dominio dominio_mbe NOT NULL,
  estandar_numero INTEGER NOT NULL CHECK (estandar_numero BETWEEN 1 AND 12),
  nombre_estandar TEXT NOT NULL,
  descripcion_estandar TEXT NOT NULL,
  
  -- Estructura detallada
  focos JSONB NOT NULL DEFAULT '[]', -- Array de focos con descriptores
  criterios JSONB NOT NULL DEFAULT '[]', -- Criterios de evaluación
  niveles_desempeño JSONB NOT NULL DEFAULT '[]', -- 4 niveles con descripciones
  
  -- Para RAG (Retrieval Augmented Generation)
  contenido_texto TEXT NOT NULL,
  embedding vector(1536),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(asignatura, nivel_educativo, año_vigencia, modalidad, dominio, estandar_numero)
);

CREATE INDEX idx_rubricas_asignatura ON rubricas_mbe(asignatura);
CREATE INDEX idx_rubricas_nivel ON rubricas_mbe(nivel_educativo);
CREATE INDEX idx_rubricas_año ON rubricas_mbe(año_vigencia);
CREATE INDEX idx_rubricas_dominio ON rubricas_mbe(dominio);
CREATE INDEX idx_rubricas_embedding ON rubricas_mbe USING ivfflat (embedding vector_cosine_ops);

-- ============================================
-- TABLA: MÉTRICAS DE USO
-- ============================================

CREATE TABLE metricas_uso (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profesor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  
  -- Contadores
  analisis_planificacion INTEGER DEFAULT 0,
  analisis_evaluacion INTEGER DEFAULT 0,
  analisis_reflexion INTEGER DEFAULT 0,
  analisis_clase_grabada INTEGER DEFAULT 0,
  analisis_trabajo_colaborativo INTEGER DEFAULT 0,
  
  tokens_usados INTEGER DEFAULT 0,
  costo_usd DECIMAL(10,6) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(profesor_id, fecha)
);

CREATE INDEX idx_metricas_profesor ON metricas_uso(profesor_id);
CREATE INDEX idx_metricas_fecha ON metricas_uso(fecha);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER portafolios_updated_at
  BEFORE UPDATE ON portafolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER modulos_updated_at
  BEFORE UPDATE ON modulos_portafolio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tareas_updated_at
  BEFORE UPDATE ON tareas_portafolio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON videos_clase
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER rubricas_updated_at
  BEFORE UPDATE ON rubricas_mbe
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCIÓN: Búsqueda vectorial de rúbricas
-- ============================================

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
  focos jsonb,
  criterios jsonb,
  niveles_desempeño jsonb,
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
    r.focos,
    r.criterios,
    r.niveles_desempeño,
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

-- ============================================
-- FUNCIÓN: Incrementar métricas de uso
-- ============================================

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

-- ============================================
-- FUNCIÓN: Calcular progreso del portafolio
-- ============================================

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

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE portafolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulos_portafolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas_portafolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE analisis_ia_portafolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_uso ENABLE ROW LEVEL SECURITY;

-- Políticas para portafolios
CREATE POLICY "Los profesores pueden ver sus propios portafolios"
  ON portafolios FOR SELECT
  USING (auth.uid() = profesor_id);

CREATE POLICY "Los profesores pueden crear sus propios portafolios"
  ON portafolios FOR INSERT
  WITH CHECK (auth.uid() = profesor_id);

CREATE POLICY "Los profesores pueden actualizar sus propios portafolios"
  ON portafolios FOR UPDATE
  USING (auth.uid() = profesor_id);

-- Políticas para módulos
CREATE POLICY "Los profesores pueden ver módulos de sus portafolios"
  ON modulos_portafolio FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portafolios p
      WHERE p.id = modulos_portafolio.portafolio_id
        AND p.profesor_id = auth.uid()
    )
  );

CREATE POLICY "Los profesores pueden crear módulos en sus portafolios"
  ON modulos_portafolio FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portafolios p
      WHERE p.id = modulos_portafolio.portafolio_id
        AND p.profesor_id = auth.uid()
    )
  );

CREATE POLICY "Los profesores pueden actualizar módulos de sus portafolios"
  ON modulos_portafolio FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM portafolios p
      WHERE p.id = modulos_portafolio.portafolio_id
        AND p.profesor_id = auth.uid()
    )
  );

-- Políticas para tareas
CREATE POLICY "Los profesores pueden ver tareas de sus portafolios"
  ON tareas_portafolio FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM modulos_portafolio m
      JOIN portafolios p ON p.id = m.portafolio_id
      WHERE m.id = tareas_portafolio.modulo_id
        AND p.profesor_id = auth.uid()
    )
  );

CREATE POLICY "Los profesores pueden crear tareas en sus portafolios"
  ON tareas_portafolio FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM modulos_portafolio m
      JOIN portafolios p ON p.id = m.portafolio_id
      WHERE m.id = tareas_portafolio.modulo_id
        AND p.profesor_id = auth.uid()
    )
  );

CREATE POLICY "Los profesores pueden actualizar tareas de sus portafolios"
  ON tareas_portafolio FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM modulos_portafolio m
      JOIN portafolios p ON p.id = m.portafolio_id
      WHERE m.id = tareas_portafolio.modulo_id
        AND p.profesor_id = auth.uid()
    )
  );

-- Políticas similares para videos_clase, analisis_ia_portafolio, metricas_uso...

-- Las rúbricas son públicas (lectura para todos los autenticados)
CREATE POLICY "Usuarios autenticados pueden leer rúbricas"
  ON rubricas_mbe FOR SELECT
  USING (auth.role() = 'authenticated');