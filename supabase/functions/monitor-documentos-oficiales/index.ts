// supabase/functions/monitor-documentos-oficiales/index.ts

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { DocumentProcessor } from '../shared/document-processor.ts'
import { AIAnalyzer } from '../shared/ai-analyzer.ts'
import { crearClienteServicio, UnauthorizedError } from '../shared/service-auth.ts'

// URLs oficiales del MINEDUC
const URLS_OFICIALES = {
  manuales: 'https://www.docentemas.cl/documentos-descargables/manuales-de-instrumentos/',
  rubricas: 'https://www.docentemas.cl/documentos-descargables/rubricas',
  tiposDeInformesDeResultados: 'https://www.docentemas.cl/documentos-descargables/tipos-de-informes-de-resultados',
  documentos: 'https://www.docentemas.cl/documentos-descargables',
  documentosLegales: 'https://www.docentemas.cl/documentos-descargables/documentos-legales-2'
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
          let metadata = parsearNombreArchivo(link.nombre, tipo, html)
          
          // Si parsing básico falla, intentar clasificación con IA
          if (!metadata) {
            console.log(`  🤖 Intentando clasificación con IA para ${link.nombre}...`)
            metadata = await clasificarConIA(link, aiAnalyzer, processor)
            
            // Si IA también falla, usar valores por defecto
            if (!metadata) {
              metadata = {
                año: 2025,
                nivel: inferirNivelPorTipo(tipo),
                modalidad: 'regular'
              }
              console.log(`  ℹ️  Usando valores por defecto para ${link.nombre} (tipo: ${tipo})`)
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
        .select('id, hash_contenido, version')
        .eq('titulo', doc.nombre)
        .eq('año_vigencia', doc.año)
        .single()
      
      if (!existente) {
        documentosNuevos.push(doc)
        console.log(`  🆕 Nuevo: ${doc.nombre}`)
      } else {
        const hashNuevo = await calcularHashRemoto(doc.url)
        
        if (hashNuevo && hashNuevo !== existente.hash_contenido) {
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
  
  // Patrón principal: data-downloadurl con WordPress Download Manager
  const patronDataDownload = /<div[^>]*>.*?<a[^>]*data-downloadurl=["']([^"']*)["'][^>]*>([^<]*)<\/a>.*?<\/div>/gis
  
  let match
  while ((match = patronDataDownload.exec(html)) !== null) {
    const url = match[1].replace(/&amp;/g, '&') // Decodificar HTML entities
    const textoBoton = match[2].trim()
    const contextoDiv = match[0] // Todo el div para extraer más contexto
    
    // Extraer nombre mejorado con contexto
    const nombre = extraerNombreConContexto(url, textoBoton, contextoDiv)
    
    if (url && !links.some(l => l.url === url)) {
      links.push({
        nombre,
        url: url.startsWith('http') ? url : new URL(url, baseUrl).href
      })
    }
  }
  
  // Patrones adicionales como fallback
  const patronesAdicionales = [
    // Enlaces directos a PDF
    /href=["']([^"']*\.pdf[^"']*)["'][^>]*>([^<]*)<\/a>/gi,
    // WordPress Download Manager en href
    /href=["']([^"']*\?wpdmdl=\d+[^"']*)["'][^>]*>([^<]*)<\/a>/gi
  ]
  
  for (const patron of patronesAdicionales) {
    while ((match = patron.exec(html)) !== null) {
      const url = match[1].replace(/&amp;/g, '&')
      const nombre = (match[2] || extraerNombreDeUrl(url) || '').trim()
      
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

function extraerNombreDeUrl(url: string): string {
  // Para URLs con wpdmdl, intentar extraer nombre del contexto
  if (url.includes('wpdmdl=')) {
    const id = url.match(/wpdmdl=(\d+)/)?.[1]
    return id ? `documento_${id}` : 'documento'
  }
  
  // Para URLs directas, usar el nombre del archivo
  return url.split('/').pop()?.split('?')[0] || 'documento'
}

function extraerNombreConContexto(url: string, textoBoton: string, contextoHtml: string): string {
  // Buscar títulos o descripciones en el contexto HTML
  const patronTitulo = /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i
  const patronDescripcion = /<p[^>]*>([^<]+)<\/p>/i
  const patronStrong = /<strong[^>]*>([^<]+)<\/strong>/i
  
  const matchTitulo = contextoHtml.match(patronTitulo)
  const matchDescripcion = contextoHtml.match(patronDescripcion)
  const matchStrong = contextoHtml.match(patronStrong)
  
  // Priorizar título, luego descripción, luego texto del botón
  const nombreContexto = matchTitulo?.[1]?.trim() || 
                         matchStrong?.[1]?.trim() ||
                         matchDescripcion?.[1]?.trim() ||
                         textoBoton
  
  // Si encontramos contexto útil, usarlo; sino usar URL
  if (nombreContexto && nombreContexto !== 'Descargar' && nombreContexto.length > 5) {
    return nombreContexto.replace(/[^a-zA-Z0-9À-ſ\s\-_]/g, '').trim()
  }
  
  return extraerNombreDeUrl(url)
}

function parsearNombreArchivo(nombre: string, tipo?: string, html?: string): {
  año: number
  nivel: string
  modalidad: string
} | null {
  
  const nombreLower = nombre.toLowerCase()
  
  // Detectar año con múltiples patrones
  const añoMatch = nombre.match(/202[0-9]/) || nombre.match(/\b(2024|2025|2026)\b/)
  const año = añoMatch ? parseInt(añoMatch[0]) : 2025 // Default a 2025 si no se encuentra
  
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

function inferirNivelPorTipo(tipo: string): string {
  // Inferir nivel educativo basado en el tipo de documento
  const mapeoNivel: Record<string, string> = {
    'manuales': 'regular',
    'rubricas': 'regular', 
    'referentesCurriculares': 'basica_1_6',
    'tiposDeInformesDeResultados': 'regular',
    'documentos': 'regular',
    'documentosLegales': 'regular'
  }
  return mapeoNivel[tipo] || 'regular'
}

async function clasificarConIA(
  link: { nombre: string; url: string },
  aiAnalyzer: any,
  processor: any
): Promise<{ año: number; nivel: string; modalidad: string } | null> {
  try {
    // 1. Descargar una muestra del PDF
    const response = await fetch(link.url)
    if (!response.ok) return null
    
    const buffer = await response.arrayBuffer()
    
    // 2. Validar que es un PDF válido
    if (!(await processor.validatePDF(buffer))) {
      console.log(`    ⚠️  Archivo no es un PDF válido: ${link.nombre}`)
      return null
    }
    
    // 3. Extraer texto de las primeras páginas
    const textoExtraido = await extraerTextoPDF(buffer)
    if (!textoExtraido || textoExtraido.length < 100) {
      console.log(`    ⚠️  No se pudo extraer texto suficiente: ${link.nombre}`)
      return null
    }
    
    // 4. Crear prompt para clasificación
    const prompt = `Analiza este documento educativo chileno y clasifícalo:

Nombre del archivo: ${link.nombre}

Contenido (primeras líneas):
${textoExtraido.substring(0, 2000)}

Responde SOLO con JSON válido:
{
  "año": 2025,
  "nivel_educativo": "basica_1_6|basica_7_8_media|media_tp|parvularia|especial_regular|especial_neep|hospitalaria|encierro|lengua_indigena|epja|regular",
  "modalidad": "regular|especial|hospitalaria|encierro|lengua_indigena",
  "confianza": 0.8
}`
    
    // 5. Llamar a la IA
    const clasificacion = await aiAnalyzer.clasificarDocumento(prompt)
    
    if (clasificacion && clasificacion.confianza > 0.6) {
      console.log(`    ✅ Clasificado con IA: ${link.nombre} (confianza: ${clasificacion.confianza})`)
      return {
        año: clasificacion.año || 2025,
        nivel: clasificacion.nivel_educativo || 'regular',
        modalidad: clasificacion.modalidad || 'regular'
      }
    }
    
    return null
    
  } catch (error) {
    console.log(`    ⚠️  Error en clasificación IA para ${link.nombre}: ${error.message}`)
    return null
  }
}

async function extraerTextoPDF(buffer: ArrayBuffer): Promise<string> {
  try {
    // Implementación simplificada - en producción usarías una librería como pdf-parse
    const uint8Array = new Uint8Array(buffer)
    const decoder = new TextDecoder('utf-8', { fatal: false })
    let texto = decoder.decode(uint8Array)
    
    // Limpiar texto extraído
    texto = texto
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ') // Remover caracteres de control
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim()
    
    // Buscar patrones de texto legible
    const patronesTexto = [
      /[A-Za-zÀ-ſ]{3,}/g, // Palabras con al menos 3 caracteres
      /\d{4}/g, // Años
      /[A-Za-zÀ-ſ\s]{10,}/g // Frases
    ]
    
    let textoLimpio = ''
    for (const patron of patronesTexto) {
      const matches = texto.match(patron)
      if (matches) {
        textoLimpio += matches.join(' ') + ' '
      }
    }
    
    return textoLimpio.substring(0, 3000) // Limitar tamaño
    
  } catch (error) {
    console.error('Error extrayendo texto PDF:', error)
    return ''
  }
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
  const fileName = `${doc.tipo}/${doc.año}/${doc.nombre.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  
  // Asegurar que el bucket existe
  await crearBucketSiNoExiste(supabase)
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documentos-oficiales')
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true // Cambiar a true para permitir sobrescribir
    })
  
  if (uploadError) {
    throw new Error(`Error subiendo archivo: ${uploadError.message}`)
  }
  
  // 3. Registrar en base de datos
  console.log('  📝 Registrando en BD...')
  // Crear o obtener fuente
  let fuenteId
  try {
    const { data: fuente, error: fuenteError } = await supabase
      .from('fuentes_documentacion')
      .select('id')
      .eq('nombre', 'DocenteMas')
      .maybeSingle()
    
    if (fuente?.id) {
      fuenteId = fuente.id
    } else {
      console.log('  📁 Creando fuente DocenteMas...')
      const { data: nuevaFuente, error: insertError } = await supabase
        .from('fuentes_documentacion')
        .insert({
          nombre: 'DocenteMas',
          url_base: 'https://www.docentemas.cl',
          tipo_fuente: 'sitio_web',
          activo: true,
          patron_url: 'https://www.docentemas.cl/documentos-descargables/*',
          frecuencia_check: '1 day'
        })
        .select('id')
        .single()
      
      if (insertError) {
        throw new Error(`Error creando fuente: ${insertError.message}`)
      }
      
      fuenteId = nuevaFuente?.id
    }
  } catch (error) {
    console.error('Error con fuente:', error)
    throw new Error(`No se pudo obtener fuente_id: ${error.message}`)
  }
  
  if (!fuenteId) {
    throw new Error('fuente_id es null después de crear/obtener fuente')
  }
  
  console.log(`  📝 Usando fuente_id: ${fuenteId}`)
  
  const { data: documentoRegistrado, error: dbError } = await supabase
    .from('documentos_oficiales')
    .insert({
      fuente_id: fuenteId,
      tipo_documento: mapearTipoDocumento(doc.tipo),
      nivel_educativo: doc.nivel_educativo,
      modalidad: doc.modalidad,
      año_vigencia: doc.año,
      titulo: doc.nombre,
      url_original: doc.url,
      storage_path: fileName,
      tamaño_bytes: pdfBuffer.byteLength,
      hash_contenido: hash,
      version: `${doc.año}.1`,
      formato: 'pdf',
      procesado: false,
      es_version_actual: true,
      estado_procesamiento: 'pendiente',
      etapa_actual: 'descargado',
      fecha_descarga: new Date().toISOString()
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
  
  // 1. Marcar versión anterior como no actual
  await supabase
    .from('documentos_oficiales')
    .update({ es_version_actual: false })
    .eq('id', doc.id_existente)
  
  // 2. Crear nueva versión
  const nuevaVersion = incrementarVersion(doc.version_anterior)
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
    'tiposDeInformesDeResultados': 'informe_resultados',
    'documentos': 'instructivo',
    'documentosLegales': 'documento_legal'
  }
  return mapeo[tipo] || 'instructivo'
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

async function crearBucketSiNoExiste(supabase: any): Promise<void> {
  try {
    // Verificar si el bucket existe
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExiste = buckets?.some((bucket: any) => bucket.name === 'documentos-oficiales')
    
    if (!bucketExiste) {
      console.log('  📁 Creando bucket documentos-oficiales...')
      const { error } = await supabase.storage.createBucket('documentos-oficiales', {
        public: false,
        allowedMimeTypes: ['application/pdf'],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB
      })
      
      if (error) {
        console.warn('  ⚠️  Error creando bucket:', error.message)
      } else {
        console.log('  ✓ Bucket creado exitosamente')
      }
    }
  } catch (error) {
    console.warn('  ⚠️  Error verificando bucket:', error.message)
  }
}