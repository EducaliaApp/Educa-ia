import type { User } from '@supabase/supabase-js'
import { createAdminClient } from './admin'
import type { Database, Profile } from './types'

function buildProfilePayload(user: User): Database['public']['Tables']['profiles']['Insert'] {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const nombre = typeof metadata.nombre === 'string' ? metadata.nombre : undefined
  const asignatura = typeof metadata.asignatura === 'string' ? metadata.asignatura : undefined
  const nivel = typeof metadata.nivel === 'string' ? metadata.nivel : undefined

  const primaryEmail = typeof user.email === 'string' && user.email.length > 0 ? user.email : undefined
  const metadataEmail = typeof metadata.email === 'string' && (metadata.email as string).length > 0 ? (metadata.email as string) : undefined

  const payload: Database['public']['Tables']['profiles']['Insert'] = {
    id: user.id,
    email: primaryEmail ?? metadataEmail ?? null,
    nombre,
    asignatura,
    nivel,
  }

  return payload
}

export async function ensureProfileForUser(user: User): Promise<Profile> {
  const adminClient = createAdminClient()

  const profilePayload = buildProfilePayload(user)

  const { error: upsertError } = await adminClient
    .from<Database['public']['Tables']['profiles']['Row']>('profiles')
    .upsert(profilePayload, {
      onConflict: 'id',
    })

  if (upsertError) {
    throw upsertError
  }

  const { data: profile, error: fetchError } = await adminClient
    .from<Database['public']['Tables']['profiles']['Row']>('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (fetchError) {
    throw fetchError
  }

  if (!profile) {
    throw new Error('Profile was not found after creation')
  }

  return profile as Profile
}
