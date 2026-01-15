-- ============================================
-- VERIFICACIÓN: Comprobar si las rúbricas se insertaron
-- ============================================

-- 1. Contar rúbricas en total
SELECT
  COUNT(*) as total_rubricas_en_tabla
FROM rubricas_mbe;

-- 2. Verificar rúbricas de Matemática Básica 1-6
SELECT
  COUNT(*) as rubricas_matematica,
  array_agg(indicador_id ORDER BY indicador_id) as indicadores,
  array_agg(nombre_estandar ORDER BY indicador_id) as nombres
FROM rubricas_mbe
WHERE asignatura = 'Matemática'
  AND nivel_educativo = 'basica_1_6'
  AND año_vigencia = 2025;

-- 3. Detalle completo de las rúbricas
SELECT
  indicador_id,
  nombre_indicador,
  dominio,
  estandar_numero,
  nombre_estandar,
  LEFT(descripcion_estandar, 60) as descripcion_corta,
  created_at
FROM rubricas_mbe
WHERE asignatura = 'Matemática'
  AND nivel_educativo = 'basica_1_6'
  AND año_vigencia = 2025
ORDER BY indicador_id;

-- 4. Verificar estructura de niveles
SELECT
  indicador_id,
  nivel_insatisfactorio->>'descripcion' as nivel_insatisfactorio,
  nivel_basico->>'descripcion' as nivel_basico,
  nivel_competente->>'descripcion' as nivel_competente,
  nivel_destacado->>'descripcion' as nivel_destacado
FROM rubricas_mbe
WHERE asignatura = 'Matemática'
  AND nivel_educativo = 'basica_1_6'
  AND año_vigencia = 2025
ORDER BY indicador_id;
