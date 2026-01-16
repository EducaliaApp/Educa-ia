-- ============================================
-- RPC FUNCTIONS PARA ESTADÍSTICAS DE PROCESOS ETL
-- ============================================

-- Función para obtener estadísticas generales de procesos ETL
CREATE OR REPLACE FUNCTION estadisticas_procesos_etl()
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_procesos', (SELECT COUNT(*) FROM procesos_etl),
        'procesos_completados', (SELECT COUNT(*) FROM procesos_etl WHERE estado = 'completado'),
        'procesos_en_progreso', (SELECT COUNT(*) FROM procesos_etl WHERE estado = 'en_progreso'),
        'procesos_error', (SELECT COUNT(*) FROM procesos_etl WHERE estado = 'error'),
        'procesos_pendientes', (SELECT COUNT(*) FROM procesos_etl WHERE estado = 'pendiente'),
        'tasa_exito', (
            SELECT CASE
                WHEN COUNT(*) FILTER (WHERE estado IN ('completado', 'error')) > 0
                THEN ROUND(
                    (COUNT(*) FILTER (WHERE estado = 'completado')::decimal /
                     COUNT(*) FILTER (WHERE estado IN ('completado', 'error'))::decimal) * 100,
                    2
                )
                ELSE 0
            END
            FROM procesos_etl
        ),
        'total_registros_procesados', (
            SELECT COALESCE(SUM(total_registros), 0)
            FROM procesos_etl
            WHERE estado = 'completado'
        ),
        'total_registros_exitosos', (
            SELECT COALESCE(SUM(registros_exitosos), 0)
            FROM procesos_etl
            WHERE estado = 'completado'
        ),
        'total_documentos_generados', (
            SELECT COUNT(*) FROM documentos_transformados
        ),
        'duracion_promedio_ms', (
            SELECT COALESCE(AVG(duracion_ms)::bigint, 0)
            FROM procesos_etl
            WHERE estado = 'completado' AND duracion_ms IS NOT NULL
        ),
        'ultimo_proceso', (
            SELECT json_build_object(
                'id', id,
                'nombre', nombre,
                'estado', estado,
                'fecha_inicio', fecha_inicio,
                'fecha_fin', fecha_fin
            )
            FROM procesos_etl
            ORDER BY created_at DESC
            LIMIT 1
        ),
        'procesos_por_tipo', (
            SELECT json_object_agg(
                tipo_proceso,
                json_build_object(
                    'total', count,
                    'completados', completados,
                    'en_progreso', en_progreso,
                    'error', error
                )
            )
            FROM (
                SELECT
                    tipo_proceso,
                    COUNT(*) as count,
                    COUNT(*) FILTER (WHERE estado = 'completado') as completados,
                    COUNT(*) FILTER (WHERE estado = 'en_progreso') as en_progreso,
                    COUNT(*) FILTER (WHERE estado = 'error') as error
                FROM procesos_etl
                GROUP BY tipo_proceso
            ) subq
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener historial de ejecuciones con filtros
CREATE OR REPLACE FUNCTION obtener_historial_procesos_etl(
    p_estado VARCHAR DEFAULT NULL,
    p_tipo_proceso VARCHAR DEFAULT NULL,
    p_fecha_desde TIMESTAMPTZ DEFAULT NULL,
    p_fecha_hasta TIMESTAMPTZ DEFAULT NULL,
    p_limite INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    nombre VARCHAR,
    tipo_proceso VARCHAR,
    descripcion TEXT,
    estado VARCHAR,
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    duracion_ms BIGINT,
    total_registros INTEGER,
    registros_exitosos INTEGER,
    registros_fallidos INTEGER,
    tasa_exito_porcentaje NUMERIC,
    num_logs INTEGER,
    num_errores INTEGER,
    num_archivos INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.nombre,
        p.tipo_proceso,
        p.descripcion,
        p.estado,
        p.fecha_inicio,
        p.fecha_fin,
        p.duracion_ms,
        p.total_registros,
        p.registros_exitosos,
        p.registros_fallidos,
        CASE
            WHEN p.total_registros > 0
            THEN ROUND((p.registros_exitosos::decimal / p.total_registros::decimal) * 100, 2)
            ELSE 0
        END as tasa_exito_porcentaje,
        COALESCE(array_length(p.logs, 1), 0) as num_logs,
        COALESCE(jsonb_array_length(p.errores), 0) as num_errores,
        (SELECT COUNT(*)::INTEGER FROM documentos_transformados WHERE proceso_etl_id = p.id) as num_archivos,
        p.created_at,
        p.updated_at
    FROM procesos_etl p
    WHERE
        (p_estado IS NULL OR p.estado = p_estado)
        AND (p_tipo_proceso IS NULL OR p.tipo_proceso = p_tipo_proceso)
        AND (p_fecha_desde IS NULL OR p.created_at >= p_fecha_desde)
        AND (p_fecha_hasta IS NULL OR p.created_at <= p_fecha_hasta)
    ORDER BY p.created_at DESC
    LIMIT p_limite
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener detalles completos de un proceso incluyendo logs
CREATE OR REPLACE FUNCTION obtener_detalle_proceso_etl(p_proceso_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'proceso', row_to_json(p),
        'documentos', (
            SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json)
            FROM documentos_transformados d
            WHERE d.proceso_etl_id = p.id
        ),
        'logs_procesados', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'timestamp', SUBSTRING(log FROM 2 FOR 26),
                    'mensaje', SUBSTRING(log FROM 31)
                )
            ), '[]'::json)
            FROM unnest(p.logs) AS log
        ),
        'estadisticas', json_build_object(
            'tasa_exito', CASE
                WHEN p.total_registros > 0
                THEN ROUND((p.registros_exitosos::decimal / p.total_registros::decimal) * 100, 2)
                ELSE 0
            END,
            'duracion_formateada', CASE
                WHEN p.duracion_ms IS NULL THEN NULL
                WHEN p.duracion_ms < 1000 THEN p.duracion_ms || ' ms'
                WHEN p.duracion_ms < 60000 THEN ROUND(p.duracion_ms / 1000.0, 2) || ' s'
                ELSE ROUND(p.duracion_ms / 60000.0, 2) || ' min'
            END,
            'num_logs', COALESCE(array_length(p.logs, 1), 0),
            'num_errores', COALESCE(jsonb_array_length(p.errores), 0)
        )
    ) INTO v_result
    FROM procesos_etl p
    WHERE p.id = p_proceso_id;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas por periodo (últimos 30 días)
CREATE OR REPLACE FUNCTION estadisticas_procesos_por_fecha(
    p_dias INTEGER DEFAULT 30
)
RETURNS TABLE (
    fecha DATE,
    total_procesos BIGINT,
    completados BIGINT,
    error BIGINT,
    total_registros BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(p.created_at) as fecha,
        COUNT(*) as total_procesos,
        COUNT(*) FILTER (WHERE p.estado = 'completado') as completados,
        COUNT(*) FILTER (WHERE p.estado = 'error') as error,
        COALESCE(SUM(p.total_registros), 0) as total_registros
    FROM procesos_etl p
    WHERE p.created_at >= NOW() - (p_dias || ' days')::interval
    GROUP BY DATE(p.created_at)
    ORDER BY fecha DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener resumen de documentos transformados
CREATE OR REPLACE FUNCTION resumen_documentos_transformados()
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_documentos', COUNT(*),
        'tamaño_total_bytes', COALESCE(SUM(tamaño_bytes), 0),
        'tamaño_total_mb', ROUND(COALESCE(SUM(tamaño_bytes), 0) / 1048576.0, 2),
        'por_formato', (
            SELECT json_object_agg(
                formato,
                json_build_object(
                    'count', count,
                    'tamaño_mb', tamaño_mb
                )
            )
            FROM (
                SELECT
                    formato,
                    COUNT(*) as count,
                    ROUND(COALESCE(SUM(tamaño_bytes), 0) / 1048576.0, 2) as tamaño_mb
                FROM documentos_transformados
                GROUP BY formato
            ) subq
        ),
        'por_tipo', (
            SELECT json_object_agg(
                tipo_documento,
                json_build_object(
                    'count', count,
                    'registros_totales', registros_totales
                )
            )
            FROM (
                SELECT
                    tipo_documento,
                    COUNT(*) as count,
                    COALESCE(SUM(num_registros), 0) as registros_totales
                FROM documentos_transformados
                GROUP BY tipo_documento
            ) subq
        ),
        'ultimos_documentos', (
            SELECT json_agg(
                json_build_object(
                    'id', id,
                    'nombre_archivo', nombre_archivo,
                    'formato', formato,
                    'num_registros', num_registros,
                    'created_at', created_at
                )
            )
            FROM (
                SELECT * FROM documentos_transformados
                ORDER BY created_at DESC
                LIMIT 10
            ) ultimos
        )
    ) INTO v_result
    FROM documentos_transformados;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants para usuarios autenticados
GRANT EXECUTE ON FUNCTION estadisticas_procesos_etl() TO authenticated;
GRANT EXECUTE ON FUNCTION obtener_historial_procesos_etl(VARCHAR, VARCHAR, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION obtener_detalle_proceso_etl(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION estadisticas_procesos_por_fecha(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION resumen_documentos_transformados() TO authenticated;

-- Comentarios
COMMENT ON FUNCTION estadisticas_procesos_etl() IS 'Retorna estadísticas generales de todos los procesos ETL';
COMMENT ON FUNCTION obtener_historial_procesos_etl(VARCHAR, VARCHAR, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) IS 'Retorna historial de procesos ETL con filtros y paginación';
COMMENT ON FUNCTION obtener_detalle_proceso_etl(UUID) IS 'Retorna detalles completos de un proceso ETL incluyendo logs, errores y documentos';
COMMENT ON FUNCTION estadisticas_procesos_por_fecha(INTEGER) IS 'Retorna estadísticas de procesos agrupadas por fecha';
COMMENT ON FUNCTION resumen_documentos_transformados() IS 'Retorna resumen de documentos transformados por formato y tipo';
