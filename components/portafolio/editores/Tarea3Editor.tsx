// components/portafolio/editores/Tarea3Editor.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent } from '@/components/ui/Card'
import Select from '@/components/ui/Select'
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
import { AlertCircle, CheckCircle2, Heart } from 'lucide-react'
import { useAutoSave } from '@/hooks/useAutoSave'
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator'
import { Alert, AlertDescription } from '@/components/ui/alert'

const tarea3Schema = z.object({
  aprendizaje_socioemocional_identificado: z.string().min(80, 'Describe el aprendizaje socioemocional identificado'),
  situaciones_observadas: z.string().min(100, 'Describe las situaciones observadas con al menos 100 caracteres'),
  reflexion_actitudes_propias: z.string().min(100, 'Reflexiona sobre tus actitudes con al menos 100 caracteres'),
  facilita_o_dificulta: z.enum(['facilita', 'dificulta', 'ambos']),
  acciones_futuras: z.string().min(100, 'Describe acciones concretas para el futuro'),
})

type Tarea3FormValues = z.infer<typeof tarea3Schema>

interface Tarea3EditorProps {
  tareaId: string
  initialData?: Partial<Tarea3FormValues>
  onSave: (data: Tarea3FormValues) => Promise<void>
  readOnly?: boolean
}

export function Tarea3Editor({ tareaId, initialData, onSave, readOnly = false }: Tarea3EditorProps) {
  const form = useForm<Tarea3FormValues>({
    resolver: zodResolver(tarea3Schema),
    defaultValues: initialData || {
      aprendizaje_socioemocional_identificado: '',
      situaciones_observadas: '',
      reflexion_actitudes_propias: '',
      facilita_o_dificulta: 'facilita',
      acciones_futuras: '',
    },
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
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="h-6 w-6 text-pink-500" />
            Tarea 3: Reflexión sobre Aprendizaje Socioemocional
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Reflexiona sobre aspectos socioemocionales observados en tu práctica
          </p>
        </div>
        <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} error={saveError} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-pink-600 h-2 rounded-full transition-all" style={{ width: `${completitud}%` }} />
          </div>
        </div>
        <span className="text-sm font-medium text-gray-700">{completitud}%</span>
        {completitud === 100 && <CheckCircle2 className="h-5 w-5 text-green-500" />}
      </div>

      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Tarea Opcional:</strong> Esta reflexión es voluntaria pero muy valiosa para tu desarrollo profesional.
          Enfócate en aspectos socioemocionales observados en tus estudiantes y en ti mismo/a.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <Card>
          <CardContent className="space-y-6 pt-6">
            <FormField
              control={form.control}
              name="aprendizaje_socioemocional_identificado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aprendizaje Socioemocional Identificado <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="¿Qué aprendizajes socioemocionales observaste en tus estudiantes? (Ej: autorregulación, empatía, colaboración, gestión emocional...)"
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormDescription>{field.value?.length || 0} / 500 caracteres (mínimo 80)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="situaciones_observadas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Situaciones Observadas <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={6}
                      placeholder="Describe situaciones concretas donde observaste manifestaciones socioemocionales. Sé específico/a con ejemplos."
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormDescription>{field.value?.length || 0} / 800 caracteres (mínimo 100)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reflexion_actitudes_propias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reflexión sobre tus Propias Actitudes <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={6}
                      placeholder="¿Cómo tus propias actitudes, emociones y reacciones influyeron en el clima socioemocional? ¿Qué descubriste sobre ti?"
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormDescription>{field.value?.length || 0} / 800 caracteres (mínimo 100)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="facilita_o_dificulta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Tus actitudes facilitan o dificultan? <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Select
                      {...field}
                      disabled={readOnly}
                      options={[
                        { value: 'facilita', label: 'Facilita el aprendizaje socioemocional' },
                        { value: 'dificulta', label: 'Dificulta el aprendizaje socioemocional' },
                        { value: 'ambos', label: 'Ambos: algunas facilitan, otras dificultan' },
                      ]}
                    />
                  </FormControl>
                  <FormDescription>
                    Reflexiona honestamente sobre el impacto de tus actitudes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acciones_futuras"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acciones para el Futuro <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={5}
                      placeholder="¿Qué acciones concretas realizarás para fortalecer el aprendizaje socioemocional en tu práctica pedagógica?"
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormDescription>{field.value?.length || 0} / 600 caracteres (mínimo 100)</FormDescription>
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

function calculateCompletitud(values: Partial<Tarea3FormValues>): number {
  const checks = [
    (values.aprendizaje_socioemocional_identificado?.length || 0) >= 80,
    (values.situaciones_observadas?.length || 0) >= 100,
    (values.reflexion_actitudes_propias?.length || 0) >= 100,
    values.facilita_o_dificulta !== undefined,
    (values.acciones_futuras?.length || 0) >= 100,
  ]
  const completed = checks.filter(Boolean).length
  return Math.round((completed / checks.length) * 100)
}
