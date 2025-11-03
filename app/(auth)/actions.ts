'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_ENV_HINT, isMissingSupabaseEnvError } from '@/lib/supabase/config'
import { ensureProfileForUser } from '@/lib/supabase/profiles'

export async function login(formData: FormData) {
  try {
    const supabase = await createClient()

    const credentials = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(credentials)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  } catch (error) {
    if (isMissingSupabaseEnvError(error)) {
      return {
        error: `Configura ${SUPABASE_ENV_HINT} para iniciar sesión.`,
      }
    }

    throw error
  }
}

export async function signup(formData: FormData) {
  try {
    const supabase = await createClient()

    const credentials = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    const nombre = formData.get('nombre') as string
    const asignatura = formData.get('asignatura') as string
    const nivel = formData.get('nivel') as string

    const { data: signUpData, error } = await supabase.auth.signUp({
      ...credentials,
      options: {
        emailRedirectTo: getEmailRedirectTo(),
        data: {
          nombre,
          asignatura,
          nivel,
        },
      },
    })

    if (error) {
      return { error: error.message }
    }

    if (signUpData.user) {
      try {
        await ensureProfileForUser(signUpData.user)
      } catch (profileError) {
        console.error('Error ensuring profile during signup action', profileError)
      }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  } catch (error) {
    if (isMissingSupabaseEnvError(error)) {
      return {
        error: `Configura ${SUPABASE_ENV_HINT} para registrarte.`,
      }
    }

    throw error
  }
}

function getEmailRedirectTo() {
  const explicitSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)

  if (explicitSiteUrl) {
    return new URL('/login', explicitSiteUrl).toString()
  }

  const headerList = headers()
  const origin = headerList.get('origin')

  if (origin) {
    return new URL('/login', origin).toString()
  }

  const protocol = headerList.get('x-forwarded-proto')
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')

  if (protocol && host) {
    return new URL('/login', `${protocol}://${host}`).toString()
  }

  if (host) {
    return new URL('/login', `https://${host}`).toString()
  }

  return 'http://localhost:3000/login'
}

export async function signout() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
  } catch (error) {
    if (isMissingSupabaseEnvError(error)) {
      return { error: 'Configura Supabase antes de cerrar sesión.' }
    }

    throw error
  }
}
