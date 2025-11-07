// components/portafolio/editores/Tarea2AEditor.tsx
'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form'
import { Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAutoSave } from '@/hooks/useAutoSave'
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator'
import { Alert, AlertDescription } from '@/components/ui/alert'

const seccionASchema = z.object({
  estrategia_descrita: z.string().min(100, 'Describe la estrategia con al menos 100 caracteres'),
  instrumentos_utilizados: z.array(z.string().min(5)).min(1, 'Agrega al menos un instrumento'),
  criterios_evaluacion: z.string().min(80, 'Describe los criterios con al menos 80 caracteres'),
  momento_aplicacion: z.string().min(50, 'Explica cuándo aplicarás esta evaluación'),
})

type SeccionAFormValues = z.infer<typeof seccionASchema>

interface Tarea2AEditorProps {
  tareaId: string
  initialData?: Partial<SeccionAFormValues>
  onSave: (data: SeccionAFormValues) => Promise<void>
  readOnly?: boolean
}

export function Tarea2AEditor({ tareaId, initialData, onSave, readOnly = false }: Tarea2AEditorProps) {
  const form = useForm<SeccionAFormValues>({
    resolver: zodResolver(seccionASchema),
    defaultValues: initialData || {
      estrategia_descrita: '',
      instrumentos_utilizados: [],
      criterios_evaluacion: '',
      momento_aplicacion: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'instrumentos_utilizados',
  })

  const { isSaving, lastSaved, error: saveError } = useAutoSave({
    data: form.watch(),
    onSave,
    delay: 30000,
    enabled: !readOnly,
  })

  const watchedValues = form.watch()
  const completitud = calculateCompletitud(watchedValues)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Tarea 2A: Estrategia de Monitoreo y Evaluación Formativa
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Describe tu estrategia para monitorear el aprendizaje de los estudiantes
          </p>
        </div>
        <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} error={saveError} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${completitud}%` }} />
          </div>
        </div>
        <span className="text-sm font-medium text-gray-700">{completitud}%</span>
        {completitud === 100 && <CheckCircle2 className="h-5 w-5 text-green-500" />}
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          La evaluación formativa es clave para ajustar la enseñanza. Describe instrumentos concretos
          y cómo usarás la información para mejorar el aprendizaje.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <Card>
          <CardContent className="space-y-6 pt-6">
            <FormField
              control={form.control}
              name="estrategia_descrita"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción de la Estrategia <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={6}
                      placeholder="Describe detalladamente cómo monitorearás el aprendizaje durante las experiencias diseñadas. ¿Qué técnicas usarás? ¿Cómo recogerás evidencia?"
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormDescription>{field.value?.length || 0} / 1000 caracteres (mínimo 100)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Instrumentos Utilizados <span className="text-red-500">*</span></FormLabel>
                {!readOnly && (
                  <Button type="button" variant="outline" size="sm" onClick={() => append('')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Instrumento
                  </Button>
                )}
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <FormField
                    control={form.control}
                    name={`instrumentos_utilizados.${index}`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ej: Rúbrica de evaluación, lista de cotejo, preguntas de metacognición..."
                            disabled={readOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {!readOnly && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="criterios_evaluacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Criterios de Evaluación <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={5}
                      placeholder="¿Qué criterios usarás para evaluar el logro de los objetivos? ¿Cómo los estudiantes sabrán qué se espera de ellos?"
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormDescription>{field.value?.length || 0} / 800 caracteres (mínimo 80)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="momento_aplicacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Momento de Aplicación <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="¿En qué momento de las experiencias aplicarás esta evaluación formativa? ¿Durante o al final? ¿Por qué?"
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormDescription>{field.value?.length || 0} / 500 caracteres (mínimo 50)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </Form>
    </div>
  )
}

function calculateCompletitud(values: Partial<SeccionAFormValues>): number {
  const checks = [
    (values.estrategia_descrita?.length || 0) >= 100,
    (values.instrumentos_utilizados?.length || 0) >= 1,
    (values.criterios_evaluacion?.length || 0) >= 80,
    (values.momento_aplicacion?.length || 0) >= 50,
  ]
  const completed = checks.filter(Boolean).length
  return Math.round((completed / checks.length) * 100)
}
