-- ============================================
-- SOLUCIÓN: Habilitar inserciones en rubricas_mbe
-- Ejecuta esto ANTES del seed
-- ============================================

-- Verificar políticas actuales
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'rubricas_mbe';

-- Agregar política para permitir inserciones con service_role
DROP POLICY IF EXISTS "Service role puede insertar rubricas" ON rubricas_mbe;

CREATE POLICY "Service role puede insertar rubricas"
  ON rubricas_mbe FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

DROP POLICY IF EXISTS "Service role puede actualizar rubricas" ON rubricas_mbe;

CREATE POLICY "Service role puede actualizar rubricas"
  ON rubricas_mbe FOR UPDATE
  USING (true);

-- Verificar que las políticas se crearon
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'rubricas_mbe'
ORDER BY cmd, policyname;
