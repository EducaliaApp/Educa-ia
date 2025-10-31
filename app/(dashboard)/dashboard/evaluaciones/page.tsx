import Link from 'next/link'
import { Plus, ClipboardCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default async function EvaluacionesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: evaluaciones } = await supabase
    .from('evaluaciones')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Evaluaciones</h1>
          <p className="text-gray-600 mt-2">
            Evalúa trabajos de estudiantes con IA
          </p>
        </div>
        <Link href="/dashboard/evaluaciones/nueva">
          <Button variant="secondary">
            <Plus className="h-5 w-5 mr-2" />
            Nueva Evaluación
          </Button>
        </Link>
      </div>

      {evaluaciones && evaluaciones.length > 0 ? (
        <div className="grid gap-4">
          {evaluaciones.map((evaluacion) => {
            const feedback = evaluacion.feedback as any
            return (
              <Card key={evaluacion.id} hover>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <ClipboardCheck className="h-6 w-6 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {evaluacion.tipo || 'Evaluación'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {evaluacion.instrucciones?.substring(0, 150) || 'Sin instrucciones'}
                        {evaluacion.instrucciones && evaluacion.instrucciones.length > 150 && '...'}
                      </p>
                      {feedback && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-700 font-medium">
                            Feedback generado por IA disponible
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(evaluacion.created_at).toLocaleDateString('es-CL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes evaluaciones aún
            </h3>
            <p className="text-gray-600 mb-6">
              Evalúa trabajos de estudiantes con retroalimentación generada por IA
            </p>
            <Link href="/dashboard/evaluaciones/nueva">
              <Button variant="secondary">
                <Plus className="h-5 w-5 mr-2" />
                Crear mi primera evaluación
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
