import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureProfileForUser, getProfileById } from '@/lib/supabase/profiles'

const updateProfileSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  asignatura: z.string().trim().min(1, 'La asignatura es obligatoria'),
  nivel: z.string().trim().min(1, 'El nivel es obligatorio'),
})

function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('Failed to authenticate user profile request', authError)
      return createErrorResponse('No se pudo autenticar al usuario', 401)
    }

    if (!user) {
      return createErrorResponse('No autorizado', 401)
    }

    const profile = await ensureProfileForUser(user)

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Failed to load profile via API route', error)
    return createErrorResponse('Error al cargar perfil', 500)
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('Failed to authenticate user profile update', authError)
      return createErrorResponse('No se pudo autenticar al usuario', 401)
    }

    if (!user) {
      return createErrorResponse('No autorizado', 401)
    }

    const payload = await request.json().catch(() => null)

    const parsed = updateProfileSchema.safeParse(payload)

    if (!parsed.success) {
      return createErrorResponse('Datos inválidos para actualizar el perfil', 400)
    }

    const adminClient = createAdminClient()

    await ensureProfileForUser(user)

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        nombre: parsed.data.nombre,
        asignatura: parsed.data.asignatura,
        nivel: parsed.data.nivel,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update profile via API route', updateError)
      return createErrorResponse('Error al actualizar perfil', 500)
    }

    const updatedProfile = await getProfileById(user.id)

    if (!updatedProfile) {
      return createErrorResponse('Perfil no encontrado después de actualizar', 404)
    }

    return NextResponse.json({ profile: updatedProfile })
  } catch (error) {
    console.error('Unexpected error updating profile via API route', error)
    return createErrorResponse('Error al actualizar perfil', 500)
  }
}
