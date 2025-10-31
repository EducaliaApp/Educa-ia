import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Download, Edit, Share2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ExportPDFButton from '@/components/ExportPDFButton'

interface PlanificacionPageProps {
  params: { id: string }
}

export default async function PlanificacionPage({ params }: PlanificacionPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: planificacion } = await supabase
    .from('planificaciones')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!planificacion) {
    notFound()
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const contenido = planificacion.contenido as any
  const isPro = profile?.plan === 'pro'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/planificaciones">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {planificacion.unidad}
              </h1>
              <div className="flex items-center gap-4 text-gray-600">
                <span>{planificacion.asignatura}</span>
                <span>•</span>
                <span>{planificacion.nivel}</span>
                <span>•</span>
                <span>{planificacion.duracion_clases} clases</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Creado el {new Date(planificacion.created_at).toLocaleDateString('es-CL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <ExportPDFButton planificacion={planificacion} isPro={isPro} />
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Compartir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objetivos de Aprendizaje */}
      {contenido.objetivosAprendizaje && (
        <Card>
          <CardHeader>
            <CardTitle>Objetivos de Aprendizaje</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {contenido.objetivosAprendizaje.map((objetivo: string, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{objetivo}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Clases */}
      {contenido.clases && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Planificación Clase por Clase</h2>
          {contenido.clases.map((clase: any, index: number) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>
                  Clase {clase.numero}: {clase.titulo}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {clase.objetivo && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Objetivo</h4>
                    <p className="text-gray-700">{clase.objetivo}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Inicio (15 min)</h4>
                  <p className="text-gray-700">{clase.inicio}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Desarrollo (60 min)</h4>
                  <p className="text-gray-700">{clase.desarrollo}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Cierre (15 min)</h4>
                  <p className="text-gray-700">{clase.cierre}</p>
                </div>

                {clase.materiales && clase.materiales.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Materiales</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {clase.materiales.map((material: string, idx: number) => (
                        <li key={idx} className="text-gray-700">{material}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {clase.indicadores && clase.indicadores.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Indicadores de Evaluación</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {clase.indicadores.map((indicador: string, idx: number) => (
                        <li key={idx} className="text-gray-700">{indicador}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Evaluación */}
      {contenido.evaluacion && (
        <Card>
          <CardHeader>
            <CardTitle>Evaluación de la Unidad</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{contenido.evaluacion}</p>
          </CardContent>
        </Card>
      )}

      {/* Recursos */}
      {contenido.recursos && contenido.recursos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recursos Recomendados</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              {contenido.recursos.map((recurso: string, index: number) => (
                <li key={index} className="text-gray-700">{recurso}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Footer con marca de agua si es FREE */}
      {!isPro && (
        <Card className="bg-gradient-to-br from-blue-50 to-green-50">
          <CardContent className="p-6 text-center">
            <p className="text-gray-700 mb-4">
              Esta planificación fue generada con <strong>ProfeFlow FREE</strong>
            </p>
            <Link href="/upgrade">
              <Button>Actualiza a PRO para PDFs sin marca de agua</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
