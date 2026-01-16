import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/objetivos-aprendizaje/filtros
 * Obtiene las opciones únicas para los filtros
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

    if (!profile || !['admin', 'maintainer'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    // Obtener valores únicos para cada filtro
    const { data: categorias } = await supabase
      .from('objetivos_aprendizaje')
      .select('categoria')
      .order('categoria')

    const { data: asignaturas } = await supabase
      .from('objetivos_aprendizaje')
      .select('asignatura')
      .order('asignatura')

    const { data: niveles } = await supabase
      .from('objetivos_aprendizaje')
      .select('nivel')
      .order('nivel')

    const { data: tipos } = await supabase
      .from('objetivos_aprendizaje')
      .select('tipo_objetivo')
      .order('tipo_objetivo')

    // Obtener valores únicos
    const categoriasUnicas = Array.from(new Set(categorias?.map((c) => c.categoria) || []))
    const asignaturasUnicas = Array.from(new Set(asignaturas?.map((a) => a.asignatura) || []))
    const nivelesUnicos = Array.from(new Set(niveles?.map((n) => n.nivel) || []))
    const tiposUnicos = Array.from(new Set(tipos?.map((t) => t.tipo_objetivo) || []))

    return NextResponse.json({
      categorias: categoriasUnicas,
      asignaturas: asignaturasUnicas,
      niveles: nivelesUnicos,
      tipos: tiposUnicos,
    })
  } catch (error) {
    console.error('Error in GET /api/admin/objetivos-aprendizaje/filtros:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
