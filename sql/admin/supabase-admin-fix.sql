-- DEPRECATED: Usa el script supabase-admin-setup.sql actualizado
-- ============================================
-- FIX: Infinite Recursion in Profiles Policies
-- ============================================
-- This script fixes the infinite recursion error
-- Execute this INSTEAD of the original setup script
-- ============================================

-- 1. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Users can insert own planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Admins can view all planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Admins can insert any planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Users can view own evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "Users can insert own evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "Admins can view all evaluaciones" ON evaluaciones;

-- 2. Create a SECURITY DEFINER function to check if user is admin
-- This function bypasses RLS policies, preventing recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- 3. Add role column if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
CHECK (role IN ('user', 'admin'));

-- 4. Create index for role column
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 5. Make specific user admin
-- IMPORTANT: This email is already configured
UPDATE profiles
SET role = 'admin'
WHERE email = 'h.herrera@cloou.com';

-- 6. Create simple, non-recursive RLS policies for profiles

-- Allow users to view their own profile (no recursion)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow admins to view all profiles (uses SECURITY DEFINER function)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow admins to update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (is_admin());

-- Allow INSERT for authenticated users (needed for signup)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 7. Create RLS policies for planificaciones

-- Users can view their own planificaciones
CREATE POLICY "Users can view own planificaciones"
  ON planificaciones FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all planificaciones
CREATE POLICY "Admins can view all planificaciones"
  ON planificaciones FOR SELECT
  USING (is_admin());

-- Users can insert their own planificaciones
CREATE POLICY "Users can insert own planificaciones"
  ON planificaciones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can insert any planificaciones
CREATE POLICY "Admins can insert any planificaciones"
  ON planificaciones FOR INSERT
  WITH CHECK (is_admin());

-- Users can update their own planificaciones
CREATE POLICY "Users can update own planificaciones"
  ON planificaciones FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can update any planificaciones
CREATE POLICY "Admins can update any planificaciones"
  ON planificaciones FOR UPDATE
  USING (is_admin());

-- 8. Create RLS policies for evaluaciones

-- Users can view their own evaluaciones
CREATE POLICY "Users can view own evaluaciones"
  ON evaluaciones FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all evaluaciones
CREATE POLICY "Admins can view all evaluaciones"
  ON evaluaciones FOR SELECT
  USING (is_admin());

-- Users can insert their own evaluaciones
CREATE POLICY "Users can insert own evaluaciones"
  ON evaluaciones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can insert any evaluaciones
CREATE POLICY "Admins can insert any evaluaciones"
  ON evaluaciones FOR INSERT
  WITH CHECK (is_admin());

-- 9. Create function to get top users by usage
CREATE OR REPLACE FUNCTION get_top_users(limit_count INTEGER DEFAULT 10)
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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.nombre,
    p.email,
    p.plan,
    p.asignatura,
    COUNT(DISTINCT pl.id) as total_planificaciones,
    COUNT(DISTINCT e.id) as total_evaluaciones,
    p.created_at
  FROM profiles p
  LEFT JOIN planificaciones pl ON p.id = pl.user_id
  LEFT JOIN evaluaciones e ON p.id = e.user_id
  GROUP BY p.id, p.nombre, p.email, p.plan, p.asignatura, p.created_at
  ORDER BY total_planificaciones DESC, total_evaluaciones DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE (
  total_users BIGINT,
  free_users BIGINT,
  pro_users BIGINT,
  conversion_rate NUMERIC,
  mrr_clp NUMERIC,
  planificaciones_today BIGINT,
  active_users_7d BIGINT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_users,
    COUNT(*) FILTER (WHERE plan = 'free')::BIGINT as free_users,
    COUNT(*) FILTER (WHERE plan = 'pro')::BIGINT as pro_users,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE plan = 'pro')::NUMERIC / COUNT(*)::NUMERIC * 100), 2)
      ELSE 0
    END as conversion_rate,
    (COUNT(*) FILTER (WHERE plan = 'pro') * 6990)::NUMERIC as mrr_clp,
    (
      SELECT COUNT(*)::BIGINT
      FROM planificaciones
      WHERE DATE(created_at) = CURRENT_DATE
    ) as planificaciones_today,
    (
      SELECT COUNT(DISTINCT user_id)::BIGINT
      FROM planificaciones
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    ) as active_users_7d
  FROM profiles;
END;
$$ LANGUAGE plpgsql;

-- 11. Create function to get planificaciones by date range
CREATE OR REPLACE FUNCTION get_planificaciones_by_date(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  date DATE,
  count BIGINT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    COUNT(*)::BIGINT as count
  FROM planificaciones
  WHERE created_at >= CURRENT_DATE - days_back
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- 12. Create function to get planificaciones by subject
CREATE OR REPLACE FUNCTION get_planificaciones_by_subject()
RETURNS TABLE (
  asignatura TEXT,
  count BIGINT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT
    p.asignatura,
    COUNT(*)::BIGINT as count
  FROM planificaciones pl
  JOIN profiles p ON pl.user_id = p.id
  GROUP BY p.asignatura
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- 13. Create function to get planificaciones by nivel
CREATE OR REPLACE FUNCTION get_planificaciones_by_nivel()
RETURNS TABLE (
  nivel TEXT,
  count BIGINT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT
    pl.nivel,
    COUNT(*)::BIGINT as count
  FROM planificaciones pl
  GROUP BY pl.nivel
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- 14. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_users(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_planificaciones_by_date(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_planificaciones_by_subject() TO authenticated;
GRANT EXECUTE ON FUNCTION get_planificaciones_by_nivel() TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if role column was added
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name = 'role';

-- Check if your user is now admin
-- SELECT id, email, nombre, role FROM profiles WHERE role = 'admin';

-- Test the is_admin function
-- SELECT is_admin();

-- Test the get_user_stats function (only works if you're admin)
-- SELECT * FROM get_user_stats();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Setup completed successfully!';
  RAISE NOTICE '✅ Infinite recursion issue fixed';
  RAISE NOTICE '✅ Admin user configured: h.herrera@cloou.com';
  RAISE NOTICE '✅ All RLS policies created';
  RAISE NOTICE '✅ All admin functions created';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Login with h.herrera@cloou.com';
  RAISE NOTICE '2. Navigate to /admin';
  RAISE NOTICE '3. Enjoy your admin panel!';
END $$;
