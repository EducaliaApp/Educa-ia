import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Get all users - first fetch profiles
    const { data: profiles, error: profilesError } = await (adminClient
      .from('profiles') as any)
      .select('id, nombre, email, plan, role, asignatura, nivel, created_at, creditos_planificaciones, creditos_evaluaciones, creditos_usados_planificaciones, creditos_usados_evaluaciones')
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
      total_planificaciones: countsMap.get(profile.id) || 0,
    }))

    return NextResponse.json({ users: usersWithCounts })
  } catch (error) {
    console.error('Error in GET /api/admin/usuarios:', error)
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, updates } = body

    if (!userId || !updates) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
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
