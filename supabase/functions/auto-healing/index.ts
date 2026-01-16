import { DocumentPipeline } from '../shared/document-pipeline.ts'
import { crearClienteServicio, UnauthorizedError } from '../shared/service-auth.ts'

interface HealingResult {
  documentos_recuperados: number
  chunks_limpiados: number
  reintentos_programados: number
  tiempo_total_ms: number
}

interface DocumentoOficial {
  id: string
  titulo: string
  estado_procesamiento?: string | null
  procesado?: boolean
}

interface Reintento {
  id: string
  documento_id: string
  intentos: number
  programado_para: string
  documentos_oficiales: DocumentoOficial
}

interface Chunk {
  id: string
  contenido: string
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now()

  try {
    const supabase = crearClienteServicio(req)

    console.log('🔧 Iniciando proceso de auto-healing...')

    let documentosRecuperados = 0
    let chunksLimpiados = 0
    let reintentosProgram = 0
    
    // 1. Recuperar documentos en estado inconsistente
  console.log('📋 Buscando documentos en estado inconsistente...')
    
    const { data: docsInconsistentes } = await supabase
      .from('documentos_oficiales')
      .select('*')
      .eq('estado_procesamiento', 'procesando')
  .lt('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    
    if (docsInconsistentes && docsInconsistentes.length > 0) {
  console.log(`  🔄 Recuperando ${docsInconsistentes.length} documentos...`)
      
      await supabase
        .from('documentos_oficiales')
        .update({ 
          estado_procesamiento: null,
          progreso_procesamiento: 0,
          etapa_actual: null
        })
        .in('id', docsInconsistentes.map((d: DocumentoOficial) => d.id))

      documentosRecuperados = docsInconsistentes.length
    }
    
    // 2. Limpiar chunks huérfanos
  console.log('🧹 Limpiando chunks huérfanos...')
    
    const { data: chunksHuerfanos } = await supabase
      .from('chunks_documentos')
      .select('id')
      .not('documento_id', 'in', `(
        SELECT id FROM documentos_oficiales 
        WHERE procesado = true
      )`)
    
    if (chunksHuerfanos && chunksHuerfanos.length > 0) {
  console.log(`  🗑️ Eliminando ${chunksHuerfanos.length} chunks huérfanos...`)
      
      await supabase
        .from('chunks_documentos')
        .delete()
        .in('id', chunksHuerfanos.map((c: Chunk) => c.id))

      chunksLimpiados = chunksHuerfanos.length
    }
    
    // 3. Procesar reintentos programados
  console.log('⏰ Procesando reintentos programados...')
    
    const { data: reintentos } = await supabase
      .from('reintentos_procesamiento')
      .select('*, documentos_oficiales(*)')
      .lte('programado_para', new Date().toISOString())
  .lt('intentos', 3)
  .order('programado_para')
    
    if (reintentos && reintentos.length > 0) {
  console.log(`  🔄 Procesando ${reintentos.length} reintentos...`)

  const pipeline = new DocumentPipeline(supabase)
      
      for (const reintento of reintentos as Reintento[]) {
        try {
          console.log(`    📄 Reintentando: ${reintento.documentos_oficiales.titulo}`)

          const resultado = await pipeline.process(reintento.documentos_oficiales)
          
          if (resultado.success) {
            // Eliminar reintento exitoso
            await supabase
              .from('reintentos_procesamiento')
              .delete()
              .eq('id', reintento.id)

            console.log('    ✅ Reintento exitoso')
          } else {
            // Incrementar contador y reprogramar
            const siguienteIntento = new Date(Date.now() + Math.pow(2, reintento.intentos) * 60 * 1000)
            
            await supabase
              .from('reintentos_procesamiento')
              .update({
                intentos: reintento.intentos + 1,
                programado_para: siguienteIntento.toISOString(),
                ultimo_error: resultado.error
              })
              .eq('id', reintento.id)

            console.log(`    ⚠️ Reintento falló, reprogramado para ${siguienteIntento.toISOString()}`)
          }

          reintentosProgram++

        } catch (error) {
          console.error('    💥 Error crítico en reintento:', error)
          
          // Marcar como fallido permanentemente si excede límite
          if (reintento.intentos >= 2) {
            await supabase
              .from('reintentos_procesamiento')
              .delete()
              .eq('id', reintento.id)

            await supabase
              .from('documentos_oficiales')
              .update({ 
                estado_procesamiento: 'fallido_permanente',
                error_procesamiento: error instanceof Error ? error.message : String(error)
              })
              .eq('id', reintento.documento_id)
          }
        }
      }
    }

    // 4. Limpiar logs antiguos (más de 30 días)
    console.log('📝 Limpiando logs antiguos...')

    const fechaLimite = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    await supabase
      .from('system_logs')
      .delete()
      .lt('timestamp', fechaLimite)
      .neq('level', 'error')

    // 5. Comprimir chunks antiguos (más de 90 días)
    console.log('🗜️ Comprimiendo chunks antiguos...')

    const fechaCompresion = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    const { data: chunksAntiguos } = await supabase
      .from('chunks_documentos')
      .select('id, contenido')
      .lt('created_at', fechaCompresion)
      .is('comprimido', null)
    
    if (chunksAntiguos && chunksAntiguos.length > 0) {
  console.log(`  🗜️ Comprimiendo ${chunksAntiguos.length} chunks antiguos...`)
      
      for (const chunk of chunksAntiguos as Chunk[]) {
        // Comprimir contenido (simulado - en producción usar gzip)
        const contenidoComprimido = chunk.contenido.length > 500 ? 
          chunk.contenido.substring(0, 500) + '...[comprimido]' : 
          chunk.contenido

        await supabase
          .from('chunks_documentos')
          .update({ 
            contenido: contenidoComprimido,
            comprimido: true
          })
          .eq('id', chunk.id)
      }
    }

    const tiempoTotal = Date.now() - startTime

    const resultado: HealingResult = {
      documentos_recuperados: documentosRecuperados,
      chunks_limpiados: chunksLimpiados,
      reintentos_programados: reintentosProgram,
      tiempo_total_ms: tiempoTotal
    }

    // Guardar métricas de healing
    await supabase.from('metricas_procesamiento').insert({
      tipo: 'auto_healing',
      documentos_procesados: documentosRecuperados,
      tiempo_total_ms: tiempoTotal,
      metadata: resultado
    })

    console.log(`🏁 Auto-healing completado en ${tiempoTotal}ms`)
    console.log(`  📊 Documentos recuperados: ${documentosRecuperados}`)
    console.log(`  🧹 Chunks limpiados: ${chunksLimpiados}`)
    console.log(`  🔄 Reintentos procesados: ${reintentosProgram}`)

    return new Response(JSON.stringify({
      success: true,
      ...resultado
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

    console.error('❌ Error en auto-healing:', error)

    return new Response(JSON.stringify({
      error: 'Error en proceso de auto-healing',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})