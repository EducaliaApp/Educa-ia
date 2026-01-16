// supabase/functions/extraer-bases-curriculares/index.ts
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
import { crearClienteSupabase, autenticarUsuario } from '../shared/utils.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  // Para testing: 10, Para producción: 0
  MAX_ASIGNATURAS: 10,
}

// ============================================
// TIPOS E INTERFACES
// ============================================

interface ObjetivoAprendizaje {
  nivel: string // "1° a 6° Básico"
  curso: string // "1° Básico"
  asignatura: string
  oa_codigo: string // "AR01 OA 01"
  eje: string // Eje o Núcleo curricular
  objetivo: string
  actividad_comp_1: string
  url_actividad_1: string
  actividad_comp_2: string
  url_actividad_2: string
  actividad_comp_3: string
  url_actividad_3: string
  actividad_comp_4: string
  url_actividad_4: string
  priorizacion: 0 | 1 // 1 si es Basal/Prioritized, 0 si no
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
 * Usa selector CSS: .asignatura a
 */
function extraerAsignaturasYCursos(html: string): AsignaturaLink[] {
  const links: AsignaturaLink[] = []
  
  // Patrón mejorado para buscar links dentro de elementos con clase 'asignatura'
  // Busca: <div class="asignatura..."><a href="...">texto</a></div>
  const patronAsignatura = /<div[^>]*class=[^>]*asignatura[^>]*>[\s\S]*?<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi
  
  let match
  while ((match = patronAsignatura.exec(html)) !== null) {
    const href = match[1]
    const texto = match[2].trim()
    
    // Filtrar solo links de asignaturas con curso específico
    // Ejemplo: "artes-visuales/1-basico"
    if (href.includes('/1-basico') || href.includes('/2-basico') || 
        href.includes('/3-basico') || href.includes('/4-basico') ||
        href.includes('/5-basico') || href.includes('/6-basico')) {
      
      const url = href.startsWith('http') ? href : CONFIG.BASE_URL + href
      
      // Evitar duplicados
      if (!links.some(l => l.url === url) && texto.length > 0) {
        links.push({ nombre: limpiarTexto(texto), url })
      }
    }
  }
  
  return links
}

/**
 * Extrae objetivos de aprendizaje de una página de asignatura
 * Soporta dos estructuras HTML diferentes:
 * TIPO A: .oa-cnt, .oa-numero, .oa-eje, .oa-descripcion, .oa-basal
 * TIPO B: .items-wrapper, .item-wrapper, .oa-title, .field__item, .prioritized
 */
function extraerObjetivos(html: string, asignatura: string, curso: string, nivel: string = ''): ObjetivoAprendizaje[] {
  const objetivos: ObjetivoAprendizaje[] = []
  
  // Extraer curso/nivel si está disponible en la página
  const nivelMatch = html.match(/<[^>]*class=[^>]*nivel-titulo[^>]*>[\s\S]*?<span[^>]*>([^<]*)<\/span>/i)
  const cursoExtraido = nivelMatch ? limpiarTexto(nivelMatch[1]) : curso
  
  // INTENTAR ESTRUCTURA TIPO B PRIMERO (.items-wrapper/.item-wrapper)
  const patronItemsWrapper = /<div[^>]*class=[^>]*items-wrapper[^>]*>([\s\S]*?)<\/div>(?=\s*<div[^>]*class=[^>]*items-wrapper|\s*<\/)/gi
  let matchWrapper
  let foundTipoB = false
  
  while ((matchWrapper = patronItemsWrapper.exec(html)) !== null) {
    const bloqueEje = matchWrapper[1]
    
    // Extraer título del eje
    const ejeTitleMatch = bloqueEje.match(/<h3[^>]*>([^<]*)<\/h3>/i)
    const ejeNombre = ejeTitleMatch ? limpiarTexto(ejeTitleMatch[1]) : ''
    
    // Buscar OAs dentro de este eje
    const patronItemWrapper = /<div[^>]*class=[^>]*item-wrapper[^>]*>([\s\S]*?)<\/div>(?=\s*<div[^>]*class=[^>]*item-wrapper|<\/div>)/gi
    let matchItem
    
    while ((matchItem = patronItemWrapper.exec(bloqueEje)) !== null) {
      const bloqueOA = matchItem[1]
      foundTipoB = true
      
      try {
        // Extraer código/título OA (.oa-title)
        const codigoMatch = bloqueOA.match(/<[^>]*class=[^>]*oa-title[^>]*>([^<]*)<\/[^>]*>/i)
        const codigo = codigoMatch ? limpiarTexto(codigoMatch[1]) : ''
        
        if (!codigo) continue
        
        // Extraer objetivo (.field__item)
        const objetivoMatch = bloqueOA.match(/<[^>]*class=[^>]*field__item[^>]*>([^<]*)<\/[^>]*>/i)
        const objetivo = objetivoMatch ? limpiarTexto(objetivoMatch[1]) : ''
        
        // Detectar priorización (.prioritized)
        const esPriorizado = /<[^>]*class=[^>]*prioritized[^>]*>/i.test(bloqueOA)
        
        // Extraer link de detalle (a.link-more)
        const detalleLinkMatch = bloqueOA.match(/<a[^>]*class=[^>]*link-more[^>]*href=["']([^"']*)["']/i)
        const detalleUrl = detalleLinkMatch ? 
          (detalleLinkMatch[1].startsWith('http') ? detalleLinkMatch[1] : CONFIG.BASE_URL + detalleLinkMatch[1]) : 
          ''
        
        objetivos.push({
          nivel: nivel || cursoExtraido,
          curso: cursoExtraido,
          asignatura,
          oa_codigo: codigo,
          eje: ejeNombre,
          objetivo: objetivo,
          actividad_comp_1: '',
          url_actividad_1: '',
          actividad_comp_2: '',
          url_actividad_2: '',
          actividad_comp_3: '',
          url_actividad_3: '',
          actividad_comp_4: '',
          url_actividad_4: '',
          priorizacion: esPriorizado ? 1 : 0,
          _detalleUrl: detalleUrl, // URL temporal para extraer actividades después
        } as any)
      } catch (error) {
        console.error('Error extrayendo OA (Tipo B):', error)
        continue
      }
    }
  }
  
  // SI NO SE ENCONTRÓ ESTRUCTURA TIPO B, INTENTAR TIPO A (.oa-cnt)
  if (!foundTipoB) {
    const patronOA = /<div[^>]*class=[^>]*oa-cnt[^>]*>([\s\S]*?)<\/div>(?=\s*<div[^>]*class=[^>]*oa-cnt|$)/gi
    
    let matchOA
    while ((matchOA = patronOA.exec(html)) !== null) {
      const bloqueOA = matchOA[1]
      
      try {
        // Extraer eje curricular (.oa-eje)
        const ejeMatch = bloqueOA.match(/<[^>]*class=[^>]*oa-eje[^>]*>([^<]*)<\/[^>]*>/i)
        const eje = ejeMatch ? limpiarTexto(ejeMatch[1]) : ''
        
        // Extraer código OA (.oa-numero)
        const codigoMatch = bloqueOA.match(/<[^>]*class=[^>]*oa-numero[^>]*>([^<]*)<\/[^>]*>/i)
        const codigo = codigoMatch ? limpiarTexto(codigoMatch[1]) : ''
        
        if (!codigo) continue
        
        // Extraer objetivo (.oa-descripcion)
        const objetivoMatch = bloqueOA.match(/<[^>]*class=[^>]*oa-descripcion[^>]*>([^<]*)<\/[^>]*>/i)
        const objetivo = objetivoMatch ? limpiarTexto(objetivoMatch[1]) : ''
        
        // Detectar priorización (.oa-basal)
        const esBasal = /<[^>]*class=[^>]*oa-basal[^>]*>/i.test(bloqueOA)
        
        objetivos.push({
          nivel: nivel || cursoExtraido,
          curso: cursoExtraido,
          asignatura,
          oa_codigo: codigo,
          eje: eje,
          objetivo: objetivo,
          actividad_comp_1: '',
          url_actividad_1: '',
          actividad_comp_2: '',
          url_actividad_2: '',
          actividad_comp_3: '',
          url_actividad_3: '',
          actividad_comp_4: '',
          url_actividad_4: '',
          priorizacion: esBasal ? 1 : 0,
        })
      } catch (error) {
        console.error('Error extrayendo OA (Tipo A):', error)
        continue
      }
    }
  }
  
  return objetivos
}

/**
 * Extrae actividades complementarias de la página de actividades
 * Soporta dos selectores:
 * - .oa-recurso a (estructura tipo A)
 * - .field--name-field-recursos-relacionados li a (estructura tipo B)
 */
async function extraerActividades(url: string): Promise<{ nombre: string; url: string }[]> {
  if (!url) return []
  
  try {
    const html = await fetchWithRetry(url)
    const actividades: { nombre: string; url: string }[] = []
    
    // INTENTAR ESTRUCTURA TIPO B PRIMERO (.field--name-field-recursos-relacionados)
    const patronActividadB = /<[^>]*class=[^>]*field--name-field-recursos-relacionados[^>]*>[\s\S]*?<li[^>]*>[\s\S]*?<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi
    
    let match
    while ((match = patronActividadB.exec(html)) !== null && actividades.length < 4) {
      const href = match[1]
      const nombre = limpiarTexto(match[2])
      
      const urlCompleta = href.startsWith('http') ? href : CONFIG.BASE_URL + href
      actividades.push({ nombre, url: urlCompleta })
    }
    
    // SI NO SE ENCONTRARON, INTENTAR ESTRUCTURA TIPO A (.oa-recurso a)
    if (actividades.length === 0) {
      const patronActividadA = /<[^>]*class=[^>]*oa-recurso[^>]*>[\s\S]*?<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi
      
      while ((match = patronActividadA.exec(html)) !== null && actividades.length < 4) {
        const href = match[1]
        const nombre = limpiarTexto(match[2])
        
        const urlCompleta = href.startsWith('http') ? href : CONFIG.BASE_URL + href
        actividades.push({ nombre, url: urlCompleta })
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
 */
function generarCSV(objetivos: ObjetivoAprendizaje[]): string {
  const headers = [
    'Nivel',
    'Curso',
    'Asignatura',
    'OA',
    'Eje/Núcleo',
    'Objetivo de aprendizaje',
    'Actividad comp. 1',
    'URL Act. 1',
    'Actividad comp. 2',
    'URL Act. 2',
    'Actividad comp. 3',
    'URL Act. 3',
    'Actividad comp. 4',
    'URL Act. 4',
    'Priorización',
  ]
  
  let csv = headers.join(';') + '\n'
  
  for (const obj of objetivos) {
    const row = [
      escaparCSV(obj.nivel),
      escaparCSV(obj.curso),
      escaparCSV(obj.asignatura),
      escaparCSV(obj.oa_codigo),
      escaparCSV(obj.eje),
      escaparCSV(obj.objetivo),
      escaparCSV(obj.actividad_comp_1),
      escaparCSV(obj.url_actividad_1),
      escaparCSV(obj.actividad_comp_2),
      escaparCSV(obj.url_actividad_2),
      escaparCSV(obj.actividad_comp_3),
      escaparCSV(obj.url_actividad_3),
      escaparCSV(obj.actividad_comp_4),
      escaparCSV(obj.url_actividad_4),
      obj.priorizacion.toString(),
    ]
    
    csv += row.join(';') + '\n'
  }
  
  return csv
}

/**
 * Genera nombre de archivo CSV con timestamp
 */
function generarNombreArchivo(fecha: Date = new Date()): string {
  const fechaStr = fecha.toISOString().split('T')[0]
  return `bases_curriculares_1_a_6_basico_con_actividades_${fechaStr}.csv`
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
async function subirCSVaStorage(
  supabase: any,
  contenidoCSV: string,
  nombreArchivo: string
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
    .upload(rutaArchivo, contenidoCSV, {
      contentType: 'text/csv; charset=utf-8',
      upsert: true,
    })
  
  if (error) {
    throw new Error(`Error subiendo CSV: ${error.message}`)
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  try {
    console.log('🚀 Iniciando extracción de Bases Curriculares...')
    
    // Autenticación de usuario
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header es requerido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = crearClienteSupabase(authHeader)
    const user = await autenticarUsuario(supabase)
    
    // Verificar que el usuario sea admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'No autorizado. Se requiere rol de administrador.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`✓ Usuario autenticado: ${user.id}`)
    
    // Obtener configuración del request
    const { force = false } = await req.json().catch(() => ({ force: false }))
    
    // 1. Crear registro de proceso ETL
    const { data: proceso, error: procesoError } = await supabase
      .rpc('iniciar_proceso_etl', {
        p_nombre: 'extraer_bases_curriculares',
        p_tipo_proceso: 'extraccion',
        p_descripcion: 'Extracción de Bases Curriculares 1° a 6° básico desde curriculumnacional.cl',
        p_configuracion: JSON.stringify({ force }),
        p_ejecutado_por: user.id,
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
      
      console.log(`📊 Modo: ${CONFIG.MAX_ASIGNATURAS > 0 ? 'TEST' : 'PRODUCCIÓN'}`)
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
          
          // 5. Para cada objetivo, extraer actividades si tiene
          for (const obj of objetivos) {
            // Si tiene _detalleUrl (estructura Tipo B), usarlo; sino construir URL tradicional
            const objAny = obj as any
            const urlActividades = objAny._detalleUrl || 
              `${asig.url}/${obj.oa_codigo.toLowerCase().replace(/\s+/g, '-')}#actividades`
            
            // Limpiar propiedad temporal
            delete objAny._detalleUrl
            
            try {
              const actividades = await extraerActividades(urlActividades)
              
              if (actividades.length > 0) {
                obj.actividad_comp_1 = actividades[0]?.nombre || ''
                obj.url_actividad_1 = actividades[0]?.url || ''
              }
              if (actividades.length > 1) {
                obj.actividad_comp_2 = actividades[1]?.nombre || ''
                obj.url_actividad_2 = actividades[1]?.url || ''
              }
              if (actividades.length > 2) {
                obj.actividad_comp_3 = actividades[2]?.nombre || ''
                obj.url_actividad_3 = actividades[2]?.url || ''
              }
              if (actividades.length > 3) {
                obj.actividad_comp_4 = actividades[3]?.nombre || ''
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
      
      // 6. Generar CSV
      console.log('📝 Generando CSV...')
      const contenidoCSV = generarCSV(todosLosObjetivos)
      
      // 7. Subir a Storage
      const nombreArchivo = generarNombreArchivo()
      console.log(`💾 Subiendo ${nombreArchivo} a Storage...`)
      
      const urlDescarga = await subirCSVaStorage(supabase, contenidoCSV, nombreArchivo)
      
      console.log(`✓ CSV subido: ${urlDescarga}`)
      
      // 8. Registrar documento transformado
      const { error: docError } = await supabase
        .from('documentos_transformados')
        .insert({
          proceso_etl_id: procesoId,
          nombre_archivo: nombreArchivo,
          tipo_documento: 'bases_curriculares',
          formato: 'csv',
          storage_bucket: 'documentos-transformados',
          storage_path: `bases-curriculares/${nombreArchivo}`,
          tamaño_bytes: new Blob([contenidoCSV]).size,
          url_descarga: urlDescarga,
          num_registros: todosLosObjetivos.length,
          columnas: [
            'Asignatura', 'OA', 'Eje', 'Objetivo de aprendizaje',
            'Actividad comp. 1', 'URL Act. 1', 'Actividad comp. 2', 'URL Act. 2',
            'Actividad comp. 3', 'URL Act. 3', 'Priorización',
          ],
          resumen_contenido: {
            asignaturas_procesadas: asignaturasProcesadas,
            total_objetivos: todosLosObjetivos.length,
            objetivos_priorizados: todosLosObjetivos.filter(o => o.priorizacion === 1).length,
          },
          version: new Date().toISOString().split('T')[0],
        })
      
      if (docError) {
        console.error('Error registrando documento:', docError)
      }
      
      // 9. Finalizar proceso ETL
      await supabase.rpc('finalizar_proceso_etl', {
        p_proceso_id: procesoId,
        p_estado: 'completado',
        p_total_registros: todosLosObjetivos.length,
        p_registros_exitosos: todosLosObjetivos.length,
        p_registros_fallidos: 0,
        p_archivos_generados: JSON.stringify([
          {
            nombre: nombreArchivo,
            path: `bases-curriculares/${nombreArchivo}`,
            size: new Blob([contenidoCSV]).size,
            url: urlDescarga,
          },
        ]),
      })
      
      const duracionMs = Date.now() - startTime
      console.log(`\n✅ Proceso completado en ${duracionMs}ms`)
      
      return new Response(
        JSON.stringify({
          success: true,
          proceso_id: procesoId,
          archivo: nombreArchivo,
          url_descarga: urlDescarga,
          estadisticas: {
            asignaturas_procesadas: asignaturasProcesadas,
            total_objetivos: todosLosObjetivos.length,
            objetivos_priorizados: todosLosObjetivos.filter(o => o.priorizacion === 1).length,
            duracion_ms: duracionMs,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    console.error('❌ Error en extracción:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    
    return new Response(
      JSON.stringify({
        error: 'Error en extracción de bases curriculares',
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}

if (import.meta.main) {
  serve(handler)
}
