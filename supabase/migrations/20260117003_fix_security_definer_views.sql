-- ============================================================================
-- Migración: Corrección de vistas con SECURITY DEFINER
-- Fecha: 2026-01-17
-- Descripción: Cambia todas las vistas de SECURITY DEFINER a SECURITY INVOKER
--              para mejorar la seguridad y evitar bypass de RLS
-- ============================================================================

-- 1. Vista: procesos_etl_recientes
DROP VIEW IF EXISTS public.procesos_etl_recientes;

CREATE VIEW public.procesos_etl_recientes
WITH (security_invoker = true)
AS
SELECT id,
    nombre,
    tipo_proceso,
    estado,
    fecha_inicio,
    fecha_fin,
    duracion_ms,
    total_registros,
    registros_exitosos,
    registros_fallidos,
    CASE
        WHEN ((registros_exitosos > 0) AND (total_registros > 0)) 
        THEN round((((registros_exitosos)::numeric / (total_registros)::numeric) * (100)::numeric), 2)
        ELSE (0)::numeric
    END AS tasa_exito_porcentaje,
    (SELECT count(*) FROM documentos_transformados WHERE documentos_transformados.proceso_etl_id = procesos_etl.id) AS num_archivos,
    created_at,
    updated_at
FROM procesos_etl
ORDER BY created_at DESC
LIMIT 50;

-- 2. Vista: profiles_with_roles
DROP VIEW IF EXISTS public.profiles_with_roles;

CREATE VIEW public.profiles_with_roles
WITH (security_invoker = true)
AS
SELECT p.id,
    p.email,
    p.nombre,
    p.asignatura,
    p.nivel,
    p.plan,
    p.role AS role_legacy,
    p.role_id,
    r.codigo AS role_codigo,
    r.nombre AS role_nombre,
    r.descripcion AS role_descripcion,
    r.permisos AS role_permisos,
    p.creditos_planificaciones,
    p.creditos_evaluaciones,
    p.creditos_usados_planificaciones,
    p.creditos_usados_evaluaciones,
    p.periodo_actual,
    p.created_at,
    p.updated_at
FROM profiles p
LEFT JOIN roles r ON p.role_id = r.id;

-- 3. Vista: function_logs_summary
DROP VIEW IF EXISTS public.function_logs_summary;

CREATE VIEW public.function_logs_summary
WITH (security_invoker = true)
AS
SELECT function_name,
    level,
    count(*) AS count,
    max(created_at) AS last_occurrence,
    avg(execution_time_ms) AS avg_execution_ms
FROM function_logs
WHERE created_at > (now() - interval '24 hours')
GROUP BY function_name, level
ORDER BY function_name, level;

-- 4. Vista: documentos_pendientes
DROP VIEW IF EXISTS public.documentos_pendientes;

CREATE VIEW public.documentos_pendientes
WITH (security_invoker = true)
AS
SELECT id,
    titulo,
    tipo_documento,
    "año_vigencia",
    storage_path,
    estado_procesamiento,
    progreso_procesamiento,
    etapa_actual,
    created_at
FROM documentos_oficiales
WHERE procesado = false 
    AND (estado_procesamiento IS NULL OR estado_procesamiento::text <> 'fallido_permanente')
ORDER BY created_at;

-- 5. Vista: objetivos_desactualizados
DROP VIEW IF EXISTS public.objetivos_desactualizados;

CREATE VIEW public.objetivos_desactualizados
WITH (security_invoker = true)
AS
SELECT id,
    codigo,
    categoria,
    asignatura,
    nivel,
    curso,
    ultima_actualizacion,
    ultima_verificacion,
    EXTRACT(day FROM (now() - ultima_actualizacion))::integer AS dias_sin_actualizar,
    EXTRACT(day FROM (now() - ultima_verificacion))::integer AS dias_sin_verificar
FROM objetivos_aprendizaje
WHERE ultima_actualizacion IS NOT NULL 
    AND ultima_actualizacion < (now() - interval '90 days')
ORDER BY ultima_actualizacion;

-- 6. Vista: v_calidad_extracciones
DROP VIEW IF EXISTS public.v_calidad_extracciones;

CREATE VIEW public.v_calidad_extracciones
WITH (security_invoker = true)
AS
SELECT tipo_documento,
    count(*) AS total_docs,
    avg(calidad_extraccion) AS calidad_promedio,
    min(calidad_extraccion) AS calidad_minima,
    max(calidad_extraccion) AS calidad_maxima,
    count(*) FILTER (WHERE calidad_extraccion >= 0.9) AS excelente,
    count(*) FILTER (WHERE calidad_extraccion >= 0.7 AND calidad_extraccion < 0.9) AS buena,
    count(*) FILTER (WHERE calidad_extraccion >= 0.5 AND calidad_extraccion < 0.7) AS aceptable,
    count(*) FILTER (WHERE calidad_extraccion < 0.5) AS requiere_revision
FROM documentos_oficiales
WHERE calidad_extraccion IS NOT NULL
GROUP BY tipo_documento
ORDER BY tipo_documento;

-- 7. Vista: estadisticas_actualizacion_objetivos
DROP VIEW IF EXISTS public.estadisticas_actualizacion_objetivos;

CREATE VIEW public.estadisticas_actualizacion_objetivos
WITH (security_invoker = true)
AS
SELECT categoria,
    count(*) AS total_objetivos,
    count(CASE WHEN ultima_actualizacion > (now() - interval '7 days') THEN 1 END) AS actualizados_ultima_semana,
    count(CASE WHEN ultima_actualizacion > (now() - interval '30 days') THEN 1 END) AS actualizados_ultimo_mes,
    count(CASE WHEN ultima_actualizacion > (now() - interval '90 days') THEN 1 END) AS actualizados_ultimo_trimestre,
    count(CASE WHEN ultima_verificacion > (now() - interval '7 days') THEN 1 END) AS verificados_ultima_semana,
    max(ultima_actualizacion) AS ultima_actualizacion_categoria,
    max(ultima_verificacion) AS ultima_verificacion_categoria,
    round(avg(EXTRACT(epoch FROM (now() - ultima_actualizacion)) / 86400.0), 1) AS dias_promedio_desde_actualizacion,
    round(avg(EXTRACT(epoch FROM (now() - ultima_verificacion)) / 86400.0), 1) AS dias_promedio_desde_verificacion
FROM objetivos_aprendizaje
WHERE ultima_actualizacion IS NOT NULL
GROUP BY categoria
ORDER BY categoria;

-- 8. Vista: metricas_rendimiento
DROP VIEW IF EXISTS public.metricas_rendimiento;

CREATE VIEW public.metricas_rendimiento
WITH (security_invoker = true)
AS
SELECT date(created_at) AS fecha,
    tipo,
    count(*) AS operaciones,
    sum(documentos_procesados) AS total_procesados,
    sum(documentos_fallidos) AS total_fallidos,
    avg(tiempo_total_ms) AS tiempo_promedio_ms,
    avg(concurrencia_usada) AS concurrencia_promedio
FROM metricas_procesamiento
GROUP BY date(created_at), tipo
ORDER BY date(created_at) DESC, tipo;

-- Restaurar permisos en las vistas
GRANT SELECT ON public.procesos_etl_recientes TO authenticated;
GRANT SELECT ON public.profiles_with_roles TO authenticated;
GRANT SELECT ON public.function_logs_summary TO authenticated;
GRANT SELECT ON public.documentos_pendientes TO authenticated;
GRANT SELECT ON public.objetivos_desactualizados TO authenticated;
GRANT SELECT ON public.v_calidad_extracciones TO authenticated;
GRANT SELECT ON public.estadisticas_actualizacion_objetivos TO authenticated;
GRANT SELECT ON public.metricas_rendimiento TO authenticated;

-- Comentarios
COMMENT ON VIEW public.procesos_etl_recientes IS 
'Vista de los 50 procesos ETL más recientes con métricas de éxito. Ahora usa SECURITY INVOKER para respetar RLS.';

COMMENT ON VIEW public.profiles_with_roles IS 
'Vista de perfiles de usuario con información de roles asociados. Ahora usa SECURITY INVOKER para respetar RLS.';

COMMENT ON VIEW public.function_logs_summary IS 
'Vista resumen de logs de funciones de las últimas 24 horas. Ahora usa SECURITY INVOKER para respetar RLS.';

COMMENT ON VIEW public.documentos_pendientes IS 
'Vista de documentos oficiales pendientes de procesamiento. Ahora usa SECURITY INVOKER para respetar RLS.';

COMMENT ON VIEW public.objetivos_desactualizados IS 
'Vista de objetivos de aprendizaje sin actualización en más de 90 días. Ahora usa SECURITY INVOKER para respetar RLS.';

COMMENT ON VIEW public.v_calidad_extracciones IS 
'Vista de métricas de calidad de extracción por tipo de documento. Ahora usa SECURITY INVOKER para respetar RLS.';

COMMENT ON VIEW public.estadisticas_actualizacion_objetivos IS 
'Vista de estadísticas de actualización de objetivos de aprendizaje por categoría. Ahora usa SECURITY INVOKER para respetar RLS.';

COMMENT ON VIEW public.metricas_rendimiento IS 
'Vista de métricas de rendimiento de procesamiento agregadas por fecha. Ahora usa SECURITY INVOKER para respetar RLS.';
