// supabase/functions/analizar-modulo1-tarea3/index.ts

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
    
    // 3. Obtener tarea
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
    
    // 4. Validar que sea Módulo 1, Tarea 3
    if (tarea.modulo.numero_modulo !== 1 || tarea.numero_tarea !== 3) {
      return new Response(
        JSON.stringify({ 
          error: 'Esta función solo analiza Módulo 1, Tarea 3 (Reflexión socioemocional)'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const portafolio = tarea.modulo.portafolio
    
    // 5. Recuperar rúbricas
    const rubricas = await recuperarRubricasRelevantes(
      supabase,
      1, // Módulo
      3, // Tarea
      portafolio.nivel_educativo,
      portafolio.asignatura,
      portafolio.año_evaluacion,
      portafolio.modalidad || 'regular'
    )
    
    console.log(`✓ Recuperadas ${rubricas.length} rúbricas para Tarea 3`)
    
    // NOTA IMPORTANTE: Según el manual, esta tarea solo se considera 
    // en el puntaje final si BENEFICIA al docente
    
    // 6. Inicializar motores
    const rubricasEngine = new RubricasEngine()
    const iaEvaluator = new IAEvaluator()
    
    // 7. Evaluar indicadores
    const evaluaciones = []
    let tokensTotal = 0
    
    for (const rubrica of rubricas) {
      console.log(`Evaluando indicador: ${rubrica.nombre_indicador}`)
      
      const evaluacion = await rubricasEngine.evaluarIndicador(
        rubrica,
        {
          tarea_id: tarea.id,
          modulo: 1,
          numero_tarea: 3,
          contenido: tarea.contenido
        },
        iaEvaluator
      )
      
      // Estadísticas comparativas
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
    
    // 8. Calcular resumen
    const puntajePromedio = calcularPuntajePromedio(evaluaciones)
    const categoriaLogro = determinarCategoriaLogro(puntajePromedio)
    const nivelPredominante = determinarNivelPredominante(evaluaciones)
    
    // 9. Determinar si beneficia al puntaje final
    // Para esto necesitamos el promedio de las otras tareas del Módulo 1
    const { data: otrasTareas } = await supabase
      .from('analisis_ia_portafolio')
      .select('puntaje_estimado')
      .in('tarea_id', [
        // Buscar otras tareas del mismo módulo
      ])
      .limit(10)
    
    const promedioOtrasTareas = otrasTareas && otrasTareas.length > 0
      ? otrasTareas.reduce((sum, t) => sum + (t.puntaje_estimado || 0), 0) / otrasTareas.length
      : 0
    
    const beneficia = puntajePromedio > promedioOtrasTareas
    
    // 10. Recomendaciones
    const recomendaciones = await iaEvaluator.priorizarRecomendaciones(
      evaluaciones,
      3.5
    )
    
    // 11. Costos
    const latenciaTotal = Date.now() - startTime
    const costoUsd = calcularCosto(modelo, tokensTotal * 0.6, tokensTotal * 0.4)
    
    // 12. Metadata
    const metadata = {
      modelo,
      tokens_prompt: Math.floor(tokensTotal * 0.6),
      tokens_completion: Math.floor(tokensTotal * 0.4),
      costo_usd: costoUsd,
      latencia_ms: latenciaTotal,
      puntaje_promedio: puntajePromedio,
      categoria_logro: categoriaLogro,
      nivel_predominante: nivelPredominante,
      beneficia_puntaje_final: beneficia,
      resumen: `Evaluación de Tarea 3 (Reflexión socioemocional) completada. Puntaje: ${puntajePromedio}/4.0. ${beneficia ? '✅ BENEFICIA tu puntaje final' : '⚠️ No mejora tu promedio actual'}.`,
      recomendaciones
    }
    
    // 13. Guardar
    const analisisId = await guardarEvaluacion(
      supabase,
      tarea_id,
      evaluaciones,
      metadata
    )
    
    // 14. Actualizar progreso
    await supabase.rpc('calcular_progreso_portafolio', {
      p_portafolio_id: portafolio.id
    })
    
    // 15. Métricas
    await supabase.rpc('incrementar_metricas_uso', {
      p_profesor_id: user.id,
      p_fecha: new Date().toISOString().split('T')[0],
      analisis_reflexion: 1,
      tokens_usados: tokensTotal,
      costo_usd: costoUsd
    })
    
    // 16. Responder
    return new Response(
      JSON.stringify({
        success: true,
        analisis_id: analisisId,
        resumen: {
          puntaje_promedio: puntajePromedio,
          categoria_logro: categoriaLogro,
          nivel_predominante: nivelPredominante,
          beneficia_puntaje_final: beneficia,
          indicadores_evaluados: evaluaciones.length
        },
        indicadores: evaluaciones,
        recomendaciones: recomendaciones.slice(0, 5),
        nota_importante: beneficia 
          ? "✅ Esta tarea BENEFICIA tu puntaje final. Se incluirá en el cálculo."
          : "⚠️ Esta tarea no mejora tu promedio actual. No se incluirá en el puntaje final (según manual oficial).",
        metadata: {
          modelo,
          tokens_usados: tokensTotal,
          latencia_ms: latenciaTotal,
          costo_usd: costoUsd
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('Error en analizar-modulo1-tarea3:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})