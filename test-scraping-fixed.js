/**
 * Script de prueba con patrones CORREGIDOS
 * Usa datos de ejemplo sin necesitar conexión a internet
 */

// ============================================
// DATOS DE EJEMPLO
// ============================================

const HTML_PAGINA_PRINCIPAL = `
<div class="asignatura">
  <a href="/curriculum/artes-visuales/1-basico">Artes Visuales 1° Básico</a>
</div>
<div class="asignatura">
  <a href="/curriculum/ciencias-naturales/1-basico">Ciencias Naturales 1° Básico</a>
</div>
<div class="asignatura">
  <a href="/curriculum/lenguaje/2-basico">Lenguaje 2° Básico</a>
</div>
`

const HTML_ASIGNATURA_TIPO_A = `
<div class="oa-cnt">
  <div class="oa-eje">Expresar y crear visualmente</div>
  <div class="oa-numero">AR01 OA 01</div>
  <div class="oa-descripcion">Expresar y crear trabajos de arte a partir de la observación del entorno natural.</div>
  <div class="oa-basal">Basal</div>
</div>
<div class="oa-cnt">
  <div class="oa-eje">Expresar y crear visualmente</div>
  <div class="oa-numero">AR01 OA 02</div>
  <div class="oa-descripcion">Experimentar y aplicar elementos del lenguaje visual en sus trabajos de arte.</div>
</div>
<div class="oa-cnt">
  <div class="oa-eje">Apreciar y responder frente al arte</div>
  <div class="oa-numero">AR01 OA 03</div>
  <div class="oa-descripcion">Observar y comunicar oralmente sus primeras impresiones.</div>
  <div class="oa-basal">Basal</div>
</div>
`

const HTML_ASIGNATURA_TIPO_B = `
<div class="items-wrapper">
  <h3>Números y operaciones</h3>
  <div class="item-wrapper">
    <div class="oa-title">MA01 OA 01</div>
    <div class="field__item">Contar números del 0 al 100.</div>
    <div class="prioritized">Prioritario</div>
  </div>
  <div class="item-wrapper">
    <div class="oa-title">MA01 OA 02</div>
    <div class="field__item">Identificar el orden de los elementos de una serie.</div>
  </div>
</div>
<div class="items-wrapper">
  <h3>Geometría</h3>
  <div class="item-wrapper">
    <div class="oa-title">MA01 OA 13</div>
    <div class="field__item">Identificar en el entorno figuras 3D y figuras 2D.</div>
    <div class="prioritized">Prioritario</div>
  </div>
</div>
`

// ============================================
// FUNCIONES DE EXTRACCIÓN CORREGIDAS
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

function extraerAsignaturasYCursos(html) {
  const links = []
  const BASE_URL = 'https://www.curriculumnacional.cl'

  const patronAsignatura = /<div[^>]*class=[^>]*asignatura[^>]*>[\s\S]*?<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi

  let match
  while ((match = patronAsignatura.exec(html)) !== null) {
    const href = match[1]
    const texto = match[2].trim()

    if (href.includes('/1-basico') || href.includes('/2-basico') ||
        href.includes('/3-basico') || href.includes('/4-basico') ||
        href.includes('/5-basico') || href.includes('/6-basico')) {

      const url = href.startsWith('http') ? href : BASE_URL + href

      if (!links.some(l => l.url === url) && texto.length > 0) {
        links.push({ nombre: limpiarTexto(texto), url })
      }
    }
  }

  return links
}

/**
 * FUNCIÓN MEJORADA: Extrae objetivos con mejor manejo de divs anidados
 */
function extraerObjetivos(html, asignatura, curso) {
  const objetivos = []

  // ESTRUCTURA TIPO B - Mejorada con balanceo de divs
  // Buscar todos los bloques items-wrapper
  let posicion = 0
  while (true) {
    const inicioWrapper = html.indexOf('<div class="items-wrapper">', posicion)
    if (inicioWrapper === -1) break

    // Encontrar el cierre del div balanceando apertura/cierre
    let nivel = 0
    let i = inicioWrapper
    let inicioContador = -1

    while (i < html.length) {
      if (html.substr(i, 4) === '<div') {
        if (inicioContador === -1) inicioContador = i
        nivel++
        i += 4
      } else if (html.substr(i, 6) === '</div>') {
        nivel--
        if (nivel === 0 && inicioContador !== -1) {
          // Encontramos el cierre
          const bloqueEje = html.substring(inicioWrapper, i + 6)

          // Extraer eje
          const ejeTitleMatch = bloqueEje.match(/<h3[^>]*>([^<]*)<\/h3>/i)
          const ejeNombre = ejeTitleMatch ? limpiarTexto(ejeTitleMatch[1]) : ''

          // Extraer item-wrappers dentro de este bloque
          const itemWrappers = []
          let posItem = 0
          while (true) {
            const inicioItem = bloqueEje.indexOf('<div class="item-wrapper">', posItem)
            if (inicioItem === -1) break

            // Buscar cierre del item-wrapper
            let nivelItem = 0
            let j = inicioItem
            while (j < bloqueEje.length) {
              if (bloqueEje.substr(j, 4) === '<div') {
                nivelItem++
                j += 4
              } else if (bloqueEje.substr(j, 6) === '</div>') {
                nivelItem--
                if (nivelItem === 0) {
                  itemWrappers.push(bloqueEje.substring(inicioItem, j + 6))
                  posItem = j + 6
                  break
                }
                j += 6
              } else {
                j++
              }
            }
          }

          // Procesar cada item-wrapper
          for (const itemHtml of itemWrappers) {
            try {
              const codigoMatch = itemHtml.match(/<div[^>]*class=[^>]*oa-title[^>]*>([^<]*)<\/div>/i)
              const codigo = codigoMatch ? limpiarTexto(codigoMatch[1]) : ''

              if (!codigo || !validarCodigoOA(codigo)) continue

              const objetivoMatch = itemHtml.match(/<div[^>]*class=[^>]*field__item[^>]*>([^<]*)<\/div>/i)
              const objetivo = objetivoMatch ? limpiarTexto(objetivoMatch[1]) : ''

              const esPriorizado = itemHtml.includes('class="prioritized"')

              objetivos.push({
                asignatura,
                oa_codigo: codigo,
                eje: ejeNombre,
                objetivo: objetivo,
                priorizado: esPriorizado ? 1 : 0,
              })
            } catch (error) {
              console.error('Error procesando item-wrapper:', error)
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

    if (nivel !== 0) {
      // No se pudo balancear, saltar
      posicion = inicioWrapper + 1
    }
  }

  // Si no se encontró estructura Tipo B, intentar Tipo A
  if (objetivos.length === 0) {
    // ESTRUCTURA TIPO A - Mejorada con balanceo de divs
    posicion = 0
    while (true) {
      const inicioCnt = html.indexOf('<div class="oa-cnt">', posicion)
      if (inicioCnt === -1) break

      // Encontrar cierre balanceado
      let nivel = 0
      let i = inicioCnt

      while (i < html.length) {
        if (html.substring(i, i + 4) === '<div') {
          nivel++
          i += 4
        } else if (html.substring(i, i + 6) === '</div>') {
          nivel--
          if (nivel === 0) {
            const bloqueOA = html.substring(inicioCnt, i + 6)

            try {
              const ejeMatch = bloqueOA.match(/<div[^>]*class=[^>]*oa-eje[^>]*>([^<]*)<\/div>/i)
              const eje = ejeMatch ? limpiarTexto(ejeMatch[1]) : ''

              const codigoMatch = bloqueOA.match(/<div[^>]*class=[^>]*oa-numero[^>]*>([^<]*)<\/div>/i)
              const codigo = codigoMatch ? limpiarTexto(codigoMatch[1]) : ''

              if (!codigo || !validarCodigoOA(codigo)) {
                posicion = i + 6
                break
              }

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
            } catch (error) {
              console.error('Error procesando oa-cnt:', error)
            }

            posicion = i + 6
            break
          }
          i += 6
        } else {
          i++
        }
      }

      if (nivel !== 0) {
        // No se pudo balancear
        posicion = inicioCnt + 1
      }
    }
  }

  return objetivos
}

// ============================================
// FUNCIÓN PRINCIPAL DE PRUEBA
// ============================================

function testScrapingOffline() {
  console.log('🧪 INICIANDO PRUEBA DE SCRAPING (VERSIÓN CORREGIDA)')
  console.log('====================================================\n')

  let totalTests = 0
  let passedTests = 0

  // TEST 1: Extraer asignaturas
  console.log('📋 TEST 1: Extracción de asignaturas')
  console.log('─────────────────────────────────────')
  try {
    const asignaturas = extraerAsignaturasYCursos(HTML_PAGINA_PRINCIPAL)

    console.log(`✅ Asignaturas encontradas: ${asignaturas.length}`)
    asignaturas.forEach((asig, i) => {
      console.log(`  ${i + 1}. ${asig.nombre}`)
    })

    totalTests++
    if (asignaturas.length === 3) {
      console.log('✅ PASS: 3 asignaturas correctas\n')
      passedTests++
    } else {
      console.log(`❌ FAIL: Esperadas 3, encontradas ${asignaturas.length}\n`)
    }
  } catch (error) {
    console.error('❌ FAIL:', error.message, '\n')
    totalTests++
  }

  // TEST 2: Tipo A
  console.log('📋 TEST 2: Extracción OAs (Tipo A)')
  console.log('───────────────────────────────────')
  try {
    const objetivosTipoA = extraerObjetivos(HTML_ASIGNATURA_TIPO_A, 'Artes Visuales', '1° Básico')

    console.log(`✅ Objetivos extraídos: ${objetivosTipoA.length}`)
    objetivosTipoA.forEach((obj, i) => {
      console.log(`  ${i + 1}. ${obj.oa_codigo} - Priorizado: ${obj.priorizado === 1 ? 'Sí' : 'No'}`)
    })

    totalTests++
    const priorizados = objetivosTipoA.filter(o => o.priorizado === 1).length
    if (objetivosTipoA.length === 3 && priorizados === 2) {
      console.log(`✅ PASS: 3 OAs (2 priorizados)\n`)
      passedTests++
    } else {
      console.log(`❌ FAIL: Esperados 3 OAs (2 prio), encontrados ${objetivosTipoA.length} (${priorizados} prio)\n`)
    }
  } catch (error) {
    console.error('❌ FAIL:', error.message, '\n')
    totalTests++
  }

  // TEST 3: Tipo B
  console.log('📋 TEST 3: Extracción OAs (Tipo B)')
  console.log('───────────────────────────────────')
  try {
    const objetivosTipoB = extraerObjetivos(HTML_ASIGNATURA_TIPO_B, 'Matemática', '1° Básico')

    console.log(`✅ Objetivos extraídos: ${objetivosTipoB.length}`)
    objetivosTipoB.forEach((obj, i) => {
      console.log(`  ${i + 1}. ${obj.oa_codigo} - ${obj.eje} - Priorizado: ${obj.priorizado === 1 ? 'Sí' : 'No'}`)
    })

    totalTests++
    const priorizados = objetivosTipoB.filter(o => o.priorizado === 1).length
    if (objetivosTipoB.length === 3 && priorizados === 2) {
      console.log(`✅ PASS: 3 OAs (2 priorizados)\n`)
      passedTests++
    } else {
      console.log(`❌ FAIL: Esperados 3 OAs (2 prio), encontrados ${objetivosTipoB.length} (${priorizados} prio)\n`)
    }
  } catch (error) {
    console.error('❌ FAIL:', error.message, '\n')
    totalTests++
  }

  // TEST 4: Validación
  console.log('📋 TEST 4: Validación de códigos')
  console.log('─────────────────────────────────')
  const validos = ['AR01 OA 01', 'MA01 OA 02'].every(validarCodigoOA)
  const invalidos = ['AR01', 'INVALID'].every(c => !validarCodigoOA(c))

  totalTests++
  if (validos && invalidos) {
    console.log('✅ PASS: Validación correcta\n')
    passedTests++
  } else {
    console.log('❌ FAIL: Validación incorrecta\n')
  }

  // RESUMEN
  console.log('\n====================================================')
  console.log('📊 RESUMEN')
  console.log('====================================================')
  console.log(`Tests: ${passedTests}/${totalTests} (${((passedTests / totalTests) * 100).toFixed(0)}%)`)

  if (passedTests === totalTests) {
    console.log('\n✅ TODAS LAS PRUEBAS PASARON')
    console.log('✅ La lógica de scraping funciona correctamente')
  } else {
    console.log('\n❌ ALGUNAS PRUEBAS FALLARON')
  }

  return passedTests === totalTests
}

// Ejecutar
const success = testScrapingOffline()
process.exit(success ? 0 : 1)
