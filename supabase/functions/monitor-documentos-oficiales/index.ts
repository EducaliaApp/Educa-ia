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
  // Rate limiting
  DELAY_BETWEEN_CATEGORIES: 2000, // 2s entre categorías
  DELAY_BETWEEN_DOCUMENTS: 500,   // 500ms entre docs
  MAX_RETRIES: 3,
  
  // Procesamiento
  MAX_CONCURRENT_DOWNLOADS: 3,
  PDF_SAMPLE_PAGES: 3, // Primeras 3 páginas para clasificación IA
  
  // Thresholds
  MIN_AI_CONFIDENCE: 0.70, // Confianza mínima para clasificación IA
  MIN_PDF_SIZE: 10 * 1024, // 10KB mínimo
  MAX_PDF_SIZE: 100 * 1024 * 1024, // 100MB máximo
  PDF_SAMPLE_SIZE: 500000, // 500KB para muestra de clasificación
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
  rubricas: {
    url: 'https://www.docentemas.cl/documentos-descargables/rubricas',
    subcategorias: ['Rúbricas']
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
  error?: string
}

interface Reporte {
  fecha_monitoreo: string
  documentos_detectados: number
  documentos_nuevos: number
  documentos_actualizados: number
  documentos_duplicados: number
  documentos_invalidos: number
  procesamiento_exitoso: number
  procesamiento_fallido: number
  tiempo_total_ms: number
  detalles: ResultadoProcesamiento[]
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
    const { force = false } = await req.json().catch(() => ({ force: false }))
    
    // 1. SCRAPING con rate limiting
    const documentosDetectados = await scrapearDocumentos(processor, aiAnalyzer, pdfExtractor)
    
    console.log(`\n📋 Total detectados: ${documentosDetectados.length} documentos`)
    
    // 2. COMPARACIÓN con BD (detección de duplicados mejorada)
    const analisisDocumentos = await analizarDocumentos(
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
    
    // 3. PROCESAMIENTO de nuevos documentos
    const resultadosProcesamiento = await procesarDocumentosNuevos(
      supabase,
      analisisDocumentos.nuevos,
      processor
    )
    
    // 4. ACTUALIZACIÓN de documentos modificados
    await procesarActualizaciones(
      supabase,
      analisisDocumentos.actualizados
    )
    
    // 5. REPORTE final
    const reporte = generarReporte(
      documentosDetectados,
      analisisDocumentos,
      resultadosProcesamiento,
      Date.now() - startTime
    )
    
    console.log('\n✅ Monitoreo completado')
    console.log(`  ⏱️  Tiempo total: ${((reporte.tiempo_total_ms) / 1000).toFixed(2)}s`)
    console.log(`  📊 Nuevos: ${analisisDocumentos.nuevos.length}`)
    console.log(`  🔄 Actualizados: ${analisisDocumentos.actualizados.length}`)
    console.log(`  ⏭️  Duplicados: ${analisisDocumentos.duplicados.length}`)
    
    // 6. NOTIFICACIONES si hay cambios
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
          
          // 2. Si falla, usar IA con contexto mejorado
          if (!metadata || (metadata as any).confianza < 0.7) {
            console.log(`    🤖 Clasificación IA para: ${link.nombre}`)
            const metadataIA = await clasificarConIAMejorada(
              link,
              tipo,
              subcategoria,
              aiAnalyzer,
              pdfExtractor
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
            console.log(`    ℹ️  Usando defaults (baja confianza)`)
          }
          
          // Solo agregar si tiene año reciente y metadata válida
          if (metadata && metadata.año >= 2024) {
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
      // Buscar por múltiples criterios
      const { data: existentes } = await supabase
        .from('documentos_oficiales')
        .select('id, hash_contenido, version, url_original, titulo, storage_path')
        .or(`url_original.eq.${doc.url},and(titulo.ilike.%${doc.nombre}%,año_vigencia.eq.${doc.año})`)
      
      if (!existentes || existentes.length === 0) {
        // ✅ NUEVO
        resultado.nuevos.push(doc)
        console.log(`  🆕 ${doc.nombre}`)
        
      } else if (existentes.length === 1) {
        const existente = existentes[0]
        
        if (existente.url_original === doc.url) {
          // Mismo URL - verificar si cambió contenido
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
        } else {
          // Mismo título/año pero URL diferente
          console.log(`  ⚠️  URL diferente para: ${doc.nombre}`)
          resultado.duplicados.push(doc)
        }
        
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
 * Procesa documentos nuevos
 */
async function procesarDocumentosNuevos(
  supabase: any,
  documentosNuevos: DocumentoDetectado[],
  processor: DocumentProcessor
): Promise<ResultadoProcesamiento[]> {
  
  const resultados: ResultadoProcesamiento[] = []
  
  for (const doc of documentosNuevos) {
    console.log(`\n📥 Procesando nuevo documento: ${doc.nombre}`)
    
    try {
      const resultado = await procesarDocumentoNuevo(supabase, doc, processor)
      resultados.push(resultado)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error(`  ✗ Error procesando ${doc.nombre}:`, errorMessage)
      resultados.push({
        documento: doc.nombre,
        exito: false,
        error: errorMessage
      })
    }
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
  tiempoMs: number
): Reporte {
  return {
    fecha_monitoreo: new Date().toISOString(),
    documentos_detectados: documentosDetectados.length,
    documentos_nuevos: analisis.nuevos.length,
    documentos_actualizados: analisis.actualizados.length,
    documentos_duplicados: analisis.duplicados.length,
    documentos_invalidos: analisis.invalidos.length,
    procesamiento_exitoso: resultados.filter(r => r.exito).length,
    procesamiento_fallido: resultados.filter(r => !r.exito).length,
    tiempo_total_ms: tiempoMs,
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
  
  // Buscar tabs de Elementor
  const patronTab = /<div[^>]*id="elementor-tab-title-\d+"[^>]*>([^<]+)<\/div>[\s\S]*?<div[^>]*id="elementor-tab-content-\d+"[^>]*role="tabpanel"[^>]*>([\s\S]*?)<\/div>/gi
  
  let matchTab
  while ((matchTab = patronTab.exec(html)) !== null) {
    const tituloTab = matchTab[1].trim()
    const contenidoTab = matchTab[2]
    
    // Buscar subcategoría que coincida
    const subcategoriaMatch = subcategorias.find(sub => 
      tituloTab.toLowerCase().includes(sub.toLowerCase()) ||
      sub.toLowerCase().includes(tituloTab.toLowerCase())
    )
    
    if (subcategoriaMatch) {
      const pdfs = extraerLinksPDF(contenidoTab)
      resultado[subcategoriaMatch].push(...pdfs)
      console.log(`      📝 Tab "${tituloTab}" → ${subcategoriaMatch}: ${pdfs.length} PDFs`)
    }
  }
  
  // Si no se encontraron tabs, extraer todos los PDFs sin categoría
  const totalEncontrados = Object.values(resultado).reduce((sum, arr) => sum + arr.length, 0)
  if (totalEncontrados === 0) {
    console.log(`      ⚠️ No se encontraron tabs, extrayendo todos los PDFs`)
    const todosPDFs = extraerLinksPDF(html)
    if (subcategorias.length > 0) {
      resultado[subcategorias[0]] = todosPDFs
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
  asignatura?: string
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
  
  // Detectar asignatura
  let asignatura: string | undefined
  const patronesAsignatura = {
    'Matemática': /matemática|matemáticas/i,
    'Lenguaje y Comunicación': /lenguaje|comunicación|lengua castellana/i,
    'Ciencias Naturales': /ciencias naturales|biología|física|química/i,
    'Historia y Geografía': /historia|geografía|ciencias sociales/i,
    'Inglés': /inglés|english/i,
    'Artes Visuales': /artes visuales|artes plásticas/i,
    'Música': /música/i,
    'Educación Física': /educación física|ed\. física/i,
    'Tecnología': /tecnología/i,
    'Religión': /religión|católica|evangélica/i
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
    
    const response = await fetch(link.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0)',
        'Range': `bytes=0-${Math.min(contentLength, CONFIG.PDF_SAMPLE_SIZE)}`
      }
    })
    
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
    
    // 3. Clasificar con IA usando contenido real
    const prompt = `Clasifica este documento educativo chileno del MINEDUC.

**CONTEXTO:**
- Categoría: ${tipo}
- Subcategoría: ${subcategoria}
- Nombre archivo: ${link.nombre}

**CONTENIDO (primeras páginas):**
${textoMuestra.substring(0, 2000)}

**INSTRUCCIONES:**
Analiza el contenido y clasifica el documento. Responde SOLO con JSON válido (sin markdown):

{
  "año": 2024 o 2025,
  "nivel_educativo": "parvularia|basica_1_6|basica_7_8_media|media_tp|especial_regular|especial_neep|hospitalaria|encierro|lengua_indigena|epja|regular",
  "modalidad": "regular|especial|hospitalaria|encierro|lengua_indigena",
  "asignatura": "Matemática|Lenguaje|Historia|etc o null",
  "confianza": 0.0 a 1.0,
  "razonamiento": "breve explicación"
}`
    
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
    
    return {
      año: clasificacion.año,
      nivel: clasificacion.nivel_educativo,
      modalidad: clasificacion.modalidad,
      asignatura: clasificacion.asignatura,
      confianza: clasificacion.confianza
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
    
    // Validar rangos
    if (data.año < 2020 || data.año > 2026) {
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

function parsearNombreArchivo_OLD(nombre: string, tipo?: string, html?: string): {
  año: number
  nivel: string
  modalidad: string
  asignatura?: string
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
  
  // Detectar asignatura
  let asignatura: string | undefined
  const patronesAsignatura = {
    'Matemática': /matemática|matemáticas/i,
    'Lenguaje y Comunicación': /lenguaje|comunicación|lengua castellana/i,
    'Ciencias Naturales': /ciencias naturales|biología|física|química/i,
    'Historia y Geografía': /historia|geografía|ciencias sociales/i,
    'Inglés': /inglés|english/i,
    'Artes Visuales': /artes visuales|artes plásticas/i,
    'Música': /música/i,
    'Educación Física': /educación física|ed\. física/i,
    'Tecnología': /tecnología/i,
    'Religión': /religión|católica|evangélica/i
  }
  
  for (const [asig, patron] of Object.entries(patronesAsignatura)) {
    if (patron.test(nombreLower)) {
      asignatura = asig
      break
    }
  }
  
  return { año, nivel, modalidad, asignatura }
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
  const fileName = `${doc.tipo}/${doc.año}/${doc.nombre.replace(/[^a-zA-Z0-9.-]/g, '_')}.pdf`
  console.log('  💾 Subiendo a storage...')
  
  await crearBucketSiNoExiste(supabase)
  
  const { error: uploadError } = await supabase.storage
    .from('documentos-mineduc')
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
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    throw new Error(`No se pudo obtener fuente_id: ${errorMessage}`)
  }
  
  if (!fuenteId) {
    throw new Error('fuente_id es null después de crear/obtener fuente')
  }
  
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
      url_original: doc.url,
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
      'Rúbricas': 'rubricas',
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
    'rubricas': 'rubricas',
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
    const bucketExiste = buckets?.some((bucket: any) => bucket.name === 'documentos-mineduc')
    
    if (!bucketExiste) {
      console.log('  📁 Creando bucket documentos-mineduc...')
      const { error } = await supabase.storage.createBucket('documentos-mineduc', {
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