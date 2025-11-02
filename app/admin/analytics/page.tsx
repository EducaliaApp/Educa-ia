import { createClient } from '@/lib/supabase/server'
import { MetricsCard } from '@/components/admin/metrics-card'
import { AnalyticsCharts } from '@/components/admin/analytics-charts'
import { TrendingUp, Target, Users, Activity } from 'lucide-react'

interface UserGrowth {
  date: string
  count: number
}

interface PlanificacionBySubject {
  asignatura: string
  count: number
}

interface PlanificacionByNivel {
  nivel: string
  count: number
}

export default async function AnalyticsPage() {
  const supabase = await createClient()

  // Get planificaciones by subject
  const { data: planificacionesBySubject } = await supabase.rpc('get_planificaciones_by_subject')

  // Get planificaciones by nivel
  const { data: planificacionesByNivel } = await supabase.rpc('get_planificaciones_by_nivel')

  // Get user growth (last 30 days)
  const { data: userGrowthData } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true })

  // Process user growth data
  const userGrowthByDate: { [key: string]: number } = {}
  userGrowthData?.forEach((user) => {
    const date = new Date(user.created_at).toLocaleDateString('es-CL')
    userGrowthByDate[date] = (userGrowthByDate[date] || 0) + 1
  })

  const userGrowthChartData = Object.entries(userGrowthByDate).map(([date, count]) => ({
    name: date,
    value: count,
  }))

  // Get total users and planificaciones
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { count: totalPlanificaciones } = await supabase
    .from('planificaciones')
    .select('*', { count: 'exact', head: true })

  // Calculate average planificaciones per user
  const avgPlanificacionesPerUser =
    totalUsers && totalUsers > 0 ? (totalPlanificaciones || 0) / totalUsers : 0

  // Get active users (last 7 days)
  const { data: activeUsersData } = await supabase
    .from('planificaciones')
    .select('user_id')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const uniqueActiveUsers = new Set(activeUsersData?.map((p) => p.user_id) || []).size

  // Calculate retention rate
  const retentionRate = totalUsers && totalUsers > 0 ? (uniqueActiveUsers / totalUsers) * 100 : 0

  // Format chart data for pie chart (subjects)
  const subjectChartData =
    planificacionesBySubject?.map((item: PlanificacionBySubject) => ({
      name: item.asignatura,
      value: item.count,
    })) || []

  // Format chart data for bar chart (niveles)
  const nivelChartData =
    planificacionesByNivel?.map((item: PlanificacionByNivel) => ({
      name: item.nivel,
      value: item.count,
    })) || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-slate-400">
          Análisis detallado del uso y crecimiento de ProfeFlow
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Promedio Plan./Usuario"
          value={avgPlanificacionesPerUser.toFixed(1)}
          subtitle="Total de planificaciones por usuario"
          icon={Target}
          iconColor="blue"
        />
        <MetricsCard
          title="Usuarios Activos (7d)"
          value={uniqueActiveUsers}
          subtitle={`${((uniqueActiveUsers / (totalUsers || 1)) * 100).toFixed(1)}% del total`}
          icon={Users}
          iconColor="green"
        />
        <MetricsCard
          title="Tasa de Retención"
          value={`${retentionRate.toFixed(1)}%`}
          subtitle="Usuarios activos en últimos 7 días"
          icon={Activity}
          iconColor="purple"
        />
        <MetricsCard
          title="Nuevos Usuarios (30d)"
          value={userGrowthData?.length || 0}
          subtitle="Crecimiento último mes"
          icon={TrendingUp}
          iconColor="orange"
        />
      </div>

      <AnalyticsCharts
        userGrowthData={userGrowthChartData}
        subjectData={subjectChartData}
        nivelData={nivelChartData}
      />

      {/* Additional Stats Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Asignaturas */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">Top Asignaturas</h3>
          <div className="space-y-3">
            {subjectChartData.slice(0, 5).map((item: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between pb-3 border-b border-slate-800 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-medium">#{index + 1}</span>
                  <span className="text-white">{item.name}</span>
                </div>
                <span className="text-blue-500 font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Niveles Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">Distribución por Nivel</h3>
          <div className="space-y-3">
            {nivelChartData.map((item: any, index: number) => {
              const total = nivelChartData.reduce((acc: number, curr: any) => acc + curr.value, 0)
              const percentage = ((item.value / total) * 100).toFixed(1)

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">{item.name}</span>
                    <span className="text-slate-400 text-sm">
                      {item.value} ({percentage}%)
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
      </div>

      {/* Engagement Metrics */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h3 className="text-white font-semibold mb-4">Métricas de Engagement</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-2">Total de Usuarios</p>
            <p className="text-white text-3xl font-bold">{totalUsers || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-2">Total de Planificaciones</p>
            <p className="text-white text-3xl font-bold">{totalPlanificaciones || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-2">Promedio por Usuario</p>
            <p className="text-white text-3xl font-bold">
              {avgPlanificacionesPerUser.toFixed(1)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
