'use client'

import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface MobileMenuButtonProps {
  onToggle?: (isOpen: boolean) => void
  className?: string
}

/**
 * Botón de menú hamburguesa para móvil
 * Animación suave entre estados hamburguesa y X
 */
export function MobileMenuButton({ onToggle, className }: MobileMenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleClick = () => {
    const newState = !isOpen
    setIsOpen(newState)
    onToggle?.(newState)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center',
        'min-h-touch min-w-touch p-2',
        'rounded-lg text-gray-700',
        'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary',
        'transition-colors duration-200',
        className
      )}
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
    >
      {isOpen ? (
        <X className="h-6 w-6" aria-hidden="true" />
      ) : (
        <Menu className="h-6 w-6" aria-hidden="true" />
      )}
    </button>
  )
}
