/**
 * Edge Function para extraer Bases Curriculares de Formación Diferenciada Artística 3° a 4° Medio
 *
 * Esta función extrae específicamente los datos de:
 * https://www.curriculumnacional.cl/recursos/terminales-formacion-diferenciada-artistica-3-4-medio-0
 */

import { crearClienteServicio, UnauthorizedError } from '../../shared/service-auth.ts'
import {
  extraerObjetivosCategoria,
  persistirObjetivosEnBD,
  generarYSubirArchivos,
  iniciarProcesoEtl,
  finalizarProcesoExitoso,
} from '../extraer-bases-curriculares/shared/procesador-categoria.ts'

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}

const CATEGORY_URL = 'https://www.curriculumnacional.cl/recursos/terminales-formacion-diferenciada-artistica-3-4-medio-0'
const CATEGORY_NAME = 'Formación Diferenciada Artística 3° a 4° Medio'
const FUNCTION_NAME = 'extraer_bases_curriculares_diferenciada_artistica_3_4_medio'

async function handler(req: Request): Promise<Response> {
  const startTime = Date.now()

  try {
    console.log(`🚀 Iniciando extracción de Bases Curriculares - ${CATEGORY_NAME}...`)

    const supabase = crearClienteServicio(req)
    const requestBody = await req.json().catch(() => ({}))
    const { persist_db = true, generate_files = true } = requestBody

    console.log('📊 Configuración:')
    console.log(`  - Categoría: ${CATEGORY_NAME}`)
    console.log(`  - Persistir a BD: ${persist_db ? 'SÍ' : 'NO'}`)
    console.log(`  - Generar archivos: ${generate_files ? 'SÍ' : 'NO'}`)

    const procesoId = await iniciarProcesoEtl(supabase, FUNCTION_NAME, CATEGORY_NAME)
    const resultado = await extraerObjetivosCategoria(supabase, procesoId, CATEGORY_URL)
    const persistencia = await persistirObjetivosEnBD(supabase, procesoId, resultado.objetivos, persist_db)
    const archivosGenerados = await generarYSubirArchivos(supabase, procesoId, resultado.objetivos, resultado.categoria, generate_files, resultado.asignaturasProcesadas)
    await finalizarProcesoExitoso(supabase, procesoId, resultado.objetivos, archivosGenerados, resultado.asignaturasProcesadas, persistencia, startTime)

    const duracionMs = Date.now() - startTime

    return new Response(
      JSON.stringify({
        success: true,
        proceso_id: procesoId,
        categoria: resultado.categoria,
        archivos: archivosGenerados,
        configuracion: { persist_db, generate_files },
        estadisticas: {
          asignaturas_procesadas: resultado.asignaturasProcesadas,
          total_objetivos: resultado.objetivos.length,
          objetivos_priorizados: resultado.objetivos.filter(o => o.priorizado === 1).length,
          objetivos_contenido: resultado.objetivos.filter(o => o.tipo_objetivo === 'contenido').length,
          objetivos_habilidades: resultado.objetivos.filter(o => o.tipo_objetivo === 'habilidad').length,
          objetivos_actitudes: resultado.objetivos.filter(o => o.tipo_objetivo === 'actitud').length,
          duracion_ms: duracionMs,
          tracking: persist_db ? {
            objetivos_nuevos: persistencia.objetivosNuevos,
            objetivos_actualizados: persistencia.objetivosActualizados,
            objetivos_sin_cambios: persistencia.objetivosSinCambios,
            objetivos_error: persistencia.objetivosError,
          } : null,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
    console.error(`❌ Error en extracción de ${CATEGORY_NAME}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return new Response(JSON.stringify({ error: `Error en extracción de bases curriculares - ${CATEGORY_NAME}`, details: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

Deno.serve(handler)
