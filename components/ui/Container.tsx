import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Variante del contenedor
   * - full: Ancho completo sin padding horizontal
   * - fluid: Ancho completo con padding responsive
   * - constrained: Ancho máximo limitado con padding
   */
  variant?: 'full' | 'fluid' | 'constrained'
  
  /**
   * Tamaño máximo del contenedor (solo para variant="constrained")
   */
  maxWidth?: 'mobile' | 'tablet' | 'desktop' | 'wide'
  
  /**
   * Padding vertical responsive
   */
  paddingY?: boolean
}

/**
 * Componente Container responsivo para envolver contenido
 * Maneja espaciados y anchos máximos de forma consistente
 */
export function Container({
  variant = 'constrained',
  maxWidth = 'desktop',
  paddingY = true,
  className,
  children,
  ...props
}: ContainerProps) {
  const baseClasses = 'w-full mx-auto'
  
  const variantClasses = {
    full: '', // Sin padding ni límites
    fluid: 'px-4 sm:px-6 lg:px-8', // Padding responsive
    constrained: 'px-4 sm:px-6 lg:px-8', // Padding + max-width
  }
  
  const maxWidthClasses = {
    mobile: 'max-w-mobile',
    tablet: 'max-w-tablet',
    desktop: 'max-w-desktop',
    wide: 'max-w-wide',
  }
  
  const paddingYClasses = paddingY ? 'py-4 sm:py-6 lg:py-8' : ''
  
  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        variant === 'constrained' && maxWidthClasses[maxWidth],
        paddingYClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
