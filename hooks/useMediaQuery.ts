'use client'

import { useEffect, useState } from 'react'

/**
 * Hook para detectar media queries en el cliente
 * @param query - Media query string (ej: '(min-width: 768px)')
 * @returns boolean indicando si la media query coincide
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Verificar si window está disponible (cliente)
    if (typeof window === 'undefined') {
      return
    }

    const media = window.matchMedia(query)
    
    // Actualizar estado inicial
    if (media.matches !== matches) {
      setMatches(media.matches)
    }

    // Listener para cambios
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Agregar listener (soporta navegadores antiguos)
    if (media.addEventListener) {
      media.addEventListener('change', listener)
    } else {
      // Fallback para navegadores antiguos
      media.addListener(listener)
    }

    // Cleanup
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener)
      } else {
        media.removeListener(listener)
      }
    }
  }, [matches, query])

  return matches
}
