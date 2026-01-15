-- ============================================
-- MIGRATION: Admin Maintainers (Plans, Limits, Roles)
-- Date: 2025-01-15
-- ============================================

-- ============================================
-- 1. TABLA DE PLANES
-- ============================================
CREATE TABLE IF NOT EXISTS planes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  codigo TEXT NOT NULL UNIQUE, -- 'free', 'pro', 'enterprise', etc
  descripcion TEXT,
  precio_mensual_clp INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  caracteristicas JSONB DEFAULT '[]'::jsonb, -- Array de características del plan
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. TABLA DE LÍMITES POR PLAN
-- ============================================
CREATE TABLE IF NOT EXISTS planes_limites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES planes(id) ON DELETE CASCADE NOT NULL,
  creditos_planificaciones INTEGER NOT NULL DEFAULT 0,
  creditos_evaluaciones INTEGER NOT NULL DEFAULT 0,
  analisis_portafolio BOOLEAN DEFAULT false,
  exportar_pdf BOOLEAN DEFAULT false,
  soporte_prioritario BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id)
);

-- ============================================
-- 3. TABLA DE ROLES
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  codigo TEXT NOT NULL UNIQUE, -- 'user', 'admin', 'superadmin', etc
  descripcion TEXT,
  permisos JSONB DEFAULT '[]'::jsonb, -- Array de permisos: ['usuarios.ver', 'planes.editar', etc]
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. INSERTAR PLANES POR DEFECTO
-- ============================================
INSERT INTO planes (nombre, codigo, descripcion, precio_mensual_clp, activo, caracteristicas)
VALUES 
  (
    'Plan Gratuito', 
    'free', 
    'Plan básico para profesores que recién comienzan',
    0,
    true,
    '[
      "5 planificaciones al mes",
      "3 evaluaciones al mes",
      "Acceso a plantillas básicas",
      "Soporte por email"
    ]'::jsonb
  ),
  (
    'Plan Pro', 
    'pro', 
    'Plan profesional con todas las funcionalidades',
    6990,
    true,
    '[
      "Planificaciones ilimitadas",
      "Evaluaciones ilimitadas",
      "Análisis de portafolio completo",
      "Exportar a PDF sin marca de agua",
      "Soporte prioritario",
      "Acceso anticipado a nuevas funciones"
    ]'::jsonb
  )
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- 5. INSERTAR LÍMITES DE PLANES
-- ============================================
INSERT INTO planes_limites (plan_id, creditos_planificaciones, creditos_evaluaciones, analisis_portafolio, exportar_pdf, soporte_prioritario)
SELECT 
  id,
  CASE 
    WHEN codigo = 'free' THEN 5
    WHEN codigo = 'pro' THEN 999999
    ELSE 10
  END,
  CASE 
    WHEN codigo = 'free' THEN 3
    WHEN codigo = 'pro' THEN 999999
    ELSE 5
  END,
  CASE WHEN codigo = 'pro' THEN true ELSE false END,
  CASE WHEN codigo = 'pro' THEN true ELSE false END,
  CASE WHEN codigo = 'pro' THEN true ELSE false END
FROM planes
ON CONFLICT (plan_id) DO NOTHING;

-- ============================================
-- 6. INSERTAR ROLES POR DEFECTO
-- ============================================
INSERT INTO roles (nombre, codigo, descripcion, permisos, activo)
VALUES 
  (
    'Usuario',
    'user',
    'Usuario estándar del sistema',
    '[
      "planificaciones.crear",
      "planificaciones.ver_propias",
      "planificaciones.editar_propias",
      "planificaciones.eliminar_propias",
      "evaluaciones.crear",
      "evaluaciones.ver_propias",
      "portafolios.crear",
      "portafolios.ver_propios"
    ]'::jsonb,
    true
  ),
  (
    'Administrador',
    'admin',
    'Administrador con acceso completo al panel admin',
    '[
      "usuarios.ver_todos",
      "usuarios.editar",
      "usuarios.eliminar",
      "planificaciones.ver_todas",
      "planificaciones.eliminar_todas",
      "evaluaciones.ver_todas",
      "evaluaciones.eliminar_todas",
      "portafolios.ver_todos",
      "planes.ver",
      "planes.crear",
      "planes.editar",
      "planes.eliminar",
      "roles.ver",
      "roles.crear",
      "roles.editar",
      "roles.eliminar",
      "metricas.ver",
      "sistema.configurar"
    ]'::jsonb,
    true
  )
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- 7. HABILITAR RLS
-- ============================================
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes_limites ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. POLÍTICAS RLS PARA PLANES
-- ============================================
-- Todos pueden ver planes activos
DROP POLICY IF EXISTS "Usuarios pueden ver planes activos" ON planes;
CREATE POLICY "Usuarios pueden ver planes activos"
  ON planes FOR SELECT
  USING (activo = true OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Solo admins pueden modificar planes
DROP POLICY IF EXISTS "Solo admins pueden gestionar planes" ON planes;
CREATE POLICY "Solo admins pueden gestionar planes"
  ON planes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- ============================================
-- 9. POLÍTICAS RLS PARA PLANES_LIMITES
-- ============================================
-- Usuarios pueden ver límites de planes activos
DROP POLICY IF EXISTS "Usuarios pueden ver limites de planes" ON planes_limites;
CREATE POLICY "Usuarios pueden ver limites de planes"
  ON planes_limites FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM planes 
    WHERE planes.id = planes_limites.plan_id 
    AND (planes.activo = true OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    ))
  ));

-- Solo admins pueden modificar límites
DROP POLICY IF EXISTS "Solo admins pueden gestionar limites" ON planes_limites;
CREATE POLICY "Solo admins pueden gestionar limites"
  ON planes_limites FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- ============================================
-- 10. POLÍTICAS RLS PARA ROLES
-- ============================================
-- Todos pueden ver su propio rol
DROP POLICY IF EXISTS "Usuarios pueden ver roles" ON roles;
CREATE POLICY "Usuarios pueden ver roles"
  ON roles FOR SELECT
  USING (activo = true OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Solo admins pueden gestionar roles
DROP POLICY IF EXISTS "Solo admins pueden gestionar roles" ON roles;
CREATE POLICY "Solo admins pueden gestionar roles"
  ON roles FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- ============================================
-- 11. TRIGGERS PARA UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS set_updated_at_planes ON planes;
CREATE TRIGGER set_updated_at_planes
  BEFORE UPDATE ON planes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_planes_limites ON planes_limites;
CREATE TRIGGER set_updated_at_planes_limites
  BEFORE UPDATE ON planes_limites
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_roles ON roles;
CREATE TRIGGER set_updated_at_roles
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 12. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_planes_codigo ON planes(codigo);
CREATE INDEX IF NOT EXISTS idx_planes_activo ON planes(activo);
CREATE INDEX IF NOT EXISTS idx_planes_limites_plan_id ON planes_limites(plan_id);
CREATE INDEX IF NOT EXISTS idx_roles_codigo ON roles(codigo);
CREATE INDEX IF NOT EXISTS idx_roles_activo ON roles(activo);

-- ============================================
-- 13. FUNCIONES AUXILIARES
-- ============================================

-- Función para obtener límites de un plan por código
CREATE OR REPLACE FUNCTION get_plan_limites(plan_codigo TEXT)
RETURNS TABLE (
  creditos_planificaciones INTEGER,
  creditos_evaluaciones INTEGER,
  analisis_portafolio BOOLEAN,
  exportar_pdf BOOLEAN,
  soporte_prioritario BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pl.creditos_planificaciones,
    pl.creditos_evaluaciones,
    pl.analisis_portafolio,
    pl.exportar_pdf,
    pl.soporte_prioritario
  FROM planes_limites pl
  JOIN planes p ON p.id = pl.plan_id
  WHERE p.codigo = plan_codigo AND p.activo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar plan de usuario
CREATE OR REPLACE FUNCTION actualizar_plan_usuario(
  usuario_id UUID,
  nuevo_plan_codigo TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  plan_existe BOOLEAN;
  nuevos_creditos_plan INTEGER;
  nuevos_creditos_eval INTEGER;
BEGIN
  -- Verificar que el plan existe y está activo
  SELECT EXISTS(SELECT 1 FROM planes WHERE codigo = nuevo_plan_codigo AND activo = true)
  INTO plan_existe;
  
  IF NOT plan_existe THEN
    RAISE EXCEPTION 'El plan % no existe o no está activo', nuevo_plan_codigo;
  END IF;
  
  -- Obtener límites del nuevo plan
  SELECT creditos_planificaciones, creditos_evaluaciones
  INTO nuevos_creditos_plan, nuevos_creditos_eval
  FROM get_plan_limites(nuevo_plan_codigo);
  
  -- Actualizar perfil del usuario
  UPDATE profiles
  SET 
    plan = nuevo_plan_codigo,
    creditos_planificaciones = nuevos_creditos_plan,
    creditos_evaluaciones = nuevos_creditos_eval,
    updated_at = NOW()
  WHERE id = usuario_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 'Admin maintainers migration completed successfully' as status;
SELECT COUNT(*) as planes_count FROM planes;
SELECT COUNT(*) as roles_count FROM roles;
