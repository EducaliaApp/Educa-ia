// supabase/functions/monitor-documentos-oficiales/index.ts

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { DocumentProcessor } from '../shared/document-processor.ts'
import { AIAnalyzer } from '../shared/ai-analyzer.ts'
import { crearClienteServicio, UnauthorizedError } from '../shared/service-auth.ts'

// URLs oficiales del MINEDUC
const URLS_OFICIALES = {
  manuales: 'https://www.docentemas.cl/portafolio-2025/manuales',
  rubricas: 'https://www.docentemas.cl/portafolio-2025/rubricas',
  documentos: 'https://www.docentemas.cl/documentos-descargables'
}

export const PROCESAR_DOCUMENTO_FUNCTION = 'procesar-documentos'

interface DocumentoDetectado {
  nombre: string
  url: string
  tipo: string
  año: number
  nivel_educativo: string
  modalidad: string
  hash?: string
}

export async function handler(req: Request): Promise<Response> {
  try {
    console.log('🔍 Iniciando monitoreo de documentos oficiales...')

    const supabase = crearClienteServicio(req)
    const processor = new DocumentProcessor(supabase)
    const aiAnalyzer = new AIAnalyzer()
    const documentosDetectados: DocumentoDetectado[] = []

    // 1. Scrapear sitio oficial DocenteMás
    console.log('📡 Consultando sitio DocenteMás...')
    
    for (const [tipo, url] of Object.entries(URLS_OFICIALES)) {
      await processor.processWithRetry(async () => {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0)'
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const html = await response.text()
        const pdfLinks = extraerLinksPDF(html)
        
        for (const link of pdfLinks) {
          let metadata = parsearNombreArchivo(link.nombre)
          
          // Si parsing básico falla, usar LIA para clasificar
          if (!metadata) {
            try {
              const clasificacionResponse = await fetch(link.url)
              const buffer = await clasificacionResponse.arrayBuffer()

              if (await processor.validatePDF(buffer)) {
                const textoCrudo = new TextDecoder().decode(new Uint8Array(buffer).subarray(0, 4000))
                const textoMuestra = `${link.nombre} ${textoCrudo}`
                const clasificacion = await aiAnalyzer.clasificarDocumento(textoMuestra)
                
                if (clasificacion.confianza > 0.7) {
                  metadata = {
                    año: 2025, // Asumir año actual si no se detecta
                    nivel: clasificacion.nivel_educativo,
                    modalidad: clasificacion.modalidad
                  }
                }
              }
            } catch (error) {
              console.warn(`No se pudo clasificar ${link.nombre}:`, error.message)
            }
          }
          
          if (metadata && metadata.año >= 2024) {
            documentosDetectados.push({
              nombre: link.nombre,
              url: link.url,
              tipo,
              año: metadata.año,
              nivel_educativo: metadata.nivel,
              modalidad: metadata.modalidad
            })
          }
        }
        
        console.log(`  ✓ Encontrados ${pdfLinks.length} documentos en ${tipo}`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      }, `Scraping ${tipo}`).catch(error => {
        console.error(`  ✗ Error en ${tipo}:`, error.message)
      })
    }
    
    console.log(`📋 Total detectados: ${documentosDetectados.length} documentos`)
    
    // 2. Comparar con base de datos
    const documentosNuevos = []
    const documentosActualizados = []
    
    for (const doc of documentosDetectados) {
      // Verificar si ya existe
      const { data: existente } = await supabase
        .from('documentos_oficiales')
        .select('id, hash_sha256, version')
        .eq('nombre_archivo', doc.nombre)
        .eq('año_vigencia', doc.año)
        .single()
      
      if (!existente) {
        documentosNuevos.push(doc)
        console.log(`  🆕 Nuevo: ${doc.nombre}`)
      } else {
        const hashNuevo = await calcularHashRemoto(doc.url)
        
        if (hashNuevo && hashNuevo !== existente.hash_sha256) {
          // Análisis inteligente de cambios
          try {
            const { data: docAnterior } = await supabase
              .from('documentos_oficiales')
              .select('contenido_texto')
              .eq('id', existente.id)
              .single()
            
            if (docAnterior?.contenido_texto) {
              const response = await fetch(doc.url)
              const buffer = await response.arrayBuffer()
              // Extraer texto nuevo (simplificado para el ejemplo)
              const textoNuevo = new TextDecoder().decode(buffer).substring(0, 5000)
              
              const cambios = await aiAnalyzer.detectarCambios(
                docAnterior.contenido_texto.substring(0, 5000),
                textoNuevo
              )
              
              documentosActualizados.push({
                ...doc,
                id_existente: existente.id,
                version_anterior: existente.version,
                hash_nuevo: hashNuevo,
                cambios_detectados: cambios
              })
            }
          } catch (error) {
            console.warn(`Error analizando cambios en ${doc.nombre}:`, error.message)
            documentosActualizados.push({
              ...doc,
              id_existente: existente.id,
              version_anterior: existente.version,
              hash_nuevo: hashNuevo
            })
          }
          
          console.log(`  🔄 Actualizado: ${doc.nombre}`)
        }
      }
    }
    
    // 3. Procesar nuevos documentos
    const resultadosProcesamiento = []
    
    for (const doc of documentosNuevos) {
      console.log(`\n📥 Procesando nuevo documento: ${doc.nombre}`)
      
      try {
        const resultado = await procesarDocumentoNuevo(supabase, doc)
        resultadosProcesamiento.push(resultado)
      } catch (error) {
        console.error(`  ✗ Error procesando ${doc.nombre}:`, error.message)
        resultadosProcesamiento.push({
          documento: doc.nombre,
          exito: false,
          error: error.message
        })
      }
    }
    
    // 4. Procesar documentos actualizados
    for (const doc of documentosActualizados) {
      console.log(`\n🔄 Procesando actualización: ${doc.nombre}`)
      
      try {
        await procesarActualizacionDocumento(supabase, doc)
      } catch (error) {
        console.error(`  ✗ Error procesando actualización:`, error.message)
      }
    }
    
    // 5. Enviar reporte
    const reporte = {
      fecha_monitoreo: new Date().toISOString(),
      documentos_detectados: documentosDetectados.length,
      documentos_nuevos: documentosNuevos.length,
      documentos_actualizados: documentosActualizados.length,
      procesamiento_exitoso: resultadosProcesamiento.filter(r => r.exito).length,
      procesamiento_fallido: resultadosProcesamiento.filter(r => !r.exito).length,
      detalles: resultadosProcesamiento
    }
    
    console.log('\n✅ Monitoreo completado')
    console.log(`  📊 Nuevos: ${documentosNuevos.length}`)
    console.log(`  🔄 Actualizados: ${documentosActualizados.length}`)
    
    // 6. Notificar a administradores si hay cambios
    if (documentosNuevos.length > 0 || documentosActualizados.length > 0) {
      await notificarAdministradores(supabase, reporte)
    }

    return new Response(
      JSON.stringify({
        success: true,
        reporte
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    console.error('❌ Error en monitoreo:', error)

    return new Response(
      JSON.stringify({
        error: 'Error en monitoreo de documentos',
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

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function extraerLinksPDF(html: string): Array<{ nombre: string; url: string }> {
  const links: Array<{ nombre: string; url: string }> = []
  const baseUrl = 'https://www.docentemas.cl'
  
  // Múltiples patrones para diferentes estructuras HTML
  const patrones = [
    /href=["']([^"']*\.pdf)["'][^>]*>([^<]*)<\/a>/gi,
    /href=["']([^"']*\.pdf)["'][^>]*title=["']([^"']*)["']/gi,
    /<a[^>]*href=["']([^"']*\.pdf)["'][^>]*>.*?<span[^>]*>([^<]*)<\/span>/gi,
    /<a[^>]*href=["']([^"']*\.pdf)["'][^>]*data-title=["']([^"']*)["']/gi
  ]
  
  for (const patron of patrones) {
    let match
    while ((match = patron.exec(html)) !== null) {
      const url = match[1]
      const nombre = (match[2] || url.split('/').pop() || '').trim()
      
      if (nombre && !links.some(l => l.url === url)) {
        links.push({
          nombre,
          url: url.startsWith('http') ? url : new URL(url, baseUrl).href
        })
      }
    }
  }
  
  return links
}

function parsearNombreArchivo(nombre: string): {
  año: number
  nivel: string
  modalidad: string
} | null {
  
  const nombreLower = nombre.toLowerCase()
  
  // Detectar año con múltiples patrones
  const añoMatch = nombre.match(/202[0-9]/) || nombre.match(/\b(2024|2025|2026)\b/)
  if (!añoMatch) return null
  
  const año = parseInt(añoMatch[0])
  
  // Patrones mejorados para nivel educativo
  let nivel = 'regular'
  const patronesNivel = {
    'parvularia': /parvularia|párvulo|pre\s*escolar/,
    'basica_1_6': /1°?\s*a\s*6°?|básica.*1.*6|primero.*sexto/,
    'basica_7_8_media': /7°?.*8°?|séptimo.*octavo|media|secundaria/,
    'media_tp': /técnico\s*profesional|tp|medio.*técnico/,
    'especial_regular': /especial.*regular|integración/,
    'especial_neep': /especial.*neep|escuela.*especial/,
    'hospitalaria': /hospitalaria|hospital/,
    'encierro': /encierro|cárcel|penitenciar/,
    'lengua_indigena': /lengua.*indígena|mapuche|quechua|aymara/,
    'epja': /adultos|jóvenes.*adultas|epja/
  }
  
  for (const [key, patron] of Object.entries(patronesNivel)) {
    if (patron.test(nombreLower)) {
      nivel = key
      break
    }
  }
  
  // Detectar modalidad
  let modalidad = 'regular'
  if (/especial/.test(nombreLower)) modalidad = 'especial'
  if (/hospitalaria/.test(nombreLower)) modalidad = 'hospitalaria'
  if (/encierro/.test(nombreLower)) modalidad = 'encierro'
  if (/lengua.*indígena/.test(nombreLower)) modalidad = 'lengua_indigena'
  
  return { año, nivel, modalidad }
}

async function calcularHashRemoto(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  } catch (error) {
    console.error('Error calculando hash:', error)
    return null
  }
}

export async function procesarDocumentoNuevo(
  supabase: any,
  doc: DocumentoDetectado
): Promise<any> {
  
  // 1. Descargar documento
  console.log('  📥 Descargando...')
  const response = await fetch(doc.url)
  const pdfBuffer = await response.arrayBuffer()
  const hash = await calcularHash(pdfBuffer)
  
  // 2. Subir a Supabase Storage
  console.log('  💾 Subiendo a storage...')
  const fileName = `${doc.tipo}/${doc.año}/${doc.nombre}`
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documentos-oficiales')
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false
    })
  
  if (uploadError) {
    throw new Error(`Error subiendo archivo: ${uploadError.message}`)
  }
  
  // 3. Registrar en base de datos
  console.log('  📝 Registrando en BD...')
  const { data: documentoRegistrado, error: dbError } = await supabase
    .from('documentos_oficiales')
    .insert({
      tipo_documento: mapearTipoDocumento(doc.tipo),
      nivel_educativo: doc.nivel_educativo,
      modalidad: doc.modalidad,
      año_vigencia: doc.año,
      nombre_archivo: doc.nombre,
      url_original: doc.url,
      storage_path: fileName,
      hash_sha256: hash,
      tamaño_bytes: pdfBuffer.byteLength,
      version: `${doc.año}.1`,
      estado: 'pendiente'
    })
    .select()
    .single()
  
  if (dbError) {
    throw new Error(`Error en BD: ${dbError.message}`)
  }
  
  // 4. Disparar procesamiento asíncrono
  console.log('  ⚙️ Iniciando procesamiento...')
  await supabase.functions.invoke(PROCESAR_DOCUMENTO_FUNCTION, {
    body: { documento_id: documentoRegistrado.id }
  })
  
  return {
    documento: doc.nombre,
    exito: true,
    documento_id: documentoRegistrado.id
  }
}

async function procesarActualizacionDocumento(
  supabase: any,
  doc: any
): Promise<void> {
  
  // 1. Archivar versión anterior
  await supabase
    .from('documentos_oficiales')
    .update({ estado: 'archivado' })
    .eq('id', doc.id_existente)
  
  // 2. Crear nueva versión
  const nuevaVersion = incrementarVersion(doc.version_anterior)
  
  // Repetir proceso de descarga y registro
  await procesarDocumentoNuevo(supabase, {
    ...doc,
    version: nuevaVersion
  })
  
  // 3. Registrar cambio
  const { data: cambio } = await supabase
    .from('cambios_documentos')
    .insert({
      documento_id: doc.id_existente,
      version_anterior: doc.version_anterior,
      version_nueva: nuevaVersion,
      cambios_detectados: [],
      tipo_cambio: 'moderado' // Se determinará en el procesamiento
    })
    .select()
    .single()
  
  console.log(`  ✓ Cambio registrado: ${doc.version_anterior} → ${nuevaVersion}`)
}

function mapearTipoDocumento(tipo: string): string {
  const mapeo: Record<string, string> = {
    'manuales': 'manual_portafolio',
    'rubricas': 'rubricas',
    'documentos': 'instructivo'
  }
  return mapeo[tipo] || 'manual_portafolio'
}

function incrementarVersion(versionAnterior: string): string {
  const partes = versionAnterior.split('.')
  const minor = parseInt(partes[1] || '0') + 1
  return `${partes[0]}.${minor}`
}

async function calcularHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function notificarAdministradores(supabase: any, reporte: any): Promise<void> {
  console.log('📧 Notificando a administradores...')
  
  // Crear notificación en tiempo real
  const notificacion = {
    tipo: 'cambios_documentos',
    titulo: `${reporte.documentos_nuevos + reporte.documentos_actualizados} documentos actualizados`,
    mensaje: `Nuevos: ${reporte.documentos_nuevos}, Actualizados: ${reporte.documentos_actualizados}`,
    fecha: reporte.fecha_monitoreo,
    prioridad: reporte.documentos_nuevos > 0 ? 'alta' : 'media',
    metadata: reporte
  }
  
  // Insertar en tabla de notificaciones
  await supabase.from('notificaciones_admin').insert(notificacion)
  
  // Enviar por canal en tiempo real
  await supabase
    .channel('admin-notifications')
    .send({
      type: 'broadcast',
      event: 'documento_cambio',
      payload: notificacion
    })
  
  console.log('  ✓ Notificación enviada')
}