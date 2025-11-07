#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Script para generar embeddings de rúbricas MBE existentes
 *
 * Uso:
 *   deno run --allow-net --allow-env scripts/generar-embeddings-rubricas.ts
 *
 * Variables de entorno requeridas:
 *   - OPENAI_API_KEY
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!OPENAI_API_KEY) {
  console.error('❌ Falta OPENAI_API_KEY')
  Deno.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan credenciales de Supabase')
  Deno.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

console.log('🚀 Generando embeddings para rúbricas MBE...\n')

// 1. Obtener rúbricas sin embedding
const { data: rubricas, error: fetchError } = await supabase
  .from('rubricas_mbe')
  .select('*')
  .is('embedding', null)

if (fetchError) {
  console.error('❌ Error obteniendo rúbricas:', fetchError)
  Deno.exit(1)
}

if (!rubricas || rubricas.length === 0) {
  console.log('✅ Todas las rúbricas ya tienen embeddings')
  Deno.exit(0)
}

console.log(`📋 Encontradas ${rubricas.length} rúbricas sin embeddings\n`)

let procesadas = 0
let errores = 0

for (const rubrica of rubricas) {
  try {
    console.log(`Procesando: ${rubrica.indicador_id} - ${rubrica.nombre_indicador}`)

    // 2. Construir texto para embedding
    const textoCompleto = construirTextoParaEmbedding(rubrica)

    console.log(`  📝 Texto generado: ${textoCompleto.length} caracteres`)

    // 3. Generar embedding con OpenAI
    const embedding = await generarEmbedding(textoCompleto)

    console.log(`  🔢 Embedding generado: ${embedding.length} dimensiones`)

    // 4. Actualizar rúbrica en BD
    const { error: updateError } = await supabase
      .from('rubricas_mbe')
      .update({
        embedding: embedding,
        contenido_texto: textoCompleto,
        updated_at: new Date().toISOString()
      })
      .eq('id', rubrica.id)

    if (updateError) {
      console.error(`  ❌ Error actualizando: ${updateError.message}`)
      errores++
      continue
    }

    procesadas++
    console.log(`  ✅ Actualizado (${procesadas}/${rubricas.length})\n`)

    // Rate limiting: esperar 200ms entre requests
    await new Promise(resolve => setTimeout(resolve, 200))

  } catch (error) {
    console.error(`  ❌ Error procesando ${rubrica.indicador_id}:`, error)
    errores++
  }
}

console.log('\n' + '='.repeat(60))
console.log('📊 RESUMEN')
console.log('='.repeat(60))
console.log(`✅ Procesadas: ${procesadas}`)
console.log(`❌ Errores: ${errores}`)
console.log(`📈 Total: ${rubricas.length}`)
console.log('')

if (procesadas > 0) {
  console.log('🎯 Próximos pasos:')
  console.log('  1. Verificar con: SELECT * FROM obtener_estadisticas_rag();')
  console.log('  2. Probar búsqueda: SELECT * FROM buscar_rubricas_similares(...);')
  console.log('')
}

Deno.exit(errores > 0 ? 1 : 0)

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function construirTextoParaEmbedding(rubrica: any): string {
  const partes: string[] = []

  // Información básica
  partes.push(`Indicador MBE: ${rubrica.indicador_id}`)
  partes.push(`Nombre: ${rubrica.nombre_indicador}`)

  // Descripción
  if (rubrica.descripcion_estandar) {
    partes.push(`Descripción: ${rubrica.descripcion_estandar}`)
  }

  if (rubrica.descripcion_general) {
    partes.push(`${rubrica.descripcion_general}`)
  }

  // Contexto educativo
  partes.push(`Asignatura: ${rubrica.asignatura || 'General'}`)
  partes.push(`Nivel educativo: ${rubrica.nivel_educativo}`)
  partes.push(`Modalidad: ${rubrica.modalidad || 'Regular'}`)
  partes.push(`Año vigencia: ${rubrica.año_vigencia}`)

  // Dominio y estándar MBE
  if (rubrica.dominio) {
    partes.push(`Dominio MBE: ${rubrica.dominio}`)
  }

  if (rubrica.estandar_numero) {
    partes.push(`Estándar: ${rubrica.estandar_numero}`)
  }

  if (rubrica.nombre_estandar) {
    partes.push(`${rubrica.nombre_estandar}`)
  }

  // Niveles de desempeño (JSONB)
  if (rubrica.niveles_desempeno) {
    partes.push('\nNiveles de Desempeño:')

    const niveles = ['destacado', 'competente', 'basico', 'insatisfactorio']

    for (const nivel of niveles) {
      const nivelData = rubrica.niveles_desempeno[nivel]
      if (nivelData && nivelData.descripcion) {
        partes.push(`- ${nivel.toUpperCase()}: ${nivelData.descripcion}`)

        // Agregar condiciones si existen
        if (nivelData.condiciones && Array.isArray(nivelData.condiciones)) {
          for (const cond of nivelData.condiciones) {
            if (cond.descripcion) {
              partes.push(`  • ${cond.descripcion}`)
            }
          }
        }
      }
    }
  }

  // Focos (si existen)
  if (rubrica.focos) {
    try {
      const focos = typeof rubrica.focos === 'string'
        ? JSON.parse(rubrica.focos)
        : rubrica.focos

      if (Array.isArray(focos)) {
        partes.push('\nFocos: ' + focos.join(', '))
      }
    } catch (e) {
      // Ignorar si no se puede parsear
    }
  }

  // Criterios (si existen)
  if (rubrica.criterios) {
    try {
      const criterios = typeof rubrica.criterios === 'string'
        ? JSON.parse(rubrica.criterios)
        : rubrica.criterios

      if (Array.isArray(criterios)) {
        partes.push('\nCriterios de evaluación: ' + criterios.join(', '))
      }
    } catch (e) {
      // Ignorar si no se puede parsear
    }
  }

  // Contenido adicional
  if (rubrica.contenido_texto) {
    partes.push(rubrica.contenido_texto)
  }

  return partes.join('\n')
}

async function generarEmbedding(texto: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: texto,
      dimensions: 1536
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}
