#!/usr/bin/env -S deno run --allow-env --allow-net

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

console.log('🔍 DIAGNÓSTICO DE EXTRACCIÓN DE BASES CURRICULARES\n')
console.log('='.repeat(70))

// 1. Estado de las ejecuciones
console.log('\n📊 ESTADO DE EJECUCIONES (etl_extracciones_bc):')
console.log('-'.repeat(70))
const { data: runs, error: runsError } = await supabase
  .from('etl_extracciones_bc')
  .select('*')
  .order('started_at', { ascending: false })
  .limit(10)

if (runsError) {
  console.error('❌ Error obteniendo ejecuciones:', runsError.message)
} else if (!runs || runs.length === 0) {
  console.log('ℹ️  No hay ejecuciones registradas')
} else {
  for (const run of runs) {
    console.log(`\nID: ${run.id}`)
    console.log(`Estado: ${run.estado}`)
    console.log(`Iniciado: ${run.started_at}`)
    console.log(`Actualizado: ${run.updated_at}`)
    console.log(`Finalizado: ${run.finished_at || 'N/A'}`)
    console.log(`Categorías procesadas: ${run.categorias_procesadas?.length || 0}`)
    console.log(`Categorías pendientes: ${run.categorias_pendientes?.length || 0}`)
    console.log(`Asignaturas procesadas: ${run.asignaturas_procesadas}`)
    console.log(`Objetivos extraídos: ${run.objetivos_extraidos}`)
    if (run.categorias_pendientes?.length > 0) {
      console.log(`Pendientes: ${run.categorias_pendientes.join(', ')}`)
    }
  }
}

// 2. Objetivos por categoría
console.log('\n\n📚 OBJETIVOS POR CATEGORÍA:')
console.log('-'.repeat(70))
const { data: categorias, error: categoriasError } = await supabase
  .from('objetivos_aprendizaje')
  .select('categoria, codigo, asignatura, nivel')

if (categoriasError) {
  console.error('❌ Error obteniendo objetivos:', categoriasError.message)
} else if (!categorias || categorias.length === 0) {
  console.log('⚠️  NO HAY OBJETIVOS EXTRAÍDOS EN LA BASE DE DATOS')
} else {
  // Agrupar por categoría
  const porCategoria = new Map<string, Set<string>>()
  const asignaturasPorCategoria = new Map<string, Set<string>>()

  for (const obj of categorias) {
    if (!porCategoria.has(obj.categoria)) {
      porCategoria.set(obj.categoria, new Set())
      asignaturasPorCategoria.set(obj.categoria, new Set())
    }
    porCategoria.get(obj.categoria)!.add(obj.codigo)
    asignaturasPorCategoria.get(obj.categoria)!.add(obj.asignatura)
  }

  console.log(`\nTotal de objetivos en BD: ${categorias.length}`)
  console.log(`\nDesglose por categoría:`)

  for (const [categoria, codigos] of porCategoria.entries()) {
    const asignaturas = asignaturasPorCategoria.get(categoria)!
    console.log(`\n  📂 ${categoria}`)
    console.log(`     Objetivos: ${codigos.size}`)
    console.log(`     Asignaturas: ${asignaturas.size}`)
  }
}

// 3. Categorías esperadas vs actuales
console.log('\n\n🎯 VALIDACIÓN DE CATEGORÍAS ESPERADAS:')
console.log('-'.repeat(70))

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

const { data: categoriasActuales, error: categActError } = await supabase
  .from('objetivos_aprendizaje')
  .select('categoria')
  .limit(10000)

if (categActError) {
  console.error('❌ Error:', categActError.message)
} else {
  const categoriasEnBD = new Set(categoriasActuales?.map(c => c.categoria) || [])

  console.log('\nEstado de categorías:')
  for (const categoria of CATEGORIAS_ESPERADAS) {
    const existe = categoriasEnBD.has(categoria)
    console.log(`  ${existe ? '✅' : '❌'} ${categoria}`)
  }

  const faltantes = CATEGORIAS_ESPERADAS.filter(c => !categoriasEnBD.has(c))
  if (faltantes.length > 0) {
    console.log(`\n⚠️  Categorías FALTANTES (${faltantes.length}):`)
    faltantes.forEach(c => console.log(`     - ${c}`))
  } else {
    console.log('\n✅ Todas las categorías están presentes')
  }
}

// 4. Procesos ETL
console.log('\n\n📝 ÚLTIMOS PROCESOS ETL:')
console.log('-'.repeat(70))
const { data: procesos, error: procesosError } = await supabase
  .from('procesos_etl')
  .select('*')
  .eq('nombre', 'extraer_bases_curriculares')
  .order('fecha_inicio', { ascending: false })
  .limit(5)

if (procesosError) {
  console.error('❌ Error obteniendo procesos:', procesosError.message)
} else if (!procesos || procesos.length === 0) {
  console.log('ℹ️  No hay procesos ETL registrados')
} else {
  for (const proceso of procesos) {
    console.log(`\nID: ${proceso.id}`)
    console.log(`Estado: ${proceso.estado}`)
    console.log(`Inicio: ${proceso.fecha_inicio}`)
    console.log(`Fin: ${proceso.fecha_fin || 'N/A'}`)
    console.log(`Registros exitosos: ${proceso.registros_exitosos || 0}`)
    console.log(`Registros fallidos: ${proceso.registros_fallidos || 0}`)
    console.log(`Duración: ${proceso.duracion_ms ? `${proceso.duracion_ms}ms` : 'N/A'}`)
  }
}

console.log('\n' + '='.repeat(70))
console.log('✅ Diagnóstico completado\n')
