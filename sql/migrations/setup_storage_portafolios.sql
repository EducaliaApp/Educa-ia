-- Crear bucket de storage para portafolios
-- Ejecutar en Supabase SQL Editor

-- 1. Crear bucket público para portafolios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portafolios',
  'portafolios',
  true, -- Público para que los URLs sean accesibles
  2147483648, -- 2GB en bytes
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de acceso al bucket
-- Los profesores pueden subir archivos a su propia carpeta
CREATE POLICY "Profesores pueden subir a su carpeta"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'portafolios' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Los profesores pueden ver sus propios archivos
CREATE POLICY "Profesores pueden ver sus archivos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'portafolios' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Admins pueden ver todos
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- Los profesores pueden eliminar sus propios archivos
CREATE POLICY "Profesores pueden eliminar sus archivos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'portafolios' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Los profesores pueden actualizar sus propios archivos
CREATE POLICY "Profesores pueden actualizar sus archivos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'portafolios' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Agregar columnas faltantes a portafolios (si no existen)
ALTER TABLE portafolios
  ADD COLUMN IF NOT EXISTS completado_at TIMESTAMPTZ;

-- 4. Índice para submitted_at
CREATE INDEX IF NOT EXISTS idx_portafolios_submitted_at
  ON portafolios(submitted_at)
  WHERE submitted_at IS NOT NULL;

-- 5. Agregar columna tipo_modulo si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modulos_portafolio' AND column_name = 'tipo_modulo'
  ) THEN
    ALTER TABLE modulos_portafolio
      ADD COLUMN tipo_modulo TEXT;
  END IF;
END $$;

-- 6. Actualizar tipo_modulo para módulos existentes
UPDATE modulos_portafolio
SET tipo_modulo = CASE
  WHEN numero_modulo = 1 THEN 'planificacion'
  WHEN numero_modulo = 2 THEN 'clase_grabada'
  WHEN numero_modulo = 3 THEN 'trabajo_colaborativo'
  ELSE 'modulo_generico'
END
WHERE tipo_modulo IS NULL OR tipo_modulo = '';

-- 7. Comentarios descriptivos
COMMENT ON TABLE portafolios IS 'Portafolios docentes para evaluación MINEDUC';
COMMENT ON COLUMN portafolios.estado IS 'Estado del portafolio: borrador, en_revision, completado, enviado';
COMMENT ON COLUMN portafolios.submitted_at IS 'Fecha en que fue enviado al MINEDUC (bloqueado para edición)';
COMMENT ON COLUMN portafolios.completado_at IS 'Fecha en que se marcó como completado';

COMMENT ON TABLE modulos_portafolio IS 'Módulos 1, 2 y 3 del portafolio docente';
COMMENT ON COLUMN modulos_portafolio.tipo_modulo IS 'Tipo: planificacion, clase_grabada, trabajo_colaborativo';

COMMENT ON TABLE tareas_portafolio IS 'Tareas individuales dentro de cada módulo';
COMMENT ON COLUMN tareas_portafolio.contenido IS 'JSONB con el contenido completo de la tarea';

COMMENT ON TABLE videos_clase IS 'Videos de clase grabada (Módulo 2)';
COMMENT ON TABLE analisis_ia_portafolio IS 'Análisis con IA de cada tarea del portafolio';
