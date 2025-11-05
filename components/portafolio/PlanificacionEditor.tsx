// components/portafolio/PlanificacionEditor.tsx

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAIAnalysis } from '@/hooks/useAIAnalysis'
import { FeedbackPanel } from './FeedbackPanel'
import { ScoreMeter } from './ScoreMeter'

const planificacionSchema = z.object({
  objetivo_aprendizaje: z.string().min(20, 'Objetivo debe tener al menos 20 caracteres'),
  conocimientos_previos: z.string().min(10),
  actividades: z.string().min(50, 'Describe las actividades con detalle'),
  evaluacion: z.string().min(30),
  recursos: z.string().min(10),
  atencion_diversidad: z.string().min(20)
})

type PlanificacionFormData = z.infer<typeof planificacionSchema>

interface Props {
  tareaId: string
  initialData?: Partial<PlanificacionFormData>
  onSave: (data: PlanificacionFormData) => Promise<void>
}

export function PlanificacionEditor({ tareaId, initialData, onSave }: Props) {
  const { analyzePlanificacion, isAnalyzing, analysis } = useAIAnalysis()
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')

  const form = useForm<PlanificacionFormData>({
    resolver: zodResolver(planificacionSchema),
    defaultValues: initialData || {
      objetivo_aprendizaje: '',
      conocimientos_previos: '',
      actividades: '',
      evaluacion: '',
      recursos: '',
      atencion_diversidad: ''
    }
  })

  // Auto-save cada 30 segundos
  useEffect(() => {
    const subscription = form.watch(() => {
      const timeout = setTimeout(async () => {
        if (form.formState.isDirty) {
          setAutoSaveStatus('saving')
          try {
            await onSave(form.getValues())
            setAutoSaveStatus('saved')
          } catch {
            setAutoSaveStatus('error')
          }
        }
      }, 3000) // Debounce de 3 segundos

      return () => clearTimeout(timeout)
    })

    return () => subscription.unsubscribe()
  }, [form, onSave])

  const handleAnalyze = async () => {
    const valores = form.getValues()
    
    // Convertir a estructura esperada
    const contenido = {
      objetivo_aprendizaje: valores.objetivo_aprendizaje,
      conocimientos_previos: valores.conocimientos_previos,
      actividades: valores.actividades.split('\n').filter(a => a.trim()),
      evaluacion: valores.evaluacion,
      recursos: valores.recursos.split('\n').filter(r => r.trim()),
      atencion_diversidad: valores.atencion_diversidad
    }

    await analyzePlanificacion(tareaId, contenido)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Panel izquierdo: Formulario */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Planificación de Unidad Pedagógica</CardTitle>
            <CardDescription>
              Completa cada sección con detalle. La IA te ayudará a mejorar tu planificación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
                {/* Objetivo de Aprendizaje */}
                <FormField
                  control={form.control}
                  name="objetivo_aprendizaje"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">
                        Objetivo de Aprendizaje
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Ejemplo: Los estudiantes serán capaces de analizar críticamente textos argumentativos, identificando tesis, argumentos y contraargumentos..."
                          rows={4}
                          className="resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Conocimientos Previos */}
                <FormField
                  control={form.control}
                  name="conocimientos_previos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conocimientos Previos Requeridos</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="¿Qué deben saber los estudiantes antes de esta unidad?"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Actividades */}
                <FormField
                  control={form.control}
                  name="actividades"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actividades de Aprendizaje</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Describe las actividades paso a paso. Una por línea."
                          rows={8}
                          className="font-mono text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Evaluación */}
                <FormField
                  control={form.control}
                  name="evaluacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estrategias de Evaluación</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="¿Cómo evaluarás el logro del objetivo? Describe instrumentos y criterios."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Recursos */}
                <FormField
                  control={form.control}
                  name="recursos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recursos Didácticos</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="PPT, videos, guías, manipulativos, etc. Uno por línea."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Atención a la Diversidad */}
                <FormField
                  control={form.control}
                  name="atencion_diversidad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Atención a la Diversidad</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="¿Cómo adaptarás la enseñanza para diferentes ritmos y estilos de aprendizaje?"
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {autoSaveStatus === 'saved' && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Guardado automáticamente</span>
                      </>
                    )}
                    {autoSaveStatus === 'saving' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    )}
                    {autoSaveStatus === 'error' && (
                      <>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span>Error al guardar</span>
                      </>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !form.formState.isValid}
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analizando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Analizar con IA
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Panel derecho: Feedback IA */}
      <div className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
        {analysis ? (
          <>
            <ScoreMeter 
              puntaje={analysis.puntaje_estimado}
              nivel={analysis.nivel_desempeño}
            />
            <FeedbackPanel analysis={analysis} />
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Asistente IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Completa tu planificación y presiona "Analizar con IA" para recibir 
                feedback personalizado basado en las rúbricas del Marco para la Buena Enseñanza.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}