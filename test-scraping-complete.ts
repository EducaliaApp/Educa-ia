/**
 * Script de prueba completo para validar extracción de currículum
 * Ejecutar con: deno run --allow-net --allow-env test-scraping-complete.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// ============================================
// CONFIGURACIÓN
// ============================================

const SUPABASE_URL = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || 'YOUR_SUPABASE_URL'
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'YOUR_SERVICE_ROLE_KEY'

const CATEGORY_URLS = [
  'https://www.curriculumnacional.cl/curriculum/educacion-parvularia',
  'https://www.curriculumnacional.cl/curriculum/1o-6o-basico',
  'https://www.curriculumnacional.cl/curriculum/7o-basico-2-medio',
  'https://www.curriculumnacional.cl/curriculum/3o-4o-medio',
  'https://www.curriculumnacional.cl/curriculum/3o-4o-medio-tecnico-profesional',
  'https://www.curriculumnacional.cl/recursos/terminales-formacion-diferenciada-artistica-3-4-medio-0',
  'https://www.curriculumnacional.cl/curriculum/bases-curriculares-educacion-personas-jovenes-adultas-epja',
  'https://www.curriculumnacional.cl/pueblos-originarios-ancestrales',
  'https://www.curriculumnacional.cl/curriculum/7o-basico-2o-medio/lengua-indigena',
]

// ============================================
// FUNCIONES DE PRUEBA
// ============================================

/**
 * Prueba 1: Validar que todas las URLs respondan correctamente
 */
async function test1_ValidarURLs() {
  console.log('\n' + '='.repeat(60))
  console.log('TEST 1: Validar URLs de Categorías')
  console.log('='.repeat(60))

  const results = []

  for (const url of CATEGORY_URLS) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0)',
        },
      })

      const status = response.ok ? '✅' : '❌'
      console.log(`${status} ${url} - Status: ${response.status}`)

      results.push({
        url,
        status: response.status,
        ok: response.ok,
      })
    } catch (error) {
      console.log(`❌ ${url} - Error: ${error.message}`)
      results.push({
        url,
        status: 0,
        ok: false,
        error: error.message,
      })
    }

    // Delay para no saturar el servidor
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  const exitosas = results.filter(r => r.ok).length
  const fallidas = results.filter(r => !r.ok).length

  console.log(`\n📊 Resumen: ${exitosas} exitosas, ${fallidas} fallidas`)

  return { exitosas, fallidas, results }
}

/**
 * Prueba 2: Extraer asignaturas de cada categoría
 */
async function test2_ExtraerAsignaturas() {
  console.log('\n' + '='.repeat(60))
  console.log('TEST 2: Extraer Asignaturas de Cada Categoría')
  console.log('='.repeat(60))

  const results = []

  for (const url of CATEGORY_URLS) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0)',
        },
      })

      const html = await response.text()

      // Extraer asignaturas usando los 3 patrones
      const asignaturas = extraerAsignaturas(html, url)

      console.log(`\n📂 ${url}`)
      console.log(`   📚 Asignaturas encontradas: ${asignaturas.length}`)

      if (asignaturas.length > 0) {
        console.log(`   📋 Primeras 5 asignaturas:`)
        asignaturas.slice(0, 5).forEach(asig => {
          console.log(`      - ${asig.nombre} (${asig.url})`)
        })
      } else {
        console.log(`   ⚠️  NO se encontraron asignaturas - revisar estructura HTML`)
      }

      results.push({
        url,
        count: asignaturas.length,
        asignaturas: asignaturas.slice(0, 5),
      })
    } catch (error) {
      console.log(`❌ Error procesando ${url}: ${error.message}`)
      results.push({
        url,
        count: 0,
        error: error.message,
      })
    }

    await new Promise(resolve => setTimeout(resolve, 300))
  }

  const total = results.reduce((sum, r) => sum + r.count, 0)
  console.log(`\n📊 Total de asignaturas extraídas: ${total}`)

  return results
}

/**
 * Prueba 3: Invocar Edge Function y validar respuesta
 */
async function test3_InvocarEdgeFunction() {
  console.log('\n' + '='.repeat(60))
  console.log('TEST 3: Invocar Edge Function (Modo TEST)')
  console.log('='.repeat(60))

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️  Saltando prueba - Falta configuración de Supabase')
    return null
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    console.log('🚀 Invocando función extraer-bases-curriculares...')
    console.log('   Configuración: MAX_CATEGORIAS=1, MAX_ASIGNATURAS=3')

    const { data, error } = await supabase.functions.invoke('extraer-bases-curriculares', {
      body: {
        persist_db: true,
        generate_files: true,
      },
    })

    if (error) {
      console.log(`❌ Error: ${error.message}`)
      return { success: false, error }
    }

    console.log('✅ Función ejecutada exitosamente')
    console.log(`\n📊 Estadísticas:`)
    console.log(`   - Categorías procesadas: ${data.estadisticas?.categorias_procesadas || 'N/A'}`)
    console.log(`   - Asignaturas procesadas: ${data.estadisticas?.asignaturas_procesadas || 'N/A'}`)
    console.log(`   - Total objetivos: ${data.estadisticas?.total_objetivos || 'N/A'}`)
    console.log(`   - Objetivos priorizados: ${data.estadisticas?.objetivos_priorizados || 'N/A'}`)
    console.log(`   - Duración: ${data.estadisticas?.duracion_ms || 'N/A'}ms`)

    if (data.estadisticas?.tracking) {
      console.log(`\n📝 Tracking de cambios:`)
      console.log(`   - Nuevos: ${data.estadisticas.tracking.objetivos_nuevos}`)
      console.log(`   - Actualizados: ${data.estadisticas.tracking.objetivos_actualizados}`)
      console.log(`   - Sin cambios: ${data.estadisticas.tracking.objetivos_sin_cambios}`)
      console.log(`   - Errores: ${data.estadisticas.tracking.objetivos_error}`)
    }

    if (data.archivos && data.archivos.length > 0) {
      console.log(`\n📁 Archivos generados:`)
      data.archivos.forEach((archivo: any) => {
        console.log(`   - ${archivo.nombre} (${archivo.formato}) - ${(archivo.size / 1024).toFixed(2)} KB`)
      })
    }

    return { success: true, data }
  } catch (error) {
    console.log(`❌ Error invocando función: ${error.message}`)
    return { success: false, error }
  }
}

/**
 * Prueba 4: Validar datos en base de datos
 */
async function test4_ValidarBaseDeDatos() {
  console.log('\n' + '='.repeat(60))
  console.log('TEST 4: Validar Datos en Base de Datos')
  console.log('='.repeat(60))

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️  Saltando prueba - Falta configuración de Supabase')
    return null
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // 1. Contar objetivos totales
    const { count: totalObjetivos, error: errorCount } = await supabase
      .from('objetivos_aprendizaje')
      .select('*', { count: 'exact', head: true })

    if (errorCount) {
      console.log(`❌ Error contando objetivos: ${errorCount.message}`)
    } else {
      console.log(`📊 Total objetivos en BD: ${totalObjetivos}`)
    }

    // 2. Objetivos por categoría
    const { data: porCategoria, error: errorCategoria } = await supabase
      .from('objetivos_aprendizaje')
      .select('categoria')
      .then(({ data, error }) => {
        if (error) return { data: null, error }
        const counts = data.reduce((acc: any, obj: any) => {
          acc[obj.categoria] = (acc[obj.categoria] || 0) + 1
          return acc
        }, {})
        return { data: counts, error: null }
      })

    if (errorCategoria) {
      console.log(`❌ Error agrupando por categoría: ${errorCategoria.message}`)
    } else {
      console.log(`\n📂 Objetivos por categoría:`)
      Object.entries(porCategoria || {}).forEach(([cat, count]) => {
        console.log(`   - ${cat}: ${count}`)
      })
    }

    // 3. Objetivos por tipo
    const { data: porTipo, error: errorTipo } = await supabase
      .from('objetivos_aprendizaje')
      .select('tipo_objetivo')
      .then(({ data, error }) => {
        if (error) return { data: null, error }
        const counts = data.reduce((acc: any, obj: any) => {
          acc[obj.tipo_objetivo] = (acc[obj.tipo_objetivo] || 0) + 1
          return acc
        }, {})
        return { data: counts, error: null }
      })

    if (errorTipo) {
      console.log(`❌ Error agrupando por tipo: ${errorTipo.message}`)
    } else {
      console.log(`\n📝 Objetivos por tipo:`)
      Object.entries(porTipo || {}).forEach(([tipo, count]) => {
        console.log(`   - ${tipo}: ${count}`)
      })
    }

    // 4. Ejemplo de objetivo
    const { data: ejemplo, error: errorEjemplo } = await supabase
      .from('objetivos_aprendizaje')
      .select('*')
      .limit(1)
      .single()

    if (errorEjemplo) {
      console.log(`❌ Error obteniendo ejemplo: ${errorEjemplo.message}`)
    } else {
      console.log(`\n📋 Ejemplo de objetivo extraído:`)
      console.log(`   Código: ${ejemplo.codigo}`)
      console.log(`   Asignatura: ${ejemplo.asignatura}`)
      console.log(`   Categoría: ${ejemplo.categoria}`)
      console.log(`   Nivel: ${ejemplo.nivel}`)
      console.log(`   Eje: ${ejemplo.eje}`)
      console.log(`   Objetivo: ${ejemplo.objetivo.substring(0, 100)}...`)
      console.log(`   Priorizado: ${ejemplo.priorizado ? 'Sí' : 'No'}`)
      console.log(`   Actividades: ${ejemplo.actividades?.length || 0}`)
    }

    return {
      totalObjetivos,
      porCategoria,
      porTipo,
      ejemplo,
    }
  } catch (error) {
    console.log(`❌ Error validando BD: ${error.message}`)
    return null
  }
}

/**
 * Prueba 5: Validar archivos generados
 */
async function test5_ValidarArchivos() {
  console.log('\n' + '='.repeat(60))
  console.log('TEST 5: Validar Archivos Generados (CSV/JSON)')
  console.log('='.repeat(60))

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️  Saltando prueba - Falta configuración de Supabase')
    return null
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const { data: archivos, error } = await supabase
      .from('documentos_transformados')
      .select('*')
      .eq('tipo_documento', 'bases_curriculares')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.log(`❌ Error consultando archivos: ${error.message}`)
      return null
    }

    console.log(`📁 Últimos ${archivos.length} archivos generados:`)

    archivos.forEach((archivo: any, index: number) => {
      console.log(`\n${index + 1}. ${archivo.nombre_archivo}`)
      console.log(`   - Formato: ${archivo.formato}`)
      console.log(`   - Tamaño: ${(archivo.tamaño_bytes / 1024).toFixed(2)} KB`)
      console.log(`   - Registros: ${archivo.num_registros}`)
      console.log(`   - Creado: ${new Date(archivo.created_at).toLocaleString()}`)

      if (archivo.resumen_contenido) {
        console.log(`   - Resumen:`)
        console.log(`      • Asignaturas: ${archivo.resumen_contenido.asignaturas_procesadas || 'N/A'}`)
        console.log(`      • Objetivos: ${archivo.resumen_contenido.total_objetivos || 'N/A'}`)
        console.log(`      • Priorizados: ${archivo.resumen_contenido.objetivos_priorizados || 'N/A'}`)
      }
    })

    return archivos
  } catch (error) {
    console.log(`❌ Error validando archivos: ${error.message}`)
    return null
  }
}

// ============================================
// FUNCIÓN AUXILIAR: Extraer asignaturas
// ============================================

function extraerAsignaturas(html: string, baseUrl: string) {
  const links: any[] = []

  // ESTRUCTURA 1: .subject-grades
  const patron1 = /<div[^>]*class=[^>]*subject-grades[^>]*>[\s\S]*?<span[^>]*class=[^>]*subject-title[^>]*>([^<]*)<\/span>[\s\S]*?<div[^>]*class=[^>]*grades-wrapper[^>]*>([\s\S]*?)<\/div>/gi

  let match
  while ((match = patron1.exec(html)) !== null) {
    const asignatura = match[1].trim()
    const gradesWrapper = match[2]

    const patronCurso = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi
    let matchCurso

    while ((matchCurso = patronCurso.exec(gradesWrapper)) !== null) {
      const href = matchCurso[1]
      const curso = matchCurso[2].trim()

      links.push({
        nombre: `${asignatura} ${curso}`,
        url: href.startsWith('http') ? href : `https://www.curriculumnacional.cl${href}`,
      })
    }
  }

  // ESTRUCTURA 2: Enlaces directos con niveles
  if (links.length === 0) {
    const patron2 = /<a[^>]*href=["']([^"']*\/curriculum\/[^"']+)["'][^>]*>([^<]+)<\/a>/gi

    while ((match = patron2.exec(html)) !== null) {
      const href = match[1]
      const texto = match[2].trim()

      const tieneNivel = /\/(1-basico|2-basico|3-basico|4-basico|5-basico|6-basico|7-basico|8-basico|1-medio|2-medio|3-medio|4-medio|sc|nm|nt)/i.test(href)

      if (tieneNivel && texto.length > 3 && texto.length < 100) {
        links.push({
          nombre: texto,
          url: href.startsWith('http') ? href : `https://www.curriculumnacional.cl${href}`,
        })
      }
    }
  }

  // ESTRUCTURA 3: Fallback genérico
  if (links.length === 0) {
    const patron3 = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi

    while ((match = patron3.exec(html)) !== null) {
      const href = match[1]
      const texto = match[2].trim()

      if (href.includes('/curriculum/') && texto.length > 5 && texto.length < 100) {
        const esNavegacion = /(documentos|recursos|evaluación|inicio|mineduc|ayuda)/i.test(texto)

        if (!esNavegacion) {
          links.push({
            nombre: texto,
            url: href.startsWith('http') ? href : `https://www.curriculumnacional.cl${href}`,
          })
        }
      }
    }
  }

  // Eliminar duplicados
  const uniqueLinks = links.filter((link, index, self) =>
    index === self.findIndex(l => l.url === link.url)
  )

  return uniqueLinks
}

// ============================================
// EJECUTAR TODAS LAS PRUEBAS
// ============================================

async function main() {
  console.log('🧪 SUITE DE PRUEBAS COMPLETA - Extracción de Bases Curriculares')
  console.log('================================================================\n')

  const resultados: any = {}

  // Test 1: Validar URLs
  resultados.test1 = await test1_ValidarURLs()

  // Test 2: Extraer asignaturas
  resultados.test2 = await test2_ExtraerAsignaturas()

  // Test 3: Invocar Edge Function (requiere Supabase configurado)
  // resultados.test3 = await test3_InvocarEdgeFunction()

  // Test 4: Validar BD (requiere Supabase configurado)
  // resultados.test4 = await test4_ValidarBaseDeDatos()

  // Test 5: Validar archivos (requiere Supabase configurado)
  // resultados.test5 = await test5_ValidarArchivos()

  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN FINAL')
  console.log('='.repeat(60))

  console.log(`\n✅ Test 1 (URLs): ${resultados.test1?.exitosas || 0}/${CATEGORY_URLS.length} exitosas`)
  console.log(`✅ Test 2 (Asignaturas): ${resultados.test2?.reduce((sum: number, r: any) => sum + r.count, 0) || 0} asignaturas extraídas`)

  console.log('\n💡 Para ejecutar Tests 3-5, configura las variables de entorno:')
  console.log('   export NEXT_PUBLIC_SUPABASE_URL="..."')
  console.log('   export SUPABASE_SERVICE_ROLE_KEY="..."')
  console.log('\n   Luego descomenta las líneas en main()')
}

if (import.meta.main) {
  main()
}
