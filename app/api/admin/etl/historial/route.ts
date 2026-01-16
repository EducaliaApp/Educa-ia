import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API Route para obtener historial de procesos ETL
 *
 * GET /api/admin/etl/historial
 * Query params:
 *   - estado: filtrar por estado (optional)
 *   - tipo_proceso: filtrar por tipo (optional)
 *   - fecha_desde: fecha inicio del rango (optional, ISO 8601)
 *   - fecha_hasta: fecha fin del rango (optional, ISO 8601)
 *   - limite: número de resultados (default: 50, max: 100)
 *   - offset: offset para paginación (default: 0)
 *
 * Requiere rol de admin
 */
export async function GET(request: Request) {
  try {
    // 1. Verificar autenticación
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // 2. Verificar que el usuario sea admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere rol de administrador.' },
        { status: 403 }
      )
    }

    // 3. Obtener parámetros de query
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado') || null
    const tipo_proceso = searchParams.get('tipo_proceso') || null
    const fecha_desde = searchParams.get('fecha_desde') || null
    const fecha_hasta = searchParams.get('fecha_hasta') || null
    const limite = Math.min(parseInt(searchParams.get('limite') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // 4. Llamar a RPC function
    const { data: historial, error: errorHistorial } = await supabase
      .rpc('obtener_historial_procesos_etl', {
        p_estado: estado,
        p_tipo_proceso: tipo_proceso,
        p_fecha_desde: fecha_desde,
        p_fecha_hasta: fecha_hasta,
        p_limite: limite,
        p_offset: offset,
      })

    if (errorHistorial) {
      console.error('[ETL Historial] Error obteniendo historial:', errorHistorial)
      return NextResponse.json(
        { error: 'Error obteniendo historial', detalles: errorHistorial.message },
        { status: 500 }
      )
    }

    // 5. Retornar historial
    return NextResponse.json({
      procesos: historial || [],
      pagination: {
        limite,
        offset,
        total: historial?.length || 0,
      },
      filtros: {
        estado,
        tipo_proceso,
        fecha_desde,
        fecha_hasta,
      }
    })

  } catch (error) {
    console.error('[ETL Historial] Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        detalles: errorMessage,
      },
      { status: 500 }
    )
  }
}
