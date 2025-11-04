export type Context = {
  environment?: string | null
  user?: {
    id: string
    name: string
    email: string
  } | null
}

export type RootFlagValues = {
  roadmapInicio: boolean
  roadmapPlanifica: boolean
  roadmapEvalua: boolean
  roadmapMiCarrera: boolean
  roadmapEmpleo: boolean
  roadmapSalud: boolean
}

type FlagDefinition = {
  description?: string
  options?: Array<{ value: unknown; label: string }>
  origin?: string
}

type CreateSourceOptions = {
  token: string
  key?: string
}

const defaultFlagValues: RootFlagValues = {
  roadmapInicio: true,
  roadmapPlanifica: true,
  roadmapEvalua: true,
  roadmapMiCarrera: true,
  roadmapEmpleo: true,
  roadmapSalud: true,
}

const envFlagKeyMap: Record<keyof RootFlagValues, string> = {
  roadmapInicio: 'NEXT_PUBLIC_FEATURE_INICIO',
  roadmapPlanifica: 'NEXT_PUBLIC_FEATURE_PLANIFICA',
  roadmapEvalua: 'NEXT_PUBLIC_FEATURE_EVALUA',
  roadmapMiCarrera: 'NEXT_PUBLIC_FEATURE_MI_CARRERA',
  roadmapEmpleo: 'NEXT_PUBLIC_FEATURE_EMPLEO',
  roadmapSalud: 'NEXT_PUBLIC_FEATURE_SALUD',
}

const parseBooleanEnv = (value?: string | null): boolean | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const normalized = value.trim().toLowerCase()

  if (['1', 'true', 'on', 'yes'].includes(normalized)) {
    return true
  }

  if (['0', 'false', 'off', 'no'].includes(normalized)) {
    return false
  }

  return undefined
}

const getEnvFlagOverrides = (): Partial<RootFlagValues> => {
  const overrides: Partial<RootFlagValues> = {}

  for (const [flagKey, envKey] of Object.entries(envFlagKeyMap) as Array<
    [keyof RootFlagValues, string]
  >) {
    const parsed = parseBooleanEnv(process.env[envKey])

    if (parsed !== undefined) {
      overrides[flagKey] = parsed
    }
  }

  return overrides
}

export const flagFallbacks: RootFlagValues = defaultFlagValues

export const vercelFlagDefinitions: Record<
  keyof RootFlagValues,
  FlagDefinition
> = {
  roadmapInicio: {
    description: 'Controla la visibilidad de la categoría "Inicio" en la barra lateral.',
  },
  roadmapPlanifica: {
    description:
      'Activa la categoría "Planifica" del roadmap para los usuarios del panel.',
  },
  roadmapEvalua: {
    description:
      'Permite mostrar las herramientas de evaluación dentro del dashboard.',
  },
  roadmapMiCarrera: {
    description: 'Gestiona el acceso a la categoría "Mi Carrera".',
  },
  roadmapEmpleo: {
    description: 'Habilita las funcionalidades relacionadas con empleo.',
  },
  roadmapSalud: {
    description: 'Expone las herramientas de bienestar y salud.',
  },
}

export const createSource = (_options: CreateSourceOptions) => {
  return {
    async initIfNeeded() {
      return
    },
    root: () => {
      const envOverrides = getEnvFlagOverrides()

      return {
        getFlagValues<FlagPath extends keyof RootFlagValues & string>({
          flagFallbacks: requestFallbacks,
          flagPaths,
        }: {
          flagFallbacks: RootFlagValues
          flagPaths: FlagPath[]
        }): Pick<RootFlagValues, FlagPath> {
          const resolved = {} as Pick<RootFlagValues, FlagPath>

          for (const flagPath of flagPaths) {
            const overrideValue = envOverrides[flagPath]
            const fallbackValue =
              overrideValue ?? requestFallbacks[flagPath] ?? flagFallbacks[flagPath]

            resolved[flagPath] = fallbackValue
          }

          return resolved
        },
      }
    },
  }
}
