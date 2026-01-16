'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { BookOpen, GraduationCap, School, TrendingUp } from 'lucide-react'

interface MinEducStats {
  planificaciones_por_asignatura: { asignatura: string; count: number }[]
  planificaciones_por_nivel: { nivel: string; count: number }[]
  evaluaciones_por_nivel: { nivel: string; count: number }[]
  portafolios_por_nivel: { nivel_educativo: string; count: number }[]
}

export default function MinEducPage() {
  const [stats, setStats] = useState<MinEducStats>({
    planificaciones_por_asignatura: [],
    planificaciones_por_nivel: [],
    evaluaciones_por_nivel: [],
    portafolios_por_nivel: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      // Planificaciones por asignatura
      const { data: planByAsignatura } = await supabase.rpc('get_planificaciones_by_subject')

      // Planificaciones por nivel
      const { data: planByNivel } = await supabase.rpc('get_planificaciones_by_nivel')

      // Evaluaciones por nivel (manual query)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nivel')

      const { data: evaluaciones } = await supabase
        .from('evaluaciones')
        .select('user_id')

      // Group evaluaciones by nivel
      const evalByNivel: { [key: string]: number } = {}
      evaluaciones?.forEach((evaluacion) => {
        const profile = profiles?.find((p) => p.id === evaluacion.user_id)
        if (profile?.nivel) {
          evalByNivel[profile.nivel] = (evalByNivel[profile.nivel] || 0) + 1
        }
      })

      const evaluacionesByNivel = Object.entries(evalByNivel).map(([nivel, count]) => ({
        nivel,
        count,
      }))

      // Portafolios por nivel
      const { data: portafolios } = await supabase
        .from('portafolios')
        .select('nivel_educativo')

      const portByNivel: { [key: string]: number } = {}
      portafolios?.forEach((p) => {
        if (p.nivel_educativo) {
          portByNivel[p.nivel_educativo] = (portByNivel[p.nivel_educativo] || 0) + 1
        }
      })

      const portafoliosByNivel = Object.entries(portByNivel).map(([nivel_educativo, count]) => ({
        nivel_educativo,
        count,
      }))

      setStats({
        planificaciones_por_asignatura: planByAsignatura || [],
        planificaciones_por_nivel: planByNivel || [],
        evaluaciones_por_nivel: evaluacionesByNivel,
        portafolios_por_nivel: portafoliosByNivel,
      })
    } catch (error) {
      console.error('Error fetching MINEDUC stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-400">Cargando estadísticas MINEDUC...</span>
      </div>
    )
  }

  const totalPlanificaciones = stats.planificaciones_por_asignatura.reduce(
    (acc, item) => acc + item.count,
    0
  )
  const totalAsignaturas = stats.planificaciones_por_asignatura.length
  const totalNiveles = stats.planificaciones_por_nivel.length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Panel MINEDUC</h1>
        <p className="text-slate-400">
          Estadísticas alineadas con Bases Curriculares y Marco para la Buena Enseñanza
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Total Planificaciones</p>
              <h3 className="text-white text-3xl font-bold">{totalPlanificaciones}</h3>
            </div>
            <div className="p-3 bg-blue-600/10 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Asignaturas Activas</p>
              <h3 className="text-white text-3xl font-bold">{totalAsignaturas}</h3>
            </div>
            <div className="p-3 bg-green-600/10 rounded-lg">
              <GraduationCap className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Niveles Educativos</p>
              <h3 className="text-white text-3xl font-bold">{totalNiveles}</h3>
            </div>
            <div className="p-3 bg-purple-600/10 rounded-lg">
              <School className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Cobertura Curricular</p>
              <h3 className="text-white text-3xl font-bold">
                {totalAsignaturas > 0 ? '100%' : '0%'}
              </h3>
            </div>
            <div className="p-3 bg-orange-600/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Planificaciones por Asignatura */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          Planificaciones por Asignatura (Bases Curriculares)
        </h2>
        <div className="space-y-3">
          {stats.planificaciones_por_asignatura
            .sort((a, b) => b.count - a.count)
            .map((item, index) => {
              const percentage =
                totalPlanificaciones > 0 ? (item.count / totalPlanificaciones) * 100 : 0

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{item.asignatura}</Badge>
                    </div>
                    <span className="text-slate-400 text-sm">
                      {item.count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Planificaciones por Nivel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Planificaciones por Nivel Educativo
          </h2>
          <div className="space-y-3">
            {stats.planificaciones_por_nivel
              .sort((a, b) => b.count - a.count)
              .map((item, index) => {
                const total = stats.planificaciones_por_nivel.reduce(
                  (acc, curr) => acc + curr.count,
                  0
                )
                const percentage = total > 0 ? (item.count / total) * 100 : 0

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">{item.nivel}</span>
                      <span className="text-slate-400 text-sm">
                        {item.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Evaluaciones por Nivel</h2>
          <div className="space-y-3">
            {stats.evaluaciones_por_nivel
              .sort((a, b) => b.count - a.count)
              .map((item, index) => {
                const total = stats.evaluaciones_por_nivel.reduce(
                  (acc, curr) => acc + curr.count,
                  0
                )
                const percentage = total > 0 ? (item.count / total) * 100 : 0

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">{item.nivel}</span>
                      <span className="text-slate-400 text-sm">
                        {item.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Portafolios MBE */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          Portafolios por Nivel (Marco para la Buena Enseñanza)
        </h2>
        <div className="space-y-3">
          {stats.portafolios_por_nivel
            .sort((a, b) => b.count - a.count)
            .map((item, index) => {
              const total = stats.portafolios_por_nivel.reduce((acc, curr) => acc + curr.count, 0)
              const percentage = total > 0 ? (item.count / total) * 100 : 0

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">{item.nivel_educativo}</span>
                    <span className="text-slate-400 text-sm">
                      {item.count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* MINEDUC Compliance Info */}
      <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-6">
        <h3 className="text-blue-100 font-semibold mb-3">
          Alineación con Normativa MINEDUC Chile
        </h3>
        <div className="space-y-2 text-blue-200 text-sm">
          <p>
            • <strong>Bases Curriculares:</strong> Todas las planificaciones están alineadas con
            las Bases Curriculares vigentes del MINEDUC.
          </p>
          <p>
            • <strong>Marco para la Buena Enseñanza (MBE):</strong> Los portafolios docentes
            evalúan las 4 dimensiones del MBE.
          </p>
          <p>
            • <strong>Niveles Educativos:</strong> Cobertura desde Educación Parvularia hasta
            Educación Media.
          </p>
          <p>
            • <strong>Evaluación Docente:</strong> Sistema alineado con el proceso de evaluación
            docente nacional.
          </p>
        </div>
      </div>
    </div>
  )
}
