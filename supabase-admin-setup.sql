-- ============================================
-- ADMIN PANEL SETUP FOR PROFEFLOW
-- ============================================
-- Execute this script in Supabase SQL Editor
-- Replace [TU_EMAIL] with your actual email
-- ============================================

-- 1. Add role column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
CHECK (role IN ('user', 'admin'));

-- 2. Create index for role column for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 3. Make specific user admin
-- IMPORTANT: Replace [TU_EMAIL] with your actual email
UPDATE profiles
SET role = 'admin'
WHERE email = '[TU_EMAIL]';

-- 4. Drop existing RLS policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Users can insert own planificaciones" ON planificaciones;
DROP POLICY IF EXISTS "Admins can view all planificaciones" ON planificaciones;

-- 5. Create RLS policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 6. Create RLS policies for planificaciones
-- Users can view their own planificaciones
CREATE POLICY "Users can view own planificaciones"
  ON planificaciones FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all planificaciones
CREATE POLICY "Admins can view all planificaciones"
  ON planificaciones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Users can insert their own planificaciones
CREATE POLICY "Users can insert own planificaciones"
  ON planificaciones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can insert any planificaciones
CREATE POLICY "Admins can insert any planificaciones"
  ON planificaciones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 7. Create RLS policies for evaluaciones
DROP POLICY IF EXISTS "Users can view own evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "Users can insert own evaluaciones" ON evaluaciones;
DROP POLICY IF EXISTS "Admins can view all evaluaciones" ON evaluaciones;

CREATE POLICY "Users can view own evaluaciones"
  ON evaluaciones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all evaluaciones"
  ON evaluaciones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert own evaluaciones"
  ON evaluaciones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 8. Create function to get top users by usage
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
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
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

-- 9. Create function to get user statistics
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
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
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

-- 10. Create function to get planificaciones by date range
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
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
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

-- 11. Create function to get planificaciones by subject
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
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
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

-- 12. Create function to get planificaciones by nivel
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
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
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

-- 13. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_top_users(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_planificaciones_by_date(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_planificaciones_by_subject() TO authenticated;
GRANT EXECUTE ON FUNCTION get_planificaciones_by_nivel() TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the setup worked correctly

-- Check if role column was added
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name = 'role';

-- Check if your user is now admin
-- SELECT id, email, nombre, role FROM profiles WHERE role = 'admin';

-- Test the get_user_stats function
-- SELECT * FROM get_user_stats();

-- Test the get_top_users function
-- SELECT * FROM get_top_users(10);
