-- Seed: Rúbricas MBE 2025 - Módulo 1
-- Descripción: Datos oficiales de rúbricas del Módulo 1 del Marco para la Buena Enseñanza
-- Autor: ProfeFlow
-- Fecha: 2025-01-07

-- Insertar rúbrica M1_I1: Identifica el aprendizaje que espera que sus estudiantes logren
INSERT INTO rubricas_mbe (
  indicador_id,
  nombre_indicador,
  descripcion_general,
  año_vigencia,
  nivel_educativo,
  asignatura,
  modalidad,
  modulo,
  tarea,
  peso_porcentaje,
  niveles_desempeno,
  fuente_oficial,
  pagina_manual,
  notas_aclaratorias,
  ejemplos,
  activo,
  version
) VALUES (
  'M1_I1',
  'Identifica el aprendizaje que espera que sus estudiantes logren',
  'Este indicador evalúa la capacidad del docente para identificar y describir claramente el aprendizaje que espera que sus estudiantes alcancen al finalizar la clase. Se busca que el docente demuestre comprensión del objetivo de aprendizaje y lo comunique de manera precisa y alineada con el currículo nacional.',
  2025,
  'general',
  NULL,
  'regular',
  1,
  1,
  25.00,
  '{
    "destacado": {
      "nivel": "Destacado",
      "letra": "D",
      "puntaje": 4.0,
      "logica": "AND",
      "descripcion": "El/la docente identifica con precisión el aprendizaje que espera que sus estudiantes logren, demostrando una comprensión profunda tanto del objetivo de aprendizaje como de los conocimientos y habilidades previas de sus estudiantes. Además, articula claramente cómo este aprendizaje se conecta con aprendizajes anteriores y futuros del currículo.",
      "condiciones": [
        {
          "id": "D_1",
          "descripcion": "Identifica con precisión y claridad el objetivo de aprendizaje de la clase",
          "tipo": "calidad",
          "requiere_evidencia": true,
          "criterios": {
            "palabras_clave": ["objetivo", "aprendizaje", "espera", "lograr", "estudiantes"],
            "longitud_minima": 50,
            "elementos_requeridos": ["verbo de acción", "contenido específico", "nivel de profundidad"]
          },
          "peso": 1.0
        },
        {
          "id": "D_2",
          "descripcion": "Demuestra comprensión profunda del objetivo, explicando qué conocimientos y habilidades requieren los estudiantes",
          "tipo": "calidad",
          "requiere_evidencia": true,
          "criterios": {
            "palabras_clave": ["conocimientos previos", "habilidades", "requisitos", "fundamentos"],
            "longitud_minima": 80
          },
          "peso": 1.0
        },
        {
          "id": "D_3",
          "descripcion": "Articula la conexión con aprendizajes anteriores y futuros del currículo",
          "tipo": "calidad",
          "requiere_evidencia": true,
          "criterios": {
            "palabras_clave": ["progresión", "secuencia", "continuidad", "base para", "construye sobre"],
            "longitud_minima": 60
          },
          "peso": 1.0
        }
      ],
      "notas": "Para alcanzar nivel Destacado, el docente debe demostrar no solo identificación del objetivo, sino una comprensión curricular amplia que incluya la progresión de aprendizajes."
    },
    "competente": {
      "nivel": "Competente",
      "letra": "C",
      "puntaje": 3.0,
      "logica": "AND",
      "descripcion": "El/la docente identifica con precisión el aprendizaje que espera que sus estudiantes logren, demostrando comprensión del objetivo de aprendizaje. La descripción es clara y está alineada con los objetivos curriculares, aunque puede no profundizar en las conexiones con otros aprendizajes.",
      "condiciones": [
        {
          "id": "C_1",
          "descripcion": "Identifica con precisión el objetivo de aprendizaje de la clase",
          "tipo": "calidad",
          "requiere_evidencia": true,
          "criterios": {
            "palabras_clave": ["objetivo", "aprendizaje", "estudiantes", "lograr"],
            "longitud_minima": 40,
            "elementos_requeridos": ["verbo de acción", "contenido"]
          },
          "peso": 1.0
        },
        {
          "id": "C_2",
          "descripcion": "Demuestra comprensión del objetivo de aprendizaje",
          "tipo": "calidad",
          "requiere_evidencia": true,
          "criterios": {
            "palabras_clave": ["significa", "implica", "requiere", "busca"],
            "longitud_minima": 50
          },
          "peso": 1.0
        },
        {
          "id": "C_3",
          "descripcion": "La descripción está alineada con los objetivos curriculares vigentes",
          "tipo": "calidad",
          "requiere_evidencia": true,
          "criterios": {
            "palabras_clave": ["currículo", "bases curriculares", "OA", "objetivo de aprendizaje", "programa de estudio"],
            "longitud_minima": 30
          },
          "peso": 1.0
        }
      ]
    },
    "basico": {
      "nivel": "Básico",
      "letra": "B",
      "puntaje": 2.0,
      "logica": "OR",
      "descripcion": "El/la docente menciona un objetivo de aprendizaje, pero la identificación es imprecisa, genérica o parcialmente desalineada con el currículo. La descripción puede ser ambigua o carecer de elementos clave que demuestren comprensión profunda del aprendizaje esperado.",
      "condiciones": [
        {
          "id": "B_1",
          "descripcion": "Menciona un objetivo, pero de manera imprecisa o genérica",
          "tipo": "calidad",
          "requiere_evidencia": true,
          "criterios": {
            "palabras_clave": ["objetivo", "meta", "logro"],
            "longitud_minima": 20
          },
          "peso": 1.0
        },
        {
          "id": "B_2",
          "descripcion": "El objetivo mencionado está parcialmente desalineado con el currículo",
          "tipo": "calidad",
          "requiere_evidencia": true,
          "criterios": {
            "palabras_clave": ["contenido", "tema", "materia"],
            "longitud_minima": 20
          },
          "peso": 1.0
        },
        {
          "id": "B_3",
          "descripcion": "La descripción es ambigua y no demuestra comprensión clara del aprendizaje esperado",
          "tipo": "calidad",
          "requiere_evidencia": true,
          "criterios": {
            "longitud_minima": 15
          },
          "peso": 1.0
        }
      ],
      "notas": "Nivel Básico se caracteriza por mencionar objetivos sin demostrar comprensión profunda o precisión. Cumplir CON AL MENOS UNA condición es suficiente."
    },
    "insatisfactorio": {
      "nivel": "Insatisfactorio",
      "letra": "I",
      "puntaje": 1.0,
      "logica": "OR",
      "descripcion": "El/la docente no identifica el aprendizaje que espera que sus estudiantes logren, o lo hace de manera incorrecta o confusa. No demuestra comprensión del objetivo de aprendizaje ni de su alineación con el currículo.",
      "condiciones": [
        {
          "id": "I_1",
          "descripcion": "No menciona ningún objetivo de aprendizaje",
          "tipo": "presencia",
          "requiere_evidencia": false,
          "criterios": {},
          "peso": 1.0
        },
        {
          "id": "I_2",
          "descripcion": "El objetivo mencionado es incorrecto o está completamente desalineado del currículo",
          "tipo": "calidad",
          "requiere_evidencia": true,
          "criterios": {
            "palabras_clave": ["actividad", "tarea", "ejercicio"],
            "patron": "confunde actividades con objetivos"
          },
          "peso": 1.0
        },
        {
          "id": "I_3",
          "descripcion": "La descripción es confusa y no permite identificar qué aprendizaje se espera",
          "tipo": "calidad",
          "requiere_evidencia": true,
          "criterios": {
            "longitud_minima": 5
          },
          "peso": 1.0
        }
      ],
      "notas": "Nivel Insatisfactorio indica ausencia o confusión grave sobre el objetivo de aprendizaje. Cumplir CON AL MENOS UNA condición es suficiente."
    }
  }'::jsonb,
  'Manual de Evaluación Portafolio Docente MBE 2025 - MINEDUC',
  18,
  'Este indicador es fundamental ya que representa la base de toda planificación pedagógica efectiva. Los evaluadores deben verificar no solo que el docente mencione un objetivo, sino que demuestre comprensión profunda del mismo y su rol en la progresión curricular.',
  ARRAY[
    'Destacado: "El objetivo de aprendizaje es que los estudiantes sean capaces de analizar críticamente textos narrativos identificando elementos como personajes, ambiente y conflicto (OA3, 5° básico). Este objetivo requiere que los estudiantes ya dominen la comprensión literal de textos (trabajada en 4° básico) y sienta las bases para el análisis literario más profundo que realizarán en 6° básico con la estructura narrativa completa."',
    'Competente: "El objetivo de la clase es que los estudiantes comprendan el concepto de fracción como parte de un entero, según el OA7 de 3° básico. Esto significa que deben poder identificar y representar fracciones simples (1/2, 1/4, 1/3) utilizando material concreto y representaciones gráficas."',
    'Básico: "El objetivo es que aprendan sobre fracciones. Los estudiantes deben entender qué es una fracción."',
    'Insatisfactorio: "Vamos a hacer ejercicios de matemáticas con fichas y dibujos." (confunde actividad con objetivo de aprendizaje)'
  ],
  true,
  '1.0'
) ON CONFLICT (indicador_id, año_vigencia, nivel_educativo, COALESCE(asignatura, ''))
DO UPDATE SET
  nombre_indicador = EXCLUDED.nombre_indicador,
  descripcion_general = EXCLUDED.descripcion_general,
  niveles_desempeno = EXCLUDED.niveles_desempeno,
  fuente_oficial = EXCLUDED.fuente_oficial,
  pagina_manual = EXCLUDED.pagina_manual,
  notas_aclaratorias = EXCLUDED.notas_aclaratorias,
  ejemplos = EXCLUDED.ejemplos,
  updated_at = NOW();

-- Comentario informativo
COMMENT ON TABLE rubricas_mbe IS 'Rúbricas oficiales MBE 2025 - Datos cargados desde seed_rubricas_modulo1.sql';
