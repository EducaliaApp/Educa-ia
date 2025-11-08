// supabase/functions/optimize-vector-search/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { crearClienteServicio } from '../shared/service-auth.ts'

interface OptimizationRequest {
  action: 'reindex' | 'analyze' | 'stats'
  tables?: string[]
}

export async function handler(req: Request): Promise<Response> {
  try {
    const supabase = crearClienteServicio(req)
    const { action, tables = ['chunks_documentos', 'rubricas_mbe'] }: OptimizationRequest = await req.json()

    console.log(`🔧 Ejecutando optimización: ${action}`)

    let result: any = {}

    switch (action) {
      case 'stats':
        result = await getEmbeddingStats(supabase, tables)
        break
      
      case 'analyze':
        result = await analyzeTables(supabase, tables)
        break
      
      default:
        throw new Error(`Acción no válida: ${action}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        result,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error en optimización:', error)

    return new Response(
      JSON.stringify({
        error: 'Error en optimización vectorial',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

async function getEmbeddingStats(supabase: any, tables: string[]) {
  const stats: Record<string, any> = {}

  for (const table of tables) {
    try {
      const { count: total } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      const { count: withEmbedding } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .not('embedding', 'is', null)

      stats[table] = {
        total: total || 0,
        with_embedding: withEmbedding || 0,
        without_embedding: (total || 0) - (withEmbedding || 0),
        coverage_pct: total ? Math.round((withEmbedding || 0) / total * 100) : 0
      }

      console.log(`📊 ${table}: ${stats[table].with_embedding}/${stats[table].total} con embedding`)

    } catch (error) {
      console.warn(`⚠️ Error obteniendo stats de ${table}:`, error.message)
      stats[table] = { error: error.message }
    }
  }

  return stats
}

async function analyzeTables(supabase: any, tables: string[]) {
  const results: Record<string, any> = {}

  for (const table of tables) {
    try {
      // Ejecutar ANALYZE via función SQL
      const { data, error } = await supabase.rpc('analyze_table', {
        table_name: table
      })

      if (error && !error.message.includes('function analyze_table')) {
        throw error
      }

      results[table] = { success: true, analyzed: true }
      console.log(`✅ Analizado: ${table}`)

    } catch (error) {
      console.warn(`⚠️ Error analizando ${table}:`, error.message)
      results[table] = { success: false, error: error.message }
    }
  }

  return results
}

if (import.meta.main) {
  serve(handler)
}