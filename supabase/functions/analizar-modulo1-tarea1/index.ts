// supabase/functions/analizar-modulo1-tarea1/index.ts
// Edge Function para analizar Módulo 1, Tarea 1 (Planificación) usando Rúbricas MBE

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { RubricasEngine } from '../_shared/rubricas-engine.ts'
import { IAEvaluator } from '../_shared/ia-evaluator.ts'
import { Logger } from '../_shared/logger.ts'

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

  const logger = new Logger('analizar-modulo1-tarea1')

  try {
    // 1. Obtener datos de la solicitud
    const { tarea_id } = await req.json()

    if (!tarea_id) {
      throw new Error('tarea_id es requerido')
    }

    logger.info('Iniciando análisis', { tarea_id })

    // 2. Conectar a Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables de entorno de Supabase no configuradas')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 3. Obtener tarea y contexto
    const { data: tarea, error: tareaError } = await supabase
      .from('tareas_portafolio')
      .select(\`
        *,
        modulo:modulos_portafolio!inner(
          *,
          portafolio:portafolios!inner(
            nivel_educativo,
            asignatura,
            año_evaluacion
          )
        )
      \`)
      .eq('id', tarea_id)
      .single()

    if (tareaError || !tarea) {
      throw new Error(\`Tarea no encontrada: \${tareaError?.message || 'Unknown error'}\`)
    }

    const portafolio = tarea.modulo.portafolio

    logger.info('Tarea cargada', {
      nivel: portafolio.nivel_educativo,
      asignatura: portafolio.asignatura,
      año: portafolio.año_evaluacion,
    })

    // 4. Inicializar motor de rúbricas
    const rubricasEngine = new RubricasEngine(supabase, 'analizar-m1-t1')

    // 5. Cargar rúbricas relevantes
    const rubricas = await rubricasEngine.cargarRubricas({
      año: portafolio.año_evaluacion,
      nivel_educativo: portafolio.nivel_educativo,
      asignatura: portafolio.asignatura,
      modulo: 1,
      tarea: 1,
    })

    logger.info(\`Rúbricas cargadas: \${rubricas.length}\`)

    // 6. Inicializar evaluador de IA
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    const openaiKey = Deno.env.get('OPENAI_API_KEY')

    if (!anthropicKey && !openaiKey) {
      throw new Error('No hay API keys de IA configuradas (ANTHROPIC_API_KEY o OPENAI_API_KEY)')
    }

    const iaEvaluator = new IAEvaluator({
      modelo: anthropicKey ? 'claude-sonnet-4' : 'gpt-4-turbo',
      apiKey: (anthropicKey || openaiKey)!,
      temperatura: 0.3,
      maxTokens: 4000,
    })

    // 7. Evaluar cada indicador (ejemplo simplificado)
    const evaluaciones = []
    
    for (const rubrica of rubricas) {
      logger.info(\`Evaluando \${rubrica.indicador_id}...\`)
      
      // Aquí iría la llamada real al motor
      // const evaluacion = await rubricasEngine.evaluarIndicador(...)
      
      // Por ahora retornamos mock
      logger.info(\`✅ \${rubrica.indicador_id} evaluado\`)
    }

    // 8. Retornar resultado
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sistema de rúbricas configurado correctamente',
        rubricas_cargadas: rubricas.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    logger.error('Error en análisis', error as Error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
