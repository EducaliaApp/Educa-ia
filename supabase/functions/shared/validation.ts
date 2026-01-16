// supabase/functions/shared/validation.ts
// Utilidades de validación para Edge Functions

/**
 * Valida que un valor sea un UUID válido
 */
export function esUUIDValido(valor: unknown): valor is string {
  if (typeof valor !== 'string') return false
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(valor)
}

/**
 * Valida que un modelo de IA sea soportado
 */
export function esModeloValido(modelo: unknown): modelo is string {
  if (typeof modelo !== 'string') return false
  
  const modelosPermitidos = [
    'gpt-4-turbo-preview',
    'gpt-4',
    'claude-sonnet-4',
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022'
  ]
  
  return modelosPermitidos.includes(modelo)
}

/**
 * Valida un objeto de entrada contra un esquema
 */
export interface CampoRequerido {
  nombre: string
  tipo: 'string' | 'number' | 'boolean' | 'uuid' | 'modelo'
  opcional?: boolean
}

export interface ResultadoValidacion {
  valido: boolean
  errores: string[]
}

export function validarEntrada(
  datos: Record<string, unknown>,
  campos: CampoRequerido[]
): ResultadoValidacion {
  const errores: string[] = []
  
  for (const campo of campos) {
    const valor = datos[campo.nombre]
    
    // Verificar si es requerido
    if (!campo.opcional && (valor === undefined || valor === null || valor === '')) {
      errores.push(`El campo '${campo.nombre}' es requerido`)
      continue
    }
    
    // Si es opcional y no está presente, continuar
    if (campo.opcional && (valor === undefined || valor === null)) {
      continue
    }
    
    // Validar tipo
    switch (campo.tipo) {
      case 'string':
        if (typeof valor !== 'string') {
          errores.push(`El campo '${campo.nombre}' debe ser un string`)
        }
        break
      
      case 'number':
        if (typeof valor !== 'number' || isNaN(valor)) {
          errores.push(`El campo '${campo.nombre}' debe ser un número`)
        }
        break
      
      case 'boolean':
        if (typeof valor !== 'boolean') {
          errores.push(`El campo '${campo.nombre}' debe ser un booleano`)
        }
        break
      
      case 'uuid':
        if (!esUUIDValido(valor)) {
          errores.push(`El campo '${campo.nombre}' debe ser un UUID válido`)
        }
        break
      
      case 'modelo':
        if (!esModeloValido(valor)) {
          errores.push(`El campo '${campo.nombre}' debe ser un modelo de IA válido`)
        }
        break
    }
  }
  
  return {
    valido: errores.length === 0,
    errores
  }
}

/**
 * Valida el tamaño de un payload JSON
 */
export function validarTamañoPayload(
  payload: string,
  maxTamañoKB: number = 100
): ResultadoValidacion {
  const tamañoBytes = new TextEncoder().encode(payload).length
  const tamañoKB = tamañoBytes / 1024
  
  if (tamañoKB > maxTamañoKB) {
    return {
      valido: false,
      errores: [`El payload excede el tamaño máximo de ${maxTamañoKB}KB (actual: ${tamañoKB.toFixed(2)}KB)`]
    }
  }
  
  return {
    valido: true,
    errores: []
  }
}

/**
 * Crea una respuesta de error de validación estándar
 */
export function respuestaErrorValidacion(errores: string[]): Response {
  return new Response(
    JSON.stringify({
      error: 'Error de validación',
      detalles: errores
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}
