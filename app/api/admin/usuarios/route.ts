import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isUserAdmin } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type RoleRow = Database['public']['Tables']['roles']['Row']

interface ProfileWithRole {
  id: string
  nombre: string | null
  email: string | null
  plan: string | null
  role_legacy: string | null
  role_id: string | null
  role_codigo: string | null
  role_nombre: string | null
  asignatura: string | null
  nivel: string | null
  created_at: string
  creditos_planificaciones: number | null
  creditos_evaluaciones: number | null
  creditos_usados_planificaciones: number | null
  creditos_usados_evaluaciones: number | null
}

interface PlanificacionCount {
  user_id: string
}

type ProfileUpdateRequest = Database['public']['Tables']['profiles']['Update'] & {
  roleId?: string
}

// GET: Fetch all users with their data
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Check if user is admin using admin client to bypass RLS
    const userIsAdmin = await isUserAdmin(user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Get all users with their role information from profiles_with_roles view
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles_with_roles')
      .select('id, nombre, email, plan, role_legacy, role_id, role_codigo, role_nombre, asignatura, nivel, created_at, creditos_planificaciones, creditos_evaluaciones, creditos_usados_planificaciones, creditos_usados_evaluaciones')
      .order('created_at', { ascending: false }) as { data: ProfileWithRole[] | null; error: any }

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
    }

    // Get all planificaciones counts in a single query
    const { data: planificacionesCounts, error: countsError } = await adminClient
      .from('planificaciones')
      .select('user_id') as { data: PlanificacionCount[] | null; error: any }

    if (countsError) {
      console.error('Error fetching planificaciones counts:', countsError)
      // Continue without counts rather than failing
    }

    // Create a map of user_id to count
    const countsMap = new Map<string, number>()
    if (planificacionesCounts) {
      planificacionesCounts.forEach((p) => {
        countsMap.set(p.user_id, (countsMap.get(p.user_id) || 0) + 1)
      })
    }

    // Combine profiles with their counts
    const usersWithCounts = (profiles || []).map((profile) => ({
      ...profile,
      role: profile.role_codigo || profile.role_legacy, // Use new role system, fallback to legacy
      role_name: profile.role_nombre,
      total_planificaciones: countsMap.get(profile.id) || 0,
    }))

    return NextResponse.json({ users: usersWithCounts })
  } catch (error) {
    console.error('Error in GET /api/admin/usuarios:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST: Create new user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Check if user is admin using admin client to bypass RLS
    const userIsAdmin = await isUserAdmin(user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, nombre, asignatura, nivel, plan, roleId } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    }

    // Use admin client to create user in Supabase Auth
    const adminClient = createAdminClient()

    // Create user in auth.users
    const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin-created accounts
      // This is appropriate for admin-created accounts as they are trusted
      // Users can still reset password if needed
    })

    if (createUserError) {
      console.error('Error creating user:', createUserError)
      return NextResponse.json({ 
        error: 'Error al crear el usuario en la autenticación',
        details: createUserError.message 
      }, { status: 500 })
    }

    if (!newUser.user) {
      return NextResponse.json({ error: 'Usuario no fue creado correctamente' }, { status: 500 })
    }

    // Get role information
    let finalRoleId: string | null = roleId
    let finalRole = 'user'

    if (roleId) {
      const { data: roleData } = await adminClient.from('roles')
        .select('codigo')
        .eq('id', roleId)
        .single() as { data: Pick<RoleRow, 'codigo'> | null; error: any }
      
      if (roleData) {
        finalRole = roleData.codigo
      }
    } else {
      // Get default user role
      const { data: defaultRole } = await adminClient.from('roles')
        .select('id, codigo')
        .eq('codigo', 'user')
        .eq('activo', true)
        .single() as { data: Pick<RoleRow, 'id' | 'codigo'> | null; error: any }
      
      if (defaultRole) {
        finalRoleId = defaultRole.id
      }
    }

    // Update the profile that was auto-created by the trigger
    const profileUpdate: Database['public']['Tables']['profiles']['Update'] = {
      nombre: nombre || null,
      email: email,
      asignatura: asignatura || null,
      nivel: nivel || null,
      plan: plan || 'free',
      role: finalRole,
      role_id: finalRoleId,
    }

    const { error: updateError } = await (adminClient
      .from('profiles') as any)
      .update(profileUpdate)
      .eq('id', newUser.user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      // Try to clean up the auth user if profile creation failed
      try {
        await adminClient.auth.admin.deleteUser(newUser.user.id)
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user after profile error:', cleanupError)
        // Continue to return error to client even if cleanup fails
      }
      return NextResponse.json({ 
        error: 'Error al crear el perfil del usuario',
        details: updateError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
      }
    })
  } catch (error) {
    console.error('Error in POST /api/admin/usuarios:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// Helper: Process role updates
async function processRoleUpdate(adminClient: ReturnType<typeof createAdminClient>, updates: ProfileUpdateRequest) {
  if (!updates.roleId) return

  const { data: roleData } = await adminClient.from('roles')
    .select('codigo')
    .eq('id', updates.roleId)
    .single() as { data: Pick<RoleRow, 'codigo'> | null; error: any }
  
  if (roleData) {
    updates.role = roleData.codigo
    updates.role_id = updates.roleId
  }
  delete updates.roleId
}

// Helper: Process plan updates
async function processPlanUpdate(adminClient: ReturnType<typeof createAdminClient>, userId: string, updates: ProfileUpdateRequest) {
  if (!updates.plan) return null

  const { error: rpcError } = await (adminClient.rpc as any)('actualizar_plan_usuario', {
    usuario_id: userId,
    nuevo_plan_codigo: updates.plan,
  })

  if (rpcError) {
    console.error('Error updating user plan:', rpcError)
    if (rpcError.message?.includes('no existe') || rpcError.message?.includes('not exist')) {
      return NextResponse.json({ error: `El plan '${updates.plan}' no existe o no está activo` }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar el plan del usuario' }, { status: 500 })
  }

  delete updates.plan
  return null
}

// Helper: Update remaining profile fields
async function updateProfileFields(adminClient: ReturnType<typeof createAdminClient>, userId: string, updates: ProfileUpdateRequest) {
  if (Object.keys(updates).length === 0) return null

  const { roleId, plan, ...profileFields } = updates
  const profileUpdates: Database['public']['Tables']['profiles']['Update'] = profileFields

  const { error: updateError } = await (adminClient
    .from('profiles') as any)
    .update(profileUpdates)
    .eq('id', userId)

  if (updateError) {
    console.error('Error updating user:', updateError)
    return NextResponse.json({ error: 'Error al actualizar el usuario' }, { status: 500 })
  }

  return null
}

// PUT: Update user
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userIsAdmin = await isUserAdmin(user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, updates } = body

    if (!userId || !updates) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    await processRoleUpdate(adminClient, updates)
    
    const planError = await processPlanUpdate(adminClient, userId, updates)
    if (planError) return planError

    const profileError = await updateProfileFields(adminClient, userId, updates)
    if (profileError) return profileError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/admin/usuarios:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE: Delete user
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Check if user is admin using admin client to bypass RLS
    const userIsAdmin = await isUserAdmin(user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    const { error: deleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json({ error: 'Error al eliminar el usuario' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/usuarios:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
