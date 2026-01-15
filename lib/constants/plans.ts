/**
 * Constantes para el sistema de planes y límites
 */

// Valor especial para créditos ilimitados
// Usamos 999999 como convención en la BD para representar "ilimitado"
export const UNLIMITED_CREDITS = 999999

// Códigos de planes predefinidos
export const PLAN_CODES = {
  FREE: 'free',
  PRO: 'pro',
} as const

// Códigos de roles predefinidos
export const ROLE_CODES = {
  USER: 'user',
  ADMIN: 'admin',
} as const

// Helper para verificar si un valor es "ilimitado"
export function isUnlimited(value: number): boolean {
  return value >= UNLIMITED_CREDITS
}

// Helper para formatear créditos (mostrar "Ilimitado" o el número)
export function formatCredits(credits: number): string {
  return isUnlimited(credits) ? 'Ilimitadas' : credits.toString()
}

// Tipos para seguridad de tipos
export type PlanCode = typeof PLAN_CODES[keyof typeof PLAN_CODES]
export type RoleCode = typeof ROLE_CODES[keyof typeof ROLE_CODES]
