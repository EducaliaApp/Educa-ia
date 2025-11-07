// hooks/useAutoSave.ts
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseAutoSaveOptions<T> {
  data: T
  onSave: (data: T) => Promise<void>
  delay?: number // Milisegundos de delay (default: 30000 = 30 segundos)
  enabled?: boolean // Permitir habilitar/deshabilitar
  onSuccess?: () => void
  onError?: (error: Error) => void
}

interface UseAutoSaveReturn {
  isSaving: boolean
  lastSaved: Date | null
  error: Error | null
  saveNow: () => Promise<void>
  reset: () => void
}

/**
 * Hook para guardado automático con debounce
 *
 * @example
 * const { isSaving, lastSaved, saveNow } = useAutoSave({
 *   data: formData,
 *   onSave: async (data) => {
 *     await supabase.from('tareas').update({ contenido: data }).eq('id', tareaId)
 *   },
 *   delay: 30000, // 30 segundos
 *   enabled: true
 * })
 */
export function useAutoSave<T>({
  data,
  onSave,
  delay = 30000, // 30 segundos por defecto
  enabled = true,
  onSuccess,
  onError,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)

  // Ref para almacenar el timeout actual
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Ref para almacenar los datos anteriores (para detectar cambios)
  const previousDataRef = useRef<T>(data)

  // Ref para evitar race conditions
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Función de guardado
  const save = useCallback(async () => {
    if (!enabled || isSaving) return

    setIsSaving(true)
    setError(null)

    try {
      await onSave(data)

      if (isMountedRef.current) {
        setLastSaved(new Date())
        onSuccess?.()
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error al guardar')

      if (isMountedRef.current) {
        setError(error)
        onError?.(error)
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false)
      }
    }
  }, [data, onSave, enabled, isSaving, onSuccess, onError])

  // Función para guardar inmediatamente (sin debounce)
  const saveNow = useCallback(async () => {
    // Limpiar timeout pendiente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    await save()
  }, [save])

  // Reset state
  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsSaving(false)
    setError(null)
    setLastSaved(null)
  }, [])

  // Effect para detectar cambios en data y programar guardado
  useEffect(() => {
    if (!enabled) return

    // Comparar data actual con anterior para ver si cambió
    const dataChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current)

    if (!dataChanged) return

    // Actualizar ref
    previousDataRef.current = data

    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Programar nuevo guardado
    timeoutRef.current = setTimeout(() => {
      save()
    }, delay)

    // Cleanup: limpiar timeout al desmontar o cuando cambien las dependencias
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, delay, enabled, save])

  return {
    isSaving,
    lastSaved,
    error,
    saveNow,
    reset,
  }
}
