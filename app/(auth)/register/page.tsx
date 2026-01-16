'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import GoogleIcon from '@/components/icons/GoogleIcon'
import { createClient } from '@/lib/supabase/client'
import { SUPABASE_ENV_HINT, isMissingSupabaseEnvError } from '@/lib/supabase/config'
import { getAuthCallbackUrl } from '@/lib/supabase/urls'

const ASIGNATURAS = [
  { value: 'matematica', label: 'Matemática' },
  { value: 'lenguaje', label: 'Lenguaje y Comunicación' },
  { value: 'historia', label: 'Historia y Geografía' },
  { value: 'ciencias', label: 'Ciencias Naturales' },
  { value: 'ingles', label: 'Inglés' },
  { value: 'artes', label: 'Artes Visuales' },
  { value: 'musica', label: 'Música' },
  { value: 'ed_fisica', label: 'Educación Física' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'otra', label: 'Otra' },
]

const NIVELES = [
  { value: '1_basico', label: '1° Básico' },
  { value: '2_basico', label: '2° Básico' },
  { value: '3_basico', label: '3° Básico' },
  { value: '4_basico', label: '4° Básico' },
  { value: '5_basico', label: '5° Básico' },
  { value: '6_basico', label: '6° Básico' },
  { value: '7_basico', label: '7° Básico' },
  { value: '8_basico', label: '8° Básico' },
  { value: '1_medio', label: '1° Medio' },
  { value: '2_medio', label: '2° Medio' },
  { value: '3_medio', label: '3° Medio' },
  { value: '4_medio', label: '4° Medio' },
]

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    asignatura: '',
    nivel: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!formData.nombre || !formData.email || !formData.password || !formData.asignatura || !formData.nivel) {
      setError('Todos los campos son obligatorios')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nombre: formData.nombre,
            asignatura: formData.asignatura,
            nivel: formData.nivel,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      router.push(`/register/verify-email?email=${encodeURIComponent(formData.email)}`)
    } catch (error) {
      if (isMissingSupabaseEnvError(error)) {
        setError(`Configura ${SUPABASE_ENV_HINT} para crear una cuenta.`)
      } else {
        setError('Error inesperado al crear la cuenta')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError('')
    setGoogleLoading(true)

    try {
      const supabase = createClient()
      const redirectTo = getAuthCallbackUrl('/dashboard')

      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      if (data?.url) {
        window.location.href = data.url
      }
    } catch (error) {
      if (isMissingSupabaseEnvError(error)) {
        setError(`Configura ${SUPABASE_ENV_HINT} para registrarte con Google.`)
      } else {
        setError('Error inesperado al conectar con Google')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Profe<span className="text-primary">Flow</span>
          </h1>
          <p className="text-gray-600 mt-2">Crea tu cuenta gratis</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading || googleLoading}>
          <Input
            type="text"
            name="nombre"
            label="Nombre Completo"
            placeholder="Juan Pérez"
            value={formData.nombre}
            onChange={handleChange}
            required
            autoComplete="name"
          />

          <Input
            type="email"
            name="email"
            label="Email"
            placeholder="tu@email.cl"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />

          <Input
            type="password"
            name="password"
            label="Contraseña"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            autoComplete="new-password"
          />

          <Select
            name="asignatura"
            label="Asignatura Principal"
            options={ASIGNATURAS}
            value={formData.asignatura}
            onChange={handleChange}
            required
          />

          <Select
            name="nivel"
            label="Nivel que enseñas"
            options={NIVELES}
            value={formData.nivel}
            onChange={handleChange}
            required
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" loading={loading} disabled={googleLoading}>
            Crear Cuenta
          </Button>
        </form>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">O crea tu cuenta con</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleSignUp}
            loading={googleLoading}
            disabled={loading}
          >
            <GoogleIcon className="h-5 w-5" />
            Google
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
