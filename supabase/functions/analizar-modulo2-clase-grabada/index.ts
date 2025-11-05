// supabase/functions/analizar-modulo2-clase-grabada/index.ts

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
      incluir_transcripcion = true // Si ya se procesó el video
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
    
    // 4. Validar que sea Módulo 2, Tarea 4
    if (tarea.modulo.numero_modulo !== 2 || tarea.numero_tarea !== 4) {
      return new Response(
        JSON.stringify({ 
          error: 'Esta función solo analiza Módulo 2, Tarea 4 (Clase grabada)'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const portafolio = tarea.modulo.portafolio
    
    // 5. Obtener video y transcripción si existe
    let transcripcionVideo = null
    
    if (incluir_transcripcion) {
      const { data: video } = await supabase
        .from('videos_clase')
        .select('transcripcion, duracion_segundos, procesado')
        .eq('tarea_id', tarea_id)
        .single()
      
      if (video && video.procesado && video.transcripcion) {
        transcripcionVideo = video.transcripcion
        console.log(`✓ Transcripción de video disponible (${video.duracion_segundos}s)`)
      } else {
        console.log('⚠️ Video aún no procesado o sin transcripción')
      }
    }
    
    // 6. Recuperar rúbricas (Módulo 2 tiene ~7 indicadores)
    const rubricas = await recuperarRubricasRelevantes(
      supabase,
      2, // Módulo
      4, // Tarea
      portafolio.nivel_educativo,
      portafolio.asignatura,
      portafolio.año_evaluacion,
      portafolio.modalidad || 'regular'
    )
    
    console.log(`✓ Recuperadas ${rubricas.length} rúbricas para Módulo 2`)
    
    // 7. Preparar contenido enriquecido con transcripción
    const contenidoEnriquecido = {
      ...tarea.contenido,
      transcripcion_clase: transcripcionVideo
    }
    
    // 8. Inicializar motores
    const rubricasEngine = new RubricasEngine()
    const iaEvaluator = new IAEvaluator()
    
    // 9. Evaluar indicadores
    const evaluaciones = []
    let tokensTotal = 0
    
    for (const rubrica of rubricas) {
      console.log(`Evaluando indicador: ${rubrica.nombre_indicador}`)
      
      const evaluacion = await rubricasEngine.evaluarIndicador(
        rubrica,
        {
          tarea_id: tarea.id,
          modulo: 2,
          numero_tarea: 4,
          contenido: contenidoEnriquecido
        },
        iaEvaluator
      )
      
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
    
    // 10. Resumen
    const puntajePromedio = calcularPuntajePromedio(evaluaciones)
    const categoriaLogro = determinarCategoriaLogro(puntajePromedio)
    const nivelPredominante = determinarNivelPredominante(evaluaciones)
    
    // 11. Recomendaciones
    const recomendaciones = await iaEvaluator.priorizarRecomendaciones(
      evaluaciones,
      3.5
    )
    
    // 12. Análisis especial para clase grabada
    const indicadoresDestacados = evaluaciones
      .filter(e => e.nivel_alcanzado === 'Destacado')
      .map(e => e.nombre_indicador)
    
    const indicadoresMejorar = evaluaciones
      .filter(e => e.nivel_alcanzado === 'Básico' || e.nivel_alcanzado === 'Insatisfactorio')
      .map(e => e.nombre_indicador)
    
    // 13. Costos
    const latenciaTotal = Date.now() - startTime
    const costoUsd = calcularCosto(modelo, tokensTotal * 0.6, tokensTotal * 0.4)
    
    // 14. Metadata
    const metadata = {
      modelo,
      tokens_prompt: Math.floor(tokensTotal * 0.6),
      tokens_completion: Math.floor(tokensTotal * 0.4),
      costo_usd: costoUsd,
      latencia_ms: latenciaTotal,
      puntaje_promedio: puntajePromedio,
      categoria_logro: categoriaLogro,
      nivel_predominante: nivelPredominante,
      con_transcripcion: !!transcripcionVideo,
      resumen: `Evaluación de Módulo 2 (Clase grabada) completada. Puntaje: ${puntajePromedio}/4.0 (${categoriaLogro}). ${indicadoresDestacados.length} indicadores destacados.`,
      recomendaciones
    }
    
    // 15. Guardar
    const analisisId = await guardarEvaluacion(
      supabase,
      tarea_id,
      evaluaciones,
      metadata
    )
    
    // 16. Actualizar progreso
    await supabase.rpc('calcular_progreso_portafolio', {
      p_portafolio_id: portafolio.id
    })
    
    // 17. Métricas
    await supabase.rpc('incrementar_metricas_uso', {
      p_profesor_id: user.id,
      p_fecha: new Date().toISOString().split('T')[0],
      analisis_clase_grabada: 1,
      tokens_usados: tokensTotal,
      costo_usd: costoUsd
    })
    
    // 18. Responder
    return new Response(
      JSON.stringify({
        success: true,
        analisis_id: analisisId,
        resumen: {
          puntaje_promedio: puntajePromedio,
          categoria_logro: categoriaLogro,
          nivel_predominante: nivelPredominante,
          indicadores_evaluados: evaluaciones.length,
          indicadores_destacados: indicadoresDestacados,
          indicadores_mejorar: indicadoresMejorar
        },
        indicadores: evaluaciones,
        recomendaciones: recomendaciones.slice(0, 5),
        nota: transcripcionVideo 
          ? "✅ Análisis incluye transcripción de video"
          : "⚠️ Análisis basado solo en ficha descriptiva (video no procesado)",
        metadata: {
          modelo,
          tokens_usados: tokensTotal,
          latencia_ms: latenciaTotal,
          costo_usd: costoUsd,
          con_transcripcion: !!transcripcionVideo
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('Error en analizar-modulo2-clase-grabada:', error)
    
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