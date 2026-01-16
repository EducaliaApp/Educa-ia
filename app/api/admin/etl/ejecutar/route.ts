import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API Route para ejecutar procesos ETL desde el frontend
 *
 * POST /api/admin/etl/ejecutar
 * Body: {
 *   proceso: 'extraer_bases_curriculares' | string
 *   config?: { force?: boolean, ... }
 * }
 *
 * Requiere rol de admin
 */
export async function POST(request: NextRequest) {
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

    // 3. Obtener parámetros del request
    const { proceso, config = {} } = await request.json()

    if (!proceso) {
      return NextResponse.json(
        { error: 'El parámetro "proceso" es requerido' },
        { status: 400 }
      )
    }

    // 4. Mapear proceso a Edge Function
    const funcionesDisponibles: Record<string, string> = {
      'extraer_bases_curriculares': 'extraer-bases-curriculares',
      // Agregar más procesos aquí en el futuro
      // 'extraer_rubricas': 'extraer-rubricas',
    }

    const nombreFuncion = funcionesDisponibles[proceso]

    if (!nombreFuncion) {
      return NextResponse.json(
        {
          error: 'Proceso no disponible',
          procesos_disponibles: Object.keys(funcionesDisponibles)
        },
        { status: 400 }
      )
    }

    // 5. Obtener token de sesión
    const { data: session } = await supabase.auth.getSession()

    if (!session?.session?.access_token) {
      return NextResponse.json(
        { error: 'No se pudo obtener el token de sesión' },
        { status: 401 }
      )
    }

    // 6. Llamar a la Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Configuración de Supabase no disponible' },
        { status: 500 }
      )
    }

    const funcionUrl = `${supabaseUrl}/functions/v1/${nombreFuncion}`

    console.log(`[ETL API] Ejecutando función: ${nombreFuncion}`)
    console.log(`[ETL API] URL: ${funcionUrl}`)
    console.log(`[ETL API] Config:`, config)

    const response = await fetch(funcionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session.access_token}`,
      },
      body: JSON.stringify(config),
    })

    // 7. Procesar respuesta
    const responseText = await response.text()
    let resultado

    try {
      resultado = JSON.parse(responseText)
    } catch {
      // Si no es JSON, retornar el texto crudo
      resultado = { resultado: responseText }
    }

    if (!response.ok) {
      console.error(`[ETL API] Error ejecutando función:`, resultado)
      return NextResponse.json(
        {
          error: 'Error ejecutando el proceso ETL',
          detalles: resultado.error || resultado,
          status: response.status,
        },
        { status: response.status }
      )
    }

    console.log(`[ETL API] Proceso ejecutado exitosamente`)
    console.log(`[ETL API] Proceso ID:`, resultado.proceso_id)

    // 8. Retornar resultado exitoso
    return NextResponse.json({
      success: true,
      proceso: proceso,
      resultado: resultado,
      mensaje: `Proceso ${proceso} ejecutado exitosamente`,
    })

  } catch (error) {
    console.error('[ETL API] Error:', error)

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

/**
 * GET /api/admin/etl/ejecutar
 * Lista los procesos ETL disponibles para ejecutar
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      procesos_disponibles: [
        {
          id: 'extraer_bases_curriculares',
          nombre: 'Extraer Bases Curriculares',
          descripcion: 'Extrae objetivos de aprendizaje desde curriculumnacional.cl',
          tipo: 'extraccion',
          config_disponible: {
            force: 'boolean - Forzar extracción incluso si ya existe data reciente'
          }
        },
        // Agregar más procesos aquí
      ]
    })
  } catch (error) {
    console.error('[ETL API] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
