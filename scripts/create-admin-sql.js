#!/usr/bin/env node

/**
 * Script alternativo para generar SQL de creación de admin
 * Ejecutar con: node scripts/create-admin-sql.js
 */

console.log('🔧 Generando SQL para crear usuario administrador...\n')

const adminEmail = 'admin@educalia.cl'
const adminPassword = 'Admin2024!ProfeFlow'

console.log('📝 Ejecuta el siguiente SQL en el SQL Editor de Supabase:\n')
console.log('-- ============================================')
console.log('-- CREAR USUARIO ADMINISTRADOR')
console.log('-- ============================================\n')

console.log('-- 1. Crear usuario en auth.users')
console.log(`INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  '${adminEmail}',
  crypt('${adminPassword}', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"nombre": "Administrador ProfeFlow"}',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;`)

console.log('\n-- 2. Crear perfil de administrador')
console.log(`DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = '${adminEmail}';
  
  IF admin_user_id IS NOT NULL THEN
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
      '${adminEmail}',
      'Administración',
      'Todos los niveles',
      'ProfeFlow - Administración',
      'pro',
      'admin',
      999999,
      999999,
      0,
      0,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      plan = 'pro',
      creditos_planificaciones = 999999,
      creditos_evaluaciones = 999999,
      updated_at = NOW();
    
    RAISE NOTICE '✅ Usuario administrador creado/actualizado';
    RAISE NOTICE '📧 Email: ${adminEmail}';
    RAISE NOTICE '🔑 Contraseña: ${adminPassword}';
  ELSE
    RAISE NOTICE '❌ Error: No se pudo crear el usuario';
  END IF;
END $$;`)

console.log('\n-- 3. Verificar creación')
console.log(`SELECT 
  u.email,
  p.nombre,
  p.role,
  p.plan,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email = '${adminEmail}';`)

console.log('\n-- ============================================')
console.log('-- CREDENCIALES DEL ADMINISTRADOR')
console.log('-- ============================================')
console.log(`📧 Email: ${adminEmail}`)
console.log(`🔑 Contraseña: ${adminPassword}`)
console.log('🌐 URL Admin: /admin')
console.log('\n✅ Después de ejecutar el SQL, podrás acceder al panel admin')