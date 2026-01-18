import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Llamar a la función Edge de health check
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/health-check`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    )

    const data = await response.json()
    
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
    
  } catch (error) {
    console.error('Error en health check:', error)
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: 'Error al verificar el estado del sistema',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}