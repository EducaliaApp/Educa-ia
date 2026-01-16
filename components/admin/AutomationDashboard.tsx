'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Play, Pause, RotateCcw, Activity, Clock, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface MetricasProcesamiento {
  documentos_pendientes: number
  procesando_actualmente: number
  procesados_hoy: number
  fallidos_hoy: number
  tiempo_promedio_ms: number
  ultimo_auto_healing: string
}

export function AutomationDashboard() {
  const [metricas, setMetricas] = useState<MetricasProcesamiento | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchMetricas = useCallback(async () => {
    try {
      setLoading(true)
      
      // Obtener métricas en paralelo
      const [pendientes, procesando, hoy] = await Promise.all([
        supabase.from('documentos_pendientes').select('id', { count: 'exact' }),
        supabase.from('documentos_oficiales').select('id', { count: 'exact' }).eq('estado_procesamiento', 'procesando'),
        supabase.from('metricas_procesamiento').select('*').gte('created_at', new Date().toISOString().split('T')[0])
      ])

      const procesadosHoy = hoy.data?.reduce((sum, m) => sum + (m.documentos_procesados || 0), 0) || 0
      const fallidosHoy = hoy.data?.reduce((sum, m) => sum + (m.documentos_fallidos || 0), 0) || 0
      const tiempoPromedio = hoy.data?.reduce((sum, m) => sum + (m.tiempo_total_ms || 0), 0) / (hoy.data?.length || 1)

      setMetricas({
        documentos_pendientes: pendientes.count || 0,
        procesando_actualmente: procesando.count || 0,
        procesados_hoy: procesadosHoy,
        fallidos_hoy: fallidosHoy,
        tiempo_promedio_ms: tiempoPromedio,
        ultimo_auto_healing: '2 horas ago' // Simplificado
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const ejecutarProcesamiento = async () => {
    try {
      const response = await fetch('/api/admin/procesar-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limite: 5 })
      })
      
      if (response.ok) {
        await fetchMetricas()
      }
    } catch (error) {
      console.error('Error ejecutando procesamiento:', error)
    }
  }

  const ejecutarAutoHealing = async () => {
    try {
      const response = await fetch('/api/admin/auto-healing', {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchMetricas()
      }
    } catch (error) {
      console.error('Error ejecutando auto-healing:', error)
    }
  }

  useEffect(() => {
    fetchMetricas()
    const interval = setInterval(fetchMetricas, 30000) // Cada 30 segundos
    return () => clearInterval(interval)
  }, [fetchMetricas])

  if (loading && !metricas) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 animate-pulse" />
          <span>Cargando métricas de automatización...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Automatización del Sistema</h2>
        <div className="flex space-x-2">
          <Button onClick={ejecutarProcesamiento} size="sm">
            <Play className="h-4 w-4 mr-2" />
            Procesar Lote
          </Button>
          <Button onClick={ejecutarAutoHealing} variant="secondary" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Auto-Healing
          </Button>
        </div>
      </div>

      {metricas && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{metricas.documentos_pendientes}</p>
                  <p className="text-sm text-gray-600">Pendientes</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <Activity className="h-8 w-8 text-blue-500 animate-pulse" />
                <div>
                  <p className="text-2xl font-bold">{metricas.procesando_actualmente}</p>
                  <p className="text-sm text-gray-600">Procesando</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{metricas.procesados_hoy}</p>
                  <p className="text-sm text-gray-600">Procesados Hoy</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{metricas.fallidos_hoy}</p>
                  <p className="text-sm text-gray-600">Fallidos Hoy</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Rendimiento</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Tiempo Promedio:</span>
                  <Badge>
                    {Math.round(metricas.tiempo_promedio_ms / 1000)}s
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Tasa de Éxito:</span>
                  <Badge className="bg-green-100 text-green-800">
                    {metricas.procesados_hoy + metricas.fallidos_hoy > 0 
                      ? Math.round((metricas.procesados_hoy / (metricas.procesados_hoy + metricas.fallidos_hoy)) * 100)
                      : 100}%
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Último Auto-Healing:</span>
                  <span className="text-sm text-gray-600">{metricas.ultimo_auto_healing}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Estado del Pipeline</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Monitoreo Automático</span>
                  <Badge className="bg-green-100 text-green-800">Activo</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Procesamiento en Lote</span>
                  <Badge className="bg-green-100 text-green-800">Activo</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Auto-Healing</span>
                  <Badge className="bg-green-100 text-green-800">Activo</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Limpieza Automática</span>
                  <Badge className="bg-green-100 text-green-800">Programada</Badge>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}