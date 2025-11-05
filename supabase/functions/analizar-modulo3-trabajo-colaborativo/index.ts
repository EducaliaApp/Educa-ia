// supabase/functions/analizar-modulo3-trabajo-colaborativo/index.ts

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
      modelo = 'claude-sonnet-4',
      evaluar_parte_voluntaria = false // El profesor indica si completó voluntaria
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
    
    // 4. Validar que sea Módulo 3, Tarea 5
    if (tarea.modulo.numero_modulo !== 3 || tarea.numero_tarea !== 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Esta función solo analiza Módulo 3, Tarea 5 (Trabajo colaborativo)'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const portafolio = tarea.modulo.portafolio
    
    // 5. Recuperar rúbricas
    // Módulo 3 tiene indicadores obligatorios y voluntarios
    const todasRubricas = await recuperarRubricasRelevantes(
      supabase,
      3, // Módulo
      5, // Tarea
      portafolio.nivel_educativo,
      portafolio.asignatura,
      portafolio.año_evaluacion,
      portafolio.modalidad || 'regular'
    )
    
    // Separar obligatorias de voluntarias
    const rubricasObligatorias = todasRubricas.filter(r => r.obligatorio === true)
    const rubricasVoluntarias = todasRubricas.filter(r => r.obligatorio === false)
    
    console.log(`✓ ${rubricasObligatorias.length} rúbricas obligatorias`)
    console.log(`✓ ${rubricasVoluntarias.length} rúbricas voluntarias`)
    
    // 6. Determinar qué evaluar
    const rubricasEvaluar = evaluar_parte_voluntaria 
      ? [...rubricasObligatorias, ...rubricasVoluntarias]
      : rubricasObligatorias
    
    console.log(`Evaluando ${rubricasEvaluar.length} indicadores`)
    
    // 7. Inicializar motores
    const rubricasEngine = new RubricasEngine()
    const iaEvaluator = new IAEvaluator()
    
    // 8. Evaluar indicadores
    const evaluaciones = []
    let tokensTotal = 0
    
    for (const rubrica of rubricasEvaluar) {
      console.log(`Evaluando: ${rubrica.nombre_indicador} ${rubrica.obligatorio ? '[OBL]' : '[VOL]'}`)
      
      const evaluacion = await rubricasEngine.evaluarIndicador(
        rubrica,
        {
          tarea_id: tarea.id,
          modulo: 3,
          numero_tarea: 5,
          contenido: tarea.contenido
        },
        iaEvaluator
      )
      
      // Marcar si es voluntaria
      evaluacion.es_voluntaria = !rubrica.obligatorio
      
      // Estadísticas
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
    
    // 9. Calcular puntajes por separado
    const evaluacionesObligatorias = evaluaciones.filter(e => !e.es_voluntaria)
    const evaluacionesVoluntarias = evaluaciones.filter(e => e.es_voluntaria)
    
    const puntajeObligatorio = calcularPuntajePromedio(evaluacionesObligatorias)
    const puntajeVoluntario = evaluacionesVoluntarias.length > 0 
      ? calcularPuntajePromedio(evaluacionesVoluntarias)
      : null
    
    // 10. Determinar si parte voluntaria beneficia
    const beneficiaVoluntaria = puntajeVoluntario && puntajeVoluntario > puntajeObligatorio
    
    // 11. Calcular puntaje final del módulo
    const puntajeFinal = beneficiaVoluntaria 
      ? (puntajeObligatorio + puntajeVoluntario) / 2 // Promedio de ambas partes
      : puntajeObligatorio // Solo obligatoria
    
    const categoriaLogro = determinarCategoriaLogro(puntajeFinal)
    const nivelPredominante = determinarNivelPredominante(evaluacionesObligatorias)
    
    // 12. Recomendaciones
    const recomendaciones = await iaEvaluator.priorizarRecomendaciones(
      evaluaciones,
      3.5
    )
    
    // 13. Análisis de impacto de parte voluntaria
    let mensajeVoluntaria = ""
    if (evaluar_parte_voluntaria) {
      if (beneficiaVoluntaria) {
        const mejora = puntajeFinal - puntajeObligatorio
        mensajeVoluntaria = `✅ La parte voluntaria BENEFICIA tu puntaje. Mejora: +${mejora.toFixed(1)} puntos`
      } else {
        mensajeVoluntaria = `⚠️ La parte voluntaria no mejora tu promedio. Se usará solo la parte obligatoria.`
      }
    } else {
      // Simular impacto potencial
      const puntajePotencialMax = (puntajeObligatorio + 4.0) / 2
      const mejoraPotencial = puntajePotencialMax - puntajeObligatorio
      mensajeVoluntaria = `💡 Si completas la parte voluntaria con nivel Destacado, podrías mejorar hasta +${mejoraPotencial.toFixed(1)} puntos`
    }
    
    // 14. Costos
    const latenciaTotal = Date.now() - startTime
    const costoUsd = calcularCosto(modelo, tokensTotal * 0.6, tokensTotal * 0.4)
    
    // 15. Metadata
    const metadata = {
      modelo,
      tokens_prompt: Math.floor(tokensTotal * 0.6),
      tokens_completion: Math.floor(tokensTotal * 0.4),
      costo_usd: costoUsd,
      latencia_ms: latenciaTotal,
      puntaje_promedio: puntajeFinal,
      categoria_logro: categoriaLogro,
      nivel_predominante: nivelPredominante,
      incluye_voluntaria: evaluar_parte_voluntaria,
      beneficia_voluntaria: beneficiaVoluntaria,
      resumen: `Evaluación de Módulo 3 (Trabajo colaborativo) completada. Puntaje: ${puntajeFinal.toFixed(1)}/4.0 (${categoriaLogro}). ${mensajeVoluntaria}`,
      recomendaciones
    }
    
    // 16. Guardar
    const analisisId = await guardarEvaluacion(
      supabase,
      tarea_id,
      evaluaciones,
      metadata
    )
    
    // 17. Actualizar progreso
    await supabase.rpc('calcular_progreso_portafolio', {
      p_portafolio_id: portafolio.id
    })
    
    // 18. Métricas
    await supabase.rpc('incrementar_metricas_uso', {
      p_profesor_id: user.id,
      p_fecha: new Date().toISOString().split('T')[0],
      analisis_trabajo_colaborativo: 1,
      tokens_usados: tokensTotal,
      costo_usd: costoUsd
    })
    
    // 19. Responder
    return new Response(
      JSON.stringify({
        success: true,
        analisis_id: analisisId,
        resumen: {
          puntaje_final: puntajeFinal,
          puntaje_obligatorio: puntajeObligatorio,
          puntaje_voluntario: puntajeVoluntario,
          categoria_logro: categoriaLogro,
          nivel_predominante: nivelPredominante,
          incluye_voluntaria: evaluar_parte_voluntaria,
          beneficia_voluntaria: beneficiaVoluntaria,
          indicadores_evaluados: evaluaciones.length
        },
        indicadores: {
          obligatorios: evaluacionesObligatorias,
          voluntarios: evaluacionesVoluntarias
        },
        recomendaciones: recomendaciones.slice(0, 5),
        mensaje_voluntaria: mensajeVoluntaria,
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
    console.error('Error en analizar-modulo3-trabajo-colaborativo:', error)
    
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