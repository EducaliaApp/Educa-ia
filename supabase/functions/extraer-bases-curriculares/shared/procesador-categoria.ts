/**
 * Procesador de categoría individual
 * Contiene la lógica común para procesar una categoría específica
 */

import type { ObjetivoAprendizaje, AsignaturaLink } from './extractor-base.ts'
import {
  fetchWithRetry,
  extraerAsignaturasYCursos,
  extraerObjetivos,
  extraerCategoriaDesdeURL,
  extraerActividadesParaObjetivos,
  generarCSV,
  generarJSON,
  generarNombreArchivo,
  subirArchivoStorage,
  calcularHashObjetivo,
  verificarCambios,
  CONFIG,
} from './extractor-base.ts'

export type EstadoPersistencia = 'nuevo' | 'actualizado' | 'sinCambios' | 'error'

export interface ResultadoExtraccion {
  objetivos: ObjetivoAprendizaje[]
  asignaturasProcesadas: number
  categoria: string
}

export interface ResultadoPersistencia {
  objetivosNuevos: number
  objetivosActualizados: number
  objetivosSinCambios: number
  objetivosError: number
}

/**
 * Procesa una asignatura específica
 */
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

/**
 * Extrae objetivos de aprendizaje para una categoría específica
 */
export async function extraerObjetivosCategoria(
  supabase: any,
  procesoId: string,
  categoryUrl: string
): Promise<ResultadoExtraccion> {
  const objetivos: ObjetivoAprendizaje[] = []
  let asignaturasProcesadas = 0

  const categoriaNombre = extraerCategoriaDesdeURL(categoryUrl)

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

  console.log(`📝 Procesando ${asignaturas.length} asignaturas`)

  for (const asig of asignaturas) {
    const objetivosAsignatura = await procesarAsignatura(supabase, procesoId, asig)
    objetivos.push(...objetivosAsignatura)
    asignaturasProcesadas++
  }

  console.log(`\n✅ Categoría completada: ${categoriaNombre}`)
  console.log(`   📊 Total objetivos extraídos: ${objetivos.length}`)
  console.log(`   📚 Asignaturas procesadas: ${asignaturasProcesadas}`)

  return {
    objetivos,
    asignaturasProcesadas,
    categoria: categoriaNombre,
  }
}

/**
 * Construye actividades desde objetivo
 */
function construirActividades(obj: ObjetivoAprendizaje): { titulo: string; url: string }[] {
  const actividades: { titulo: string; url: string }[] = []
  if (obj.actividad_1) actividades.push({ titulo: obj.actividad_1, url: obj.url_actividad_1 })
  if (obj.actividad_2) actividades.push({ titulo: obj.actividad_2, url: obj.url_actividad_2 })
  if (obj.actividad_3) actividades.push({ titulo: obj.actividad_3, url: obj.url_actividad_3 })
  if (obj.actividad_4) actividades.push({ titulo: obj.actividad_4, url: obj.url_actividad_4 })
  return actividades
}

/**
 * Construye registro de persistencia
 */
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

/**
 * Persiste un objetivo en la base de datos
 */
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

/**
 * Persiste objetivos en la base de datos
 */
export async function persistirObjetivosEnBD(
  supabase: any,
  procesoId: string,
  objetivos: ObjetivoAprendizaje[],
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
    p_mensaje: `Persistiendo ${objetivos.length} objetivos en la base de datos con tracking de cambios`,
  })

  const fechaActual = new Date().toISOString()
  const resultado = { ...resultadoBase }

  for (const obj of objetivos) {
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

/**
 * Genera y sube archivos a Supabase Storage
 */
export async function generarYSubirArchivos(
  supabase: any,
  procesoId: string,
  objetivos: ObjetivoAprendizaje[],
  categoriaNombre: string,
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
    const contenidoCSV = generarCSV(objetivos)
    const nombreCSV = generarNombreArchivo('csv', categoriaNombre)
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
        num_registros: objetivos.length,
        columnas: [
          'Categoria', 'Asignatura', 'Nivel', 'Curso', 'OA', 'Eje', 'Objetivo de Aprendizaje', 'Tipo',
          'Actividad 1', 'URL Actividad 1', 'Actividad 2', 'URL Actividad 2',
          'Actividad 3', 'URL Actividad 3', 'Actividad 4', 'URL Actividad 4',
          'Priorizado',
        ],
        resumen_contenido: {
          categoria: categoriaNombre,
          asignaturas_procesadas: asignaturasProcesadas,
          total_objetivos: objetivos.length,
          objetivos_priorizados: objetivos.filter(o => o.priorizado === 1).length,
          objetivos_contenido: objetivos.filter(o => o.tipo_objetivo === 'contenido').length,
          objetivos_habilidades: objetivos.filter(o => o.tipo_objetivo === 'habilidad').length,
          objetivos_actitudes: objetivos.filter(o => o.tipo_objetivo === 'actitud').length,
        },
        version: new Date().toISOString().split('T')[0],
      })
  }

  if (CONFIG.GENERAR_JSON) {
    const contenidoJSON = generarJSON(objetivos)
    const nombreJSON = generarNombreArchivo('json', categoriaNombre)
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
        num_registros: objetivos.length,
        resumen_contenido: {
          categoria: categoriaNombre,
          asignaturas_procesadas: asignaturasProcesadas,
          total_objetivos: objetivos.length,
          objetivos_priorizados: objetivos.filter(o => o.priorizado === 1).length,
          objetivos_contenido: objetivos.filter(o => o.tipo_objetivo === 'contenido').length,
          objetivos_habilidades: objetivos.filter(o => o.tipo_objetivo === 'habilidad').length,
          objetivos_actitudes: objetivos.filter(o => o.tipo_objetivo === 'actitud').length,
        },
        version: new Date().toISOString().split('T')[0],
      })
  }

  return archivosGenerados
}

/**
 * Inicia proceso ETL
 */
export async function iniciarProcesoEtl(
  supabase: any,
  nombreFuncion: string,
  categoria: string
): Promise<string> {
  const { data: proceso, error: procesoError } = await supabase
    .rpc('iniciar_proceso_etl', {
      p_nombre: nombreFuncion,
      p_tipo_proceso: 'extraccion',
      p_descripcion: `Extracción de Bases Curriculares para ${categoria} desde curriculumnacional.cl`,
      p_configuracion: JSON.stringify({
        categoria,
        tipo_funcion: 'categoria_individual',
      }),
    })

  if (procesoError) {
    throw new Error(`Error creando proceso ETL: ${procesoError.message}`)
  }

  console.log(`📝 Proceso ETL creado: ${proceso}`)
  return proceso
}

/**
 * Finaliza proceso ETL exitoso
 */
export async function finalizarProcesoExitoso(
  supabase: any,
  procesoId: string,
  objetivos: ObjetivoAprendizaje[],
  archivosGenerados: any[],
  asignaturasProcesadas: number,
  persistencia: ResultadoPersistencia,
  startTime: number
): Promise<void> {
  await supabase.rpc('finalizar_proceso_etl', {
    p_proceso_id: procesoId,
    p_estado: 'completado',
    p_total_registros: objetivos.length,
    p_registros_exitosos: objetivos.length,
    p_registros_fallidos: 0,
    p_archivos_generados: JSON.stringify(archivosGenerados),
  })

  const duracionMs = Date.now() - startTime
  console.log(`\n${'='.repeat(60)}`)
  console.log('✅ EXTRACCIÓN COMPLETADA')
  console.log(`${'='.repeat(60)}`)
  console.log(`   📚 Asignaturas procesadas: ${asignaturasProcesadas}`)
  console.log(`   🎯 Total objetivos extraídos: ${objetivos.length}`)
  console.log(`   ⭐ Priorizados: ${objetivos.filter(o => o.priorizado === 1).length}`)
  console.log(`   ⏱️  Duración: ${duracionMs}ms`)
  console.log(`   💾 Persistencia: ${persistencia.objetivosNuevos} nuevos, ${persistencia.objetivosActualizados} actualizados, ${persistencia.objetivosSinCambios} sin cambios, ${persistencia.objetivosError} errores`)
}
