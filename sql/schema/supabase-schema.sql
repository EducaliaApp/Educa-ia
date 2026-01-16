-- Crear tabla de perfiles (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  nombre TEXT,
  asignatura TEXT,
  nivel TEXT,
  plan TEXT DEFAULT 'free',
  creditos_planificaciones INTEGER DEFAULT 5,
  creditos_evaluaciones INTEGER DEFAULT 3,
  creditos_usados_planificaciones INTEGER DEFAULT 0,
  creditos_usados_evaluaciones INTEGER DEFAULT 0,
  periodo_actual DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de planificaciones
CREATE TABLE IF NOT EXISTS planificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  asignatura TEXT NOT NULL,
  nivel TEXT NOT NULL,
  unidad TEXT NOT NULL,
  duracion_clases INTEGER NOT NULL,
  contenido JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de evaluaciones
CREATE TABLE IF NOT EXISTS evaluaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  archivo_url TEXT,
  tipo TEXT,
  instrucciones TEXT,
  feedback JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE planificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Políticas de RLS para planificaciones
DROP POLICY IF EXISTS "Users can manage own planificaciones" ON planificaciones;
CREATE POLICY "Users can manage own planificaciones"
  ON planificaciones FOR ALL
  USING (auth.uid() = user_id);

-- Políticas de RLS para evaluaciones
DROP POLICY IF EXISTS "Users can manage own evaluaciones" ON evaluaciones;
CREATE POLICY "Users can manage own evaluaciones"
  ON evaluaciones FOR ALL
  USING (auth.uid() = user_id);

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS set_updated_at ON profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON planificaciones;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON planificaciones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_planificaciones_user_id ON planificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_planificaciones_created_at ON planificaciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_user_id ON evaluaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_created_at ON evaluaciones(created_at DESC);
