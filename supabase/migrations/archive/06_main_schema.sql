-- ============================================
-- MIGRATION 06: Main Schema (Core Tables)
-- ============================================

-- Add role column to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
        RAISE NOTICE 'Added role column to profiles';
    END IF;
END $$;

-- Update existing RLS policies to include admin access
DROP POLICY IF EXISTS "Administradores pueden ver todos los perfiles" ON profiles;
CREATE POLICY "Administradores pueden ver todos los perfiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Administradores pueden actualizar perfiles" ON profiles;
CREATE POLICY "Administradores pueden actualizar perfiles"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Admin policies for planificaciones
DROP POLICY IF EXISTS "Administradores pueden ver todas las planificaciones" ON planificaciones;
CREATE POLICY "Administradores pueden ver todas las planificaciones"
  ON planificaciones FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Admin policies for evaluaciones
DROP POLICY IF EXISTS "Administradores pueden ver todas las evaluaciones" ON evaluaciones;
CREATE POLICY "Administradores pueden ver todas las evaluaciones"
  ON evaluaciones FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Verification
SELECT 'Main schema migration completed' as status;