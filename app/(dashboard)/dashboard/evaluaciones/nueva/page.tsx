'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import Loading from '@/components/ui/Loading'
import { useToast } from '@/components/ui/Toast'

const TIPOS_EVALUACION = [
  { value: 'sumativa', label: 'Sumativa' },
  { value: 'formativa', label: 'Formativa' },
  { value: 'autoevaluacion', label: 'Autoevaluación' },
]

export default function NuevaEvaluacionPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    tipo: '',
    instrucciones: '',
  })
  const [feedback, setFeedback] = useState<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']

      if (!validTypes.includes(selectedFile.type)) {
        showToast('Por favor selecciona una imagen (JPG, PNG) o PDF', 'error')
        return
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        showToast('El archivo es muy grande. Máximo 10MB', 'error')
        return
      }

      setFile(selectedFile)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !formData.tipo) {
      showToast('Por favor completa todos los campos obligatorios', 'error')
      return
    }

    setLoading(true)

    try {
      // Por ahora, simularemos la evaluación con un feedback genérico
      // En producción, aquí subirías el archivo y llamarías a OpenAI Vision API

      const mockFeedback = {
        fortalezas: [
          'Demuestra comprensión del tema',
          'Presenta sus ideas de forma organizada',
          'Utiliza vocabulario apropiado para el nivel',
        ],
        areasDeMemejora: [
          'Podría profundizar más en los ejemplos',
          'Faltan algunas conexiones entre ideas',
          'La conclusión podría ser más contundente',
        ],
        sugerencias: [
          'Incluir más ejemplos concretos para apoyar tus argumentos',
          'Revisar la estructura de algunos párrafos para mejorar la fluidez',
          'Expandir la conclusión resumiendo los puntos principales',
        ],
        notaSugerida: '6.0',
        comentarioGeneral: 'Buen trabajo en general. El estudiante muestra comprensión del tema pero puede mejorar en la profundidad del análisis y la articulación de ideas.',
      }

      // Simular delay de la API
      await new Promise(resolve => setTimeout(resolve, 2000))

      setFeedback(mockFeedback)
      showToast('Evaluación generada con éxito', 'success')
    } catch (error: any) {
      showToast(error.message || 'Error al generar evaluación', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loading size="lg" text="Analizando con LIA... Esto puede tomar unos momentos." />
      </div>
    )
  }

  if (feedback) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Feedback Generado</h1>
          <p className="text-gray-600 mt-2">
            Retroalimentación constructiva generada por LIA
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fortalezas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {feedback.fortalezas.map((fortaleza: string, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">{fortaleza}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Áreas de Mejora</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {feedback.areasDeMemejora.map((area: string, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-yellow-500 font-bold">⚡</span>
                  <span className="text-gray-700">{area}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sugerencias Específicas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {feedback.sugerencias.map((sugerencia: string, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold">💡</span>
                  <span className="text-gray-700">{sugerencia}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comentario General</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{feedback.comentarioGeneral}</p>
            {feedback.notaSugerida && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Nota sugerida:</strong> {feedback.notaSugerida}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => {
              setFeedback(null)
              setFile(null)
              setFormData({ tipo: '', instrucciones: '' })
            }}
            className="flex-1"
          >
            Nueva Evaluación
          </Button>
          <Button
            onClick={() => router.push('/dashboard/evaluaciones')}
            className="flex-1"
          >
            Ir a mis evaluaciones
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nueva Evaluación</h1>
        <p className="text-gray-600 mt-2">
          Sube el trabajo de un estudiante y recibe feedback constructivo generado por LIA
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la Evaluación</CardTitle>
          <CardDescription>
            Sube una imagen o PDF del trabajo y proporciona contexto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo del trabajo *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm font-medium text-gray-900">
                    {file ? file.name : 'Haz clic para subir un archivo'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    PNG, JPG o PDF (máx. 10MB)
                  </p>
                </label>
              </div>
            </div>

            <Select
              name="tipo"
              label="Tipo de Evaluación"
              options={TIPOS_EVALUACION}
              value={formData.tipo}
              onChange={handleChange}
              required
            />

            <Textarea
              name="instrucciones"
              label="Instrucciones de evaluación (opcional)"
              placeholder="Ej: Enfócate en la ortografía y coherencia del texto"
              value={formData.instrucciones}
              onChange={handleChange}
              rows={4}
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
              <Button type="submit" variant="secondary" className="flex-1">
                Evaluar con LIA
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
