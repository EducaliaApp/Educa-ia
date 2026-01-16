/**
 * Script de prueba para validar los patrones de extracción de OA
 * Prueba contra ejemplos reales del sitio curriculumnacional.cl
 */

// Patrones actualizados
const PATRON_VALIDACION_OA = /^[A-Z]{2,4}\d{2}\s+OA[AH]?\s+[A-Za-z0-9]{1,2}$/i
const PATRON_EXTRACCION_OA = /([A-Z]{2,4}\d{2}\s+OA[AH]?\s+[A-Za-z0-9]{1,2})/i

// Función auxiliar
function validarCodigoOA(codigo) {
  return PATRON_VALIDACION_OA.test(codigo.trim())
}

function obtenerTipoObjetivo(codigo) {
  const codigoLimpio = codigo.trim().toUpperCase()

  if (codigoLimpio.includes(' OAH ')) {
    return 'habilidad'
  } else if (codigoLimpio.includes(' OAA ')) {
    return 'actitud'
  } else {
    return 'contenido'
  }
}

// Casos de prueba con ejemplos reales
const casosDePrueba = [
  // Objetivos de Contenido (OA)
  { codigo: 'AR01 OA 01', esperado: true, tipo: 'contenido', descripcion: 'Artes Visuales 1° básico - OA estándar' },
  { codigo: 'MA04 OA 12', esperado: true, tipo: 'contenido', descripcion: 'Matemática 4° básico - OA estándar' },
  { codigo: 'LE05 OA 23', esperado: true, tipo: 'contenido', descripcion: 'Lenguaje 5° básico - OA estándar' },
  { codigo: 'CN03 OA 08', esperado: true, tipo: 'contenido', descripcion: 'Ciencias Naturales 3° básico - OA estándar' },

  // Objetivos de Habilidades (OAH)
  { codigo: 'MA04 OAH a', esperado: true, tipo: 'habilidad', descripcion: 'Matemática 4° básico - Habilidad a' },
  { codigo: 'MA04 OAH b', esperado: true, tipo: 'habilidad', descripcion: 'Matemática 4° básico - Habilidad b' },
  { codigo: 'MA04 OAH c', esperado: true, tipo: 'habilidad', descripcion: 'Matemática 4° básico - Habilidad c' },
  { codigo: 'LE05 OAH d', esperado: true, tipo: 'habilidad', descripcion: 'Lenguaje 5° básico - Habilidad d' },
  { codigo: 'CN03 OAH e', esperado: true, tipo: 'habilidad', descripcion: 'Ciencias Naturales 3° básico - Habilidad e' },

  // Objetivos de Actitudes (OAA)
  { codigo: 'MA04 OAA A', esperado: true, tipo: 'actitud', descripcion: 'Matemática 4° básico - Actitud A' },
  { codigo: 'MA04 OAA B', esperado: true, tipo: 'actitud', descripcion: 'Matemática 4° básico - Actitud B' },
  { codigo: 'LE05 OAA C', esperado: true, tipo: 'actitud', descripcion: 'Lenguaje 5° básico - Actitud C' },
  { codigo: 'CN03 OAA D', esperado: true, tipo: 'actitud', descripcion: 'Ciencias Naturales 3° básico - Actitud D' },
  { codigo: 'HI06 OAA E', esperado: true, tipo: 'actitud', descripcion: 'Historia 6° básico - Actitud E' },

  // Casos inválidos (no deberían pasar)
  { codigo: 'AR01 OA', esperado: false, descripcion: 'Código incompleto sin número' },
  { codigo: 'OA 01', esperado: false, descripcion: 'Código sin prefijo de asignatura' },
  { codigo: 'AR01 01', esperado: false, descripcion: 'Código sin "OA"' },
  { codigo: 'INVALID', esperado: false, descripcion: 'Código completamente inválido' },
]

// Ejecutar pruebas
console.log('🧪 Ejecutando pruebas de validación de patrones de extracción\n')
console.log('=' .repeat(80))

let exitosos = 0
let fallidos = 0

for (const caso of casosDePrueba) {
  const resultado = validarCodigoOA(caso.codigo)
  const esExitoso = resultado === caso.esperado

  if (esExitoso) {
    exitosos++
  } else {
    fallidos++
  }

  const emoji = esExitoso ? '✅' : '❌'
  const estado = esExitoso ? 'PASS' : 'FAIL'

  console.log(`${emoji} [${estado}] ${caso.descripcion}`)
  console.log(`   Código: "${caso.codigo}"`)
  console.log(`   Esperado: ${caso.esperado}, Resultado: ${resultado}`)

  if (resultado && caso.tipo) {
    const tipoDetectado = obtenerTipoObjetivo(caso.codigo)
    const tipoCoincide = tipoDetectado === caso.tipo
    const emojiTipo = tipoCoincide ? '✅' : '❌'
    console.log(`   ${emojiTipo} Tipo: ${tipoDetectado} (esperado: ${caso.tipo})`)

    if (!tipoCoincide) {
      fallidos++
      exitosos--
    }
  }

  console.log('')
}

console.log('=' .repeat(80))
console.log(`\n📊 Resultados: ${exitosos}/${casosDePrueba.length} pruebas exitosas`)

if (fallidos > 0) {
  console.log(`❌ ${fallidos} pruebas fallidas`)
  process.exit(1)
} else {
  console.log('✅ Todas las pruebas pasaron correctamente')
  console.log('\n🎉 Los patrones están listos para extraer OA, OAH y OAA')
  process.exit(0)
}
