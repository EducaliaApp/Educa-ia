import { DocumentPipeline } from '../shared/document-pipeline.ts'
import { crearClienteServicio, UnauthorizedError } from '../shared/service-auth.ts'

interface LoteResult {
  total_documentos: number
  procesados_exitosamente: number
  fallidos: number
  tiempo_total_ms: number
  resultados: Array<{
    success: boolean
    document_id?: string
    error?: string
    stage_completed?: string
    metrics?: {
      total_time_ms: number
    }
  }>
}

interface Documento {
  id: string
  titulo: string
  año_vigencia?: number
  tipo_documento?: string
}

interface Filtros {
  año_vigencia?: number
  tipo_documento?: string
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now()

  try {
    const supabase = crearClienteServicio(req)
    const { limite = 10, filtros = {} } = await req.json() as { limite?: number; filtros?: Filtros }

    console.log(`🚀 Iniciando procesamiento en lote (límite: ${limite})...`)

    // Obtener documentos pendientes
    let query = supabase
      .from('documentos_oficiales')
      .select('*')
      .eq('procesado', false)
      .is('estado_procesamiento', null)
      .limit(limite)
    
    // Aplicar filtros opcionales
    if (filtros.año_vigencia) {
      query = query.eq('año_vigencia', filtros.año_vigencia)
    }
    if (filtros.tipo_documento) {
      query = query.eq('tipo_documento', filtros.tipo_documento)
    }
    
    const { data: documentos, error } = await query
    
    if (error) throw error;
    if (!documentos || documentos.length === 0) {
      return new Response(JSON.stringify({
        message: 'No hay documentos pendientes para procesar'
      }), { status: 200 })
    }
    
    console.log(`📋 Procesando ${documentos.length} documentos en paralelo...`)
    
    // Marcar documentos como en procesamiento
    await supabase
      .from('documentos_oficiales')
      .update({ estado_procesamiento: 'procesando' })
      .in('id', documentos.map((d: Documento) => d.id))
    
    // Procesamiento en paralelo con límite de concurrencia
    const CONCURRENCY_LIMIT = 3
    const pipeline = new DocumentPipeline(supabase)
    const resultados = []
    
    for (let i = 0; i < documentos.length; i += CONCURRENCY_LIMIT) {
      const lote = documentos.slice(i, i + CONCURRENCY_LIMIT)
      
      const promesasLote = lote.map(async (documento: Documento) => {
        try {
          console.log(`  📄 Procesando: ${documento.titulo}`)
          const resultado = await pipeline.process(documento)
          
          if (resultado.success) {
            console.log(`  ✅ Completado: ${documento.titulo} (${resultado.metrics.total_time_ms}ms)`)
          } else {
            console.log(`  ❌ Falló: ${documento.titulo} - ${resultado.error}`)
          }
          
          return resultado
        } catch (error) {
          console.error(`  💥 Error crítico en ${documento.titulo}:`, error)
          return {
            success: false,
            document_id: documento.id,
            error: error instanceof Error ? error.message : 'Error desconocido',
            stage_completed: 'none'
          }
        }
      })
      
      const resultadosLote = await Promise.allSettled(promesasLote)
      
      // Procesar resultados del lote
      for (const resultado of resultadosLote) {
        if (resultado.status === 'fulfilled') {
          resultados.push(resultado.value)
        } else {
          resultados.push({
            success: false,
            error: resultado.reason instanceof Error ? resultado.reason.message : 'Error desconocido',
            stage_completed: 'none'
          })
        }
      }
      
      // Pausa entre lotes para no sobrecargar
      if (i + CONCURRENCY_LIMIT < documentos.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    // Calcular estadísticas
    const exitosos = resultados.filter(r => r.success).length
    const fallidos = resultados.length - exitosos
    const tiempoTotal = Date.now() - startTime
    
    const loteResult: LoteResult = {
      total_documentos: documentos.length,
      procesados_exitosamente: exitosos,
      fallidos,
      tiempo_total_ms: tiempoTotal,
      resultados
    }
    
    // Guardar métricas del lote
    await supabase.from('metricas_procesamiento').insert({
      tipo: 'lote',
      documentos_procesados: exitosos,
      documentos_fallidos: fallidos,
      tiempo_total_ms: tiempoTotal,
      concurrencia_usada: CONCURRENCY_LIMIT,
      metadata: { filtros, limite }
    })

    console.log(`🏁 Lote completado: ${exitosos}/${documentos.length} exitosos en ${tiempoTotal}ms`)

    return new Response(JSON.stringify({
      success: true,
      ...loteResult
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return new Response(JSON.stringify({
        error: 'No autorizado'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.error('❌ Error en procesamiento de lote:', error)

    return new Response(JSON.stringify({
      error: 'Error en procesamiento de lote',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})