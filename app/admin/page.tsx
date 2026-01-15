import { createClient } from '@/lib/supabase/server'
import { MetricsCard } from '@/components/admin/metrics-card'
import { DashboardCharts } from '@/components/admin/dashboard-charts'
import { RecentUsersTable } from '@/components/admin/recent-users-table'
import { Badge } from '@/components/ui/Badge'
import { Users, TrendingUp, DollarSign, FileText, Activity, Calendar, BookOpen, Star, ClipboardCheck, Briefcase } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface UserStats {
  total_users: number
  free_users: number
  pro_users: number
  conversion_rate: number
  mrr_clp: number
  planificaciones_today: number
  active_users_7d: number
}

interface TopUser {
  user_id: string
  nombre: string
  email: string
  plan: string
  asignatura: string
  total_planificaciones: number
  total_evaluaciones: number
  created_at: string
}

interface PlanificacionByDate {
  date: string
  count: number
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Get user statistics
  const { data: statsData } = await supabase.rpc('get_user_stats')
  const stats: UserStats = statsData?.[0] || {
    total_users: 0,
    free_users: 0,
    pro_users: 0,
    conversion_rate: 0,
    mrr_clp: 0,
    planificaciones_today: 0,
    active_users_7d: 0,
  }

  // Get additional metrics
  const { data: totalPlanificaciones } = await supabase
    .from('planificaciones')
    .select('id', { count: 'exact' })
  
  const { data: totalEvaluaciones } = await supabase
    .from('evaluaciones')
    .select('id', { count: 'exact' })

  const { data: totalPortafolios } = await supabase
    .from('portafolios')
    .select('id', { count: 'exact' })

  const { data: planificacionesThisMonth } = await supabase
    .from('planificaciones')
    .select('id', { count: 'exact' })
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  // Get top users
  const { data: topUsers } = await supabase.rpc('get_top_users', { limit_count: 10 })

  // Get planificaciones by date (last 7 days)
  const { data: planificacionesByDate } = await supabase.rpc('get_planificaciones_by_date', {
    days_back: 7,
  })

  // Format chart data
  const chartData =
    planificacionesByDate?.map((item: PlanificacionByDate) => ({
      name: formatDate(item.date),
      value: item.count,
    })) || []

  // Get recent users
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('id, nombre, email, plan, asignatura, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard Admin</h1>
        <p className="text-slate-400">
          Resumen general de ProfeFlow - {new Date().toLocaleDateString('es-CL')}
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Total Usuarios"
          value={stats.total_users}
          subtitle={`${stats.free_users} FREE | ${stats.pro_users} PRO`}
          icon={Users}
          iconColor="blue"
        />
        <MetricsCard
          title="Conversión"
          value={`${stats.conversion_rate.toFixed(1)}%`}
          subtitle="FREE → PRO"
          icon={TrendingUp}
          iconColor="green"
        />
        <MetricsCard
          title="MRR"
          value={formatCurrency(stats.mrr_clp)}
          subtitle="Ingreso mensual recurrente"
          icon={DollarSign}
          iconColor="purple"
        />
        <MetricsCard
          title="Usuarios Activos"
          value={stats.active_users_7d}
          subtitle="Últimos 7 días"
          icon={Activity}
          iconColor="orange"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricsCard
          title="Total Planificaciones"
          value={totalPlanificaciones?.length || 0}
          subtitle="Desde el inicio"
          icon={FileText}
          iconColor="purple"
        />
        <MetricsCard
          title="Planificaciones Hoy"
          value={stats.planificaciones_today}
          subtitle="Generadas hoy"
          icon={Calendar}
          iconColor="blue"
        />
        <MetricsCard
          title="Este Mes"
          value={planificacionesThisMonth?.length || 0}
          subtitle="Planificaciones del mes"
          icon={BookOpen}
          iconColor="green"
        />
        <MetricsCard
          title="Total Evaluaciones"
          value={totalEvaluaciones?.length || 0}
          subtitle="Desde el inicio"
          icon={ClipboardCheck}
          iconColor="orange"
        />
        <MetricsCard
          title="Total Portafolios"
          value={totalPortafolios?.length || 0}
          subtitle="Portafolios docentes"
          icon={Briefcase}
          iconColor="indigo"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCharts
          chartData={chartData}
          freeUsers={stats.free_users}
          proUsers={stats.pro_users}
          totalUsers={stats.total_users}
        />
      </div>

      {/* Top Users Table */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Top 10 Usuarios Más Activos</h2>
        {topUsers && topUsers.length > 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                      #
                    </th>
                    <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                      Usuario
                    </th>
                    <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                      Email
                    </th>
                    <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                      Plan
                    </th>
                    <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                      Asignatura
                    </th>
                    <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                      Planificaciones
                    </th>
                    <th className="text-left px-6 py-4 text-slate-400 text-sm font-medium">
                      Evaluaciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {topUsers.map((user: TopUser, index: number) => (
                    <tr key={user.user_id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {index < 3 && (
                            <div className={`w-2 h-2 rounded-full ${
                              index === 0 ? 'bg-yellow-400' : 
                              index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                            }`} />
                          )}
                          <span className="text-slate-400 font-medium">#{index + 1}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{user.nombre}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">{user.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant={user.plan === 'pro' ? 'success' : 'default'}>
                          {user.plan.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {user.asignatura || '-'}
                      </td>
                      <td className="px-6 py-4 text-white font-semibold">
                        {user.total_planificaciones}
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-medium">
                        {user.total_evaluaciones}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
            <p className="text-slate-400 text-center">No hay datos de usuarios disponibles</p>
          </div>
        )}
      </div>

      {/* Recent Users */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Últimos 10 Usuarios Registrados</h2>
        <RecentUsersTable users={recentUsers || []} />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <a href="/admin/usuarios" className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <h3 className="text-white font-semibold">Gestionar Usuarios</h3>
                <p className="text-slate-400 text-sm">Ver y administrar usuarios</p>
              </div>
            </div>
          </a>
          <a href="/admin/planificaciones" className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-400" />
              <div>
                <h3 className="text-white font-semibold">Ver Planificaciones</h3>
                <p className="text-slate-400 text-sm">Revisar planificaciones</p>
              </div>
            </div>
          </a>
          <a href="/admin/evaluaciones" className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-8 h-8 text-orange-400" />
              <div>
                <h3 className="text-white font-semibold">Ver Evaluaciones</h3>
                <p className="text-slate-400 text-sm">Revisar evaluaciones</p>
              </div>
            </div>
          </a>
          <a href="/admin/portafolios" className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-indigo-400" />
              <div>
                <h3 className="text-white font-semibold">Ver Portafolios</h3>
                <p className="text-slate-400 text-sm">Portafolios MBE</p>
              </div>
            </div>
          </a>
          <a href="/admin/analytics" className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              <div>
                <h3 className="text-white font-semibold">Analytics</h3>
                <p className="text-slate-400 text-sm">Métricas y reportes</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
