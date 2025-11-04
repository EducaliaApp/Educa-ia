'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Crown, Save } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import Loading from '@/components/ui/Loading'
import { useToast } from '@/components/ui/Toast'
import type { Profile } from '@/lib/supabase/types'

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

type UpdateProfilePayload = {
  nombre: string
  asignatura: string
  nivel: string
}

type ApiProfileResponse = {
  profile: Profile
}

type ApiErrorResponse = {
  error: string
}

async function fetchProfileFromApi(): Promise<ApiProfileResponse> {
  const response = await fetch('/api/profile', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as ApiErrorResponse | null
    const message = data?.error ?? 'Error al cargar perfil'
    throw new Error(message)
  }

  return (await response.json()) as ApiProfileResponse
}

async function updateProfileThroughApi(payload: UpdateProfilePayload): Promise<ApiProfileResponse> {
  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as ApiErrorResponse | null
    const message = data?.error ?? 'Error al actualizar perfil'
    throw new Error(message)
  }

  return (await response.json()) as ApiProfileResponse
}

export default function SettingsPage() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState<UpdateProfilePayload>({
    nombre: '',
    asignatura: '',
    nivel: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)

    try {
      const { profile } = await fetchProfileFromApi()

      setProfile(profile)
      setFormData({
        nombre: profile.nombre ?? '',
        asignatura: profile.asignatura ?? '',
        nivel: profile.nivel ?? '',
      })
    } catch (error) {
      console.error('Error al cargar perfil:', error)
      showToast('Error al cargar perfil', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { profile: updatedProfile } = await updateProfileThroughApi({
        nombre: formData.nombre,
        asignatura: formData.asignatura,
        nivel: formData.nivel,
      })

      setProfile(updatedProfile)
      setFormData({
        nombre: updatedProfile.nombre ?? '',
        asignatura: updatedProfile.asignatura ?? '',
        nivel: updatedProfile.nivel ?? '',
      })
      showToast('Perfil actualizado con éxito', 'success')
    } catch (error: any) {
      showToast(error.message || 'Error al actualizar perfil', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loading size="lg" text="Cargando configuración..." />
      </div>
    )
  }

  const isPro = profile?.plan === 'pro'
  const creditosPlanificaciones = profile?.creditos_usados_planificaciones || 0
  const creditosEvaluaciones = profile?.creditos_usados_evaluaciones || 0
  const limitePlanificaciones = isPro ? '∞' : profile?.creditos_planificaciones || 5
  const limiteEvaluaciones = isPro ? '∞' : profile?.creditos_evaluaciones || 3

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mi Cuenta</h1>
        <p className="text-gray-600 mt-2">
          Gestiona tu perfil y plan de ProfeFlow
        </p>
      </div>

      {/* Plan Actual */}
      <Card className={isPro ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isPro && <Crown className="h-6 w-6 text-yellow-500" />}
                Plan {isPro ? 'PRO' : 'FREE'}
              </CardTitle>
              <CardDescription>
                {isPro
                  ? 'Acceso ilimitado a todas las funciones'
                  : 'Plan gratuito con límites mensuales'}
              </CardDescription>
            </div>
            {!isPro && (
              <Link href="/upgrade">
                <Button>
                  <Crown className="h-4 w-4 mr-2" />
                  Actualizar a PRO
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">
                Planificaciones este mes
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {creditosPlanificaciones} <span className="text-lg text-gray-500">/ {limitePlanificaciones}</span>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">
                Evaluaciones este mes
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {creditosEvaluaciones} <span className="text-lg text-gray-500">/ {limiteEvaluaciones}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información del Perfil */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Perfil</CardTitle>
          <CardDescription>
            Actualiza tus datos personales y preferencias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="email"
              label="Email"
              value={profile?.email || ''}
              disabled
            />

            <Input
              type="text"
              name="nombre"
              label="Nombre Completo"
              value={formData.nombre}
              onChange={handleChange}
              required
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

            <div className="flex justify-end">
              <Button type="submit" loading={saving}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Información de la cuenta */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Cuenta creada</span>
            <span className="font-medium">
              {new Date(profile?.created_at).toLocaleDateString('es-CL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Estado</span>
            <span className="font-medium text-green-600">Activa</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">ID de usuario</span>
            <span className="font-mono text-xs text-gray-500">{profile?.id}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
