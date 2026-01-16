import Link from 'next/link'
import { Plus, FileText, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default async function PlanificacionesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: planificaciones } = await supabase
    .from('planificaciones')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Planificaciones</h1>
          <p className="text-gray-600 mt-2">
            Gestiona todas tus planificaciones curriculares
          </p>
        </div>
        <Link href="/dashboard/planificaciones/nueva">
          <Button>
            <Plus className="h-5 w-5 mr-2" />
            Nueva Planificación
          </Button>
        </Link>
      </div>

      {planificaciones && planificaciones.length > 0 ? (
        <div className="grid gap-4">
          {planificaciones.map((plan) => {
            const contenido = plan.contenido as any
            return (
              <Card key={plan.id} hover>
                <Link href={`/dashboard/planificaciones/${plan.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {plan.unidad}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>{plan.asignatura}</span>
                          <span>•</span>
                          <span>{plan.nivel}</span>
                          <span>•</span>
                          <span>{plan.duracion_clases} clases</span>
                        </div>
                        {contenido?.objetivosAprendizaje && (
                          <p className="text-sm text-gray-600 mt-2">
                            {contenido.objetivosAprendizaje.length} objetivos de aprendizaje
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(plan.created_at).toLocaleDateString('es-CL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
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
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes planificaciones aún
            </h3>
            <p className="text-gray-600 mb-6">
              Crea tu primera planificación curricular con LIA en minutos
            </p>
            <Link href="/dashboard/planificaciones/nueva">
              <Button>
                <Plus className="h-5 w-5 mr-2" />
                Crear mi primera planificación
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
