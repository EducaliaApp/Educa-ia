#!/usr/bin/env deno run --allow-net --allow-env
// scripts/optimize-vector-indices.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno')
  Deno.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔧 Optimizando índices vectoriales...\n')

// 1. Verificar estadísticas de embeddings
console.log('📊 Analizando estadísticas de embeddings...')

const { data: statsChunks } = await supabase.rpc('get_embedding_stats', {
  table_name: 'chunks_documentos'
})

const { data: statsRubricas } = await supabase.rpc('get_embedding_stats', {
  table_name: 'rubricas_mbe'
})

console.log(`  - Chunks con embeddings: ${statsChunks?.[0]?.count || 0}`)
console.log(`  - Rúbricas con embeddings: ${statsRubricas?.[0]?.count || 0}`)

// 2. Optimizar índices HNSW si hay suficientes datos
const minEmbeddings = 1000

if ((statsChunks?.[0]?.count || 0) >= minEmbeddings) {
  console.log('\n🚀 Optimizando índice HNSW para chunks...')
  
  try {
    await supabase.rpc('optimize_hnsw_index', {
      table_name: 'chunks_documentos',
      column_name: 'embedding'
    })
    console.log('  ✅ Índice chunks optimizado')
  } catch (error) {
    console.log(`  ⚠️ Error optimizando chunks: ${error.message}`)
  }
}

if ((statsRubricas?.[0]?.count || 0) >= 100) {
  console.log('\n🚀 Optimizando índice HNSW para rúbricas...')
  
  try {
    await supabase.rpc('optimize_hnsw_index', {
      table_name: 'rubricas_mbe',
      column_name: 'embedding'
    })
    console.log('  ✅ Índice rúbricas optimizado')
  } catch (error) {
    console.log(`  ⚠️ Error optimizando rúbricas: ${error.message}`)
  }
}

// 3. Actualizar estadísticas de tablas
console.log('\n📈 Actualizando estadísticas de tablas...')

try {
  await supabase.rpc('analyze_tables', {
    tables: ['chunks_documentos', 'rubricas_mbe', 'documentos_oficiales']
  })
  console.log('  ✅ Estadísticas actualizadas')
} catch (error) {
  console.log(`  ⚠️ Error actualizando estadísticas: ${error.message}`)
}

// 4. Test de performance de búsqueda
console.log('\n⚡ Probando performance de búsqueda...')

const testVector = Array.from({ length: 1536 }, () => Math.random() - 0.5)
const norm = Math.sqrt(testVector.reduce((sum, v) => sum + v * v, 0))
const normalizedVector = testVector.map(v => v / norm)

const startTime = performance.now()

try {
  const { data: results } = await supabase.rpc('buscar_rubricas_similares', {
    query_embedding: normalizedVector,
    match_threshold: 0.7,
    match_count: 10
  })
  
  const endTime = performance.now()
  const latency = Math.round(endTime - startTime)
  
  console.log(`  ✅ Búsqueda completada en ${latency}ms`)
  console.log(`  📊 Resultados encontrados: ${results?.length || 0}`)
  
  if (latency > 1000) {
    console.log('  ⚠️ Latencia alta (>1s) - considerar optimizaciones adicionales')
  }
  
} catch (error) {
  console.log(`  ❌ Error en test de búsqueda: ${error.message}`)
}

console.log('\n✅ Optimización completada')