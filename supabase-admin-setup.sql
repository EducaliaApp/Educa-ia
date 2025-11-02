-- ============================================
-- ADMIN PANEL SETUP - SAFE VERSION (NO RECURSION)
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- para configurar el panel de administración sin
-- provocar el error "infinite recursion".
-- ============================================

-- 0. Asegurar que las tablas tengan RLS habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE planificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;

-- 1. Limpiar políticas previas que puedan causar conflictos
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "allow_insert" ON profiles;
DROP POLICY IF EXISTS "allow_select" ON profiles;
DROP POLICY IF EXISTS "allow_update" ON profiles;

DROP POLICY IF EXISTS "Users can view own planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Users can insert own planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Users can update own planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Admins can view all planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Admins can insert any planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Admins can update any planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "plan_select" ON planificaciones;
DROP POLICY IF EXISTS "plan_insert" ON planificaciones;
DROP POLICY IF EXISTS "plan_update" ON planificaciones;

DROP POLICY IF EXISTS "Users can view own evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "Users can insert own evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "Users can update own evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "Admins can view all evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "Admins can insert any evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "Admins can update any evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "eval_select" ON evaluaciones;
DROP POLICY IF EXISTS "eval_insert" ON evaluaciones;
DROP POLICY IF EXISTS "eval_update" ON evaluaciones;

-- 2. Asegurar columna role y restricciones
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 3. Marcar como admin al usuario principal
UPDATE profiles
SET role = 'admin'
WHERE email = 'h.herrera@cloou.com';

-- 4. Función helper para detectar si el usuario actual es admin
DROP FUNCTION IF EXISTS public.is_admin();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN COALESCE(current_setting('role', true), '') = 'service_role';
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = current_user_id
      AND role = 'admin'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- 5. Políticas RLS para profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 6. Políticas RLS para planificaciones
CREATE POLICY "Users can view own planificaciones"
  ON planificaciones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all planificaciones"
  ON planificaciones FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can insert own planificaciones"
  ON planificaciones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert any planificaciones"
  ON planificaciones FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own planificaciones"
  ON planificaciones FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any planificaciones"
  ON planificaciones FOR UPDATE
  USING (public.is_admin());

-- 7. Políticas RLS para evaluaciones
CREATE POLICY "Users can view own evaluaciones"
  ON evaluaciones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all evaluaciones"
  ON evaluaciones FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can insert own evaluaciones"
  ON evaluaciones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert any evaluaciones"
  ON evaluaciones FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own evaluaciones"
  ON evaluaciones FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any evaluaciones"
  ON evaluaciones FOR UPDATE
  USING (public.is_admin());

-- 8. Funciones RPC utilizadas por el panel admin
CREATE OR REPLACE FUNCTION public.get_top_users(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  nombre TEXT,
  email TEXT,
  plan TEXT,
  asignatura TEXT,
  total_planificaciones BIGINT,
  total_evaluaciones BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service_role BOOLEAN := COALESCE(current_setting('role', true), '') = 'service_role';
BEGIN
  IF NOT (public.is_admin() OR is_service_role) THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.nombre,
    p.email,
    p.plan,
    p.asignatura,
    COUNT(DISTINCT pl.id) AS total_planificaciones,
    COUNT(DISTINCT e.id) AS total_evaluaciones,
    p.created_at
  FROM profiles p
  LEFT JOIN planificaciones pl ON p.id = pl.user_id
  LEFT JOIN evaluaciones e ON p.id = e.user_id
  GROUP BY p.id, p.nombre, p.email, p.plan, p.asignatura, p.created_at
  ORDER BY total_planificaciones DESC, total_evaluaciones DESC
  LIMIT limit_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_stats()
RETURNS TABLE (
  total_users BIGINT,
  free_users BIGINT,
  pro_users BIGINT,
  conversion_rate NUMERIC,
  mrr_clp NUMERIC,
  planificaciones_today BIGINT,
  active_users_7d BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service_role BOOLEAN := COALESCE(current_setting('role', true), '') = 'service_role';
BEGIN
  IF NOT (public.is_admin() OR is_service_role) THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_users,
    COUNT(*) FILTER (WHERE plan = 'free')::BIGINT AS free_users,
    COUNT(*) FILTER (WHERE plan = 'pro')::BIGINT AS pro_users,
    CASE
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE plan = 'pro')::NUMERIC / COUNT(*)::NUMERIC * 100), 2)
      ELSE 0
    END AS conversion_rate,
    (COUNT(*) FILTER (WHERE plan = 'pro') * 6990)::NUMERIC AS mrr_clp,
    (
      SELECT COUNT(*)::BIGINT
      FROM planificaciones
      WHERE DATE(created_at) = CURRENT_DATE
    ) AS planificaciones_today,
    (
      SELECT COUNT(DISTINCT user_id)::BIGINT
      FROM planificaciones
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    ) AS active_users_7d
  FROM profiles;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_planificaciones_by_date(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  date DATE,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service_role BOOLEAN := COALESCE(current_setting('role', true), '') = 'service_role';
BEGIN
  IF NOT (public.is_admin() OR is_service_role) THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT
    DATE(created_at) AS date,
    COUNT(*)::BIGINT AS count
  FROM planificaciones
  WHERE created_at >= CURRENT_DATE - days_back
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_planificaciones_by_subject()
RETURNS TABLE (
  asignatura TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service_role BOOLEAN := COALESCE(current_setting('role', true), '') = 'service_role';
BEGIN
  IF NOT (public.is_admin() OR is_service_role) THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT
    p.asignatura,
    COUNT(*)::BIGINT AS count
  FROM planificaciones pl
  JOIN profiles p ON pl.user_id = p.id
  GROUP BY p.asignatura
  ORDER BY count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_planificaciones_by_nivel()
RETURNS TABLE (
  nivel TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service_role BOOLEAN := COALESCE(current_setting('role', true), '') = 'service_role';
BEGIN
  IF NOT (public.is_admin() OR is_service_role) THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT
    pl.nivel,
    COUNT(*)::BIGINT AS count
  FROM planificaciones pl
  GROUP BY pl.nivel
  ORDER BY count DESC;
END;
$$;

-- 9. Permisos para ejecutar las funciones RPC
GRANT EXECUTE ON FUNCTION public.get_top_users(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_planificaciones_by_date(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_planificaciones_by_subject() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_planificaciones_by_nivel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_users(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_planificaciones_by_date(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_planificaciones_by_subject() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_planificaciones_by_nivel() TO service_role;

-- 10. Mensaje de verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Admin setup ejecutado correctamente';
  RAISE NOTICE '✅ Políticas recreadas sin recursión';
  RAISE NOTICE '✅ Usuario admin configurado: h.herrera@cloou.com';
END $$;
