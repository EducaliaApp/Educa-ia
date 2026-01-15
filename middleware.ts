import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig, isMissingSupabaseEnvError } from '@/lib/supabase/config'
import type { Database } from '@/lib/supabase/types'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  let supabase: SupabaseClient<Database> | null = null

  try {
    const { url, anonKey } = getSupabaseConfig()

    supabase = createServerClient<Database>(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })
  } catch (error) {
    if (isMissingSupabaseEnvError(error)) {
      console.error(error.message)
      return supabaseResponse
    }

    throw error
  }

  if (!supabase) {
    return supabaseResponse
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect admin routes - require authentication and admin role
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check if user has admin role using service role to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceRoleKey) {
      try {
        const adminClient = createClient<Database>(getSupabaseConfig().url, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })

        const { data: profile, error } = await adminClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('[ADMIN AUTH] Error checking admin role:', error.message)
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        if (!profile || (profile as { role: string }).role !== 'admin') {
          console.warn('[ADMIN AUTH] User lacks admin role:', user.id)
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      } catch (error) {
        console.error('[ADMIN AUTH] Exception checking admin role:', error)
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } else {
      console.error('[ADMIN AUTH] Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth pages
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
