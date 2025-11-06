import { RootFlagValues, flagFallbacks } from './generated/hypertune'
import type { RoadmapCategoryFlags } from './lib/flags/types'

// Función helper para obtener valores de feature flags desde variables de entorno
const getEnvFlag = (key: string, defaultValue: boolean): boolean => {
  const envValue = process.env[key]
  if (envValue === undefined) return defaultValue
  return envValue === 'true' || envValue === '1'
}

// Feature flags simplificados usando variables de entorno
export const menuItemInicioFlag = {
  get: () => getEnvFlag('NEXT_PUBLIC_FEATURE_MENU_ITEM_INICIO', flagFallbacks.menuItemInicio)
}

export const menuItemPlanificaFlag = {
  get: () => getEnvFlag('NEXT_PUBLIC_FEATURE_MENU_ITEM_PLANIFICA', flagFallbacks.menuItemPlanifica)
}

export const menuItemEvaluaFlag = {
  get: () => getEnvFlag('NEXT_PUBLIC_FEATURE_MENU_ITEM_EVALUA', flagFallbacks.menuItemEvalua)
}

export const menuItemMiCarreraFlag = {
  get: () => getEnvFlag('NEXT_PUBLIC_FEATURE_MENU_ITEM_MI_CARRERA', flagFallbacks.menuItemMiCarrera)
}

export const menuItemEmpleoFlag = {
  get: () => getEnvFlag('NEXT_PUBLIC_FEATURE_MENU_ITEM_EMPLEO', flagFallbacks.menuItemEmpleo)
}

export const menuItemSaludFlag = {
  get: () => getEnvFlag('NEXT_PUBLIC_FEATURE_MENU_ITEM_SALUD', flagFallbacks.menuItemSalud)
}

export const getRoadmapCategoryFlags = async (): Promise<RoadmapCategoryFlags> => {
  return {
    menuItemInicio: menuItemInicioFlag.get(),
    menuItemPlanifica: menuItemPlanificaFlag.get(),
    menuItemEvalua: menuItemEvaluaFlag.get(),
    menuItemMiCarrera: menuItemMiCarreraFlag.get(),
    menuItemEmpleo: menuItemEmpleoFlag.get(),
    menuItemSalud: menuItemSaludFlag.get(),
  }
}
