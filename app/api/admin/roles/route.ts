import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type Role = Database['public']['Tables']['roles']['Row']
type RoleInsert = Database['public']['Tables']['roles']['Insert']
type RoleUpdate = Database['public']['Tables']['roles']['Update']

// GET: Fetch all roles
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

    const { data: roles, error: rolesError } = await adminClient
      .from('roles')
      .select('*')
      .order('codigo', { ascending: true })

    if (rolesError) {
      console.error('Error fetching roles:', rolesError)
      return NextResponse.json({ error: 'Error al obtener roles' }, { status: 500 })
    }

    return NextResponse.json({ roles })
  } catch (error) {
    console.error('Error in GET /api/admin/roles:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST: Create new role
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
    const { nombre, codigo, descripcion, permisos, activo } = body

    if (!nombre || !codigo) {
      return NextResponse.json({ error: 'Nombre y código son requeridos' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    const roleData: RoleInsert = {
      nombre,
      codigo,
      descripcion: descripcion || null,
      permisos: permisos || [],
      activo: activo !== undefined ? activo : true,
    }

    const { data: newRole, error: insertError } = await adminClient
      .from('roles')
      .insert(roleData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating role:', insertError)
      return NextResponse.json({ error: 'Error al crear el rol' }, { status: 500 })
    }

    return NextResponse.json({ role: newRole })
  } catch (error) {
    console.error('Error in POST /api/admin/roles:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PUT: Update role
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
    const { roleId, updates } = body

    if (!roleId || !updates) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    const { error: updateError } = await adminClient
      .from('roles')
      .update(updates as RoleUpdate)
      .eq('id', roleId)

    if (updateError) {
      console.error('Error updating role:', updateError)
      return NextResponse.json({ error: 'Error al actualizar el rol' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/admin/roles:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE: Delete role
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
    const roleId = searchParams.get('roleId')

    if (!roleId) {
      return NextResponse.json({ error: 'ID de rol requerido' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    const { error: deleteError } = await adminClient
      .from('roles')
      .delete()
      .eq('id', roleId)

    if (deleteError) {
      console.error('Error deleting role:', deleteError)
      return NextResponse.json({ error: 'Error al eliminar el rol' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/roles:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
