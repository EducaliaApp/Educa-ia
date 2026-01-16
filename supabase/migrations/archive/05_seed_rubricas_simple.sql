-- ============================================
-- SEED SIMPLIFICADO: Rúbricas MBE de Ejemplo
-- Script ultra-simple sin DELETE previo
-- ============================================

-- Desactivar temporalmente RLS para garantizar inserción
ALTER TABLE rubricas_mbe DISABLE ROW LEVEL SECURITY;

-- Insertar Rúbrica A.1
INSERT INTO rubricas_mbe (
  asignatura,
  nivel_educativo,
  año_vigencia,
  modalidad,
  dominio,
  estandar_numero,
  nombre_estandar,
  descripcion_estandar,
  indicador_id,
  nombre_indicador,
  descripcion_indicador,
  evidencia_revisar,
  nivel_insatisfactorio,
  nivel_basico,
  nivel_competente,
  nivel_destacado,
  notas_aclaratorias,
  condiciones_verificables,
  peso_ponderacion,
  contenido_texto
)
SELECT
  'Matemática',
  'basica_1_6'::nivel_educativo,
  2025,
  'regular',
  'A'::dominio_mbe,
  1,
  'Conoce a los estudiantes y sabe cómo aprenden',
  'El profesor conoce las características de desarrollo de sus estudiantes y sus procesos de aprendizaje',
  'A.1',
  'Conocimiento del desarrollo estudiantil',
  'El docente conoce características cognitivas, sociales y emocionales de sus estudiantes',
  '["Planificación de clases", "Actividades de aprendizaje", "Estrategias de diferenciación"]'::jsonb,
  '{"descripcion": "Demuestra conocimiento limitado", "condiciones": ["No considera características individuales"]}'::jsonb,
  '{"descripcion": "Demuestra conocimiento general", "condiciones": ["Considera algunas características"]}'::jsonb,
  '{"descripcion": "Demuestra conocimiento adecuado", "condiciones": ["Considera características en planificación"]}'::jsonb,
  '{"descripcion": "Demuestra conocimiento profundo", "condiciones": ["Conocimiento profundo de cada estudiante"]}'::jsonb,
  '["Observar evidencia en planificación"]'::jsonb,
  '["Menciona características específicas", "Adapta actividades"]'::jsonb,
  1.0,
  'Estándar A.1: Conoce a los estudiantes y sabe cómo aprenden.'
WHERE NOT EXISTS (
  SELECT 1 FROM rubricas_mbe
  WHERE indicador_id = 'A.1'
    AND nivel_educativo = 'basica_1_6'
    AND año_vigencia = 2025
    AND modalidad = 'regular'
);

-- Insertar Rúbrica A.2
INSERT INTO rubricas_mbe (
  asignatura,
  nivel_educativo,
  año_vigencia,
  modalidad,
  dominio,
  estandar_numero,
  nombre_estandar,
  descripcion_estandar,
  indicador_id,
  nombre_indicador,
  descripcion_indicador,
  evidencia_revisar,
  nivel_insatisfactorio,
  nivel_basico,
  nivel_competente,
  nivel_destacado,
  notas_aclaratorias,
  condiciones_verificables,
  peso_ponderacion,
  contenido_texto
)
SELECT
  'Matemática',
  'basica_1_6'::nivel_educativo,
  2025,
  'regular',
  'A'::dominio_mbe,
  2,
  'Está preparado para enseñar',
  'El profesor domina los contenidos de su disciplina y comprende cómo enseñarlos',
  'A.2',
  'Dominio disciplinar y didáctico',
  'El docente domina contenidos matemáticos y conoce estrategias efectivas',
  '["Planificación de unidades", "Explicaciones en clase"]'::jsonb,
  '{"descripcion": "Demuestra conocimiento insuficiente", "condiciones": ["Errores conceptuales frecuentes"]}'::jsonb,
  '{"descripcion": "Demuestra conocimiento básico", "condiciones": ["Conocimiento básico de contenidos"]}'::jsonb,
  '{"descripcion": "Demuestra dominio adecuado", "condiciones": ["Dominio de contenidos del nivel"]}'::jsonb,
  '{"descripcion": "Demuestra dominio profundo", "condiciones": ["Dominio profundo de contenidos"]}'::jsonb,
  '["Evaluar exactitud de contenidos"]'::jsonb,
  '["Explica conceptos correctamente", "Usa representaciones múltiples"]'::jsonb,
  1.0,
  'Estándar A.2: Está preparado para enseñar.'
WHERE NOT EXISTS (
  SELECT 1 FROM rubricas_mbe
  WHERE indicador_id = 'A.2'
    AND nivel_educativo = 'basica_1_6'
    AND año_vigencia = 2025
    AND modalidad = 'regular'
);

-- Reactivar RLS
ALTER TABLE rubricas_mbe ENABLE ROW LEVEL SECURITY;

-- VERIFICACIÓN INMEDIATA
SELECT
  '✅ SEED COMPLETADO' as status,
  COUNT(*) as rubricas_insertadas
FROM rubricas_mbe
WHERE asignatura = 'Matemática'
  AND nivel_educativo = 'basica_1_6'
  AND año_vigencia = 2025;

-- Mostrar detalles
SELECT
  indicador_id,
  nombre_indicador,
  nombre_estandar
FROM rubricas_mbe
WHERE asignatura = 'Matemática'
  AND nivel_educativo = 'basica_1_6'
  AND año_vigencia = 2025
ORDER BY indicador_id;
