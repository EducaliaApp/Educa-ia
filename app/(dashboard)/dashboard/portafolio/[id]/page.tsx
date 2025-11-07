// app/(dashboard)/dashboard/portafolio/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ModuloCard } from '@/components/portafolio/ModuloCard'
import { Calendar, BookOpen, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PortafolioDetallePage({ params }: Props) {
  const resolvedParams = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Obtener portafolio con módulos y tareas
  const { data: portafolio, error } = await supabase
    .from('portafolios')
    .select(`
      *,
      modulos:modulos_portafolio(
        *,
        tareas:tareas_portafolio(
          id,
          numero_tarea,
          nombre_tarea,
          completado
        )
      )
    `)
    .eq('id', resolvedParams.id)
    .eq('profesor_id', user.id)
    .single()

  if (error || !portafolio) {
    redirect('/dashboard/portafolio')
  }

  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      borrador: 'bg-gray-500',
      en_revision: 'bg-yellow-500',
      completado: 'bg-green-500',
      enviado: 'bg-blue-500',
    }
    return colors[estado] || 'bg-gray-500'
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header Card */}
      <Card className="mb-8">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Portafolio {portafolio.año_evaluacion}
              </h1>
              <p className="text-lg text-gray-700">{portafolio.asignatura}</p>
              <p className="text-sm text-gray-600">{portafolio.nivel_educativo}</p>
            </div>
            <Badge className={getEstadoColor(portafolio.estado)}>
              {portafolio.estado}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Progreso Total</span>
              <span className="font-medium">{portafolio.progreso_porcentaje}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${portafolio.progreso_porcentaje}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Creado</p>
                <p className="font-medium">
                  {new Date(portafolio.created_at).toLocaleDateString('es-CL')}
                </p>
              </div>
            </div>

            {portafolio.puntaje_estimado_ia && (
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Puntaje Estimado LIA</p>
                  <p className="font-medium">{portafolio.puntaje_estimado_ia.toFixed(1)}/4.0</p>
                </div>
              </div>
            )}

            {portafolio.categoria_logro && (
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Categoría de Logro</p>
                  <p className="font-medium">{portafolio.categoria_logro}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Módulos */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Módulos</h2>
      </div>

      {portafolio.modulos && portafolio.modulos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portafolio.modulos
            .sort((a: any, b: any) => a.numero_modulo - b.numero_modulo)
            .map((modulo: any) => (
              <ModuloCard
                key={modulo.id}
                id={modulo.id}
                portafolioId={portafolio.id}
                numero_modulo={modulo.numero_modulo}
                completado={modulo.completado}
                progreso_porcentaje={modulo.progreso_porcentaje}
                tareas={modulo.tareas}
              />
            ))}
        </div>
      ) : (
        <Card>
          <div className="p-6 text-center text-gray-600">
            No hay módulos creados para este portafolio aún.
          </div>
        </Card>
      )}
    </div>
  )
}
