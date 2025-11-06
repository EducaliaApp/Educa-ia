-- ============================================
-- PASO 4 (OPCIONAL): Seed de rúbricas MBE de ejemplo (CORREGIDO)
-- Inserta 2 rúbricas de ejemplo para Matemática Básica 1-6
-- ============================================

-- Primero, eliminar rúbricas de ejemplo si ya existen
DELETE FROM rubricas_mbe
WHERE asignatura = 'Matemática'
  AND nivel_educativo = 'basica_1_6'
  AND año_vigencia = 2025
  AND modalidad = 'regular'
  AND indicador_id IN ('A.1', 'A.2');

-- Insertar rúbrica 1: Conoce a los estudiantes y sabe cómo aprenden
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
) VALUES (
  'Matemática',
  'basica_1_6',
  2025,
  'regular',
  'A',
  1,
  'Conoce a los estudiantes y sabe cómo aprenden',
  'El profesor conoce las características de desarrollo de sus estudiantes y sus procesos de aprendizaje',
  'A.1',
  'Conocimiento del desarrollo estudiantil',
  'El docente conoce características cognitivas, sociales y emocionales de sus estudiantes',
  '["Planificación de clases", "Actividades de aprendizaje", "Estrategias de diferenciación"]'::jsonb,
  '{
    "descripcion": "Demuestra conocimiento limitado o inexacto de las características de sus estudiantes",
    "condiciones": ["No considera características individuales", "Actividades uniformes sin adaptación"]
  }'::jsonb,
  '{
    "descripcion": "Demuestra conocimiento general de las características de sus estudiantes pero no siempre las considera",
    "condiciones": ["Considera algunas características generales", "Adaptaciones ocasionales"]
  }'::jsonb,
  '{
    "descripcion": "Demuestra conocimiento adecuado de las características de sus estudiantes y las considera en su planificación",
    "condiciones": ["Considera características en planificación", "Estrategias diferenciadas regulares"]
  }'::jsonb,
  '{
    "descripcion": "Demuestra un conocimiento profundo y preciso de las características de sus estudiantes y las utiliza sistemáticamente",
    "condiciones": ["Conocimiento profundo de cada estudiante", "Adaptación sistemática de enseñanza", "Anticipación de necesidades"]
  }'::jsonb,
  '["Observar evidencia en planificación y ejecución de clases", "Considerar diversidad del curso"]'::jsonb,
  '["Menciona características específicas de los estudiantes", "Adapta actividades según necesidades", "Diferencia estrategias de enseñanza"]'::jsonb,
  1.0,
  'Estándar A.1: Conoce a los estudiantes y sabe cómo aprenden.
El profesor conoce las características de desarrollo cognitivo, social y emocional de sus estudiantes y comprende cómo estas características influyen en su aprendizaje.
Criterio A.1.1: Demuestra conocimiento de las características de sus estudiantes.
Criterio A.1.2: Utiliza este conocimiento para diseñar experiencias de aprendizaje apropiadas.'
);

-- Insertar rúbrica 2: Está preparado para enseñar
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
) VALUES (
  'Matemática',
  'basica_1_6',
  2025,
  'regular',
  'A',
  2,
  'Está preparado para enseñar',
  'El profesor domina los contenidos de su disciplina y comprende cómo enseñarlos',
  'A.2',
  'Dominio disciplinar y didáctico',
  'El docente domina contenidos matemáticos y conoce estrategias efectivas para enseñarlos',
  '["Planificación de unidades", "Explicaciones en clase", "Selección de actividades", "Manejo de errores conceptuales"]'::jsonb,
  '{
    "descripcion": "Demuestra conocimiento insuficiente de contenidos o estrategias didácticas",
    "condiciones": ["Errores conceptuales frecuentes", "Estrategias inadecuadas o inexistentes"]
  }'::jsonb,
  '{
    "descripcion": "Demuestra conocimiento básico de contenidos pero conocimiento didáctico limitado",
    "condiciones": ["Conocimiento básico de contenidos", "Estrategias didácticas limitadas", "Dificultad para conectar contenidos"]
  }'::jsonb,
  '{
    "descripcion": "Demuestra dominio adecuado de contenidos y conoce estrategias didácticas apropiadas",
    "condiciones": ["Dominio de contenidos del nivel", "Usa estrategias didácticas apropiadas", "Identifica algunos errores comunes"]
  }'::jsonb,
  '{
    "descripcion": "Demuestra dominio profundo de contenidos y didáctica matemática, identificando conexiones y anticipando dificultades",
    "condiciones": ["Dominio profundo de contenidos", "Conecta contenidos entre sí", "Anticipa dificultades comunes", "Usa estrategias didácticas variadas y efectivas"]
  }'::jsonb,
  '["Evaluar exactitud de contenidos matemáticos", "Observar calidad de explicaciones", "Analizar selección de actividades"]'::jsonb,
  '["Explica conceptos matemáticos correctamente", "Usa representaciones múltiples", "Identifica y corrige errores conceptuales", "Selecciona ejemplos apropiados"]'::jsonb,
  1.0,
  'Estándar A.2: Está preparado para enseñar.
El profesor domina los contenidos matemáticos que enseña y comprende cómo enseñarlos efectivamente.
Criterio A.2.1: Domina los contenidos matemáticos que enseña.
Criterio A.2.2: Conoce estrategias didácticas apropiadas para la enseñanza de matemática.'
);

-- Verificar inserción
SELECT
  'Rúbricas insertadas' as resultado,
  COUNT(*) as total,
  array_agg(nombre_estandar) as nombres
FROM rubricas_mbe
WHERE asignatura = 'Matemática'
  AND nivel_educativo = 'basica_1_6'
  AND año_vigencia = 2025;

-- Mostrar detalle de las rúbricas insertadas
SELECT
  indicador_id,
  nombre_indicador,
  dominio,
  estandar_numero,
  nombre_estandar
FROM rubricas_mbe
WHERE asignatura = 'Matemática'
  AND nivel_educativo = 'basica_1_6'
  AND año_vigencia = 2025
ORDER BY indicador_id;
