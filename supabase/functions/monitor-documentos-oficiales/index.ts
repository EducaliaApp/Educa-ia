// supabase/functions/monitor-documentos-oficiales/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { DocumentProcessor } from '../shared/document-processor.ts'
import { AIAnalyzer } from '../shared/ai-analyzer.ts'
import { crearClienteServicio, UnauthorizedError } from '../shared/service-auth.ts'
import { PDFExtractor, type PDFMetadata } from '../shared/pdf-extractor.ts'

// ============================================
// CONFIGURACIÓN
// ============================================

const CONFIG = {
  // Rate limiting - OPTIMIZADO para velocidad
  DELAY_BETWEEN_CATEGORIES: 200, // Reducido de 500ms a 200ms
  DELAY_BETWEEN_DOCUMENTS: 50,   // Reducido de 100ms a 50ms
  MAX_RETRIES: 2, // Reducido de 3 a 2 reintentos
  RETRY_DELAY_BASE: 500, // Reducido de 1000ms a 500ms

  // Procesamiento
  MAX_CONCURRENT_DOWNLOADS: 8, // Aumentado para procesamiento más rápido
  MAX_DOCS_PER_EXECUTION: 10, // REDUCIDO a 10 para evitar timeouts (era 20)
  PDF_SAMPLE_PAGES: 2, // Solo 2 páginas para clasificación IA (reducido)
  PDF_DOWNLOAD_TIMEOUT: 10000, // Reducido a 10s timeout (era 15s)
  ENABLE_AI_CLASSIFICATION: false, // ⚠️ DESHABILITADO para acelerar scraping

  // Thresholds
  MIN_AI_CONFIDENCE: 0.70, // Confianza mínima para clasificación IA
  MIN_PDF_SIZE: 10 * 1024, // 10KB mínimo
  MAX_PDF_SIZE: 100 * 1024 * 1024, // 100MB máximo
  PDF_SAMPLE_SIZE: 200000, // Reducido a 200KB (era 500KB)
}

// URLs oficiales del MINEDUC con subcategorías
const URLS_OFICIALES = {
  manuales: {
    url: 'https://www.docentemas.cl/documentos-descargables/manuales-de-instrumentos/',
    subcategorias: ['Manuales de Instrumentos']
  },
  basesCurriculares: {
    url: 'https://www.docentemas.cl/documentos-descargables/documentos-curriculares/',
    subcategorias: [
      'Bases curriculares',
      'Priorización Curricular',
      'Programas EMTP',
      'Marco para la Buena Enseñanza'
    ]
  },
  rubricasPortafolio: {
    url: 'https://www.docentemas.cl/documentos-descargables/rubricas',
    subcategorias: ['Rúbricas Portafolio'] // Rúbricas de evaluación docente
  },
  tiposDeInformesDeResultados: {
    url: 'https://www.docentemas.cl/documentos-descargables/tipos-de-informes-de-resultados',
    subcategorias: ['Informes de Resultados']
  },
  documentosLegales: {
    url: 'https://www.docentemas.cl/documentos-descargables/documentos-legales-2',
    subcategorias: ['Documentos Legales']
  }
}

export const PROCESAR_DOCUMENTO_FUNCTION = 'procesar-documentos'

// ============================================
// TIPOS E INTERFACES
// ============================================

interface DocumentoDetectado {
  nombre: string
  url: string
  tipo: string
  subcategoria: string
  año: number
  nivel_educativo: string
  modalidad: string
  asignatura?: string
  hash?: string
  confianza_clasificacion?: number
}

interface ClasificacionMetadata {
  año: number
  nivel: string
  modalidad: string
  asignatura?: string
  confianza: number
}

interface DocumentoActualizado extends DocumentoDetectado {
  id_existente: string
  version_anterior: string
  hash_nuevo: string
  cambios_detectados?: any
}

interface AnalisisDocumentos {
  nuevos: DocumentoDetectado[]
  actualizados: DocumentoActualizado[]
  duplicados: DocumentoDetectado[]
  invalidos: Array<{ doc: DocumentoDetectado; error: string }>
}

interface ResultadoProcesamiento {
  documento: string
  exito: boolean
  documento_id?: string
  duplicado?: boolean
  actualizado?: boolean
  error?: string
}

interface Reporte {
  fecha_monitoreo: string
  documentos_detectados: number
  documentos_nuevos: number
  documentos_nuevos_procesados: number
  documentos_nuevos_pendientes: number
  documentos_actualizados: number
  documentos_actualizados_procesados: number
  documentos_actualizados_pendientes: number
  documentos_duplicados: number
  documentos_invalidos: number
  procesamiento_exitoso: number
  procesamiento_fallido: number
  tiempo_total_ms: number
  pipeline_pendientes_descarga: number
  pipeline_descargados: number
  pipeline_total: number
  detalles: ResultadoProcesamiento[]
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Ejecuta una función con retry y exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = CONFIG.MAX_RETRIES,
  baseDelay: number = CONFIG.RETRY_DELAY_BASE,
  context: string = 'operación'
): Promise<T | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      const isLastAttempt = attempt === maxRetries - 1
      
      if (isLastAttempt) {
        console.log(`      ❌ ${context} falló después de ${maxRetries} intentos`)
        return null
      }
      
      const delay = baseDelay * Math.pow(2, attempt)
      console.log(`      ⚠️  ${context} falló (intento ${attempt + 1}/${maxRetries}), reintentando en ${delay}ms...`)
      console.log(`         Error: ${errorMessage}`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return null
}

export async function handler(req: Request): Promise<Response> {
  const startTime = Date.now()
  
  try {
    console.log('🔍 Iniciando monitoreo documentos MINEDUC...')
    
    const supabase = crearClienteServicio(req)
    const processor = new DocumentProcessor(supabase)
    const aiAnalyzer = new AIAnalyzer()
    const pdfExtractor = new PDFExtractor()
    
    // Validar request
    const { force = false, skipScraping = false } = await req.json().catch(() => ({ force: false, skipScraping: false }))
    
    let documentosDetectados: DocumentoDetectado[] = []
    let analisisDocumentos: AnalisisDocumentos = {
      nuevos: [],
      actualizados: [],
      duplicados: [],
      invalidos: []
    }
    
    // OPTIMIZACIÓN: Solo scrapear si force=true o si no hay documentos en BD
    const { count: totalDocumentos } = await supabase
      .from('documentos_oficiales')
      .select('*', { count: 'exact', head: true })
    
    const { count: pendientesCount } = await supabase
      .from('documentos_oficiales')
      .select('*', { count: 'exact', head: true })
      .eq('etapa_actual', 'pendiente_descarga')
    
    // Solo scrapear si: force=true, o (skipScraping=false Y no hay docs en BD)
    const debeScrapear = force || (!skipScraping && (totalDocumentos === 0))
    
    if (debeScrapear) {
      console.log('📡 Ejecutando scraping de sitio web...')
      // 1. SCRAPING con rate limiting
      documentosDetectados = await scrapearDocumentos(processor, aiAnalyzer, pdfExtractor)
      
      console.log(`\n📋 Total detectados: ${documentosDetectados.length} documentos`)
      
      // 2. COMPARACIÓN con BD (detección de duplicados mejorada)
      analisisDocumentos = await analizarDocumentos(
        supabase, 
        documentosDetectados,
        pdfExtractor,
        aiAnalyzer
      )
      
      console.log(`\n📊 Análisis completado:`)
      console.log(`  🆕 Nuevos: ${analisisDocumentos.nuevos.length}`)
      console.log(`  🔄 Actualizados: ${analisisDocumentos.actualizados.length}`)
      console.log(`  ⏭️  Duplicados: ${analisisDocumentos.duplicados.length}`)
      console.log(`  ❌ Inválidos: ${analisisDocumentos.invalidos.length}`)
      
      // 3. REGISTRO RÁPIDO: Insertar documentos nuevos en BD sin descargar
      console.log(`\n📝 Registrando documentos nuevos en BD...`)
      const documentosRegistrados = await registrarDocumentosNuevos(
        supabase,
        analisisDocumentos.nuevos
      )
      
      console.log(`  ✅ ${documentosRegistrados.length} documentos registrados con etapa 'pendiente_descarga'`)
    } else {
      console.log(`⏭️  Saltando scraping - Total en BD: ${totalDocumentos}, Pendientes: ${pendientesCount}`)
    }
    
    // 4. PROCESAMIENTO: Descargar y procesar documentos pendientes (límite: MAX_DOCS_PER_EXECUTION)
    // Primero obtener estadísticas totales
    const { count: totalPendientes } = await supabase
      .from('documentos_oficiales')
      .select('*', { count: 'exact', head: true })
      .eq('etapa_actual', 'pendiente_descarga')
    
    const { count: totalDescargados } = await supabase
      .from('documentos_oficiales')
      .select('*', { count: 'exact', head: true })
      .in('etapa_actual', ['descargado', 'transformando', 'transformado', 'transformado_errores'])
    
    console.log(`\n📊 Estado del pipeline:`)
    console.log(`   ⏳ Pendientes descarga: ${totalPendientes || 0}`)
    console.log(`   ✅ Descargados: ${totalDescargados || 0}`)
    
    // Obtener lote para procesar
    const { data: documentosPendientes } = await supabase
      .from('documentos_oficiales')
      .select('*')
      .eq('etapa_actual', 'pendiente_descarga')
      .limit(CONFIG.MAX_DOCS_PER_EXECUTION)
    
    console.log(`\n📥 Descargando lote actual (${documentosPendientes?.length || 0} documentos)...`)
    
    let resultadosProcesamiento: ResultadoProcesamiento[] = []
    
    if (documentosPendientes && documentosPendientes.length > 0) {
      resultadosProcesamiento = await procesarDocumentosPendientes(
        supabase,
        documentosPendientes,
        processor
      )
    }
    
    // 5. REPORTE final
    const reporte = {
      fecha_monitoreo: new Date().toISOString(),
      documentos_detectados: documentosDetectados.length,
      documentos_nuevos: analisisDocumentos.nuevos.length,
      documentos_actualizados: analisisDocumentos.actualizados.length,
      documentos_duplicados: analisisDocumentos.duplicados.length,
      procesamiento_exitoso: resultadosProcesamiento.filter(r => r.exito).length,
      procesamiento_fallido: resultadosProcesamiento.filter(r => !r.exito).length,
      pipeline_pendientes_descarga: totalPendientes || 0,
      pipeline_descargados: totalDescargados || 0,
      pipeline_total: (totalPendientes || 0) + (totalDescargados || 0),
      tiempo_total_ms: Date.now() - startTime,
      detalles: resultadosProcesamiento
    }
    
    console.log('\n✅ Monitoreo completado')
    console.log(`  📊 Nuevos: ${analisisDocumentos.nuevos.length}`)
    console.log(`  🔄 Actualizados: ${analisisDocumentos.actualizados.length}`)
    console.log(`  ⏭️  Duplicados (saltados): ${analisisDocumentos.duplicados.length}`)
    
    // 6. Notificar a administradores si hay cambios
    if (analisisDocumentos.nuevos.length > 0 || analisisDocumentos.actualizados.length > 0) {
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
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'

    return new Response(
      JSON.stringify({
        error: 'Error en monitoreo de documentos',
        details: errorMessage
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
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Scrapea documentos del sitio DocenteMás con rate limiting
 */
async function scrapearDocumentos(
  processor: DocumentProcessor,
  aiAnalyzer: AIAnalyzer,
  pdfExtractor: PDFExtractor
): Promise<DocumentoDetectado[]> {

  const documentosDetectados: DocumentoDetectado[] = []

  for (const [tipo, config] of Object.entries(URLS_OFICIALES)) {
    console.log(`\n📡 Procesando categoría: ${tipo}`)

    try {
      const response = await fetch(config.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0; +https://profeflow.cl)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-CL,es;q=0.9'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const html = await response.text()

      // Extraer PDFs por subcategoría
      const pdfsPorSubcategoria = extraerPDFsPorSubcategoria(html, config.subcategorias)

      // Procesar cada PDF
      for (const [subcategoria, pdfLinks] of Object.entries(pdfsPorSubcategoria)) {
        console.log(`  📁 ${subcategoria}: ${pdfLinks.length} documentos`)

        for (const link of pdfLinks) {
          // Validación básica
          if (!link.url || !link.nombre) {
            console.log(`    ⚠️  Link inválido, saltando...`)
            continue
          }

          // 1. Intentar parsing básico del nombre
          let metadata = parsearNombreArchivo(link.nombre, tipo, html)

          // 2. Si falla Y la IA está habilitada, usar clasificación IA
          if (CONFIG.ENABLE_AI_CLASSIFICATION && (!metadata || (metadata as any).confianza < 0.7)) {
            console.log(`    🤖 Clasificación IA para: ${link.nombre}`)
            const metadataIA = await retryWithBackoff(
              () => clasificarConIAMejorada(
                link,
                tipo,
                subcategoria,
                aiAnalyzer,
                pdfExtractor
              ),
              CONFIG.MAX_RETRIES,
              CONFIG.RETRY_DELAY_BASE,
              'Clasificación IA'
            )

            if (metadataIA) {
              metadata = {
                año: metadataIA.año,
                nivel: metadataIA.nivel,
                modalidad: metadataIA.modalidad,
                asignatura: metadataIA.asignatura
              }
            }
          }

          // 3. Si todo falla, usar defaults inteligentes
          if (!metadata) {
            metadata = {
              año: 2025,
              nivel: inferirNivelPorTipo(tipo),
              modalidad: 'regular'
            }
            console.log(`    ℹ️  Usando defaults (parsing básico)`)
          }

          // Solo agregar si tiene año reciente y metadata válida
          // Incluimos desde 2023 para capturar rúbricas históricas
          if (metadata && metadata.año >= 2023) {
            documentosDetectados.push({
              nombre: link.nombre,
              url: link.url,
              tipo,
              subcategoria,
              año: metadata.año,
              nivel_educativo: metadata.nivel,
              modalidad: metadata.modalidad,
              asignatura: metadata.asignatura,
              confianza_clasificacion: 0.5 // Default si no es de IA
            })
          } else if (metadata) {
            console.log(`    ⏭️  Documento antiguo (${metadata.año}), saltando`)
          }

          // Rate limiting entre documentos
          await new Promise(r => setTimeout(r, CONFIG.DELAY_BETWEEN_DOCUMENTS))
        }
      }

      // Rate limiting entre categorías
      await new Promise(r => setTimeout(r, CONFIG.DELAY_BETWEEN_CATEGORIES))

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error(`  ❌ Error en ${tipo}:`, errorMessage)
    }
  }

  return documentosDetectados
}

/**
 * Normaliza URL removiendo parámetros dinámicos (refresh, timestamps)
 * Mantiene solo base + wpdmdl (ID estable del documento)
 */
function normalizarUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    // Extraer solo el parámetro wpdmdl (ID estable del documento)
    const wpdmdl = urlObj.searchParams.get('wpdmdl')
    const basePath = urlObj.origin + urlObj.pathname
    // Retornar URL sin parámetros dinámicos
    return wpdmdl ? `${basePath}?wpdmdl=${wpdmdl}` : basePath
  } catch {
    // Si falla el parsing, retornar URL original
    return url
  }
}

/**
 * Analiza documentos detectados vs base de datos
 */
async function analizarDocumentos(
  supabase: any,
  documentosDetectados: DocumentoDetectado[],
  pdfExtractor: PDFExtractor,
  aiAnalyzer: AIAnalyzer
): Promise<AnalisisDocumentos> {

  const resultado: AnalisisDocumentos = {
    nuevos: [],
    actualizados: [],
    duplicados: [],
    invalidos: []
  }

  for (const doc of documentosDetectados) {
    try {
      // Normalizar URL para comparación
      const urlNormalizada = normalizarUrl(doc.url)
      
      // Buscar duplicados con estrategia mejorada
      // 1. Primero buscar por URL normalizada (sin parámetros dinámicos)
      const { data: porUrl, error: errorUrl } = await supabase
        .from('documentos_oficiales')
        .select('id, hash_contenido, version, url_original, titulo, storage_path')
        .eq('url_original', urlNormalizada)
      
      if (errorUrl) {
        console.log(`  ⚠️  Error buscando URL: ${errorUrl.message}`)
      }
      
      if (porUrl && porUrl.length > 0) {
        const existente = porUrl[0]
        
        // Si el documento NO tiene hash (pendiente de descarga), es duplicado
        if (!existente.hash_contenido) {
          resultado.duplicados.push(doc)
          continue
        }
        
        // Si tiene hash, verificar si cambió el contenido
        const hashNuevo = await calcularHashRemoto(doc.url)
        
        if (hashNuevo && hashNuevo !== existente.hash_contenido) {
          // ✅ ACTUALIZADO
          resultado.actualizados.push({
            ...doc,
            id_existente: existente.id,
            version_anterior: existente.version,
            hash_nuevo: hashNuevo
          })
          console.log(`  🔄 ${doc.nombre} (hash cambió)`)
        } else {
          // ⏭️ DUPLICADO (mismo contenido)
          resultado.duplicados.push(doc)
        }
        
        continue // Ya procesado, siguiente documento
      }
      
      // 2. Si no hay match por URL, buscar por nombre exacto + año
      const nombreNormalizado = doc.nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
        .replace(/[^a-z0-9]/g, '') // Solo alfanuméricos
      
      const { data: porNombre } = await supabase
        .from('documentos_oficiales')
        .select('id, hash_contenido, version, url_original, titulo, storage_path')
        .eq('año_vigencia', doc.año)
      
      // Filtrar por similitud de nombre (en memoria)
      const existentes = porNombre?.filter((existente: any) => {
        const tituloNormalizado = existente.titulo
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '')
        
        // Match si > 80% de similitud
        const similitud = calcularSimilitud(nombreNormalizado, tituloNormalizado)
        return similitud > 0.8
      }) || []

      if (existentes.length === 0) {
        // ✅ NUEVO
        resultado.nuevos.push(doc)
        console.log(`  🆕 ${doc.nombre}`)

      } else if (existentes.length === 1) {
        const existente = existentes[0]
        
        // Mismo título pero URL diferente (posible duplicado o re-publicación)
        const urlExistenteNorm = normalizarUrl(existente.url_original)
        const urlNuevaNorm = normalizarUrl(doc.url)
        
        if (urlExistenteNorm !== urlNuevaNorm) {
          console.log(`  ⚠️  URL diferente para: ${doc.nombre}`)
          console.log(`      BD (norm): ${urlExistenteNorm}`)
          console.log(`      Nuevo (norm): ${urlNuevaNorm}`)
        }
        
        resultado.duplicados.push(doc)

      } else {
        // Múltiples coincidencias
        console.log(`  ⚠️  ${existentes.length} coincidencias para: ${doc.nombre}`)
        resultado.duplicados.push(doc)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error(`  ❌ Error analizando ${doc.nombre}:`, errorMessage)
      resultado.invalidos.push({ doc, error: errorMessage })
    }
  }

  return resultado
}

/**
 * Registra documentos nuevos en BD sin descargarlos (rápido)
 * Solo crea el registro con estado 'pendiente_descarga'
 */
async function registrarDocumentosNuevos(
  supabase: any,
  documentosNuevos: DocumentoDetectado[]
): Promise<any[]> {
  
  const registrados = []
  
  for (const doc of documentosNuevos) {
    try {
      // Obtener fuente DocenteMas
      const fuenteId = await obtenerOCrearFuenteDocenteMas(supabase)
      
      const { data, error } = await supabase
        .from('documentos_oficiales')
        .insert({
          fuente_id: fuenteId,
          tipo_documento: mapearTipoDocumento(doc.tipo, doc.subcategoria),
          nivel_educativo: doc.nivel_educativo,
          modalidad: doc.modalidad,
          asignatura: doc.asignatura || null,
          año_vigencia: doc.año,
          titulo: doc.nombre,
          url_original: normalizarUrl(doc.url),
          version: `${doc.año}.1`,
          formato: 'pdf',
          procesado: false,
          es_version_actual: true,
          estado_procesamiento: 'pendiente', // Estado general
          etapa_actual: 'pendiente_descarga', // 🆕 Etapa específica del pipeline
          hash_contenido: null, // Se calculará durante la descarga
          storage_path: null, // Se asignará durante la descarga
          tamaño_bytes: null, // Se asignará durante la descarga
          metadata: {
            subcategoria: doc.subcategoria,
            tipo_original: doc.tipo,
            confianza_clasificacion: doc.confianza_clasificacion
          }
        })
        .select()
        .single()
      
      if (error) {
        console.log(`  ⚠️  Error registrando ${doc.nombre}: ${error.message}`)
        continue
      }
      
      registrados.push(data)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.log(`  ❌ Error: ${errorMessage}`)
    }
  }
  
  return registrados
}

/**
 * Procesa documentos que ya están en BD con estado 'pendiente_descarga'
 * Descarga PDF, sube a storage y actualiza registro
 */
async function procesarDocumentosPendientes(
  supabase: any,
  documentosPendientes: any[],
  processor: DocumentProcessor
): Promise<ResultadoProcesamiento[]> {
  
  const resultados: ResultadoProcesamiento[] = []
  
  // Procesamiento paralelo con límite de concurrencia
  const concurrencia = CONFIG.MAX_CONCURRENT_DOWNLOADS
  
  for (let i = 0; i < documentosPendientes.length; i += concurrencia) {
    const lote = documentosPendientes.slice(i, i + concurrencia)
    console.log(`\n📦 Lote ${Math.floor(i / concurrencia) + 1}/${Math.ceil(documentosPendientes.length / concurrencia)} (${lote.length} docs)`)
    
    const promesas = lote.map(async (doc) => {
      console.log(`  📥 ${doc.titulo}`)
      
      try {
        await descargarYActualizarDocumento(supabase, doc)
        console.log(`     ✅ Completado`)
        return {
          documento: doc.titulo,
          exito: true,
          documento_id: doc.id
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        console.error(`     ❌ Error: ${errorMessage}`)
        return {
          documento: doc.titulo,
          exito: false,
          error: errorMessage
        }
      }
    })
    
    const resultadosLote = await Promise.all(promesas)
    resultados.push(...resultadosLote)
  }
  
  return resultados
}

/**
 * Descarga PDF y actualiza documento en BD
 */
async function descargarYActualizarDocumento(supabase: any, doc: any): Promise<void> {
  
  // Marcar como procesando
  await supabase
    .from('documentos_oficiales')
    .update({ 
      estado_procesamiento: 'procesando',
      etapa_actual: 'descargando'
    })
    .eq('id', doc.id)
  
  // 1. Descargar PDF
  const response = await fetch(doc.url_original)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  const pdfBuffer = await response.arrayBuffer()
  const hash = await calcularHash(pdfBuffer)
  
  // 2. Subir a Supabase Storage
  const sanitizedName = doc.titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  
  const fileName = `${doc.tipo_documento}/${doc.año_vigencia}/${sanitizedName}.pdf`
  
  await crearBucketSiNoExiste(supabase)
  
  const { error: uploadError } = await supabase.storage
    .from('documentos-oficiales')
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    })
  
  if (uploadError) {
    throw new Error(`Error subiendo archivo: ${uploadError.message}`)
  }
  
  // 3. Actualizar registro en BD
  await supabase
    .from('documentos_oficiales')
    .update({
      storage_path: fileName,
      tamaño_bytes: pdfBuffer.byteLength,
      hash_contenido: hash,
      estado_procesamiento: 'descargado',
      etapa_actual: 'descargado',
      fecha_descarga: new Date().toISOString()
    })
    .eq('id', doc.id)
}

/**
 * Procesa documentos nuevos en lotes con paralelismo controlado
 */
async function procesarDocumentosNuevos(
  supabase: any,
  documentosNuevos: DocumentoDetectado[],
  processor: DocumentProcessor
): Promise<ResultadoProcesamiento[]> {
  
  const resultados: ResultadoProcesamiento[] = []
  
  // Limitar procesamiento por ejecución para evitar timeout
  const documentosAProcesar = documentosNuevos.slice(0, CONFIG.MAX_DOCS_PER_EXECUTION)
  const documentosPendientes = documentosNuevos.length - documentosAProcesar.length
  
  if (documentosPendientes > 0) {
    console.log(`\n⚠️  Procesando ${documentosAProcesar.length} de ${documentosNuevos.length} documentos`)
    console.log(`   ${documentosPendientes} documentos quedarán pendientes para próxima ejecución`)
  }
  
  // Procesamiento paralelo con límite de concurrencia
  const concurrencia = CONFIG.MAX_CONCURRENT_DOWNLOADS
  
  for (let i = 0; i < documentosAProcesar.length; i += concurrencia) {
    const lote = documentosAProcesar.slice(i, i + concurrencia)
    console.log(`\n� Procesando lote ${Math.floor(i / concurrencia) + 1}/${Math.ceil(documentosAProcesar.length / concurrencia)} (${lote.length} docs)`)
    
    // Procesar lote en paralelo
    const promesas = lote.map(async (doc) => {
      console.log(`  📥 ${doc.nombre}`)
      
      try {
        const resultado = await procesarDocumentoNuevo(supabase, doc, processor)
        console.log(`     ✅ Completado`)
        return resultado
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        console.error(`     ❌ Error: ${errorMessage}`)
        return {
          documento: doc.nombre,
          exito: false,
          error: errorMessage
        }
      }
    })
    
    const resultadosLote = await Promise.all(promesas)
    resultados.push(...resultadosLote)
  }
  
  return resultados
}

/**
 * Procesa actualizaciones de documentos
 */
async function procesarActualizaciones(
  supabase: any,
  documentosActualizados: DocumentoActualizado[]
): Promise<void> {
  
  for (const doc of documentosActualizados) {
    console.log(`\n🔄 Procesando actualización: ${doc.nombre}`)
    
    try {
      await procesarActualizacionDocumento(supabase, doc)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error(`  ✗ Error procesando actualización:`, errorMessage)
    }
  }
}

/**
 * Genera reporte final
 */
function generarReporte(
  documentosDetectados: DocumentoDetectado[],
  analisis: AnalisisDocumentos,
  resultados: ResultadoProcesamiento[],
  tiempoMs: number,
  pipelinePendientes: number,
  pipelineDescargados: number
): Reporte {
  const documentosNuevosProcesados = resultados.filter(r => !r.actualizado).length
  const documentosNuevosPendientes = Math.max(0, analisis.nuevos.length - documentosNuevosProcesados)
  
  const actualizacionesProcesadas = resultados.filter(r => r.actualizado).length
  const actualizacionesPendientes = Math.max(0, analisis.actualizados.length - actualizacionesProcesadas)
  
  return {
    fecha_monitoreo: new Date().toISOString(),
    documentos_detectados: documentosDetectados.length,
    documentos_nuevos: analisis.nuevos.length,
    documentos_nuevos_procesados: documentosNuevosProcesados,
    documentos_nuevos_pendientes: documentosNuevosPendientes,
    documentos_actualizados: analisis.actualizados.length,
    documentos_actualizados_procesados: actualizacionesProcesadas,
    documentos_actualizados_pendientes: actualizacionesPendientes,
    documentos_duplicados: analisis.duplicados.length,
    documentos_invalidos: analisis.invalidos.length,
    procesamiento_exitoso: resultados.filter(r => r.exito).length,
    procesamiento_fallido: resultados.filter(r => !r.exito).length,
    tiempo_total_ms: tiempoMs,
    pipeline_pendientes_descarga: pipelinePendientes,
    pipeline_descargados: pipelineDescargados,
    pipeline_total: pipelinePendientes + pipelineDescargados,
    detalles: resultados
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function extraerPDFsPorSubcategoria(
  html: string, 
  subcategorias: string[]
): Record<string, Array<{ nombre: string; url: string }>> {
  const resultado: Record<string, Array<{ nombre: string; url: string }>> = {}
  
  // Inicializar resultado
  for (const subcategoria of subcategorias) {
    resultado[subcategoria] = []
  }
  
  // ESTRATEGIA: Extraer TODOS los PDFs primero, luego clasificar por URL/nombre
  const todosPDFs = extraerLinksPDF(html)
  
  console.log(`      📄 Total PDFs encontrados: ${todosPDFs.length}`)
  
  // Clasificar cada PDF por su URL/nombre
  for (const pdf of todosPDFs) {
    const urlLower = pdf.url.toLowerCase()
    const nombreLower = pdf.nombre.toLowerCase()
    const textoCompleto = `${urlLower} ${nombreLower}`
    
    let subcategoriaAsignada = subcategorias[0] // Default
    
    // Patrones de clasificación basados en URL/nombre
    const clasificadores: Record<string, RegExp[]> = {
      'Programas EMTP': [
        /programa.*estudio.*especialidad/i,
        /emtp/i,
        /tecnico.*profesional/i,
        /especialidad-/i
      ],
      'Priorización Curricular': [
        /priorizacion/i,
        /priorizaci[oó]n/i,
        /actualizacion.*priorizacion/i
      ],
      'Marco para la Buena Enseñanza': [
        /marco.*buena.*ensenanza/i,
        /marco.*buena.*enseñanza/i,
        /mbe/i,
        /\/marco-para-la-buena/i
      ],
      'Bases curriculares': [
        /bases.*curriculares/i,
        /programa.*estudio(?!.*especialidad)/i, // Programa de estudio (no especialidad)
        /curricul/i
      ],
      'Rúbricas Portafolio': [
        /rubrica/i,
        /rúbrica/i,
        /evaluacion.*docente/i
      ]
    }
    
    // Buscar match
    for (const [subcategoria, patrones] of Object.entries(clasificadores)) {
      if (subcategorias.includes(subcategoria)) {
        if (patrones.some(patron => patron.test(textoCompleto))) {
          subcategoriaAsignada = subcategoria
          break
        }
      }
    }
    
    // Agregar a la subcategoría correspondiente
    if (!resultado[subcategoriaAsignada]) {
      resultado[subcategoriaAsignada] = []
    }
    resultado[subcategoriaAsignada].push(pdf)
  }
  
  // Mostrar resumen
  for (const [subcategoria, pdfs] of Object.entries(resultado)) {
    if (pdfs.length > 0) {
      console.log(`      📁 ${subcategoria}: ${pdfs.length} PDFs`)
    }
  }
  
  return resultado
}

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
  // Para URLs con wpdmdl, intentar extraer el slug descriptivo
  if (url.includes('wpdmdl=')) {
    // Patrón: https://www.docentemas.cl/download/nombre-descriptivo/?wpdmdl=123
    const slugMatch = url.match(/\/download\/([^/?]+)\//i)
    if (slugMatch && slugMatch[1]) {
      const slug = slugMatch[1]
        .replace(/-/g, ' ')  // Convertir guiones en espacios
        .replace(/_/g, ' ')  // Convertir underscores en espacios
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalizar
        .join(' ')
        .trim()
      
      if (slug && slug.length > 3) {
        return slug
      }
    }
    
    // Fallback: usar ID si no hay slug
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
  asignatura?: string
} | null {

  const nombreLower = nombre.toLowerCase()

  // Detectar año con múltiples patrones (incluye 2023-2026)
  const añoMatch = nombre.match(/202[3-9]/) || nombre.match(/\b(2023|2024|2025|2026)\b/)
  const año = añoMatch ? parseInt(añoMatch[0]) : 2025 // Default a 2025 si no se encuentra

  // Patrones mejorados para nivel educativo
  let nivel = 'regular'
  const patronesNivel = {
    'parvularia': /parvularia|párvulo|pre\s*escolar|educación parvularia|educacion parvularia/,
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

  // Detectar asignatura desde nombre del archivo
  let asignatura: string | undefined
  const patronesAsignatura = {
    'Matemática': /matemática|matemáticas|matematica|matematicas|matem_ticas/i,
    'Lenguaje y Comunicación': /lenguaje|comunicación|comunicacion|comunicaci_n|lengua castellana|castellano/i,
    'Ciencias Naturales': /ciencias naturales|biología|biolog_a|biologia|física|fisica|f_sica|química|quimica|qu_mica/i,
    'Historia y Geografía': /historia|geografía|geografia|ciencias sociales|sociales/i,
    'Inglés': /inglés|ingles|ingl_s|english/i,
    'Artes Visuales': /artes visuales|artes_visuales|artes plásticas|artes plasticas|artes_plasticas|artes_pl_sticas/i,
    'Música': /música|musica|artes musicales/i,
    'Educación Física': /educación física|educacion fisica|educacion_fisica|educaci_n_f_sica|ed\. física|ed_f_sica|ed\. fisica/i,
    'Tecnología': /tecnología|tecnologia|tecnolog_a/i,
    'Religión': /religión|religion|religi_on|católica|catolica|cat_lica|evangelica|evangélica|evang_lica/i
  }

  for (const [asig, patron] of Object.entries(patronesAsignatura)) {
    if (patron.test(nombreLower)) {
      asignatura = asig
      break
    }
  }

  return { año, nivel, modalidad, asignatura }
}

/**
 * Clasificación IA MEJORADA - con contenido real del PDF
 */
async function clasificarConIAMejorada(
  link: { nombre: string; url: string },
  tipo: string,
  subcategoria: string,
  aiAnalyzer: AIAnalyzer,
  pdfExtractor: PDFExtractor
): Promise<ClasificacionMetadata | null> {

  try {
    // 1. Validar que es PDF y obtener metadata
    const headResponse = await fetch(link.url, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0)'
      }
    })
    
    if (!headResponse.ok) {
      console.log(`      ⚠️  No accesible (HTTP ${headResponse.status})`)
      return null
    }
    
    const contentType = headResponse.headers.get('content-type')
    const contentLength = parseInt(headResponse.headers.get('content-length') || '0')
    
    if (!contentType?.includes('pdf')) {
      console.log(`      ⚠️  No es PDF (${contentType})`)
      return null
    }
    
    if (contentLength < CONFIG.MIN_PDF_SIZE || contentLength > CONFIG.MAX_PDF_SIZE) {
      console.log(`      ⚠️  Tamaño inválido (${(contentLength / 1024).toFixed(2)} KB)`)
      return null
    }
    
    // 2. Descargar y extraer texto de primeras páginas
    console.log(`      📥 Descargando muestra (${(contentLength / 1024).toFixed(2)} KB)...`)
    
    // Crear AbortController con timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.PDF_DOWNLOAD_TIMEOUT)
    
    try {
      const response = await fetch(link.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0)',
          'Range': `bytes=0-${Math.min(contentLength, CONFIG.PDF_SAMPLE_SIZE)}`
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      const pdfBuffer = await response.arrayBuffer()
      
      // Extraer texto de primeras páginas
      const textoMuestra = await pdfExtractor.extractFirstPages(
        pdfBuffer,
        CONFIG.PDF_SAMPLE_PAGES
      )
      
      if (!textoMuestra || textoMuestra.length < 100) {
        console.log(`      ⚠️  No se pudo extraer texto suficiente`)
        return null
      }
      
      console.log(`      ✓ Texto extraído: ${textoMuestra.length} chars`)
      
      // Limitar texto a máximo 1500 caracteres para evitar exceder contexto de IA
      const textoLimitado = textoMuestra.substring(0, 1500)
      
      // 3. Clasificar con IA usando contenido real
      const prompt = `Clasifica este documento educativo chileno del MINEDUC.

**CONTEXTO:**
- Categoría: ${tipo}
- Subcategoría: ${subcategoria}
- Nombre archivo: ${link.nombre}

**CONTENIDO (primeras páginas):**
${textoLimitado}

**INSTRUCCIONES:**
Analiza el contenido y clasifica el documento. Responde SOLO con JSON válido (sin markdown):

{
  "año": número entre 2023-2026 (busca en encabezados, pie de página, o contenido),
  "justificacion_año": "explica de dónde se obtuvo el año (ej: 'Encabezado dice 2025', 'Decreto 67/2018')",
  "nivel_educativo": "parvularia|basica_1_6|basica_7_8_media|media_tp|especial_regular|especial_neep|hospitalaria|encierro|lengua_indigena|epja|regular",
  "justificacion_nivel": "explica por qué este nivel (ej: 'Menciona 1° a 6° básico', 'Documento para TP')",
  "modalidad": "regular|especial|hospitalaria|encierro|lengua_indigena",
  "asignatura": "Matemática|Lenguaje y Comunicación|Historia y Geografía|Ciencias Naturales|Inglés|Artes Visuales|Música|Educación Física|Tecnología|Religión|null",
  "confianza": 0.0 a 1.0 (qué tan seguro estás de la clasificación),
  "razonamiento": "resumen breve del análisis (max 100 palabras)"
}

**NOTAS:**
- Si no encuentras año explícito, usa contexto (ej: "Priorización 2020-2022" = 2020)
- Si el documento menciona múltiples niveles, elige el más prominente
- confianza < 0.7 solo si hay mucha ambigüedad`
    
    const resultadoIA = await aiAnalyzer.clasificarDocumento(prompt)
    
    // 4. Validar respuesta de IA
    const clasificacion = validarRespuestaIA(resultadoIA)
    
    if (!clasificacion) {
      console.log(`      ⚠️  Respuesta IA inválida`)
      return null
    }
    
    if (clasificacion.confianza < CONFIG.MIN_AI_CONFIDENCE) {
      console.log(`      ⚠️  Confianza baja (${clasificacion.confianza})`)
      return null
    }
    
    console.log(`      ✅ Clasificado: ${clasificacion.nivel_educativo} (${clasificacion.confianza})`)
    if (clasificacion.justificacion_año) {
      console.log(`         📅 Año: ${clasificacion.justificacion_año}`)
    }
    if (clasificacion.justificacion_nivel) {
      console.log(`         🎓 Nivel: ${clasificacion.justificacion_nivel}`)
    }
    
    return {
      año: clasificacion.año,
      nivel: clasificacion.nivel_educativo,
      modalidad: clasificacion.modalidad,
      asignatura: clasificacion.asignatura,
      confianza: clasificacion.confianza
    }
    
    } catch (downloadError) {
      clearTimeout(timeoutId)
      const errorMessage = downloadError instanceof Error ? downloadError.message : 'Error desconocido'
      if (downloadError instanceof Error && downloadError.name === 'AbortError') {
        console.log(`      ⚠️  Timeout descargando PDF (>${CONFIG.PDF_DOWNLOAD_TIMEOUT}ms)`)
      } else {
        console.log(`      ❌ Error descargando PDF: ${errorMessage}`)
      }
      return null
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.log(`      ❌ Error clasificación IA: ${errorMessage}`)
    return null
  }
}

/**
 * Valida respuesta de IA y extrae JSON
 */
function validarRespuestaIA(resultado: any): any | null {
  try {
    // Si es string, intentar parsear JSON
    let data = resultado
    if (typeof resultado === 'string') {
      // Limpiar markdown si está presente
      const jsonMatch = resultado.match(/```json\n?([\s\S]*?)\n?```/) || 
                       resultado.match(/\{[\s\S]*\}/)
      
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[1] || jsonMatch[0])
      } else {
        return null
      }
    }
    
    // Validar campos requeridos
    if (!data.año || !data.nivel_educativo || !data.confianza) {
      return null
    }
    
    // Validar rangos (incluye 2023 para rúbricas históricas)
    if (data.año < 2023 || data.año > 2026) {
      return null
    }
    
    if (data.confianza < 0 || data.confianza > 1) {
      return null
    }
    
    // Validar valores de nivel educativo
    const nivelesValidos = [
      'parvularia', 'basica_1_6', 'basica_7_8_media', 'media_tp',
      'especial_regular', 'especial_neep', 'hospitalaria', 'encierro',
      'lengua_indigena', 'epja', 'regular'
    ]
    
    if (!nivelesValidos.includes(data.nivel_educativo)) {
      return null
    }
    
    return data
    
  } catch (error) {
    console.error('Error validando respuesta IA:', error)
    return null
  }
}

/**
 * Calcula similitud entre dos strings usando coeficiente de Sørensen–Dice
 * Más rápido que Levenshtein y suficiente para nombres de documentos
 * Retorna valor entre 0 (totalmente diferentes) y 1 (idénticos)
 */
function calcularSimilitud(str1: string, str2: string): number {
  if (str1 === str2) return 1.0
  if (str1.length < 2 || str2.length < 2) return 0.0
  
  // Crear bigramas (pares de caracteres consecutivos)
  const bigramas1 = new Set<string>()
  const bigramas2 = new Set<string>()
  
  for (let i = 0; i < str1.length - 1; i++) {
    bigramas1.add(str1.substring(i, i + 2))
  }
  
  for (let i = 0; i < str2.length - 1; i++) {
    bigramas2.add(str2.substring(i, i + 2))
  }
  
  // Calcular intersección
  let interseccion = 0
  for (const bigrama of bigramas1) {
    if (bigramas2.has(bigrama)) {
      interseccion++
    }
  }
  
  // Coeficiente de Dice: 2 * intersección / (tamaño1 + tamaño2)
  return (2.0 * interseccion) / (bigramas1.size + bigramas2.size)
}

function inferirNivelPorTipo(tipo: string): string {
  // Inferir nivel educativo basado en el tipo de documento
  const mapeoNivel: Record<string, string> = {
    'manuales': 'regular',
    'rubricasPortafolio': 'regular', // Rúbricas de evaluación docente (todos los niveles)
    'referentesCurriculares': 'basica_1_6',
    'tiposDeInformesDeResultados': 'regular',
    'documentos': 'regular',
    'documentosLegales': 'regular'
  }
  return mapeoNivel[tipo] || 'regular'
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

/**
 * Obtiene o crea la fuente DocenteMas en la BD
 */
async function obtenerOCrearFuenteDocenteMas(supabase: any): Promise<string> {
  // Intentar obtener fuente existente
  const { data: fuente } = await supabase
    .from('fuentes_documentacion')
    .select('id')
    .eq('nombre', 'DocenteMas')
    .maybeSingle()
  
  if (fuente?.id) {
    return fuente.id
  }
  
  // Crear nueva fuente
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
  
  if (insertError || !nuevaFuente?.id) {
    throw new Error(`Error creando fuente: ${insertError?.message || 'ID nulo'}`)
  }
  
  return nuevaFuente.id
}

export async function procesarDocumentoNuevo(
  supabase: any,
  doc: DocumentoDetectado,
  processor?: DocumentProcessor
): Promise<any> {
  
  // Verificación final de duplicados antes de procesar
  const { data: duplicado } = await supabase
    .from('documentos_oficiales')
    .select('id')
    .eq('url_original', doc.url)
    .maybeSingle()
  
  if (duplicado) {
    console.log('  ⏭️  Documento ya existe, saltando...')
    return {
      documento: doc.nombre,
      exito: true,
      documento_id: duplicado.id,
      duplicado: true
    }
  }
  
  // 1. Descargar PDF
  console.log('  📥 Descargando PDF...')
  const response = await fetch(doc.url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  const pdfBuffer = await response.arrayBuffer()
  const hash = await calcularHash(pdfBuffer)
  
  console.log(`  ✓ Descargado: ${(pdfBuffer.byteLength / 1024).toFixed(2)} KB`)
  
  // Verificar duplicado por hash
  const { data: duplicadoHash } = await supabase
    .from('documentos_oficiales')
    .select('id, titulo')
    .eq('hash_contenido', hash)
    .maybeSingle()
  
  if (duplicadoHash) {
    console.log(`  ⏭️  Contenido duplicado de: ${duplicadoHash.titulo}`)
    return {
      documento: doc.nombre,
      exito: true,
      documento_id: duplicadoHash.id,
      duplicado: true
    }
  }
  
  // 2. Subir a Supabase Storage
  // Sanitizar nombre de archivo: normalizar tildes y caracteres especiales
  const sanitizedName = doc.nombre
    .normalize('NFD') // Descomponer caracteres con tildes (á → a + ´)
    .replace(/[\u0300-\u036f]/g, '') // Eliminar marcas diacríticas (tildes)
    .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Solo permitir alfanuméricos, punto, guión y underscore
    .replace(/_+/g, '_') // Colapsar múltiples underscores consecutivos
    .replace(/^_|_$/g, '') // Eliminar underscores al inicio/final
  
  const fileName = `${doc.tipo}/${doc.año}/${sanitizedName}.pdf`
  console.log(`  💾 Subiendo a storage: ${fileName}`)
  
  await crearBucketSiNoExiste(supabase)
  
  const { error: uploadError } = await supabase.storage
    .from('documentos-oficiales')
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    })
  
  if (uploadError) {
    throw new Error(`Error subiendo archivo: ${uploadError.message}`)
  }
  
  console.log('  ✓ Subido a storage')
  
  // 3. Registrar en base de datos
  console.log('  📝 Registrando en BD...')
  
  // Obtener o crear fuente DocenteMas
  const fuenteId = await obtenerOCrearFuenteDocenteMas(supabase)
  console.log(`  📝 Usando fuente_id: ${fuenteId}`)
  
  const { data: documentoRegistrado, error: dbError } = await supabase
    .from('documentos_oficiales')
    .insert({
      fuente_id: fuenteId,
      tipo_documento: mapearTipoDocumento(doc.tipo, doc.subcategoria),
      nivel_educativo: doc.nivel_educativo,
      modalidad: doc.modalidad,
      asignatura: doc.asignatura || null,
      año_vigencia: doc.año,
      titulo: doc.nombre,
      url_original: normalizarUrl(doc.url), // URL sin parámetros dinámicos (refresh, etc)
      storage_path: fileName,
      tamaño_bytes: pdfBuffer.byteLength,
      hash_contenido: hash,
      version: `${doc.año}.1`,
      formato: 'pdf',
      procesado: false,
      es_version_actual: true,
      estado_procesamiento: 'pendiente',
      etapa_actual: 'descargado',  // Ya está descargado y en Storage
      fecha_descarga: new Date().toISOString(),
      metadata: {
        subcategoria: doc.subcategoria,
        tipo_original: doc.tipo
      }
    })
    .select()
    .single()

  if (dbError) {
    throw new Error(`Error en BD: ${dbError.message}`)
  }

  console.log(`  ✅ Documento registrado: ${documentoRegistrado.id}`)
  
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

function mapearTipoDocumento(tipo: string, subcategoria?: string): string {
  // Mapeo por subcategoría (más específico)
  if (subcategoria) {
    const mapeoSubcategoria: Record<string, string> = {
      'Bases curriculares': 'bases_curriculares',
      'Priorización Curricular': 'priorizacion_curricular',
      'Programas EMTP': 'programa_emtp',
      'Marco para la Buena Enseñanza': 'marco_buena_ensenanza',
      'Rúbricas Portafolio': 'rubricas_portafolio', // Rúbricas de evaluación docente
      'Manuales de Instrumentos': 'manual_portafolio',
      'Informes de Resultados': 'informe_resultados',
      'Documentos Legales': 'documento_legal'
    }
    
    if (mapeoSubcategoria[subcategoria]) {
      return mapeoSubcategoria[subcategoria]
    }
  }
  
  // Mapeo por tipo (fallback)
  const mapeo: Record<string, string> = {
    'manuales': 'manual_portafolio',
    'basesCurriculares': 'bases_curriculares',
    'rubricasPortafolio': 'rubricas_portafolio', // Rúbricas de evaluación docente
    'tiposDeInformesDeResultados': 'informe_resultados',
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
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.warn('  ⚠️  Error verificando bucket:', errorMessage)
  }
}