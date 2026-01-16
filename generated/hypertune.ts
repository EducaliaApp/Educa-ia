export type Context = {
  environment?: string | null
  user?: {
    id: string
    name: string
    email: string
  } | null
}

export type RootFlagValues = {
  menuItemInicio: boolean
  menuItemPlanifica: boolean
  menuItemEvalua: boolean
  menuItemMiCarrera: boolean
  menuItemEmpleo: boolean
  menuItemSalud: boolean
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
  menuItemInicio: true,
  menuItemPlanifica: true,
  menuItemEvalua: true,
  menuItemMiCarrera: true,
  menuItemEmpleo: true,
  menuItemSalud: true,
}

const envFlagKeyMap: Record<keyof RootFlagValues, string> = {
  menuItemInicio: 'NEXT_PUBLIC_FEATURE_MENU_ITEM_INICIO',
  menuItemPlanifica: 'NEXT_PUBLIC_FEATURE_MENU_ITEM_PLANIFICA',
  menuItemEvalua: 'NEXT_PUBLIC_FEATURE_MENU_ITEM_EVALUA',
  menuItemMiCarrera: 'NEXT_PUBLIC_FEATURE_MENU_ITEM_MI_CARRERA',
  menuItemEmpleo: 'NEXT_PUBLIC_FEATURE_MENU_ITEM_EMPLEO',
  menuItemSalud: 'NEXT_PUBLIC_FEATURE_MENU_ITEM_SALUD',
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
  menuItemInicio: {
    description: 'Controla la visibilidad del ítem de menú "Inicio" en la barra lateral.',
  },
  menuItemPlanifica: {
    description:
      'Activa la categoría "Planifica" del roadmap para los usuarios del panel.',
  },
  menuItemEvalua: {
    description:
      'Permite mostrar las herramientas de evaluación dentro del dashboard.',
  },
  menuItemMiCarrera: {
    description: 'Gestiona el acceso a la categoría "Mi Carrera".',
  },
  menuItemEmpleo: {
    description: 'Habilita las funcionalidades relacionadas con empleo.',
  },
  menuItemSalud: {
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
