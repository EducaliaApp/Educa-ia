/**
 * Script para validar datos en la base de datos Supabase
 * Ejecutar con: node test-database-validation.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Falta configuración de Supabase en .env.local')
  console.error('   Asegúrate de tener:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ============================================
// PRUEBAS DE VALIDACIÓN
// ============================================

async function test1_ValidarEsquema() {
  console.log('\n' + '='.repeat(60))
  console.log('TEST 1: Validar Esquema de Tabla objetivos_aprendizaje')
  console.log('='.repeat(60))

  try {
    // Insertar un objetivo de prueba
    const objetivoPrueba = {
      codigo: 'TEST OA 99',
      tipo_objetivo: 'contenido',
      categoria: 'Test',
      asignatura: 'Test',
      eje: 'Test',
      nivel: 'Test',
      curso: 'Test',
      objetivo: 'Objetivo de prueba',
      priorizado: false,
      actividades: [
        { titulo: 'Actividad 1', url: 'https://test.com/1' }
      ],
      url_fuente: 'https://test.com',
      version: '2026',
      hash_contenido: 'test-hash-12345',
    }

    const { data, error } = await supabase
      .from('objetivos_aprendizaje')
      .insert(objetivoPrueba)
      .select()
      .single()

    if (error) {
      console.log(`❌ Error insertando objetivo de prueba: ${error.message}`)
      console.log(`   Código: ${error.code}`)
      console.log(`   Detalles: ${error.details}`)
      return false
    }

    console.log('✅ Esquema validado correctamente')
    console.log(`   ID generado: ${data.id}`)

    // Limpiar: eliminar objetivo de prueba
    await supabase
      .from('objetivos_aprendizaje')
      .delete()
      .eq('codigo', 'TEST OA 99')

    console.log('✅ Limpieza completada')

    return true
  } catch (error) {
    console.log(`❌ Error validando esquema: ${error.message}`)
    return false
  }
}

async function test2_ContarObjetivos() {
  console.log('\n' + '='.repeat(60))
  console.log('TEST 2: Contar Objetivos en Base de Datos')
  console.log('='.repeat(60))

  try {
    const { count, error } = await supabase
      .from('objetivos_aprendizaje')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`❌ Error contando objetivos: ${error.message}`)
      return null
    }

    console.log(`📊 Total de objetivos en BD: ${count}`)

    return count
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return null
  }
}

async function test3_ObjetivosPorCategoria() {
  console.log('\n' + '='.repeat(60))
  console.log('TEST 3: Objetivos por Categoría')
  console.log('='.repeat(60))

  try {
    const { data, error } = await supabase
      .from('objetivos_aprendizaje')
      .select('categoria')

    if (error) {
      console.log(`❌ Error: ${error.message}`)
      return null
    }

    const counts = data.reduce((acc, obj) => {
      acc[obj.categoria] = (acc[obj.categoria] || 0) + 1
      return acc
    }, {})

    console.log('📂 Distribución por categoría:')
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`   - ${cat}: ${count} objetivos`)
      })

    return counts
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return null
  }
}

async function test4_ObjetivosPorTipo() {
  console.log('\n' + '='.repeat(60))
  console.log('TEST 4: Objetivos por Tipo')
  console.log('='.repeat(60))

  try {
    const { data, error } = await supabase
      .from('objetivos_aprendizaje')
      .select('tipo_objetivo')

    if (error) {
      console.log(`❌ Error: ${error.message}`)
      return null
    }

    const counts = data.reduce((acc, obj) => {
      acc[obj.tipo_objetivo] = (acc[obj.tipo_objetivo] || 0) + 1
      return acc
    }, {})

    console.log('📝 Distribución por tipo:')
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([tipo, count]) => {
        console.log(`   - ${tipo}: ${count} objetivos`)
      })

    return counts
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return null
  }
}

async function test5_ObjetivosPriorizados() {
  console.log('\n' + '='.repeat(60))
  console.log('TEST 5: Objetivos Priorizados')
  console.log('='.repeat(60))

  try {
    const { count: totalPriorizados, error: error1 } = await supabase
      .from('objetivos_aprendizaje')
      .select('*', { count: 'exact', head: true })
      .eq('priorizado', true)

    const { count: totalNoPriorizados, error: error2 } = await supabase
      .from('objetivos_aprendizaje')
      .select('*', { count: 'exact', head: true })
      .eq('priorizado', false)

    if (error1 || error2) {
      console.log(`❌ Error: ${error1?.message || error2?.message}`)
      return null
    }

    const total = totalPriorizados + totalNoPriorizados
    const porcentaje = total > 0 ? ((totalPriorizados / total) * 100).toFixed(2) : 0

    console.log(`⭐ Objetivos priorizados: ${totalPriorizados}`)
    console.log(`📋 Objetivos no priorizados: ${totalNoPriorizados}`)
    console.log(`📊 Porcentaje priorizado: ${porcentaje}%`)

    return { totalPriorizados, totalNoPriorizados, porcentaje }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return null
  }
}

async function test6_EjemplosObjetivos() {
  console.log('\n' + '='.repeat(60))
  console.log('TEST 6: Ejemplos de Objetivos Extraídos')
  console.log('='.repeat(60))

  try {
    // Obtener un ejemplo de cada tipo
    const { data: ejemploContenido } = await supabase
      .from('objetivos_aprendizaje')
      .select('*')
      .eq('tipo_objetivo', 'contenido')
      .limit(1)
      .single()

    const { data: ejemploHabilidad } = await supabase
      .from('objetivos_aprendizaje')
      .select('*')
      .eq('tipo_objetivo', 'habilidad')
      .limit(1)
      .single()

    const { data: ejemploActitud } = await supabase
      .from('objetivos_aprendizaje')
      .select('*')
      .eq('tipo_objetivo', 'actitud')
      .limit(1)
      .single()

    console.log('\n📋 Ejemplo de OA (Contenido):')
    if (ejemploContenido) {
      console.log(`   Código: ${ejemploContenido.codigo}`)
      console.log(`   Asignatura: ${ejemploContenido.asignatura}`)
      console.log(`   Nivel: ${ejemploContenido.nivel}`)
      console.log(`   Eje: ${ejemploContenido.eje}`)
      console.log(`   Objetivo: ${ejemploContenido.objetivo.substring(0, 80)}...`)
      console.log(`   Priorizado: ${ejemploContenido.priorizado ? 'Sí' : 'No'}`)
      console.log(`   Actividades: ${ejemploContenido.actividades?.length || 0}`)
    } else {
      console.log('   ❌ No se encontraron objetivos de contenido')
    }

    console.log('\n📋 Ejemplo de OAH (Habilidad):')
    if (ejemploHabilidad) {
      console.log(`   Código: ${ejemploHabilidad.codigo}`)
      console.log(`   Asignatura: ${ejemploHabilidad.asignatura}`)
      console.log(`   Objetivo: ${ejemploHabilidad.objetivo.substring(0, 80)}...`)
    } else {
      console.log('   ⚠️  No se encontraron objetivos de habilidad')
    }

    console.log('\n📋 Ejemplo de OAA (Actitud):')
    if (ejemploActitud) {
      console.log(`   Código: ${ejemploActitud.codigo}`)
      console.log(`   Asignatura: ${ejemploActitud.asignatura}`)
      console.log(`   Objetivo: ${ejemploActitud.objetivo.substring(0, 80)}...`)
    } else {
      console.log('   ⚠️  No se encontraron objetivos de actitud')
    }

    return { ejemploContenido, ejemploHabilidad, ejemploActitud }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return null
  }
}

async function test7_ValidarActividades() {
  console.log('\n' + '='.repeat(60))
  console.log('TEST 7: Validar Actividades Complementarias')
  console.log('='.repeat(60))

  try {
    // Contar objetivos con actividades
    const { data, error } = await supabase
      .from('objetivos_aprendizaje')
      .select('actividades')

    if (error) {
      console.log(`❌ Error: ${error.message}`)
      return null
    }

    const conActividades = data.filter(obj => obj.actividades && obj.actividades.length > 0)
    const sinActividades = data.filter(obj => !obj.actividades || obj.actividades.length === 0)

    const porcentaje = data.length > 0 ? ((conActividades.length / data.length) * 100).toFixed(2) : 0

    console.log(`📚 Objetivos con actividades: ${conActividades.length}`)
    console.log(`📋 Objetivos sin actividades: ${sinActividades.length}`)
    console.log(`📊 Porcentaje con actividades: ${porcentaje}%`)

    // Mostrar distribución de cantidad de actividades
    const distribucion = conActividades.reduce((acc, obj) => {
      const count = obj.actividades.length
      acc[count] = (acc[count] || 0) + 1
      return acc
    }, {})

    console.log('\n📊 Distribución de actividades por objetivo:')
    Object.entries(distribucion)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .forEach(([count, total]) => {
        console.log(`   - ${count} actividades: ${total} objetivos`)
      })

    return { conActividades: conActividades.length, sinActividades: sinActividades.length, distribucion }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return null
  }
}

async function test8_ValidarArchivosGenerados() {
  console.log('\n' + '='.repeat(60))
  console.log('TEST 8: Validar Archivos CSV/JSON Generados')
  console.log('='.repeat(60))

  try {
    const { data, error } = await supabase
      .from('documentos_transformados')
      .select('*')
      .eq('tipo_documento', 'bases_curriculares')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.log(`❌ Error: ${error.message}`)
      return null
    }

    console.log(`📁 Total archivos generados: ${data.length}`)

    // Agrupar por formato
    const porFormato = data.reduce((acc, archivo) => {
      acc[archivo.formato] = (acc[archivo.formato] || 0) + 1
      return acc
    }, {})

    console.log('\n📊 Archivos por formato:')
    Object.entries(porFormato).forEach(([formato, count]) => {
      console.log(`   - ${formato.toUpperCase()}: ${count}`)
    })

    // Mostrar últimos 5 archivos
    console.log('\n📄 Últimos 5 archivos generados:')
    data.slice(0, 5).forEach((archivo, index) => {
      console.log(`\n${index + 1}. ${archivo.nombre_archivo}`)
      console.log(`   - Formato: ${archivo.formato}`)
      console.log(`   - Tamaño: ${(archivo.tamaño_bytes / 1024).toFixed(2)} KB`)
      console.log(`   - Registros: ${archivo.num_registros}`)
      console.log(`   - Creado: ${new Date(archivo.created_at).toLocaleString('es-CL')}`)

      if (archivo.resumen_contenido) {
        console.log(`   - Contenido:`)
        if (archivo.resumen_contenido.asignaturas_procesadas) {
          console.log(`      • Asignaturas: ${archivo.resumen_contenido.asignaturas_procesadas}`)
        }
        if (archivo.resumen_contenido.total_objetivos) {
          console.log(`      • Objetivos: ${archivo.resumen_contenido.total_objetivos}`)
        }
        if (archivo.resumen_contenido.objetivos_priorizados) {
          console.log(`      • Priorizados: ${archivo.resumen_contenido.objetivos_priorizados}`)
        }
      }
    })

    return data
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return null
  }
}

async function test9_ValidarProcesosETL() {
  console.log('\n' + '='.repeat(60))
  console.log('TEST 9: Validar Procesos ETL Ejecutados')
  console.log('='.repeat(60))

  try {
    const { data, error } = await supabase
      .from('procesos_etl')
      .select('*')
      .eq('nombre', 'extraer_bases_curriculares')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.log(`❌ Error: ${error.message}`)
      return null
    }

    console.log(`📊 Total procesos ejecutados: ${data.length}`)

    // Agrupar por estado
    const porEstado = data.reduce((acc, proceso) => {
      acc[proceso.estado] = (acc[proceso.estado] || 0) + 1
      return acc
    }, {})

    console.log('\n📈 Procesos por estado:')
    Object.entries(porEstado).forEach(([estado, count]) => {
      console.log(`   - ${estado}: ${count}`)
    })

    // Último proceso ejecutado
    if (data.length > 0) {
      const ultimo = data[0]
      console.log('\n🔄 Último proceso:')
      console.log(`   ID: ${ultimo.id}`)
      console.log(`   Estado: ${ultimo.estado}`)
      console.log(`   Inicio: ${new Date(ultimo.created_at).toLocaleString('es-CL')}`)
      if (ultimo.fecha_finalizacion) {
        console.log(`   Fin: ${new Date(ultimo.fecha_finalizacion).toLocaleString('es-CL')}`)
        const duracion = (new Date(ultimo.fecha_finalizacion) - new Date(ultimo.created_at)) / 1000
        console.log(`   Duración: ${duracion.toFixed(2)} segundos`)
      }
      console.log(`   Registros procesados: ${ultimo.total_registros || 0}`)
      console.log(`   Registros exitosos: ${ultimo.registros_exitosos || 0}`)
      console.log(`   Registros fallidos: ${ultimo.registros_fallidos || 0}`)
    }

    return data
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return null
  }
}

// ============================================
// EJECUTAR TODAS LAS PRUEBAS
// ============================================

async function main() {
  console.log('🧪 SUITE DE VALIDACIÓN DE BASE DE DATOS')
  console.log('=' + '='.repeat(60))
  console.log(`📅 Fecha: ${new Date().toLocaleString('es-CL')}`)
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`)
  console.log('=' + '='.repeat(60))

  const resultados = {}

  // Ejecutar todas las pruebas
  resultados.test1 = await test1_ValidarEsquema()
  resultados.test2 = await test2_ContarObjetivos()
  resultados.test3 = await test3_ObjetivosPorCategoria()
  resultados.test4 = await test4_ObjetivosPorTipo()
  resultados.test5 = await test5_ObjetivosPriorizados()
  resultados.test6 = await test6_EjemplosObjetivos()
  resultados.test7 = await test7_ValidarActividades()
  resultados.test8 = await test8_ValidarArchivosGenerados()
  resultados.test9 = await test9_ValidarProcesosETL()

  // Resumen final
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN FINAL')
  console.log('='.repeat(60))

  console.log(`\n✅ Esquema validado: ${resultados.test1 ? 'Sí' : 'No'}`)
  console.log(`✅ Total objetivos en BD: ${resultados.test2 || 0}`)
  console.log(`✅ Categorías encontradas: ${resultados.test3 ? Object.keys(resultados.test3).length : 0}`)
  console.log(`✅ Tipos de objetivos: ${resultados.test4 ? Object.keys(resultados.test4).length : 0}`)
  console.log(`✅ Objetivos priorizados: ${resultados.test5?.totalPriorizados || 0}`)
  console.log(`✅ Archivos generados: ${resultados.test8?.length || 0}`)
  console.log(`✅ Procesos ETL ejecutados: ${resultados.test9?.length || 0}`)

  console.log('\n✨ Validación completada\n')
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { main }
