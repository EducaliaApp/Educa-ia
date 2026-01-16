// supabase/functions/analizar-portafolio-completo/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  crearClienteSupabase,
  autenticarUsuario,
  calcularPuntajePromedio,
  determinarCategoriaLogro,
  determinarNivelPredominante
} from '../shared/utils.ts'
import { IAEvaluator } from '../shared/ia-evaluator.ts'

serve(async (req) => {
  try {
    // 1. Autenticación
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header es requerido' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = crearClienteSupabase(authHeader)
    const user = await autenticarUsuario(supabase)
    
    // 2. Parsear request
    const { portafolio_id } = await req.json()
    
    if (!portafolio_id) {
      return new Response(
        JSON.stringify({ error: 'portafolio_id es requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // 3. Obtener portafolio
    const { data: portafolio, error: errorPortafolio } = await supabase
      .from('portafolios')
      .select(`
        *,
        modulos:modulos_portafolio(
          *,
          tareas:tareas_portafolio(
            *,
            analisis:analisis_ia_portafolio(*)
          )
        )
      `)
      .eq('id', portafolio_id)
      .eq('profesor_id', user.id) // Seguridad: solo su portafolio
      .single()
    
    if (errorPortafolio || !portafolio) {
      return new Response(
        JSON.stringify({ error: 'Portafolio no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // 4. Recopilar todos los análisis
    const todosAnalisis = []
    
    for (const modulo of portafolio.modulos) {
      for (const tarea of modulo.tareas) {
        if (tarea.analisis && tarea.analisis.length > 0) {
          // Tomar el análisis más reciente
          const analisisReciente = tarea.analisis.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
          
          todosAnalisis.push({
            modulo: modulo.numero_modulo,
            tarea: tarea.numero_tarea,
            nombre_tarea: tarea.nombre_tarea,
            puntaje: analisisReciente.puntaje_estimado,
            nivel: analisisReciente.nivel_desempeño,
            categoria: analisisReciente.categoria_logro,
            fecha_analisis: analisisReciente.created_at
          })
        }
      }
    }
    
    if (todosAnalisis.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No hay análisis disponibles aún',
          mensaje: 'Debes completar al menos una tarea y analizarla'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // 5. Calcular puntajes por módulo
    const puntajeModulo1 = calcularPuntajePromedio(
      todosAnalisis.filter(a => a.modulo === 1)
    )
    
    const puntajeModulo2 = calcularPuntajePromedio(
      todosAnalisis.filter(a => a.modulo === 2)
    )
    
    const puntajeModulo3 = calcularPuntajePromedio(
      todosAnalisis.filter(a => a.modulo === 3)
    )
    
    // 6. Puntaje final ponderado
    // Según sistema oficial: Módulo 1 y 2 tienen mayor peso
    const puntajeFinalPonderado = (
      puntajeModulo1 * 0.4 +  // 40%
      puntajeModulo2 * 0.4 +  // 40%
      puntajeModulo3 * 0.2    // 20%
    )
    
    const categoriaFinal = determinarCategoriaLogro(puntajeFinalPonderado)
    
    // 7. Análisis comparativo
    const iaEvaluator = new IAEvaluator()
    
    // Obtener estadísticas agregadas
    const { data: statsGlobales } = await supabase
      .from('estadisticas_indicadores')
      .select('promedio_puntaje')
      .eq('nivel_educativo', portafolio.nivel_educativo)
      .eq('asignatura', portafolio.asignatura)
      .eq('año_evaluacion', portafolio.año_evaluacion)
    
    const promedioNacional = statsGlobales && statsGlobales.length > 0
      ? statsGlobales.reduce((sum: number, s: any) => sum + (s.promedio_puntaje || 0), 0) / statsGlobales.length
      : null
    
    // 8. Generar informe narrativo
    const informeComparativo = promedioNacional 
      ? await iaEvaluator.generarAnalisisComparativo(
          { puntaje: puntajeFinalPonderado, categoria: categoriaFinal },
          { promedio: promedioNacional }
        )
      : "Aún no hay suficientes datos para comparación nacional."
    
    // 9. Identificar fortalezas y oportunidades
    const fortalezas = todosAnalisis
      .filter(a => a.puntaje >= 3.5)
      .map(a => a.nombre_tarea)
    
    const oportunidades = todosAnalisis
      .filter(a => a.puntaje < 3.0)
      .map(a => ({
        tarea: a.nombre_tarea,
        puntaje: a.puntaje,
        gap: (3.5 - a.puntaje).toFixed(1)
      }))
      .sort((a, b) => parseFloat(b.gap) - parseFloat(a.gap))
    
    // 10. Proyección de tramo
    let tramoProyectado = "Sin información"
    if (puntajeFinalPonderado >= 3.5) tramoProyectado = "Experto I o II"
    else if (puntajeFinalPonderado >= 3.0) tramoProyectado = "Avanzado"
    else if (puntajeFinalPonderado >= 2.5) tramoProyectado = "Competente"
    else tramoProyectado = "Inicial o en desarrollo"
    
    // 11. Actualizar portafolio
    await supabase
      .from('portafolios')
      .update({
        puntaje_estimado_ia: puntajeFinalPonderado,
        categoria_logro: categoriaFinal,
        nivel_desempeño_estimado: categoriaFinal === 'A' ? 'Destacado' : 
                                   categoriaFinal === 'B' || categoriaFinal === 'C' ? 'Competente' :
                                   categoriaFinal === 'D' ? 'Básico' : 'Insatisfactorio',
        updated_at: new Date().toISOString()
      })
      .eq('id', portafolio_id)
    
    // 12. Responder
    return new Response(
      JSON.stringify({
        success: true,
        portafolio_id,
        resumen_ejecutivo: {
          puntaje_final: Number(puntajeFinalPonderado.toFixed(1)),
          categoria_logro: categoriaFinal,
          tramo_proyectado: tramoProyectado,
          promedio_nacional: promedioNacional ? Number(promedioNacional.toFixed(2)) : null,
          posicion_relativa: promedioNacional 
            ? puntajeFinalPonderado > promedioNacional ? "Sobre el promedio" : "Bajo el promedio"
            : null
        },
        puntajes_por_modulo: {
          modulo_1: Number(puntajeModulo1.toFixed(1)),
          modulo_2: Number(puntajeModulo2.toFixed(1)),
          modulo_3: Number(puntajeModulo3.toFixed(1))
        },
        analisis_tareas: todosAnalisis,
        fortalezas,
        oportunidades_mejora: oportunidades.slice(0, 3),
        informe_comparativo: informeComparativo,
        progreso: {
          tareas_completadas: todosAnalisis.length,
          tareas_totales: 5,
          porcentaje: Math.round((todosAnalisis.length / 5) * 100)
        },
        siguiente_paso: oportunidades.length > 0
          ? `Prioriza mejorar: ${oportunidades[0].tarea} (impacto potencial: +${oportunidades[0].gap} puntos)`
          : "¡Excelente trabajo! Revisa los detalles de cada indicador para perfeccionar tu portafolio."
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('Error en analizar-portafolio-completo:', error)
    
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