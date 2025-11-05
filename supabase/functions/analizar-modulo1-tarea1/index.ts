// supabase/functions/analizar-modulo1-tarea1/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { RubricasEngine } from '../shared/rubricas-engine.ts'
import { IAEvaluator } from '../shared/ia-evaluator.ts'
import {
  crearClienteSupabase,
  autenticarUsuario,
  recuperarRubricasRelevantes,
  guardarEvaluacion,
  calcularCosto,
  calcularPuntajePromedio,
  determinarCategoriaLogro,
  determinarNivelPredominante,
  obtenerEstadisticas,
  calcularPercentil
} from '../shared/utils.ts'

serve(async (req) => {
  try {
    const startTime = Date.now()
    
    // 1. Autenticación
    const authHeader = req.headers.get('Authorization')!
    const supabase = crearClienteSupabase(authHeader)
    const user = await autenticarUsuario(supabase)
    
    // 2. Parsear request
    const { 
      tarea_id,
      modelo = 'claude-sonnet-4'
    } = await req.json()
    
    if (!tarea_id) {
      return new Response(
        JSON.stringify({ error: 'tarea_id es requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // 3. Obtener tarea y contexto
    const { data: tarea, error: errorTarea } = await supabase
      .from('tareas_portafolio')
      .select(`
        *,
        modulo:modulos_portafolio(
          *,
          portafolio:portafolios(*)
        )
      `)
      .eq('id', tarea_id)
      .single()
    
    if (errorTarea || !tarea) {
      return new Response(
        JSON.stringify({ error: 'Tarea no encontrada' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // 4. Validar que sea Módulo 1, Tarea 1
    if (tarea.modulo.numero_modulo !== 1 || tarea.numero_tarea !== 1) {
      return new Response(
        JSON.stringify({ 
          error: 'Esta función solo analiza Módulo 1, Tarea 1 (Planificación de la enseñanza)'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const portafolio = tarea.modulo.portafolio
    
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
    
    console.log(`✓ Recuperadas ${rubricas.length} rúbricas para evaluar`)
    
    // 6. Inicializar motores
    const rubricasEngine = new RubricasEngine()
    const iaEvaluator = new IAEvaluator()
    
    // 7. Evaluar cada indicador
    const evaluaciones = []
    let tokensTotal = 0
    
    for (const rubrica of rubricas) {
      console.log(`Evaluando indicador: ${rubrica.nombre_indicador}`)
      
      const evaluacion = await rubricasEngine.evaluarIndicador(
        rubrica,
        {
          tarea_id: tarea.id,
          modulo: 1,
          numero_tarea: 1,
          contenido: tarea.contenido
        },
        iaEvaluator
      )
      
      // Agregar estadísticas comparativas si existen
      const stats = await obtenerEstadisticas(
        supabase,
        rubrica.indicador_id,
        portafolio.nivel_educativo,
        portafolio.asignatura,
        portafolio.año_evaluacion
      )
      
      if (stats) {
        evaluacion.promedio_nacional = stats.promedio_puntaje
        evaluacion.percentil = calcularPercentil(evaluacion.puntaje, stats)
      }
      
      evaluaciones.push(evaluacion)
      tokensTotal += evaluacion.tokens_usados
      
      console.log(`  → ${evaluacion.nivel_alcanzado} (${evaluacion.puntaje} pts)`)
    }
    
    // 8. Calcular resumen general
    const puntajePromedio = calcularPuntajePromedio(evaluaciones)
    const categoriaLogro = determinarCategoriaLogro(puntajePromedio)
    const nivelPredominante = determinarNivelPredominante(evaluaciones)
    
    // 9. Priorizar recomendaciones
    const recomendaciones = await iaEvaluator.priorizarRecomendaciones(
      evaluaciones,
      3.5 // Meta: Destacado
    )
    
    // 10. Calcular costos
    const latenciaTotal = Date.now() - startTime
    const costoUsd = calcularCosto(modelo, tokensTotal * 0.6, tokensTotal * 0.4) // Estimación 60/40
    
    // 11. Preparar metadata
    const metadata = {
      modelo,
      tokens_prompt: Math.floor(tokensTotal * 0.6),
      tokens_completion: Math.floor(tokensTotal * 0.4),
      costo_usd: costoUsd,
      latencia_ms: latenciaTotal,
      puntaje_promedio: puntajePromedio,
      categoria_logro: categoriaLogro,
      nivel_predominante: nivelPredominante,
      resumen: `Evaluación de Módulo 1, Tarea 1 completada. Puntaje promedio: ${puntajePromedio}/4.0 (${categoriaLogro}). Nivel predominante: ${nivelPredominante}.`,
      recomendaciones
    }
    
    // 12. Guardar en base de datos
    const analisisId = await guardarEvaluacion(
      supabase,
      tarea_id,
      evaluaciones,
      metadata
    )
    
    console.log(`✓ Análisis guardado con ID: ${analisisId}`)
    
    // 13. Actualizar progreso del portafolio
    await supabase.rpc('calcular_progreso_portafolio', {
      p_portafolio_id: portafolio.id
    })
    
    // 14. Actualizar métricas de uso
    await supabase.rpc('incrementar_metricas_uso', {
      p_profesor_id: user.id,
      p_fecha: new Date().toISOString().split('T')[0],
      analisis_planificacion: 1,
      tokens_usados: tokensTotal,
      costo_usd: costoUsd
    })
    
    // 15. Actualizar estadísticas de indicadores (async, no bloqueante)
    for (const evaluacion of evaluaciones) {
      supabase.rpc('actualizar_estadisticas_indicador', {
        p_indicador_id: evaluacion.indicador_id,
        p_nivel_educativo: portafolio.nivel_educativo,
        p_asignatura: portafolio.asignatura,
        p_año: portafolio.año_evaluacion
      }).then(() => {
        console.log(`✓ Stats actualizadas para ${evaluacion.indicador_id}`)
      }).catch(err => {
        console.error(`Error actualizando stats: ${err}`)
      })
    }
    
    // 16. Responder
    return new Response(
      JSON.stringify({
        success: true,
        analisis_id: analisisId,
        resumen: {
          puntaje_promedio: puntajePromedio,
          categoria_logro: categoriaLogro,
          nivel_predominante: nivelPredominante,
          indicadores_evaluados: evaluaciones.length
        },
        indicadores: evaluaciones,
        recomendaciones: recomendaciones.slice(0, 5), // Top 5
        metadata: {
          modelo,
          tokens_usados: tokensTotal,
          latencia_ms: latenciaTotal,
          costo_usd: costoUsd,
          año_evaluacion: portafolio.año_evaluacion
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('Error en analizar-modulo1-tarea1:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        details: error.message,
        stack: Deno.env.get('ENVIRONMENT') === 'development' ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})