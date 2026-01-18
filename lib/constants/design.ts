/**
 * Constantes de diseño para mantener consistencia en toda la aplicación
 */

// Altura del header móvil (en px y clase de Tailwind)
export const MOBILE_HEADER_HEIGHT = {
  px: 56, // 14 * 4 (h-14 en Tailwind)
  class: 'h-14',
} as const

// Touch target mínimo según WCAG 2.1 Level AA
export const MIN_TOUCH_TARGET = {
  px: 44,
  class: 'min-h-touch min-w-touch',
} as const

// Alturas de drawer/modal
export const DRAWER_CONTENT_HEIGHT = `calc(100vh - ${MOBILE_HEADER_HEIGHT.px + 17}px)` // 17px = padding + border
