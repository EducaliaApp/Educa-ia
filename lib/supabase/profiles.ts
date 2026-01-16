import type { User } from '@supabase/supabase-js'
import { createAdminClient } from './admin'
import type { Database, Profile } from './types'

type AdminClient = ReturnType<typeof createAdminClient>
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

function buildProfilePayload(user: User): ProfileInsert {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const nombre = typeof metadata.nombre === 'string' ? metadata.nombre : undefined
  const asignatura = typeof metadata.asignatura === 'string' ? metadata.asignatura : undefined
  const nivel = typeof metadata.nivel === 'string' ? metadata.nivel : undefined

  const primaryEmail = typeof user.email === 'string' && user.email.length > 0 ? user.email : undefined
  const metadataEmail =
    typeof metadata.email === 'string' && (metadata.email as string).length > 0
      ? (metadata.email as string)
      : undefined

  return {
    id: user.id,
    email: primaryEmail ?? metadataEmail ?? null,
    nombre,
    asignatura,
    nivel,
  }
}

function mergeProfile(existing: ProfileRow, fallback: ProfileInsert): Profile {
  return {
    ...existing,
    email: existing.email ?? fallback.email ?? null,
    nombre: existing.nombre ?? fallback.nombre ?? null,
    asignatura: existing.asignatura ?? fallback.asignatura ?? null,
    nivel: existing.nivel ?? fallback.nivel ?? null,
  } as Profile
}

async function fetchProfileById(adminClient: AdminClient, userId: string): Promise<ProfileRow | null> {
  const { data, error } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as ProfileRow | null) ?? null
}

export async function ensureProfileForUser(user: User): Promise<Profile> {
  const adminClient = createAdminClient()
  const profilePayload = buildProfilePayload(user)

  const existingProfile = await fetchProfileById(adminClient, user.id)

  if (existingProfile) {
    const updatePayload: ProfileUpdate = {}

    if (
      profilePayload.email !== undefined &&
      profilePayload.email !== existingProfile.email
    ) {
      updatePayload.email = profilePayload.email
    }

    if (
      profilePayload.nombre !== undefined &&
      profilePayload.nombre !== existingProfile.nombre
    ) {
      updatePayload.nombre = profilePayload.nombre
    }

    if (
      profilePayload.asignatura !== undefined &&
      profilePayload.asignatura !== existingProfile.asignatura
    ) {
      updatePayload.asignatura = profilePayload.asignatura
    }

    if (
      profilePayload.nivel !== undefined &&
      profilePayload.nivel !== existingProfile.nivel
    ) {
      updatePayload.nivel = profilePayload.nivel
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await (adminClient.from('profiles') as any)
        .update(updatePayload)
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      const refreshedProfile = await fetchProfileById(adminClient, user.id)

      if (!refreshedProfile) {
        throw new Error('Profile was not found after update')
      }

      return mergeProfile(refreshedProfile, profilePayload)
    }

    return mergeProfile(existingProfile, profilePayload)
  }

  const { error: insertError } = await (adminClient.from('profiles') as any).insert(profilePayload)

  if (insertError) {
    throw insertError
  }

  const createdProfile = await fetchProfileById(adminClient, user.id)

  if (!createdProfile) {
    throw new Error('Profile was not found after creation')
  }

  return mergeProfile(createdProfile, profilePayload)
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  const adminClient = createAdminClient()
  const profile = await fetchProfileById(adminClient, userId)

  if (!profile) {
    return null
  }

  return profile as Profile
}
