// @ts-nocheck
import { getDocument } from 'npm:pdfjs-dist@3.11.174'
import { DocumentProcessor } from '../shared/document-processor.ts'
import { AIAnalyzer } from '../shared/ai-analyzer.ts'
import { crearClienteServicio, UnauthorizedError } from '../shared/service-auth.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');

async function createEmbeddings(processor: DocumentProcessor, inputs: string[]) {
  return processor.processWithRetry(async () => {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large',
        input: inputs
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OpenAI embeddings error: ${res.status} ${txt}`);
    }
    const json = await res.json();
    return json.data.map((d: any) => d.embedding);
  }, 'OpenAI embeddings');
}
// Utility: read a ReadableStream or Blob-like from Supabase storage response
async function blobFromResponse(res: any) {
  // supabase-js returns a Response-like object with body as ReadableStream
  if (res.arrayBuffer) return await res.arrayBuffer();
  if (res.body) {
    const buffer = await new Response(res.body).arrayBuffer();
    return buffer;
  }
  throw new Error('Unsupported download response format');
}
async function extraerTextoDePDF(processor: DocumentProcessor, arrayBuffer: ArrayBuffer) {
  if (!await processor.validatePDF(arrayBuffer)) {
    throw new Error('Archivo PDF inválido o corrupto');
  }
  
  return processor.processWithRetry(async () => {
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    let textoCompleto = '';
    
    for(let i = 1; i <= pdf.numPages; i++){
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      textoCompleto += `\n--- PÁGINA ${i} ---\n${pageText}\n`;
    }
    return textoCompleto;
  }, 'PDF text extraction');
}
// Chunking functions (kept same logic as provided)
function chunkearGenerico(texto: string, documento: any) {
  const CHUNK_SIZE = 1500;
  const OVERLAP = 200;
  const chunks = [];
  let start = 0;
  let chunkIndex = 0;
  while(start < texto.length){
    const end = Math.min(start + CHUNK_SIZE, texto.length);
    const chunk = texto.substring(start, end);
    chunks.push({
      index: chunkIndex++,
      contenido: chunk,
      tipo_contenido: 'general',
      metadata: {
        año: documento.año_vigencia
      }
    });
    start += CHUNK_SIZE - OVERLAP;
  }
  return chunks;
}
function detectarDominioMBE(texto: string) {
  const dominios = {
    A: [
      'preparación',
      'planificación',
      'diseño'
    ],
    B: [
      'ambiente',
      'clima',
      'convivencia'
    ],
    C: [
      'enseñanza',
      'aprendizaje',
      'instrucción'
    ],
    D: [
      'profesional',
      'reflexión',
      'colaboración'
    ]
  };
  for (const [dominio, keywords] of Object.entries(dominios)){
    for (const keyword of keywords)if (new RegExp(keyword, 'i').test(texto)) return dominio;
  }
  return null;
}
function chunkearMBE(texto: string, documento: any) {
  const chunks = [];
  let chunkIndex = 0;
  const seccionesEstandar = texto.split(/Estándar\s+\d+/i);
  for(let i = 1; i < seccionesEstandar.length; i++){
    const contenido = seccionesEstandar[i].trim();
    if (contenido.length < 100) continue;
    const dominio = detectarDominioMBE(contenido);
    chunks.push({
      index: chunkIndex++,
      contenido: contenido.substring(0, 2000),
      seccion: `Estándar ${i}`,
      dominio_mbe: dominio,
      estandar_numero: i,
      tipo_contenido: 'descriptor',
      metadata: {
        año: documento.año_vigencia,
        version_mbe: '2021'
      }
    });
  }
  return chunks;
}
function chunkearManual(texto: string, documento: any) {
  const chunks = [];
  let chunkIndex = 0;
  const seccionesModulo = texto.split(/Módulo\s+\d+/i);
  for(let i = 1; i < seccionesModulo.length; i++){
    const contenidoModulo = seccionesModulo[i];
    const numeroModulo = i;
    const tareas = contenidoModulo.split(/Tarea\s+\d+/i);
    for(let j = 1; j < tareas.length; j++){
      const contenidoTarea = tareas[j].trim();
      if (contenidoTarea.length < 100) continue;
      chunks.push({
        index: chunkIndex++,
        contenido: contenidoTarea.substring(0, 2000),
        seccion: `Módulo ${numeroModulo}`,
        subseccion: `Tarea ${j}`,
        tipo_contenido: 'instructivo',
        metadata: {
          modulo: numeroModulo,
          tarea: j,
          año: documento.año_vigencia
        }
      });
    }
  }
  return chunks;
}
function chunkearRubrica(texto: string, documento: any) {
  const chunks = [];
  let chunkIndex = 0;
  const patronCriterio = /(?:Criterio|Descriptor|Nivel)\s+([A-D]\.??\d+)/gi;
  const matches = [
    ...texto.matchAll(patronCriterio)
  ];
  for(let i = 0; i < matches.length; i++){
    const inicio = matches[i].index;
    const fin = matches[i + 1]?.index || texto.length;
    const contenidoChunk = texto.substring(inicio, fin).trim();
    if (contenidoChunk.length < 50) continue;
    const criterioMatch = matches[i][1];
    const dominio = criterioMatch[0].toUpperCase();
    const estandar = parseInt(criterioMatch.match(/\d+/)?.[0] || '0');
    chunks.push({
      index: chunkIndex++,
      contenido: contenidoChunk,
      seccion: `Criterio ${criterioMatch}`,
      dominio_mbe: dominio,
      estandar_numero: estandar,
      tipo_contenido: 'rubrica',
      metadata: {
        año: documento.año_vigencia,
        asignatura: documento.asignatura
      }
    });
  }
  return chunks;
}
function chunkearDocumento(texto: string, documento: any) {
  if (documento.tipo_documento === 'rubrica') return chunkearRubrica(texto, documento);
  if (documento.tipo_documento === 'manual_portafolio') return chunkearManual(texto, documento);
  if (documento.tipo_documento === 'mbe') return chunkearMBE(texto, documento);
  return chunkearGenerico(texto, documento);
}
async function generarEmbeddings(chunks: any[], processor: DocumentProcessor) {
  console.log(`🔢 Generando embeddings para ${chunks.length} chunks...`);
  const BATCH_SIZE = 20;
  const result = [];
  for(let i = 0; i < chunks.length; i += BATCH_SIZE){
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const inputs = batch.map((c: any) => c.contenido);
  const embeddings = await createEmbeddings(processor, inputs);
    for(let j = 0; j < batch.length; j++)result.push({
      ...batch[j],
      embedding: embeddings[j]
    });
    if (i + BATCH_SIZE < chunks.length) await new Promise((r)=>setTimeout(r, 1000));
  }
  return result;
}
// Main handler
Deno.serve(async (req: Request) => {
  try {
    const supabase = crearClienteServicio(req)
    const processor = new DocumentProcessor(supabase)
    const aiAnalyzer = new AIAnalyzer()
    const { documento_id } = await req.json();
    console.log(`📄 Procesando documento: ${documento_id}`);
    const { data: documento, error } = await supabase.from('documentos_oficiales').select('*').eq('id', documento_id).single();
    if (error || !documento) throw new Error('Documento no encontrado');
    if (!documento.storage_path) throw new Error('Documento no tiene storage_path');
    const download = await supabase.storage.from('documentos-oficiales').download(documento.storage_path);
    if (download.error) throw download.error;
    const arrayBuffer = await blobFromResponse(download.data);
    const textoCompleto = await extraerTextoDePDF(processor, arrayBuffer);
    
    // Clasificación inteligente con LIA
    const clasificacionIA = await aiAnalyzer.clasificarDocumento(textoCompleto);
    
    // Validar coherencia entre clasificación y tipo esperado
    if (clasificacionIA.confianza > 0.8 && clasificacionIA.tipo_documento !== documento.tipo_documento) {
      console.warn(`Posible error de clasificación: esperado ${documento.tipo_documento}, detectado ${clasificacionIA.tipo_documento}`);
    }
    
    // Extraer entidades educativas
    const entidades = await aiAnalyzer.extraerEntidades(textoCompleto);
    
  const chunks = await chunkearDocumento(textoCompleto, documento);
  const chunksConEmbeddings = await generarEmbeddings(chunks, processor);
    for (const chunk of chunksConEmbeddings){
  const insertRes = await supabase.from('chunks_documentos').insert({
        documento_id: documento.id,
        contenido: chunk.contenido,
        chunk_index: chunk.index,
        seccion: chunk.seccion || null,
        subseccion: chunk.subseccion || null,
        pagina_numero: chunk.pagina || null,
        dominio_mbe: chunk.dominio_mbe || null,
        estandar_numero: chunk.estandar_numero || null,
        tipo_contenido: chunk.tipo_contenido,
        embedding: chunk.embedding,
        metadata: chunk.metadata
      });
      if (insertRes.error) console.error('Insert chunk error', insertRes.error);
    }
    // Guardar entidades extraídas
    for (const entidad of entidades) {
      await supabase.from('entidades_educativas').insert({
        documento_id: documento.id,
        tipo: entidad.tipo,
        texto: entidad.texto,
        dominio_mbe: entidad.dominio,
        nivel_taxonomico: entidad.nivel_taxonomico,
        asignaturas_relacionadas: entidad.asignaturas_relacionadas,
        metadata: { confianza_ia: clasificacionIA.confianza }
      }).catch(() => {}); // No fallar si no se puede guardar
    }
    
    await supabase.from('documentos_oficiales').update({
      procesado: true,
      contenido_texto: textoCompleto,
      fecha_procesamiento: new Date().toISOString(),
      clasificacion_ia: clasificacionIA,
      entidades_extraidas: entidades.length
    }).eq('id', documento.id);
    console.log(`✅ Documento procesado: ${chunksConEmbeddings.length} chunks creados`);
    return new Response(JSON.stringify({
      success: true,
      chunks_created: chunksConEmbeddings.length
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
    return new Response(JSON.stringify({
      error: String(error.message || error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
