// supabase/functions/analizar-modulo1-tarea1/index.ts
// Edge Function para analizar Módulo 1, Tarea 1 (Planificación) usando Rúbricas MBE

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { RubricasEngine } from '../shared/rubricas-engine.ts'
import { IAEvaluator } from '../shared/ia-evaluator.ts'
import {
  crearClienteSupabase,
  autenticarUsuario,
  recuperarRubricasRelevantes,
} from '../shared/utils.ts'
import { manejarError } from '../shared/error-handler.ts'
import { createLogger } from '../shared/logger.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Autenticar usuario
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header es requerido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Obtener datos de la solicitud
    const { tarea_id } = await req.json()

    if (!tarea_id) {
      throw new Error('tarea_id es requerido')
    }

    // 3. Conectar a Supabase con usuario autenticado
    const supabase = crearClienteSupabase(authHeader)
    const user = await autenticarUsuario(supabase)

    // Crear logger con contexto
    const logger = createLogger('analizar-modulo1-tarea1', supabase, crypto.randomUUID(), user.id)
    logger.info('Iniciando análisis', { tarea_id })

    // 4. Obtener tarea y contexto
    const { data: tarea, error: tareaError } = await supabase
      .from('tareas_portafolio')
      .select(`
        *,
        modulo:modulos_portafolio!inner(
          *,
          portafolio:portafolios!inner(
            nivel_educativo,
            asignatura,
            año_evaluacion
          )
        )
      `)
      .eq('id', tarea_id)
      .single()

    if (tareaError || !tarea) {
      throw new Error(`Tarea no encontrada: ${tareaError?.message || 'Unknown error'}`)
    }

    const portafolio = tarea.modulo.portafolio

    logger.info('Tarea cargada', {
      nivel: portafolio.nivel_educativo,
      asignatura: portafolio.asignatura,
      año: portafolio.año_evaluacion,
    })

    // 5. Recuperar rúbricas relevantes
    const rubricas = await recuperarRubricasRelevantes(
      supabase,
      1, // Módulo
      1, // Tarea
      portafolio.nivel_educativo,
      portafolio.asignatura,
      portafolio.año_evaluacion,
      portafolio.modalidad || 'regular'
    )

    logger.info(`Rúbricas cargadas: ${rubricas.length}`)

    // 6. Inicializar motores
    const rubricasEngine = new RubricasEngine()
    const iaEvaluator = new IAEvaluator()

    // 7. Evaluar cada indicador (implementación simplificada por ahora)
    const evaluaciones = []
    
    for (const rubrica of rubricas) {
      logger.info(`Evaluando ${rubrica.indicador_id}...`)
      
      // TODO: Implementar evaluación real usando rubricasEngine.evaluarIndicador
      // const evaluacion = await rubricasEngine.evaluarIndicador(rubrica, contenido, iaEvaluator)
      
      logger.info(`✅ ${rubrica.indicador_id} procesado`)
    }

    // 8. Retornar resultado
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sistema de rúbricas configurado correctamente',
        rubricas_cargadas: rubricas.length,
        nota: 'Evaluación completa pendiente de implementación'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error en análisis:', error)
    return manejarError(error)
  }
})
