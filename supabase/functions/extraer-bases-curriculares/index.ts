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
 
import { crearClienteServicio, UnauthorizedError } from '../shared/service-auth.ts'

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}
import { PATRON_VALIDACION_OA, PATRON_EXTRACCION_OA } from './constants.ts'
 
// ============================================
// CONFIGURACIÓN
// ============================================
 
const CONFIG = {
  BASE_URL: 'https://www.curriculumnacional.cl',
  // URLs de todas las categorías curriculares a extraer
  CATEGORY_URLS: [
    'https://www.curriculumnacional.cl/curriculum/educacion-parvularia',
    'https://www.curriculumnacional.cl/curriculum/1o-6o-basico',
    'https://www.curriculumnacional.cl/curriculum/7o-basico-2-medio',
    'https://www.curriculumnacional.cl/curriculum/3o-4o-medio',
    'https://www.curriculumnacional.cl/curriculum/3o-4o-medio-tecnico-profesional',
    'https://www.curriculumnacional.cl/recursos/terminales-formacion-diferenciada-artistica-3-4-medio-0',
    'https://www.curriculumnacional.cl/curriculum/bases-curriculares-educacion-personas-jovenes-adultas-epja',
    'https://www.curriculumnacional.cl/pueblos-originarios-ancestrales',
    'https://www.curriculumnacional.cl/curriculum/7o-basico-2o-medio/lengua-indigena',
  ],
  DELAY_BETWEEN_REQUESTS: 200, // ms para rate limiting (reducido para evitar timeouts)
  MAX_RETRIES: 3,
  FETCH_TIMEOUT: 30000, // 30 segundos timeout para fetch
  USER_AGENT: 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0; +https://profeflow.cl)',
  // Límite de asignaturas a procesar (0 = todas)
  // MODO PRODUCCIÓN: 0
  MAX_ASIGNATURAS: 0,
  // Límite de categorías a procesar (0 = todas)
  // MODO PRODUCCIÓN: 0
  MAX_CATEGORIAS: 0,
  // Generar ambos formatos
  GENERAR_CSV: true,
  GENERAR_JSON: true,
}

const MAX_RUN_MS = 110000
 
// ============================================
// TIPOS E INTERFACES
// ============================================

type TipoObjetivo = 'contenido' | 'habilidad' | 'actitud'
 
interface ObjetivoAprendizaje {
  asignatura: string
  oa_codigo: string // "AR01 OA 01", "MA04 OAH a", "LE05 OAA A"
  eje: string // Eje o Núcleo curricular
  objetivo: string
  tipo_objetivo: TipoObjetivo // Tipo de OA basado en OA/OAH/OAA
  categoria: string // "Educación Básica 1° a 6°", "Educación Parvularia", etc.
  nivel: string // "1° Básico", "2° Básico", etc.
  curso: string // "1° Básico", "2° Básico", etc.
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
  tipo_objetivo: TipoObjetivo
  categoria: string
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
  return texto.replaceAll(/\s+/g, ' ').trim()
}

/**
 * Verifica si un error es un 404 (página no encontrada)
 * Usado para detectar errores esperados vs errores reales
 * 
 * @param error - El error a verificar
 * @returns true si el error es un 404, false en caso contrario
 * 
 * Nota: Este método verifica el mensaje del error porque el fetch de Deno
 * no siempre provee un objeto de error estructurado con código de estado.
 */
function es404(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('404') || error.message.includes('Not Found')
  }
  return false
}
 
/**
 * Valida que un código OA tenga formato correcto
 * Ejemplos válidos: "AR01 OA 01", "MA04 OAH a", "LE05 OAA A"
 */
function validarCodigoOA(codigo: string): boolean {
  return PATRON_VALIDACION_OA.test(codigo.trim())
}

/**
 * Determina el tipo de objetivo basándose en el código OA
 * - OA: Objetivo de Aprendizaje de Contenido
 * - OAH: Objetivo de Aprendizaje de Habilidades
 * - OAA: Objetivo de Aprendizaje de Actitudes
 */
function obtenerTipoObjetivo(codigo: string): TipoObjetivo {
  const codigoLimpio = codigo.trim().toUpperCase()

  if (codigoLimpio.includes(' OAH ')) {
    return 'habilidad'
  } else if (codigoLimpio.includes(' OAA ')) {
    return 'actitud'
  } else {
    return 'contenido'
  }
}

/**
 * Extrae la categoría curricular desde la URL
 * Ejemplos:
 * - /curriculum/1o-6o-basico -> "Educación Básica 1° a 6°"
 * - /curriculum/educacion-parvularia -> "Educación Parvularia"
 * - /curriculum/7o-basico-2-medio -> "Educación Media 7° a 2° Medio"
 * - /curriculum/3o-4o-medio -> "Formación Diferenciada Científico-Humanista 3° a 4° Medio"
 * - /recursos/terminales-formacion-diferenciada-artistica-3-4-medio-0 -> "Formación Diferenciada Artística 3° a 4° Medio"
 * - /pueblos-originarios-ancestrales -> "Lengua y Cultura de los Pueblos Originarios Ancestrales"
 * - /curriculum/bases-curriculares-educacion-personas-jovenes-adultas-epja -> "Educación de Personas Jóvenes y Adultas (EPJA)"
 */
function extraerCategoriaDesdeURL(url: string): string {
  const categoriaMap: Record<string, string> = {
    '1o-6o-basico': 'Educación Básica 1° a 6°',
    'educacion-parvularia': 'Educación Parvularia',
    '7o-basico-2-medio': 'Educación Media 7° a 2° Medio',
    '3o-4o-medio-tecnico-profesional': 'Formación Diferenciada Técnico Profesional 3° a 4° Medio',
    '3o-4o-medio': 'Formación Diferenciada Científico-Humanista 3° a 4° Medio',
    'terminales-formacion-diferenciada-artistica-3-4-medio-0': 'Formación Diferenciada Artística 3° a 4° Medio',
    'pueblos-originarios-ancestrales': 'Lengua y Cultura de los Pueblos Originarios Ancestrales',
    'bases-curriculares-educacion-personas-jovenes-adultas-epja': 'Educación de Personas Jóvenes y Adultas (EPJA)',
    'lengua-indigena': 'Marco Curricular de Lengua Indígena 7° a 2° Medio',
  }

  // Intentar varios patrones de extracción
  // 1. /curriculum/[slug]
  let match = url.match(/\/curriculum\/([^/]+)/)
  if (match) {
    const slug = match[1]
    return categoriaMap[slug] || 'Desconocida'
  }

  // 2. /recursos/[slug]
  match = url.match(/\/recursos\/([^/]+)/)
  if (match) {
    const slug = match[1]
    return categoriaMap[slug] || 'Desconocida'
  }

  // 3. /[slug] (para rutas directas)
  match = url.match(/\/([^/]+)\/?$/)
  if (match) {
    const slug = match[1]
    return categoriaMap[slug] || 'Desconocida'
  }

  return 'Desconocida' // Default
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
 * Crea un fetch con timeout usando AbortController
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': CONFIG.USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-CL,es;q=0.9',
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Verifica si un error debe reintentar o fallar inmediatamente
 */
function shouldRetry(error: unknown): boolean {
  if (error instanceof Error) {
    // No reintentar en AbortError (timeout) o 404
    if (error.name === 'AbortError') return false
    if (error.message.includes('404')) return false
  }
  return true
}

/**
 * Maneja el delay de backoff exponencial entre reintentos
 */
async function handleRetryDelay(attempt: number, url: string, error: unknown, retries: number): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
  
  if (attempt < retries - 1) {
    console.warn(`Intento ${attempt + 1}/${retries} falló para ${url}: ${errorMessage}. Reintentando...`)
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
  } else {
    console.error(`Todos los intentos fallaron para ${url}: ${errorMessage}`)
    throw new Error(`Falló después de ${retries} intentos: ${errorMessage}`)
  }
}

/**
 * Realiza fetch con retry, rate limiting y timeout
 * MEJORA: No reintenta en errores 404 (páginas que no existen)
 * MEJORA: Usa AbortController para manejar timeouts
 */
async function fetchWithRetry(url: string, retries = CONFIG.MAX_RETRIES): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, CONFIG.FETCH_TIMEOUT)

      if (!response.ok) {
        // No reintentar en 404 - el recurso no existe
        if (response.status === 404) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        // Para otros errores (500, 503, etc), reintentar
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS))

      return html
    } catch (error) {
      // Si es un error no recuperable (404, timeout), fallar inmediatamente
      if (!shouldRetry(error)) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        throw new Error(errorMessage)
      }

      // Manejar reintentos con backoff exponencial
      await handleRetryDelay(attempt, url, error, retries)
    }
  }

  throw new Error('fetchWithRetry: No se pudo completar la solicitud')
}
 
/**
 * Agrega un link a la lista evitando duplicados
 */
function agregarLinkSiEsValido(
  links: AsignaturaLink[],
  nombre: string,
  href: string
): void {
  if (!nombre || nombre.length === 0) return

  const url = href.startsWith('http') ? href : CONFIG.BASE_URL + href
  
  if (!validarURL(url)) {
    console.warn(`URL inválida ignorada: ${url}`)
    return
  }

  if (!links.some(l => l.url === url)) {
    links.push({ nombre, url })
  }
}

/**
 * ESTRUCTURA 1: Extrae asignaturas usando .subject-grades + .grades-wrapper
 * Usado en Educación Básica 1°-6°
 */
function extraerEstructuraTipo1(html: string, links: AsignaturaLink[]): void {
  const patronSubject = /<div[^>]*class=[^>]*subject-grades[^>]*>([\s\S]*?)<\/div>/gi
  let matchSubject

  while ((matchSubject = patronSubject.exec(html)) !== null) {
    const bloque = matchSubject[1]
    const tituloMatch = bloque.match(/<span[^>]*class=[^>]*subject-title[^>]*>([^<]*)<\/span>/i)
    const nombreAsignatura = limpiarTexto(tituloMatch ? tituloMatch[1] : '')
    if (!nombreAsignatura) continue

    const gradesMatch = bloque.match(/<div[^>]*class=[^>]*grades-wrapper[^>]*>([\s\S]*?)<\/div>/i)
    const gradesWrapper = gradesMatch ? gradesMatch[1] : ''

    const patronCurso = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi
    let matchCurso

    while ((matchCurso = patronCurso.exec(gradesWrapper)) !== null) {
      const href = matchCurso[1]
      const curso = limpiarTexto(matchCurso[2])
      const nombreCompleto = `${nombreAsignatura} ${curso}`
      agregarLinkSiEsValido(links, nombreCompleto, href)
    }
  }
}

/**
 * Verifica si un enlace corresponde a una asignatura con curso
 */
function esEnlaceAsignaturaConCurso(href: string, texto: string): boolean {
  const tieneNivelEnURL = /\/(1-basico|2-basico|3-basico|4-basico|5-basico|6-basico|7-basico|8-basico|1-medio|2-medio|3-medio|4-medio|sc|nm|nt)/i.test(href)
  const tieneNivelEnTexto = /(1°|2°|3°|4°|5°|6°|7°|8°|nivel\s*\d|sala\s*cuna|medio|transición)/i.test(texto)
  
  return tieneNivelEnURL || tieneNivelEnTexto
}

/**
 * ESTRUCTURA 2: Extrae enlaces directos de curriculum con curso
 * Ejemplo: /curriculum/7o-basico-2-medio/matematica/7-basico
 */
function extraerEstructuraTipo2(html: string, links: AsignaturaLink[]): void {
  console.log('⚠️  No se encontró estructura .subject-grades, usando fallback de enlaces directos')

  const patronEnlaceAsignatura = /<a[^>]*href=["']([^"']*\/curriculum\/[^"']+)["'][^>]*>([^<]+)<\/a>/gi

  let match
  while ((match = patronEnlaceAsignatura.exec(html)) !== null) {
    const href = match[1]
    const texto = limpiarTexto(match[2])

    const longitudValida = texto.length > 3 && texto.length < 100
    if (esEnlaceAsignaturaConCurso(href, texto) && longitudValida) {
      agregarLinkSiEsValido(links, texto, href)
    }
  }
}

/**
 * Verifica si un enlace es de navegación general (no es asignatura)
 */
function esEnlaceNavegacion(texto: string): boolean {
  return /(documentos|recursos|evaluación|inicio|mineduc|ayuda)/i.test(texto)
}

/**
 * ESTRUCTURA 3: Fallback genérico - busca cualquier enlace de curriculum
 */
function extraerEstructuraTipo3(html: string, links: AsignaturaLink[]): void {
  console.log('⚠️  No se encontraron enlaces con patrón conocido, usando fallback genérico')

  const patronTodosLosEnlaces = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi

  let match
  while ((match = patronTodosLosEnlaces.exec(html)) !== null) {
    const href = match[1]
    const texto = limpiarTexto(match[2])

    const esCurriculum = href.includes('/curriculum/')
    const longitudValida = texto.length > 5 && texto.length < 100

    if (esCurriculum && longitudValida && !esEnlaceNavegacion(texto)) {
      agregarLinkSiEsValido(links, texto, href)
    }
  }
}

/**
 * Extrae links de asignaturas por curso de la página principal
 * Soporta múltiples estructuras HTML:
 * - ESTRUCTURA 1: .subject-title + .grades-wrapper (1°-6° Básico)
 * - ESTRUCTURA 2: Enlaces directos de asignatura+curso (otras categorías)
 * - ESTRUCTURA 3: Fallback genérico buscando patrones de URL
 */
function extraerAsignaturasYCursos(html: string): AsignaturaLink[] {
  const links: AsignaturaLink[] = []

  // Intentar estructura 1
  extraerEstructuraTipo1(html, links)

  // Si no se encontró nada, intentar estructura 2
  if (links.length === 0) {
    extraerEstructuraTipo2(html, links)
  }

  // Si aún no se encontró nada, usar fallback genérico
  if (links.length === 0) {
    extraerEstructuraTipo3(html, links)
  }

  console.log(`📋 Extraídos ${links.length} enlaces de asignaturas/cursos`)
  return links
}
 
/**
 * Extrae objetivos de aprendizaje de una página de asignatura
 * Soporta dos estructuras HTML diferentes usando balanceo de divs (más robusto que regex):
 * TIPO A: .oa-cnt, .oa-numero, .oa-eje, .oa-descripcion, .oa-basal
 * TIPO B: .items-wrapper, .item-wrapper, .oa-title, .field__item, .prioritized
 */
function extraerTexto(html: string, regex: RegExp): string {
  const match = html.match(regex)
  return match ? limpiarTexto(match[1]) : ''
}

function encontrarCierreDiv(html: string, startIndex: number): number {
  let nivel = 0
  let i = startIndex

  while (i < html.length) {
    if (html.startsWith('<div', i)) {
      nivel++
      i += 4
      continue
    }

    if (html.startsWith('</div>', i)) {
      nivel--
      i += 6
      if (nivel === 0) return i
      continue
    }

    i++
  }

  return -1
}

function obtenerBloquesDiv(html: string, className: string): string[] {
  const bloques: string[] = []
  const patron = new RegExp(`<div[^>]*class=[^>]*${className}[^>]*>`, 'gi')
  let match

  while ((match = patron.exec(html)) !== null) {
    const cierre = encontrarCierreDiv(html, match.index)
    if (cierre > match.index) {
      bloques.push(html.slice(match.index, cierre))
    }
  }

  return bloques
}

function obtenerNivelCurso(html: string, curso: string, nivel: string): { cursoExtraido: string; nivelExtraido: string } {
  const nivelMatch = html.match(/<[^>]*class=[^>]*nivel-titulo[^>]*>[\s\S]*?<span[^>]*>([^<]*)<\/span>/i)
  const cursoExtraido = nivelMatch ? limpiarTexto(nivelMatch[1]) : curso
  return { cursoExtraido, nivelExtraido: nivel || cursoExtraido }
}

function extraerEjeTipoB(bloqueEje: string): string {
  const ejeConLink = extraerTexto(bloqueEje, /<h3[^>]*>[\s\S]*?<a[^>]*>([^<]*)<\/a>[\s\S]*?<\/h3>/i)
  if (ejeConLink) return ejeConLink
  return extraerTexto(bloqueEje, /<h3[^>]*>([^<]*)<\/h3>/i)
}

function construirObjetivoTipoB(
  itemHtml: string,
  ejeNombre: string,
  asignatura: string,
  categoria: string,
  cursoExtraido: string,
  nivelExtraido: string
): ObjetivoAprendizaje | null {
  const codigoTexto = extraerTexto(itemHtml, /<span[^>]*class=[^>]*oa-title[^>]*>([^<]*)<\/span>/i)
  const codigoExtraido = codigoTexto.match(PATRON_EXTRACCION_OA)
  const codigo = codigoExtraido ? codigoExtraido[1] : ''
  if (!codigo || !validarCodigoOA(codigo)) {
    if (codigo) console.warn(`Código OA inválido ignorado: ${codigo}`)
    return null
  }

  const objetivo = extraerTexto(itemHtml, /<div[^>]*class=[^>]*field__item[^>]*>[\s\S]*?<p[^>]*>([^<]*)<\/p>/i)
  const esPriorizado = itemHtml.includes('prioritized')
  const detalleUrlMatch = itemHtml.match(/<a[^>]*class=[^>]*link-more[^>]*href=["']([^"']*)["']/i)
  let detalleUrl = ''
  if (detalleUrlMatch) {
    const href = detalleUrlMatch[1]
    detalleUrl = href.startsWith('http') ? href : CONFIG.BASE_URL + href
  }

  return {
    asignatura,
    oa_codigo: codigo,
    eje: ejeNombre,
    objetivo,
    tipo_objetivo: obtenerTipoObjetivo(codigo),
    categoria,
    nivel: nivelExtraido,
    curso: cursoExtraido,
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
  } as any
}

function extraerObjetivosTipoB(
  html: string,
  asignatura: string,
  categoria: string,
  cursoExtraido: string,
  nivelExtraido: string
): ObjetivoAprendizaje[] {
  const objetivos: ObjetivoAprendizaje[] = []
  const bloquesEje = obtenerBloquesDiv(html, 'items-wrapper')

  for (const bloqueEje of bloquesEje) {
    const ejeNombre = extraerEjeTipoB(bloqueEje)
    const items = obtenerBloquesDiv(bloqueEje, 'item-wrapper')

    for (const itemHtml of items) {
      const objetivo = construirObjetivoTipoB(itemHtml, ejeNombre, asignatura, categoria, cursoExtraido, nivelExtraido)
      if (objetivo) objetivos.push(objetivo)
    }
  }

  return objetivos
}

function construirObjetivoTipoA(
  bloqueOA: string,
  asignatura: string,
  categoria: string,
  cursoExtraido: string,
  nivelExtraido: string
): ObjetivoAprendizaje | null {
  const eje = extraerTexto(bloqueOA, /<div[^>]*class=[^>]*oa-eje[^>]*>([^<]*)<\/div>/i)
  const codigo = extraerTexto(bloqueOA, /<div[^>]*class=[^>]*oa-numero[^>]*>([^<]*)<\/div>/i)
  if (!codigo || !validarCodigoOA(codigo)) {
    if (codigo) console.warn(`Código OA inválido ignorado: ${codigo}`)
    return null
  }

  const objetivo = extraerTexto(bloqueOA, /<div[^>]*class=[^>]*oa-descripcion[^>]*>([^<]*)<\/div>/i)
  const esBasal = bloqueOA.includes('oa-basal')

  return {
    asignatura,
    oa_codigo: codigo,
    eje,
    objetivo,
    tipo_objetivo: obtenerTipoObjetivo(codigo),
    categoria,
    nivel: nivelExtraido,
    curso: cursoExtraido,
    actividad_1: '',
    url_actividad_1: '',
    actividad_2: '',
    url_actividad_2: '',
    actividad_3: '',
    url_actividad_3: '',
    actividad_4: '',
    url_actividad_4: '',
    priorizado: esBasal ? 1 : 0,
  }
}

function extraerObjetivosTipoA(
  html: string,
  asignatura: string,
  categoria: string,
  cursoExtraido: string,
  nivelExtraido: string
): ObjetivoAprendizaje[] {
  const objetivos: ObjetivoAprendizaje[] = []
  const bloquesOA = obtenerBloquesDiv(html, 'oa-cnt')

  for (const bloque of bloquesOA) {
    const objetivo = construirObjetivoTipoA(bloque, asignatura, categoria, cursoExtraido, nivelExtraido)
    if (objetivo) objetivos.push(objetivo)
  }

  return objetivos
}

function extraerObjetivos(html: string, asignatura: string, curso: string, categoria: string, nivel: string = ''): ObjetivoAprendizaje[] {
  const { cursoExtraido, nivelExtraido } = obtenerNivelCurso(html, curso, nivel)

  const objetivosTipoB = extraerObjetivosTipoB(html, asignatura, categoria, cursoExtraido, nivelExtraido)
  if (objetivosTipoB.length > 0) return objetivosTipoB

  return extraerObjetivosTipoA(html, asignatura, categoria, cursoExtraido, nivelExtraido)
}
 
type PatronActividad = {
  regex: RegExp
  descripcion: string
}

function extraerConPatron(
  html: string,
  regex: RegExp,
  actividades: { nombre: string; url: string }[]
): void {
  let match
  while ((match = regex.exec(html)) !== null && actividades.length < 4) {
    const href = match[1]
    const nombre = limpiarTexto(match[2])

    if (!nombre || nombre.length < 3) continue

    const urlCompleta = href.startsWith('http') ? href : CONFIG.BASE_URL + href

    if (validarURL(urlCompleta)) {
      actividades.push({ nombre, url: urlCompleta })
    }
  }
}

function obtenerPatronesActividades(): PatronActividad[] {
  return [
    {
      descripcion: 'field--name-field-recursos-relacionados (tipo B)',
      regex: /field--name-field-recursos-relacionados[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi,
    },
    {
      descripcion: 'oa-recurso (tipo A)',
      regex: /<[^>]*class=[^>]*oa-recurso[^>]*>[\s\S]*?<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi,
    },
    {
      descripcion: 'recursos-wrapper (genérico)',
      regex: /<[^>]*class=[^>]*recursos-wrapper[^>]*>[\s\S]*?<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi,
    },
    {
      descripcion: 'URL que contiene /recursos/ (fallback)',
      regex: /<a[^>]*href=["']([^"']*\/recursos\/[^"']*)["'][^>]*>([^<]*)<\/a>/gi,
    },
  ]
}

/**
 * Extrae actividades complementarias de la página de actividades
 * Soporta múltiples selectores con fallbacks robustos
 */
async function extraerActividades(url: string): Promise<{ nombre: string; url: string }[]> {
  if (!url) return []

  try {
    const html = await fetchWithRetry(url)
    const actividades: { nombre: string; url: string }[] = []

    for (const patron of obtenerPatronesActividades()) {
      extraerConPatron(html, patron.regex, actividades)
      if (actividades.length > 0) break
    }

    return actividades
  } catch (error) {
    if (!es404(error)) {
      console.error(`Error extrayendo actividades de ${url}:`, error)
    }
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
    'Categoria',
    'Asignatura',
    'Nivel',
    'Curso',
    'OA',
    'Eje',
    'Objetivo de Aprendizaje',
    'Tipo',
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
      escaparCSV(obj.categoria),
      escaparCSV(obj.asignatura),
      escaparCSV(obj.nivel),
      escaparCSV(obj.curso),
      escaparCSV(obj.oa_codigo),
      escaparCSV(obj.eje),
      escaparCSV(obj.objetivo),
      escaparCSV(obj.tipo_objetivo),
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

    return {
      asignatura: obj.asignatura,
      codigo: obj.oa_codigo,
      eje: obj.eje,
      objetivo: obj.objetivo,
      tipo_objetivo: obj.tipo_objetivo,
      categoria: obj.categoria,
      actividades,
      priorizado: obj.priorizado === 1,
      metadata: {
        nivel: obj.nivel,
        curso: obj.curso,
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
 * Genera nombre de archivo con categoría y timestamp completo
 * Formato: bases_curriculares_[categoria]_aaaa-mm-dd-hhmmss.{formato}
 *
 * Ejemplo:
 * generarNombreArchivo('csv', 'Educación Básica 1° a 6°')
 * → bases_curriculares_Educacion_Basica_1_a_6_2026-01-16-153045.csv
 */
function generarNombreArchivo(
  formato: 'csv' | 'json',
  categoria: string,
  fecha: Date = new Date()
): string {
  // Formatear timestamp completo: 2026-01-16-153045
  const year = fecha.getFullYear()
  const month = String(fecha.getMonth() + 1).padStart(2, '0')
  const day = String(fecha.getDate()).padStart(2, '0')
  const hours = String(fecha.getHours()).padStart(2, '0')
  const minutes = String(fecha.getMinutes()).padStart(2, '0')
  const seconds = String(fecha.getSeconds()).padStart(2, '0')

  const timestamp = `${year}-${month}-${day}-${hours}${minutes}${seconds}`

  // Normalizar categoría para nombre de archivo
  // "Educación Básica 1° a 6°" → "Educacion_Basica_1_a_6"
  const categoriaNormalizada = categoria
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replaceAll('°', '') // Eliminar símbolos de grado
    .replaceAll(/\s+/g, '_') // Espacios a guiones bajos
    .replaceAll(/[()]/g, '') // Eliminar paréntesis
    .replaceAll(/[^\w-]/g, '') // Eliminar caracteres especiales

  return `bases_curriculares_${categoriaNormalizada}_${timestamp}.${formato}`
}
 
/**
 * Escapa caracteres especiales para CSV
 */
function escaparCSV(valor: string): string {
  if (!valor) return ''

  // Si contiene punto y coma, comillas o saltos de línea, envolver en comillas
  if (valor.includes(';') || valor.includes('"') || valor.includes('\n')) {
    // Duplicar comillas internas
    return '"' + valor.replaceAll('"', '""') + '"'
  }

  return valor
}

/**
 * Calcula hash SHA-256 de un objetivo para detectar cambios
 * Hash incluye: código, objetivo, eje, priorizado, actividades
 */
async function calcularHashObjetivo(obj: any): Promise<string> {
  const contenido = JSON.stringify({
    codigo: obj.codigo,
    objetivo: obj.objetivo,
    eje: obj.eje || '',
    priorizado: obj.priorizado || false,
    actividades: obj.actividades || [],
  })

  const encoder = new TextEncoder()
  const data = encoder.encode(contenido)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verifica si un objetivo ha cambiado comparando con el hash almacenado
 * Retorna: { cambio: boolean, registroExiste: boolean }
 */
async function verificarCambios(
  supabase: any,
  codigo: string,
  categoria: string,
  nivel: string,
  version: string,
  nuevoHash: string
): Promise<{ cambio: boolean; registroExiste: boolean }> {
  const { data, error } = await supabase
    .from('objetivos_aprendizaje')
    .select('hash_contenido')
    .eq('codigo', codigo)
    .eq('categoria', categoria)
    .eq('nivel', nivel)
    .eq('version', version)
    .maybeSingle()

  if (error || !data) {
    // Registro no existe o error → considerar como nuevo (hay cambio)
    return { cambio: true, registroExiste: false }
  }

  // Comparar hash: si es diferente, hay cambio
  return {
    cambio: data.hash_contenido !== nuevoHash,
    registroExiste: true
  }
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
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(rutaArchivo, contenido, {
      contentType,
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Error subiendo archivo: ${uploadError.message}`)
  }
 
  // Obtener URL firmada (válida por 1 año)
  const { data: urlData } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(rutaArchivo, 31536000) // 1 año
 
  return urlData?.signedUrl || rutaArchivo
}

type ConfiguracionRequest = {
  force: boolean
  persist_db: boolean
  generate_files: boolean
  batch_categorias: number
  continue_run_id?: string
}

type ResultadoExtraccion = {
  todosLosObjetivos: ObjetivoAprendizaje[]
  asignaturasProcesadas: number
  categoriasProcesadas: number
}

type ResultadoPersistencia = {
  objetivosNuevos: number
  objetivosActualizados: number
  objetivosSinCambios: number
  objetivosError: number
}

type EstadoPersistencia = 'nuevo' | 'actualizado' | 'sinCambios' | 'error'

type EstadoEjecucion = 'pending' | 'running' | 'partial' | 'completed' | 'failed'

type ExtraccionRun = {
  id: string
  estado: EstadoEjecucion
  categorias_pendientes: string[]
  categorias_procesadas: string[]
  asignaturas_procesadas: number
  objetivos_extraidos: number
  proceso_etl_id?: string
  ultimo_checkpoint?: any
  detalle?: any
}

type FinalizacionContexto = {
  totalObjetivos: number
  archivosGenerados: any[]
  startTime: number
  extraccion: ResultadoExtraccion
  persistencia: ResultadoPersistencia
  persist_db: boolean
  generate_files: boolean
}

function construirActividades(obj: ObjetivoAprendizaje): { titulo: string; url: string }[] {
  const actividades: { titulo: string; url: string }[] = []
  if (obj.actividad_1) actividades.push({ titulo: obj.actividad_1, url: obj.url_actividad_1 })
  if (obj.actividad_2) actividades.push({ titulo: obj.actividad_2, url: obj.url_actividad_2 })
  if (obj.actividad_3) actividades.push({ titulo: obj.actividad_3, url: obj.url_actividad_3 })
  if (obj.actividad_4) actividades.push({ titulo: obj.actividad_4, url: obj.url_actividad_4 })
  return actividades
}

function construirRegistroPersistencia(
  obj: ObjetivoAprendizaje,
  procesoId: string,
  urlFuente: string,
  version: string,
  actividades: { titulo: string; url: string }[]
) {
  return {
    codigo: obj.oa_codigo,
    tipo_objetivo: obj.tipo_objetivo,
    categoria: obj.categoria,
    asignatura: obj.asignatura,
    eje: obj.eje || null,
    nivel: obj.nivel,
    curso: obj.curso,
    objetivo: obj.objetivo,
    priorizado: obj.priorizado === 1,
    actividades,
    url_fuente: urlFuente || null,
    version,
    proceso_etl_id: procesoId,
  }
}

async function persistirObjetivo(
  supabase: any,
  procesoId: string,
  obj: ObjetivoAprendizaje,
  fechaActual: string
): Promise<EstadoPersistencia> {
  try {
    const objAny = obj as any
    const urlFuente = objAny._detalleUrl || ''
    const version = new Date().getFullYear().toString()
    const actividades = construirActividades(obj)
    const registro = construirRegistroPersistencia(obj, procesoId, urlFuente, version, actividades)

    const hashContenido = await calcularHashObjetivo(registro)
    const { cambio, registroExiste } = await verificarCambios(
      supabase,
      registro.codigo,
      registro.categoria,
      registro.nivel,
      registro.version,
      hashContenido
    )

    if (cambio) {
      const registroConHash = {
        ...registro,
        hash_contenido: hashContenido,
        ultima_verificacion: fechaActual,
        ultima_actualizacion: fechaActual,
      }

      const { error } = await supabase
        .from('objetivos_aprendizaje')
        .upsert(registroConHash, {
          onConflict: 'codigo,categoria,nivel,version',
          ignoreDuplicates: false,
        })

      if (error) {
        console.warn(`  ⚠️  Error insertando ${obj.oa_codigo}: ${error.message}`)
        return 'error'
      }

      return registroExiste ? 'actualizado' : 'nuevo'
    }

    const { error } = await supabase
      .from('objetivos_aprendizaje')
      .update({ ultima_verificacion: fechaActual })
      .eq('codigo', registro.codigo)
      .eq('categoria', registro.categoria)
      .eq('nivel', registro.nivel)
      .eq('version', registro.version)

    if (error) {
      console.warn(`  ⚠️  Error actualizando verificación ${obj.oa_codigo}: ${error.message}`)
      return 'error'
    }

    return 'sinCambios'
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.warn(`  ⚠️  Error procesando ${obj.oa_codigo}: ${errorMessage}`)
    return 'error'
  }
}

async function obtenerConfiguracion(req: Request): Promise<ConfiguracionRequest> {
  const requestBody = await req.json().catch(() => ({}))
  const {
    force = false,
    persist_db = true,
    generate_files = true,
    batch_categorias = 1,
    continue_run_id,
  } = requestBody

  const batchCategoriasSeguro = Number.isFinite(batch_categorias) && batch_categorias > 0 ? Number(batch_categorias) : 1

  console.log('📊 Configuración:')
  console.log(`  - Categorías disponibles: ${CONFIG.CATEGORY_URLS.length}`)
  console.log(`  - Modo asignaturas: ${CONFIG.MAX_ASIGNATURAS > 0 ? 'TEST (' + CONFIG.MAX_ASIGNATURAS + ' por categoría)' : 'PRODUCCIÓN (todas)'}`)
  console.log(`  - Modo categorías: ${CONFIG.MAX_CATEGORIAS > 0 ? 'TEST (' + CONFIG.MAX_CATEGORIAS + ' categorías)' : 'PRODUCCIÓN (todas las categorías)'}`)
  console.log(`  - Persistir a BD: ${persist_db ? 'SÍ' : 'NO'}`)
  console.log(`  - Generar archivos: ${generate_files ? 'SÍ' : 'NO'}`)
  console.log(`  - Batch de categorías: ${batchCategoriasSeguro}`)
  console.log(`  - Run a continuar: ${continue_run_id || 'nuevo'}`)

  return { force, persist_db, generate_files, batch_categorias: batchCategoriasSeguro, continue_run_id }
}

async function iniciarProcesoEtl(supabase: any, force: boolean): Promise<string> {
  const { data: proceso, error: procesoError } = await supabase
    .rpc('iniciar_proceso_etl', {
      p_nombre: 'extraer_bases_curriculares',
      p_tipo_proceso: 'extraccion',
      p_descripcion: 'Extracción de Bases Curriculares de todas las categorías desde curriculumnacional.cl',
      p_configuracion: JSON.stringify({
        force,
        modo_asignaturas: CONFIG.MAX_ASIGNATURAS > 0 ? 'test' : 'produccion',
        modo_categorias: CONFIG.MAX_CATEGORIAS > 0 ? 'test' : 'produccion',
        total_categorias: CONFIG.CATEGORY_URLS.length,
      }),
    })

  if (procesoError) {
    throw new Error(`Error creando proceso ETL: ${procesoError.message}`)
  }

  console.log(`📝 Proceso ETL creado: ${proceso}`)
  return proceso
}

function obtenerCategoriasAProcesar(): string[] {
  return CONFIG.MAX_CATEGORIAS > 0
    ? CONFIG.CATEGORY_URLS.slice(0, CONFIG.MAX_CATEGORIAS)
    : CONFIG.CATEGORY_URLS
}

async function crearRunExtraccion(
  supabase: any,
  force: boolean,
  categorias: string[]
): Promise<ExtraccionRun> {
  const procesoId = await iniciarProcesoEtl(supabase, force)
  const { data, error } = await supabase
    .from('etl_extracciones_bc')
    .insert({
      estado: 'running',
      categorias_pendientes: categorias,
      categorias_procesadas: [],
      proceso_etl_id: procesoId,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`No se pudo crear el run de extracción: ${error?.message || 'desconocido'}`)
  }

  return data as ExtraccionRun
}

async function obtenerRunExtraccion(supabase: any, runId: string): Promise<ExtraccionRun> {
  const { data, error } = await supabase
    .from('etl_extracciones_bc')
    .select()
    .eq('id', runId)
    .single()

  if (error || !data) {
    throw new Error(`No se encontró el run solicitado (${runId})`)
  }

  return data as ExtraccionRun
}

async function actualizarRunExtraccion(
  supabase: any,
  runId: string,
  payload: Partial<ExtraccionRun>
): Promise<void> {
  const { error } = await supabase
    .from('etl_extracciones_bc')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', runId)

  if (error) {
    console.warn(`⚠️  No se pudo actualizar el run ${runId}: ${error.message}`)
  }
}

function quitarProcesadas(pendientes: string[], procesadas: string[]): string[] {
  const setProcesadas = new Set(procesadas)
  return pendientes.filter(cat => !setProcesadas.has(cat))
}

function tiempoAgotado(startTime: number, maxMs: number): boolean {
  return Date.now() - startTime > maxMs
}

async function procesarCategoriasConTiempo(
  supabase: any,
  procesoId: string,
  categorias: string[],
  startTime: number,
  maxMs: number
): Promise<{ extraccion: ResultadoExtraccion; categoriasProcesadas: string[]; agotado: boolean }> {
  const todosLosObjetivos: ObjetivoAprendizaje[] = []
  let asignaturasProcesadas = 0
  let categoriasProcesadas = 0
  const categoriasHechas: string[] = []

  for (const categoryUrl of categorias) {
    if (tiempoAgotado(startTime, maxMs)) {
      return {
        extraccion: { todosLosObjetivos, asignaturasProcesadas, categoriasProcesadas },
        categoriasProcesadas: categoriasHechas,
        agotado: true,
      }
    }

    const resultadoCategoria = await procesarCategoria(supabase, procesoId, categoryUrl)
    todosLosObjetivos.push(...resultadoCategoria.objetivos)
    asignaturasProcesadas += resultadoCategoria.asignaturasProcesadas
    categoriasProcesadas += 1
    categoriasHechas.push(categoryUrl)
  }

  return {
    extraccion: { todosLosObjetivos, asignaturasProcesadas, categoriasProcesadas },
    categoriasProcesadas: categoriasHechas,
    agotado: false,
  }
}

async function procesarCategorias(
  supabase: any,
  procesoId: string,
  categorias: string[]
): Promise<ResultadoExtraccion> {
  const todosLosObjetivos: ObjetivoAprendizaje[] = []
  let asignaturasProcesadas = 0
  let categoriasProcesadas = 0

  for (const categoryUrl of categorias) {
    const resultadoCategoria = await procesarCategoria(supabase, procesoId, categoryUrl)
    todosLosObjetivos.push(...resultadoCategoria.objetivos)
    asignaturasProcesadas += resultadoCategoria.asignaturasProcesadas
    categoriasProcesadas += 1
  }

  return { todosLosObjetivos, asignaturasProcesadas, categoriasProcesadas }
}

async function procesarCategoria(
  supabase: any,
  procesoId: string,
  categoryUrl: string
): Promise<{ objetivos: ObjetivoAprendizaje[]; asignaturasProcesadas: number }> {
  const objetivos: ObjetivoAprendizaje[] = []
  let asignaturasProcesadas = 0

  try {
    const categoriaMatch = categoryUrl.match(/\/curriculum\/([^/]+)/)
    const categoriaNombre = categoriaMatch ? extraerCategoriaDesdeURL(categoryUrl) : 'Desconocida'

    console.log(`\n${'='.repeat(60)}`)
    console.log(`📂 CATEGORÍA: ${categoriaNombre}`)
    console.log(`${'='.repeat(60)}`)

    await supabase.rpc('agregar_log_proceso_etl', {
      p_proceso_id: procesoId,
      p_mensaje: `Procesando categoría: ${categoriaNombre}`,
    })

    console.log('📡 Obteniendo página de categoría...')
    const htmlCategoria = await fetchWithRetry(categoryUrl)

    console.log('🔍 Extrayendo asignaturas y cursos...')
    const asignaturas = extraerAsignaturasYCursos(htmlCategoria)
    console.log(`✓ Encontradas ${asignaturas.length} asignaturas en esta categoría`)

    await supabase.rpc('agregar_log_proceso_etl', {
      p_proceso_id: procesoId,
      p_mensaje: `Encontradas ${asignaturas.length} asignaturas en ${categoriaNombre}`,
    })

    const asignaturasAProcesar = CONFIG.MAX_ASIGNATURAS > 0
      ? asignaturas.slice(0, CONFIG.MAX_ASIGNATURAS)
      : asignaturas

    console.log(`📝 Procesando ${asignaturasAProcesar.length} de ${asignaturas.length} asignaturas`)

    for (const asig of asignaturasAProcesar) {
      const objetivosAsignatura = await procesarAsignatura(supabase, procesoId, asig)
      objetivos.push(...objetivosAsignatura)
      asignaturasProcesadas++
    }

    console.log(`\n✅ Categoría completada: ${categoriaNombre}`)
    console.log(`   📊 Total objetivos extraídos hasta ahora: ${objetivos.length}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error(`\n❌ Error procesando categoría ${categoryUrl}: ${errorMessage}`)
    await supabase.rpc('agregar_log_proceso_etl', {
      p_proceso_id: procesoId,
      p_mensaje: `Error en categoría: ${errorMessage}`,
    })
  }

  return { objetivos, asignaturasProcesadas }
}

async function procesarAsignatura(
  supabase: any,
  procesoId: string,
  asig: AsignaturaLink
): Promise<ObjetivoAprendizaje[]> {
  const objetivos: ObjetivoAprendizaje[] = []

  try {
    console.log(`\n📚 Procesando: ${asig.nombre}`)
    await supabase.rpc('agregar_log_proceso_etl', {
      p_proceso_id: procesoId,
      p_mensaje: `Procesando ${asig.nombre}`,
    })

    const htmlAsignatura = await fetchWithRetry(asig.url)

    const partes = asig.nombre.split(/\s+/)
    const curso = partes[partes.length - 2] + ' ' + partes[partes.length - 1]
    const nombreAsignatura = partes.slice(0, -2).join(' ')
    const categoria = extraerCategoriaDesdeURL(asig.url)

    const objetivosExtraidos = extraerObjetivos(htmlAsignatura, nombreAsignatura, curso, categoria)
    if (objetivosExtraidos.length === 0) {
      console.warn('  ⚠️  NO se extrajeron objetivos - puede indicar cambio en estructura HTML')
    } else {
      console.log(`  ✓ Extraídos ${objetivosExtraidos.length} objetivos`)
    }

    const procesados = await extraerActividadesParaObjetivos(objetivosExtraidos, asig.url)
    objetivos.push(...procesados)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error(`  ❌ Error procesando ${asig.nombre}: ${errorMessage}`)
    await supabase.rpc('agregar_log_proceso_etl', {
      p_proceso_id: procesoId,
      p_mensaje: `Error en ${asig.nombre}: ${errorMessage}`,
    })
  }

  return objetivos
}

type ContadoresActividades = {
  conActividades: number
  sinActividades: number
  habilidadesActitudes: number
}

function construirUrlActividades(obj: ObjetivoAprendizaje, urlAsignatura: string): string {
  const objAny = obj as any
  const slug = obj.oa_codigo.toLowerCase().replaceAll(/\s+/g, '-')
  return objAny._detalleUrl || `${urlAsignatura}/${slug}`
}

function asignarActividades(
  obj: ObjetivoAprendizaje,
  actividades: { nombre: string; url: string }[]
): void {
  const [a1, a2, a3, a4] = actividades

  obj.actividad_1 = a1?.nombre || ''
  obj.url_actividad_1 = a1?.url || ''
  obj.actividad_2 = a2?.nombre || ''
  obj.url_actividad_2 = a2?.url || ''
  obj.actividad_3 = a3?.nombre || ''
  obj.url_actividad_3 = a3?.url || ''
  obj.actividad_4 = a4?.nombre || ''
  obj.url_actividad_4 = a4?.url || ''
}

function actualizarContadoresActividades(
  contadores: ContadoresActividades,
  actividades: { nombre: string; url: string }[]
): void {
  if (actividades.length > 0) {
    contadores.conActividades++
    return
  }

  contadores.sinActividades++
}

function logResumenActividades(contadores: ContadoresActividades): void {
  if (contadores.habilidadesActitudes > 0) {
    console.log(`  ℹ️  ${contadores.habilidadesActitudes} objetivos de habilidades/actitudes (OAH/OAA) - no requieren actividades`)
  }
  if (contadores.conActividades > 0) {
    console.log(`  ✓ Actividades extraídas para ${contadores.conActividades} objetivos de contenido`)
  }
  if (contadores.sinActividades > 0) {
    console.log(`  ⚠️  ${contadores.sinActividades} objetivos de contenido sin actividades disponibles`)
  }
}

async function extraerActividadesParaObjetivos(
  objetivos: ObjetivoAprendizaje[],
  urlAsignatura: string
): Promise<ObjetivoAprendizaje[]> {
  const contadores = {
    conActividades: 0,
    sinActividades: 0,
    habilidadesActitudes: 0,
  }

  for (const obj of objetivos) {
    if (obj.tipo_objetivo !== 'contenido') {
      contadores.habilidadesActitudes++
      continue
    }

    const urlActividades = construirUrlActividades(obj, urlAsignatura)

    try {
      const actividades = await extraerActividades(urlActividades)
      asignarActividades(obj, actividades)
      actualizarContadoresActividades(contadores, actividades)
    } catch (error) {
      if (!es404(error)) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        console.warn(`  ⚠️  Error extrayendo actividades para ${obj.oa_codigo}: ${errorMessage}`)
      }
      contadores.sinActividades++
    }
  }

  logResumenActividades(contadores)
  return objetivos
}

async function persistirObjetivosEnBD(
  supabase: any,
  procesoId: string,
  todosLosObjetivos: ObjetivoAprendizaje[],
  persist_db: boolean
): Promise<ResultadoPersistencia> {
  const resultadoBase: ResultadoPersistencia = {
    objetivosNuevos: 0,
    objetivosActualizados: 0,
    objetivosSinCambios: 0,
    objetivosError: 0,
  }

  if (!persist_db) {
    console.log('⏭️  Omitiendo persistencia a base de datos (persist_db=false)')
    await supabase.rpc('agregar_log_proceso_etl', {
      p_proceso_id: procesoId,
      p_mensaje: 'Persistencia a BD omitida (persist_db=false)',
    })
    return resultadoBase
  }

  console.log('💾 Persistiendo objetivos en la base de datos...')
  await supabase.rpc('agregar_log_proceso_etl', {
    p_proceso_id: procesoId,
    p_mensaje: `Persistiendo ${todosLosObjetivos.length} objetivos en la base de datos con tracking de cambios`,
  })

  const fechaActual = new Date().toISOString()
  const resultado = { ...resultadoBase }

  for (const obj of todosLosObjetivos) {
    const estado = await persistirObjetivo(supabase, procesoId, obj, fechaActual)
    if (estado === 'nuevo') resultado.objetivosNuevos++
    else if (estado === 'actualizado') resultado.objetivosActualizados++
    else if (estado === 'sinCambios') resultado.objetivosSinCambios++
    else resultado.objetivosError++
  }

  console.log(`✓ Resultados: ${resultado.objetivosNuevos} nuevos, ${resultado.objetivosActualizados} actualizados, ${resultado.objetivosSinCambios} sin cambios, ${resultado.objetivosError} errores`)
  await supabase.rpc('agregar_log_proceso_etl', {
    p_proceso_id: procesoId,
    p_mensaje: `Resultados: ${resultado.objetivosNuevos} nuevos, ${resultado.objetivosActualizados} actualizados, ${resultado.objetivosSinCambios} sin cambios, ${resultado.objetivosError} errores`,
  })

  return resultado
}

async function generarYSubirArchivos(
  supabase: any,
  procesoId: string,
  todosLosObjetivos: ObjetivoAprendizaje[],
  categoriaPrincipal: string,
  generate_files: boolean,
  asignaturasProcesadas: number
): Promise<any[]> {
  const archivosGenerados: any[] = []

  if (!generate_files) {
    await supabase.rpc('agregar_log_proceso_etl', {
      p_proceso_id: procesoId,
      p_mensaje: 'Generación de archivos omitida (generate_files=false)',
    })
    return archivosGenerados
  }

  if (CONFIG.GENERAR_CSV) {
    const contenidoCSV = generarCSV(todosLosObjetivos)
    const nombreCSV = generarNombreArchivo('csv', categoriaPrincipal)
    console.log(`💾 Subiendo ${nombreCSV} a Storage...`)

    const urlCSV = await subirArchivoStorage(
      supabase,
      contenidoCSV,
      nombreCSV,
      'text/csv; charset=utf-8'
    )

    archivosGenerados.push({
      nombre: nombreCSV,
      path: `bases-curriculares/${nombreCSV}`,
      size: new Blob([contenidoCSV]).size,
      url: urlCSV,
      formato: 'csv',
    })

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
          'Categoria', 'Asignatura', 'Nivel', 'Curso', 'OA', 'Eje', 'Objetivo de Aprendizaje', 'Tipo',
          'Actividad 1', 'URL Actividad 1', 'Actividad 2', 'URL Actividad 2',
          'Actividad 3', 'URL Actividad 3', 'Actividad 4', 'URL Actividad 4',
          'Priorizado',
        ],
        resumen_contenido: {
          asignaturas_procesadas: asignaturasProcesadas,
          total_objetivos: todosLosObjetivos.length,
          objetivos_priorizados: todosLosObjetivos.filter(o => o.priorizado === 1).length,
          objetivos_contenido: todosLosObjetivos.filter(o => o.tipo_objetivo === 'contenido').length,
          objetivos_habilidades: todosLosObjetivos.filter(o => o.tipo_objetivo === 'habilidad').length,
          objetivos_actitudes: todosLosObjetivos.filter(o => o.tipo_objetivo === 'actitud').length,
        },
        version: new Date().toISOString().split('T')[0],
      })
  }

  if (CONFIG.GENERAR_JSON) {
    const contenidoJSON = generarJSON(todosLosObjetivos)
    const nombreJSON = generarNombreArchivo('json', categoriaPrincipal)
    console.log(`💾 Subiendo ${nombreJSON} a Storage...`)

    const urlJSON = await subirArchivoStorage(
      supabase,
      contenidoJSON,
      nombreJSON,
      'application/json; charset=utf-8'
    )

    archivosGenerados.push({
      nombre: nombreJSON,
      path: `bases-curriculares/${nombreJSON}`,
      size: new Blob([contenidoJSON]).size,
      url: urlJSON,
      formato: 'json',
    })

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
          objetivos_contenido: todosLosObjetivos.filter(o => o.tipo_objetivo === 'contenido').length,
          objetivos_habilidades: todosLosObjetivos.filter(o => o.tipo_objetivo === 'habilidad').length,
          objetivos_actitudes: todosLosObjetivos.filter(o => o.tipo_objetivo === 'actitud').length,
        },
        version: new Date().toISOString().split('T')[0],
      })
  }

  return archivosGenerados
}

async function finalizarProcesoExitoso(
  supabase: any,
  procesoId: string,
  contexto: FinalizacionContexto
): Promise<void> {
  const {
    totalObjetivos,
    archivosGenerados,
    startTime,
    extraccion,
    persistencia,
    persist_db,
    generate_files,
  } = contexto
  await supabase.rpc('finalizar_proceso_etl', {
    p_proceso_id: procesoId,
    p_estado: 'completado',
    p_total_registros: totalObjetivos,
    p_registros_exitosos: totalObjetivos,
    p_registros_fallidos: 0,
    p_archivos_generados: JSON.stringify(archivosGenerados),
  })

  const duracionMs = Date.now() - startTime
  console.log(`\n${'='.repeat(60)}`)
  console.log('✅ EXTRACCIÓN COMPLETADA')
  console.log(`${'='.repeat(60)}`)
  console.log(`   📂 Categorías procesadas: ${extraccion.categoriasProcesadas}`)
  console.log(`   📚 Asignaturas procesadas: ${extraccion.asignaturasProcesadas}`)
  console.log(`   🎯 Total objetivos extraídos: ${totalObjetivos}`)
  console.log(`   ⭐ Priorizados: ${extraccion.todosLosObjetivos.filter(o => o.priorizado === 1).length}`)
  console.log(`   ⏱️  Duración: ${duracionMs}ms`)

  if (totalObjetivos === 0) {
    console.warn('⚠️  ADVERTENCIA: No se extrajeron objetivos. Posibles causas: estructura HTML cambió, problemas de conectividad o selectores desactualizados')
  }

  if (persist_db) {
    console.log(`   💾 Persistencia: ${persistencia.objetivosNuevos} nuevos, ${persistencia.objetivosActualizados} actualizados, ${persistencia.objetivosSinCambios} sin cambios, ${persistencia.objetivosError} errores`)
  } else {
    console.log('   💾 Persistencia: omitida (persist_db=false)')
  }

  if (!generate_files) {
    console.log('   📄 Generación de archivos: omitida (generate_files=false)')
  }
}

function construirRespuestaOk(
  procesoId: string,
  archivosGenerados: any[],
  persist_db: boolean,
  generate_files: boolean,
  extraccion: ResultadoExtraccion,
  persistencia: ResultadoPersistencia,
  startTime: number
): Response {
  const duracionMs = Date.now() - startTime

  return new Response(
    JSON.stringify({
      success: true,
      proceso_id: procesoId,
      archivos: archivosGenerados,
      configuracion: { persist_db, generate_files },
      estadisticas: {
        asignaturas_procesadas: extraccion.asignaturasProcesadas,
        total_objetivos: extraccion.todosLosObjetivos.length,
        objetivos_priorizados: extraccion.todosLosObjetivos.filter(o => o.priorizado === 1).length,
        objetivos_contenido: extraccion.todosLosObjetivos.filter(o => o.tipo_objetivo === 'contenido').length,
        objetivos_habilidades: extraccion.todosLosObjetivos.filter(o => o.tipo_objetivo === 'habilidad').length,
        objetivos_actitudes: extraccion.todosLosObjetivos.filter(o => o.tipo_objetivo === 'actitud').length,
        duracion_ms: duracionMs,
        tracking: persist_db ? {
          objetivos_nuevos: persistencia.objetivosNuevos,
          objetivos_actualizados: persistencia.objetivosActualizados,
          objetivos_sin_cambios: persistencia.objetivosSinCambios,
          objetivos_error: persistencia.objetivosError,
        } : null,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

function construirRespuestaParcial(
  runId: string,
  estado: EstadoEjecucion,
  pendientes: string[],
  procesadas: string[],
  extraccion: ResultadoExtraccion,
  persistencia: ResultadoPersistencia,
  startTime: number
): Response {
  const duracionMs = Date.now() - startTime

  return new Response(
    JSON.stringify({
      success: true,
      estado,
      run_id: runId,
      categorias_pendientes: pendientes,
      categorias_procesadas: procesadas,
      asignaturas_procesadas: extraccion.asignaturasProcesadas,
      total_objetivos: extraccion.todosLosObjetivos.length,
      persistencia,
      duracion_ms: duracionMs,
    }),
    {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

function manejarErrorHandler(error: unknown): Response {
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
 
/**
 * Handler principal de la Edge Function con soporte para reintentos
 */
export async function handler(req: Request): Promise<Response> {
  const startTime = Date.now()

  try {
    console.log('🚀 Iniciando extracción de Bases Curriculares...')

    const supabase = crearClienteServicio(req)
    const { force, persist_db, generate_files, batch_categorias, continue_run_id } = await obtenerConfiguracion(req)

    // Determinar si es continuación o nuevo run
    let run: ExtraccionRun
    let categoriasAProcesar: string[]

    if (continue_run_id) {
      // CONTINUACIÓN: Obtener run existente
      console.log(`🔄 Continuando run existente: ${continue_run_id}`)
      run = await obtenerRunExtraccion(supabase, continue_run_id)

      if (run.estado === 'completed') {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Run ya completado anteriormente',
            run_id: run.id,
            estado: run.estado
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Quitar las categorías ya procesadas
      categoriasAProcesar = quitarProcesadas(run.categorias_pendientes, run.categorias_procesadas)

      if (categoriasAProcesar.length === 0) {
        // No hay más categorías pendientes, marcar como completado
        await actualizarRunExtraccion(supabase, run.id, {
          estado: 'completed',
          finished_at: new Date().toISOString()
        })

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Todas las categorías ya fueron procesadas',
            run_id: run.id,
            estado: 'completed'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.log(`📋 Categorías pendientes: ${categoriasAProcesar.length}`)
      console.log(`✅ Categorías ya procesadas: ${run.categorias_procesadas.length}`)

    } else {
      // NUEVO RUN: Crear run de extracción
      const todasLasCategorias = obtenerCategoriasAProcesar()
      run = await crearRunExtraccion(supabase, force, todasLasCategorias)
      categoriasAProcesar = todasLasCategorias

      console.log(`🆕 Nuevo run creado: ${run.id}`)
      console.log(`📋 Total categorías a procesar: ${categoriasAProcesar.length}`)
    }

    // Limitar a batch de categorías para evitar timeout
    const categoriasEnEsteBatch = categoriasAProcesar.slice(0, batch_categorias)
    console.log(`📦 Procesando batch de ${categoriasEnEsteBatch.length} categorías`)

    // Procesar categorías con límite de tiempo
    const { extraccion, categoriasProcesadas } = await procesarCategoriasConTiempo(
      supabase,
      run.proceso_etl_id!,
      categoriasEnEsteBatch,
      startTime,
      MAX_RUN_MS
    )

    // Persistir objetivos en BD si está habilitado
    const persistencia = await persistirObjetivosEnBD(
      supabase,
      run.proceso_etl_id!,
      extraccion.todosLosObjetivos,
      persist_db
    )

    // Actualizar run con progreso
    const categoriasYaProcesadas = [...run.categorias_procesadas, ...categoriasProcesadas]
    const categoriasPendientes = quitarProcesadas(run.categorias_pendientes, categoriasProcesadas)

    await actualizarRunExtraccion(supabase, run.id, {
      categorias_procesadas: categoriasYaProcesadas,
      categorias_pendientes: categoriasPendientes,
      asignaturas_procesadas: run.asignaturas_procesadas + extraccion.asignaturasProcesadas,
      objetivos_extraidos: run.objetivos_extraidos + extraccion.todosLosObjetivos.length,
      estado: categoriasPendientes.length === 0 ? 'completed' : 'partial',
      finished_at: categoriasPendientes.length === 0 ? new Date().toISOString() : undefined,
    })

    // Si quedan categorías pendientes, retornar 202 Accepted
    if (categoriasPendientes.length > 0) {
      console.log(`\n⏸️  EJECUCIÓN PARCIAL`)
      console.log(`   ✅ Procesadas en este batch: ${categoriasProcesadas.length}`)
      console.log(`   ⏳ Categorías pendientes: ${categoriasPendientes.length}`)
      console.log(`   🔄 Para continuar, usar run_id: ${run.id}`)

      return construirRespuestaParcial(
        run.id,
        'partial',
        categoriasPendientes,
        categoriasYaProcesadas,
        extraccion,
        persistencia,
        startTime
      )
    }

    // Todas las categorías completadas - generar archivos y finalizar
    console.log(`\n✅ TODAS LAS CATEGORÍAS COMPLETADAS`)

    const categoriaPrincipal = extraccion.todosLosObjetivos[0]?.categoria || 'Todas las Categorías'
    const archivosGenerados = await generarYSubirArchivos(
      supabase,
      run.proceso_etl_id!,
      extraccion.todosLosObjetivos,
      categoriaPrincipal,
      generate_files,
      extraccion.asignaturasProcesadas
    )

    await finalizarProcesoExitoso(
      supabase,
      run.proceso_etl_id!,
      {
        totalObjetivos: extraccion.todosLosObjetivos.length,
        archivosGenerados,
        startTime,
        extraccion,
        persistencia,
        persist_db,
        generate_files,
      }
    )

    return construirRespuestaOk(
      run.proceso_etl_id!,
      archivosGenerados,
      persist_db,
      generate_files,
      extraccion,
      persistencia,
      startTime
    )

  } catch (error) {
    return manejarErrorHandler(error)
  }
}

Deno.serve(handler)