import Link from 'next/link'
import { FileText, ClipboardCheck, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Bienvenido a ProfeFlow - Tu asistente de planificación con IA
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    Genera una planificación curricular con IA
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
                    Evalúa trabajos de estudiantes con IA
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {/* Recent Planificaciones */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Evaluaciones Recientes
          </h2>
          <Link href="/dashboard/evaluaciones">
            <Button variant="outline" size="sm">Ver todas</Button>
          </Link>
        </div>

        {evaluaciones && evaluaciones.length > 0 ? (
          <div className="grid gap-4">
            {evaluaciones.map((eval) => (
              <Card key={eval.id} hover>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {eval.tipo || 'Evaluación'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {eval.instrucciones?.substring(0, 100) || 'Sin descripción'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(eval.created_at).toLocaleDateString('es-CL')}
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
