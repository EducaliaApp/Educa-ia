/**
 * Script de prueba simplificado para validar la lógica de scraping
 * Versión compatible con Node.js
 *
 * Uso: node test-scraping-node.js
 */

// ============================================
// CONFIGURACIÓN
// ============================================

const CONFIG = {
  BASE_URL: 'https://www.curriculumnacional.cl',
  START_URL: 'https://www.curriculumnacional.cl/curriculum/1o-6o-basico/',
  DELAY_BETWEEN_REQUESTS: 500,
  MAX_RETRIES: 3,
  USER_AGENT: 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0; +https://profeflow.cl)',
  // Para prueba: solo 2 asignaturas
  MAX_ASIGNATURAS: 2,
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function limpiarTexto(texto) {
  return texto.replace(/\s+/g, ' ').trim()
}

function validarCodigoOA(codigo) {
  const patron = /^[A-Z]{2,4}\d{2}\s+OA\s+\d{1,2}$/i
  return patron.test(codigo.trim())
}

function validarURL(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry(url, retries = CONFIG.MAX_RETRIES) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`  📡 Fetching: ${url.substring(0, 60)}...`)

      const response = await fetch(url, {
        headers: {
          'User-Agent': CONFIG.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-CL,es;q=0.9',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()

      await sleep(CONFIG.DELAY_BETWEEN_REQUESTS)

      return html
    } catch (error) {
      const errorMessage = error.message || 'Error desconocido'
      console.error(`  ⚠️  Intento ${attempt + 1}/${retries} falló: ${errorMessage}`)

      if (attempt === retries - 1) {
        throw new Error(`Falló después de ${retries} intentos: ${errorMessage}`)
      }

      await sleep(1000 * Math.pow(2, attempt))
    }
  }

  throw new Error('fetchWithRetry: No se pudo completar la solicitud')
}

function extraerAsignaturasYCursos(html) {
  const links = []

  const patronAsignatura = /<div[^>]*class=[^>]*asignatura[^>]*>[\s\S]*?<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi

  let match
  while ((match = patronAsignatura.exec(html)) !== null) {
    const href = match[1]
    const texto = match[2].trim()

    if (href.includes('/1-basico') || href.includes('/2-basico') ||
        href.includes('/3-basico') || href.includes('/4-basico') ||
        href.includes('/5-basico') || href.includes('/6-basico')) {

      const url = href.startsWith('http') ? href : CONFIG.BASE_URL + href

      if (!validarURL(url)) {
        console.warn(`  ⚠️  URL inválida ignorada: ${url}`)
        continue
      }

      if (!links.some(l => l.url === url) && texto.length > 0) {
        links.push({ nombre: limpiarTexto(texto), url })
      }
    }
  }

  return links
}

function extraerObjetivos(html, asignatura, curso) {
  const objetivos = []

  // INTENTAR ESTRUCTURA TIPO B PRIMERO
  const patronItemsWrapper = /<div[^>]*class=[^>]*items-wrapper[^>]*>([\s\S]*?)<\/div>(?=\s*<div[^>]*class=[^>]*items-wrapper|\s*<\/)/gi
  let matchWrapper
  let foundTipoB = false

  while ((matchWrapper = patronItemsWrapper.exec(html)) !== null) {
    const bloqueEje = matchWrapper[1]

    const ejeTitleMatch = bloqueEje.match(/<h3[^>]*>([^<]*)<\/h3>/i)
    const ejeNombre = ejeTitleMatch ? limpiarTexto(ejeTitleMatch[1]) : ''

    const patronItemWrapper = /<div[^>]*class=[^>]*item-wrapper[^>]*>([\s\S]*?)<\/div>(?=\s*<div[^>]*class=[^>]*item-wrapper|<\/div>)/gi
    let matchItem

    while ((matchItem = patronItemWrapper.exec(bloqueEje)) !== null) {
      const bloqueOA = matchItem[1]
      foundTipoB = true

      try {
        const codigoMatch = bloqueOA.match(/<[^>]*class=[^>]*oa-title[^>]*>([^<]*)<\/[^>]*>/i)
        const codigo = codigoMatch ? limpiarTexto(codigoMatch[1]) : ''

        if (!codigo) continue

        if (!validarCodigoOA(codigo)) {
          console.warn(`    ⚠️  Código OA inválido: ${codigo}`)
          continue
        }

        const objetivoMatch = bloqueOA.match(/<[^>]*class=[^>]*field__item[^>]*>([^<]*)<\/[^>]*>/i)
        const objetivo = objetivoMatch ? limpiarTexto(objetivoMatch[1]) : ''

        const esPriorizado = /<[^>]*class=[^>]*prioritized[^>]*>/i.test(bloqueOA)

        objetivos.push({
          asignatura,
          oa_codigo: codigo,
          eje: ejeNombre,
          objetivo: objetivo,
          priorizado: esPriorizado ? 1 : 0,
        })
      } catch (error) {
        console.error('    ❌ Error extrayendo OA (Tipo B):', error)
        continue
      }
    }
  }

  // SI NO SE ENCONTRÓ ESTRUCTURA TIPO B, INTENTAR TIPO A
  if (!foundTipoB) {
    const patronOA = /<div[^>]*class=[^>]*oa-cnt[^>]*>([\s\S]*?)<\/div>(?=\s*<div[^>]*class=[^>]*oa-cnt|$)/gi

    let matchOA
    while ((matchOA = patronOA.exec(html)) !== null) {
      const bloqueOA = matchOA[1]

      try {
        const ejeMatch = bloqueOA.match(/<[^>]*class=[^>]*oa-eje[^>]*>([^<]*)<\/[^>]*>/i)
        const eje = ejeMatch ? limpiarTexto(ejeMatch[1]) : ''

        const codigoMatch = bloqueOA.match(/<[^>]*class=[^>]*oa-numero[^>]*>([^<]*)<\/[^>]*>/i)
        const codigo = codigoMatch ? limpiarTexto(codigoMatch[1]) : ''

        if (!codigo) continue

        if (!validarCodigoOA(codigo)) {
          console.warn(`    ⚠️  Código OA inválido: ${codigo}`)
          continue
        }

        const objetivoMatch = bloqueOA.match(/<[^>]*class=[^>]*oa-descripcion[^>]*>([^<]*)<\/[^>]*>/i)
        const objetivo = objetivoMatch ? limpiarTexto(objetivoMatch[1]) : ''

        const esBasal = /<[^>]*class=[^>]*oa-basal[^>]*>/i.test(bloqueOA)

        objetivos.push({
          asignatura,
          oa_codigo: codigo,
          eje: eje,
          objetivo: objetivo,
          priorizado: esBasal ? 1 : 0,
        })
      } catch (error) {
        console.error('    ❌ Error extrayendo OA (Tipo A):', error)
        continue
      }
    }
  }

  return objetivos
}

// ============================================
// FUNCIÓN PRINCIPAL DE PRUEBA
// ============================================

async function testScraping() {
  console.log('🧪 INICIANDO PRUEBA DE SCRAPING')
  console.log('================================\n')

  const startTime = Date.now()

  try {
    // 1. Obtener página principal
    console.log('📡 Paso 1: Obteniendo página principal...')
    const htmlPrincipal = await fetchWithRetry(CONFIG.START_URL)
    console.log(`  ✅ HTML descargado: ${(htmlPrincipal.length / 1024).toFixed(2)} KB\n`)

    // 2. Extraer asignaturas
    console.log('🔍 Paso 2: Extrayendo asignaturas...')
    const asignaturas = extraerAsignaturasYCursos(htmlPrincipal)
    console.log(`  ✅ Encontradas ${asignaturas.length} asignaturas\n`)

    if (asignaturas.length === 0) {
      console.error('  ❌ ERROR: No se encontraron asignaturas')
      console.log('\n📋 Muestra del HTML (primeros 1000 caracteres):')
      console.log(htmlPrincipal.substring(0, 1000))
      return
    }

    // Mostrar primeras 5
    console.log('  📚 Primeras asignaturas encontradas:')
    asignaturas.slice(0, 5).forEach((asig, i) => {
      console.log(`    ${i + 1}. ${asig.nombre}`)
      console.log(`       ${asig.url}`)
    })
    console.log('')

    // 3. Procesar asignaturas (limitado por MAX_ASIGNATURAS)
    const asignaturasAProcesar = asignaturas.slice(0, CONFIG.MAX_ASIGNATURAS)
    console.log(`📊 Paso 3: Procesando ${asignaturasAProcesar.length} asignaturas...\n`)

    const todosLosObjetivos = []

    for (const asig of asignaturasAProcesar) {
      try {
        console.log(`📚 Procesando: ${asig.nombre}`)

        const htmlAsignatura = await fetchWithRetry(asig.url)
        console.log(`  ✅ HTML descargado: ${(htmlAsignatura.length / 1024).toFixed(2)} KB`)

        const partes = asig.nombre.split(/\s+/)
        const curso = partes[partes.length - 2] + ' ' + partes[partes.length - 1]
        const nombreAsignatura = partes.slice(0, -2).join(' ')

        const objetivos = extraerObjetivos(htmlAsignatura, nombreAsignatura, curso)
        console.log(`  ✅ Extraídos ${objetivos.length} objetivos`)

        if (objetivos.length > 0) {
          console.log(`  📋 Primeros 3 OAs:`)
          objetivos.slice(0, 3).forEach((obj, i) => {
            console.log(`    ${i + 1}. ${obj.oa_codigo} - ${obj.eje}`)
            console.log(`       ${obj.objetivo.substring(0, 60)}...`)
            console.log(`       Priorizado: ${obj.priorizado === 1 ? 'Sí' : 'No'}`)
          })
        } else {
          console.log('  ⚠️  NO se extrajeron objetivos - verificar estructura HTML')
          console.log('  📋 Muestra del HTML (primeros 500 caracteres):')
          console.log(htmlAsignatura.substring(0, 500))
        }

        todosLosObjetivos.push(...objetivos)
        console.log('')

      } catch (error) {
        const errorMessage = error.message || 'Error desconocido'
        console.error(`  ❌ Error procesando ${asig.nombre}: ${errorMessage}\n`)
      }
    }

    // 4. Resumen
    const duracion = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('\n================================')
    console.log('📊 RESUMEN DE PRUEBA')
    console.log('================================')
    console.log(`⏱️  Duración: ${duracion}s`)
    console.log(`📚 Asignaturas procesadas: ${asignaturasAProcesar.length}`)
    console.log(`🎯 Total objetivos extraídos: ${todosLosObjetivos.length}`)
    console.log(`⭐ Objetivos priorizados: ${todosLosObjetivos.filter(o => o.priorizado === 1).length}`)
    console.log(`📈 Promedio OAs por asignatura: ${(todosLosObjetivos.length / asignaturasAProcesar.length).toFixed(1)}`)

    if (todosLosObjetivos.length > 0) {
      console.log('\n✅ PRUEBA EXITOSA: El scraping funciona correctamente')
      console.log('\n📋 Ejemplo de datos extraídos:')
      console.log(JSON.stringify(todosLosObjetivos[0], null, 2))
    } else {
      console.log('\n❌ PRUEBA FALLIDA: No se extrajeron objetivos')
      console.log('   Posibles causas:')
      console.log('   - La estructura HTML del sitio cambió')
      console.log('   - Problemas de conectividad')
      console.log('   - Los selectores CSS necesitan actualización')
    }

  } catch (error) {
    const errorMessage = error.message || 'Error desconocido'
    console.error('\n❌ ERROR EN PRUEBA:', errorMessage)
    if (error.stack) {
      console.error('\n📋 Stack trace:')
      console.error(error.stack)
    }
  }
}

// Ejecutar prueba
testScraping().catch(console.error)
