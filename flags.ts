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

export const roadmapInicioFlag = flag(
  hypertuneAdapter.declarations.roadmapInicio,
)

export const roadmapPlanificaFlag = flag(
  hypertuneAdapter.declarations.roadmapPlanifica,
)

export const roadmapEvaluaFlag = flag(
  hypertuneAdapter.declarations.roadmapEvalua,
)

export const roadmapMiCarreraFlag = flag(
  hypertuneAdapter.declarations.roadmapMiCarrera,
)

export const roadmapEmpleoFlag = flag(
  hypertuneAdapter.declarations.roadmapEmpleo,
)

export const roadmapSaludFlag = flag(
  hypertuneAdapter.declarations.roadmapSalud,
)

export const getRoadmapCategoryFlags = async (): Promise<RoadmapCategoryFlags> => {
  const [inicio, planifica, evalua, miCarrera, empleo, salud] = await evaluate([
    roadmapInicioFlag,
    roadmapPlanificaFlag,
    roadmapEvaluaFlag,
    roadmapMiCarreraFlag,
    roadmapEmpleoFlag,
    roadmapSaludFlag,
  ])

  return {
    inicio,
    planifica,
    evalua,
    miCarrera,
    empleo,
    salud,
  }
}
