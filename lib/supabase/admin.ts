import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config'
import type { Database } from './types'

/**
 * Creates a Supabase client with service_role privileges
 * This bypasses RLS policies and should ONLY be used in server-side code
 * for admin operations.
 *
 * SECURITY: Never expose this client to the frontend!
 */
export function createAdminClient() {
  const { url } = getSupabaseConfig()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'This is required for admin operations.'
    )
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Helper function to check if a user is an admin
 * This uses service_role to bypass RLS
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return false
  }

  return data.role === 'admin'
}
