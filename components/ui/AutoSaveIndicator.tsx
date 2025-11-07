// components/ui/AutoSaveIndicator.tsx
'use client'

import { Check, Cloud, CloudOff, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface AutoSaveIndicatorProps {
  isSaving: boolean
  lastSaved: Date | null
  error: Error | null
  className?: string
}

export function AutoSaveIndicator({
  isSaving,
  lastSaved,
  error,
  className = '',
}: AutoSaveIndicatorProps) {
  if (error) {
    return (
      <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
        <CloudOff className="h-4 w-4" />
        <span>Error al guardar</span>
      </div>
    )
  }

  if (isSaving) {
    return (
      <div className={`flex items-center gap-2 text-sm text-blue-600 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Guardando...</span>
      </div>
    )
  }

  if (lastSaved) {
    const timeAgo = formatDistanceToNow(lastSaved, {
      addSuffix: true,
      locale: es,
    })

    return (
      <div className={`flex items-center gap-2 text-sm text-green-600 ${className}`}>
        <Check className="h-4 w-4" />
        <span>Guardado {timeAgo}</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
      <Cloud className="h-4 w-4" />
      <span>Sin cambios</span>
    </div>
  )
}
