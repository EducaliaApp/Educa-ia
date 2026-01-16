-- Migración para corregir permisos de funciones RPC de ETL
-- Agregar SECURITY DEFINER y grants para permitir que Edge Functions
-- autenticadas por usuarios admin puedan ejecutar las funciones

-- Re-crear función iniciar_proceso_etl con SECURITY DEFINER
CREATE OR REPLACE FUNCTION iniciar_proceso_etl(
    p_nombre VARCHAR,
    p_tipo_proceso VARCHAR,
    p_descripcion TEXT DEFAULT NULL,
    p_configuracion JSONB DEFAULT '{}'::jsonb,
    p_ejecutado_por UUID DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_proceso_id UUID;
    v_ejecutor UUID;
BEGIN
    -- Determinar ejecutor: parámetro, usuario autenticado, o NULL
    -- En contexto SECURITY DEFINER, auth.uid() puede ser NULL
    v_ejecutor := COALESCE(p_ejecutado_por, auth.uid());
    
    -- Log si no hay ejecutor identificado
    IF v_ejecutor IS NULL THEN
        RAISE WARNING 'iniciar_proceso_etl: No se pudo determinar ejecutor';
    END IF;
    
    INSERT INTO procesos_etl (
        nombre,
        tipo_proceso,
        descripcion,
        estado,
        fecha_inicio,
        configuracion,
        ejecutado_por
    ) VALUES (
        p_nombre,
        p_tipo_proceso,
        p_descripcion,
        'en_progreso',
        NOW(),
        p_configuracion,
        v_ejecutor
    ) RETURNING id INTO v_proceso_id;
    
    RETURN v_proceso_id;
END;
$$ LANGUAGE plpgsql;

-- Re-crear función finalizar_proceso_etl con SECURITY DEFINER
CREATE OR REPLACE FUNCTION finalizar_proceso_etl(
    p_proceso_id UUID,
    p_estado VARCHAR,
    p_total_registros INTEGER DEFAULT 0,
    p_registros_exitosos INTEGER DEFAULT 0,
    p_registros_fallidos INTEGER DEFAULT 0,
    p_archivos_generados JSONB DEFAULT '[]'::jsonb,
    p_logs TEXT[] DEFAULT ARRAY[]::TEXT[],
    p_errores JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_fecha_inicio TIMESTAMPTZ;
BEGIN
    -- Obtener fecha de inicio
    SELECT fecha_inicio INTO v_fecha_inicio
    FROM procesos_etl
    WHERE id = p_proceso_id;
    
    -- Actualizar proceso
    UPDATE procesos_etl
    SET 
        estado = p_estado,
        fecha_fin = NOW(),
        duracion_ms = EXTRACT(EPOCH FROM (NOW() - v_fecha_inicio)) * 1000,
        total_registros = p_total_registros,
        registros_exitosos = p_registros_exitosos,
        registros_fallidos = p_registros_fallidos,
        archivos_generados = p_archivos_generados,
        logs = p_logs,
        errores = p_errores,
        updated_at = NOW()
    WHERE id = p_proceso_id;
END;
$$ LANGUAGE plpgsql;

-- Re-crear función agregar_log_proceso_etl con SECURITY DEFINER
CREATE OR REPLACE FUNCTION agregar_log_proceso_etl(
    p_proceso_id UUID,
    p_mensaje TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE procesos_etl
    SET 
        logs = array_append(logs, p_mensaje),
        updated_at = NOW()
    WHERE id = p_proceso_id;
END;
$$ LANGUAGE plpgsql;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION iniciar_proceso_etl(VARCHAR, VARCHAR, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION finalizar_proceso_etl(UUID, VARCHAR, INTEGER, INTEGER, INTEGER, JSONB, TEXT[], JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION agregar_log_proceso_etl(UUID, TEXT) TO authenticated;

-- Crear política de storage para bucket documentos-transformados
-- Permitir que admins puedan subir archivos
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-transformados', 'documentos-transformados', false)
ON CONFLICT (id) DO NOTHING;

-- Política de storage: admins pueden hacer todo
CREATE POLICY "Admin full access on documentos-transformados bucket"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'documentos-transformados' 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    bucket_id = 'documentos-transformados' 
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

COMMENT ON FUNCTION iniciar_proceso_etl IS 'Crea un nuevo proceso ETL con estado en_progreso. SECURITY DEFINER permite bypass de RLS.';
COMMENT ON FUNCTION finalizar_proceso_etl IS 'Finaliza un proceso ETL actualizando su estado y métricas. SECURITY DEFINER permite bypass de RLS.';
COMMENT ON FUNCTION agregar_log_proceso_etl IS 'Agrega un mensaje de log a un proceso ETL. SECURITY DEFINER permite bypass de RLS.';
