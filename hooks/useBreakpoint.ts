'use client'

import { useMediaQuery } from './useMediaQuery'

/**
 * Breakpoints definidos en tailwind.config.ts
 */
export const breakpoints = {
  xs: 375,
  sm: 390,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
  '4xl': 2560,
} as const

export type Breakpoint = keyof typeof breakpoints

/**
 * Hook para detectar el breakpoint actual
 * @returns objeto con información del breakpoint actual
 */
export function useBreakpoint() {
  const isXs = useMediaQuery(`(min-width: ${breakpoints.xs}px)`)
  const isSm = useMediaQuery(`(min-width: ${breakpoints.sm}px)`)
  const isMd = useMediaQuery(`(min-width: ${breakpoints.md}px)`)
  const isLg = useMediaQuery(`(min-width: ${breakpoints.lg}px)`)
  const isXl = useMediaQuery(`(min-width: ${breakpoints.xl}px)`)
  const is2xl = useMediaQuery(`(min-width: ${breakpoints['2xl']}px)`)
  const is3xl = useMediaQuery(`(min-width: ${breakpoints['3xl']}px)`)
  const is4xl = useMediaQuery(`(min-width: ${breakpoints['4xl']}px)`)

  // Determinar el breakpoint actual (el más grande que coincida)
  const getCurrentBreakpoint = (): Breakpoint => {
    if (is4xl) return '4xl'
    if (is3xl) return '3xl'
    if (is2xl) return '2xl'
    if (isXl) return 'xl'
    if (isLg) return 'lg'
    if (isMd) return 'md'
    if (isSm) return 'sm'
    if (isXs) return 'xs'
    return 'xs' // Default para pantallas muy pequeñas
  }

  const currentBreakpoint = getCurrentBreakpoint()

  return {
    // Flags individuales
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2xl,
    is3xl,
    is4xl,
    
    // Helpers útiles
    isMobile: !isMd, // Menor a tablet
    isTablet: isMd && !isLg, // Solo tablet
    isDesktop: isLg, // Desktop y superior
    isWide: is3xl, // Pantallas wide
    
    // Breakpoint actual
    currentBreakpoint,
    
    // Width numérico del breakpoint actual
    currentWidth: breakpoints[currentBreakpoint],
  }
}

/**
 * Hook simplificado para detectar si estamos en móvil
 */
export function useIsMobile(): boolean {
  return !useMediaQuery(`(min-width: ${breakpoints.md}px)`)
}

/**
 * Hook para detectar si estamos en tablet
 */
export function useIsTablet(): boolean {
  const isMd = useMediaQuery(`(min-width: ${breakpoints.md}px)`)
  const isLg = useMediaQuery(`(min-width: ${breakpoints.lg}px)`)
  return isMd && !isLg
}

/**
 * Hook para detectar si estamos en desktop
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${breakpoints.lg}px)`)
}
