'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Activity, Database, Zap, HardDrive, RefreshCw } from 'lucide-react'

interface HealthCheck {
  component: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  latency_ms: number
  error?: string
  timestamp: string
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: HealthCheck[]
  timestamp: string
  uptime: string
}

export function SystemHealthDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchHealth = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/health-check')
      const data = await response.json()
      setHealth(data)
    } catch (error) {
      console.error('Error fetching health:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000) // Cada 30 segundos
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800'
      case 'degraded': return 'bg-yellow-100 text-yellow-800'
      case 'unhealthy': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getIcon = (component: string) => {
    switch (component) {
      case 'database': return <Database className="h-5 w-5" />
      case 'openai': return <Zap className="h-5 w-5" />
      case 'storage': return <HardDrive className="h-5 w-5" />
      default: return <Activity className="h-5 w-5" />
    }
  }

  if (loading && !health) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Verificando estado del sistema...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Estado del Sistema</h2>
        <Button onClick={fetchHealth} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {health && (
        <>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Estado General</h3>
                <p className="text-sm text-gray-600">
                  Última verificación: {new Date(health.timestamp).toLocaleString('es-CL')}
                </p>
              </div>
              <Badge className={getStatusColor(health.status)}>
                {health.status.toUpperCase()}
              </Badge>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {health.checks.map((check) => (
              <Card key={check.component} className="p-4">
                <div className="flex items-center space-x-3">
                  {getIcon(check.component)}
                  <div className="flex-1">
                    <h4 className="font-medium capitalize">{check.component}</h4>
                    <p className="text-sm text-gray-600">
                      {check.latency_ms}ms
                    </p>
                    {check.error && (
                      <p className="text-xs text-red-600 mt-1">{check.error}</p>
                    )}
                  </div>
                  <Badge className={getStatusColor(check.status)}>
                    {check.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}