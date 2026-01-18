/**
 * Script para probar la extracción con sistema de reintentos
 * Ejecutar: node test-extraction-with-retries.js
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Error: Faltan variables de entorno')
  console.error('   - SUPABASE_URL:', SUPABASE_URL ? 'OK' : 'FALTA')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', SERVICE_KEY ? 'OK' : 'FALTA')
  process.exit(1)
}

// Limpiar comillas si existen
const url = SUPABASE_URL.replace(/^["']|["']$/g, '')
const key = SERVICE_KEY.replace(/^["']|["']$/g, '')

console.log('🧪 TEST: Extracción con Sistema de Reintentos\n')
console.log('='.repeat(70))
console.log(`📡 Supabase URL: ${url}`)
console.log('='.repeat(70))

async function testExtraccionConReintentos() {
  let runId = null
  let completed = false
  let iteration = 0
  const maxIterations = 10 // Límite de seguridad

  console.log('\n🚀 Iniciando extracción automática con reintentos...\n')

  while (!completed && iteration < maxIterations) {
    iteration++
    console.log(`\n${'─'.repeat(70)}`)
    console.log(`📦 Iteración ${iteration} - ${runId ? 'Continuando' : 'Nuevo run'}`)
    console.log('─'.repeat(70))

    const body = runId
      ? {
          continue_run_id: runId,
          batch_categorias: 2,  // Procesar 2 categorías por batch
          persist_db: true,
          generate_files: false  // Solo generar al final
        }
      : {
          batch_categorias: 2,
          persist_db: true,
          generate_files: false
        }

    console.log(`📋 Config:`, JSON.stringify(body, null, 2))

    try {
      const startTime = Date.now()

      const response = await fetch(`${url}/functions/v1/extraer-bases-curriculares`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const duration = Date.now() - startTime

      if (!response.ok) {
        const error = await response.text()
        console.error(`❌ Error HTTP ${response.status}:`, error)
        break
      }

      const result = await response.json()

      console.log(`\n⏱️  Duración: ${(duration / 1000).toFixed(2)}s`)

      if (response.status === 200) {
        // Completado!
        console.log('\n' + '='.repeat(70))
        console.log('✅ EXTRACCIÓN COMPLETADA!')
        console.log('='.repeat(70))

        if (result.estadisticas) {
          console.log('\n📊 Estadísticas Finales:')
          console.log(`   Asignaturas procesadas: ${result.estadisticas.asignaturas_procesadas}`)
          console.log(`   Total objetivos: ${result.estadisticas.total_objetivos}`)
          console.log(`   Objetivos priorizados: ${result.estadisticas.objetivos_priorizados}`)
          console.log(`   Objetivos de contenido: ${result.estadisticas.objetivos_contenido}`)
          console.log(`   Objetivos de habilidades: ${result.estadisticas.objetivos_habilidades}`)
          console.log(`   Objetivos de actitudes: ${result.estadisticas.objetivos_actitudes}`)
        }

        if (result.configuracion?.persist_db) {
          console.log('\n💾 Datos persistidos en base de datos:')
          if (result.estadisticas?.tracking) {
            console.log(`   Nuevos: ${result.estadisticas.tracking.objetivos_nuevos}`)
            console.log(`   Actualizados: ${result.estadisticas.tracking.objetivos_actualizados}`)
            console.log(`   Sin cambios: ${result.estadisticas.tracking.objetivos_sin_cambios}`)
            console.log(`   Errores: ${result.estadisticas.tracking.objetivos_error}`)
          }
        }

        if (result.archivos && result.archivos.length > 0) {
          console.log('\n📁 Archivos generados:')
          result.archivos.forEach(archivo => {
            console.log(`   - ${archivo.nombre} (${(archivo.size / 1024).toFixed(2)} KB)`)
            console.log(`     ${archivo.url}`)
          })
        }

        completed = true

      } else if (response.status === 202) {
        // Parcial - continuar
        runId = result.run_id

        console.log('\n⏸️  Ejecución Parcial:')
        console.log(`   Run ID: ${runId}`)
        console.log(`   Estado: ${result.estado}`)
        console.log(`   Asignaturas procesadas: ${result.asignaturas_procesadas}`)
        console.log(`   Objetivos extraídos: ${result.total_objetivos}`)

        console.log('\n📊 Progreso de Categorías:')
        console.log(`   ✅ Procesadas: ${result.categorias_procesadas.length}`)
        if (result.categorias_procesadas.length > 0) {
          result.categorias_procesadas.forEach(cat => {
            const nombre = cat.split('/').pop()
            console.log(`      - ${nombre}`)
          })
        }

        console.log(`   ⏳ Pendientes: ${result.categorias_pendientes.length}`)
        if (result.categorias_pendientes.length > 0) {
          const preview = result.categorias_pendientes.slice(0, 3)
          preview.forEach(cat => {
            const nombre = cat.split('/').pop()
            console.log(`      - ${nombre}`)
          })
          if (result.categorias_pendientes.length > 3) {
            console.log(`      ... y ${result.categorias_pendientes.length - 3} más`)
          }
        }

        if (result.persistencia) {
          console.log('\n💾 Persistencia en este batch:')
          console.log(`   Nuevos: ${result.persistencia.objetivosNuevos || 0}`)
          console.log(`   Actualizados: ${result.persistencia.objetivosActualizados || 0}`)
          console.log(`   Sin cambios: ${result.persistencia.objetivosSinCambios || 0}`)
        }

        console.log('\n🔄 Continuando con siguiente batch...')

        // Esperar un poco antes de continuar
        await new Promise(resolve => setTimeout(resolve, 2000))

      } else {
        console.error(`❌ Código de respuesta inesperado: ${response.status}`)
        console.log(JSON.stringify(result, null, 2))
        break
      }

    } catch (error) {
      console.error(`\n❌ Error en la iteración ${iteration}:`, error.message)
      break
    }
  }

  if (iteration >= maxIterations && !completed) {
    console.warn(`\n⚠️  Alcanzado límite de iteraciones (${maxIterations})`)
    console.warn('   Verificar si hay un problema con la configuración o los datos')
  }

  console.log('\n' + '='.repeat(70))
  console.log('✨ Test completado')
  console.log('='.repeat(70))
}

// Ejecutar test
testExtraccionConReintentos().catch(error => {
  console.error('\n❌ Error fatal:', error)
  process.exit(1)
})
