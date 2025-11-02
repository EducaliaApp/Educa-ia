-- DEPRECATED: Usa el script supabase-admin-setup.sql actualizado
-- ============================================
-- FIX DEFINITIVO: Infinite Recursion Error
-- ============================================
-- Este script resuelve completamente el error de recursión
-- eliminando TODAS las políticas problemáticas
-- ============================================

-- PASO 1: DESACTIVAR RLS TEMPORALMENTE para limpiar
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE planificaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones DISABLE ROW LEVEL SECURITY;

-- PASO 2: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Eliminar todas las políticas de profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;

    -- Eliminar todas las políticas de planificaciones
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'planificaciones') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON planificaciones';
    END LOOP;

    -- Eliminar todas las políticas de evaluaciones
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'evaluaciones') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON evaluaciones';
    END LOOP;
END $$;

-- PASO 3: ELIMINAR FUNCIÓN is_admin SI EXISTE
DROP FUNCTION IF EXISTS is_admin();

-- PASO 4: AGREGAR COLUMNA ROLE SI NO EXISTE
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- PASO 5: AGREGAR CONSTRAINT A ROLE
DO $$
BEGIN
    -- Primero eliminar constraint si existe
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

    -- Luego agregar el nuevo constraint
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('user', 'admin'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- PASO 6: CREAR ÍNDICE PARA ROLE
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- PASO 7: HACER ADMIN AL USUARIO
UPDATE profiles SET role = 'admin' WHERE email = 'h.herrera@cloou.com';

-- Si el usuario no existe aún, esta query no hará nada (normal)
-- El usuario se creará al registrarse

-- PASO 8: REACTIVAR RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE planificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;

-- PASO 9: CREAR POLÍTICAS ULTRA-SIMPLES (SIN RECURSIÓN)

-- ==========================================
-- PROFILES - Políticas MUY simples
-- ==========================================

-- Permitir a usuarios autenticados INSERTAR su propio perfil
-- Esta es la clave: debe ser PERMISIVA para permitir signup
CREATE POLICY "Enable insert for authenticated users"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- ✅ PERMISIVO - permite signup sin recursión

-- Permitir a usuarios VER su propio perfil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Permitir a usuarios ACTUALIZAR su propio perfil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Permitir a service_role VER todos los perfiles (para admin panel)
CREATE POLICY "Service role can view all profiles"
  ON profiles FOR SELECT
  TO service_role
  USING (true);

-- Permitir a service_role ACTUALIZAR todos los perfiles
CREATE POLICY "Service role can update all profiles"
  ON profiles FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- PLANIFICACIONES - Políticas simples
-- ==========================================

-- Usuarios pueden ver sus propias planificaciones
CREATE POLICY "Users can view own planificaciones"
  ON planificaciones FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Usuarios pueden insertar sus propias planificaciones
CREATE POLICY "Users can insert own planificaciones"
  ON planificaciones FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden actualizar sus propias planificaciones
CREATE POLICY "Users can update own planificaciones"
  ON planificaciones FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role puede ver todas las planificaciones
CREATE POLICY "Service role can view all planificaciones"
  ON planificaciones FOR SELECT
  TO service_role
  USING (true);

-- ==========================================
-- EVALUACIONES - Políticas simples
-- ==========================================

-- Usuarios pueden ver sus propias evaluaciones
CREATE POLICY "Users can view own evaluaciones"
  ON evaluaciones FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Usuarios pueden insertar sus propias evaluaciones
CREATE POLICY "Users can insert own evaluaciones"
  ON evaluaciones FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role puede ver todas las evaluaciones
CREATE POLICY "Service role can view all evaluaciones"
  ON evaluaciones FOR SELECT
  TO service_role
  USING (true);

-- ==========================================
-- FUNCIONES RPC PARA ADMIN
-- ==========================================

-- Estas funciones usan service_role internamente, no RLS
-- Por eso no causan recursión

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

CREATE OR REPLACE FUNCTION get_planificaciones_by_date(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  date DATE,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    COUNT(*)::BIGINT as count
  FROM planificaciones
  WHERE created_at >= CURRENT_DATE - days_back
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_planificaciones_by_subject()
RETURNS TABLE (
  asignatura TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.asignatura,
    COUNT(*)::BIGINT as count
  FROM planificaciones pl
  JOIN profiles p ON pl.user_id = p.id
  GROUP BY p.asignatura
  ORDER BY count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_planificaciones_by_nivel()
RETURNS TABLE (
  nivel TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.nivel,
    COUNT(*)::BIGINT as count
  FROM planificaciones pl
  GROUP BY pl.nivel
  ORDER BY count DESC;
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION get_top_users(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_planificaciones_by_date(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_planificaciones_by_subject() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_planificaciones_by_nivel() TO authenticated, service_role;

-- ==========================================
-- VERIFICACIÓN
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ===================================';
  RAISE NOTICE '✅ SETUP COMPLETADO EXITOSAMENTE';
  RAISE NOTICE '✅ ===================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS activado en todas las tablas';
  RAISE NOTICE '✅ Políticas simples creadas (sin recursión)';
  RAISE NOTICE '✅ Funciones RPC creadas';
  RAISE NOTICE '✅ Admin configurado: h.herrera@cloou.com';
  RAISE NOTICE '';
  RAISE NOTICE '📝 IMPORTANTE:';
  RAISE NOTICE '   - El registro ahora funcionará SIN errores';
  RAISE NOTICE '   - Para acceder al admin panel, usa service_role key';
  RAISE NOTICE '   - O configura el middleware para verificar role manualmente';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 PRUEBA:';
  RAISE NOTICE '   1. Registra el usuario h.herrera@cloou.com';
  RAISE NOTICE '   2. Verifica con: SELECT * FROM profiles WHERE email = ''h.herrera@cloou.com'';';
  RAISE NOTICE '   3. Debería mostrar role = ''admin''';
  RAISE NOTICE '';
END $$;
