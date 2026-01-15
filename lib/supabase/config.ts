export class MissingSupabaseEnvError extends Error {
  constructor(message = 'Supabase environment variables are not configured.') {
    super(message)
    this.name = 'MissingSupabaseEnvError'
  }
}

type EnvCandidate = { name: string; value?: string }

function pickFirstDefined(candidates: EnvCandidate[]) {
  return candidates.find((candidate) => candidate.value)
}

function formatEnvChoices(candidates: EnvCandidate[]) {
  return candidates.map((candidate) => candidate.name).join(' o ')
}

// Define env names for static reference
const SUPABASE_URL_ENV_NAMES = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'] as const
const SUPABASE_ANON_KEY_ENV_NAMES = ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'] as const

export const SUPABASE_ENV_GROUPS = [SUPABASE_URL_ENV_NAMES, SUPABASE_ANON_KEY_ENV_NAMES] as const
export const SUPABASE_ENV_HINT = SUPABASE_ENV_GROUPS.map((group) => group.join(' o ')).join(' y ')

export function getSupabaseConfig() {
  // Access process.env lazily inside the function to avoid Edge Runtime issues
  const SUPABASE_URL_ENV_CANDIDATES: EnvCandidate[] = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { name: 'SUPABASE_URL', value: process.env.SUPABASE_URL },
  ]

  const SUPABASE_ANON_KEY_ENV_CANDIDATES: EnvCandidate[] = [
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    { name: 'SUPABASE_ANON_KEY', value: process.env.SUPABASE_ANON_KEY },
  ]

  const urlChoicesText = formatEnvChoices(SUPABASE_URL_ENV_CANDIDATES)
  const anonKeyChoicesText = formatEnvChoices(SUPABASE_ANON_KEY_ENV_CANDIDATES)

  const urlCandidate = pickFirstDefined(SUPABASE_URL_ENV_CANDIDATES)
  const anonKeyCandidate = pickFirstDefined(SUPABASE_ANON_KEY_ENV_CANDIDATES)

  const missing: string[] = []

  if (!urlCandidate) {
    missing.push(urlChoicesText)
  }

  if (!anonKeyCandidate) {
    missing.push(anonKeyChoicesText)
  }

  if (missing.length > 0) {
    throw new MissingSupabaseEnvError(
      `Debes definir ${missing.join(' y ')} para conectar la aplicación a Supabase.`
    )
  }

  return { url: urlCandidate!.value!, anonKey: anonKeyCandidate!.value! }
}

export function isMissingSupabaseEnvError(error: unknown): error is MissingSupabaseEnvError {
  if (error instanceof MissingSupabaseEnvError) {
    return true
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: string }).message)
    const mentionsUrl = SUPABASE_URL_ENV_NAMES.some((name) => message.includes(name))
    const mentionsKey = SUPABASE_ANON_KEY_ENV_NAMES.some((name) => message.includes(name))
    return mentionsUrl && mentionsKey
  }

  return false
}
