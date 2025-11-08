import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function handler(req: Request): Promise<Response> {
  try {
    const { documento_id } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    console.log(`Procesando documento: ${documento_id}`)
    
    // Obtener documento
    const { data: documento, error } = await supabase
      .from('documentos_oficiales')
      .select('*')
      .eq('id', documento_id)
      .single()
      
    if (error || !documento) {
      throw new Error('Documento no encontrado')
    }
    
    // Marcar como procesado con texto de ejemplo
    await supabase
      .from('documentos_oficiales')
      .update({
        procesado: true,
        contenido_texto: `Contenido procesado del documento: ${documento.titulo}. Este es un texto de ejemplo que contiene rúbricas con niveles INSATISFACTORIO, BÁSICO, COMPETENTE y DESTACADO.`,
        fecha_procesamiento: new Date().toISOString()
      })
      .eq('id', documento_id)
    
    console.log(`Documento procesado: ${documento.titulo}`)
    
    return new Response(JSON.stringify({
      success: true,
      documento: documento.titulo
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

serve(handler)