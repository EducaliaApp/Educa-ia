'use client'

import { useMemo } from 'react'
import { AdminSurface } from '@/components/admin/AdminSurface'
import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react'

interface ETLStatsData {
  fecha: string
  total_procesos: number
  completados: number
  error: number
  total_registros: number
}

interface ETLStatsChartProps {
  data: ETLStatsData[]
}

export function ETLStatsChart({ data }: ETLStatsChartProps) {
  // Calcular estadísticas de tendencia
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalProcesos: 0,
        promedioCompletados: 0,
        promedioRegistros: 0,
        tendenciaCompletados: 0,
      }
    }

    const totalProcesos = data.reduce((sum, d) => sum + d.total_procesos, 0)
    const promedioCompletados = data.reduce((sum, d) => sum + d.completados, 0) / data.length
    const promedioRegistros = data.reduce((sum, d) => sum + d.total_registros, 0) / data.length

    // Calcular tendencia comparando primera y segunda mitad del periodo
    const mitad = Math.floor(data.length / 2)
    const primeraMetadCompletados = data.slice(0, mitad).reduce((sum, d) => sum + d.completados, 0) / mitad
    const segundaMetadCompletados = data.slice(mitad).reduce((sum, d) => sum + d.completados, 0) / (data.length - mitad)

    const tendenciaCompletados = primeraMetadCompletados > 0
      ? ((segundaMetadCompletados - primeraMetadCompletados) / primeraMetadCompletados) * 100
      : 0

    return {
      totalProcesos,
      promedioCompletados: Math.round(promedioCompletados * 10) / 10,
      promedioRegistros: Math.round(promedioRegistros),
      tendenciaCompletados: Math.round(tendenciaCompletados * 10) / 10,
    }
  }, [data])

  // Calcular máximos para escalar las barras
  const maxCompletados = useMemo(() => {
    return Math.max(...data.map(d => d.completados), 1)
  }, [data])

  const maxError = useMemo(() => {
    return Math.max(...data.map(d => d.error), 1)
  }, [data])

  const maxRegistros = useMemo(() => {
    return Math.max(...data.map(d => d.total_registros), 1)
  }, [data])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Métricas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AdminSurface padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Procesos (período)</p>
              <p className="text-white text-2xl font-bold mt-1">{stats.totalProcesos}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </AdminSurface>

        <AdminSurface padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Promedio Completados/día</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-white text-2xl font-bold">{stats.promedioCompletados}</p>
                {stats.tendenciaCompletados !== 0 && (
                  <span className={`text-xs flex items-center gap-1 ${stats.tendenciaCompletados > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {stats.tendenciaCompletados > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(stats.tendenciaCompletados)}%
                  </span>
                )}
              </div>
            </div>
            <Clock className="w-8 h-8 text-green-500" />
          </div>
        </AdminSurface>

        <AdminSurface padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Promedio Registros/día</p>
              <p className="text-white text-2xl font-bold mt-1">
                {stats.promedioRegistros.toLocaleString('es-CL')}
              </p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </AdminSurface>
      </div>

      {/* Gráfico de Barras: Procesos Completados vs Errores */}
      <AdminSurface>
        <h3 className="text-white text-lg font-semibold mb-4">
          Procesos por Día (Últimos {data.length} días)
        </h3>
        <div className="space-y-3">
          {data.slice(0, 10).reverse().map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 w-20">{formatDate(item.fecha)}</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-green-400">
                    {item.completados} completados
                  </span>
                  {item.error > 0 && (
                    <span className="text-red-400">
                      {item.error} errores
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 h-8">
                {/* Barra de completados */}
                {item.completados > 0 && (
                  <div
                    className="bg-green-600 rounded transition-all hover:bg-green-500"
                    style={{ width: `${(item.completados / maxCompletados) * 100}%` }}
                    title={`${item.completados} completados`}
                  />
                )}
                {/* Barra de errores */}
                {item.error > 0 && (
                  <div
                    className="bg-red-600 rounded transition-all hover:bg-red-500"
                    style={{ width: `${(item.error / maxError) * 100}%` }}
                    title={`${item.error} errores`}
                  />
                )}
                {item.completados === 0 && item.error === 0 && (
                  <div className="bg-slate-800 rounded w-1" />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded"></div>
            <span className="text-slate-400">Completados</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded"></div>
            <span className="text-slate-400">Errores</span>
          </div>
        </div>
      </AdminSurface>

      {/* Gráfico de Registros Procesados */}
      <AdminSurface>
        <h3 className="text-white text-lg font-semibold mb-4">
          Registros Procesados por Día
        </h3>
        <div className="space-y-3">
          {data.slice(0, 10).reverse().map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 w-20">{formatDate(item.fecha)}</span>
                <span className="text-purple-400 text-xs">
                  {item.total_registros.toLocaleString('es-CL')} registros
                </span>
              </div>
              <div className="relative h-6 bg-slate-800 rounded overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 to-purple-400 transition-all"
                  style={{ width: `${(item.total_registros / maxRegistros) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </AdminSurface>
    </div>
  )
}
