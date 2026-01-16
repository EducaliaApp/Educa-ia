/**
 * Script de prueba para la Edge Function extraer-bases-curriculares
 *
 * Uso:
 * 1. Configurar variables de entorno en .env
 * 2. Ejecutar: deno run --allow-net --allow-env test.ts
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321'
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada')
  Deno.exit(1)
}

async function testFunction() {
  console.log('🧪 Testing Edge Function: extraer-bases-curriculares')
  console.log(`📡 URL: ${SUPABASE_URL}`)

  const functionUrl = `${SUPABASE_URL}/functions/v1/extraer-bases-curriculares`

  console.log('\n🚀 Invocando función...')
  const startTime = Date.now()

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        force: false,
      }),
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      const error = await response.text()
      console.error(`❌ Error HTTP ${response.status}:`, error)
      Deno.exit(1)
    }

    const result = await response.json()

    console.log('\n✅ Función ejecutada exitosamente')
    console.log(`⏱️  Duración: ${duration}ms`)
    console.log('\n📊 Resultados:')
    console.log(JSON.stringify(result, null, 2))

    if (result.archivos) {
      console.log('\n📁 Archivos generados:')
      for (const archivo of result.archivos) {
        console.log(`  - ${archivo.nombre} (${archivo.formato})`)
        console.log(`    Size: ${(archivo.size / 1024).toFixed(2)} KB`)
        console.log(`    URL: ${archivo.url.substring(0, 60)}...`)
      }
    }

    if (result.estadisticas) {
      console.log('\n📈 Estadísticas:')
      console.log(`  - Asignaturas: ${result.estadisticas.asignaturas_procesadas}`)
      console.log(`  - Objetivos: ${result.estadisticas.total_objetivos}`)
      console.log(`  - Priorizados: ${result.estadisticas.objetivos_priorizados}`)
      console.log(`  - Duración: ${result.estadisticas.duracion_ms}ms`)
    }

  } catch (error) {
    console.error('❌ Error ejecutando función:', error)
    Deno.exit(1)
  }
}

// Ejecutar test
testFunction()
