'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const nombre = formData.get('nombre') as string
  const asignatura = formData.get('asignatura') as string
  const nivel = formData.get('nivel') as string

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    return { error: error.message }
  }

  // Actualizar perfil con datos adicionales
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        nombre,
        asignatura,
        nivel,
      })
      .eq('id', authData.user.id)

    if (profileError) {
      return { error: profileError.message }
    }

    // Aquí se enviaría el email de bienvenida con Resend
    // await sendWelcomeEmail(data.email, nombre)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
