import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isUserAdmin } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type Plan = Database['public']['Tables']['planes']['Row']
type PlanInsert = Database['public']['Tables']['planes']['Insert']
type PlanUpdate = Database['public']['Tables']['planes']['Update']
type PlanLimite = Database['public']['Tables']['planes_limites']['Row']
type PlanLimiteInsert = Database['public']['Tables']['planes_limites']['Insert']
type PlanLimiteUpdate = Database['public']['Tables']['planes_limites']['Update']

// GET: Fetch all planes with their limits
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[GET /api/admin/planes] Auth error:', authError)
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Check if user is admin using admin client to bypass RLS
    const userIsAdmin = await isUserAdmin(user.id)
    if (!userIsAdmin) {
      console.warn('[GET /api/admin/planes] User is not admin:', user.id)
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    const { data: planesData, error: planesError } = await adminClient
      .from('planes')
      .select('*')
      .order('codigo', { ascending: true })

    if (planesError) {
      console.error('Error fetching planes:', planesError)
      return NextResponse.json({ error: 'Error al obtener planes' }, { status: 500 })
    }

    const { data: limitesData, error: limitesError } = await adminClient
      .from('planes_limites')
      .select('*')

    if (limitesError) {
      console.error('Error fetching limites:', limitesError)
      return NextResponse.json({ error: 'Error al obtener límites' }, { status: 500 })
    }

    const planesConLimites = (planesData || []).map((plan: Plan) => ({
      ...plan,
      limites: limitesData?.find((l: PlanLimite) => l.plan_id === plan.id),
    }))

    return NextResponse.json({ planes: planesConLimites })
  } catch (error) {
    console.error('Error in GET /api/admin/planes:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST: Create new plan
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
    const {
      nombre,
      codigo,
      descripcion,
      precio_mensual_clp,
      activo,
      caracteristicas,
      creditos_planificaciones,
      creditos_evaluaciones,
      analisis_portafolio,
      exportar_pdf,
      soporte_prioritario,
    } = body

    if (!nombre || !codigo) {
      return NextResponse.json({ error: 'Nombre y código son requeridos' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Create plan
    const { data: newPlan, error: planError } = await (adminClient
      .from('planes') as any)
      .insert({
        nombre,
        codigo,
        descripcion: descripcion || null,
        precio_mensual_clp: precio_mensual_clp || 0,
        activo: activo !== undefined ? activo : true,
        caracteristicas: caracteristicas || [],
      })
      .select()
      .single()

    if (planError) {
      console.error('Error creating plan:', planError)
      return NextResponse.json({ error: 'Error al crear el plan' }, { status: 500 })
    }

    // Create limits for the new plan
    const { error: limitesError } = await (adminClient
      .from('planes_limites') as any)
      .insert({
        plan_id: newPlan.id,
        creditos_planificaciones: creditos_planificaciones || 0,
        creditos_evaluaciones: creditos_evaluaciones || 0,
        analisis_portafolio: analisis_portafolio || false,
        exportar_pdf: exportar_pdf || false,
        soporte_prioritario: soporte_prioritario || false,
      })

    if (limitesError) {
      console.error('Error creating limits:', limitesError)
      // Attempt rollback - log if it fails but don't throw to client
      try {
        await adminClient.from('planes').delete().eq('id', newPlan.id)
      } catch (rollbackError) {
        console.error('Critical: Failed to rollback plan creation:', rollbackError)
        // In a production system, this should trigger an alert
      }
      return NextResponse.json({ error: 'Error al crear los límites del plan' }, { status: 500 })
    }

    return NextResponse.json({ plan: newPlan })
  } catch (error) {
    console.error('Error in POST /api/admin/planes:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PUT: Update plan
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
    const { planId, planUpdates, limitesUpdates } = body

    if (!planId) {
      return NextResponse.json({ error: 'ID de plan requerido' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Update plan if there are updates
    if (planUpdates && Object.keys(planUpdates).length > 0) {
      const { error: planError } = await (adminClient
        .from('planes') as any)
        .update(planUpdates)
        .eq('id', planId)

      if (planError) {
        console.error('Error updating plan:', planError)
        return NextResponse.json({ error: 'Error al actualizar el plan' }, { status: 500 })
      }
    }

    // Update limits if there are updates
    if (limitesUpdates && Object.keys(limitesUpdates).length > 0) {
      const { error: limitesError } = await (adminClient
        .from('planes_limites') as any)
        .update(limitesUpdates)
        .eq('plan_id', planId)

      if (limitesError) {
        console.error('Error updating limits:', limitesError)
        return NextResponse.json({ error: 'Error al actualizar los límites' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/admin/planes:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE: Delete plan
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
    const planId = searchParams.get('planId')

    if (!planId) {
      return NextResponse.json({ error: 'ID de plan requerido' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Delete plan (limits will cascade)
    const { error: deleteError } = await adminClient
      .from('planes')
      .delete()
      .eq('id', planId)

    if (deleteError) {
      console.error('Error deleting plan:', deleteError)
      return NextResponse.json({ error: 'Error al eliminar el plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/planes:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
