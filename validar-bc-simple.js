/**
 * Validación rápida de extracción de bases curriculares
 */
const { createClient } = require('@supabase/supabase-js')

// Limpiar comillas de las variables de entorno si existen
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/^["']|["']$/g, '')
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/^["']|["']$/g, '')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Faltan credenciales de Supabase')
  console.error('URL:', SUPABASE_URL)
  console.error('Key:', SUPABASE_SERVICE_ROLE_KEY ? 'presente' : 'faltante')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const CATEGORIAS_ESPERADAS = [
  'Educación Parvularia',
  'Educación Básica 1° a 6°',
  'Educación Media 7° a 2° Medio',
  'Formación Diferenciada Científico-Humanista 3° a 4° Medio',
  'Formación Diferenciada Técnico Profesional 3° a 4° Medio',
  'Formación Diferenciada Artística 3° a 4° Medio',
  'Educación de Personas Jóvenes y Adultas (EPJA)',
  'Lengua y Cultura de los Pueblos Originarios Ancestrales',
  'Marco Curricular de Lengua Indígena 7° a 2° Medio',
]

async function main() {
  console.log('🔍 DIAGNÓSTICO DE EXTRACCIÓN DE BASES CURRICULARES\n')
  console.log('='.repeat(70))

  // 1. Ejecuciones en etl_extracciones_bc
  console.log('\n📊 EJECUCIONES (etl_extracciones_bc):')
  console.log('-'.repeat(70))

  const { data: runs, error: runsError } = await supabase
    .from('etl_extracciones_bc')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5)

  if (runsError) {
    console.error('❌ Error:', runsError.message)
  } else if (!runs || runs.length === 0) {
    console.log('ℹ️  No hay ejecuciones registradas')
  } else {
    for (const run of runs) {
      console.log(`\n  Run ID: ${run.id.substring(0, 8)}...`)
      console.log(`  Estado: ${run.estado}`)
      console.log(`  Iniciado: ${new Date(run.started_at).toLocaleString()}`)
      console.log(`  Categorías procesadas: ${run.categorias_procesadas?.length || 0}`)
      console.log(`  Categorías pendientes: ${run.categorias_pendientes?.length || 0}`)
      console.log(`  Objetivos: ${run.objetivos_extraidos}`)

      if (run.categorias_pendientes?.length > 0) {
        console.log(`  Pendientes:`)
        run.categorias_pendientes.slice(0, 3).forEach(cat => {
          const nombre = cat.split('/').pop()
          console.log(`    • ${nombre}`)
        })
        if (run.categorias_pendientes.length > 3) {
          console.log(`    ... y ${run.categorias_pendientes.length - 3} más`)
        }
      }
    }
  }

  // 2. Conteo de objetivos
  console.log('\n\n📚 OBJETIVOS EN BASE DE DATOS:')
  console.log('-'.repeat(70))

  const { count: totalObjetivos, error: countError } = await supabase
    .from('objetivos_aprendizaje')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('❌ Error:', countError.message)
  } else {
    console.log(`\nTotal objetivos: ${totalObjetivos || 0}`)
  }

  // 3. Objetivos por categoría
  const { data: objetivos, error: objError } = await supabase
    .from('objetivos_aprendizaje')
    .select('categoria, codigo, asignatura')

  if (objError) {
    console.error('❌ Error:', objError.message)
  } else if (!objetivos || objetivos.length === 0) {
    console.log('\n⚠️  NO HAY OBJETIVOS EN LA BASE DE DATOS')
  } else {
    const porCategoria = new Map()
    const asignaturasPorCategoria = new Map()

    for (const obj of objetivos) {
      if (!porCategoria.has(obj.categoria)) {
        porCategoria.set(obj.categoria, new Set())
        asignaturasPorCategoria.set(obj.categoria, new Set())
      }
      porCategoria.get(obj.categoria).add(obj.codigo)
      asignaturasPorCategoria.get(obj.categoria).add(obj.asignatura)
    }

    console.log('\nDesglose por categoría:')
    for (const [categoria, codigos] of porCategoria.entries()) {
      const asignaturas = asignaturasPorCategoria.get(categoria)
      console.log(`\n  📂 ${categoria}`)
      console.log(`     Objetivos: ${codigos.size}`)
      console.log(`     Asignaturas: ${asignaturas.size}`)
    }
  }

  // 4. Validación de categorías esperadas
  console.log('\n\n🎯 VALIDACIÓN DE CATEGORÍAS ESPERADAS:')
  console.log('-'.repeat(70))

  if (objetivos && objetivos.length > 0) {
    const categoriasEnBD = new Set(objetivos.map(o => o.categoria))

    console.log('\nEstado de categorías:')
    for (const categoria of CATEGORIAS_ESPERADAS) {
      const existe = categoriasEnBD.has(categoria)
      console.log(`  ${existe ? '✅' : '❌'} ${categoria}`)
    }

    const faltantes = CATEGORIAS_ESPERADAS.filter(c => !categoriasEnBD.has(c))
    if (faltantes.length > 0) {
      console.log(`\n⚠️  CATEGORÍAS FALTANTES (${faltantes.length}):`)
      faltantes.forEach(c => console.log(`     - ${c}`))
    } else {
      console.log('\n✅ Todas las categorías están presentes')
    }
  }

  // 5. Últimos procesos ETL
  console.log('\n\n📝 ÚLTIMOS PROCESOS ETL:')
  console.log('-'.repeat(70))

  const { data: procesos, error: procesosError } = await supabase
    .from('procesos_etl')
    .select('*')
    .eq('nombre', 'extraer_bases_curriculares')
    .order('fecha_inicio', { ascending: false })
    .limit(3)

  if (procesosError) {
    console.error('❌ Error:', procesosError.message)
  } else if (!procesos || procesos.length === 0) {
    console.log('ℹ️  No hay procesos ETL registrados')
  } else {
    for (const proceso of procesos) {
      console.log(`\n  ID: ${proceso.id.substring(0, 8)}...`)
      console.log(`  Estado: ${proceso.estado}`)
      console.log(`  Inicio: ${new Date(proceso.fecha_inicio).toLocaleString()}`)
      if (proceso.fecha_fin) {
        console.log(`  Fin: ${new Date(proceso.fecha_fin).toLocaleString()}`)
      }
      console.log(`  Exitosos: ${proceso.registros_exitosos || 0}`)
      console.log(`  Fallidos: ${proceso.registros_fallidos || 0}`)
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ Diagnóstico completado\n')
}

main().catch(console.error)
