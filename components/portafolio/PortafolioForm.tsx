// components/portafolio/PortafolioForm.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form'
import { Loader2, Save, CheckCircle2 } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

// Schema de validación
const portafolioSchema = z.object({
  año_evaluacion: z.number()
    .min(2020, 'El año debe ser 2020 o posterior')
    .max(2030, 'El año no puede ser mayor a 2030'),
  asignatura: z.string().min(3, 'Selecciona una asignatura'),
  nivel_educativo: z.string().min(1, 'Selecciona un nivel educativo'),
  modalidad: z.string().default('regular'),
  curso_aplicacion: z.string().optional(),
  numero_estudiantes: z.number().min(1).max(50).optional(),
})

type PortafolioFormValues = z.infer<typeof portafolioSchema>

interface PortafolioFormProps {
  initialValues?: Partial<PortafolioFormValues>
  portafolioId?: string
  onSuccess?: (portafolioId: string) => void
}

const ASIGNATURAS = [
  'Matemática',
  'Lenguaje y Comunicación',
  'Historia, Geografía y Ciencias Sociales',
  'Ciencias Naturales',
  'Inglés',
  'Educación Física y Salud',
  'Artes Visuales',
  'Música',
  'Tecnología',
  'Religión',
  'Orientación',
]

const NIVELES_EDUCATIVOS = [
  { value: 'parvularia', label: 'Educación Parvularia' },
  { value: 'basica_1_6', label: 'Educación Básica 1° a 6°' },
  { value: 'basica_7_8_media', label: 'Educación Básica 7° a 8° y Media' },
  { value: 'media_tp', label: 'Educación Media Técnico-Profesional' },
  { value: 'epja', label: 'Educación de Personas Jóvenes y Adultas' },
  { value: 'especial_regular', label: 'Educación Especial Regular' },
  { value: 'especial_neep', label: 'Educación Especial NEE Permanentes' },
  { value: 'hospitalaria', label: 'Educación Hospitalaria' },
  { value: 'encierro', label: 'Educación en Contextos de Encierro' },
  { value: 'lengua_indigena', label: 'Lengua Indígena' },
]

const MODALIDADES = [
  { value: 'regular', label: 'Regular' },
  { value: 'especial', label: 'Especial' },
  { value: 'adultos', label: 'Adultos' },
]

export function PortafolioForm({
  initialValues,
  portafolioId,
  onSuccess
}: PortafolioFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<PortafolioFormValues>({
    resolver: zodResolver(portafolioSchema),
    defaultValues: {
      año_evaluacion: initialValues?.año_evaluacion || new Date().getFullYear(),
      asignatura: initialValues?.asignatura || '',
      nivel_educativo: initialValues?.nivel_educativo || '',
      modalidad: initialValues?.modalidad || 'regular',
      curso_aplicacion: initialValues?.curso_aplicacion || '',
      numero_estudiantes: initialValues?.numero_estudiantes || undefined,
    },
  })

  const onSubmit = async (values: PortafolioFormValues) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('No autenticado')
      }

      if (portafolioId) {
        // Actualizar portafolio existente
        const { error: updateError } = await supabase
          .from('portafolios')
          .update({
            ...values,
            updated_at: new Date().toISOString(),
          })
          .eq('id', portafolioId)

        if (updateError) throw updateError

        onSuccess?.(portafolioId)
      } else {
        // Crear nuevo portafolio
        const { data: portafolio, error: insertError } = await supabase
          .from('portafolios')
          .insert({
            profesor_id: user.id,
            ...values,
            estado: 'borrador',
            progreso_porcentaje: 0,
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Crear módulos automáticamente
        const modulos = [1, 2, 3].map(numero => ({
          portafolio_id: portafolio.id,
          numero_modulo: numero,
          progreso_porcentaje: 0,
          completado: false,
        }))

        const { error: modulosError } = await supabase
          .from('modulos_portafolio')
          .insert(modulos)

        if (modulosError) throw modulosError

        // Redirigir al portafolio creado
        if (onSuccess) {
          onSuccess(portafolio.id)
        } else {
          router.push(`/dashboard/portafolio/${portafolio.id}`)
        }
      }
    } catch (err: any) {
      console.error('Error al guardar portafolio:', err)
      setError(err.message || 'Error al guardar el portafolio')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Año de Evaluación */}
            <FormField
              control={form.control}
              name="año_evaluacion"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Año de Evaluación *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="2025"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Año en que realizas la evaluación docente
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Asignatura */}
            <FormField
              control={form.control}
              name="asignatura"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Asignatura *</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="">Selecciona una asignatura</option>
                      {ASIGNATURAS.map((asignatura) => (
                        <option key={asignatura} value={asignatura}>
                          {asignatura}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Asignatura que enseñas para esta evaluación
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nivel Educativo */}
            <FormField
              control={form.control}
              name="nivel_educativo"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Nivel Educativo *</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="">Selecciona un nivel educativo</option>
                      {NIVELES_EDUCATIVOS.map((nivel) => (
                        <option key={nivel.value} value={nivel.value}>
                          {nivel.label}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Nivel en el que te desempeñas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Modalidad */}
            <FormField
              control={form.control}
              name="modalidad"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Modalidad</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      {MODALIDADES.map((modalidad) => (
                        <option key={modalidad.value} value={modalidad.value}>
                          {modalidad.label}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Curso de Aplicación (Opcional) */}
            <FormField
              control={form.control}
              name="curso_aplicacion"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Curso de Aplicación (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: 5° Básico A"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Curso específico donde aplicarás las actividades del portafolio
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Número de Estudiantes (Opcional) */}
            <FormField
              control={form.control}
              name="numero_estudiantes"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Número de Estudiantes (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="30"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>
                    Cantidad de estudiantes en el curso
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : portafolioId ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Actualizar Portafolio
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Crear Portafolio
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Card>
  )
}
