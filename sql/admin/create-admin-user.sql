-- ============================================
-- CREAR USUARIO ADMINISTRADOR INICIAL
-- ============================================
-- Este script crea un usuario administrador inicial
-- con credenciales predefinidas para acceso al panel admin
-- ============================================

-- 1. Insertar usuario en auth.users (usando service_role)
-- NOTA: Este INSERT debe ejecutarse con privilegios de service_role
-- o desde el dashboard de Supabase con permisos de administrador

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@educalia.cl',
  crypt('Admin2024!ProfeFlow', gen_salt('bf')), -- Contraseña: Admin2024!ProfeFlow
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider": "email", "providers": ["email"]}',
  '{"nombre": "Administrador", "asignatura": "Administración"}',
  false,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL
) ON CONFLICT (email) DO NOTHING;

-- 2. Obtener el ID del usuario recién creado
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Obtener el ID del usuario admin
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@educalia.cl';
  
  -- Si el usuario existe, crear/actualizar su perfil
  IF admin_user_id IS NOT NULL THEN
    -- Insertar o actualizar perfil en la tabla profiles
    INSERT INTO public.profiles (
      id,
      nombre,
      email,
      asignatura,
      nivel,
      establecimiento,
      plan,
      role,
      creditos_planificaciones,
      creditos_evaluaciones,
      creditos_usados_planificaciones,
      creditos_usados_evaluaciones,
      created_at,
      updated_at
    ) VALUES (
      admin_user_id,
      'Administrador ProfeFlow',
      'admin@educalia.cl',
      'Administración',
      'Todos los niveles',
      'ProfeFlow - Administración',
      'pro',
      'admin',
      999999, -- Créditos ilimitados
      999999, -- Créditos ilimitados
      0,
      0,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      email = EXCLUDED.email,
      asignatura = EXCLUDED.asignatura,
      nivel = EXCLUDED.nivel,
      establecimiento = EXCLUDED.establecimiento,
      plan = EXCLUDED.plan,
      role = EXCLUDED.role,
      creditos_planificaciones = EXCLUDED.creditos_planificaciones,
      creditos_evaluaciones = EXCLUDED.creditos_evaluaciones,
      updated_at = NOW();
    
    RAISE NOTICE '✅ Usuario administrador creado exitosamente';
    RAISE NOTICE '📧 Email: admin@educalia.cl';
    RAISE NOTICE '🔑 Contraseña: Admin2024!ProfeFlow';
    RAISE NOTICE '🆔 ID: %', admin_user_id;
  ELSE
    RAISE NOTICE '❌ Error: No se pudo crear el usuario administrador';
  END IF;
END $$;

-- 3. Verificar que el usuario fue creado correctamente
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  p.nombre,
  p.role,
  p.plan,
  p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'admin@educalia.cl';