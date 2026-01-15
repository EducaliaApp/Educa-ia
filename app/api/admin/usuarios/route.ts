import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isUserAdmin } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

// GET: Fetch all users with their data
export async function GET(request: NextRequest) {
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
    const { data: profiles, error: profilesError } = await (adminClient
      .from('profiles_with_roles') as any)
      .select('id, nombre, email, plan, role_legacy, role_id, role_codigo, role_nombre, asignatura, nivel, created_at, creditos_planificaciones, creditos_evaluaciones, creditos_usados_planificaciones, creditos_usados_evaluaciones')
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
    }

    // Get all planificaciones counts in a single query
    const { data: planificacionesCounts, error: countsError } = await (adminClient
      .from('planificaciones') as any)
      .select('user_id')

    if (countsError) {
      console.error('Error fetching planificaciones counts:', countsError)
      // Continue without counts rather than failing
    }

    // Create a map of user_id to count
    const countsMap = new Map<string, number>()
    if (planificacionesCounts) {
      planificacionesCounts.forEach((p: any) => {
        countsMap.set(p.user_id, (countsMap.get(p.user_id) || 0) + 1)
      })
    }

    // Combine profiles with their counts
    const usersWithCounts = (profiles || []).map((profile: any) => ({
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
    let finalRoleId = roleId
    let finalRole = 'user'

    if (roleId) {
      const { data: roleData } = await (adminClient.from('roles') as any)
        .select('codigo')
        .eq('id', roleId)
        .single()
      
      if (roleData) {
        finalRole = roleData.codigo
      }
    } else {
      // Get default user role
      const { data: defaultRole } = await (adminClient.from('roles') as any)
        .select('id, codigo')
        .eq('codigo', 'user')
        .eq('activo', true)
        .single()
      
      if (defaultRole) {
        finalRoleId = defaultRole.id
      }
    }

    // Update the profile that was auto-created by the trigger
    const { error: updateError } = await (adminClient.from('profiles') as any)
      .update({
        nombre: nombre || null,
        email: email,
        asignatura: asignatura || null,
        nivel: nivel || null,
        plan: plan || 'free',
        role: finalRole,
        role_id: finalRoleId,
      })
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

    // Check if user is admin using admin client to bypass RLS
    const userIsAdmin = await isUserAdmin(user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, updates } = body

    if (!userId || !updates) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // If roleId is being updated, update both role and role_id
    if (updates.roleId) {
      const { data: roleData } = await (adminClient.from('roles') as any)
        .select('codigo')
        .eq('id', updates.roleId)
        .single()
      
      if (roleData) {
        updates.role = roleData.codigo
        updates.role_id = updates.roleId
      }
      delete updates.roleId
    }

    // If plan is being updated, use the RPC function to update credits automatically
    if (updates.plan) {
      const { error: rpcError } = await (adminClient.rpc as any)('actualizar_plan_usuario', {
        usuario_id: userId,
        nuevo_plan_codigo: updates.plan,
      })

      if (rpcError) {
        console.error('Error updating user plan:', rpcError)
        // Check for specific error messages
        if (rpcError.message?.includes('no existe') || rpcError.message?.includes('not exist')) {
          return NextResponse.json({ error: `El plan '${updates.plan}' no existe o no está activo` }, { status: 400 })
        }
        return NextResponse.json({ error: 'Error al actualizar el plan del usuario' }, { status: 500 })
      }

      // Remove plan from updates as it was handled by RPC
      delete updates.plan
    }

    // Update remaining fields
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await (adminClient
        .from('profiles') as any)
        .update(updates)
        .eq('id', userId)

      if (updateError) {
        console.error('Error updating user:', updateError)
        return NextResponse.json({ error: 'Error al actualizar el usuario' }, { status: 500 })
      }
    }

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
