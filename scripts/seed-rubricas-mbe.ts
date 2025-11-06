// scripts/seed-rubricas-mbe.ts
// Script para cargar rúbricas MBE iniciales en la base de datos

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Ejemplo de rúbricas MBE para Educación Básica 1-6, Matemática, 2025
const rubricasEjemplo = [
  {
    asignatura: 'Matemática',
    nivel_educativo: 'basica_1_6',
    año_vigencia: 2025,
    modalidad: 'regular',
    dominio: 'A',
    estandar_numero: 1,
    nombre_estandar: 'Conoce a los estudiantes y sabe cómo aprenden',
    descripcion_estandar: 'El profesor conoce las características de desarrollo de sus estudiantes y sus procesos de aprendizaje',
    focos: [
      {
        nombre: 'Conocimiento del desarrollo',
        descriptores: [
          'Conoce características cognitivas, sociales y emocionales de sus estudiantes',
          'Comprende cómo estas características influyen en el aprendizaje',
        ],
      },
    ],
    criterios: [
      {
        codigo: 'A.1.1',
        descripcion: 'Demuestra conocimiento de las características de sus estudiantes',
      },
      {
        codigo: 'A.1.2',
        descripcion: 'Utiliza este conocimiento para diseñar experiencias de aprendizaje',
      },
    ],
    niveles_desempeño: [
      {
        nivel: 'Destacado',
        descripcion: 'Demuestra un conocimiento profundo y preciso de las características de sus estudiantes y las utiliza sistemáticamente',
      },
      {
        nivel: 'Competente',
        descripcion: 'Demuestra conocimiento adecuado de las características de sus estudiantes y las considera en su planificación',
      },
      {
        nivel: 'Básico',
        descripcion: 'Demuestra conocimiento general de las características de sus estudiantes pero no siempre las considera',
      },
      {
        nivel: 'Insuficiente',
        descripcion: 'Demuestra conocimiento limitado o inexacto de las características de sus estudiantes',
      },
    ],
    contenido_texto: `Estándar A.1: Conoce a los estudiantes y sabe cómo aprenden.
    El profesor conoce las características de desarrollo cognitivo, social y emocional de sus estudiantes y comprende cómo estas características influyen en su aprendizaje.
    Criterio A.1.1: Demuestra conocimiento de las características de sus estudiantes.
    Criterio A.1.2: Utiliza este conocimiento para diseñar experiencias de aprendizaje apropiadas.`,
  },
  {
    asignatura: 'Matemática',
    nivel_educativo: 'basica_1_6',
    año_vigencia: 2025,
    modalidad: 'regular',
    dominio: 'A',
    estandar_numero: 2,
    nombre_estandar: 'Está preparado para enseñar',
    descripcion_estandar: 'El profesor domina los contenidos de su disciplina y comprende cómo enseñarlos',
    focos: [
      {
        nombre: 'Dominio disciplinar',
        descriptores: [
          'Conoce en profundidad los contenidos matemáticos que enseña',
          'Comprende cómo se relacionan entre sí los diferentes contenidos',
        ],
      },
      {
        nombre: 'Conocimiento didáctico',
        descriptores: [
          'Conoce estrategias efectivas para enseñar matemática',
          'Identifica dificultades comunes en el aprendizaje matemático',
        ],
      },
    ],
    criterios: [
      {
        codigo: 'A.2.1',
        descripcion: 'Domina los contenidos matemáticos que enseña',
      },
      {
        codigo: 'A.2.2',
        descripcion: 'Conoce estrategias didácticas apropiadas para matemática',
      },
    ],
    niveles_desempeño: [
      {
        nivel: 'Destacado',
        descripcion: 'Demuestra dominio profundo de contenidos y didáctica matemática, identificando conexiones y anticipando dificultades',
      },
      {
        nivel: 'Competente',
        descripcion: 'Demuestra dominio adecuado de contenidos y conoce estrategias didácticas apropiadas',
      },
      {
        nivel: 'Básico',
        descripcion: 'Demuestra conocimiento básico de contenidos pero conocimiento didáctico limitado',
      },
      {
        nivel: 'Insuficiente',
        descripcion: 'Demuestra conocimiento insuficiente de contenidos o estrategias didácticas',
      },
    ],
    contenido_texto: `Estándar A.2: Está preparado para enseñar.
    El profesor domina los contenidos matemáticos que enseña y comprende cómo enseñarlos efectivamente.
    Criterio A.2.1: Domina los contenidos matemáticos que enseña.
    Criterio A.2.2: Conoce estrategias didácticas apropiadas para la enseñanza de matemática.`,
  },
]

async function seedRubricas() {
  console.log('🌱 Iniciando seed de rúbricas MBE...')
  console.log(`📊 Total de rúbricas a insertar: ${rubricasEjemplo.length}`)

  try {
    // Verificar conexión
    const { data: testQuery, error: testError } = await supabase
      .from('rubricas_mbe')
      .select('count')
      .limit(1)

    if (testError) {
      console.error('❌ Error de conexión a Supabase:', testError)
      process.exit(1)
    }

    console.log('✅ Conexión a Supabase exitosa')

    // Insertar rúbricas
    for (const rubrica of rubricasEjemplo) {
      console.log(`\n📝 Insertando: ${rubrica.dominio}.${rubrica.estandar_numero} - ${rubrica.nombre_estandar}`)

      const { data, error } = await supabase
        .from('rubricas_mbe')
        .upsert(
          {
            ...rubrica,
            embedding: null, // Los embeddings se generarán después con un script separado
          },
          {
            onConflict: 'asignatura,nivel_educativo,año_vigencia,modalidad,dominio,estandar_numero',
          }
        )
        .select()

      if (error) {
        console.error(`  ❌ Error al insertar rúbrica ${rubrica.dominio}.${rubrica.estandar_numero}:`, error)
      } else {
        console.log(`  ✅ Rúbrica ${rubrica.dominio}.${rubrica.estandar_numero} insertada/actualizada correctamente`)
      }
    }

    // Verificar total insertado
    const { count } = await supabase
      .from('rubricas_mbe')
      .select('*', { count: 'exact', head: true })
      .eq('año_vigencia', 2025)

    console.log(`\n✅ Seed completado exitosamente`)
    console.log(`📊 Total de rúbricas en BD (año 2025): ${count}`)
    console.log(`\n⚠️  NOTA: Los embeddings deben generarse con un script separado que use OpenAI API`)

  } catch (error) {
    console.error('❌ Error durante el seed:', error)
    process.exit(1)
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  seedRubricas()
    .then(() => {
      console.log('\n🎉 Proceso completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error)
      process.exit(1)
    })
}

export { seedRubricas }
