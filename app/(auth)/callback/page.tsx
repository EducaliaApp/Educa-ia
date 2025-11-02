'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { SUPABASE_ENV_HINT, isMissingSupabaseEnvError } from '@/lib/supabase/config'

type CallbackStatus = 'loading' | 'recovery' | 'success' | 'error'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<CallbackStatus>('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('Validando enlace de autenticación...')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  const queryString = searchParams.toString()

  useEffect(() => {
    const supabase = createClient()
    const params = new URLSearchParams(queryString)

    const handleAuth = async () => {
      const type = params.get('type') ?? ''
      const code = params.get('code')
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setError(error.message)
            setStatus('error')
            setMessage('No fue posible validar el enlace proporcionado.')
            return
          }
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            setError(error.message)
            setStatus('error')
            setMessage('No fue posible validar el enlace proporcionado.')
            return
          }
        } else {
          setError('El enlace que recibiste no es válido o ha expirado.')
          setStatus('error')
          setMessage('No fue posible validar el enlace proporcionado.')
          return
        }

        if (type === 'recovery') {
          setError('')
          setStatus('recovery')
          setMessage('Ingresa tu nueva contraseña para completar la recuperación.')
          return
        }

        setError('')
        setStatus('success')
        setMessage('Autenticación exitosa. Redirigiendo a tu panel...')
        router.replace('/dashboard')
        router.refresh()
      } catch (error) {
        if (isMissingSupabaseEnvError(error)) {
          setError(`Configura ${SUPABASE_ENV_HINT} para completar el proceso.`)
        } else {
          setError('Ocurrió un error inesperado al validar el enlace.')
        }
        setStatus('error')
        setMessage('No fue posible validar el enlace proporcionado.')
      }
    }

    handleAuth()
  }, [queryString, router])

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setUpdatingPassword(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        setError(error.message)
        return
      }

      setStatus('success')
      setMessage('Tu contraseña se actualizó correctamente. Redirigiendo...')
      router.replace('/dashboard')
      router.refresh()
    } catch (error) {
      if (isMissingSupabaseEnvError(error)) {
        setError(`Configura ${SUPABASE_ENV_HINT} para completar el proceso.`)
      } else {
        setError('No pudimos actualizar tu contraseña. Intenta nuevamente.')
      }
    } finally {
      setUpdatingPassword(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Profe<span className="text-primary">Flow</span>
          </h1>
          <p className="text-gray-600 mt-2">{message}</p>
        </div>

        {status === 'loading' && (
          <div className="text-center text-gray-600">Procesando tu solicitud...</div>
        )}

        {status === 'recovery' && (
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <Input
              type="password"
              label="Nueva contraseña"
              placeholder="Ingresa una nueva contraseña"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
            <Input
              type="password"
              label="Confirmar contraseña"
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" loading={updatingPassword}>
              Actualizar contraseña
            </Button>
          </form>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            <Button className="w-full" variant="outline" onClick={() => router.replace('/login')}>
              Volver al inicio de sesión
            </Button>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-lg">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
