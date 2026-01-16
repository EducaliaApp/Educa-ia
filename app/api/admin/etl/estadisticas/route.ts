import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API Route para obtener estadísticas de procesos ETL
 *
 * GET /api/admin/etl/estadisticas
 * Query params:
 *   - dias: número de días para estadísticas por fecha (default: 30)
 *
 * Requiere rol de admin
 */
export async function GET(request: Request) {
  try {
    // 1. Verificar autenticación
    const supabase = await createClient()

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
    const dias = parseInt(searchParams.get('dias') || '30', 10)

    // 4. Obtener estadísticas generales
    const { data: estadisticasGenerales, error: errorEstadisticas } = await supabase
      .rpc('estadisticas_procesos_etl')

    if (errorEstadisticas) {
      console.error('[ETL Stats] Error obteniendo estadísticas generales:', errorEstadisticas)
      return NextResponse.json(
        { error: 'Error obteniendo estadísticas', detalles: errorEstadisticas.message },
        { status: 500 }
      )
    }

    // 5. Obtener estadísticas por fecha
    const { data: estadisticasPorFecha, error: errorFecha } = await supabase
      .rpc('estadisticas_procesos_por_fecha', { p_dias: dias })

    if (errorFecha) {
      console.error('[ETL Stats] Error obteniendo estadísticas por fecha:', errorFecha)
      return NextResponse.json(
        { error: 'Error obteniendo estadísticas por fecha', detalles: errorFecha.message },
        { status: 500 }
      )
    }

    // 6. Obtener resumen de documentos
    const { data: resumenDocumentos, error: errorDocumentos } = await supabase
      .rpc('resumen_documentos_transformados')

    if (errorDocumentos) {
      console.error('[ETL Stats] Error obteniendo resumen de documentos:', errorDocumentos)
      return NextResponse.json(
        { error: 'Error obteniendo resumen de documentos', detalles: errorDocumentos.message },
        { status: 500 }
      )
    }

    // 7. Retornar estadísticas completas
    return NextResponse.json({
      estadisticas_generales: estadisticasGenerales,
      estadisticas_por_fecha: estadisticasPorFecha || [],
      resumen_documentos: resumenDocumentos,
      metadata: {
        periodo_dias: dias,
        fecha_consulta: new Date().toISOString(),
      }
    })

  } catch (error) {
    console.error('[ETL Stats] Error:', error)

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
