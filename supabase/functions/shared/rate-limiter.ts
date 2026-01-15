// supabase/functions/shared/rate-limiter.ts
// Utilidades de rate limiting para Edge Functions

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface RateLimitConfig {
  maxRequests: number
  ventanaTiempoMinutos: number
}

export interface RateLimitResult {
  permitido: boolean
  requestsRestantes: number
  resetEn: Date
}

/**
 * Verifica si un usuario ha excedido el límite de requests
 * Usa la tabla metricas_uso_profesor para tracking
 */
export async function verificarRateLimit(
  supabase: SupabaseClient,
  userId: string,
  tipoOperacion: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const ahora = new Date()
  const ventanaInicio = new Date(ahora.getTime() - config.ventanaTiempoMinutos * 60 * 1000)
  
  // Obtener número de requests en la ventana de tiempo
  const { data: metricas, error } = await supabase
    .from('metricas_uso_profesor')
    .select('analisis_evaluacion, analisis_planificacion, generacion_planificacion')
    .eq('profesor_id', userId)
    .gte('fecha', ventanaInicio.toISOString().split('T')[0])
  
  if (error) {
    console.error('Error verificando rate limit:', error)
    // En caso de error, permitir (fail open)
    return {
      permitido: true,
      requestsRestantes: config.maxRequests,
      resetEn: new Date(ahora.getTime() + config.ventanaTiempoMinutos * 60 * 1000)
    }
  }
  
  // Contar requests según tipo de operación
  const totalRequests = metricas?.reduce((sum, m) => {
    if (tipoOperacion === 'analisis_evaluacion') return sum + (m.analisis_evaluacion || 0)
    if (tipoOperacion === 'analisis_planificacion') return sum + (m.analisis_planificacion || 0)
    if (tipoOperacion === 'generacion_planificacion') return sum + (m.generacion_planificacion || 0)
    return sum
  }, 0) || 0
  
  const permitido = totalRequests < config.maxRequests
  const requestsRestantes = Math.max(0, config.maxRequests - totalRequests)
  const resetEn = new Date(ventanaInicio.getTime() + config.ventanaTiempoMinutos * 60 * 1000)
  
  return {
    permitido,
    requestsRestantes,
    resetEn
  }
}

/**
 * Configuraciones predeterminadas de rate limiting por tipo de operación
 */
export const RateLimitPresets = {
  analisisEvaluacion: {
    maxRequests: 50,
    ventanaTiempoMinutos: 60
  },
  analisisPlanificacion: {
    maxRequests: 30,
    ventanaTiempoMinutos: 60
  },
  generacionPlanificacion: {
    maxRequests: 20,
    ventanaTiempoMinutos: 60
  },
  consultas: {
    maxRequests: 100,
    ventanaTiempoMinutos: 60
  }
}

/**
 * Respuesta de error cuando se excede el rate limit
 */
export function respuestaRateLimitExcedido(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Límite de requests excedido',
      codigo: 'RATE_LIMIT_EXCEEDED',
      detalles: {
        requests_restantes: result.requestsRestantes,
        reset_en: result.resetEn.toISOString()
      },
      timestamp: new Date().toISOString()
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': result.requestsRestantes.toString(),
        'X-RateLimit-Reset': result.resetEn.toISOString(),
        'Retry-After': Math.ceil((result.resetEn.getTime() - Date.now()) / 1000).toString()
      }
    }
  )
}
