// app/(dashboard)/dashboard/portafolio/[id]/modulo/[numero]/tarea/[tarea]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { AnalisisDisplay } from '@/components/portafolio/AnalisisDisplay'
import { FeedbackPanel } from '@/components/portafolio/FeedbackPanel'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  Sparkles,
  Edit,
  Video
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string; numero: string; tarea: string }>
}

export default async function TareaDetallePage({ params }: Props) {
  const resolvedParams = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const numeroModulo = parseInt(resolvedParams.numero)
  const numeroTarea = parseInt(resolvedParams.tarea)

  if (isNaN(numeroModulo) || isNaN(numeroTarea)) {
    redirect(`/dashboard/portafolio/${resolvedParams.id}`)
  }

  // Obtener tarea con análisis y evaluaciones
  const { data: tarea, error: tareaError } = await supabase
    .from('tareas_portafolio')
    .select(`
      *,
      modulo:modulos_portafolio!inner(
        *,
        portafolio:portafolios!inner(
          *
        )
      ),
      analisis:analisis_ia_portafolio(
        *
      )
    `)
    .eq('modulos_portafolio.portafolio_id', resolvedParams.id)
    .eq('modulos_portafolio.numero_modulo', numeroModulo)
    .eq('numero_tarea', numeroTarea)
    .single()

  if (tareaError || !tarea || !tarea.modulo || !tarea.modulo.portafolio) {
    redirect(`/dashboard/portafolio/${resolvedParams.id}/modulo/${numeroModulo}`)
  }

  const portafolio = tarea.modulo.portafolio
  const modulo = tarea.modulo

  // Verificar que el portafolio pertenece al usuario
  if (portafolio.profesor_id !== user.id) {
    redirect('/dashboard/portafolio')
  }

  // Obtener el análisis más reciente
  const analisisReciente = tarea.analisis && tarea.analisis.length > 0
    ? tarea.analisis.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
    : null

  // Obtener evaluaciones por indicador si hay análisis
  let evaluaciones: any[] = []
  if (analisisReciente) {
    const { data: evaluacionesData } = await supabase
      .from('evaluaciones_indicador')
      .select('*')
      .eq('analisis_id', analisisReciente.id)
      .order('puntaje', { ascending: false })

    evaluaciones = evaluacionesData || []
  }

  // Generar recomendaciones desde evaluaciones
  const recomendaciones = evaluaciones
    .filter((ev: any) => ev.para_siguiente_nivel && ev.acciones_concretas.length > 0)
    .map((ev: any) => {
      const niveles: Record<string, number> = {
        'Insatisfactorio': 1,
        'Básico': 2,
        'Competente': 3,
        'Destacado': 4
      }

      const nivelActualNum = niveles[ev.nivel_alcanzado] || 1
      const nivelObjetivoNum = Math.min(nivelActualNum + 1, 4)
      const nivelObjetivo = Object.keys(niveles).find(k => niveles[k] === nivelObjetivoNum) || 'Competente'

      const impacto = (nivelObjetivoNum - nivelActualNum) * 0.5

      // Determinar prioridad basada en impacto y nivel actual
      let prioridad: 'alta' | 'media' | 'baja' = 'media'
      if (ev.nivel_alcanzado === 'Insatisfactorio') {
        prioridad = 'alta'
      } else if (ev.nivel_alcanzado === 'Básico' && impacto >= 0.5) {
        prioridad = 'alta'
      } else if (ev.nivel_alcanzado === 'Competente') {
        prioridad = 'baja'
      }

      return {
        indicador: ev.nombre_indicador,
        nivel_actual: ev.nivel_alcanzado,
        nivel_objetivo: nivelObjetivo,
        prioridad,
        impacto_puntos: impacto,
        tiempo_horas: ev.acciones_concretas.length * 2, // Estimación: 2h por acción
        accion: ev.para_siguiente_nivel,
        razon: ev.justificacion,
        pasos: ev.acciones_concretas
      }
    })

  // Información de la tarea según módulo y número
  const tareaInfoMap: Record<string, { nombre: string; descripcion: string }> = {
    '1-1': { nombre: 'Planificación', descripcion: 'Planificación de 8 horas pedagógicas' },
    '1-2': { nombre: 'Evaluación', descripcion: 'Diseño de evaluación con criterios' },
    '1-3': { nombre: 'Reflexión Pedagógica', descripcion: 'Reflexión sobre práctica docente' },
    '2-4': { nombre: 'Clase Grabada', descripcion: 'Video de clase de 40-45 minutos' },
    '3-5': { nombre: 'Trabajo Colaborativo', descripcion: 'Evidencia de colaboración docente' },
  }

  const tareaInfo = tareaInfoMap[`${numeroModulo}-${numeroTarea}`] || {
    nombre: tarea.nombre_tarea,
    descripcion: 'Tarea del portafolio docente'
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Breadcrumb Navigation */}
      <div className="mb-6 flex items-center gap-2">
        <Link href={`/dashboard/portafolio/${resolvedParams.id}`}>
          <Button variant="outline" size="sm">
            Portafolio
          </Button>
        </Link>
        <span className="text-gray-400">/</span>
        <Link href={`/dashboard/portafolio/${resolvedParams.id}/modulo/${numeroModulo}`}>
          <Button variant="outline" size="sm">
            Módulo {numeroModulo}
          </Button>
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-600">Tarea {numeroTarea}</span>
      </div>

      {/* Header Card */}
      <Card className="mb-8">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {tarea.completado ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <Clock className="h-6 w-6 text-yellow-600" />
                )}
                <h1 className="text-2xl font-bold text-gray-900">
                  Tarea {numeroTarea}: {tareaInfo.nombre}
                </h1>
              </div>
              <p className="text-gray-600 mb-4">
                {tareaInfo.descripcion}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Módulo {numeroModulo}</span>
                <span>•</span>
                <span>{portafolio.asignatura}</span>
                <span>•</span>
                <span>{portafolio.nivel_educativo}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Badge className={tarea.completado ? 'bg-green-600' : 'bg-yellow-600'}>
                {tarea.completado ? 'Completado' : 'En Progreso'}
              </Badge>
              {analisisReciente && (
                <Badge className="bg-purple-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Con Análisis IA
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Link href={`/dashboard/portafolio/${resolvedParams.id}/modulo/${numeroModulo}/tarea/${numeroTarea}/editar`}>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Editar Tarea
              </Button>
            </Link>
            {numeroModulo === 2 && (
              <Button variant="outline">
                <Video className="h-4 w-4 mr-2" />
                Ver Video
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Contenido de la Tarea */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contenido de la Tarea
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tarea.contenido && Object.keys(tarea.contenido).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(tarea.contenido).map(([key, value]: [string, any]) => (
                <div key={key}>
                  <h4 className="font-semibold text-gray-900 mb-2 capitalize">
                    {key.replace(/_/g, ' ')}
                  </h4>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Esta tarea aún no tiene contenido.</p>
              <Link href={`/dashboard/portafolio/${resolvedParams.id}/modulo/${numeroModulo}/tarea/${numeroTarea}/editar`}>
                <Button className="mt-4">Agregar Contenido</Button>
              </Link>
            </div>
          )}

          {/* Archivos adjuntos */}
          {tarea.archivos_adjuntos && tarea.archivos_adjuntos.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold text-gray-900 mb-3">Archivos Adjuntos</h4>
              <div className="space-y-2">
                {tarea.archivos_adjuntos.map((archivo: string, idx: number) => (
                  <a
                    key={idx}
                    href={archivo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                  >
                    <FileText className="h-4 w-4" />
                    Archivo {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Análisis IA y Feedback */}
      {analisisReciente && evaluaciones.length > 0 ? (
        <>
          {/* Análisis Display */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-600" />
              Análisis IA
            </h2>
            <AnalisisDisplay
              analisis={{
                id: analisisReciente.id,
                puntaje_estimado: analisisReciente.puntaje_estimado,
                categoria_logro: analisisReciente.categoria_logro,
                nivel_desempeño: analisisReciente.nivel_desempeño,
                modelo_usado: analisisReciente.modelo_usado,
                prompt_tokens: analisisReciente.prompt_tokens,
                completion_tokens: analisisReciente.completion_tokens,
                costo_usd: analisisReciente.costo_usd,
                latencia_ms: analisisReciente.latencia_ms,
                created_at: analisisReciente.created_at
              }}
              evaluaciones={evaluaciones}
              showMetadata={true}
            />
          </div>

          {/* Feedback Panel */}
          {recomendaciones.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                Plan de Mejora
              </h2>
              <FeedbackPanel
                recomendaciones={recomendaciones}
                puntajeActual={analisisReciente.puntaje_estimado}
                puntajeObjetivo={4.0}
              />
            </div>
          )}
        </>
      ) : (
        <Card className="bg-blue-50 border-blue-200">
          <div className="p-8 text-center">
            <Sparkles className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Análisis IA No Disponible
            </h3>
            <p className="text-gray-600 mb-4">
              Esta tarea aún no ha sido analizada por IA. Completa el contenido y solicita un análisis.
            </p>
            <Button>
              Solicitar Análisis IA
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
