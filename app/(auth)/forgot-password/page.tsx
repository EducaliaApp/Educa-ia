'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { SUPABASE_ENV_HINT, isMissingSupabaseEnvError } from '@/lib/supabase/config'

const getSiteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return 'http://localhost:3000'
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getSiteUrl()}/callback`,
      })

      if (resetError) {
        setError(resetError.message)
        return
      }

      setMessage('Te enviamos un correo con instrucciones para restablecer tu contraseña.')
      setEmail('')
    } catch (err) {
      if (isMissingSupabaseEnvError(err)) {
        setError(`Configura ${SUPABASE_ENV_HINT} para recuperar tu contraseña.`)
      } else {
        setError('No se pudo iniciar el proceso de recuperación. Intenta nuevamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Profe<span className="text-primary">Flow</span>
          </h1>
          <p className="text-gray-600 mt-2">Recupera tu contraseña</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Correo electrónico"
            placeholder="tu@email.cl"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {message}
            </div>
          )}

          <Button type="submit" className="w-full" variant="outline" loading={loading}>
            Enviar instrucciones
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 space-y-2">
          <p>
            Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.
          </p>
          <p>
            <Link href="/login" className="text-primary hover:underline font-medium">
              Volver al inicio de sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
