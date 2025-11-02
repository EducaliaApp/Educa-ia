-- ============================================
-- SOLUCIÓN FINAL: Infinite Recursion Error
-- ============================================
-- Ejecuta ESTE script para resolver el error definitivamente
-- ============================================

-- PASO 1: Desactivar RLS temporalmente
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE planificaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones DISABLE ROW LEVEL SECURITY;

-- PASO 2: Eliminar TODAS las políticas
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename IN ('profiles', 'planificaciones', 'evaluaciones')) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename;
    END LOOP;
END $$;

-- PASO 3: Agregar columna role
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

DO $$
BEGIN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- PASO 4: Hacer admin al usuario
UPDATE profiles SET role = 'admin' WHERE email = 'h.herrera@cloou.com';

-- PASO 5: Reactivar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE planificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;

-- PASO 6: Crear políticas MUY SIMPLES

-- ============================================
-- PROFILES - Sin recursión
-- ============================================

-- INSERT: Permitir TODO (necesario para trigger de signup)
CREATE POLICY "allow_insert" ON profiles FOR INSERT WITH CHECK (true);

-- SELECT: Ver propio perfil O ser service_role
CREATE POLICY "allow_select" ON profiles FOR SELECT
  USING (auth.uid() = id OR current_setting('role') = 'service_role');

-- UPDATE: Actualizar propio perfil O ser service_role
CREATE POLICY "allow_update" ON profiles FOR UPDATE
  USING (auth.uid() = id OR current_setting('role') = 'service_role');

-- ============================================
-- PLANIFICACIONES - Sin recursión
-- ============================================

CREATE POLICY "plan_select" ON planificaciones FOR SELECT
  USING (auth.uid() = user_id OR current_setting('role') = 'service_role');

CREATE POLICY "plan_insert" ON planificaciones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plan_update" ON planificaciones FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- EVALUACIONES - Sin recursión
-- ============================================

CREATE POLICY "eval_select" ON evaluaciones FOR SELECT
  USING (auth.uid() = user_id OR current_setting('role') = 'service_role');

CREATE POLICY "eval_insert" ON evaluaciones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCIONES RPC (usan SECURITY DEFINER)
-- ============================================

CREATE OR REPLACE FUNCTION get_top_users(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (user_id UUID, nombre TEXT, email TEXT, plan TEXT, asignatura TEXT, total_planificaciones BIGINT, total_evaluaciones BIGINT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.nombre, p.email, p.plan, p.asignatura,
    COUNT(DISTINCT pl.id) as total_planificaciones,
    COUNT(DISTINCT e.id) as total_evaluaciones,
    p.created_at
  FROM profiles p
  LEFT JOIN planificaciones pl ON p.id = pl.user_id
  LEFT JOIN evaluaciones e ON p.id = e.user_id
  GROUP BY p.id
  ORDER BY total_planificaciones DESC
  LIMIT limit_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE (total_users BIGINT, free_users BIGINT, pro_users BIGINT, conversion_rate NUMERIC, mrr_clp NUMERIC, planificaciones_today BIGINT, active_users_7d BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE plan = 'free')::BIGINT,
    COUNT(*) FILTER (WHERE plan = 'pro')::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE plan = 'pro')::NUMERIC / COUNT(*)::NUMERIC * 100), 2) ELSE 0 END,
    (COUNT(*) FILTER (WHERE plan = 'pro') * 6990)::NUMERIC,
    (SELECT COUNT(*)::BIGINT FROM planificaciones WHERE DATE(created_at) = CURRENT_DATE),
    (SELECT COUNT(DISTINCT user_id)::BIGINT FROM planificaciones WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')
  FROM profiles;
END;
$$;

CREATE OR REPLACE FUNCTION get_planificaciones_by_date(days_back INTEGER DEFAULT 7)
RETURNS TABLE (date DATE, count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DATE(created_at), COUNT(*)::BIGINT
  FROM planificaciones
  WHERE created_at >= CURRENT_DATE - days_back
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_planificaciones_by_subject()
RETURNS TABLE (asignatura TEXT, count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.asignatura, COUNT(*)::BIGINT
  FROM planificaciones pl
  JOIN profiles p ON pl.user_id = p.id
  GROUP BY p.asignatura
  ORDER BY count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_planificaciones_by_nivel()
RETURNS TABLE (nivel TEXT, count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pl.nivel, COUNT(*)::BIGINT
  FROM planificaciones pl
  GROUP BY pl.nivel
  ORDER BY count DESC;
END;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT
  'Setup completed!' as status,
  (SELECT COUNT(*) FROM profiles WHERE role = 'admin') as admin_count,
  (SELECT email FROM profiles WHERE role = 'admin' LIMIT 1) as admin_email;
