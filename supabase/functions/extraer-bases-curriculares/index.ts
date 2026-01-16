//
// Edge Function para extraer Bases Curriculares desde curriculumnacional.cl
//
// Soporta múltiples estructuras HTML del sitio:
//
// ESTRUCTURA TIPO A (ej: 1°-6° básico):
// - .oa-cnt: Contenedor de cada objetivo de aprendizaje
// - .oa-numero: Código del OA
// - .oa-eje: Eje curricular
// - .oa-descripcion: Texto del objetivo
// - .oa-basal: Indicador de priorización
// - .oa-recurso a: Actividades complementarias
//
// ESTRUCTURA TIPO B (otros niveles):
// - .items-wrapper: Contenedor de ejes
// - .item-wrapper: Contenedor de OA individual
// - .oa-title: Título del OA
// - .field__item: Descripción del objetivo
// - .prioritized: Indicador de priorización
// - a.link-more: Link a detalle del OA
// - .field--name-field-recursos-relacionados li a: Actividades
 
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { crearClienteServicio, UnauthorizedError } from '../shared/service-auth.ts'
 
// ============================================
// CONFIGURACIÓN
// ============================================
 
const CONFIG = {
  BASE_URL: 'https://www.curriculumnacional.cl',
  START_URL: 'https://www.curriculumnacional.cl/curriculum/1o-6o-basico/',
  DELAY_BETWEEN_REQUESTS: 500, // ms para rate limiting
  MAX_RETRIES: 3,
  USER_AGENT: 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0; +https://profeflow.cl)',
  // Límite de asignaturas a procesar (0 = todas)
  // MODO PRODUCCIÓN: 0
  MAX_ASIGNATURAS: 0,
  // Generar ambos formatos
  GENERAR_CSV: true,
  GENERAR_JSON: true,
}
 
// ============================================
// TIPOS E INTERFACES
// ============================================
 
interface ObjetivoAprendizaje {
  asignatura: string
  oa_codigo: string // "AR01 OA 01"
  eje: string // Eje o Núcleo curricular
  objetivo: string
  actividad_1: string
  url_actividad_1: string
  actividad_2: string
  url_actividad_2: string
  actividad_3: string
  url_actividad_3: string
  actividad_4: string
  url_actividad_4: string
  priorizado: 0 | 1 // 1 si es Basal/Prioritized, 0 si no
}
 
interface ObjetivoAprendizajeJSON {
  asignatura: string
  codigo: string
  eje: string
  objetivo: string
  actividades: {
    titulo: string
    url: string
  }[]
  priorizado: boolean
  metadata: {
    nivel: string
    curso: string
    fecha_extraccion: string
  }
}
 
interface AsignaturaLink {
  nombre: string // "Artes Visuales 1° Básico"
  url: string
}
 
// ============================================
// FUNCIONES AUXILIARES
// ============================================
 
/**
 * Limpia texto eliminando espacios múltiples y trimming
 */
function limpiarTexto(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim()
}
 
/**
 * Valida que un código OA tenga formato correcto
 * Ejemplos válidos: "AR01 OA 01", "CN03 OA 05", "HI05 OA 12"
 */
function validarCodigoOA(codigo: string): boolean {
  // Patrón: 2-4 letras, 2 dígitos, espacio, "OA", espacio, 1-2 dígitos
  const patron = /^[A-Z]{2,4}\d{2}\s+OA\s+\d{1,2}$/i
  return patron.test(codigo.trim())
}
 
/**
 * Valida que una URL sea válida
 */
function validarURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
 
/**
 * Realiza fetch con retry y rate limiting
 */
async function fetchWithRetry(url: string, retries = CONFIG.MAX_RETRIES): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': CONFIG.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-CL,es;q=0.9',
        },
      })
 
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
 
      const html = await response.text()
 
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS))
 
      return html
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error(`Intento ${attempt + 1}/${retries} falló para ${url}: ${errorMessage}`)
 
      if (attempt === retries - 1) {
        throw new Error(`Falló después de ${retries} intentos: ${errorMessage}`)
      }
 
      // Backoff exponencial
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
    }
  }
 
  throw new Error('fetchWithRetry: No se pudo completar la solicitud')
}
 
/**
 * Extrae links de asignaturas por curso de la página principal
 * Usa estructura real del sitio: .subject-title + .grades-wrapper
 */
function extraerAsignaturasYCursos(html: string): AsignaturaLink[] {
  const links: AsignaturaLink[] = []
 
  // Estructura real del sitio:
  // <div class="subject subject-grades">
  //   <a href="/curriculum/1o-6o-basico/artes-visuales">
  //     <span class="subject-title">Artes Visuales</span>
  //   </a>
  //   <div class="grades-wrapper">
  //     <a href=".../artes-visuales/1-basico" class="badge">1° Básico</a>
  //     <a href=".../artes-visuales/2-basico" class="badge">2° Básico</a>
  //   </div>
  // </div>
 
  const patronAsignatura = /<div[^>]*class=[^>]*subject-grades[^>]*>[\s\S]*?<span[^>]*class=[^>]*subject-title[^>]*>([^<]*)<\/span>[\s\S]*?<div[^>]*class=[^>]*grades-wrapper[^>]*>([\s\S]*?)<\/div>/gi
 
  let match
  while ((match = patronAsignatura.exec(html)) !== null) {
    const nombreAsignatura = limpiarTexto(match[1])
    const gradesWrapper = match[2]
 
    // Extraer todos los links de cursos dentro del grades-wrapper
    const patronCurso = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi
    let matchCurso
 
    while ((matchCurso = patronCurso.exec(gradesWrapper)) !== null) {
      const href = matchCurso[1]
      const curso = limpiarTexto(matchCurso[2])
 
      // Construir nombre completo y URL
      const nombreCompleto = `${nombreAsignatura} ${curso}`
      const url = href.startsWith('http') ? href : CONFIG.BASE_URL + href
 
      // Validar URL
      if (!validarURL(url)) {
        console.warn(`URL inválida ignorada: ${url}`)
        continue
      }
 
      // Evitar duplicados
      if (!links.some(l => l.url === url) && nombreCompleto.length > 0) {
        links.push({ nombre: nombreCompleto, url })
      }
    }
  }
 
  return links
}
 
/**
 * Extrae objetivos de aprendizaje de una página de asignatura
 * Soporta dos estructuras HTML diferentes usando balanceo de divs (más robusto que regex):
 * TIPO A: .oa-cnt, .oa-numero, .oa-eje, .oa-descripcion, .oa-basal
 * TIPO B: .items-wrapper, .item-wrapper, .oa-title, .field__item, .prioritized
 */
function extraerObjetivos(html: string, asignatura: string, curso: string, nivel: string = ''): ObjetivoAprendizaje[] {
  const objetivos: ObjetivoAprendizaje[] = []
 
  // Extraer curso/nivel si está disponible en la página
  const nivelMatch = html.match(/<[^>]*class=[^>]*nivel-titulo[^>]*>[\s\S]*?<span[^>]*>([^<]*)<\/span>/i)
  const cursoExtraido = nivelMatch ? limpiarTexto(nivelMatch[1]) : curso
 
  // ESTRUCTURA TIPO B - Con balanceo de divs (más robusto)
  let posicion = 0
  let foundTipoB = false
 
  while (true) {
    const inicioWrapper = html.indexOf('<div class="items-wrapper">', posicion)
    if (inicioWrapper === -1) break
 
    // Encontrar el cierre del div balanceando apertura/cierre
    let nivel_div = 0
    let i = inicioWrapper
    let inicioContador = -1
 
    while (i < html.length) {
      if (html.substr(i, 4) === '<div') {
        if (inicioContador === -1) inicioContador = i
        nivel_div++
        i += 4
      } else if (html.substr(i, 6) === '</div>') {
        nivel_div--
        if (nivel_div === 0 && inicioContador !== -1) {
          // Encontramos el cierre
          const bloqueEje = html.substring(inicioWrapper, i + 6)
          foundTipoB = true
 
          // Extraer eje (está dentro de un <a> en el <h3>)
          // Estructura real: <h3 class="link"><a href="...">Nombre del Eje</a></h3>
          const ejeTitleMatch = bloqueEje.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([^<]*)<\/a>[\s\S]*?<\/h3>/i)
          let ejeNombre = ejeTitleMatch ? limpiarTexto(ejeTitleMatch[1]) : ''
 
          // Si no se encontró, intentar sin <a>
          if (!ejeNombre) {
            const ejeSimpleMatch = bloqueEje.match(/<h3[^>]*>([^<]*)<\/h3>/i)
            ejeNombre = ejeSimpleMatch ? limpiarTexto(ejeSimpleMatch[1]) : ''
          }
 
          // Extraer item-wrappers dentro de este bloque
          // Buscar tanto '<div class="item-wrapper">' como '<div class="item-wrapper prioritized">'
          let posItem = 0
          while (true) {
            const inicioItem = bloqueEje.indexOf('<div class="item-wrapper', posItem)
            if (inicioItem === -1) break
 
            // Buscar cierre del item-wrapper con balanceo
            let nivelItem = 0
            let j = inicioItem
            while (j < bloqueEje.length) {
              if (bloqueEje.substr(j, 4) === '<div') {
                nivelItem++
                j += 4
              } else if (bloqueEje.substr(j, 6) === '</div>') {
                nivelItem--
                if (nivelItem === 0) {
                  const itemHtml = bloqueEje.substring(inicioItem, j + 6)
 
                  try {
                    // Extraer código OA desde <span class="oa-title">
                    // Texto real: "Objetivo de aprendizaje AR01 OA 01"
                    const codigoMatch = itemHtml.match(/<span[^>]*class=[^>]*oa-title[^>]*>([^<]*)<\/span>/i)
                    let codigoTexto = codigoMatch ? limpiarTexto(codigoMatch[1]) : ''
 
                    // Extraer solo el código del formato "Objetivo de aprendizaje AR01 OA 01"
                    const codigoExtraido = codigoTexto.match(/([A-Z]{2,4}\d{2}\s+OA\s+\d{1,2})/i)
                    const codigo = codigoExtraido ? codigoExtraido[1] : ''
 
                    if (codigo && validarCodigoOA(codigo)) {
                      // Extraer descripción desde el <p> dentro de field__item
                      const objetivoMatch = itemHtml.match(/<div[^>]*class=[^>]*field__item[^>]*>[\s\S]*?<p[^>]*>([^<]*)<\/p>/i)
                      const objetivo = objetivoMatch ? limpiarTexto(objetivoMatch[1]) : ''
 
                      const esPriorizado = itemHtml.includes('class="prioritized"') || itemHtml.includes('"prioritized"')
 
                      const detalleLinkMatch = itemHtml.match(/<a[^>]*class=[^>]*link-more[^>]*href=["']([^"']*)["']/i)
                      const detalleUrl = detalleLinkMatch ?
                        (detalleLinkMatch[1].startsWith('http') ? detalleLinkMatch[1] : CONFIG.BASE_URL + detalleLinkMatch[1]) :
                        ''
 
                      objetivos.push({
                        asignatura,
                        oa_codigo: codigo,
                        eje: ejeNombre,
                        objetivo: objetivo,
                        actividad_1: '',
                        url_actividad_1: '',
                        actividad_2: '',
                        url_actividad_2: '',
                        actividad_3: '',
                        url_actividad_3: '',
                        actividad_4: '',
                        url_actividad_4: '',
                        priorizado: esPriorizado ? 1 : 0,
                        _detalleUrl: detalleUrl,
                        _curso: cursoExtraido,
                        _nivel: nivel || cursoExtraido,
                      } as any)
                    } else if (codigo) {
                      console.warn(`Código OA inválido ignorado: ${codigo}`)
                    }
                  } catch (error) {
                    console.error('Error procesando item-wrapper:', error)
                  }
 
                  posItem = j + 6
                  break
                }
                j += 6
              } else {
                j++
              }
            }
          }
 
          posicion = i + 6
          break
        }
        i += 6
      } else {
        i++
      }
    }
 
    if (nivel_div !== 0) {
      // No se pudo balancear, saltar
      posicion = inicioWrapper + 1
    }
  }
 
  // SI NO SE ENCONTRÓ ESTRUCTURA TIPO B, INTENTAR TIPO A (.oa-cnt)
  if (!foundTipoB) {
    posicion = 0
 
    while (true) {
      const inicioCnt = html.indexOf('<div class="oa-cnt">', posicion)
      if (inicioCnt === -1) break
 
      // Encontrar cierre balanceado
      let nivel_div = 0
      let i = inicioCnt
 
      while (i < html.length) {
        if (html.substr(i, 4) === '<div') {
          nivel_div++
          i += 4
        } else if (html.substr(i, 6) === '</div>') {
          nivel_div--
          if (nivel_div === 0) {
            const bloqueOA = html.substring(inicioCnt, i + 6)
 
            try {
              const ejeMatch = bloqueOA.match(/<div[^>]*class=[^>]*oa-eje[^>]*>([^<]*)<\/div>/i)
              const eje = ejeMatch ? limpiarTexto(ejeMatch[1]) : ''
 
              const codigoMatch = bloqueOA.match(/<div[^>]*class=[^>]*oa-numero[^>]*>([^<]*)<\/div>/i)
              const codigo = codigoMatch ? limpiarTexto(codigoMatch[1]) : ''
 
              if (codigo && validarCodigoOA(codigo)) {
                const objetivoMatch = bloqueOA.match(/<div[^>]*class=[^>]*oa-descripcion[^>]*>([^<]*)<\/div>/i)
                const objetivo = objetivoMatch ? limpiarTexto(objetivoMatch[1]) : ''
 
                const esBasal = bloqueOA.includes('class="oa-basal"')
 
                objetivos.push({
                  asignatura,
                  oa_codigo: codigo,
                  eje: eje,
                  objetivo: objetivo,
                  actividad_1: '',
                  url_actividad_1: '',
                  actividad_2: '',
                  url_actividad_2: '',
                  actividad_3: '',
                  url_actividad_3: '',
                  actividad_4: '',
                  url_actividad_4: '',
                  priorizado: esBasal ? 1 : 0,
                  _curso: cursoExtraido,
                  _nivel: nivel || cursoExtraido,
                } as any)
              } else if (codigo) {
                console.warn(`Código OA inválido ignorado: ${codigo}`)
              }
            } catch (error) {
              console.error('Error procesando oa-cnt:', error)
            }
 
            posicion = i + 6
            break
          }
          i += 6
        } else {
          i++
        }
      }
 
      if (nivel_div !== 0) {
        // No se pudo balancear
        posicion = inicioCnt + 1
      }
    }
  }
 
  return objetivos
}
 
/**
 * Extrae actividades complementarias de la página de actividades
 * Soporta múltiples selectores con fallbacks robustos:
 * - .field--name-field-recursos-relacionados li a (tipo B)
 * - .oa-recurso a (tipo A)
 * - .recursos-wrapper a (genérico)
 * - a[href*="/recursos/"] (fallback por URL pattern)
 */
async function extraerActividades(url: string): Promise<{ nombre: string; url: string }[]> {
  if (!url) return []
 
  try {
    const html = await fetchWithRetry(url)
    const actividades: { nombre: string; url: string }[] = []
 
    // PATRÓN 1: .field--name-field-recursos-relacionados (más específico)
    const patronActividadB = /<[^>]*class=[^>]*field--name-field-recursos-relacionados[^>]*>[\s\S]*?<li[^>]*>[\s\S]*?<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi
 
    let match
    while ((match = patronActividadB.exec(html)) !== null && actividades.length < 4) {
      const href = match[1]
      const nombre = limpiarTexto(match[2])
 
      if (!nombre || nombre.length < 3) continue
 
      const urlCompleta = href.startsWith('http') ? href : CONFIG.BASE_URL + href
 
      if (validarURL(urlCompleta)) {
        actividades.push({ nombre, url: urlCompleta })
      }
    }
 
    // PATRÓN 2: .oa-recurso a (fallback tipo A)
    if (actividades.length === 0) {
      const patronActividadA = /<[^>]*class=[^>]*oa-recurso[^>]*>[\s\S]*?<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi
 
      while ((match = patronActividadA.exec(html)) !== null && actividades.length < 4) {
        const href = match[1]
        const nombre = limpiarTexto(match[2])
 
        if (!nombre || nombre.length < 3) continue
 
        const urlCompleta = href.startsWith('http') ? href : CONFIG.BASE_URL + href
 
        if (validarURL(urlCompleta)) {
          actividades.push({ nombre, url: urlCompleta })
        }
      }
    }
 
    // PATRÓN 3: .recursos-wrapper a (genérico)
    if (actividades.length === 0) {
      const patronGenerico = /<[^>]*class=[^>]*recursos-wrapper[^>]*>[\s\S]*?<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi
 
      while ((match = patronGenerico.exec(html)) !== null && actividades.length < 4) {
        const href = match[1]
        const nombre = limpiarTexto(match[2])
 
        if (!nombre || nombre.length < 3) continue
 
        const urlCompleta = href.startsWith('http') ? href : CONFIG.BASE_URL + href
 
        if (validarURL(urlCompleta)) {
          actividades.push({ nombre, url: urlCompleta })
        }
      }
    }
 
    // PATRÓN 4: Links que contienen "/recursos/" en la URL (último fallback)
    if (actividades.length === 0) {
      const patronFallback = /<a[^>]*href=["']([^"']*\/recursos\/[^"']*)["'][^>]*>([^<]*)<\/a>/gi
 
      while ((match = patronFallback.exec(html)) !== null && actividades.length < 4) {
        const href = match[1]
        const nombre = limpiarTexto(match[2])
 
        if (!nombre || nombre.length < 3) continue
 
        const urlCompleta = href.startsWith('http') ? href : CONFIG.BASE_URL + href
 
        if (validarURL(urlCompleta)) {
          actividades.push({ nombre, url: urlCompleta })
        }
      }
    }
 
    return actividades
  } catch (error) {
    console.error(`Error extrayendo actividades de ${url}:`, error)
    return []
  }
}
 
/**
 * Genera CSV con los objetivos de aprendizaje
 * Formato ajustado al ejemplo proporcionado
 */
function generarCSV(objetivos: ObjetivoAprendizaje[]): string {
  // Headers según el formato del ejemplo
  const headers = [
    'Asignatura',
    'OA',
    'Eje',
    'Objetivo de Aprendizaje',
    'Actividad 1',
    'URL Actividad 1',
    'Actividad 2',
    'URL Actividad 2',
    'Actividad 3',
    'URL Actividad 3',
    'Actividad 4',
    'URL Actividad 4',
    'Priorizado',
  ]
 
  let csv = headers.join(';') + '\n'
 
  for (const obj of objetivos) {
    const row = [
      escaparCSV(obj.asignatura),
      escaparCSV(obj.oa_codigo),
      escaparCSV(obj.eje),
      escaparCSV(obj.objetivo),
      escaparCSV(obj.actividad_1),
      escaparCSV(obj.url_actividad_1),
      escaparCSV(obj.actividad_2),
      escaparCSV(obj.url_actividad_2),
      escaparCSV(obj.actividad_3),
      escaparCSV(obj.url_actividad_3),
      escaparCSV(obj.actividad_4),
      escaparCSV(obj.url_actividad_4),
      obj.priorizado.toString(),
    ]
 
    csv += row.join(';') + '\n'
  }
 
  return csv
}
 
/**
 * Genera JSON estructurado con los objetivos de aprendizaje
 */
function generarJSON(objetivos: ObjetivoAprendizaje[]): string {
  const fechaExtraccion = new Date().toISOString()
 
  const objetivosJSON: ObjetivoAprendizajeJSON[] = objetivos.map(obj => {
    const actividades: { titulo: string; url: string }[] = []
 
    if (obj.actividad_1) actividades.push({ titulo: obj.actividad_1, url: obj.url_actividad_1 })
    if (obj.actividad_2) actividades.push({ titulo: obj.actividad_2, url: obj.url_actividad_2 })
    if (obj.actividad_3) actividades.push({ titulo: obj.actividad_3, url: obj.url_actividad_3 })
    if (obj.actividad_4) actividades.push({ titulo: obj.actividad_4, url: obj.url_actividad_4 })
 
    const objAny = obj as any
 
    return {
      asignatura: obj.asignatura,
      codigo: obj.oa_codigo,
      eje: obj.eje,
      objetivo: obj.objetivo,
      actividades,
      priorizado: obj.priorizado === 1,
      metadata: {
        nivel: objAny._nivel || '',
        curso: objAny._curso || '',
        fecha_extraccion: fechaExtraccion,
      },
    }
  })
 
  const resultado = {
    metadata: {
      titulo: 'Bases Curriculares 1° a 6° Básico - Ministerio de Educación de Chile',
      fuente: 'https://www.curriculumnacional.cl',
      fecha_extraccion: fechaExtraccion,
      total_objetivos: objetivos.length,
      objetivos_priorizados: objetivos.filter(o => o.priorizado === 1).length,
    },
    objetivos: objetivosJSON,
  }
 
  return JSON.stringify(resultado, null, 2)
}
 
/**
 * Genera nombre de archivo CSV con timestamp
 */
function generarNombreArchivo(formato: 'csv' | 'json', fecha: Date = new Date()): string {
  const fechaStr = fecha.toISOString().split('T')[0]
  return `bases_curriculares_1_a_6_basico_${fechaStr}.${formato}`
}
 
/**
 * Escapa caracteres especiales para CSV
 */
function escaparCSV(valor: string): string {
  if (!valor) return ''
 
  // Si contiene punto y coma, comillas o saltos de línea, envolver en comillas
  if (valor.includes(';') || valor.includes('"') || valor.includes('\n')) {
    // Duplicar comillas internas
    return '"' + valor.replace(/"/g, '""') + '"'
  }
 
  return valor
}
 
/**
 * Sube archivo a Supabase Storage
 */
async function subirArchivoStorage(
  supabase: any,
  contenido: string,
  nombreArchivo: string,
  contentType: string
): Promise<string> {
  const bucketName = 'documentos-transformados'
  const rutaArchivo = `bases-curriculares/${nombreArchivo}`
 
  // Crear bucket si no existe
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExiste = buckets?.some((b: any) => b.name === bucketName)
 
  if (!bucketExiste) {
    console.log('Creando bucket documentos-transformados...')
    await supabase.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
    })
  }
 
  // Subir archivo
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(rutaArchivo, contenido, {
      contentType,
      upsert: true,
    })
 
  if (error) {
    throw new Error(`Error subiendo archivo: ${error.message}`)
  }
 
  // Obtener URL firmada (válida por 1 año)
  const { data: urlData } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(rutaArchivo, 31536000) // 1 año
 
  return urlData?.signedUrl || rutaArchivo
}
 
/**
 * Handler principal de la Edge Function
 */
export async function handler(req: Request): Promise<Response> {
  const startTime = Date.now()
 
  try {
    console.log('🚀 Iniciando extracción de Bases Curriculares...')
    console.log(`📊 Modo: ${CONFIG.MAX_ASIGNATURAS > 0 ? 'TEST (' + CONFIG.MAX_ASIGNATURAS + ' asignaturas)' : 'PRODUCCIÓN (todas las asignaturas)'}`)
 
    // Autenticación
    const supabase = crearClienteServicio(req)
 
    // Obtener configuración del request
    const { force = false } = await req.json().catch(() => ({ force: false }))
 
    // 1. Crear registro de proceso ETL
    const { data: proceso, error: procesoError } = await supabase
      .rpc('iniciar_proceso_etl', {
        p_nombre: 'extraer_bases_curriculares',
        p_tipo_proceso: 'extraccion',
        p_descripcion: 'Extracción de Bases Curriculares 1° a 6° básico desde curriculumnacional.cl',
        p_configuracion: JSON.stringify({ force, modo: CONFIG.MAX_ASIGNATURAS > 0 ? 'test' : 'produccion' }),
      })
 
    if (procesoError) {
      throw new Error(`Error creando proceso ETL: ${procesoError.message}`)
    }
 
    const procesoId = proceso
    console.log(`📝 Proceso ETL creado: ${procesoId}`)
 
    try {
      // 2. Obtener página principal
      console.log('📡 Obteniendo página principal...')
      await supabase.rpc('agregar_log_proceso_etl', {
        p_proceso_id: procesoId,
        p_mensaje: 'Obteniendo página principal de curriculumnacional.cl',
      })
 
      const htmlPrincipal = await fetchWithRetry(CONFIG.START_URL)
 
      // 3. Extraer links de asignaturas
      console.log('🔍 Extrayendo asignaturas y cursos...')
      const asignaturas = extraerAsignaturasYCursos(htmlPrincipal)
      console.log(`✓ Encontradas ${asignaturas.length} asignaturas`)
 
      await supabase.rpc('agregar_log_proceso_etl', {
        p_proceso_id: procesoId,
        p_mensaje: `Encontradas ${asignaturas.length} asignaturas`,
      })
 
      // 4. Extraer objetivos de cada asignatura
      const todosLosObjetivos: ObjetivoAprendizaje[] = []
      let asignaturasProcesadas = 0
 
      // Aplicar límite si está configurado (0 = sin límite)
      const asignaturasAProcesar = CONFIG.MAX_ASIGNATURAS > 0
        ? asignaturas.slice(0, CONFIG.MAX_ASIGNATURAS)
        : asignaturas
 
      console.log(`📝 Procesando ${asignaturasAProcesar.length} de ${asignaturas.length} asignaturas`)
 
      for (const asig of asignaturasAProcesar) {
        try {
          console.log(`\n📚 Procesando: ${asig.nombre}`)
          await supabase.rpc('agregar_log_proceso_etl', {
            p_proceso_id: procesoId,
            p_mensaje: `Procesando ${asig.nombre}`,
          })
 
          const htmlAsignatura = await fetchWithRetry(asig.url)
 
          // Extraer nombre de asignatura y curso del nombre
          const partes = asig.nombre.split(/\s+/)
          const curso = partes[partes.length - 2] + ' ' + partes[partes.length - 1] // "1° Básico"
          const nombreAsignatura = partes.slice(0, -2).join(' ')
 
          const objetivos = extraerObjetivos(htmlAsignatura, nombreAsignatura, curso)
          console.log(`  ✓ Extraídos ${objetivos.length} objetivos`)
 
          // 5. Para cada objetivo, extraer actividades
          for (const obj of objetivos) {
            // Si tiene _detalleUrl (estructura Tipo B), usarlo; sino construir URL tradicional
            const objAny = obj as any
            const urlActividades = objAny._detalleUrl ||
              `${asig.url}/${obj.oa_codigo.toLowerCase().replace(/\s+/g, '-')}#actividades`
 
            try {
              const actividades = await extraerActividades(urlActividades)
 
              if (actividades.length > 0) {
                obj.actividad_1 = actividades[0]?.nombre || ''
                obj.url_actividad_1 = actividades[0]?.url || ''
              }
              if (actividades.length > 1) {
                obj.actividad_2 = actividades[1]?.nombre || ''
                obj.url_actividad_2 = actividades[1]?.url || ''
              }
              if (actividades.length > 2) {
                obj.actividad_3 = actividades[2]?.nombre || ''
                obj.url_actividad_3 = actividades[2]?.url || ''
              }
              if (actividades.length > 3) {
                obj.actividad_4 = actividades[3]?.nombre || ''
                obj.url_actividad_4 = actividades[3]?.url || ''
              }
            } catch (error) {
              console.warn(`  ⚠️  No se pudieron extraer actividades para ${obj.oa_codigo}`)
            }
          }
 
          todosLosObjetivos.push(...objetivos)
          asignaturasProcesadas++
 
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
          console.error(`  ❌ Error procesando ${asig.nombre}: ${errorMessage}`)
          await supabase.rpc('agregar_log_proceso_etl', {
            p_proceso_id: procesoId,
            p_mensaje: `Error en ${asig.nombre}: ${errorMessage}`,
          })
        }
      }
 
      console.log(`\n✅ Extracción completada: ${todosLosObjetivos.length} objetivos`)
 
      const archivosGenerados: any[] = []
 
      // 6. Generar y subir CSV si está habilitado
      if (CONFIG.GENERAR_CSV) {
        console.log('📝 Generando CSV...')
        const contenidoCSV = generarCSV(todosLosObjetivos)
 
        const nombreCSV = generarNombreArchivo('csv')
        console.log(`💾 Subiendo ${nombreCSV} a Storage...`)
 
        const urlCSV = await subirArchivoStorage(
          supabase,
          contenidoCSV,
          nombreCSV,
          'text/csv; charset=utf-8'
        )
 
        console.log(`✓ CSV subido: ${urlCSV}`)
 
        archivosGenerados.push({
          nombre: nombreCSV,
          path: `bases-curriculares/${nombreCSV}`,
          size: new Blob([contenidoCSV]).size,
          url: urlCSV,
          formato: 'csv',
        })
 
        // Registrar documento CSV
        await supabase
          .from('documentos_transformados')
          .insert({
            proceso_etl_id: procesoId,
            nombre_archivo: nombreCSV,
            tipo_documento: 'bases_curriculares',
            formato: 'csv',
            storage_bucket: 'documentos-transformados',
            storage_path: `bases-curriculares/${nombreCSV}`,
            tamaño_bytes: new Blob([contenidoCSV]).size,
            url_descarga: urlCSV,
            num_registros: todosLosObjetivos.length,
            columnas: [
              'Asignatura', 'OA', 'Eje', 'Objetivo de Aprendizaje',
              'Actividad 1', 'URL Actividad 1', 'Actividad 2', 'URL Actividad 2',
              'Actividad 3', 'URL Actividad 3', 'Actividad 4', 'URL Actividad 4',
              'Priorizado',
            ],
            resumen_contenido: {
              asignaturas_procesadas: asignaturasProcesadas,
              total_objetivos: todosLosObjetivos.length,
              objetivos_priorizados: todosLosObjetivos.filter(o => o.priorizado === 1).length,
            },
            version: new Date().toISOString().split('T')[0],
          })
      }
 
      // 7. Generar y subir JSON si está habilitado
      if (CONFIG.GENERAR_JSON) {
        console.log('📝 Generando JSON...')
        const contenidoJSON = generarJSON(todosLosObjetivos)
 
        const nombreJSON = generarNombreArchivo('json')
        console.log(`💾 Subiendo ${nombreJSON} a Storage...`)
 
        const urlJSON = await subirArchivoStorage(
          supabase,
          contenidoJSON,
          nombreJSON,
          'application/json; charset=utf-8'
        )
 
        console.log(`✓ JSON subido: ${urlJSON}`)
 
        archivosGenerados.push({
          nombre: nombreJSON,
          path: `bases-curriculares/${nombreJSON}`,
          size: new Blob([contenidoJSON]).size,
          url: urlJSON,
          formato: 'json',
        })
 
        // Registrar documento JSON
        await supabase
          .from('documentos_transformados')
          .insert({
            proceso_etl_id: procesoId,
            nombre_archivo: nombreJSON,
            tipo_documento: 'bases_curriculares',
            formato: 'json',
            storage_bucket: 'documentos-transformados',
            storage_path: `bases-curriculares/${nombreJSON}`,
            tamaño_bytes: new Blob([contenidoJSON]).size,
            url_descarga: urlJSON,
            num_registros: todosLosObjetivos.length,
            resumen_contenido: {
              asignaturas_procesadas: asignaturasProcesadas,
              total_objetivos: todosLosObjetivos.length,
              objetivos_priorizados: todosLosObjetivos.filter(o => o.priorizado === 1).length,
            },
            version: new Date().toISOString().split('T')[0],
          })
      }
 
      // 8. Finalizar proceso ETL
      await supabase.rpc('finalizar_proceso_etl', {
        p_proceso_id: procesoId,
        p_estado: 'completado',
        p_total_registros: todosLosObjetivos.length,
        p_registros_exitosos: todosLosObjetivos.length,
        p_registros_fallidos: 0,
        p_archivos_generados: JSON.stringify(archivosGenerados),
      })
 
      const duracionMs = Date.now() - startTime
      console.log(`\n✅ Proceso completado en ${duracionMs}ms`)
 
      return new Response(
        JSON.stringify({
          success: true,
          proceso_id: procesoId,
          archivos: archivosGenerados,
          estadisticas: {
            asignaturas_procesadas: asignaturasProcesadas,
            total_objetivos: todosLosObjetivos.length,
            objetivos_priorizados: todosLosObjetivos.filter(o => o.priorizado === 1).length,
            duracion_ms: duracionMs,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
 
    } catch (error) {
      // Error durante el proceso - marcar como error
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
 
      await supabase.rpc('finalizar_proceso_etl', {
        p_proceso_id: procesoId,
        p_estado: 'error',
        p_errores: JSON.stringify([
          {
            timestamp: new Date().toISOString(),
            mensaje: errorMessage,
            detalle: error instanceof Error ? error.stack : '',
          },
        ]),
      })
 
      throw error
    }
 
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
 
    console.error('❌ Error en extracción:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
 
    return new Response(
      JSON.stringify({
        error: 'Error en extracción de bases curriculares',
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
 
if (import.meta.main) {
  serve(handler)
}