'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import Loading from '@/components/ui/Loading'
import { useToast } from '@/components/ui/Toast'

const ASIGNATURAS = [
  { value: 'Matemática', label: 'Matemática' },
  { value: 'Lenguaje y Comunicación', label: 'Lenguaje y Comunicación' },
  { value: 'Historia y Geografía', label: 'Historia y Geografía' },
  { value: 'Ciencias Naturales', label: 'Ciencias Naturales' },
  { value: 'Inglés', label: 'Inglés' },
  { value: 'Artes Visuales', label: 'Artes Visuales' },
  { value: 'Música', label: 'Música' },
  { value: 'Educación Física', label: 'Educación Física' },
  { value: 'Tecnología', label: 'Tecnología' },
]

const NIVELES = [
  { value: '1° Básico', label: '1° Básico' },
  { value: '2° Básico', label: '2° Básico' },
  { value: '3° Básico', label: '3° Básico' },
  { value: '4° Básico', label: '4° Básico' },
  { value: '5° Básico', label: '5° Básico' },
  { value: '6° Básico', label: '6° Básico' },
  { value: '7° Básico', label: '7° Básico' },
  { value: '8° Básico', label: '8° Básico' },
  { value: '1° Medio', label: '1° Medio' },
  { value: '2° Medio', label: '2° Medio' },
  { value: '3° Medio', label: '3° Medio' },
  { value: '4° Medio', label: '4° Medio' },
]

export default function NuevaPlanificacionPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    asignatura: '',
    nivel: '',
    unidad: '',
    duracion_clases: '8',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.asignatura || !formData.nivel || !formData.unidad || !formData.duracion_clases) {
      showToast('Todos los campos son obligatorios', 'error')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/planificaciones/generar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          showToast(data.error, 'error')
          router.push('/upgrade')
          return
        }
        throw new Error(data.error || 'Error al generar planificación')
      }

      showToast('Planificación generada con éxito', 'success')
      router.push(`/dashboard/planificaciones/${data.planificacion.id}`)
    } catch (error: any) {
      showToast(error.message || 'Error al generar planificación', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loading size="lg" text="Generando planificación con IA... Esto puede tomar unos momentos." />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nueva Planificación</h1>
        <p className="text-gray-600 mt-2">
          Genera una planificación curricular completa con IA en minutos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la Planificación</CardTitle>
          <CardDescription>
            Completa los siguientes campos para generar tu planificación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Select
              name="asignatura"
              label="Asignatura"
              options={ASIGNATURAS}
              value={formData.asignatura}
              onChange={handleChange}
              required
            />

            <Select
              name="nivel"
              label="Nivel"
              options={NIVELES}
              value={formData.nivel}
              onChange={handleChange}
              required
            />

            <Input
              type="text"
              name="unidad"
              label="Unidad Temática"
              placeholder="Ej: Los números hasta el 1000"
              value={formData.unidad}
              onChange={handleChange}
              required
            />

            <Input
              type="number"
              name="duracion_clases"
              label="Duración en clases (de 90 minutos)"
              placeholder="8"
              value={formData.duracion_clases}
              onChange={handleChange}
              min="1"
              max="20"
              required
            />

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Generar con IA
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
