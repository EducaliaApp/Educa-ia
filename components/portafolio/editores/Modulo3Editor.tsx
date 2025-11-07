// components/portafolio/editores/Modulo3Editor.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form'
import { CheckCircle, AlertCircle, Users, UserCheck, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAutoSave } from '@/hooks/useAutoSave'
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator'

// Schema para parte obligatoria
const parteObligatoriaSchema = z.object({
  a1_relevancia_problema: z
    .string()
    .min(100, 'Explica la relevancia con al menos 100 caracteres')
    .max(400, 'No debe exceder 400 caracteres'),
  a2_reflexion_conjunta_dialogo: z
    .string()
    .min(100, 'Describe la reflexión con al menos 100 caracteres')
    .max(400, 'No debe exceder 400 caracteres'),
  b1_aprendizajes_profesionales: z
    .string()
    .min(100, 'Describe tus aprendizajes con al menos 100 caracteres')
    .max(400, 'No debe exceder 400 caracteres'),
})

// Schema para parte voluntaria
const parteVoluntariaSchema = z.object({
  a11_reflexion_necesidades_desde_evidencia: z.string().optional(),
  a3_seguimiento_implementacion: z.string().optional(),
  b2_reflexion_creencias_pedagogicas: z.string().optional(),
  c1_evaluacion_forma_trabajo: z.string().optional(),
})

const modulo3Schema = z.object({
  presenta_parte_voluntaria: z.boolean(),
  parte_obligatoria: parteObligatoriaSchema,
  parte_voluntaria: parteVoluntariaSchema.optional(),
})

type Modulo3FormValues = z.infer<typeof modulo3Schema>

interface Modulo3EditorProps {
  tareaId: string
  initialData?: Partial<Modulo3FormValues>
  onSave: (data: Modulo3FormValues) => Promise<void>
  readOnly?: boolean
}

export function Modulo3Editor({
  tareaId,
  initialData,
  onSave,
  readOnly = false,
}: Modulo3EditorProps) {
  const [mostrarVoluntaria, setMostrarVoluntaria] = useState(
    initialData?.presenta_parte_voluntaria || false
  )

  const form = useForm<Modulo3FormValues>({
    resolver: zodResolver(modulo3Schema),
    defaultValues: initialData || {
      presenta_parte_voluntaria: false,
      parte_obligatoria: {
        a1_relevancia_problema: '',
        a2_reflexion_conjunta_dialogo: '',
        b1_aprendizajes_profesionales: '',
      },
      parte_voluntaria: {
        a11_reflexion_necesidades_desde_evidencia: '',
        a3_seguimiento_implementacion: '',
        b2_reflexion_creencias_pedagogicas: '',
        c1_evaluacion_forma_trabajo: '',
      },
    },
  })

  // Guardado automático
  const { isSaving, lastSaved, error: saveError } = useAutoSave({
    data: form.watch(),
    onSave: async (data) => {
      await onSave({
        ...data,
        presenta_parte_voluntaria: mostrarVoluntaria,
      })
    },
    delay: 30000,
    enabled: !readOnly,
  })

  const watchedValues = form.watch()
  const completitud = calculateCompletitud(watchedValues, mostrarVoluntaria)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-purple-600" />
            Módulo 3: Trabajo Colaborativo entre Docentes
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Reflexiona sobre la experiencia de colaboración profesional con otros docentes
          </p>
        </div>
        <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} error={saveError} />
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${completitud}%` }}
            />
          </div>
        </div>
        <span className="text-sm font-medium text-gray-700">{completitud}%</span>
        {completitud === 100 && <CheckCircle className="h-5 w-5 text-green-500" />}
      </div>

      {/* Alerta informativa */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Este módulo incluye una parte obligatoria (3 secciones) y
          una parte voluntaria (4 secciones adicionales). Algunas secciones pueden ser grupales,
          otras DEBEN ser individuales.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        {/* PARTE OBLIGATORIA */}
        <Card className="border-2 border-purple-300">
          <CardHeader className="bg-purple-50">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Parte Obligatoria
              </span>
              <Badge variant="danger">OBLIGATORIA</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* A1: Relevancia del problema */}
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default" className="bg-blue-50 text-blue-700">
                  <Users className="h-3 w-3 mr-1" />
                  GRUPAL
                </Badge>
              </div>
              <FormField
                control={form.control}
                name="parte_obligatoria.a1_relevancia_problema"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      A1: Relevancia del Problema o Necesidad Abordada{' '}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={6}
                        placeholder="Describe el problema o necesidad que abordaron colaborativamente. ¿Por qué era relevante? ¿Cómo lo identificaron? ¿Qué impacto tiene en el aprendizaje de los estudiantes?"
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length || 0} / 400 caracteres (mínimo 100)
                      <br />
                      <em className="text-xs">Puede ser escrito grupalmente</em>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* A2: Reflexión conjunta y diálogo */}
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default" className="bg-blue-50 text-blue-700">
                  <Users className="h-3 w-3 mr-1" />
                  GRUPAL
                </Badge>
              </div>
              <FormField
                control={form.control}
                name="parte_obligatoria.a2_reflexion_conjunta_dialogo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      A2: Reflexión Conjunta y Diálogo Profesional{' '}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={6}
                        placeholder="Describe el proceso de reflexión conjunta. ¿Cómo dialogaron sobre el problema? ¿Qué estrategias de colaboración usaron? ¿Cómo construyeron conocimiento entre todos?"
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length || 0} / 400 caracteres (mínimo 100)
                      <br />
                      <em className="text-xs">Puede ser escrito grupalmente</em>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* B1: Aprendizajes profesionales (INDIVIDUAL) */}
            <div className="border-l-4 border-green-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-600">
                  <UserCheck className="h-3 w-3 mr-1" />
                  INDIVIDUAL
                </Badge>
              </div>
              <FormField
                control={form.control}
                name="parte_obligatoria.b1_aprendizajes_profesionales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      B1: Aprendizajes Profesionales (DEBE ser individual){' '}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={6}
                        placeholder="¿Qué aprendiste tú personalmente de esta experiencia colaborativa? ¿Cómo impactó tu práctica pedagógica? ¿Qué cambios implementaste? ¿Qué desafíos enfrentaste?"
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length || 0} / 400 caracteres (mínimo 100)
                      <br />
                      <strong className="text-orange-600">
                        ⚠️ Esta sección DEBE ser escrita individualmente por ti
                      </strong>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* PARTE VOLUNTARIA */}
        <Card className="border-2 border-yellow-300">
          <CardHeader className="bg-yellow-50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Parte Voluntaria
                <Badge variant="warning">OPCIONAL</Badge>
              </CardTitle>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarVoluntaria(!mostrarVoluntaria)}
                >
                  {mostrarVoluntaria ? (
                    <>
                      <ToggleRight className="mr-2 h-4 w-4" />
                      Ocultar Voluntaria
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="mr-2 h-4 w-4" />
                      Completar Voluntaria
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>

          {mostrarVoluntaria && (
            <CardContent className="space-y-6 pt-6">
              <Alert className="bg-yellow-50 border-yellow-300">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">Parte Voluntaria</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  Estas 4 secciones adicionales son <strong>opcionales pero muy valoradas</strong>.
                  Demuestran mayor profundidad en tu reflexión colaborativa.
                </AlertDescription>
              </Alert>

              {/* A11: Reflexión sobre necesidades desde evidencia */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="bg-blue-50 text-blue-700">
                    <Users className="h-3 w-3 mr-1" />
                    GRUPAL
                  </Badge>
                </div>
                <FormField
                  control={form.control}
                  name="parte_voluntaria.a11_reflexion_necesidades_desde_evidencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        A11: Reflexión sobre Necesidades desde la Evidencia (Opcional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={5}
                          placeholder="¿Qué evidencias concretas los llevaron a identificar la necesidad? ¿Qué datos analizaron? ¿Cómo interpretaron esa evidencia colaborativamente?"
                          disabled={readOnly}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length || 0} / 500 caracteres
                        <br />
                        <em className="text-xs">Puede ser escrito grupalmente</em>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* A3: Seguimiento de implementación */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="bg-blue-50 text-blue-700">
                    <Users className="h-3 w-3 mr-1" />
                    GRUPAL
                  </Badge>
                </div>
                <FormField
                  control={form.control}
                  name="parte_voluntaria.a3_seguimiento_implementacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        A3: Seguimiento de la Implementación (Opcional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={5}
                          placeholder="¿Cómo hicieron seguimiento a las acciones acordadas? ¿Qué ajustes realizaron? ¿Cómo monitorearon el impacto?"
                          disabled={readOnly}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length || 0} / 500 caracteres
                        <br />
                        <em className="text-xs">Puede ser escrito grupalmente</em>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* B2: Reflexión sobre creencias (INDIVIDUAL) */}
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-600">
                    <UserCheck className="h-3 w-3 mr-1" />
                    INDIVIDUAL
                  </Badge>
                </div>
                <FormField
                  control={form.control}
                  name="parte_voluntaria.b2_reflexion_creencias_pedagogicas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        B2: Reflexión sobre tus Creencias Pedagógicas (DEBE ser individual, Opcional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={5}
                          placeholder="¿Cómo esta experiencia colaborativa cuestionó o reforzó tus creencias sobre la enseñanza? ¿Qué supuestos pedagógicos revisaste?"
                          disabled={readOnly}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length || 0} / 500 caracteres
                        <br />
                        <strong className="text-orange-600">
                          ⚠️ Esta sección DEBE ser escrita individualmente
                        </strong>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* C1: Evaluación de la forma de trabajo (INDIVIDUAL) */}
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-600">
                    <UserCheck className="h-3 w-3 mr-1" />
                    INDIVIDUAL
                  </Badge>
                </div>
                <FormField
                  control={form.control}
                  name="parte_voluntaria.c1_evaluacion_forma_trabajo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        C1: Evaluación de la Forma de Trabajo Colaborativo (DEBE ser individual, Opcional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={5}
                          placeholder="¿Qué funcionó bien en la forma de colaborar? ¿Qué mejorarías? ¿Cómo fue tu participación personal? ¿Qué rol desempeñaste?"
                          disabled={readOnly}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length || 0} / 500 caracteres
                        <br />
                        <strong className="text-orange-600">
                          ⚠️ Esta sección DEBE ser escrita individualmente
                        </strong>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Indicadores de calidad */}
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Criterios de Calidad para Trabajo Colaborativo
            </h3>
            <ul className="space-y-2 text-sm text-purple-800">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Describe trabajo colaborativo REAL, no solo coordinación</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Evidencia diálogo profesional profundo y construcción conjunta</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Reflexión honesta sobre aprendizajes y desafíos personales</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>
                  Secciones individuales (B1, B2, C1) escritas en primera persona singular
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">•</span>
                <span>Impacto concreto en prácticas pedagógicas y aprendizaje de estudiantes</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </Form>
    </div>
  )
}

// Función para calcular completitud
function calculateCompletitud(
  values: Partial<Modulo3FormValues>,
  tieneVoluntaria: boolean
): number {
  const obligatoriaChecks = [
    (values.parte_obligatoria?.a1_relevancia_problema?.length || 0) >= 100,
    (values.parte_obligatoria?.a2_reflexion_conjunta_dialogo?.length || 0) >= 100,
    (values.parte_obligatoria?.b1_aprendizajes_profesionales?.length || 0) >= 100,
  ]

  if (!tieneVoluntaria) {
    const completed = obligatoriaChecks.filter(Boolean).length
    return Math.round((completed / obligatoriaChecks.length) * 100)
  }

  // Si tiene parte voluntaria, incluir en el cálculo
  const voluntariaChecks = [
    (values.parte_voluntaria?.a11_reflexion_necesidades_desde_evidencia?.length || 0) >= 50,
    (values.parte_voluntaria?.a3_seguimiento_implementacion?.length || 0) >= 50,
    (values.parte_voluntaria?.b2_reflexion_creencias_pedagogicas?.length || 0) >= 50,
    (values.parte_voluntaria?.c1_evaluacion_forma_trabajo?.length || 0) >= 50,
  ]

  const allChecks = [...obligatoriaChecks, ...voluntariaChecks]
  const completed = allChecks.filter(Boolean).length
  return Math.round((completed / allChecks.length) * 100)
}
