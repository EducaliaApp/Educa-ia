-- Migration: User and Role Management System
-- Adds proper relationship between profiles and roles tables
-- Created: 2025-01-15

-- Step 1: Add role_id column to profiles table (nullable initially)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

-- Step 2: Create index for role_id
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON public.profiles(role_id);

-- Step 3: Create default roles if they don't exist
INSERT INTO public.roles (nombre, codigo, descripcion, permisos, activo)
VALUES 
  (
    'Usuario',
    'user',
    'Usuario estándar con acceso a funcionalidades básicas',
    '["planificaciones.crear", "planificaciones.ver_propias", "planificaciones.editar_propias", "planificaciones.eliminar_propias", "evaluaciones.crear", "evaluaciones.ver_propias", "evaluaciones.eliminar_propias", "portafolios.crear", "portafolios.ver_propios"]'::jsonb,
    true
  ),
  (
    'Administrador',
    'admin',
    'Administrador del sistema con acceso completo',
    '["planificaciones.crear", "planificaciones.ver_propias", "planificaciones.ver_todas", "planificaciones.editar_propias", "planificaciones.editar_todas", "planificaciones.eliminar_propias", "planificaciones.eliminar_todas", "evaluaciones.crear", "evaluaciones.ver_propias", "evaluaciones.ver_todas", "evaluaciones.eliminar_propias", "evaluaciones.eliminar_todas", "portafolios.crear", "portafolios.ver_propios", "portafolios.ver_todos", "usuarios.ver_todos", "usuarios.editar", "usuarios.eliminar", "planes.ver", "planes.crear", "planes.editar", "planes.eliminar", "roles.ver", "roles.crear", "roles.editar", "roles.eliminar", "metricas.ver", "sistema.configurar"]'::jsonb,
    true
  )
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  permisos = EXCLUDED.permisos,
  activo = EXCLUDED.activo,
  updated_at = NOW();

-- Step 4: Migrate existing role data from text to role_id
-- Update profiles with 'user' role to reference the user role UUID
UPDATE public.profiles p
SET role_id = r.id
FROM public.roles r
WHERE r.codigo = 'user'
  AND p.role = 'user'
  AND p.role_id IS NULL;

-- Update profiles with 'admin' role to reference the admin role UUID
UPDATE public.profiles p
SET role_id = r.id
FROM public.roles r
WHERE r.codigo = 'admin'
  AND p.role = 'admin'
  AND p.role_id IS NULL;

-- Step 5: Set default role_id for profiles that don't have one
UPDATE public.profiles p
SET role_id = r.id
FROM public.roles r
WHERE r.codigo = 'user'
  AND p.role_id IS NULL;

-- Step 6: Update the handle_new_user function to assign default role_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
BEGIN
  -- Get the default 'user' role ID
  SELECT id INTO default_role_id
  FROM public.roles
  WHERE codigo = 'user' AND activo = true
  LIMIT 1;

  -- Insert profile with role_id
  -- Note: 'user' is hardcoded as default role code for new registrations
  -- Admin can change role later from admin panel if needed
  INSERT INTO public.profiles (id, email, role, role_id, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'user', default_role_id, NOW(), NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Add comment explaining the dual system
COMMENT ON COLUMN public.profiles.role IS 'Legacy text role field, use role_id for new implementations';
COMMENT ON COLUMN public.profiles.role_id IS 'Foreign key to roles table, preferred method for role management';

-- Step 8: Create view for easy user-role queries
CREATE OR REPLACE VIEW public.profiles_with_roles AS
SELECT 
  p.id,
  p.email,
  p.nombre,
  p.asignatura,
  p.nivel,
  p.plan,
  p.role as role_legacy,
  p.role_id,
  r.codigo as role_codigo,
  r.nombre as role_nombre,
  r.descripcion as role_descripcion,
  r.permisos as role_permisos,
  p.creditos_planificaciones,
  p.creditos_evaluaciones,
  p.creditos_usados_planificaciones,
  p.creditos_usados_evaluaciones,
  p.periodo_actual,
  p.created_at,
  p.updated_at
FROM public.profiles p
LEFT JOIN public.roles r ON p.role_id = r.id;

-- Step 9: Grant appropriate permissions on the view
GRANT SELECT ON public.profiles_with_roles TO authenticated;

-- Step 10: Create RLS policies for roles table (if not exists)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view active roles
DROP POLICY IF EXISTS "Authenticated users can view active roles" ON public.roles;
CREATE POLICY "Authenticated users can view active roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (activo = true);

-- Only admins can manage roles (handled by admin client in API routes)
