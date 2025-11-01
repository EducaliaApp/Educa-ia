export class MissingSupabaseEnvError extends Error {
  constructor(message = 'Supabase environment variables are not configured.') {
    super(message)
    this.name = 'MissingSupabaseEnvError'
  }
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new MissingSupabaseEnvError(
      'NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar configuradas para conectarse a Supabase.'
    )
  }

  return { url, anonKey }
}

export function isMissingSupabaseEnvError(error: unknown): error is MissingSupabaseEnvError {
  if (error instanceof MissingSupabaseEnvError) {
    return true
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: string }).message)
    return message.includes('NEXT_PUBLIC_SUPABASE_URL') && message.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return false
}
