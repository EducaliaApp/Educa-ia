'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { SUPABASE_ENV_HINT, isMissingSupabaseEnvError } from '@/lib/supabase/config'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicEmail, setMagicEmail] = useState('')
  const [magicMessage, setMagicMessage] = useState('')
  const [magicError, setMagicError] = useState('')
  const [magicLoading, setMagicLoading] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const router = useRouter()

  const getSiteUrl = () => {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    }

    if (typeof window !== 'undefined') {
      return window.location.origin
    }

    return 'http://localhost:3000'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      if (isMissingSupabaseEnvError(error)) {
        setError(`Configura ${SUPABASE_ENV_HINT} para iniciar sesión.`)
      } else {
        setError('Error inesperado al iniciar sesión')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setMagicError('')
    setMagicMessage('')
    setMagicLoading(true)

    try {
      const supabase = createClient()

      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: magicEmail,
        options: {
          emailRedirectTo: `${getSiteUrl()}/callback`,
        },
      })

      if (magicLinkError) {
        setMagicError(magicLinkError.message)
        return
      }

      setMagicMessage('Hemos enviado un enlace mágico a tu correo. Revisa tu bandeja de entrada.')
      setMagicEmail('')
    } catch (error) {
      if (isMissingSupabaseEnvError(error)) {
        setMagicError(`Configura ${SUPABASE_ENV_HINT} para usar el enlace mágico.`)
      } else {
        setMagicError('No se pudo enviar el enlace mágico. Intenta nuevamente.')
      }
    } finally {
      setMagicLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError('')
    setResetMessage('')
    setResetLoading(true)

    try {
      const supabase = createClient()

      const { error: resetErrorResponse } = await supabase.auth.resetPasswordForEmail(
        resetEmail,
        {
          redirectTo: `${getSiteUrl()}/callback`,
        }
      )

      if (resetErrorResponse) {
        setResetError(resetErrorResponse.message)
        return
      }

      setResetMessage('Te enviamos un correo con instrucciones para restablecer tu contraseña.')
      setResetEmail('')
    } catch (error) {
      if (isMissingSupabaseEnvError(error)) {
        setResetError(`Configura ${SUPABASE_ENV_HINT} para recuperar tu contraseña.`)
      } else {
        setResetError('No se pudo iniciar el proceso de recuperación. Intenta nuevamente.')
      }
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Profe<span className="text-primary">Flow</span>
          </h1>
          <p className="text-gray-600 mt-2">Inicia sesión en tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email"
            placeholder="tu@email.cl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            type="password"
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Iniciar Sesión
          </Button>
        </form>

        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Inicia sesión con un enlace mágico</h2>
          <p className="text-sm text-gray-600 mb-3">
            Te enviaremos un enlace a tu correo electrónico para que puedas ingresar sin contraseña.
          </p>
          <form onSubmit={handleMagicLink} className="space-y-3">
            <Input
              type="email"
              label="Correo electrónico"
              placeholder="tu@email.cl"
              value={magicEmail}
              onChange={(e) => setMagicEmail(e.target.value)}
              required
            />
            {magicError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {magicError}
              </div>
            )}
            {magicMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {magicMessage}
              </div>
            )}
            <Button type="submit" className="w-full" variant="secondary" loading={magicLoading}>
              Enviar enlace mágico
            </Button>
          </form>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">¿Olvidaste tu contraseña?</h2>
          <p className="text-sm text-gray-600 mb-3">
            Ingresa tu correo y te enviaremos un enlace para restablecerla.
          </p>
          <form onSubmit={handlePasswordReset} className="space-y-3">
            <Input
              type="email"
              label="Correo electrónico"
              placeholder="tu@email.cl"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
            {resetError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {resetError}
              </div>
            )}
            {resetMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {resetMessage}
              </div>
            )}
            <Button type="submit" className="w-full" variant="outline" loading={resetLoading}>
              Recuperar contraseña
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
