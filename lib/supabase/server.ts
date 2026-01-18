import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './types'
import { getSupabaseConfig } from './config'

export async function createClient() {
  const cookieStore = await cookies()

  const { url, anonKey } = getSupabaseConfig()

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // El método `set` fue llamado desde un Server Component.
            // Esto puede ser ignorado si tienes middleware refrescando
            // las sesiones de usuario.
            console.debug('Cookie set llamado desde Server Component:', error instanceof Error ? error.message : 'Error desconocido')
          }
        },
      },
    }
  )
}
