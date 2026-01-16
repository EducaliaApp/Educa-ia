// components/portafolio/PlanificacionEditor.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/Form'
import { Loader2, Sparkles, CheckCircle2, Save } from 'lucide-react'
import { useAIAnalysis } from '@/hooks/useAIAnalysis'

// Schema de validación
const planificacionSchema = z.object({
  objetivo_aprendizaje: z.string().min(20, 'El objetivo debe tener al menos 20 caracteres'),
  conocimientos_previos: z.string().min(10, 'Describe los conocimientos previos requeridos'),
  actividades: z.string().min(50, 'Describe las actividades de aprendizaje en detalle'),
  evaluacion: z.string().min(30, 'Describe cómo evaluarás el aprendizaje'),
  recursos: z.string().min(10, 'Lista los recursos que utilizarás'),
  atencion_diversidad: z.string().min(20, 'Describe cómo atenderás la diversidad'),
})

type PlanificacionFormValues = z.infer<typeof planificacionSchema>

interface PlanificacionEditorProps {
  tareaId: string
  contenidoInicial?: Partial<PlanificacionFormValues>
  onSave?: (data: PlanificacionFormValues) => Promise<void>
}

export function PlanificacionEditor({
  tareaId,
  contenidoInicial,
  onSave
}: PlanificacionEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const { analyzePlanificacion, isAnalyzing, analysis, error } = useAIAnalysis()

  const form = useForm<PlanificacionFormValues>({
    resolver: zodResolver(planificacionSchema),
    defaultValues: {
      objetivo_aprendizaje: contenidoInicial?.objetivo_aprendizaje || '',
      conocimientos_previos: contenidoInicial?.conocimientos_previos || '',
      actividades: contenidoInicial?.actividades || '',
      evaluacion: contenidoInicial?.evaluacion || '',
      recursos: contenidoInicial?.recursos || '',
      atencion_diversidad: contenidoInicial?.atencion_diversidad || '',
    },
  })

  const handleSave = async (values: PlanificacionFormValues) => {
    if (onSave) {
      setIsSaving(true)
      try {
        await onSave(values)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleAnalyze = async () => {
    const isValid = await form.trigger()
    if (!isValid) {
      return
    }

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
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Planificación de Unidad Pedagógica</h2>
          <p className="text-gray-600 mb-6">
            Completa cada sección con detalle. ProfeFlow te ayudará a mejorar tu planificación con análisis de IA.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
              {/* Objetivo de Aprendizaje */}
              <FormField
                control={form.control}
                name="objetivo_aprendizaje"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">
                      Objetivo de Aprendizaje *
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Ejemplo: Los estudiantes serán capaces de analizar críticamente textos argumentativos, identificando tesis, argumentos y contraargumentos, para construir sus propias opiniones fundamentadas..."
                        rows={4}
                        className="resize-none"
                      />
                    </FormControl>
                    <FormDescription>
                      Define claramente qué aprenderán tus estudiantes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conocimientos Previos */}
              <FormField
                control={form.control}
                name="conocimientos_previos"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Conocimientos Previos Requeridos *</FormLabel>
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
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Actividades de Aprendizaje *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe las actividades paso a paso. Una por línea."
                        rows={8}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormDescription>
                      Secuencia didáctica completa de la unidad
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Evaluación */}
              <FormField
                control={form.control}
                name="evaluacion"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Estrategias de Evaluación *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="¿Cómo evaluarás el aprendizaje? Incluye evaluaciones formativas y sumativas"
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
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Recursos Didácticos *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Lista los recursos que utilizarás. Uno por línea."
                        rows={4}
                      />
                    </FormControl>
                    <FormDescription>
                      Materiales, tecnologías, espacios, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Atención a la Diversidad */}
              <FormField
                control={form.control}
                name="atencion_diversidad"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Atención a la Diversidad *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="¿Cómo adaptarás la enseñanza para atender las diferentes necesidades de aprendizaje?"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isSaving || isAnalyzing}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Borrador
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isSaving || isAnalyzing}
                  className="flex-1"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analizando con IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analizar con IA
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </Card>

      {/* Results Section */}
      {analysis && (
        <Card className="bg-green-50 border-green-200">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <h3 className="text-xl font-bold text-green-900">¡Análisis Completado!</h3>
            </div>
            <p className="text-green-800 mb-4">
              Tu planificación ha sido analizada. Nivel estimado:{' '}
              <strong>{analysis.nivel_desempeño}</strong> ({analysis.puntaje_estimado.toFixed(1)}/4.0)
            </p>
            <Button variant="outline" className="border-green-600 text-green-700">
              Ver Análisis Detallado
            </Button>
          </div>
        </Card>
      )}

      {/* Error Section */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <div className="p-6">
            <p className="text-red-600">{error}</p>
          </div>
        </Card>
      )}
    </div>
  )
}
