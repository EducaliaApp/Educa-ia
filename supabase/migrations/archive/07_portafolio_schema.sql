-- ============================================
-- MIGRATION 07: Portafolio Schema
-- ============================================

-- Create portafolios table
CREATE TABLE IF NOT EXISTS portafolios (
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

-- Create modulos_portafolio table
CREATE TABLE IF NOT EXISTS modulos_portafolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portafolio_id UUID NOT NULL REFERENCES portafolios(id) ON DELETE CASCADE,
  
  numero_modulo INTEGER NOT NULL CHECK (numero_modulo BETWEEN 1 AND 3),
  
  -- Metadatos específicos del módulo
  curso_aplicacion TEXT,
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

-- Create tareas_portafolio table
CREATE TABLE IF NOT EXISTS tareas_portafolio (
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
  secciones_completadas TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(modulo_id, numero_tarea)
);

-- Create videos_clase table
CREATE TABLE IF NOT EXISTS videos_clase (
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

-- Create analisis_ia_portafolio table
CREATE TABLE IF NOT EXISTS analisis_ia_portafolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarea_id UUID NOT NULL REFERENCES tareas_portafolio(id) ON DELETE CASCADE,
  
  -- Modelo usado
  modelo_usado TEXT NOT NULL,
  tipo_analisis tipo_analisis DEFAULT 'inicial',
  version INTEGER DEFAULT 1,
  
  -- Análisis completo
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

-- Create metricas_uso table
CREATE TABLE IF NOT EXISTS metricas_uso (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_portafolios_profesor ON portafolios(profesor_id);
CREATE INDEX IF NOT EXISTS idx_portafolios_año ON portafolios(año_evaluacion);
CREATE INDEX IF NOT EXISTS idx_portafolios_estado ON portafolios(estado);
CREATE INDEX IF NOT EXISTS idx_modulos_portafolio ON modulos_portafolio(portafolio_id);
CREATE INDEX IF NOT EXISTS idx_tareas_modulo ON tareas_portafolio(modulo_id);
CREATE INDEX IF NOT EXISTS idx_tareas_completado ON tareas_portafolio(completado);
CREATE INDEX IF NOT EXISTS idx_videos_tarea ON videos_clase(tarea_id);
CREATE INDEX IF NOT EXISTS idx_videos_procesado ON videos_clase(procesado);
CREATE INDEX IF NOT EXISTS idx_analisis_tarea ON analisis_ia_portafolio(tarea_id);
CREATE INDEX IF NOT EXISTS idx_analisis_modelo ON analisis_ia_portafolio(modelo_usado);
CREATE INDEX IF NOT EXISTS idx_analisis_fecha ON analisis_ia_portafolio(created_at);
CREATE INDEX IF NOT EXISTS idx_metricas_profesor ON metricas_uso(profesor_id);
CREATE INDEX IF NOT EXISTS idx_metricas_fecha ON metricas_uso(fecha);

-- Enable RLS
ALTER TABLE portafolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulos_portafolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas_portafolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE analisis_ia_portafolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_uso ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Los profesores pueden ver sus propios portafolios"
  ON portafolios FOR SELECT
  USING (auth.uid() = profesor_id);

CREATE POLICY "Los profesores pueden crear sus propios portafolios"
  ON portafolios FOR INSERT
  WITH CHECK (auth.uid() = profesor_id);

CREATE POLICY "Los profesores pueden actualizar sus propios portafolios"
  ON portafolios FOR UPDATE
  USING (auth.uid() = profesor_id);

-- Similar policies for other tables...
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

-- Verification
SELECT 'Portafolio schema migration completed' as status;