import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/objetivos-aprendizaje
 * Lista objetivos de aprendizaje con filtros y paginación
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar rol de admin
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'maintainer'].includes((profile as { role: string }).role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get('page') || '1')
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const categoria = searchParams.get('categoria') || ''
    const asignatura = searchParams.get('asignatura') || ''
    const nivel = searchParams.get('nivel') || ''
    const tipoObjetivo = searchParams.get('tipo_objetivo') || ''
    const priorizado = searchParams.get('priorizado') || ''

    // Construir query base
    let query = supabase
      .from('objetivos_aprendizaje')
      .select('*', { count: 'exact' })

    // Aplicar filtros
    if (search) {
      query = query.or(
        `codigo.ilike.%${search}%,asignatura.ilike.%${search}%,objetivo.ilike.%${search}%`
      )
    }

    if (categoria) {
      query = query.eq('categoria', categoria)
    }

    if (asignatura) {
      query = query.eq('asignatura', asignatura)
    }

    if (nivel) {
      query = query.eq('nivel', nivel)
    }

    if (tipoObjetivo) {
      query = query.eq('tipo_objetivo', tipoObjetivo)
    }

    if (priorizado === 'true') {
      query = query.eq('priorizado', true)
    } else if (priorizado === 'false') {
      query = query.eq('priorizado', false)
    }

    // Aplicar paginación
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching objetivos:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    })
  } catch (error) {
    console.error('Error in GET /api/admin/objetivos-aprendizaje:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/objetivos-aprendizaje
 * Crear un nuevo objetivo de aprendizaje
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar rol de admin/maintainer
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'maintainer'].includes((profile as { role: string }).role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const body = await request.json()

    // Validar campos requeridos
    const requiredFields = [
      'codigo',
      'tipo_objetivo',
      'categoria',
      'asignatura',
      'nivel',
      'curso',
      'objetivo',
    ]

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Campo requerido: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validar tipo_objetivo
    if (!['contenido', 'habilidad', 'actitud'].includes(body.tipo_objetivo)) {
      return NextResponse.json(
        { error: 'tipo_objetivo debe ser: contenido, habilidad o actitud' },
        { status: 400 }
      )
    }

    // Usar service role para crear el objetivo (bypass RLS)
    const adminSupabase = createAdminClient()

    const { data, error } = await (adminSupabase
      .from('objetivos_aprendizaje') as any)
      .insert({
        codigo: body.codigo,
        tipo_objetivo: body.tipo_objetivo,
        categoria: body.categoria,
        asignatura: body.asignatura,
        eje: body.eje || null,
        nivel: body.nivel,
        curso: body.curso,
        objetivo: body.objetivo,
        priorizado: body.priorizado || false,
        actividades: body.actividades || [],
        url_fuente: body.url_fuente || null,
        version: body.version || new Date().getFullYear().toString(),
        metadata: body.metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating objetivo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/admin/objetivos-aprendizaje:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/objetivos-aprendizaje
 * Actualizar un objetivo existente
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar rol de admin/maintainer
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'maintainer'].includes((profile as { role: string }).role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Validar tipo_objetivo si se proporciona
    if (
      body.tipo_objetivo &&
      !['contenido', 'habilidad', 'actitud'].includes(body.tipo_objetivo)
    ) {
      return NextResponse.json(
        { error: 'tipo_objetivo debe ser: contenido, habilidad o actitud' },
        { status: 400 }
      )
    }

    // Usar service role para actualizar (bypass RLS)
    const adminSupabase = createAdminClient()

    const updateData: any = {}

    // Solo incluir campos que se proporcionaron
    const allowedFields = [
      'codigo',
      'tipo_objetivo',
      'categoria',
      'asignatura',
      'eje',
      'nivel',
      'curso',
      'objetivo',
      'priorizado',
      'actividades',
      'url_fuente',
      'version',
      'metadata',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const { data, error } = await (adminSupabase
      .from('objetivos_aprendizaje') as any)
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating objetivo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PATCH /api/admin/objetivos-aprendizaje:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/objetivos-aprendizaje
 * Eliminar un objetivo de aprendizaje
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar rol de admin (solo admin puede eliminar, no maintainer)
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile as { role: string }).role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden eliminar objetivos' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Usar service role para eliminar (bypass RLS)
    const adminSupabase = createAdminClient()

    const { error } = await (adminSupabase
      .from('objetivos_aprendizaje') as any)
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting objetivo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/objetivos-aprendizaje:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
