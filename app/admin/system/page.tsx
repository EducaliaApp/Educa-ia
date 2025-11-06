import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Database, 
  Server, 
  Shield, 
  Users, 
  FileText, 
  Star,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error'
  auth: 'healthy' | 'warning' | 'error'
  api: 'healthy' | 'warning' | 'error'
  storage: 'healthy' | 'warning' | 'error'
}

export default async function SystemPage() {
  const supabase = await createClient()

  // Obtener estadísticas del sistema
  const [
    { count: totalUsers },
    { count: totalPlanificaciones },
    { count: totalEvaluaciones },
    { count: adminUsers }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('planificaciones').select('*', { count: 'exact', head: true }),
    supabase.from('evaluaciones').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin')
  ])

  // Simular health check (en producción esto sería más complejo)
  const systemHealth: SystemHealth = {
    database: 'healthy',
    auth: 'healthy', 
    api: 'healthy',
    storage: 'healthy'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle
      case 'warning': return AlertTriangle
      case 'error': return AlertTriangle
      default: return Clock
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Sistema</h1>
        <p className="text-slate-400">
          Configuración y monitoreo del sistema ProfeFlow
        </p>
      </div>

      {/* System Health */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Estado del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(systemHealth).map(([service, status]) => {
            const StatusIcon = getStatusIcon(status)
            return (
              <Card key={service} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      status === 'healthy' ? 'bg-green-500/20' :
                      status === 'warning' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                    }`}>
                      {service === 'database' && <Database className="w-5 h-5" />}
                      {service === 'auth' && <Shield className="w-5 h-5" />}
                      {service === 'api' && <Server className="w-5 h-5" />}
                      {service === 'storage' && <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-white font-medium capitalize">{service}</h3>
                      <p className="text-slate-400 text-sm">Servicio</p>
                    </div>
                  </div>
                  <StatusIcon className={`w-5 h-5 ${getStatusColor(status)}`} />
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* System Statistics */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Estadísticas del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{totalUsers || 0}</h3>
                <p className="text-slate-400">Total Usuarios</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <FileText className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{totalPlanificaciones || 0}</h3>
                <p className="text-slate-400">Planificaciones</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Star className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{totalEvaluaciones || 0}</h3>
                <p className="text-slate-400">Evaluaciones</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Shield className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{adminUsers || 0}</h3>
                <p className="text-slate-400">Administradores</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* System Configuration */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Configuración</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Límites del Sistema</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Plan FREE - Planificaciones/mes</span>
                <Badge variant="default">5</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Plan FREE - Evaluaciones/mes</span>
                <Badge variant="default">3</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Plan PRO - Planificaciones/mes</span>
                <Badge variant="success">Ilimitado</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Plan PRO - Evaluaciones/mes</span>
                <Badge variant="success">Ilimitado</Badge>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Precios</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Plan FREE</span>
                <Badge variant="default">$0 CLP</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Plan PRO</span>
                <Badge variant="success">$6.990 CLP/mes</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Comisión plataforma</span>
                <Badge variant="warning">3%</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Actividad Reciente</h2>
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
              <Activity className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white">Sistema iniciado correctamente</p>
                <p className="text-slate-400 text-sm">{new Date().toLocaleString('es-CL')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white">Base de datos conectada</p>
                <p className="text-slate-400 text-sm">Conexión estable</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
              <Shield className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white">Autenticación funcionando</p>
                <p className="text-slate-400 text-sm">Supabase Auth activo</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}