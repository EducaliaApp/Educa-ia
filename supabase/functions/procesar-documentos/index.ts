// supabase/functions/procesar-documentos/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { crearClienteServicio, UnauthorizedError } from '../shared/service-auth.ts'


// Utility: read a ReadableStream or Blob-like from Supabase storage response
async function blobFromResponse(res: { arrayBuffer?: () => Promise<ArrayBuffer>, body?: ReadableStream<Uint8Array> }): Promise<ArrayBuffer> {
  if (res.arrayBuffer) return await res.arrayBuffer();
  if (res.body) {
    const buffer = await new Response(res.body).arrayBuffer();
    return buffer;
  }
  throw new Error('Unsupported download response format');
}
async function extraerTextoDePDF(arrayBuffer: ArrayBuffer): Promise<string> {
  // Validación básica de PDF
  const header = new Uint8Array(arrayBuffer.slice(0, 4));
  const pdfHeader = String.fromCharCode(...header);
  
  if (!pdfHeader.startsWith('%PDF')) {
    throw new Error('Archivo no es un PDF válido');
  }
  
  // Extracción de texto simplificada
  const decoder = new TextDecoder('utf-8', { fatal: false });
  let texto = decoder.decode(arrayBuffer);
  
  // Limpiar y extraer texto legible
  texto = texto
    .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Buscar patrones de texto
  const matches = texto.match(/[A-Za-zÀ-ſ\s]{10,}/g);
  const textoLimpio = matches ? matches.join(' ').substring(0, 50000) : 'Contenido extraído del PDF';
  
  return textoLimpio;
}

// Main handler
async function handler(req: Request): Promise<Response> {
  try {
    const supabase = crearClienteServicio(req)
    const { documento_id } = await req.json();
    console.log(`📄 Procesando documento: ${documento_id}`);
    
    const { data: documento, error } = await supabase
      .from('documentos_oficiales')
      .select('*')
      .eq('id', documento_id)
      .single();
      
    if (error || !documento) throw new Error('Documento no encontrado');
    if (!documento.storage_path) throw new Error('Documento no tiene storage_path');
    
    const download = await supabase.storage
      .from('documentos-oficiales')
      .download(documento.storage_path);
      
    if (download.error) throw download.error;
    
    const arrayBuffer = await blobFromResponse(download.data);
    const textoCompleto = await extraerTextoDePDF(arrayBuffer);
    
    // Actualizar documento con texto extraído
    await supabase.from('documentos_oficiales').update({
      procesado: true,
      contenido_texto: textoCompleto,
      fecha_procesamiento: new Date().toISOString()
    }).eq('id', documento.id);
    
    console.log(`✅ Documento procesado: ${textoCompleto.length} caracteres extraídos`);
    
    return new Response(JSON.stringify({
      success: true,
      texto_extraido: textoCompleto.length
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return new Response(JSON.stringify({
        error: 'No autorizado'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    console.error('Error procesando documento:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

if (import.meta.main) {
  serve(handler)
}
