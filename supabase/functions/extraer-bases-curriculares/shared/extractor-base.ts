/**
 * Módulo compartido con toda la lógica de extracción de Bases Curriculares
 * Este módulo es utilizado por todas las funciones específicas de categoría
 */

import {
  PATRON_VALIDACION_OA_UNIVERSAL,
  PATRON_EXTRACCION_OA_UNIVERSAL,
} from '../constants.ts'

// ============================================
// CONFIGURACIÓN
// ============================================

export const CONFIG = {
  BASE_URL: 'https://www.curriculumnacional.cl',
  DELAY_BETWEEN_REQUESTS: 200, // ms para rate limiting
  MAX_RETRIES: 3,
  FETCH_TIMEOUT: 30000, // 30 segundos timeout para fetch
  USER_AGENT: 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0; +https://profeflow.cl)',
  GENERAR_CSV: true,
  GENERAR_JSON: true,
}

// ============================================
// TIPOS E INTERFACES
// ============================================

export type TipoObjetivo = 'contenido' | 'habilidad' | 'actitud'

export interface ObjetivoAprendizaje {
  asignatura: string
  oa_codigo: string
  eje: string
  objetivo: string
  tipo_objetivo: TipoObjetivo
  categoria: string
  nivel: string
  curso: string
  actividad_1: string
  url_actividad_1: string
  actividad_2: string
  url_actividad_2: string
  actividad_3: string
  url_actividad_3: string
  actividad_4: string
  url_actividad_4: string
  priorizado: 0 | 1
  _detalleUrl?: string
}

export interface ObjetivoAprendizajeJSON {
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

export interface AsignaturaLink {
  nombre: string
  url: string
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

export function limpiarTexto(texto: string): string {
  return texto.replaceAll(/\s+/g, ' ').trim()
}

export function es404(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('404') || error.message.includes('Not Found')
  }
  return false
}

export function validarCodigoOA(codigo: string): boolean {
  return PATRON_VALIDACION_OA_UNIVERSAL.test(codigo.trim())
}

export function obtenerTipoObjetivo(codigo: string): TipoObjetivo {
  const codigoLimpio = codigo.trim().toUpperCase()

  if (codigoLimpio.includes(' OAH ')) {
    return 'habilidad'
  } else if (codigoLimpio.includes(' OAA ')) {
    return 'actitud'
  } else {
    return 'contenido'
  }
}

export function extraerCategoriaDesdeURL(url: string): string {
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

  let match = url.match(/\/curriculum\/([^/]+)/)
  if (match) {
    const slug = match[1]
    return categoriaMap[slug] || 'Desconocida'
  }

  match = url.match(/\/recursos\/([^/]+)/)
  if (match) {
    const slug = match[1]
    return categoriaMap[slug] || 'Desconocida'
  }

  match = url.match(/\/([^/]+)\/?$/)
  if (match) {
    const slug = match[1]
    return categoriaMap[slug] || 'Desconocida'
  }

  return 'Desconocida'
}

export function validarURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
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

export function shouldRetry(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return false
    if (error.message.includes('404')) return false
  }
  return true
}

export async function handleRetryDelay(attempt: number, url: string, error: unknown, retries: number): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : 'Error desconocido'

  if (attempt < retries - 1) {
    console.warn(`Intento ${attempt + 1}/${retries} falló para ${url}: ${errorMessage}. Reintentando...`)
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
  } else {
    console.error(`Todos los intentos fallaron para ${url}: ${errorMessage}`)
    throw new Error(`Falló después de ${retries} intentos: ${errorMessage}`)
  }
}

export async function fetchWithRetry(url: string, retries = CONFIG.MAX_RETRIES): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, CONFIG.FETCH_TIMEOUT)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()

      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS))

      return html
    } catch (error) {
      if (!shouldRetry(error)) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        throw new Error(errorMessage)
      }

      await handleRetryDelay(attempt, url, error, retries)
    }
  }

  throw new Error('fetchWithRetry: No se pudo completar la solicitud')
}

// ============================================
// EXTRACCIÓN DE ASIGNATURAS Y CURSOS
// ============================================

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

function esEnlaceAsignaturaConCurso(href: string, texto: string): boolean {
  const tieneNivelEnURL = /\/(1-basico|2-basico|3-basico|4-basico|5-basico|6-basico|7-basico|8-basico|1-medio|2-medio|3-medio|4-medio|sc|nm|nt)/i.test(href)
  const tieneNivelEnTexto = /(1°|2°|3°|4°|5°|6°|7°|8°|nivel\s*\d|sala\s*cuna|medio|transición)/i.test(texto)

  return tieneNivelEnURL || tieneNivelEnTexto
}

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

function esEnlaceNavegacion(texto: string): boolean {
  return /(documentos|recursos|evaluación|inicio|mineduc|ayuda)/i.test(texto)
}

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

export function extraerAsignaturasYCursos(html: string): AsignaturaLink[] {
  const links: AsignaturaLink[] = []

  extraerEstructuraTipo1(html, links)

  if (links.length === 0) {
    extraerEstructuraTipo2(html, links)
  }

  if (links.length === 0) {
    extraerEstructuraTipo3(html, links)
  }

  console.log(`📋 Extraídos ${links.length} enlaces de asignaturas/cursos`)
  return links
}

// ============================================
// EXTRACCIÓN DE OBJETIVOS DE APRENDIZAJE
// ============================================

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
  const codigoExtraido = codigoTexto.match(PATRON_EXTRACCION_OA_UNIVERSAL)
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
  }
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

export function extraerObjetivos(html: string, asignatura: string, curso: string, categoria: string, nivel: string = ''): ObjetivoAprendizaje[] {
  const { cursoExtraido, nivelExtraido } = obtenerNivelCurso(html, curso, nivel)

  const objetivosTipoB = extraerObjetivosTipoB(html, asignatura, categoria, cursoExtraido, nivelExtraido)
  if (objetivosTipoB.length > 0) return objetivosTipoB

  return extraerObjetivosTipoA(html, asignatura, categoria, cursoExtraido, nivelExtraido)
}

// ============================================
// EXTRACCIÓN DE ACTIVIDADES
// ============================================

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

export async function extraerActividades(url: string): Promise<{ nombre: string; url: string }[]> {
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

// ============================================
// GENERACIÓN DE ARCHIVOS
// ============================================

function escaparCSV(valor: string): string {
  if (!valor) return ''

  if (valor.includes(';') || valor.includes('"') || valor.includes('\n')) {
    return '"' + valor.replaceAll('"', '""') + '"'
  }

  return valor
}

export function generarCSV(objetivos: ObjetivoAprendizaje[]): string {
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

export function generarJSON(objetivos: ObjetivoAprendizaje[]): string {
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
      titulo: 'Bases Curriculares - Ministerio de Educación de Chile',
      fuente: 'https://www.curriculumnacional.cl',
      fecha_extraccion: fechaExtraccion,
      total_objetivos: objetivos.length,
      objetivos_priorizados: objetivos.filter(o => o.priorizado === 1).length,
    },
    objetivos: objetivosJSON,
  }

  return JSON.stringify(resultado, null, 2)
}

export function generarNombreArchivo(
  formato: 'csv' | 'json',
  categoria: string,
  fecha: Date = new Date()
): string {
  const year = fecha.getFullYear()
  const month = String(fecha.getMonth() + 1).padStart(2, '0')
  const day = String(fecha.getDate()).padStart(2, '0')
  const hours = String(fecha.getHours()).padStart(2, '0')
  const minutes = String(fecha.getMinutes()).padStart(2, '0')
  const seconds = String(fecha.getSeconds()).padStart(2, '0')

  const timestamp = `${year}-${month}-${day}-${hours}${minutes}${seconds}`

  const categoriaNormalizada = categoria
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll('°', '')
    .replaceAll(/\s+/g, '_')
    .replaceAll(/[()]/g, '')
    .replaceAll(/[^\w-]/g, '')

  return `bases_curriculares_${categoriaNormalizada}_${timestamp}.${formato}`
}

// ============================================
// HASH Y TRACKING
// ============================================

export async function calcularHashObjetivo(obj: any): Promise<string> {
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

export async function verificarCambios(
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
    return { cambio: true, registroExiste: false }
  }

  return {
    cambio: data.hash_contenido !== nuevoHash,
    registroExiste: true
  }
}

// ============================================
// STORAGE
// ============================================

export async function subirArchivoStorage(
  supabase: any,
  contenido: string,
  nombreArchivo: string,
  contentType: string
): Promise<string> {
  const bucketName = 'documentos-transformados'
  const rutaArchivo = `bases-curriculares/${nombreArchivo}`

  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExiste = buckets?.some((b: any) => b.name === bucketName)

  if (!bucketExiste) {
    console.log('Creando bucket documentos-transformados...')
    await supabase.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024,
    })
  }

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(rutaArchivo, contenido, {
      contentType,
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Error subiendo archivo: ${uploadError.message}`)
  }

  const { data: urlData } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(rutaArchivo, 31536000)

  return urlData?.signedUrl || rutaArchivo
}

// ============================================
// PROCESAMIENTO DE ACTIVIDADES
// ============================================

type ContadoresActividades = {
  conActividades: number
  sinActividades: number
  habilidadesActitudes: number
}

function construirUrlActividades(obj: ObjetivoAprendizaje, urlAsignatura: string): string {
  const slug = obj.oa_codigo.toLowerCase().replaceAll(/\s+/g, '-')
  return obj._detalleUrl || `${urlAsignatura}/${slug}`
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

export async function extraerActividadesParaObjetivos(
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
