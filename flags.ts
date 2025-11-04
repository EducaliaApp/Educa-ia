import 'server-only'

import { createHypertuneAdapter } from '@flags-sdk/hypertune'
import { Identify } from 'flags'
import { dedupe, evaluate, flag } from 'flags/next'

import {
  Context,
  RootFlagValues,
  createSource,
  flagFallbacks,
  vercelFlagDefinitions as flagDefinitions,
} from './generated/hypertune'
import type { RoadmapCategoryFlags } from './lib/flags/types'

const identify: Identify<Context> = dedupe(async () => {
  return {
    environment: process.env.NODE_ENV,
    user: null,
  }
})

const hypertuneAdapter = createHypertuneAdapter<RootFlagValues, Context>({
  createSource,
  flagFallbacks,
  flagDefinitions,
  identify,
})

export const menuItemInicioFlag = flag(
  hypertuneAdapter.declarations.menuItemInicio,
)

export const menuItemPlanificaFlag = flag(
  hypertuneAdapter.declarations.menuItemPlanifica,
)

export const menuItemEvaluaFlag = flag(
  hypertuneAdapter.declarations.menuItemEvalua,
)

export const menuItemMiCarreraFlag = flag(
  hypertuneAdapter.declarations.menuItemMiCarrera,
)

export const menuItemEmpleoFlag = flag(
  hypertuneAdapter.declarations.menuItemEmpleo,
)

export const menuItemSaludFlag = flag(
  hypertuneAdapter.declarations.menuItemSalud,
)

export const getRoadmapCategoryFlags = async (): Promise<RoadmapCategoryFlags> => {
  const [
    menuItemInicio,
    menuItemPlanifica,
    menuItemEvalua,
    menuItemMiCarrera,
    menuItemEmpleo,
    menuItemSalud,
  ] = await evaluate([
    menuItemInicioFlag,
    menuItemPlanificaFlag,
    menuItemEvaluaFlag,
    menuItemMiCarreraFlag,
    menuItemEmpleoFlag,
    menuItemSaludFlag,
  ])

  return {
    menuItemInicio,
    menuItemPlanifica,
    menuItemEvalua,
    menuItemMiCarrera,
    menuItemEmpleo,
    menuItemSalud,
  }
}
