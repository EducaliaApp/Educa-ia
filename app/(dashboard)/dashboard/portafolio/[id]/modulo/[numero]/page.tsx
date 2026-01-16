// app/(dashboard)/dashboard/portafolio/[id]/modulo/[numero]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { ArrowLeft, CheckCircle, Circle, Clock, FileText, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string; numero: string }>
}

export default async function ModuloDetallePage({ params }: Props) {
  const resolvedParams = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const numeroModulo = parseInt(resolvedParams.numero)
  if (isNaN(numeroModulo) || numeroModulo < 1 || numeroModulo > 3) {
    redirect(`/dashboard/portafolio/${resolvedParams.id}`)
  }

  // Primero verificar que el portafolio pertenece al usuario
  const { data: portafolioCheck, error: portafolioError } = await supabase
    .from('portafolios')
    .select('id, profesor_id, asignatura, nivel_educativo, estado')
    .eq('id', resolvedParams.id)
    .eq('profesor_id', user.id)
    .single()

  if (portafolioError || !portafolioCheck) {
    redirect(`/dashboard/portafolio/${resolvedParams.id}`)
  }

  // Obtener el módulo específico con sus tareas
  const { data: modulo, error } = await supabase
    .from('modulos_portafolio')
    .select(`
      id,
      portafolio_id,
      numero_modulo,
      completado,
      progreso_porcentaje,
      tipo_modulo,
      created_at,
      updated_at,
      tareas_portafolio(
        id,
        numero_tarea,
        nombre_tarea,
        completado,
        contenido_url,
        analisis_ia_portafolio(
          id,
          puntaje_estimado,
          categoria_logro,
          nivel_desempeno,
          created_at
        )
      )
    `)
    .eq('portafolio_id', resolvedParams.id)
    .eq('numero_modulo', numeroModulo)
    .single()

  if (error || !modulo) {
    console.error('Error fetching modulo:', error)
    redirect(`/dashboard/portafolio/${resolvedParams.id}`)
  }

  const portafolioData = portafolioCheck as any
  // Mapear tareas_portafolio a la estructura esperada
  const moduloData = {
    ...(modulo as any),
    tareas: (modulo as any).tareas_portafolio || []
  }

  // Títulos y descripciones según el módulo
  const moduloInfo: Record<number, { titulo: string; descripcion: string; tareas: Array<{ nombre: string; descripcion: string }> }> = {
    1: {
      titulo: 'Planificación, Evaluación y Reflexión',
      descripcion: 'Diseña una planificación de 8 horas, una evaluación y reflexiona sobre tu práctica pedagógica',
      tareas: [
        { nombre: 'Planificación', descripcion: 'Planifica una unidad de 8 horas pedagógicas' },
        { nombre: 'Evaluación', descripcion: 'Diseña una evaluación con criterios e instrumentos' },
        { nombre: 'Reflexión Pedagógica', descripcion: 'Reflexiona sobre tu práctica docente' },
      ]
    },
    2: {
      titulo: 'Clase Grabada',
      descripcion: 'Graba y analiza una clase de 40-45 minutos',
      tareas: [
        { nombre: 'Clase Grabada', descripcion: 'Video de 40-45 minutos de tu práctica en aula' },
      ]
    },
    3: {
      titulo: 'Trabajo Colaborativo',
      descripcion: 'Documenta y reflexiona sobre tu trabajo colaborativo con colegas',
      tareas: [
        { nombre: 'Trabajo Colaborativo', descripcion: 'Evidencia de colaboración con otros docentes' },
      ]
    }
  }

  const info = moduloInfo[numeroModulo]

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <Link href={`/dashboard/portafolio/${resolvedParams.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Portafolio
          </Button>
        </Link>
      </div>

      {/* Header Card */}
      <Card className="mb-8">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  Módulo {numeroModulo}
                </h1>
                {moduloData.completado ? (
                  <CheckCircle className="h-7 w-7 text-green-600" />
                ) : (
                  <Clock className="h-7 w-7 text-yellow-600" />
                )}
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                {info.titulo}
              </h2>
              <p className="text-gray-600 mb-4">
                {info.descripcion}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{portafolioData.asignatura}</span>
                <span>•</span>
                <span>{portafolioData.nivel_educativo}</span>
              </div>
            </div>
            <Badge className={moduloData.completado ? 'bg-green-600' : 'bg-yellow-600'}>
              {moduloData.completado ? 'Completado' : 'En Progreso'}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Progreso del Módulo</span>
              <span className="font-medium">{moduloData.progreso_porcentaje}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${moduloData.progreso_porcentaje}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Tareas */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Tareas del Módulo</h2>
      </div>

      {moduloData.tareas && moduloData.tareas.length > 0 ? (
        <div className="space-y-4">
          {moduloData.tareas
            .sort((a: any, b: any) => a.numero_tarea - b.numero_tarea)
            .map((tarea: any, idx: number) => {
              const tareaInfo = info.tareas[idx] || { nombre: tarea.nombre_tarea, descripcion: '' }
              const analisis = tarea.analisis_ia_portafolio && tarea.analisis_ia_portafolio.length > 0 ? tarea.analisis_ia_portafolio[0] : null

              return (
                <Card key={tarea.id} className="hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {tarea.completado ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          ) : (
                            <Circle className="h-6 w-6 text-gray-400" />
                          )}
                          <h3 className="text-lg font-semibold text-gray-900">
                            Tarea {tarea.numero_tarea}: {tarea.nombre_tarea}
                          </h3>
                        </div>

                        <p className="text-gray-600 mb-4 ml-9">
                          {tareaInfo.descripcion}
                        </p>

                        {/* Análisis LIA Badge */}
                        {analisis && (
                          <div className="ml-9 mb-4 flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Sparkles className="h-4 w-4 text-purple-600" />
                              <span className="text-gray-700">Análisis LIA disponible</span>
                            </div>
                            {analisis.puntaje_estimado && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-900">
                                  Puntaje: {analisis.puntaje_estimado.toFixed(1)}/4.0
                                </span>
                                {analisis.nivel_desempeno && (
                                  <Badge className="bg-blue-600">
                                    {analisis.nivel_desempeno}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Meta información */}
                        <div className="ml-9 text-sm text-gray-500">
                          {tarea.fecha_completado ? (
                            <span>
                              Completada el {new Date(tarea.fecha_completado).toLocaleDateString('es-CL', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          ) : (
                            <span>Sin completar</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link href={`/dashboard/portafolio/${resolvedParams.id}/modulo/${numeroModulo}/tarea/${tarea.numero_tarea}`}>
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            Ver Tarea
                          </Button>
                        </Link>
                        {!tarea.completado && (
                          <Link href={`/dashboard/portafolio/${resolvedParams.id}/modulo/${numeroModulo}/tarea/${tarea.numero_tarea}/editar`}>
                            <Button size="sm">
                              Continuar
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
        </div>
      ) : (
        <Card>
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay tareas creadas
            </h3>
            <p className="text-gray-600 mb-4">
              Las tareas para este módulo aún no han sido creadas.
            </p>
            <Link href={`/dashboard/portafolio/${resolvedParams.id}/modulo/${numeroModulo}/editar`}>
              <Button>
                Crear Tareas
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}
