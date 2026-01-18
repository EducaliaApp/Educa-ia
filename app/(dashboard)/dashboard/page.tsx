import Link from 'next/link'
import { FileText, ClipboardCheck, FolderOpen, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const estadoLabels: Record<string, string> = {
    borrador: 'Borrador',
    en_revision: 'En Revisión',
    completado: 'Completado',
    enviado: 'Enviado',
  }

  const estadoClasses: Record<string, string> = {
    borrador: 'bg-gray-500 text-white',
    en_revision: 'bg-yellow-500 text-white',
    completado: 'bg-green-500 text-white',
    enviado: 'bg-blue-500 text-white',
  }

  // Obtener últimos portafolios
  const { data: portafolios } = await supabase
    .from('portafolios')
    .select('*')
    .eq('profesor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(4)

  // Obtener últimas planificaciones
  const { data: planificaciones } = await supabase
    .from('planificaciones')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Obtener últimas evaluaciones
  const { data: evaluaciones } = await supabase
    .from('evaluaciones')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          Bienvenido a ProfeFlow - Tu asistente de planificación con LIA
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">{/* ... rest of the component ... */}
        <Card hover>
          <Link href="/dashboard/planificaciones/nueva">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Nueva Planificación</CardTitle>
                  <CardDescription>
                    Genera una planificación curricular con LIA
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card hover>
          <Link href="/dashboard/evaluaciones/nueva">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <ClipboardCheck className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Nueva Evaluación</CardTitle>
                  <CardDescription>
                    Evalúa trabajos de estudiantes con LIA
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card hover>
          <Link href="/dashboard/portafolio/nuevo">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FolderOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Nuevo Portafolio Docente</CardTitle>
                  <CardDescription>
                    Organiza la evidencia de tu evaluación docente
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {/* Recent Portafolios */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Portafolios Recientes
          </h2>
          <Link href="/dashboard/portafolio">
            <Button variant="outline" size="sm">Ver todos</Button>
          </Link>
        </div>

        {portafolios && portafolios.length > 0 ? (
          <div className="grid gap-4">
            {portafolios.map((portafolio) => {
              const estado = portafolio.estado as string
              const estadoLabel = estadoLabels[estado] || estado
              const estadoClass = estadoClasses[estado] || 'bg-gray-500 text-white'

              return (
                <Card key={portafolio.id} hover>
                  <Link href={`/dashboard/portafolio/${portafolio.id}`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                            Portafolio {portafolio.año_evaluacion}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                            {portafolio.asignatura} • {portafolio.nivel_educativo}
                          </p>
                          <div className="mt-3 flex items-center gap-2 sm:gap-3">
                            <div className="w-20 sm:w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${portafolio.progreso_porcentaje}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {portafolio.progreso_porcentaje}% completado
                            </span>
                          </div>
                          {(portafolio.puntaje_estimado_ia || portafolio.categoria_logro) && (
                            <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-2">
                              {portafolio.puntaje_estimado_ia && (
                                <span>
                                  Puntaje LIA: {portafolio.puntaje_estimado_ia.toFixed(1)}/4.0
                                </span>
                              )}
                              {portafolio.categoria_logro && (
                                <span className="flex items-center gap-2">
                                  <span className="hidden sm:inline">•</span>
                                  Categoría: {portafolio.categoria_logro}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 justify-between sm:justify-start">
                          <Badge className={estadoClass}>{estadoLabel}</Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(portafolio.created_at).toLocaleDateString('es-CL')}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Aún no has creado ningún portafolio docente
              </p>
              <Link href="/dashboard/portafolio/nuevo">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear mi primer portafolio
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Planificaciones */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Planificaciones Recientes
          </h2>
          <Link href="/dashboard/planificaciones">
            <Button variant="outline" size="sm">Ver todas</Button>
          </Link>
        </div>

        {planificaciones && planificaciones.length > 0 ? (
          <div className="grid gap-4">
            {planificaciones.map((plan) => (
              <Card key={plan.id} hover>
                <Link href={`/dashboard/planificaciones/${plan.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {plan.unidad}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {plan.asignatura} • {plan.nivel}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(plan.created_at).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Aún no has creado ninguna planificación
              </p>
              <Link href="/dashboard/planificaciones/nueva">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear mi primera planificación
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Evaluaciones */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Evaluaciones Recientes
          </h2>
          <Link href="/dashboard/evaluaciones">
            <Button variant="outline" size="sm">Ver todas</Button>
          </Link>
        </div>

        {evaluaciones && evaluaciones.length > 0 ? (
          <div className="grid gap-4">
            {evaluaciones.map((evaluacion) => (
              <Card key={evaluacion.id} hover>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {evaluacion.tipo || 'Evaluación'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {evaluacion.instrucciones?.substring(0, 100) || 'Sin descripción'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(evaluacion.created_at).toLocaleDateString('es-CL')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Aún no has creado ninguna evaluación
              </p>
              <Link href="/dashboard/evaluaciones/nueva">
                <Button variant="secondary">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear mi primera evaluación
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
