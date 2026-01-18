'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DRAWER_CONTENT_HEIGHT } from '@/lib/constants/design'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  side?: 'left' | 'right'
  title?: string
}

/**
 * Drawer/Modal lateral para navegación móvil
 * Con overlay, animaciones y accesibilidad
 */
export function MobileDrawer({
  isOpen,
  onClose,
  children,
  side = 'left',
  title = 'Menú',
}: MobileDrawerProps) {
  // Prevenir scroll del body cuando el drawer está abierto
  useEffect(() => {
    if (isOpen) {
      // Usar clase CSS en lugar de manipular style directamente
      document.body.classList.add('overflow-hidden')
    } else {
      document.body.classList.remove('overflow-hidden')
    }

    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [isOpen])

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sideClasses = {
    left: 'left-0',
    right: 'right-0',
  }

  const translateClasses = {
    left: isOpen ? 'translate-x-0' : '-translate-x-full',
    right: isOpen ? 'translate-x-0' : 'translate-x-full',
  }

  const drawer = (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 bottom-0 z-50',
          'w-[280px] max-w-[85vw]',
          'bg-white shadow-xl',
          'transform transition-transform duration-300 ease-in-out',
          sideClasses[side],
          translateClasses[side]
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header con botón de cerrar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'min-h-touch min-w-touch p-2 -mr-2',
              'rounded-lg text-gray-500 hover:text-gray-700',
              'hover:bg-gray-100',
              'focus:outline-none focus:ring-2 focus:ring-primary'
            )}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <div 
          className="overflow-y-auto"
          style={{ height: DRAWER_CONTENT_HEIGHT }}
        >
          {children}
        </div>
      </div>
    </>
  )

  // Renderizar en portal para evitar problemas de z-index
  return typeof document !== 'undefined'
    ? createPortal(drawer, document.body)
    : null
}
