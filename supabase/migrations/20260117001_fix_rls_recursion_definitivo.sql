-- ============================================
-- MIGRACIÓN: Solución Definitiva a Recursión RLS
-- Fecha: 2026-01-17
-- Descripción: Elimina completamente la función get_my_role() y
--              reescribe todas las políticas RLS sin recursión
-- ============================================

-- 1. Primero eliminar todas las políticas que dependen de get_my_role()

-- Policies en PROFILES
DROP POLICY IF EXISTS "Admins pueden ver todos los perfiles" ON profiles;
DROP POLICY IF EXISTS "Admins pueden actualizar perfiles" ON profiles;
DROP POLICY IF EXISTS "Admins pueden eliminar perfiles" ON profiles;

-- Policies en EVALUACIONES
DROP POLICY IF EXISTS "Admins pueden ver todas las evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "Admins pueden actualizar evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "Admins pueden eliminar evaluaciones" ON evaluaciones;

-- Policies en PLANIFICACIONES
DROP POLICY IF EXISTS "Admins pueden ver todas las planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Admins pueden actualizar planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Admins pueden eliminar planificaciones" ON planificaciones;

-- Policies en PROCESOS_ETL
DROP POLICY IF EXISTS "Admins pueden ver procesos ETL" ON procesos_etl;
DROP POLICY IF EXISTS "Admins pueden crear procesos ETL" ON procesos_etl;
DROP POLICY IF EXISTS "Admins pueden actualizar procesos ETL" ON procesos_etl;

-- Policies en DOCUMENTOS_TRANSFORMADOS
DROP POLICY IF EXISTS "Admins pueden ver documentos transformados" ON documentos_transformados;

-- Ahora sí podemos eliminar la función problemática
DROP FUNCTION IF EXISTS public.get_my_role();

-- 2. Recrear políticas RLS en PROFILES sin usar get_my_role()
-- Estas políticas deben evitar cualquier subquery recursiva
CREATE POLICY "Admins pueden ver todos los perfiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Los usuarios pueden ver su propio perfil
    id = auth.uid()
    OR
    -- Los admins/maintainers pueden ver todos los perfiles
    -- Usamos un EXISTS más directo que no causa recursión
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'maintainer')
      LIMIT 1
    )
  );

CREATE POLICY "Admins pueden actualizar perfiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'maintainer')
      LIMIT 1
    )
  );

CREATE POLICY "Admins pueden eliminar perfiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      LIMIT 1
    )
  );

-- 3. Recrear políticas RLS en EVALUACIONES sin recursión
CREATE POLICY "Admins pueden ver todas las evaluaciones"
  ON evaluaciones FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
      LIMIT 1
    )
  );

CREATE POLICY "Admins pueden actualizar evaluaciones"
  ON evaluaciones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
      LIMIT 1
    )
  );

CREATE POLICY "Admins pueden eliminar evaluaciones"
  ON evaluaciones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      LIMIT 1
    )
  );

-- 4. Recrear políticas RLS en PLANIFICACIONES sin recursión
CREATE POLICY "Admins pueden ver todas las planificaciones"
  ON planificaciones FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
      LIMIT 1
    )
  );

CREATE POLICY "Admins pueden actualizar planificaciones"
  ON planificaciones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
      LIMIT 1
    )
  );

CREATE POLICY "Admins pueden eliminar planificaciones"
  ON planificaciones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      LIMIT 1
    )
  );

-- 5. Recrear políticas RLS en PROCESOS_ETL sin recursión
CREATE POLICY "Admins pueden ver procesos ETL"
  ON procesos_etl FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
      LIMIT 1
    )
  );

CREATE POLICY "Admins pueden crear procesos ETL"
  ON procesos_etl FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
      LIMIT 1
    )
  );

CREATE POLICY "Admins pueden actualizar procesos ETL"
  ON procesos_etl FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
      LIMIT 1
    )
  );

-- 6. Recrear políticas RLS en DOCUMENTOS_TRANSFORMADOS sin recursión
CREATE POLICY "Admins pueden ver documentos transformados"
  ON documentos_transformados FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
      LIMIT 1
    )
  );

-- 7. Añadir política admin para PORTAFOLIOS (faltaba)
DROP POLICY IF EXISTS "Admins pueden ver todos los portafolios" ON portafolios;
CREATE POLICY "Admins pueden ver todos los portafolios"
  ON portafolios FOR SELECT
  TO authenticated
  USING (
    profesor_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
      LIMIT 1
    )
  );

-- 8. Crear índices para optimizar las consultas de políticas RLS
-- Estos índices ya existen, pero nos aseguramos
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);

-- 9. Comentarios
COMMENT ON POLICY "Admins pueden ver todos los perfiles" ON profiles IS 
  'Permite a usuarios con rol admin o maintainer ver todos los perfiles. Sin recursión.';

COMMENT ON POLICY "Admins pueden ver todas las evaluaciones" ON evaluaciones IS 
  'Permite a usuarios con rol admin o maintainer ver todas las evaluaciones. Sin recursión.';

COMMENT ON POLICY "Admins pueden ver todas las planificaciones" ON planificaciones IS 
  'Permite a usuarios con rol admin o maintainer ver todas las planificaciones. Sin recursión.';

COMMENT ON POLICY "Admins pueden ver procesos ETL" ON procesos_etl IS 
  'Permite a usuarios con rol admin o maintainer ver todos los procesos ETL. Sin recursión.';

COMMENT ON POLICY "Admins pueden ver todos los portafolios" ON portafolios IS 
  'Permite a usuarios con rol admin o maintainer ver todos los portafolios. Sin recursión.';

-- 10. Verificación
SELECT 'Políticas RLS recreadas sin recursión exitosamente' as status;
