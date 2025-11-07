// components/portafolio/editores/Tarea1AEditor.tsx
'use client'

import { useState } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form'
import { Plus, Trash2, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import { useAutoSave } from '@/hooks/useAutoSave'
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Schema de validación
const actividadSchema = z.object({
  descripcion: z.string().min(10, 'Describe la actividad con al menos 10 caracteres'),
  tipo: z.enum(['inicio', 'desarrollo', 'cierre']),
  duracion_minutos: z.number().min(1).max(180),
  organizacion: z.enum(['individual', 'parejas', 'grupos', 'plenario']),
})

const experienciaSchema = z.object({
  objetivo_aprendizaje: z.string().min(20, 'El objetivo debe tener al menos 20 caracteres'),
  conocimientos_previos: z.string().min(20, 'Describe los conocimientos previos necesarios'),
  actividades: z.array(actividadSchema).min(1, 'Agrega al menos una actividad'),
  recursos: z.array(z.string().min(3)).min(1, 'Agrega al menos un recurso'),
  tiempo_estimado: z.string().min(5, 'Ej: "90 minutos" o "2 clases de 45 min"'),
  atencion_diversidad: z.string().min(30, 'Explica cómo atiendes la diversidad (mín. 30 caracteres)'),
})

const seccionASchema = z.object({
  experiencia_1: experienciaSchema,
  experiencia_2: experienciaSchema,
  experiencia_3: experienciaSchema,
})

type SeccionAFormValues = z.infer<typeof seccionASchema>

interface Tarea1AEditorProps {
  tareaId: string
  initialData?: Partial<SeccionAFormValues>
  onSave: (data: SeccionAFormValues) => Promise<void>
  readOnly?: boolean
}

export function Tarea1AEditor({
  tareaId,
  initialData,
  onSave,
  readOnly = false,
}: Tarea1AEditorProps) {
  const [expandedExperience, setExpandedExperience] = useState<1 | 2 | 3>(1)

  const form = useForm<SeccionAFormValues>({
    resolver: zodResolver(seccionASchema),
    defaultValues: initialData || {
      experiencia_1: {
        objetivo_aprendizaje: '',
        conocimientos_previos: '',
        actividades: [],
        recursos: [],
        tiempo_estimado: '',
        atencion_diversidad: '',
      },
      experiencia_2: {
        objetivo_aprendizaje: '',
        conocimientos_previos: '',
        actividades: [],
        recursos: [],
        tiempo_estimado: '',
        atencion_diversidad: '',
      },
      experiencia_3: {
        objetivo_aprendizaje: '',
        conocimientos_previos: '',
        actividades: [],
        recursos: [],
        tiempo_estimado: '',
        atencion_diversidad: '',
      },
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

  return (
    <div className="space-y-6">
      {/* Header con indicador de guardado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Tarea 1A: Planificación de Experiencias de Aprendizaje
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Diseña 3 experiencias de aprendizaje completas para tu unidad
          </p>
        </div>
        <AutoSaveIndicator
          isSaving={isSaving}
          lastSaved={lastSaved}
          error={saveError}
        />
      </div>

      {/* Alerta informativa */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Instrucciones:</strong> Cada experiencia debe incluir objetivo de aprendizaje,
          actividades detalladas, recursos necesarios y consideración de la diversidad.
          Los cambios se guardan automáticamente cada 30 segundos.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <div className="space-y-4">
          {/* Experiencia 1 */}
          <ExperienciaCard
            experienceNumber={1}
            form={form}
            expanded={expandedExperience === 1}
            onToggle={() => setExpandedExperience(expandedExperience === 1 ? 1 : 1)}
            readOnly={readOnly}
          />

          {/* Experiencia 2 */}
          <ExperienciaCard
            experienceNumber={2}
            form={form}
            expanded={expandedExperience === 2}
            onToggle={() => setExpandedExperience(expandedExperience === 2 ? 1 : 2)}
            readOnly={readOnly}
          />

          {/* Experiencia 3 */}
          <ExperienciaCard
            experienceNumber={3}
            form={form}
            expanded={expandedExperience === 3}
            onToggle={() => setExpandedExperience(expandedExperience === 3 ? 1 : 3)}
            readOnly={readOnly}
          />
        </div>
      </Form>
    </div>
  )
}

// Componente para cada experiencia
interface ExperienciaCardProps {
  experienceNumber: 1 | 2 | 3
  form: any
  expanded: boolean
  onToggle: () => void
  readOnly: boolean
}

function ExperienciaCard({
  experienceNumber,
  form,
  expanded,
  onToggle,
  readOnly,
}: ExperienciaCardProps) {
  const fieldName = `experiencia_${experienceNumber}` as const

  const {
    fields: actividadesFields,
    append: appendActividad,
    remove: removeActividad,
  } = useFieldArray({
    control: form.control,
    name: `${fieldName}.actividades`,
  })

  const {
    fields: recursosFields,
    append: appendRecurso,
    remove: removeRecurso,
  } = useFieldArray({
    control: form.control,
    name: `${fieldName}.recursos`,
  })

  const completitud = calculateCompletitud(form.watch(fieldName))

  return (
    <Card className="border-2 hover:border-blue-300 transition-colors">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {expanded ? (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-500" />
            )}
            <CardTitle className="text-lg">
              Experiencia {experienceNumber}
            </CardTitle>
            <Badge variant={completitud === 100 ? 'success' : 'warning'}>
              {completitud}% completado
            </Badge>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6 pt-6">
          {/* Objetivo de Aprendizaje */}
          <FormField
            control={form.control}
            name={`${fieldName}.objetivo_aprendizaje`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Objetivo de Aprendizaje <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    placeholder="Ejemplo: Los estudiantes comprenderán el concepto de fracciones y serán capaces de representarlas gráficamente..."
                    disabled={readOnly}
                  />
                </FormControl>
                <FormDescription>
                  Define el objetivo principal que alcanzarán los estudiantes
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Conocimientos Previos */}
          <FormField
            control={form.control}
            name={`${fieldName}.conocimientos_previos`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Conocimientos Previos <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    placeholder="Ejemplo: Los estudiantes deben saber operaciones básicas de suma y resta, así como el concepto de división..."
                    disabled={readOnly}
                  />
                </FormControl>
                <FormDescription>
                  ¿Qué deben saber los estudiantes antes de esta experiencia?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Actividades */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FormLabel>
                Actividades <span className="text-red-500">*</span>
              </FormLabel>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendActividad({
                      descripcion: '',
                      tipo: 'desarrollo',
                      duracion_minutos: 45,
                      organizacion: 'individual',
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Actividad
                </Button>
              )}
            </div>

            {actividadesFields.length === 0 && (
              <Alert>
                <AlertDescription>
                  Aún no has agregado actividades. Haz clic en "Agregar Actividad" para comenzar.
                </AlertDescription>
              </Alert>
            )}

            {actividadesFields.map((field, index) => (
              <Card key={field.id} className="bg-gray-50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <Badge variant="default">Actividad {index + 1}</Badge>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeActividad(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`${fieldName}.actividades.${index}.tipo`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <FormControl>
                            <Select
                              {...field}
                              disabled={readOnly}
                              options={[
                                { value: 'inicio', label: 'Inicio' },
                                { value: 'desarrollo', label: 'Desarrollo' },
                                { value: 'cierre', label: 'Cierre' },
                              ]}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`${fieldName}.actividades.${index}.duracion_minutos`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duración (minutos)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              disabled={readOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`${fieldName}.actividades.${index}.organizacion`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organización</FormLabel>
                          <FormControl>
                            <Select
                              {...field}
                              disabled={readOnly}
                              options={[
                                { value: 'individual', label: 'Individual' },
                                { value: 'parejas', label: 'En Parejas' },
                                { value: 'grupos', label: 'Grupos' },
                                { value: 'plenario', label: 'Plenario' },
                              ]}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`${fieldName}.actividades.${index}.descripcion`}
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Describe detalladamente qué harán los estudiantes en esta actividad..."
                            disabled={readOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recursos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FormLabel>
                Recursos Necesarios <span className="text-red-500">*</span>
              </FormLabel>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendRecurso('')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Recurso
                </Button>
              )}
            </div>

            {recursosFields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <FormField
                  control={form.control}
                  name={`${fieldName}.recursos.${index}`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ej: Cuaderno, lápices de colores, material concreto..."
                          disabled={readOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRecurso(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Tiempo Estimado */}
          <FormField
            control={form.control}
            name={`${fieldName}.tiempo_estimado`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Tiempo Estimado <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder='Ej: "90 minutos" o "2 clases de 45 minutos"'
                    disabled={readOnly}
                  />
                </FormControl>
                <FormDescription>
                  Indica el tiempo total que tomará esta experiencia
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Atención a la Diversidad */}
          <FormField
            control={form.control}
            name={`${fieldName}.atencion_diversidad`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Atención a la Diversidad <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={4}
                    placeholder="Explica cómo adaptarás las actividades para atender las diferentes necesidades, estilos de aprendizaje y ritmos de los estudiantes..."
                    disabled={readOnly}
                  />
                </FormControl>
                <FormDescription>
                  Describe estrategias de diversificación y adaptación curricular
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      )}
    </Card>
  )
}

// Función para calcular completitud
function calculateCompletitud(experiencia: any): number {
  if (!experiencia) return 0

  const checks = [
    experiencia.objetivo_aprendizaje?.length >= 20,
    experiencia.conocimientos_previos?.length >= 20,
    experiencia.actividades?.length >= 1,
    experiencia.recursos?.length >= 1,
    experiencia.tiempo_estimado?.length >= 5,
    experiencia.atencion_diversidad?.length >= 30,
  ]

  const completed = checks.filter(Boolean).length
  return Math.round((completed / checks.length) * 100)
}
