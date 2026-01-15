// supabase/functions/shared/error-handler.ts
// Manejo estandarizado de errores para Edge Functions

export interface ErrorResponse {
  error: string
  codigo?: string
  detalles?: string
  timestamp: string
}

/**
 * Crea una respuesta de error estandarizada
 */
export function crearRespuestaError(
  error: Error | string,
  status: number = 500,
  codigo?: string
): Response {
  const mensaje = error instanceof Error ? error.message : error
  
  const errorResponse: ErrorResponse = {
    error: status === 500 ? 'Error interno del servidor' : mensaje,
    codigo,
    detalles: status === 500 ? undefined : mensaje,
    timestamp: new Date().toISOString()
  }
  
  // Log del error para debugging
  if (status === 500) {
    console.error('Error interno:', error)
  }
  
  return new Response(
    JSON.stringify(errorResponse),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Maneja errores conocidos y los convierte en respuestas apropiadas
 */
export function manejarError(error: unknown): Response {
  // Error de autenticación
  if (error instanceof Error) {
    if (error.message.includes('No autorizado') || error.message.includes('Unauthorized')) {
      return crearRespuestaError(error, 401, 'AUTH_ERROR')
    }
    
    if (error.message.includes('no encontrad') || error.message.includes('not found')) {
      return crearRespuestaError(error, 404, 'NOT_FOUND')
    }
    
    if (error.message.includes('requerido') || error.message.includes('required')) {
      return crearRespuestaError(error, 400, 'VALIDATION_ERROR')
    }
  }
  
  // Error genérico
  return crearRespuestaError(
    error instanceof Error ? error : 'Error desconocido',
    500,
    'INTERNAL_ERROR'
  )
}

/**
 * Wrapper para ejecutar funciones edge con manejo de errores consistente
 */
export async function conManejoDeErrores(
  handler: () => Promise<Response>
): Promise<Response> {
  try {
    return await handler()
  } catch (error) {
    return manejarError(error)
  }
}

/**
 * Respuestas de error comunes pre-formateadas
 */
export const ErroresComunes = {
  noAutorizado: (): Response => 
    crearRespuestaError('No autorizado', 401, 'UNAUTHORIZED'),
  
  authHeaderFaltante: (): Response =>
    crearRespuestaError('Authorization header es requerido', 401, 'AUTH_HEADER_MISSING'),
  
  recursoNoEncontrado: (recurso: string): Response =>
    crearRespuestaError(`${recurso} no encontrado`, 404, 'NOT_FOUND'),
  
  validacionFallida: (detalles: string): Response =>
    crearRespuestaError(detalles, 400, 'VALIDATION_ERROR'),
  
  limiteSuperado: (limite: string): Response =>
    crearRespuestaError(`Límite superado: ${limite}`, 429, 'RATE_LIMIT_EXCEEDED'),
}
