// lib/portafolio/gestionar-estados.ts

import { createBrowserClient } from '@supabase/ssr'
import { validarCompletitudPortafolio, puedeEnviarPortafolio } from './validacion-completitud'

export type EstadoPortafolio = 'borrador' | 'en_revision' | 'completado' | 'enviado'

export interface TransicionEstadoResultado {
  success: boolean
  nuevoEstado?: EstadoPortafolio
  error?: string
}

/**
 * Marca un portafolio como enviado
 * Valida completitud antes de permitir el cambio
 */
export async function marcarComoEnviado(
  portafolioId: string,
  supabase: ReturnType<typeof createBrowserClient>
): Promise<TransicionEstadoResultado> {
  try {
    // 1. Obtener portafolio completo con todos sus módulos y tareas
    const { data: portafolio, error: fetchError } = await supabase
      .from('portafolios')
      .select(
        `
        *,
        modulos:modulos_portafolio(
          *,
          tareas:tareas_portafolio(*)
        )
      `
      )
      .eq('id', portafolioId)
      .single()

    if (fetchError || !portafolio) {
      return {
        success: false,
        error: 'No se pudo encontrar el portafolio',
      }
    }

    // 2. Verificar que no esté ya enviado
    if (portafolio.estado === 'enviado') {
      return {
        success: false,
        error: 'Este portafolio ya fue enviado anteriormente',
      }
    }

    // 3. Validar completitud
    const validacion = await validarCompletitudPortafolio(portafolio)
    const { puede, razon } = puedeEnviarPortafolio(validacion)

    if (!puede) {
      return {
        success: false,
        error: razon,
      }
    }

    // 4. Actualizar estado a 'enviado'
    const { error: updateError } = await supabase
      .from('portafolios')
      .update({
        estado: 'enviado',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', portafolioId)

    if (updateError) {
      return {
        success: false,
        error: `Error al actualizar estado: ${updateError.message}`,
      }
    }

    return {
      success: true,
      nuevoEstado: 'enviado',
    }
  } catch (error: any) {
    console.error('Error al marcar como enviado:', error)
    return {
      success: false,
      error: error.message || 'Error desconocido',
    }
  }
}

/**
 * Cambia el estado de un portafolio
 */
export async function cambiarEstadoPortafolio(
  portafolioId: string,
  nuevoEstado: EstadoPortafolio,
  supabase: ReturnType<typeof createBrowserClient>
): Promise<TransicionEstadoResultado> {
  try {
    // Obtener estado actual
    const { data: portafolio, error: fetchError } = await supabase
      .from('portafolios')
      .select('estado')
      .eq('id', portafolioId)
      .single()

    if (fetchError || !portafolio) {
      return {
        success: false,
        error: 'No se pudo encontrar el portafolio',
      }
    }

    const estadoActual = portafolio.estado as EstadoPortafolio

    // Validar transición
    const transicionValida = validarTransicionEstado(estadoActual, nuevoEstado)
    if (!transicionValida.valida) {
      return {
        success: false,
        error: transicionValida.razon,
      }
    }

    // Si es enviado, usar función especializada
    if (nuevoEstado === 'enviado') {
      return await marcarComoEnviado(portafolioId, supabase)
    }

    // Actualizar estado
    const updateData: any = {
      estado: nuevoEstado,
      updated_at: new Date().toISOString(),
    }

    // Si pasa a completado, registrar fecha
    if (nuevoEstado === 'completado' && estadoActual !== 'completado') {
      updateData.completado_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('portafolios')
      .update(updateData)
      .eq('id', portafolioId)

    if (updateError) {
      return {
        success: false,
        error: `Error al actualizar estado: ${updateError.message}`,
      }
    }

    return {
      success: true,
      nuevoEstado,
    }
  } catch (error: any) {
    console.error('Error al cambiar estado:', error)
    return {
      success: false,
      error: error.message || 'Error desconocido',
    }
  }
}

/**
 * Valida si una transición de estado es válida
 */
function validarTransicionEstado(
  estadoActual: EstadoPortafolio,
  nuevoEstado: EstadoPortafolio
): { valida: boolean; razon?: string } {
  // No se puede cambiar estado de un portafolio enviado
  if (estadoActual === 'enviado') {
    return {
      valida: false,
      razon: 'No se puede modificar un portafolio que ya fue enviado',
    }
  }

  // Transiciones válidas
  const transicionesValidas: Record<EstadoPortafolio, EstadoPortafolio[]> = {
    borrador: ['en_revision', 'completado'],
    en_revision: ['borrador', 'completado'],
    completado: ['en_revision', 'enviado'],
    enviado: [], // No se puede cambiar desde enviado
  }

  if (!transicionesValidas[estadoActual].includes(nuevoEstado)) {
    return {
      valida: false,
      razon: `No se puede cambiar de "${estadoActual}" a "${nuevoEstado}"`,
    }
  }

  return { valida: true }
}

/**
 * Verifica si un portafolio está bloqueado para edición
 */
export function estaBloquedoParaEdicion(estado: EstadoPortafolio): boolean {
  return estado === 'enviado'
}

/**
 * Desbloquea un portafolio enviado (solo admin)
 * USAR CON PRECAUCIÓN
 */
export async function desbloquearPortafolio(
  portafolioId: string,
  supabase: ReturnType<typeof createBrowserClient>,
  userId: string
): Promise<TransicionEstadoResultado> {
  try {
    // Verificar que el usuario sea admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role !== 'admin') {
      return {
        success: false,
        error: 'Solo administradores pueden desbloquear portafolios enviados',
      }
    }

    // Cambiar estado a completado
    const { error: updateError } = await supabase
      .from('portafolios')
      .update({
        estado: 'completado',
        submitted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', portafolioId)

    if (updateError) {
      return {
        success: false,
        error: `Error al desbloquear: ${updateError.message}`,
      }
    }

    return {
      success: true,
      nuevoEstado: 'completado',
    }
  } catch (error: any) {
    console.error('Error al desbloquear portafolio:', error)
    return {
      success: false,
      error: error.message || 'Error desconocido',
    }
  }
}

/**
 * Hook React para gestión de estados
 */
export function useEstadoPortafolio(portafolioId: string, estadoActual: EstadoPortafolio) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const bloqueado = estaBloquedoParaEdicion(estadoActual)

  const cambiarEstado = async (nuevoEstado: EstadoPortafolio) => {
    return await cambiarEstadoPortafolio(portafolioId, nuevoEstado, supabase)
  }

  const marcarEnviado = async () => {
    return await marcarComoEnviado(portafolioId, supabase)
  }

  return {
    estadoActual,
    bloqueado,
    cambiarEstado,
    marcarEnviado,
  }
}
