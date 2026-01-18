-- supabase/migrations/20260117002_fix_procesos_obsoletos.sql
-- Migración para limpiar procesos ETL obsoletos en estado "en_progreso"
-- Fecha: 2026-01-17

-- 1. Actualizar procesos obsoletos (más de 30 minutos en estado en_progreso)
UPDATE procesos_etl
SET 
  estado = 'cancelado',
  updated_at = NOW(),
  fecha_fin = fecha_inicio + INTERVAL '30 minutes'
WHERE estado = 'en_progreso'
  AND fecha_inicio IS NOT NULL
  AND fecha_inicio < NOW() - INTERVAL '30 minutes';

-- 2. Actualizar procesos sin fecha_inicio (casos anómalos)
UPDATE procesos_etl
SET 
  estado = 'cancelado',
  updated_at = NOW()
WHERE estado = 'en_progreso'
  AND fecha_inicio IS NULL
  AND created_at < NOW() - INTERVAL '30 minutes';

-- 3. Recrear función RPC para solo contar procesos en_progreso RECIENTES
CREATE OR REPLACE FUNCTION estadisticas_procesos_etl()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    v_total_procesos INTEGER;
    v_procesos_completados INTEGER;
    v_procesos_en_progreso INTEGER;
    v_procesos_error INTEGER;
    v_procesos_pendientes INTEGER;
    v_tasa_exito NUMERIC;
    v_total_registros BIGINT;
    v_duracion_promedio NUMERIC;
    v_total_documentos INTEGER;
BEGIN
    -- Total de procesos
    SELECT COUNT(*) INTO v_total_procesos FROM procesos_etl;
    
    -- Procesos completados
    SELECT COUNT(*) INTO v_procesos_completados FROM procesos_etl WHERE estado = 'completado';
    
    -- Procesos en progreso RECIENTES (últimos 30 minutos)
    SELECT COUNT(*) INTO v_procesos_en_progreso 
    FROM procesos_etl 
    WHERE estado = 'en_progreso'
      AND fecha_inicio IS NOT NULL
      AND fecha_inicio > NOW() - INTERVAL '30 minutes';
    
    -- Procesos con error
    SELECT COUNT(*) INTO v_procesos_error FROM procesos_etl WHERE estado = 'error';
    
    -- Procesos pendientes
    SELECT COUNT(*) INTO v_procesos_pendientes FROM procesos_etl WHERE estado = 'pendiente';
    
    -- Tasa de éxito (solo procesos finalizados: completados + error)
    IF (v_procesos_completados + v_procesos_error) > 0 THEN
        v_tasa_exito := (v_procesos_completados::NUMERIC / (v_procesos_completados + v_procesos_error)::NUMERIC) * 100;
    ELSE
        v_tasa_exito := 0;
    END IF;
    
    -- Total de registros procesados
    SELECT COALESCE(SUM(total_registros), 0) INTO v_total_registros FROM procesos_etl;
    
    -- Duración promedio de procesos completados (en milisegundos)
    SELECT COALESCE(AVG(duracion_ms), 0) INTO v_duracion_promedio 
    FROM procesos_etl 
    WHERE estado = 'completado' AND duracion_ms IS NOT NULL;
    
    -- Total de documentos generados
    SELECT COALESCE(SUM(num_archivos), 0) INTO v_total_documentos FROM procesos_etl;
    
    -- Construir resultado JSON
    result := json_build_object(
        'total_procesos', v_total_procesos,
        'procesos_completados', v_procesos_completados,
        'procesos_en_progreso', v_procesos_en_progreso,
        'procesos_error', v_procesos_error,
        'procesos_pendientes', v_procesos_pendientes,
        'tasa_exito', ROUND(v_tasa_exito, 2),
        'total_registros_procesados', v_total_registros,
        'duracion_promedio_ms', ROUND(v_duracion_promedio, 0),
        'total_documentos_generados', v_total_documentos
    );
    
    RETURN result;
END;
$$;

-- 4. Crear función auxiliar para limpiar procesos obsoletos automáticamente
CREATE OR REPLACE FUNCTION limpiar_procesos_etl_obsoletos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE procesos_etl
        SET 
            estado = 'cancelado',
            updated_at = NOW(),
            fecha_fin = COALESCE(fecha_fin, fecha_inicio + INTERVAL '30 minutes', NOW())
        WHERE estado = 'en_progreso'
          AND (
              (fecha_inicio IS NOT NULL AND fecha_inicio < NOW() - INTERVAL '30 minutes')
              OR
              (fecha_inicio IS NULL AND created_at < NOW() - INTERVAL '30 minutes')
          )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM updated;
    
    RETURN v_count;
END;
$$;

-- 5. Comentarios
COMMENT ON FUNCTION estadisticas_procesos_etl() IS 'Retorna estadísticas generales de procesos ETL. Solo cuenta procesos en_progreso de los últimos 30 minutos.';
COMMENT ON FUNCTION limpiar_procesos_etl_obsoletos() IS 'Limpia procesos ETL obsoletos cambiando estado de en_progreso a cancelado si tienen más de 30 minutos.';

-- 6. Permisos
GRANT EXECUTE ON FUNCTION estadisticas_procesos_etl() TO authenticated;
GRANT EXECUTE ON FUNCTION limpiar_procesos_etl_obsoletos() TO authenticated;