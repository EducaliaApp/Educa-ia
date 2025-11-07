// components/portafolio/PortafolioForm.tsx
'use client'

import { useEffect, useState } from 'react'
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

const PORTAFOLIO_METADATA_SQL = `
ALTER TABLE portafolios
  ADD COLUMN IF NOT EXISTS nombre TEXT;

ALTER TABLE portafolios
  ADD COLUMN IF NOT EXISTS curso_aplicacion TEXT;

ALTER TABLE portafolios
  ADD COLUMN IF NOT EXISTS numero_estudiantes INTEGER;

ALTER TABLE portafolios
  ADD COLUMN IF NOT EXISTS fecha_limite DATE;
`

const MODULOS_PROGRESS_SQL = `
ALTER TABLE modulos_portafolio
  ADD COLUMN IF NOT EXISTS progreso_porcentaje INTEGER DEFAULT 0;

UPDATE modulos_portafolio
  SET progreso_porcentaje = 0
  WHERE progreso_porcentaje IS NULL;

ALTER TABLE modulos_portafolio
  ALTER COLUMN progreso_porcentaje SET DEFAULT 0;
`

const MODULOS_TIPO_SQL = `
UPDATE modulos_portafolio
SET tipo_modulo = CASE
  WHEN numero_modulo = 1 THEN 'planificacion'
  WHEN numero_modulo = 2 THEN 'clase_grabada'
  WHEN numero_modulo = 3 THEN 'trabajo_colaborativo'
  ELSE 'modulo_generico'
END
WHERE tipo_modulo IS NULL OR tipo_modulo = '';
`

const mapSupabaseErrorToMessage = (error: any): string | null => {
  const rawMessage = error?.message || ''

  if (
    rawMessage.includes("Could not find the 'curso_aplicacion' column of 'portafolios'") ||
    rawMessage.includes("column 'curso_aplicacion'")
  ) {
    return [
      'Falta agregar las columnas opcionales del portafolio en Supabase.',
      'Ejecuta el siguiente script en tu base de datos y vuelve a intentarlo:',
      '',
      PORTAFOLIO_METADATA_SQL.trim(),
    ].join('\n')
  }

  if (
    rawMessage.includes("Could not find the 'fecha_limite' column of 'portafolios'") ||
    rawMessage.includes("column 'fecha_limite'")
  ) {
    return [
      'La columna fecha_limite no existe en Supabase.',
      'Agrega las columnas recomendadas ejecutando:',
      '',
      PORTAFOLIO_METADATA_SQL.trim(),
    ].join('\n')
  }

  if (
    rawMessage.includes("Could not find the 'nombre' column of 'portafolios'") ||
    rawMessage.includes("column 'nombre'")
  ) {
    return [
      'El campo nombre requiere una migración pendiente.',
      'Aplica el script sugerido para habilitar los metadatos del portafolio:',
      '',
      PORTAFOLIO_METADATA_SQL.trim(),
    ].join('\n')
  }

  if (
    rawMessage.includes("Could not find the 'numero_estudiantes' column of 'portafolios'") ||
    rawMessage.includes("column 'numero_estudiantes'")
  ) {
    return [
      'El campo numero_estudiantes aún no está disponible en la tabla.',
      'Ejecuta las sentencias SQL para sincronizar la base de datos:',
      '',
      PORTAFOLIO_METADATA_SQL.trim(),
    ].join('\n')
  }

  if (
    rawMessage.includes("Could not find the 'progreso_porcentaje' column of 'modulos_portafolio'") ||
    rawMessage.includes("column 'progreso_porcentaje'")
  ) {
    return [
      'Los módulos del portafolio requieren la columna progreso_porcentaje (entero).',
      'Agrega la columna y el valor por defecto ejecutando:',
      '',
      MODULOS_PROGRESS_SQL.trim(),
    ].join('\n')
  }

  if (
    rawMessage.includes('column "tipo_modulo" of relation "modulos_portafolio" violates not-null constraint') ||
    rawMessage.includes("'tipo_modulo' column of 'modulos_portafolio'")
  ) {
    return [
      'Los módulos necesitan un tipo asociado (planificación, clase grabada o trabajo colaborativo).',
      'Actualiza los registros existentes ejecutando:',
      '',
      MODULOS_TIPO_SQL.trim(),
    ].join('\n')
  }

  return null
}

// Schema de validación
const portafolioSchema = z.object({
  año_evaluacion: z.number()
    .min(2020, 'El año debe ser 2020 o posterior')
    .max(2030, 'El año no puede ser mayor a 2030'),
  asignatura: z.string().min(3, 'Selecciona una asignatura'),
  nivel_educativo: z.string().min(1, 'Selecciona un nivel educativo'),
  modalidad: z.string().default('regular'),
  nombre: z
    .string()
    .max(100, 'El nombre no puede superar los 100 caracteres')
    .optional(),
  curso_aplicacion: z.string().optional(),
  numero_estudiantes: z.number().min(1).max(50).optional(),
  fecha_limite: z
    .string()
    .min(1, 'La fecha límite es obligatoria')
    .refine((value) => {
      const parsedDate = new Date(value)
      if (Number.isNaN(parsedDate.getTime())) return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return parsedDate >= today
    }, 'La fecha límite no puede ser anterior a hoy')
})

type PortafolioFormValues = z.infer<typeof portafolioSchema>

interface PortafolioFormProps {
  initialValues?: Partial<PortafolioFormValues>
  portafolioId?: string
  onSuccess?: (portafolioId: string) => void
}

const ASIGNATURAS_POR_NIVEL: Record<string, { value: string; label: string }[]> = {
  parvularia: [
    { value: 'Lenguaje verbal', label: 'Lenguaje verbal' },
    { value: 'Pensamiento matemático', label: 'Pensamiento matemático' },
    { value: 'Exploración del entorno', label: 'Exploración del entorno' },
    { value: 'Formación personal y social', label: 'Formación personal y social' },
    { value: 'Inglés inicial', label: 'Inglés inicial' },
  ],
  basica_1_6: [
    { value: 'Lenguaje y Comunicación', label: 'Lenguaje y Comunicación' },
    { value: 'Matemática', label: 'Matemática' },
    { value: 'Ciencias Naturales', label: 'Ciencias Naturales' },
    { value: 'Historia, Geografía y Ciencias Sociales', label: 'Historia, Geografía y Ciencias Sociales' },
    { value: 'Artes Musicales', label: 'Artes Musicales' },
    { value: 'Artes Visuales', label: 'Artes Visuales' },
    { value: 'Educación Física y Salud', label: 'Educación Física y Salud' },
    { value: 'Tecnología', label: 'Tecnología' },
  ],
  basica_7_8_media: [
    { value: 'Lengua y Literatura', label: 'Lengua y Literatura' },
    { value: 'Matemática', label: 'Matemática' },
    { value: 'Historia, Geografía y Ciencias Sociales', label: 'Historia, Geografía y Ciencias Sociales' },
    { value: 'Ciencias Naturales', label: 'Ciencias Naturales' },
    { value: 'Biología', label: 'Biología' },
    { value: 'Química', label: 'Química' },
    { value: 'Física', label: 'Física' },
    { value: 'Inglés', label: 'Inglés' },
    { value: 'Educación Ciudadana', label: 'Educación Ciudadana' },
    { value: 'Artes Visuales', label: 'Artes Visuales' },
    { value: 'Música', label: 'Música' },
    { value: 'Educación Física y Salud', label: 'Educación Física y Salud' },
    { value: 'Tecnología', label: 'Tecnología' },
  ],
  media_tp: [
    { value: 'Especialidad Técnico-Profesional', label: 'Especialidad Técnico-Profesional' },
    { value: 'Formación General', label: 'Formación General' },
    { value: 'Matemática Aplicada', label: 'Matemática Aplicada' },
    { value: 'Comunicación Oral y Escrita', label: 'Comunicación Oral y Escrita' },
    { value: 'Inglés Técnico', label: 'Inglés Técnico' },
  ],
  epja: [
    { value: 'Lenguaje y Comunicación', label: 'Lenguaje y Comunicación' },
    { value: 'Matemática', label: 'Matemática' },
    { value: 'Formación para el Trabajo', label: 'Formación para el Trabajo' },
    { value: 'Ciencias Sociales', label: 'Ciencias Sociales' },
    { value: 'Ciencias Naturales', label: 'Ciencias Naturales' },
  ],
  especial_regular: [
    { value: 'Lenguaje y Comunicación Adaptado', label: 'Lenguaje y Comunicación Adaptado' },
    { value: 'Matemática Adaptada', label: 'Matemática Adaptada' },
    { value: 'Habilidades para la Vida Diaria', label: 'Habilidades para la Vida Diaria' },
    { value: 'Autonomía e Inclusión', label: 'Autonomía e Inclusión' },
  ],
  especial_neep: [
    { value: 'Comunicación Aumentativa', label: 'Comunicación Aumentativa' },
    { value: 'Matemática Funcional', label: 'Matemática Funcional' },
    { value: 'Autonomía Personal', label: 'Autonomía Personal' },
    { value: 'Socioemocional', label: 'Socioemocional' },
  ],
  hospitalaria: [
    { value: 'Lenguaje y Comunicación', label: 'Lenguaje y Comunicación' },
    { value: 'Matemática', label: 'Matemática' },
    { value: 'Ciencias Naturales', label: 'Ciencias Naturales' },
    { value: 'Apoyo Socioemocional', label: 'Apoyo Socioemocional' },
  ],
  encierro: [
    { value: 'Lenguaje y Comunicación', label: 'Lenguaje y Comunicación' },
    { value: 'Matemática', label: 'Matemática' },
    { value: 'Formación Ciudadana', label: 'Formación Ciudadana' },
    { value: 'Competencias Laborales', label: 'Competencias Laborales' },
  ],
  lengua_indigena: [
    { value: 'Lengua y Cultura Mapuche', label: 'Lengua y Cultura Mapuche' },
    { value: 'Lengua y Cultura Aymara', label: 'Lengua y Cultura Aymara' },
    { value: 'Lengua y Cultura Rapa Nui', label: 'Lengua y Cultura Rapa Nui' },
    { value: 'Lengua y Cultura Kawésqar', label: 'Lengua y Cultura Kawésqar' },
  ],
}

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
  {
    value: 'regular',
    label: 'Regular',
    description: 'Modalidad regular en establecimientos educacionales tradicionales.',
  },
  {
    value: 'especial',
    label: 'Educación Especial',
    description: 'Programas de educación especial en aulas o escuelas especializadas.',
  },
  {
    value: 'adultos',
    label: 'EPJA / Jóvenes y Adultos',
    description: 'Programas dirigidos a personas jóvenes y adultas (EPJA).',
  },
]

const MODULO_TIPO_MAP: Record<number, string> = {
  1: 'planificacion',
  2: 'clase_grabada',
  3: 'trabajo_colaborativo',
}

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
      nombre: initialValues?.nombre || '',
      curso_aplicacion: initialValues?.curso_aplicacion || '',
      numero_estudiantes: initialValues?.numero_estudiantes || undefined,
      fecha_limite: initialValues?.fecha_limite || '',
    },
  })

  const nivelSeleccionado = form.watch('nivel_educativo')

  useEffect(() => {
    if (!nivelSeleccionado) {
      form.setValue('asignatura', '')
      void form.trigger('asignatura')
      return
    }

    const opciones = ASIGNATURAS_POR_NIVEL[nivelSeleccionado] || []
    const asignaturaActual = form.getValues('asignatura')
    if (asignaturaActual && !opciones.some((opcion) => opcion.value === asignaturaActual)) {
      form.setValue('asignatura', '')
    }
    void form.trigger('asignatura')
  }, [nivelSeleccionado, form])

  const onSubmit = async (values: PortafolioFormValues) => {
    // Prevent double-submission race condition
    if (isSubmitting) return

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

      const sanitizedValues = {
        ...values,
        nombre: values.nombre?.trim() ? values.nombre.trim() : null,
        curso_aplicacion: values.curso_aplicacion?.trim() ? values.curso_aplicacion.trim() : null,
        numero_estudiantes: values.numero_estudiantes ?? null,
        fecha_limite: values.fecha_limite,
      }

      if (portafolioId) {
        // Actualizar portafolio existente
        const { error: updateError } = await supabase
          .from('portafolios')
          .update({
            ...sanitizedValues,
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
            ...sanitizedValues,
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
          tipo_modulo: MODULO_TIPO_MAP[numero] || `modulo_${numero}`,
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
      const friendlyMessage = mapSupabaseErrorToMessage(err)
      setError(friendlyMessage || err.message || 'Error al guardar el portafolio')
    } finally {
      setIsSubmitting(false)
    }
  }

  const asignaturasDisponibles = nivelSeleccionado
    ? ASIGNATURAS_POR_NIVEL[nivelSeleccionado] || []
    : []
  const modalidadSeleccionada = form.watch('modalidad') || 'regular'
  const modalidadDescripcion =
    MODALIDADES.find((item) => item.value === modalidadSeleccionada)?.description ||
    MODALIDADES[0].description
  const modalidadOptions = MODALIDADES.map(({ value, label }) => ({ value, label }))
  const minFechaLimite = new Date().toISOString().split('T')[0]

  return (
    <Card>
      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      value={field.value ?? ''}
                      onChange={(event) => {
                        const rawValue = event.target.value
                        field.onChange(rawValue ? parseInt(rawValue, 10) : undefined)
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Año en que realizas la evaluación docente
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nivel_educativo"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Nivel Educativo *</FormLabel>
                  <FormControl>
                    <Select
                      {...field}
                      value={field.value || ''}
                      onChange={(event) => {
                        field.onChange(event)
                        form.setValue('asignatura', '')
                        form.trigger('asignatura')
                      }}
                      options={NIVELES_EDUCATIVOS}
                    />
                  </FormControl>
                  <FormDescription>
                    Nivel en el que te desempeñas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="asignatura"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Asignatura *</FormLabel>
                  <FormControl>
                    <Select
                      {...field}
                      value={field.value || ''}
                      disabled={!nivelSeleccionado}
                      options={asignaturasDisponibles}
                    />
                  </FormControl>
                  <FormDescription>
                    {nivelSeleccionado
                      ? 'Asignatura asociada al nivel educativo seleccionado'
                      : 'Selecciona primero un nivel educativo para ver las asignaturas disponibles'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="modalidad"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Modalidad</FormLabel>
                  <FormControl>
                    <Select
                      {...field}
                      value={field.value || 'regular'}
                      options={modalidadOptions}
                    />
                  </FormControl>
                  <FormDescription>
                    {modalidadDescripcion}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nombre"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Nombre del Portafolio (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Portafolio Matemática 5°A"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    ⭐ Facilita identificar rápidamente tus portafolios activos
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    💡 Debe ser el mismo curso en todas las tareas del portafolio
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      value={field.value ?? ''}
                      onChange={(event) => {
                        const rawValue = event.target.value
                        field.onChange(rawValue ? parseInt(rawValue, 10) : undefined)
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Cantidad de estudiantes en el curso
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fecha_limite"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Fecha Límite de Entrega *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ''}
                      min={minFechaLimite}
                    />
                  </FormControl>
                  <FormDescription>
                    ✅ Define el plazo para enviar el portafolio al sistema oficial MINEDUC
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

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
