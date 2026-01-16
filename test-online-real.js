/**
 * Script de prueba ONLINE con datos REALES del sitio curriculumnacional.cl
 * Uso: node test-online-real.js
 */

const CONFIG = {
  BASE_URL: 'https://www.curriculumnacional.cl',
  START_URL: 'https://www.curriculumnacional.cl/curriculum/1o-6o-basico/',
  USER_AGENT: 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0)',
  DELAY: 500,
  MAX_ASIGNATURAS_PRUEBA: 2, // Limitar para prueba rápida
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function limpiarTexto(texto) {
  return texto.replace(/\s+/g, ' ').trim()
}

function validarCodigoOA(codigo) {
  // IMPORTANTE: Este patrón está definido en supabase/functions/extraer-bases-curriculares/constants.ts
  // como PATRON_VALIDACION_OA. Mantener ambos sincronizados.
  const patron = /^[A-Z]{2,4}\d{2}\s+OA\s+\d{1,2}$/i
  return patron.test(codigo.trim())
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`  📡 Fetching: ${url.substring(0, 80)}...`)

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
      await sleep(CONFIG.DELAY)

      return html
    } catch (error) {
      console.error(`  ⚠️  Intento ${attempt + 1}/${retries} falló: ${error.message}`)

      if (attempt === retries - 1) {
        throw error
      }

      await sleep(1000 * Math.pow(2, attempt))
    }
  }

  throw new Error('fetchWithRetry failed')
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

      if (!links.some(l => l.url === url) && texto.length > 0) {
        links.push({ nombre: limpiarTexto(texto), url })
      }
    }
  }

  return links
}

function extraerObjetivos(html, asignatura, curso) {
  const objetivos = []

  // ESTRUCTURA TIPO B - Con balanceo de divs
  let posicion = 0
  let foundTipoB = false

  while (true) {
    const inicioWrapper = html.indexOf('<div class="items-wrapper">', posicion)
    if (inicioWrapper === -1) break

    let nivel_div = 0
    let i = inicioWrapper
    let inicioContador = -1

    while (i < html.length) {
      if (html.substr(i, 4) === '<div') {
        if (inicioContador === -1) inicioContador = i
        nivel_div++
        i += 4
      } else if (html.substr(i, 6) === '</div>') {
        nivel_div--
        if (nivel_div === 0 && inicioContador !== -1) {
          const bloqueEje = html.substring(inicioWrapper, i + 6)
          foundTipoB = true

          const ejeTitleMatch = bloqueEje.match(/<h3[^>]*>([^<]*)<\/h3>/i)
          const ejeNombre = ejeTitleMatch ? limpiarTexto(ejeTitleMatch[1]) : ''

          let posItem = 0
          while (true) {
            const inicioItem = bloqueEje.indexOf('<div class="item-wrapper">', posItem)
            if (inicioItem === -1) break

            let nivelItem = 0
            let j = inicioItem
            while (j < bloqueEje.length) {
              if (bloqueEje.substr(j, 4) === '<div') {
                nivelItem++
                j += 4
              } else if (bloqueEje.substr(j, 6) === '</div>') {
                nivelItem--
                if (nivelItem === 0) {
                  const itemHtml = bloqueEje.substring(inicioItem, j + 6)

                  try {
                    const codigoMatch = itemHtml.match(/<div[^>]*class=[^>]*oa-title[^>]*>([^<]*)<\/div>/i)
                    const codigo = codigoMatch ? limpiarTexto(codigoMatch[1]) : ''

                    if (codigo && validarCodigoOA(codigo)) {
                      const objetivoMatch = itemHtml.match(/<div[^>]*class=[^>]*field__item[^>]*>([^<]*)<\/div>/i)
                      const objetivo = objetivoMatch ? limpiarTexto(objetivoMatch[1]) : ''

                      const esPriorizado = itemHtml.includes('class="prioritized"') || itemHtml.includes('"prioritized"')

                      objetivos.push({
                        asignatura,
                        oa_codigo: codigo,
                        eje: ejeNombre,
                        objetivo: objetivo,
                        priorizado: esPriorizado ? 1 : 0,
                      })
                    }
                  } catch (error) {
                    console.error('    Error procesando item:', error)
                  }

                  posItem = j + 6
                  break
                }
                j += 6
              } else {
                j++
              }
            }
          }

          posicion = i + 6
          break
        }
        i += 6
      } else {
        i++
      }
    }

    if (nivel_div !== 0) {
      posicion = inicioWrapper + 1
    }
  }

  // ESTRUCTURA TIPO A (.oa-cnt)
  if (!foundTipoB) {
    posicion = 0

    while (true) {
      const inicioCnt = html.indexOf('<div class="oa-cnt">', posicion)
      if (inicioCnt === -1) break

      let nivel_div = 0
      let i = inicioCnt

      while (i < html.length) {
        if (html.substr(i, 4) === '<div') {
          nivel_div++
          i += 4
        } else if (html.substr(i, 6) === '</div>') {
          nivel_div--
          if (nivel_div === 0) {
            const bloqueOA = html.substring(inicioCnt, i + 6)

            try {
              const ejeMatch = bloqueOA.match(/<div[^>]*class=[^>]*oa-eje[^>]*>([^<]*)<\/div>/i)
              const eje = ejeMatch ? limpiarTexto(ejeMatch[1]) : ''

              const codigoMatch = bloqueOA.match(/<div[^>]*class=[^>]*oa-numero[^>]*>([^<]*)<\/div>/i)
              const codigo = codigoMatch ? limpiarTexto(codigoMatch[1]) : ''

              if (codigo && validarCodigoOA(codigo)) {
                const objetivoMatch = bloqueOA.match(/<div[^>]*class=[^>]*oa-descripcion[^>]*>([^<]*)<\/div>/i)
                const objetivo = objetivoMatch ? limpiarTexto(objetivoMatch[1]) : ''

                const esBasal = bloqueOA.includes('class="oa-basal"')

                objetivos.push({
                  asignatura,
                  oa_codigo: codigo,
                  eje: eje,
                  objetivo: objetivo,
                  priorizado: esBasal ? 1 : 0,
                })
              }
            } catch (error) {
              console.error('    Error procesando oa-cnt:', error)
            }

            posicion = i + 6
            break
          }
          i += 6
        } else {
          i++
        }
      }

      if (nivel_div !== 0) {
        posicion = inicioCnt + 1
      }
    }
  }

  return objetivos
}

// ============================================
// FUNCIÓN PRINCIPAL DE PRUEBA ONLINE
// ============================================

async function testOnline() {
  console.log('🌐 INICIANDO PRUEBA ONLINE CON DATOS REALES')
  console.log('============================================\n')

  const startTime = Date.now()

  try {
    // 1. Obtener página principal
    console.log('📡 PASO 1: Obteniendo página principal...')
    console.log(`URL: ${CONFIG.START_URL}\n`)

    const htmlPrincipal = await fetchWithRetry(CONFIG.START_URL)

    console.log(`✅ HTML descargado: ${(htmlPrincipal.length / 1024).toFixed(2)} KB\n`)

    // Guardar muestra del HTML para análisis
    console.log('📋 Analizando estructura HTML...')
    const muestraHTML = htmlPrincipal.substring(0, 2000)
    const tieneAsignaturas = muestraHTML.includes('class="asignatura"')
    console.log(`  - Contiene 'class="asignatura"': ${tieneAsignaturas ? '✅' : '❌'}`)

    // 2. Extraer asignaturas
    console.log('\n📚 PASO 2: Extrayendo asignaturas...\n')

    const asignaturas = extraerAsignaturasYCursos(htmlPrincipal)

    if (asignaturas.length === 0) {
      console.error('❌ ERROR: No se encontraron asignaturas')
      console.log('\n📋 Muestra del HTML (primeros 1500 caracteres):')
      console.log(htmlPrincipal.substring(0, 1500))
      console.log('\n💡 ANÁLISIS: El sitio web puede haber cambiado su estructura HTML')
      console.log('   Revisar si la clase CSS "asignatura" sigue existiendo')
      return
    }

    console.log(`✅ Asignaturas encontradas: ${asignaturas.length}\n`)

    console.log('📚 Primeras 10 asignaturas:')
    asignaturas.slice(0, 10).forEach((asig, i) => {
      console.log(`  ${(i + 1).toString().padStart(2, '0')}. ${asig.nombre}`)
    })

    console.log(`\n... (${asignaturas.length - 10} más)\n`)

    // 3. Probar extracción de OAs con primeras asignaturas
    console.log(`🎯 PASO 3: Probando extracción de OAs (${CONFIG.MAX_ASIGNATURAS_PRUEBA} asignaturas)...\n`)

    const asignaturasAPrueba = asignaturas.slice(0, CONFIG.MAX_ASIGNATURAS_PRUEBA)
    const todosLosObjetivos = []

    for (const asig of asignaturasAPrueba) {
      try {
        console.log(`\n📖 Procesando: ${asig.nombre}`)
        console.log(`   URL: ${asig.url}`)

        const htmlAsignatura = await fetchWithRetry(asig.url)
        console.log(`   ✅ HTML descargado: ${(htmlAsignatura.length / 1024).toFixed(2)} KB`)

        // Analizar estructura
        const tipoA = htmlAsignatura.includes('class="oa-cnt"')
        const tipoB = htmlAsignatura.includes('class="items-wrapper"')

        console.log(`   📊 Estructura detectada:`)
        console.log(`      - Tipo A (.oa-cnt): ${tipoA ? '✅' : '❌'}`)
        console.log(`      - Tipo B (.items-wrapper): ${tipoB ? '✅' : '❌'}`)

        const partes = asig.nombre.split(/\s+/)
        const curso = partes[partes.length - 2] + ' ' + partes[partes.length - 1]
        const nombreAsignatura = partes.slice(0, -2).join(' ')

        const objetivos = extraerObjetivos(htmlAsignatura, nombreAsignatura, curso)

        console.log(`   ✅ Objetivos extraídos: ${objetivos.length}`)

        if (objetivos.length > 0) {
          const priorizados = objetivos.filter(o => o.priorizado === 1).length
          console.log(`   ⭐ Priorizados: ${priorizados}/${objetivos.length}`)

          console.log(`\n   📋 Primeros 5 OAs:`)
          objetivos.slice(0, 5).forEach((obj, i) => {
            console.log(`      ${i + 1}. ${obj.oa_codigo} [${obj.priorizado ? '⭐' : '  '}]`)
            console.log(`         Eje: ${obj.eje}`)
            console.log(`         ${obj.objetivo.substring(0, 60)}...`)
          })

          if (objetivos.length > 5) {
            console.log(`      ... (${objetivos.length - 5} OAs más)`)
          }

          todosLosObjetivos.push(...objetivos)
        } else {
          console.log(`   ⚠️  NO se extrajeron objetivos`)
          console.log('\n   📋 Muestra del HTML (primeros 800 caracteres):')
          console.log(htmlAsignatura.substring(0, 800))
        }

      } catch (error) {
        console.error(`\n   ❌ Error: ${error.message}`)
      }
    }

    // 4. Resumen
    const duracion = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('\n\n============================================')
    console.log('📊 RESUMEN DE PRUEBA ONLINE')
    console.log('============================================')
    console.log(`⏱️  Duración total: ${duracion}s`)
    console.log(`🌐 Conectividad: ✅ OK`)
    console.log(`📚 Asignaturas encontradas: ${asignaturas.length}`)
    console.log(`🧪 Asignaturas probadas: ${asignaturasAPrueba.length}`)
    console.log(`🎯 Total OAs extraídos: ${todosLosObjetivos.length}`)

    if (todosLosObjetivos.length > 0) {
      const priorizados = todosLosObjetivos.filter(o => o.priorizado === 1).length
      console.log(`⭐ OAs priorizados: ${priorizados} (${((priorizados / todosLosObjetivos.length) * 100).toFixed(1)}%)`)
      console.log(`📈 Promedio OAs/asignatura: ${(todosLosObjetivos.length / asignaturasAPrueba.length).toFixed(1)}`)

      console.log('\n✅ PRUEBA ONLINE EXITOSA')
      console.log('✅ El scraping funciona con datos reales del sitio')
      console.log('✅ La estructura HTML del sitio es compatible con nuestros patrones')
    } else {
      console.log('\n❌ PRUEBA ONLINE FALLIDA')
      console.log('❌ No se extrajeron objetivos')
      console.log('⚠️  Posibles causas:')
      console.log('   - La estructura HTML del sitio cambió')
      console.log('   - Los selectores CSS necesitan actualización')
      console.log('   - El sitio usa JavaScript para cargar contenido dinámico')
    }

    // Estimación para producción
    if (asignaturas.length > 0 && todosLosObjetivos.length > 0) {
      const promedioOAs = todosLosObjetivos.length / asignaturasAPrueba.length
      const totalEstimado = Math.round(asignaturas.length * promedioOAs)
      const tiempoEstimado = (asignaturas.length * (duracion / asignaturasAPrueba.length))

      console.log('\n📊 ESTIMACIÓN PARA PRODUCCIÓN:')
      console.log(`   Total asignaturas: ${asignaturas.length}`)
      console.log(`   OAs estimados: ~${totalEstimado}`)
      console.log(`   Tiempo estimado: ~${(tiempoEstimado / 60).toFixed(1)} minutos`)
    }

  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBA ONLINE:', error.message)

    if (error.message.includes('fetch failed') || error.message.includes('network')) {
      console.log('\n💡 DIAGNÓSTICO: Problema de conectividad')
      console.log('   - Verificar conexión a internet')
      console.log('   - El sitio puede estar bloqueando requests automáticos')
      console.log('   - Intentar con diferentes User-Agent o proxy')
    }

    if (error.stack) {
      console.error('\n📋 Stack trace:')
      console.error(error.stack)
    }
  }
}

// Ejecutar prueba
console.log('Iniciando en 2 segundos...\n')
setTimeout(testOnline, 2000)
