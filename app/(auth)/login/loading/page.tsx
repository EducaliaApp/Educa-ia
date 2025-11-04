'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { SUPABASE_ENV_HINT, isMissingSupabaseEnvError } from '@/lib/supabase/config'
import { consumeLoginPayload } from '@/lib/auth/login-storage'

type LoginStatus = 'loading' | 'error' | 'missing'

export default function LoginLoadingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<LoginStatus>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    let supabase: ReturnType<typeof createClient>
    try {
      supabase = createClient()
    } catch (error) {
      if (isMissingSupabaseEnvError(error)) {
        setError(`Configura ${SUPABASE_ENV_HINT} para iniciar sesión.`)
      } else {
        setError('Error inesperado al preparar la autenticación. Vuelve a intentarlo.')
      }
      setStatus('error')
      return
    }

    const payload = consumeLoginPayload()

    if (!payload) {
      setStatus('missing')
      return
    }

    const authenticate = async () => {
      try {
        const { error: authError } = await supabase.auth.signInWithPassword(payload)

        if (!active) {
          return
        }

        if (authError) {
          setError(authError.message)
          setStatus('error')
          return
        }

        router.replace('/dashboard')
        router.refresh()
      } catch (error) {
        if (!active) {
          return
        }

        if (isMissingSupabaseEnvError(error)) {
          setError(`Configura ${SUPABASE_ENV_HINT} para iniciar sesión.`)
        } else {
          setError('Error inesperado al validar tus credenciales. Vuelve a intentarlo.')
        }
        setStatus('error')
      }
    }

    authenticate()

    return () => {
      active = false
    }
  }, [router])

  const handleBackToLogin = () => {
    router.replace('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center space-y-6">
        {status === 'loading' && (
          <>
            <div className="relative flex items-center justify-center">
              <div className="h-20 w-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <span className="sr-only">Validando credenciales…</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-gray-900">Validando credenciales</h1>
              <p className="text-gray-600">Estamos comprobando tu información de acceso. Esto tomará solo un momento.</p>
            </div>
          </>
        )}

        {status === 'missing' && (
          <>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-gray-900">No encontramos tus credenciales</h1>
              <p className="text-gray-600">
                Para iniciar sesión, vuelve al formulario e ingresa tu email y contraseña.
              </p>
            </div>
            <Button type="button" className="w-full" onClick={handleBackToLogin}>
              Volver al inicio de sesión
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-gray-900">No pudimos iniciar sesión</h1>
              <p className="text-gray-600">{error}</p>
            </div>
            <Button type="button" className="w-full" onClick={handleBackToLogin}>
              Intentar nuevamente
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
