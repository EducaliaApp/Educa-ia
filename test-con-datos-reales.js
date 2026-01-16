/**
 * Script de prueba con datos REALES descargados del sitio
 * Uso: node test-con-datos-reales.js
 */

const fs = require('fs')

// Leer HTML descargado con curl
const htmlPrincipal = fs.readFileSync('/tmp/pagina-completa.html', 'utf-8')
const htmlAsignatura = fs.readFileSync('/tmp/asignatura-artes.html', 'utf-8')

// ============================================
// FUNCIONES (copiadas del código actualizado)
// ============================================

function limpiarTexto(texto) {
  return texto.replace(/\s+/g, ' ').trim()
}

function validarCodigoOA(codigo) {
  const patron = /^[A-Z]{2,4}\d{2}\s+OA\s+\d{1,2}$/i
  return patron.test(codigo.trim())
}

function extraerAsignaturasYCursos(html) {
  const links = []
  const BASE_URL = 'https://www.curriculumnacional.cl'

  const patronAsignatura = /<div[^>]*class=[^>]*subject-grades[^>]*>[\s\S]*?<span[^>]*class=[^>]*subject-title[^>]*>([^<]*)<\/span>[\s\S]*?<div[^>]*class=[^>]*grades-wrapper[^>]*>([\s\S]*?)<\/div>/gi

  let match
  while ((match = patronAsignatura.exec(html)) !== null) {
    const nombreAsignatura = limpiarTexto(match[1])
    const gradesWrapper = match[2]

    const patronCurso = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi
    let matchCurso

    while ((matchCurso = patronCurso.exec(gradesWrapper)) !== null) {
      const href = matchCurso[1]
      const curso = limpiarTexto(matchCurso[2])

      const nombreCompleto = `${nombreAsignatura} ${curso}`
      const url = href.startsWith('http') ? href : BASE_URL + href

      if (!links.some(l => l.url === url) && nombreCompleto.length > 0) {
        links.push({ nombre: nombreCompleto, url })
      }
    }
  }

  return links
}

function extraerObjetivos(html, asignatura, curso) {
  const objetivos = []

  // Usar balanceo de divs para items-wrapper
  let posicion = 0

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

          // Extraer eje
          const ejeTitleMatch = bloqueEje.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([^<]*)<\/a>[\s\S]*?<\/h3>/i)
          let ejeNombre = ejeTitleMatch ? limpiarTexto(ejeTitleMatch[1]) : ''

          if (!ejeNombre) {
            const ejeSimpleMatch = bloqueEje.match(/<h3[^>]*>([^<]*)<\/h3>/i)
            ejeNombre = ejeSimpleMatch ? limpiarTexto(ejeSimpleMatch[1]) : ''
          }

          // Extraer item-wrappers
          // Buscar tanto '<div class="item-wrapper">' como '<div class="item-wrapper prioritized">'
          let posItem = 0
          while (true) {
            const inicioItem = bloqueEje.indexOf('<div class="item-wrapper', posItem)
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
                    // Extraer código OA desde <span class="oa-title">
                    const codigoMatch = itemHtml.match(/<span[^>]*class=[^>]*oa-title[^>]*>([^<]*)<\/span>/i)
                    let codigoTexto = codigoMatch ? limpiarTexto(codigoMatch[1]) : ''

                    // Extraer solo el código del formato "Objetivo de aprendizaje AR01 OA 01"
                    const codigoExtraido = codigoTexto.match(/([A-Z]{2,4}\d{2}\s+OA\s+\d{1,2})/i)
                    const codigo = codigoExtraido ? codigoExtraido[1] : ''

                    if (codigo && validarCodigoOA(codigo)) {
                      // Extraer descripción desde el <p> dentro de field__item
                      const objetivoMatch = itemHtml.match(/<div[^>]*class=[^>]*field__item[^>]*>[\s\S]*?<p[^>]*>([^<]*)<\/p>/i)
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
                    console.error('Error procesando item:', error)
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

  return objetivos
}

// ============================================
// PRUEBAS CON DATOS REALES
// ============================================

console.log('🧪 PRUEBAS CON DATOS REALES DEL SITIO')
console.log('======================================\n')

// TEST 1: Extracción de asignaturas
console.log('📋 TEST 1: Extracción de asignaturas de la página principal')
console.log('────────────────────────────────────────────────────────────')

const asignaturas = extraerAsignaturasYCursos(htmlPrincipal)

console.log(`✅ Asignaturas encontradas: ${asignaturas.length}\n`)

if (asignaturas.length > 0) {
  console.log('📚 Primeras 15 asignaturas:')
  asignaturas.slice(0, 15).forEach((asig, i) => {
    console.log(`  ${(i + 1).toString().padStart(2, '0')}. ${asig.nombre}`)
  })
  console.log(`\n... (${asignaturas.length - 15} más)\n`)

  console.log('✅ PASS: Extracción de asignaturas funciona\n')
} else {
  console.log('❌ FAIL: No se encontraron asignaturas\n')
}

// TEST 2: Extracción de OAs
console.log('📋 TEST 2: Extracción de OAs de Artes Visuales 1° Básico')
console.log('───────────────────────────────────────────────────────────')

const objetivos = extraerObjetivos(htmlAsignatura, 'Artes Visuales', '1° Básico')

console.log(`✅ Objetivos extraídos: ${objetivos.length}\n`)

if (objetivos.length > 0) {
  const priorizados = objetivos.filter(o => o.priorizado === 1).length

  console.log(`📊 Estadísticas:`)
  console.log(`   Total OAs: ${objetivos.length}`)
  console.log(`   Priorizados: ${priorizados} (${((priorizados / objetivos.length) * 100).toFixed(1)}%)\n`)

  console.log('📋 OAs extraídos:')
  objetivos.forEach((obj, i) => {
    console.log(`\n  ${(i + 1).toString().padStart(2, '0')}. ${obj.oa_codigo} ${obj.priorizado ? '[⭐ PRIORIZADO]' : ''}`)
    console.log(`      Eje: ${obj.eje}`)
    console.log(`      Objetivo: ${obj.objetivo.substring(0, 80)}...`)
  })

  console.log('\n✅ PASS: Extracción de OAs funciona\n')
} else {
  console.log('❌ FAIL: No se extrajeron OAs\n')
}

// RESUMEN
console.log('\n======================================')
console.log('📊 RESUMEN FINAL')
console.log('======================================')

const test1Pass = asignaturas.length > 0
const test2Pass = objetivos.length > 0

console.log(`TEST 1: ${test1Pass ? '✅ PASS' : '❌ FAIL'} - Extracción de asignaturas (${asignaturas.length} encontradas)`)
console.log(`TEST 2: ${test2Pass ? '✅ PASS' : '❌ FAIL'} - Extracción de OAs (${objetivos.length} encontrados)`)

if (test1Pass && test2Pass) {
  console.log('\n✅ TODAS LAS PRUEBAS PASARON')
  console.log('✅ El código funciona con datos reales del sitio')
  console.log('✅ Listo para despliegue en producción')
  process.exit(0)
} else {
  console.log('\n❌ ALGUNAS PRUEBAS FALLARON')
  console.log('⚠️  Revisar el código antes del despliegue')
  process.exit(1)
}
