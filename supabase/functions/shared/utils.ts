// supabase/functions/shared/utils.ts

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function crearClienteSupabase(authHeader: string | null): SupabaseClient {
  if (!authHeader) {
    throw new Error('Authorization header es requerido')
  }
  
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { 
      global: { 
        headers: { Authorization: authHeader } 
      } 
    }
  )
}

export async function autenticarUsuario(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('No autorizado')
  }
  
  return user
}

export function calcularCosto(
  modelo: string,
  promptTokens: number,
  completionTokens: number
): number {
  const PRECIOS: Record<string, { input: number; output: number }> = {
    'gpt-4-turbo-preview': { input: 0.01 / 1000, output: 0.03 / 1000 },
    'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
    'claude-sonnet-4-20250514': { input: 0.003 / 1000, output: 0.015 / 1000 },
  }
  
  const precio = PRECIOS[modelo] || PRECIOS['gpt-4-turbo-preview']
  
  return (promptTokens * precio.input) + (completionTokens * precio.output)
}

export async function recuperarRubricasRelevantes(
  supabase: SupabaseClient,
  modulo: number,
  tarea: number,
  nivelEducativo: string,
  asignatura: string,
  año: number,
  modalidad: string = 'regular'
): Promise<any[]> {
  
  const { data, error } = await supabase
    .from('rubricas_mbe')
    .select('*')
    .eq('nivel_educativo', nivelEducativo)
    .eq('asignatura', asignatura)
    .eq('año_vigencia', año)
    .eq('modalidad', modalidad)
    .eq('modulo', modulo)
    .eq('tarea', tarea)
    .order('peso_ponderacion', { ascending: false })
  
  if (error) {
    console.error('Error recuperando rúbricas:', error)
    throw new Error('Error al recuperar rúbricas')
  }
  
  if (!data || data.length === 0) {
    throw new Error(`No se encontraron rúbricas para: ${nivelEducativo}, ${asignatura}, Módulo ${modulo}, Tarea ${tarea}`)
  }
  
  return data
}

export async function guardarEvaluacion(
  supabase: SupabaseClient,
  tareaId: string,
  evaluaciones: any[],
  metadata: any
): Promise<string> {
  
  // 1. Guardar análisis general
  const { data: analisisGuardado, error: errorAnalisis } = await supabase
    .from('analisis_ia_portafolio')
    .insert({
      tarea_id: tareaId,
      modelo_usado: metadata.modelo,
      prompt_tokens: metadata.tokens_prompt,
      completion_tokens: metadata.tokens_completion,
      costo_usd: metadata.costo_usd,
      latencia_ms: metadata.latencia_ms,
      analisis: {
        indicadores_evaluados: evaluaciones,
        resumen: metadata.resumen,
        recomendaciones: metadata.recomendaciones
      },
      tipo_analisis: 'inicial',
      version: 1,
      puntaje_estimado: metadata.puntaje_promedio,
      categoria_logro: metadata.categoria_logro,
      nivel_desempeno: metadata.nivel_predominante
    })
    .select()
    .single()
  
  if (errorAnalisis) {
    throw new Error(`Error guardando análisis: ${errorAnalisis.message}`)
  }
  
  // 2. Guardar evaluaciones individuales por indicador
  const evaluacionesConAnalisisId = evaluaciones.map(ev => ({
    ...ev,
    analisis_id: analisisGuardado.id
  }))
  
  const { error: errorIndicadores } = await supabase
    .from('evaluaciones_indicador')
    .insert(evaluacionesConAnalisisId)
  
  if (errorIndicadores) {
    console.error('Error guardando evaluaciones de indicadores:', errorIndicadores)
  }
  
  return analisisGuardado.id
}

export function calcularPuntajePromedio(evaluaciones: any[]): number {
  if (evaluaciones.length === 0) return 0
  
  const suma = evaluaciones.reduce((acc, ev) => acc + ev.puntaje, 0)
  return Number((suma / evaluaciones.length).toFixed(1))
}

export function determinarCategoriaLogro(puntaje: number): string {
  if (puntaje >= 3.5) return 'A' // Destacado
  if (puntaje >= 3.0) return 'B' // Competente Alto
  if (puntaje >= 2.5) return 'C' // Competente
  if (puntaje >= 2.0) return 'D' // Básico
  return 'E' // Insuficiente
}

export function determinarNivelPredominante(evaluaciones: any[]): string {
  const conteo = {
    'Destacado': 0,
    'Competente': 0,
    'Básico': 0,
    'Insatisfactorio': 0
  }
  
  evaluaciones.forEach(ev => {
    conteo[ev.nivel_alcanzado]++
  })
  
  return Object.entries(conteo)
    .sort(([,a], [,b]) => b - a)[0][0]
}

export async function obtenerEstadisticas(
  supabase: SupabaseClient,
  indicadorId: string,
  nivelEducativo: string,
  asignatura: string,
  año: number
): Promise<any> {
  
  const { data, error } = await supabase
    .from('estadisticas_indicadores')
    .select('*')
    .eq('indicador_id', indicadorId)
    .eq('nivel_educativo', nivelEducativo)
    .eq('asignatura', asignatura)
    .eq('año_evaluacion', año)
    .single()
  
  if (error || !data) {
    return null // No hay estadísticas aún
  }
  
  return data
}

export function calcularPercentil(puntaje: number, stats: any): number {
  if (!stats) return 50 // Default
  
  // Interpolación lineal entre percentiles
  if (puntaje >= stats.percentil_90) return 90
  if (puntaje >= stats.percentil_75) return 75
  if (puntaje >= stats.percentil_50) return 50
  if (puntaje >= stats.percentil_25) return 25
  return 10
}