/**
 * Script de prueba OFFLINE para validar la lógica de parsing HTML
 * Usa datos de ejemplo sin necesitar conexión a internet
 *
 * Uso: node test-scraping-offline.js
 */

// ============================================
// DATOS DE EJEMPLO (HTML real del sitio)
// ============================================

const HTML_PAGINA_PRINCIPAL = `
<div class="asignatura">
  <a href="/614/w3-propertyvalue-40318.html">Artes Visuales 1° Básico</a>
</div>
<div class="asignatura">
  <a href="/614/w3-propertyvalue-40319.html">Ciencias Naturales 1° Básico</a>
</div>
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
  <div class="oa-descripcion">Expresar y crear trabajos de arte a partir de la observación del entorno natural (paisaje, animales y plantas), entorno cultural (vida cotidiana y familiar) y entorno artístico (obras de arte locales, chilenas, latinoamericanas y del resto del mundo).</div>
  <div class="oa-basal">Basal</div>
</div>
<div class="oa-cnt">
  <div class="oa-eje">Expresar y crear visualmente</div>
  <div class="oa-numero">AR01 OA 02</div>
  <div class="oa-descripcion">Experimentar y aplicar elementos del lenguaje visual en sus trabajos de arte: línea (gruesa, delgada, recta, ondulada e irregular); color (puros, mezclados, fríos y cálidos); textura (visual y táctil).</div>
</div>
<div class="oa-cnt">
  <div class="oa-eje">Apreciar y responder frente al arte</div>
  <div class="oa-numero">AR01 OA 03</div>
  <div class="oa-descripcion">Observar y comunicar oralmente sus primeras impresiones de lo que sienten y piensan de obras de arte por variados medios.</div>
  <div class="oa-basal">Basal</div>
</div>
`

const HTML_ASIGNATURA_TIPO_B = `
<div class="items-wrapper">
  <h3>Números y operaciones</h3>
  <div class="item-wrapper">
    <div class="oa-title">MA01 OA 01</div>
    <div class="field__item">Contar números del 0 al 100 de 1 en 1, de 2 en 2, de 5 en 5 y de 10 en 10.</div>
    <div class="prioritized">Prioritario</div>
  </div>
  <div class="item-wrapper">
    <div class="oa-title">MA01 OA 02</div>
    <div class="field__item">Identificar el orden de los elementos de una serie, utilizando números ordinales del primero (1°) al décimo (10°).</div>
  </div>
</div>
<div class="items-wrapper">
  <h3>Geometría</h3>
  <div class="item-wrapper">
    <div class="oa-title">MA01 OA 13</div>
    <div class="field__item">Identificar en el entorno figuras 3D y figuras 2D y relacionarlas, usando material concreto.</div>
    <div class="prioritized">Prioritario</div>
  </div>
</div>
`

// ============================================
// FUNCIONES DE EXTRACCIÓN (copiadas del script principal)
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

function testScrapingOffline() {
  console.log('🧪 INICIANDO PRUEBA DE SCRAPING (OFFLINE)')
  console.log('==========================================\n')

  let totalTests = 0
  let passedTests = 0

  // TEST 1: Extraer asignaturas de la página principal
  console.log('📋 TEST 1: Extracción de asignaturas')
  console.log('─────────────────────────────────────')
  try {
    const asignaturas = extraerAsignaturasYCursos(HTML_PAGINA_PRINCIPAL)

    console.log(`✅ Asignaturas encontradas: ${asignaturas.length}`)
    asignaturas.forEach((asig, i) => {
      console.log(`  ${i + 1}. ${asig.nombre}`)
      console.log(`     URL: ${asig.url}`)
    })

    totalTests++
    if (asignaturas.length === 3) {
      console.log('✅ PASS: Se encontraron 3 asignaturas correctamente\n')
      passedTests++
    } else {
      console.log(`❌ FAIL: Se esperaban 3 asignaturas, se encontraron ${asignaturas.length}\n`)
    }
  } catch (error) {
    console.error('❌ FAIL: Error en extracción de asignaturas:', error.message, '\n')
    totalTests++
  }

  // TEST 2: Extraer objetivos estructura TIPO A
  console.log('📋 TEST 2: Extracción de OAs (Estructura Tipo A)')
  console.log('─────────────────────────────────────────────────')
  try {
    const objetivosTipoA = extraerObjetivos(HTML_ASIGNATURA_TIPO_A, 'Artes Visuales', '1° Básico')

    console.log(`✅ Objetivos extraídos: ${objetivosTipoA.length}`)
    objetivosTipoA.forEach((obj, i) => {
      console.log(`  ${i + 1}. ${obj.oa_codigo} - ${obj.eje}`)
      console.log(`     ${obj.objetivo.substring(0, 60)}...`)
      console.log(`     Priorizado: ${obj.priorizado === 1 ? 'Sí' : 'No'}`)

      // Validaciones
      if (!validarCodigoOA(obj.oa_codigo)) {
        console.log(`     ⚠️  Código OA inválido: ${obj.oa_codigo}`)
      }
    })

    totalTests++
    const priorizados = objetivosTipoA.filter(o => o.priorizado === 1).length
    if (objetivosTipoA.length === 3 && priorizados === 2) {
      console.log(`✅ PASS: 3 OAs extraídos correctamente (2 priorizados)\n`)
      passedTests++
    } else {
      console.log(`❌ FAIL: Se esperaban 3 OAs (2 priorizados), se encontraron ${objetivosTipoA.length} (${priorizados} priorizados)\n`)
    }
  } catch (error) {
    console.error('❌ FAIL: Error en extracción Tipo A:', error.message, '\n')
    totalTests++
  }

  // TEST 3: Extraer objetivos estructura TIPO B
  console.log('📋 TEST 3: Extracción de OAs (Estructura Tipo B)')
  console.log('─────────────────────────────────────────────────')
  try {
    const objetivosTipoB = extraerObjetivos(HTML_ASIGNATURA_TIPO_B, 'Matemática', '1° Básico')

    console.log(`✅ Objetivos extraídos: ${objetivosTipoB.length}`)
    objetivosTipoB.forEach((obj, i) => {
      console.log(`  ${i + 1}. ${obj.oa_codigo} - ${obj.eje}`)
      console.log(`     ${obj.objetivo.substring(0, 60)}...`)
      console.log(`     Priorizado: ${obj.priorizado === 1 ? 'Sí' : 'No'}`)

      // Validaciones
      if (!validarCodigoOA(obj.oa_codigo)) {
        console.log(`     ⚠️  Código OA inválido: ${obj.oa_codigo}`)
      }
    })

    totalTests++
    const priorizados = objetivosTipoB.filter(o => o.priorizado === 1).length
    if (objetivosTipoB.length === 3 && priorizados === 2) {
      console.log(`✅ PASS: 3 OAs extraídos correctamente (2 priorizados)\n`)
      passedTests++
    } else {
      console.log(`❌ FAIL: Se esperaban 3 OAs (2 priorizados), se encontraron ${objetivosTipoB.length} (${priorizados} priorizados)\n`)
    }
  } catch (error) {
    console.error('❌ FAIL: Error en extracción Tipo B:', error.message, '\n')
    totalTests++
  }

  // TEST 4: Validación de códigos OA
  console.log('📋 TEST 4: Validación de códigos OA')
  console.log('────────────────────────────────────')
  const codigosValidos = ['AR01 OA 01', 'MA01 OA 02', 'CN03 OA 15', 'HI06 OA 12']
  const codigosInvalidos = ['AR01', 'OA 01', 'AR01OA01', '123 OA 01', 'AR01 OA', 'INVALID']

  let validacionPassed = true

  console.log('Códigos válidos:')
  codigosValidos.forEach(codigo => {
    const resultado = validarCodigoOA(codigo)
    console.log(`  ${resultado ? '✅' : '❌'} "${codigo}"`)
    if (!resultado) validacionPassed = false
  })

  console.log('Códigos inválidos (deben fallar):')
  codigosInvalidos.forEach(codigo => {
    const resultado = validarCodigoOA(codigo)
    console.log(`  ${!resultado ? '✅' : '❌'} "${codigo}"`)
    if (resultado) validacionPassed = false
  })

  totalTests++
  if (validacionPassed) {
    console.log('✅ PASS: Validación de códigos funciona correctamente\n')
    passedTests++
  } else {
    console.log('❌ FAIL: Validación de códigos tiene errores\n')
  }

  // RESUMEN FINAL
  console.log('\n==========================================')
  console.log('📊 RESUMEN DE PRUEBAS')
  console.log('==========================================')
  console.log(`Total de tests: ${totalTests}`)
  console.log(`Tests exitosos: ${passedTests}`)
  console.log(`Tests fallidos: ${totalTests - passedTests}`)
  console.log(`Tasa de éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

  if (passedTests === totalTests) {
    console.log('\n✅ TODAS LAS PRUEBAS PASARON')
    console.log('✅ La lógica de scraping funciona correctamente')
    console.log('✅ El código está listo para producción')
  } else {
    console.log('\n❌ ALGUNAS PRUEBAS FALLARON')
    console.log('⚠️  Revisar la lógica de extracción')
  }

  return passedTests === totalTests
}

// Ejecutar pruebas
const success = testScrapingOffline()
process.exit(success ? 0 : 1)
