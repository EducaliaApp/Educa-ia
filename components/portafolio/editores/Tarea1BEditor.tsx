// components/portafolio/editores/Tarea1BEditor.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent } from '@/components/ui/Card'
import Textarea from '@/components/ui/Textarea'
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
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAutoSave } from '@/hooks/useAutoSave'
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Schema de validación
const seccionBSchema = z.object({
  experiencia_seleccionada: z.enum(['1', '2', '3']),
  fundamentacion_decisiones: z
    .string()
    .min(100, 'La fundamentación debe tener al menos 100 caracteres')
    .max(1000, 'La fundamentación no debe exceder 1000 caracteres'),
  consideracion_diversidad: z
    .string()
    .min(100, 'Explica con al menos 100 caracteres cómo consideras la diversidad')
    .max(800, 'No debe exceder 800 caracteres'),
  conexion_conocimientos_previos: z
    .string()
    .min(100, 'Explica con al menos 100 caracteres la conexión con conocimientos previos')
    .max(800, 'No debe exceder 800 caracteres'),
  promocion_aprendizaje_profundo: z
    .string()
    .min(100, 'Explica con al menos 100 caracteres cómo promueves el aprendizaje profundo')
    .max(800, 'No debe exceder 800 caracteres'),
})

type SeccionBFormValues = z.infer<typeof seccionBSchema>

interface Tarea1BEditorProps {
  tareaId: string
  initialData?: Partial<SeccionBFormValues>
  onSave: (data: SeccionBFormValues) => Promise<void>
  readOnly?: boolean
}

export function Tarea1BEditor({
  tareaId,
  initialData,
  onSave,
  readOnly = false,
}: Tarea1BEditorProps) {
  const form = useForm<SeccionBFormValues>({
    resolver: zodResolver(seccionBSchema),
    defaultValues: initialData || {
      experiencia_seleccionada: '1',
      fundamentacion_decisiones: '',
      consideracion_diversidad: '',
      conexion_conocimientos_previos: '',
      promocion_aprendizaje_profundo: '',
    },
  })

  // Guardado automático
  const { isSaving, lastSaved, error: saveError } = useAutoSave({
    data: form.watch(),
    onSave: async (data) => {
      await onSave(data)
    },
    delay: 30000, // 30 segundos
    enabled: !readOnly,
  })

  // Calcular completitud
  const watchedValues = form.watch()
  const completitud = calculateCompletitud(watchedValues)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Tarea 1B: Fundamentación de Decisiones Pedagógicas
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Selecciona una experiencia y fundamenta tus decisiones pedagógicas
          </p>
        </div>
        <AutoSaveIndicator
          isSaving={isSaving}
          lastSaved={lastSaved}
          error={saveError}
        />
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${completitud}%` }}
            />
          </div>
        </div>
        <span className="text-sm font-medium text-gray-700">{completitud}%</span>
        {completitud === 100 && (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        )}
      </div>

      {/* Alerta informativa */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Debes seleccionar UNA de las 3 experiencias diseñadas
          en la Tarea 1A y fundamentar tus decisiones pedagógicas. Explica el &ldquo;por qué&rdquo;
          de tus elecciones didácticas.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* Selección de experiencia */}
            <FormField
              control={form.control}
              name="experiencia_seleccionada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Experiencia Seleccionada para Fundamentar{' '}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      {...field}
                      disabled={readOnly}
                      options={[
                        { value: '1', label: 'Experiencia 1' },
                        { value: '2', label: 'Experiencia 2' },
                        { value: '3', label: 'Experiencia 3' },
                      ]}
                    />
                  </FormControl>
                  <FormDescription>
                    Selecciona la experiencia sobre la cual profundizarás tu reflexión
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fundamentación de decisiones */}
            <FormField
              control={form.control}
              name="fundamentacion_decisiones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Fundamentación de Decisiones Pedagógicas{' '}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={8}
                      placeholder="Explica las razones pedagógicas detrás de las actividades diseñadas. ¿Por qué elegiste esas estrategias? ¿Qué principios didácticos sustentan tu planificación? ¿Cómo se alinean con los objetivos de aprendizaje?"
                      disabled={readOnly}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0} / 1000 caracteres (mínimo 100)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Consideración de diversidad */}
            <FormField
              control={form.control}
              name="consideracion_diversidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Consideración de la Diversidad{' '}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={6}
                      placeholder="¿Cómo tus decisiones pedagógicas responden a la diversidad de tu curso? Describe estrategias de diferenciación, adaptaciones curriculares y cómo abordas diferentes estilos de aprendizaje, ritmos y necesidades educativas especiales."
                      disabled={readOnly}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0} / 800 caracteres (mínimo 100)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conexión con conocimientos previos */}
            <FormField
              control={form.control}
              name="conexion_conocimientos_previos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Conexión con Conocimientos Previos{' '}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={6}
                      placeholder="Explica cómo tu diseño didáctico activa y conecta con los conocimientos previos de los estudiantes. ¿Qué estrategias usas para hacer explícitos estos saberes? ¿Cómo construyes sobre lo que ya saben?"
                      disabled={readOnly}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0} / 800 caracteres (mínimo 100)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Promoción de aprendizaje profundo */}
            <FormField
              control={form.control}
              name="promocion_aprendizaje_profundo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Promoción del Aprendizaje Profundo{' '}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={6}
                      placeholder="¿Cómo tus decisiones pedagógicas promueven que los estudiantes vayan más allá de la memorización? Describe estrategias que fomenten pensamiento crítico, aplicación de conceptos, resolución de problemas complejos y transferencia de aprendizajes."
                      disabled={readOnly}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0} / 800 caracteres (mínimo 100)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </Form>

      {/* Indicadores de calidad */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Criterios de Calidad
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                Fundamenta con evidencia teórica (autores, enfoques pedagógicos, curriculum nacional)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                Conecta decisiones pedagógicas con características específicas de tu curso
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                Explica el &ldquo;por qué&rdquo; y el &ldquo;para qué&rdquo; de cada estrategia didáctica
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                Demuestra reflexión pedagógica profunda, no solo descripción de actividades
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// Función para calcular completitud
function calculateCompletitud(values: Partial<SeccionBFormValues>): number {
  const checks = [
    values.experiencia_seleccionada !== undefined,
    (values.fundamentacion_decisiones?.length || 0) >= 100,
    (values.consideracion_diversidad?.length || 0) >= 100,
    (values.conexion_conocimientos_previos?.length || 0) >= 100,
    (values.promocion_aprendizaje_profundo?.length || 0) >= 100,
  ]

  const completed = checks.filter(Boolean).length
  return Math.round((completed / checks.length) * 100)
}
