-- ============================================
-- MIGRACIÓN: Corregir Recursión en RLS y Relaciones
-- Fecha: 2026-01-16
-- Descripción: 
-- 1. Crea función segura para verificar rol de admin/maintainer sin recursión
-- 2. Actualiza políticas RLS para usar esta función
-- 3. Corrige FK de portafolios para permitir joins con profiles
-- ============================================

-- 1. Función Helper para obtener rol (SECURITY DEFINER para evitar RLS recursion)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN v_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO service_role;

-- 2. Corregir Políticas RLS en PROFILES
DROP POLICY IF EXISTS "Admins pueden ver todos los perfiles" ON profiles;
CREATE POLICY "Admins pueden ver todos los perfiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    get_my_role() IN ('admin', 'maintainer') 
    OR id = auth.uid() -- Usuarios pueden ver su propio perfil
  );

DROP POLICY IF EXISTS "Admins pueden actualizar perfiles" ON profiles;
CREATE POLICY "Admins pueden actualizar perfiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    get_my_role() IN ('admin', 'maintainer')
    OR id = auth.uid() -- Usuarios pueden actualizar su propio perfil (sujeto a campos permitidos, manejado en API/triggers)
  );

DROP POLICY IF EXISTS "Admins pueden eliminar perfiles" ON profiles;
CREATE POLICY "Admins pueden eliminar perfiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    get_my_role() = 'admin'
  );

-- 3. Corregir Políticas RLS en OTRAS TABLAS

-- EVALUACIONES
DROP POLICY IF EXISTS "Admins pueden ver todas las evaluaciones" ON evaluaciones;
CREATE POLICY "Admins pueden ver todas las evaluaciones"
  ON evaluaciones FOR SELECT
  TO authenticated
  USING (
    get_my_role() IN ('admin', 'maintainer')
    OR user_id = auth.uid() -- Usuarios ven sus propias evaluaciones (asumiendo política existente, pero reforzamos)
  );

DROP POLICY IF EXISTS "Admins pueden actualizar evaluaciones" ON evaluaciones;
CREATE POLICY "Admins pueden actualizar evaluaciones"
  ON evaluaciones FOR UPDATE
  TO authenticated
  USING (
    get_my_role() IN ('admin', 'maintainer')
  );

DROP POLICY IF EXISTS "Admins pueden eliminar evaluaciones" ON evaluaciones;
CREATE POLICY "Admins pueden eliminar evaluaciones"
  ON evaluaciones FOR DELETE
  TO authenticated
  USING (
    get_my_role() = 'admin'
  );

-- PLANIFICACIONES
DROP POLICY IF EXISTS "Admins pueden ver todas las planificaciones" ON planificaciones;
CREATE POLICY "Admins pueden ver todas las planificaciones"
  ON planificaciones FOR SELECT
  TO authenticated
  USING (
    get_my_role() IN ('admin', 'maintainer')
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins pueden actualizar planificaciones" ON planificaciones;
CREATE POLICY "Admins pueden actualizar planificaciones"
  ON planificaciones FOR UPDATE
  TO authenticated
  USING (
    get_my_role() IN ('admin', 'maintainer')
  );

DROP POLICY IF EXISTS "Admins pueden eliminar planificaciones" ON planificaciones;
CREATE POLICY "Admins pueden eliminar planificaciones"
  ON planificaciones FOR DELETE
  TO authenticated
  USING (
    get_my_role() = 'admin'
  );

-- PROCESOS ETL
DROP POLICY IF EXISTS "Admins pueden ver procesos ETL" ON procesos_etl;
CREATE POLICY "Admins pueden ver procesos ETL"
  ON procesos_etl FOR SELECT
  TO authenticated
  USING (
    get_my_role() IN ('admin', 'maintainer')
  );

DROP POLICY IF EXISTS "Admins pueden crear procesos ETL" ON procesos_etl;
CREATE POLICY "Admins pueden crear procesos ETL"
  ON procesos_etl FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() IN ('admin', 'maintainer')
  );

DROP POLICY IF EXISTS "Admins pueden actualizar procesos ETL" ON procesos_etl;
CREATE POLICY "Admins pueden actualizar procesos ETL"
  ON procesos_etl FOR UPDATE
  TO authenticated
  USING (
    get_my_role() IN ('admin', 'maintainer')
  );

-- DOCUMENTOS TRANSFORMADOS
DROP POLICY IF EXISTS "Admins pueden ver documentos transformados" ON documentos_transformados;
CREATE POLICY "Admins pueden ver documentos transformados"
  ON documentos_transformados FOR SELECT
  TO authenticated
  USING (
    get_my_role() IN ('admin', 'maintainer')
  );

-- 4. Corregir FK de Portafolios para PostgREST embedding
-- Intentamos cambiar la FK para que apunte a profiles(id) en lugar de auth.users(id)
DO $$
BEGIN
  -- Solo si la tabla existe
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'portafolios') THEN
    
    -- Dropear constraint vieja si existe (nombre por defecto o especifico)
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'portafolios' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'portafolios_profesor_id_fkey'
    ) THEN
      ALTER TABLE portafolios DROP CONSTRAINT portafolios_profesor_id_fkey;
    END IF;

    -- Añadir nueva constraint apuntando a profiles
    ALTER TABLE portafolios 
      ADD CONSTRAINT portafolios_profesor_id_fkey 
      FOREIGN KEY (profesor_id) 
      REFERENCES profiles(id) 
      ON DELETE CASCADE;
      
  END IF;
END $$;
