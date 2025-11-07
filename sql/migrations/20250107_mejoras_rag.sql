-- ============================================
-- MIGRATION: Mejoras Sistema RAG
-- Fecha: 2025-01-07
-- Descripción: Agrega tablas y funciones para:
--   - Caché de embeddings
--   - Métricas de retrieval
--   - Búsqueda híbrida (vectorial + BM25)
--   - Validación de datos
-- ============================================

-- ============================================
-- 1. TABLA: cache_embeddings
-- ============================================

CREATE TABLE IF NOT EXISTS cache_embeddings (
  query_hash TEXT PRIMARY KEY,
  query_text TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  uso_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_last_used ON cache_embeddings(last_used_at);
CREATE INDEX IF NOT EXISTS idx_cache_uso_count ON cache_embeddings(uso_count DESC);

COMMENT ON TABLE cache_embeddings IS 'Caché de embeddings de queries para reducir llamadas a OpenAI';

-- Función para limpiar caché viejo (> 7 días y poco usado)
CREATE OR REPLACE FUNCTION limpiar_cache_embeddings()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  filas_eliminadas INTEGER;
BEGIN
  DELETE FROM cache_embeddings
  WHERE last_used_at < NOW() - INTERVAL '7 days'
    AND uso_count < 3;

  GET DIAGNOSTICS filas_eliminadas = ROW_COUNT;

  RETURN filas_eliminadas;
END;
$$;

-- ============================================
-- 2. TABLA: metricas_rag
-- ============================================

CREATE TABLE IF NOT EXISTS metricas_rag (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL UNIQUE,
  consultas_totales INTEGER DEFAULT 0,
  consultas_sin_resultados INTEGER DEFAULT 0,
  similitud_promedio NUMERIC(3,2),
  similitud_minima NUMERIC(3,2),
  similitud_maxima NUMERIC(3,2),
  latencia_promedio_ms INTEGER,
  latencia_p95_ms INTEGER,
  reranking_uso_count INTEGER DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  documentos_mas_relevantes JSONB,
  queries_sin_contexto TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metricas_fecha ON metricas_rag(fecha DESC);

COMMENT ON TABLE metricas_rag IS 'Métricas diarias del sistema RAG para monitoreo';

-- Función para registrar métrica de una consulta
CREATE OR REPLACE FUNCTION registrar_metrica_rag(
  p_fecha DATE,
  p_similitud_promedio NUMERIC,
  p_latencia_ms INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  consultas_actuales INTEGER;
BEGIN
  -- Obtener contador actual
  SELECT consultas_totales INTO consultas_actuales
  FROM metricas_rag
  WHERE fecha = p_fecha;

  IF consultas_actuales IS NULL THEN
    consultas_actuales := 0;
  END IF;

  INSERT INTO metricas_rag (
    fecha,
    consultas_totales,
    similitud_promedio,
    latencia_promedio_ms,
    similitud_minima,
    similitud_maxima
  )
  VALUES (
    p_fecha,
    1,
    p_similitud_promedio,
    p_latencia_ms,
    p_similitud_promedio,
    p_similitud_promedio
  )
  ON CONFLICT (fecha)
  DO UPDATE SET
    consultas_totales = metricas_rag.consultas_totales + 1,
    similitud_promedio = (
      (metricas_rag.similitud_promedio * metricas_rag.consultas_totales + EXCLUDED.similitud_promedio) /
      (metricas_rag.consultas_totales + 1)
    ),
    latencia_promedio_ms = (
      (metricas_rag.latencia_promedio_ms * metricas_rag.consultas_totales + EXCLUDED.latencia_promedio_ms) /
      (metricas_rag.consultas_totales + 1)
    ),
    similitud_minima = LEAST(metricas_rag.similitud_minima, EXCLUDED.similitud_minima),
    similitud_maxima = GREATEST(metricas_rag.similitud_maxima, EXCLUDED.similitud_maxima),
    updated_at = NOW();
END;
$$;

-- ============================================
-- 3. TABLA: queries_sin_resultados
-- ============================================

CREATE TABLE IF NOT EXISTS queries_sin_resultados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_text TEXT NOT NULL,
  contexto_educativo JSONB,
  embedding vector(1536),
  threshold_usado NUMERIC(3,2),
  fecha TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queries_sin_resultados_fecha ON queries_sin_resultados(fecha DESC);

COMMENT ON TABLE queries_sin_resultados IS 'Log de queries que no retornaron resultados para análisis';

-- ============================================
-- 4. TABLA: validaciones_rag
-- ============================================

CREATE TABLE IF NOT EXISTS validaciones_rag (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  errores_criticos INTEGER DEFAULT 0,
  errores INTEGER DEFAULT 0,
  advertencias INTEGER DEFAULT 0,
  chunks_validos_pct NUMERIC(5,2),
  documentos_procesados_pct NUMERIC(5,2),
  total_chunks INTEGER,
  total_documentos INTEGER,
  total_rubricas INTEGER,
  resultados_detallados JSONB,
  workflow_run_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validaciones_fecha ON validaciones_rag(fecha DESC);

COMMENT ON TABLE validaciones_rag IS 'Historial de validaciones de calidad de datos RAG';

-- ============================================
-- 5. TABLA: metricas_pipeline_rag
-- ============================================

CREATE TABLE IF NOT EXISTS metricas_pipeline_rag (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  documentos_monitoreados INTEGER DEFAULT 0,
  documentos_procesados INTEGER DEFAULT 0,
  chunks_validados INTEGER DEFAULT 0,
  errores_criticos INTEGER DEFAULT 0,
  latencia_monitoreo_ms INTEGER,
  latencia_procesamiento_ms INTEGER,
  workflow_run_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_fecha ON metricas_pipeline_rag(fecha DESC);

COMMENT ON TABLE metricas_pipeline_rag IS 'Métricas del pipeline ETL de documentos MINEDUC';

-- ============================================
-- 6. FUNCIÓN: Búsqueda Híbrida (Vectorial + BM25)
-- ============================================

-- Primero, asegurar que existe la extensión para full-text search en español
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Crear configuración de búsqueda en español si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_ts_config WHERE cfgname = 'spanish'
  ) THEN
    CREATE TEXT SEARCH CONFIGURATION spanish ( COPY = simple );
  END IF;
END$$;

-- Agregar índice GIN para full-text search en chunks
CREATE INDEX IF NOT EXISTS idx_chunks_fts ON chunks_documentos
USING gin(to_tsvector('spanish', contenido));

-- Función de búsqueda híbrida
CREATE OR REPLACE FUNCTION buscar_hibrido(
  query_text TEXT,
  query_embedding vector(1536),
  alpha FLOAT DEFAULT 0.7,  -- Peso de búsqueda vectorial (0-1)
  match_count INT DEFAULT 10,
  p_año_vigencia INT DEFAULT NULL,
  p_asignatura TEXT DEFAULT NULL,
  p_nivel TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  contenido TEXT,
  score_vectorial FLOAT,
  score_keyword FLOAT,
  score_final FLOAT,
  tipo_contenido TEXT,
  dominio TEXT,
  estandar_numero INT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH busqueda_vectorial AS (
    SELECT
      c.id,
      c.contenido,
      1 - (c.embedding <=> query_embedding) AS score_vec,
      c.tipo_contenido,
      c.dominio_mbe::text AS dominio,
      c.estandar_numero,
      c.metadata
    FROM chunks_documentos c
    WHERE (1 - (c.embedding <=> query_embedding)) > 0.6
      AND (p_año_vigencia IS NULL OR (c.metadata->>'año')::int = p_año_vigencia)
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  busqueda_keyword AS (
    SELECT
      c.id,
      c.contenido,
      ts_rank(to_tsvector('spanish', c.contenido), plainto_tsquery('spanish', query_text)) AS score_kw,
      c.tipo_contenido,
      c.dominio_mbe::text AS dominio,
      c.estandar_numero,
      c.metadata
    FROM chunks_documentos c
    WHERE to_tsvector('spanish', c.contenido) @@ plainto_tsquery('spanish', query_text)
      AND (p_año_vigencia IS NULL OR (c.metadata->>'año')::int = p_año_vigencia)
    ORDER BY score_kw DESC
    LIMIT match_count * 2
  ),
  combinado AS (
    SELECT
      COALESCE(bv.id, bk.id) AS id,
      COALESCE(bv.contenido, bk.contenido) AS contenido,
      COALESCE(bv.score_vec, 0) AS score_vectorial,
      COALESCE(bk.score_kw, 0) AS score_keyword,
      (alpha * COALESCE(bv.score_vec, 0) + (1 - alpha) * COALESCE(bk.score_kw, 0)) AS score_final,
      COALESCE(bv.tipo_contenido, bk.tipo_contenido) AS tipo_contenido,
      COALESCE(bv.dominio, bk.dominio) AS dominio,
      COALESCE(bv.estandar_numero, bk.estandar_numero) AS estandar_numero,
      COALESCE(bv.metadata, bk.metadata) AS metadata
    FROM busqueda_vectorial bv
    FULL OUTER JOIN busqueda_keyword bk ON bv.id = bk.id
  )
  SELECT
    c.id,
    c.contenido,
    c.score_vectorial,
    c.score_keyword,
    c.score_final,
    c.tipo_contenido,
    c.dominio,
    c.estandar_numero,
    c.metadata
  FROM combinado c
  ORDER BY c.score_final DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION buscar_hibrido IS 'Búsqueda híbrida que combina vectorial (embeddings) con keyword (BM25)';

-- ============================================
-- 7. FUNCIÓN: Estadísticas de Calidad RAG
-- ============================================

CREATE OR REPLACE FUNCTION obtener_estadisticas_rag()
RETURNS TABLE (
  total_chunks BIGINT,
  chunks_con_embedding BIGINT,
  chunks_sin_embedding BIGINT,
  total_documentos BIGINT,
  documentos_procesados BIGINT,
  documentos_pendientes BIGINT,
  total_rubricas BIGINT,
  rubricas_con_embedding BIGINT,
  queries_cached BIGINT,
  cache_hit_rate_pct NUMERIC(5,2),
  similitud_promedio_7d NUMERIC(3,2),
  latencia_promedio_7d INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Chunks
    (SELECT COUNT(*) FROM chunks_documentos) AS total_chunks,
    (SELECT COUNT(*) FROM chunks_documentos WHERE embedding IS NOT NULL) AS chunks_con_embedding,
    (SELECT COUNT(*) FROM chunks_documentos WHERE embedding IS NULL) AS chunks_sin_embedding,

    -- Documentos
    (SELECT COUNT(*) FROM documentos_oficiales) AS total_documentos,
    (SELECT COUNT(*) FROM documentos_oficiales WHERE procesado = TRUE) AS documentos_procesados,
    (SELECT COUNT(*) FROM documentos_oficiales WHERE procesado = FALSE) AS documentos_pendientes,

    -- Rúbricas
    (SELECT COUNT(*) FROM rubricas_mbe) AS total_rubricas,
    (SELECT COUNT(*) FROM rubricas_mbe WHERE embedding IS NOT NULL) AS rubricas_con_embedding,

    -- Caché
    (SELECT COUNT(*) FROM cache_embeddings) AS queries_cached,
    (
      SELECT CASE
        WHEN SUM(cache_hits + cache_misses) > 0 THEN
          ROUND(SUM(cache_hits)::numeric / SUM(cache_hits + cache_misses) * 100, 2)
        ELSE 0
      END
      FROM metricas_rag
      WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'
    ) AS cache_hit_rate_pct,

    -- Métricas últimos 7 días
    (
      SELECT AVG(similitud_promedio)
      FROM metricas_rag
      WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'
    ) AS similitud_promedio_7d,
    (
      SELECT AVG(latencia_promedio_ms)::integer
      FROM metricas_rag
      WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'
    ) AS latencia_promedio_7d;
END;
$$;

COMMENT ON FUNCTION obtener_estadisticas_rag IS 'Retorna estadísticas completas del sistema RAG';

-- ============================================
-- 8. TRIGGERS: Actualizar updated_at
-- ============================================

CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a metricas_rag
DROP TRIGGER IF EXISTS trigger_actualizar_metricas_rag ON metricas_rag;
CREATE TRIGGER trigger_actualizar_metricas_rag
  BEFORE UPDATE ON metricas_rag
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

-- ============================================
-- 9. POLÍTICAS RLS
-- ============================================

-- cache_embeddings: Solo servicio y admin
ALTER TABLE cache_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin puede ver cache" ON cache_embeddings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- metricas_rag: Admin read-only
ALTER TABLE metricas_rag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin puede ver métricas" ON metricas_rag
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- queries_sin_resultados: Solo admin
ALTER TABLE queries_sin_resultados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin puede ver queries sin resultados" ON queries_sin_resultados
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- validaciones_rag: Solo admin
ALTER TABLE validaciones_rag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin puede ver validaciones" ON validaciones_rag
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- metricas_pipeline_rag: Solo admin
ALTER TABLE metricas_pipeline_rag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin puede ver métricas pipeline" ON metricas_pipeline_rag
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 10. CRONJOBS: Mantenimiento Automático
-- ============================================

-- Limpiar caché viejo cada día a las 4 AM
-- Primero eliminar si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpiar-cache-embeddings') THEN
    PERFORM cron.unschedule('limpiar-cache-embeddings');
  END IF;
END $$;

-- Crear cronjob
SELECT cron.schedule(
  'limpiar-cache-embeddings',
  '0 4 * * *',
  $$SELECT limpiar_cache_embeddings()$$
);

-- Agregar comentario a cronjob
COMMENT ON EXTENSION pg_cron IS 'Limpieza automática de caché de embeddings cada día a las 4 AM';

-- ============================================
-- 11. VERIFICACIÓN
-- ============================================

-- Verificar tablas creadas
DO $$
DECLARE
  tablas_esperadas TEXT[] := ARRAY[
    'cache_embeddings',
    'metricas_rag',
    'queries_sin_resultados',
    'validaciones_rag',
    'metricas_pipeline_rag'
  ];
  tabla TEXT;
  tablas_faltantes TEXT[] := '{}';
BEGIN
  FOREACH tabla IN ARRAY tablas_esperadas
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = tabla AND table_schema = 'public'
    ) THEN
      tablas_faltantes := array_append(tablas_faltantes, tabla);
    END IF;
  END LOOP;

  IF array_length(tablas_faltantes, 1) > 0 THEN
    RAISE EXCEPTION 'Tablas faltantes: %', array_to_string(tablas_faltantes, ', ');
  ELSE
    RAISE NOTICE '✅ Todas las tablas fueron creadas correctamente';
  END IF;
END;
$$;

-- Mostrar estadísticas iniciales
SELECT '✅ Migración completada - Estadísticas iniciales:' AS status;
SELECT * FROM obtener_estadisticas_rag();
