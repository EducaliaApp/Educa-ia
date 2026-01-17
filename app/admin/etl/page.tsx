'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MetricsCard } from '@/components/admin/metrics-card'
import { ETLStatsChart } from '@/components/admin/etl-stats-chart'
import { ETLProcessTable } from '@/components/admin/etl-process-table'
import { ETLLogsViewer } from '@/components/admin/etl-logs-viewer'
import { AdminSurface } from '@/components/admin/AdminSurface'
import {
  Database,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'

interface ProcesoETL {
  id: string
  nombre: string
  tipo_proceso: string
  descripcion: string
  estado: 'pendiente' | 'en_progreso' | 'completado' | 'error' | 'cancelado'
  fecha_inicio: string | null
  fecha_fin: string | null
  duracion_ms: number | null
  total_registros: number
  registros_exitosos: number
  registros_fallidos: number
  tasa_exito_porcentaje: number
  num_logs: number
  num_errores: number
  num_archivos: number
  logs: string[]
  errores: any[]
  created_at: string
  updated_at: string
}

interface Estadisticas {
  total_procesos: number
  procesos_completados: number
  procesos_en_progreso: number
  procesos_error: number
  tasa_exito: number
  total_registros_procesados: number
  duracion_promedio_ms: number
  total_documentos_generados: number
}

interface EstadisticaPorFecha {
  fecha: string
  total_procesos: number
  completados: number
  error: number
  total_registros: number
}

export default function ETLPage() {
  const [procesos, setProcesos] = useState<ProcesoETL[]>([])
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [estadisticasPorFecha, setEstadisticasPorFecha] = useState<EstadisticaPorFecha[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionMessage, setExecutionMessage] = useState('')
  const [selectedProcesoLogs, setSelectedProcesoLogs] = useState<ProcesoETL | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Cargar en paralelo: historial y estadísticas
      const [historialRes, estadisticasRes] = await Promise.all([
        fetch('/api/admin/etl/historial?limite=100'),
        fetch('/api/admin/etl/estadisticas?dias=30'),
      ])

      if (historialRes.ok) {
        const historialData = await historialRes.json()
        setProcesos(historialData.procesos || [])
      }

      if (estadisticasRes.ok) {
        const estadisticasData = await estadisticasRes.json()
        setEstadisticas(estadisticasData.estadisticas_generales)
        setEstadisticasPorFecha(estadisticasData.estadisticas_por_fecha || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setExecutionMessage('❌ Error cargando datos del ETL')
    } finally {
      setIsLoading(false)
    }
  }

  const ejecutarExtraccionBasesCurriculares = async () => {
    setIsExecuting(true)
    setExecutionMessage('')

    try {
      const response = await fetch('/api/admin/etl/ejecutar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proceso: 'extraer_bases_curriculares',
          config: { force: false },
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setExecutionMessage('✅ Extracción completada exitosamente')
        // Recargar datos después de 2 segundos
        setTimeout(() => {
          fetchData()
        }, 2000)
      } else {
        setExecutionMessage(`❌ Error: ${result.error || 'Error desconocido'}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setExecutionMessage(`❌ Error ejecutando extracción: ${errorMessage}`)
      console.error('Error:', error)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleViewDetails = async (proceso: ProcesoETL) => {
    // Cargar detalles completos del proceso incluyendo logs
    try {
      const { data: detalles, error } = await supabase
        .from('procesos_etl')
        .select('*')
        .eq('id', proceso.id)
        .single()

      if (error) {
        console.error('Error cargando detalles:', error)
        alert('Error cargando detalles del proceso')
        return
      }

      // Abrir modal de logs con los detalles completos
      setSelectedProcesoLogs(detalles as ProcesoETL)
    } catch (error) {
      console.error('Error:', error)
      alert('Error cargando detalles del proceso')
    }
  }

  const handleViewLogs = async (proceso: ProcesoETL) => {
    // Cargar logs del proceso
    try {
      const { data: detalles, error } = await supabase
        .from('procesos_etl')
        .select('*')
        .eq('id', proceso.id)
        .single()

      if (error) {
        console.error('Error cargando logs:', error)
        alert('Error cargando logs del proceso')
        return
      }

      setSelectedProcesoLogs(detalles as ProcesoETL)
    } catch (error) {
      console.error('Error:', error)
      alert('Error cargando logs del proceso')
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-400">Cargando procesos ETL...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Procesos ETL - Data Maestra</h1>
        <p className="text-slate-400">
          Extracción y transformación de data maestra desde fuentes oficiales MINEDUC
        </p>
      </div>

      {/* Botón para ejecutar extracción */}
      <AdminSurface className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">
              Extraer Bases Curriculares
            </h2>
            <p className="text-slate-400">
              Extrae objetivos de aprendizaje categorizados desde el currículum nacional de Chile
              (curriculumnacional.cl)
            </p>
          </div>
          <button
            onClick={ejecutarExtraccionBasesCurriculares}
            disabled={isExecuting}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              isExecuting
                ? 'bg-slate-700 text-slate-300 cursor-wait'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_15px_35px_rgba(37,99,235,0.35)]'
            }`}
          >
            {isExecuting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Ejecutando...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Ejecutar Extracción
              </>
            )}
          </button>
        </div>
        {executionMessage && (
          <div
            className={`p-4 rounded-xl border ${
              executionMessage.startsWith('✅')
                ? 'bg-green-950/30 border-green-600/40 text-green-300'
                : 'bg-red-950/40 border-red-600/40 text-red-300'
            }`}
          >
            {executionMessage}
          </div>
        )}
      </AdminSurface>

      {/* Estadísticas Principales */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricsCard
            title="Total Procesos"
            value={estadisticas.total_procesos}
            subtitle="Desde el inicio"
            icon={Database}
            iconColor="blue"
          />

          <MetricsCard
            title="Procesos Completados"
            value={estadisticas.procesos_completados}
            subtitle={`Tasa de éxito: ${estadisticas.tasa_exito.toFixed(1)}%`}
            icon={CheckCircle}
            iconColor="green"
            trend={
              estadisticas.tasa_exito > 0
                ? {
                    value: estadisticas.tasa_exito,
                    isPositive: estadisticas.tasa_exito >= 90,
                  }
                : undefined
            }
          />

          <MetricsCard
            title="Registros Procesados"
            value={estadisticas.total_registros_procesados.toLocaleString('es-CL')}
            subtitle="Total acumulado"
            icon={TrendingUp}
            iconColor="purple"
          />

          <MetricsCard
            title="Documentos Generados"
            value={estadisticas.total_documentos_generados}
            subtitle={`Promedio: ${formatDuration(estadisticas.duracion_promedio_ms)}`}
            icon={FileText}
            iconColor="orange"
          />
        </div>
      )}

      {/* Procesos con Errores (si existen) */}
      {estadisticas && estadisticas.procesos_error > 0 && (
        <AdminSurface variant="danger">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="text-red-400 font-semibold">
                {estadisticas.procesos_error} procesos con errores
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                Revisa los logs para identificar y solucionar los problemas
              </p>
            </div>
          </div>
        </AdminSurface>
      )}

      {/* Procesos En Progreso (si existen) */}
      {estadisticas && estadisticas.procesos_en_progreso > 0 && (
        <AdminSurface variant="warning">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 text-yellow-500 animate-spin" />
            <div>
              <h3 className="text-yellow-400 font-semibold">
                {estadisticas.procesos_en_progreso} procesos en ejecución
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                Los procesos se están ejecutando actualmente. Refrescar para ver el progreso.
              </p>
            </div>
          </div>
        </AdminSurface>
      )}

      {/* Gráficos de Estadísticas por Fecha */}
      {estadisticasPorFecha && estadisticasPorFecha.length > 0 && (
        <ETLStatsChart data={estadisticasPorFecha} />
      )}

      {/* Tabla de Procesos */}
      <ETLProcessTable
        procesos={procesos}
        onViewDetails={handleViewDetails}
        onViewLogs={handleViewLogs}
        onRefresh={fetchData}
      />

      {/* Modal de Logs */}
      {selectedProcesoLogs && (
        <ETLLogsViewer
          proceso={selectedProcesoLogs}
          onClose={() => setSelectedProcesoLogs(null)}
        />
      )}
    </div>
  )
}
