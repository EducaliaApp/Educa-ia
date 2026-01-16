-- ============================================
-- MIGRACIÓN: Corregir Políticas RLS para Panel de Administración
-- Fecha: 2026-01-16
-- Descripción: Añadir políticas RLS que permitan a administradores
--              acceder a datos de todos los usuarios
-- ============================================

-- ============================================
-- 1. POLÍTICAS PARA TABLA profiles
-- ============================================

-- Política: Admins pueden ver todos los perfiles
DROP POLICY IF EXISTS "Admins pueden ver todos los perfiles" ON profiles;
CREATE POLICY "Admins pueden ver todos los perfiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'maintainer')
    )
  );

-- Política: Admins pueden actualizar cualquier perfil
DROP POLICY IF EXISTS "Admins pueden actualizar perfiles" ON profiles;
CREATE POLICY "Admins pueden actualizar perfiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'maintainer')
    )
  );

-- Política: Admins pueden eliminar perfiles (solo admin, no maintainer)
DROP POLICY IF EXISTS "Admins pueden eliminar perfiles" ON profiles;
CREATE POLICY "Admins pueden eliminar perfiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================
-- 2. POLÍTICAS PARA TABLA evaluaciones
-- ============================================

-- Política: Admins pueden ver todas las evaluaciones
DROP POLICY IF EXISTS "Admins pueden ver todas las evaluaciones" ON evaluaciones;
CREATE POLICY "Admins pueden ver todas las evaluaciones"
  ON evaluaciones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
    )
  );

-- Política: Admins pueden actualizar evaluaciones
DROP POLICY IF EXISTS "Admins pueden actualizar evaluaciones" ON evaluaciones;
CREATE POLICY "Admins pueden actualizar evaluaciones"
  ON evaluaciones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
    )
  );

-- Política: Admins pueden eliminar evaluaciones
DROP POLICY IF EXISTS "Admins pueden eliminar evaluaciones" ON evaluaciones;
CREATE POLICY "Admins pueden eliminar evaluaciones"
  ON evaluaciones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 3. POLÍTICAS PARA TABLA planificaciones
-- ============================================

-- Política: Admins pueden ver todas las planificaciones
DROP POLICY IF EXISTS "Admins pueden ver todas las planificaciones" ON planificaciones;
CREATE POLICY "Admins pueden ver todas las planificaciones"
  ON planificaciones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
    )
  );

-- Política: Admins pueden actualizar planificaciones
DROP POLICY IF EXISTS "Admins pueden actualizar planificaciones" ON planificaciones;
CREATE POLICY "Admins pueden actualizar planificaciones"
  ON planificaciones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
    )
  );

-- Política: Admins pueden eliminar planificaciones
DROP POLICY IF EXISTS "Admins pueden eliminar planificaciones" ON planificaciones;
CREATE POLICY "Admins pueden eliminar planificaciones"
  ON planificaciones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 4. POLÍTICAS PARA TABLA procesos_etl
-- ============================================

-- Verificar si la tabla existe y habilitar RLS si no está habilitado
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'procesos_etl') THEN
    ALTER TABLE procesos_etl ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Política: Admins pueden ver todos los procesos ETL
DROP POLICY IF EXISTS "Admins pueden ver procesos ETL" ON procesos_etl;
CREATE POLICY "Admins pueden ver procesos ETL"
  ON procesos_etl FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
    )
  );

-- Política: Admins pueden crear procesos ETL
DROP POLICY IF EXISTS "Admins pueden crear procesos ETL" ON procesos_etl;
CREATE POLICY "Admins pueden crear procesos ETL"
  ON procesos_etl FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
    )
  );

-- Política: Admins pueden actualizar procesos ETL
DROP POLICY IF EXISTS "Admins pueden actualizar procesos ETL" ON procesos_etl;
CREATE POLICY "Admins pueden actualizar procesos ETL"
  ON procesos_etl FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
    )
  );

-- ============================================
-- 5. POLÍTICAS PARA TABLA documentos_transformados
-- ============================================

-- Verificar si la tabla existe y habilitar RLS si no está habilitado
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documentos_transformados') THEN
    ALTER TABLE documentos_transformados ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Política: Admins pueden ver todos los documentos transformados
DROP POLICY IF EXISTS "Admins pueden ver documentos transformados" ON documentos_transformados;
CREATE POLICY "Admins pueden ver documentos transformados"
  ON documentos_transformados FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'maintainer')
    )
  );

-- ============================================
-- 6. ÍNDICES PARA MEJORAR RENDIMIENTO DE CONSULTAS ADMIN
-- ============================================

-- Índice para consultas de profiles por role (mejora el rendimiento de las políticas RLS)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Índice para consultas de evaluaciones por created_at
CREATE INDEX IF NOT EXISTS idx_evaluaciones_created_at_desc ON evaluaciones(created_at DESC);

-- Índice para consultas de planificaciones por created_at
CREATE INDEX IF NOT EXISTS idx_planificaciones_created_at_desc ON planificaciones(created_at DESC);

-- ============================================
-- 7. COMENTARIOS
-- ============================================

COMMENT ON POLICY "Admins pueden ver todos los perfiles" ON profiles IS 
  'Permite a usuarios con rol admin o maintainer ver todos los perfiles del sistema';

COMMENT ON POLICY "Admins pueden ver todas las evaluaciones" ON evaluaciones IS 
  'Permite a usuarios con rol admin o maintainer ver todas las evaluaciones del sistema';

COMMENT ON POLICY "Admins pueden ver todas las planificaciones" ON planificaciones IS 
  'Permite a usuarios con rol admin o maintainer ver todas las planificaciones del sistema';

COMMENT ON POLICY "Admins pueden ver procesos ETL" ON procesos_etl IS 
  'Permite a usuarios con rol admin o maintainer ver todos los procesos ETL';

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT 'RLS policies para administradores creadas exitosamente' as status;

-- Verificar que las políticas existen
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'evaluaciones', 'planificaciones', 'procesos_etl', 'documentos_transformados')
  AND policyname LIKE '%Admin%'
ORDER BY tablename, policyname;
