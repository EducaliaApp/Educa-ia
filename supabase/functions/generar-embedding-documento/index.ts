// supabase/functions/generar-embedding-documento/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { crearClienteServicio } from '../shared/service-auth.ts'

interface EmbeddingRequest {
  documento_id: string
  texto: string
}

export async function handler(req: Request): Promise<Response> {
  try {
    const supabase = crearClienteServicio(req)
    const { documento_id, texto }: EmbeddingRequest = await req.json()

    if (!documento_id || !texto) {
      throw new Error('documento_id y texto son requeridos')
    }

    console.log(`🔢 Generando embedding para documento: ${documento_id}`)

    // Generar embedding usando OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY no configurada')
    }

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texto,
        encoding_format: 'float'
      })
    })

    if (!embeddingResponse.ok) {
      const errorData = await embeddingResponse.text()
      throw new Error(`OpenAI API error: ${embeddingResponse.status} - ${errorData}`)
    }

    const embeddingData = await embeddingResponse.json()
    const embedding = embeddingData.data[0].embedding

    // Actualizar documento con embedding
    const { error: updateError } = await supabase
      .from('documentos_oficiales')
      .update({ 
        embedding: embedding,
        embedding_generado_at: new Date().toISOString()
      })
      .eq('id', documento_id)

    if (updateError) {
      throw new Error(`Error actualizando documento: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        documento_id,
        embedding_dimensions: embedding.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error generando embedding:', error)

    return new Response(
      JSON.stringify({
        error: 'Error generando embedding',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

if (import.meta.main) {
  serve(handler)
}