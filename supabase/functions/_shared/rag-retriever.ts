/**
 * RAG Retriever con Reranking
 *
 * Mejora la búsqueda vectorial tradicional agregando:
 * - Reranking con cross-encoder (Cohere)
 * - Búsqueda híbrida (vectorial + keyword)
 * - Caché de embeddings
 * - Métricas de relevancia
 */

import OpenAI from 'https://esm.sh/openai@4'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const COHERE_API_KEY = Deno.env.get('COHERE_API_KEY') // Opcional

export interface RerankResult {
  index: number
  relevance_score: number
  document: string
}

export interface CohereRerankResponse {
  id: string
  results: RerankResult[]
  meta: {
    api_version: { version: string }
  }
}

export interface ContextoEducativo {
  asignatura: string
  nivel_educativo: string
  año_vigencia: number
  modalidad: string
}

export interface ResultadoBusqueda {
  contenido: string
  score_vectorial: number
  score_reranking?: number
  score_final: number
  metadata: any
}

export class RAGRetriever {
  private supabase: any
  private openai: OpenAI
  private enableReranking: boolean
  private cacheEmbeddings: boolean

  constructor(supabase: any, options?: {
    enableReranking?: boolean
    cacheEmbeddings?: boolean
  }) {
    this.supabase = supabase
    this.openai = new OpenAI({ apiKey: OPENAI_API_KEY })
    this.enableReranking = options?.enableReranking ?? (COHERE_API_KEY !== undefined)
    this.cacheEmbeddings = options?.cacheEmbeddings ?? true

    if (this.enableReranking && !COHERE_API_KEY) {
      console.warn('⚠️ Reranking habilitado pero falta COHERE_API_KEY')
      this.enableReranking = false
    }
  }

  /**
   * Buscar contexto relevante con todos los filtros y mejoras
   */
  async recuperarContexto(
    query: string,
    contextoEducativo: ContextoEducativo,
    options?: {
      matchCount?: number
      threshold?: number
      enableHybrid?: boolean
    }
  ): Promise<ResultadoBusqueda[]> {
    const startTime = Date.now()

    // 1. Generar embedding (con caché si está habilitado)
    const embedding = await this.getEmbeddingWithCache(query)

    // 2. Búsqueda vectorial inicial (más candidatos para reranking)
    const candidateCount = this.enableReranking
      ? (options?.matchCount || 8) * 3  // 3x para reranking
      : options?.matchCount || 8

    let candidatos: any[]

    if (options?.enableHybrid) {
      // Búsqueda híbrida (vectorial + keyword)
      candidatos = await this.busquedaHibrida(
        query,
        embedding,
        contextoEducativo,
        candidateCount,
        options?.threshold || 0.65
      )
    } else {
      // Búsqueda vectorial pura
      candidatos = await this.busquedaVectorial(
        embedding,
        contextoEducativo,
        candidateCount,
        options?.threshold || 0.7
      )
    }

    if (!candidatos || candidatos.length === 0) {
      console.warn('⚠️ No se encontraron resultados para la query')
      await this.registrarQuerySinResultados(query, contextoEducativo)
      return []
    }

    // 3. Reranking (si está habilitado)
    let resultadosFinales: ResultadoBusqueda[]

    if (this.enableReranking && candidatos.length > 3) {
      resultadosFinales = await this.aplicarReranking(
        query,
        candidatos,
        options?.matchCount || 8
      )
    } else {
      // Sin reranking, usar scores vectoriales
      resultadosFinales = candidatos.slice(0, options?.matchCount || 8).map(c => ({
        contenido: c.contenido_texto || c.contenido,
        score_vectorial: c.similarity,
        score_final: c.similarity,
        metadata: {
          id: c.id,
          tipo: c.tipo_contenido || 'rubrica',
          dominio: c.dominio,
          estandar: c.estandar_numero,
          asignatura: c.asignatura
        }
      }))
    }

    // 4. Registrar métricas
    const latencia = Date.now() - startTime
    await this.registrarMetricas({
      query,
      contextoEducativo,
      resultados_count: resultadosFinales.length,
      candidatos_count: candidatos.length,
      similitud_promedio: resultadosFinales.reduce((sum, r) => sum + r.score_final, 0) / resultadosFinales.length,
      latencia_ms: latencia,
      reranking_aplicado: this.enableReranking
    })

    console.log(`✅ Retrieval completado en ${latencia}ms (${resultadosFinales.length} resultados)`)

    return resultadosFinales
  }

  /**
   * Obtener embedding con caché
   */
  private async getEmbeddingWithCache(query: string): Promise<number[]> {
    const queryHash = await this.hashQuery(query)

    if (this.cacheEmbeddings) {
      // Buscar en caché
      const { data: cached } = await this.supabase
        .from('cache_embeddings')
        .select('embedding')
        .eq('query_hash', queryHash)
        .single()

      if (cached) {
        // Actualizar last_used_at y uso_count
        await this.supabase
          .from('cache_embeddings')
          .update({
            last_used_at: new Date().toISOString(),
            uso_count: this.supabase.rpc('increment', 1)
          })
          .eq('query_hash', queryHash)

        console.log('💾 Embedding cargado desde caché')
        return cached.embedding
      }
    }

    // Generar nuevo embedding
    const embeddingResponse = await this.openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: query,
      dimensions: 1536
    })

    const embedding = embeddingResponse.data[0].embedding

    // Guardar en caché
    if (this.cacheEmbeddings) {
      await this.supabase
        .from('cache_embeddings')
        .insert({
          query_hash: queryHash,
          query_text: query,
          embedding: embedding
        })
        .catch((error: any) => console.warn('⚠️ No se pudo cachear embedding:', error.message))
    }

    return embedding
  }

  /**
   * Búsqueda vectorial tradicional
   */
  private async busquedaVectorial(
    embedding: number[],
    contexto: ContextoEducativo,
    matchCount: number,
    threshold: number
  ): Promise<any[]> {
    const { data, error } = await this.supabase.rpc('buscar_rubricas_similares', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: matchCount,
      p_año_vigencia: contexto.año_vigencia,
      p_asignatura: contexto.asignatura,
      p_nivel: contexto.nivel_educativo,
      p_modalidad: contexto.modalidad
    })

    if (error) {
      console.error('❌ Error en búsqueda vectorial:', error)
      throw new Error(`Búsqueda vectorial falló: ${error.message}`)
    }

    return data || []
  }

  /**
   * Búsqueda híbrida (vectorial + keyword BM25)
   */
  private async busquedaHibrida(
    query: string,
    embedding: number[],
    contexto: ContextoEducativo,
    matchCount: number,
    threshold: number
  ): Promise<any[]> {
    const { data, error } = await this.supabase.rpc('buscar_hibrido', {
      query_text: query,
      query_embedding: embedding,
      alpha: 0.7,  // 70% peso vectorial, 30% keyword
      match_count: matchCount,
      p_año_vigencia: contexto.año_vigencia,
      p_asignatura: contexto.asignatura,
      p_nivel: contexto.nivel_educativo
    })

    if (error) {
      console.warn('⚠️ Búsqueda híbrida falló, usando vectorial pura:', error.message)
      return await this.busquedaVectorial(embedding, contexto, matchCount, threshold)
    }

    return data || []
  }

  /**
   * Aplicar reranking con Cohere
   */
  private async aplicarReranking(
    query: string,
    candidatos: any[],
    topN: number
  ): Promise<ResultadoBusqueda[]> {
    console.log(`🔄 Aplicando reranking a ${candidatos.length} candidatos...`)

    const documentos = candidatos.map(c => c.contenido_texto || c.contenido || c.descripcion_estandar)

    const response = await fetch('https://api.cohere.ai/v1/rerank', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: 'rerank-multilingual-v3.0',
        query: query,
        documents: documentos,
        top_n: topN,
        return_documents: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Reranking falló:', errorText)
      throw new Error(`Cohere rerank error: ${response.status}`)
    }

    const result: CohereRerankResponse = await response.json()

    // Mapear resultados rerankeados
    const resultadosRerankeados = result.results.map(r => {
      const candidatoOriginal = candidatos[r.index]
      return {
        contenido: documentos[r.index],
        score_vectorial: candidatoOriginal.similarity,
        score_reranking: r.relevance_score,
        score_final: r.relevance_score,  // Usar score de reranking como final
        metadata: {
          id: candidatoOriginal.id,
          tipo: candidatoOriginal.tipo_contenido || 'rubrica',
          dominio: candidatoOriginal.dominio,
          estandar: candidatoOriginal.estandar_numero,
          asignatura: candidatoOriginal.asignatura,
          nivel: candidatoOriginal.nivel_educativo
        }
      }
    })

    console.log(`✅ Reranking completado: top ${topN} de ${candidatos.length}`)

    return resultadosRerankeados
  }

  /**
   * Generar hash de query para caché
   */
  private async hashQuery(query: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(query.toLowerCase().trim())
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Registrar queries sin resultados para análisis
   */
  private async registrarQuerySinResultados(
    query: string,
    contexto: ContextoEducativo
  ): Promise<void> {
    try {
      await this.supabase.from('queries_sin_resultados').insert({
        query_text: query,
        contexto_educativo: contexto,
        fecha: new Date().toISOString()
      })
    } catch (error) {
      // No fallar si no se puede registrar
      console.warn('⚠️ No se pudo registrar query sin resultados')
    }
  }

  /**
   * Registrar métricas de retrieval
   */
  private async registrarMetricas(metricas: any): Promise<void> {
    const fecha = new Date().toISOString().split('T')[0]

    try {
      await this.supabase.rpc('registrar_metrica_rag', {
        p_fecha: fecha,
        p_similitud_promedio: metricas.similitud_promedio,
        p_latencia_ms: metricas.latencia_ms
      })
    } catch (error) {
      console.warn('⚠️ No se pudieron registrar métricas:', error.message)
    }
  }

  /**
   * Construir contexto formateado para LLM
   */
  formatearContextoParaLLM(resultados: ResultadoBusqueda[], contexto: ContextoEducativo): string {
    let texto = `## CONTEXTO DEL MARCO PARA LA BUENA ENSEÑANZA ${contexto.año_vigencia}\n\n`
    texto += `### INFORMACIÓN DEL PORTAFOLIO\n`
    texto += `- Modalidad: ${contexto.modalidad}\n`
    texto += `- Asignatura: ${contexto.asignatura}\n`
    texto += `- Nivel: ${contexto.nivel_educativo}\n\n`
    texto += `---\n\n`

    for (const [index, resultado] of resultados.entries()) {
      const meta = resultado.metadata

      texto += `### Referencia ${index + 1}`
      if (meta.dominio && meta.estandar) {
        texto += ` - Dominio ${meta.dominio}, Estándar ${meta.estandar}`
      }
      texto += ` (Relevancia: ${(resultado.score_final * 100).toFixed(1)}%)\n\n`

      texto += `${resultado.contenido}\n\n`
      texto += `---\n\n`
    }

    return texto
  }
}

/**
 * Función helper para uso simple
 */
export async function recuperarContextoMBE(
  supabase: any,
  query: string,
  contextoEducativo: ContextoEducativo,
  options?: {
    matchCount?: number
    enableReranking?: boolean
    enableHybrid?: boolean
  }
): Promise<string> {
  const retriever = new RAGRetriever(supabase, {
    enableReranking: options?.enableReranking ?? true,
    cacheEmbeddings: true
  })

  const resultados = await retriever.recuperarContexto(query, contextoEducativo, {
    matchCount: options?.matchCount || 8,
    enableHybrid: options?.enableHybrid || false
  })

  if (resultados.length === 0) {
    return `No se encontró contexto específico del MBE ${contextoEducativo.año_vigencia} para esta consulta.`
  }

  return retriever.formatearContextoParaLLM(resultados, contextoEducativo)
}
