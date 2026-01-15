// supabase/functions/extraer-bases-curriculares/index.ts

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
}

// ============================================
// TIPOS E INTERFACES
// ============================================

interface ObjetivoAprendizaje {
  asignatura: string
  oa_codigo: string // "AR01 OA 01"
  eje: string
  objetivo: string
  actividad_comp_1: string
  url_actividad_1: string
  actividad_comp_2: string
  url_actividad_2: string
  actividad_comp_3: string
  url_actividad_3: string
  priorizacion: 0 | 1 // 1 si es Basal, 0 si no
  curso: string // "1° Básico"
}

interface AsignaturaLink {
  nombre: string // "Artes Visuales 1° Básico"
  url: string
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

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
 */
function extraerAsignaturasYCursos(html: string): AsignaturaLink[] {
  const links: AsignaturaLink[] = []
  
  // Patrón para encontrar links a asignaturas
  // Buscar elementos <a> con href que contenga /curriculum/1o-6o-basico/
  const patronLink = /<a[^>]*href=["']([^"']*1o-6o-basico[^"']*)["'][^>]*>([^<]*)<\/a>/gi
  
  let match
  while ((match = patronLink.exec(html)) !== null) {
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
        links.push({ nombre: texto, url })
      }
    }
  }
  
  return links
}

/**
 * Extrae objetivos de aprendizaje de una página de asignatura
 */
function extraerObjetivos(html: string, asignatura: string, curso: string): ObjetivoAprendizaje[] {
  const objetivos: ObjetivoAprendizaje[] = []
  
  // Buscar bloques de objetivos
  // Los OA generalmente están en divs con clase "oa" o similar
  const patronOA = /<div[^>]*class=[^>]*oa[^>]*>([\s\S]*?)<\/div>/gi
  
  let matchOA
  let currentEje = ''
  
  // Primero, intentar extraer ejes (h3 o h4)
  const patronEje = /<h[34][^>]*>([^<]*)<\/h[34]>/gi
  const ejes: string[] = []
  let matchEje
  while ((matchEje = patronEje.exec(html)) !== null) {
    ejes.push(matchEje[1].trim())
  }
  
  // Extraer OAs
  while ((matchOA = patronOA.exec(html)) !== null) {
    const bloqueOA = matchOA[1]
    
    try {
      // Extraer código OA (ej: "AR01 OA 01")
      const codigoMatch = bloqueOA.match(/([A-Z]{2}\d{2}\s+OA\s+\d{2})/i)
      const codigo = codigoMatch ? codigoMatch[1] : ''
      
      if (!codigo) continue
      
      // Extraer objetivo
      const objetivoMatch = bloqueOA.match(/<p[^>]*class=[^>]*oa-contenido[^>]*>([^<]*)<\/p>/i)
      const objetivo = objetivoMatch ? objetivoMatch[1].trim() : ''
      
      // Detectar priorización (Basal)
      const esBasal = /basal/i.test(bloqueOA) || /priorizado/i.test(bloqueOA)
      
      // Extraer link de actividades
      const actividadesMatch = bloqueOA.match(/href=["']([^"']*actividades[^"']*)["']/i)
      const urlActividades = actividadesMatch ? 
        (actividadesMatch[1].startsWith('http') ? actividadesMatch[1] : CONFIG.BASE_URL + actividadesMatch[1]) : 
        ''
      
      // Por ahora, crear el objetivo sin actividades (se agregarán después)
      objetivos.push({
        asignatura,
        oa_codigo: codigo,
        eje: currentEje || ejes[0] || '',
        objetivo: objetivo || '',
        actividad_comp_1: '',
        url_actividad_1: '',
        actividad_comp_2: '',
        url_actividad_2: '',
        actividad_comp_3: '',
        url_actividad_3: '',
        priorizacion: esBasal ? 1 : 0,
        curso,
      })
    } catch (error) {
      console.error('Error extrayendo OA:', error)
      continue
    }
  }
  
  return objetivos
}

/**
 * Extrae actividades complementarias de la página de actividades
 */
async function extraerActividades(url: string): Promise<{ nombre: string; url: string }[]> {
  if (!url) return []
  
  try {
    const html = await fetchWithRetry(url)
    const actividades: { nombre: string; url: string }[] = []
    
    // Buscar recursos/actividades
    const patronActividad = /<li[^>]*class=[^>]*recurso[^>]*>[\s\S]*?<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi
    
    let match
    while ((match = patronActividad.exec(html)) !== null && actividades.length < 3) {
      const href = match[1]
      const nombre = match[2].trim()
      
      const urlCompleta = href.startsWith('http') ? href : CONFIG.BASE_URL + href
      actividades.push({ nombre, url: urlCompleta })
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
    'Asignatura',
    'OA',
    'Eje',
    'Objetivo de aprendizaje',
    'Actividad comp. 1',
    'URL Act. 1',
    'Actividad comp. 2',
    'URL Act. 2',
    'Actividad comp. 3',
    'URL Act. 3',
    'Priorización',
  ]
  
  let csv = headers.join(';') + '\n'
  
  for (const obj of objetivos) {
    const row = [
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
      obj.priorizacion.toString(),
    ]
    
    csv += row.join(';') + '\n'
  }
  
  return csv
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

// ============================================
// HANDLER PRINCIPAL
// ============================================

export async function handler(req: Request): Promise<Response> {
  const startTime = Date.now()
  
  try {
    console.log('🚀 Iniciando extracción de Bases Curriculares...')
    
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
        p_configuracion: JSON.stringify({ force }),
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
      
      for (const asig of asignaturas.slice(0, 10)) { // Limitar a 10 para testing
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
            // Construir URL de actividades
            const urlActividades = `${asig.url}/${obj.oa_codigo.toLowerCase().replace(/\s+/g, '-')}#actividades`
            
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
      const nombreArchivo = `bases_curriculares_1_a_6_basico_con_actividades_${new Date().toISOString().split('T')[0]}.csv`
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
