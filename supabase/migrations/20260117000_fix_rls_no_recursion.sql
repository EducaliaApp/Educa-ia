-- 20260117000_fix_rls_no_recursion.sql
-- Políticas RLS seguras para evitar recursión infinita en Educa-ia

-- 1. Eliminar políticas antiguas problemáticas en profiles
DROP POLICY IF EXISTS "Admins pueden ver todos los perfiles" ON profiles;
DROP POLICY IF EXISTS "Admins pueden actualizar perfiles" ON profiles;
DROP POLICY IF EXISTS "Admins pueden eliminar perfiles" ON profiles;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuarios pueden eliminar su propio perfil" ON profiles;

-- 2. Crear políticas seguras en profiles SIN subconsultas recursivas
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Usuarios pueden eliminar su propio perfil"
  ON profiles FOR DELETE
  USING (id = auth.uid());

-- Políticas de admin usando el campo role directamente (sin subconsulta a profiles)
CREATE POLICY "Admins pueden ver todos los perfiles"
  ON profiles FOR SELECT
  USING (id = auth.uid() AND role = 'admin');

CREATE POLICY "Admins pueden actualizar todos los perfiles"
  ON profiles FOR UPDATE
  USING (id = auth.uid() AND role = 'admin');

CREATE POLICY "Admins pueden eliminar todos los perfiles"
  ON profiles FOR DELETE
  USING (id = auth.uid() AND role = 'admin');

-- 3. Políticas para planificaciones
DROP POLICY IF EXISTS "Admins pueden ver todas las planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Admins pueden actualizar planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Admins pueden eliminar planificaciones" ON planificaciones;

CREATE POLICY "Usuarios pueden ver sus propias planificaciones"
  ON planificaciones FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins pueden ver todas las planificaciones"
  ON planificaciones FOR SELECT
  USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'maintainer'))
  );

-- 4. Políticas para evaluaciones
DROP POLICY IF EXISTS "Admins pueden ver todas las evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "Admins pueden actualizar evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "Admins pueden eliminar evaluaciones" ON evaluaciones;

CREATE POLICY "Usuarios pueden ver sus propias evaluaciones"
  ON evaluaciones FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins pueden ver todas las evaluaciones"
  ON evaluaciones FOR SELECT
  USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'maintainer'))
  );

-- 5. Políticas para portafolios
DROP POLICY IF EXISTS "Admins pueden ver todos los portafolios" ON portafolios;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios portafolios" ON portafolios;
DROP POLICY IF EXISTS "Los profesores pueden ver sus propios portafolios" ON portafolios;

CREATE POLICY "Usuarios pueden ver sus propios portafolios"
  ON portafolios FOR SELECT
  USING (profesor_id = auth.uid());

CREATE POLICY "Admins pueden ver todos los portafolios"
  ON portafolios FOR SELECT
  USING (
    profesor_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'maintainer'))
  );

-- 6. Políticas para analisis_ia_portafolio
DROP POLICY IF EXISTS "Admins pueden ver analisis" ON analisis_ia_portafolio;
DROP POLICY IF EXISTS "Usuarios pueden ver sus analisis" ON analisis_ia_portafolio;

CREATE POLICY "Usuarios pueden ver sus propios analisis"
  ON analisis_ia_portafolio FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portafolios p 
      WHERE p.id = analisis_ia_portafolio.portafolio_id 
      AND p.profesor_id = auth.uid()
    )
  );

CREATE POLICY "Admins pueden ver todos los analisis"
  ON analisis_ia_portafolio FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'maintainer'))
  );
