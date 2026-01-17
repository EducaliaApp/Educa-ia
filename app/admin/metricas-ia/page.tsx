'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Cpu, DollarSign, Zap, TrendingUp, Activity } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface AIMetrics {
  total_analisis: number
  total_tokens: number
  total_costo_usd: number
  promedio_latencia_ms: number
  analisis_por_tipo: { tipo: string; count: number; tokens: number; costo: number }[]
  analisis_por_modelo: { modelo: string; count: number; tokens: number; costo: number }[]
  tendencia_diaria: { fecha: string; count: number; tokens: number; costo: number }[]
}

export default function MetricasIAPage() {
  const [metrics, setMetrics] = useState<AIMetrics>({
    total_analisis: 0,
    total_tokens: 0,
    total_costo_usd: 0,
    promedio_latencia_ms: 0,
    analisis_por_tipo: [],
    analisis_por_modelo: [],
    tendencia_diaria: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true)
    try {
      // Get all AI analysis data
      const { data: analisisData } = await supabase
        .from('analisis_ia_portafolio')
        .select('modelo_usado, tipo_analisis, prompt_tokens, completion_tokens, costo_usd, latencia_ms, created_at')

      if (analisisData) {
        // Calculate totals
        const totalAnalisis = analisisData.length
        const totalTokens = analisisData.reduce(
          (acc, curr) => acc + (curr.prompt_tokens || 0) + (curr.completion_tokens || 0),
          0
        )
        const totalCostoUsd = analisisData.reduce((acc, curr) => acc + (curr.costo_usd || 0), 0)
        const promedioLatenciaMs =
          analisisData.length > 0
            ? analisisData.reduce((acc, curr) => acc + (curr.latencia_ms || 0), 0) / analisisData.length
            : 0

        // Group by tipo_analisis
        const porTipo: { [key: string]: { count: number; tokens: number; costo: number } } = {}
        analisisData.forEach((item) => {
          const tipo = item.tipo_analisis || 'sin_tipo'
          if (!porTipo[tipo]) {
            porTipo[tipo] = { count: 0, tokens: 0, costo: 0 }
          }
          porTipo[tipo].count++
          porTipo[tipo].tokens += (item.prompt_tokens || 0) + (item.completion_tokens || 0)
          porTipo[tipo].costo += item.costo_usd || 0
        })

        const analisisPorTipo = Object.entries(porTipo).map(([tipo, data]) => ({
          tipo,
          ...data,
        }))

        // Group by modelo
        const porModelo: { [key: string]: { count: number; tokens: number; costo: number } } = {}
        analisisData.forEach((item) => {
          const modelo = item.modelo_usado || 'desconocido'
          if (!porModelo[modelo]) {
            porModelo[modelo] = { count: 0, tokens: 0, costo: 0 }
          }
          porModelo[modelo].count++
          porModelo[modelo].tokens += (item.prompt_tokens || 0) + (item.completion_tokens || 0)
          porModelo[modelo].costo += item.costo_usd || 0
        })

        const analisisPorModelo = Object.entries(porModelo).map(([modelo, data]) => ({
          modelo,
          ...data,
        }))

        // Group by date (last 7 days)
        const porFecha: { [key: string]: { count: number; tokens: number; costo: number } } = {}
        analisisData.forEach((item) => {
          if (item.created_at) {
            const fecha = new Date(item.created_at).toLocaleDateString('es-CL')
            if (!porFecha[fecha]) {
              porFecha[fecha] = { count: 0, tokens: 0, costo: 0 }
            }
            porFecha[fecha].count++
            porFecha[fecha].tokens += (item.prompt_tokens || 0) + (item.completion_tokens || 0)
            porFecha[fecha].costo += item.costo_usd || 0
          }
        })

        const tendenciaDiaria = Object.entries(porFecha)
          .map(([fecha, data]) => ({
            fecha,
            ...data,
          }))
          .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
          .slice(-7)

        setMetrics({
          total_analisis: totalAnalisis,
          total_tokens: totalTokens,
          total_costo_usd: totalCostoUsd,
          promedio_latencia_ms: promedioLatenciaMs,
          analisis_por_tipo: analisisPorTipo,
          analisis_por_modelo: analisisPorModelo,
          tendencia_diaria: tendenciaDiaria,
        })
      }
    } catch (error) {
      console.error('Error fetching AI metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-400">Cargando métricas de IA...</span>
      </div>
    )
  }

  const costoCLP = metrics.total_costo_usd * 950 // Aproximación USD to CLP

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Métricas de IA</h1>
        <p className="text-slate-400">
          Análisis de uso, costos y rendimiento de los modelos de inteligencia artificial
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Total Análisis</p>
              <h3 className="text-white text-3xl font-bold">{metrics.total_analisis}</h3>
            </div>
            <div className="p-3 bg-blue-600/10 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Tokens Consumidos</p>
              <h3 className="text-white text-3xl font-bold">
                {(metrics.total_tokens / 1000).toFixed(1)}k
              </h3>
            </div>
            <div className="p-3 bg-purple-600/10 rounded-lg">
              <Cpu className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Costo Total</p>
              <h3 className="text-white text-2xl font-bold">
                ${metrics.total_costo_usd.toFixed(2)} USD
              </h3>
              <p className="text-slate-500 text-xs mt-1">≈ {formatCurrency(costoCLP)}</p>
            </div>
            <div className="p-3 bg-green-600/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Latencia Promedio</p>
              <h3 className="text-white text-3xl font-bold">
                {metrics.promedio_latencia_ms.toFixed(0)}
                <span className="text-xl">ms</span>
              </h3>
            </div>
            <div className="p-3 bg-orange-600/10 rounded-lg">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Analysis by Model */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Análisis por Modelo</h2>
        <div className="space-y-3">
          {metrics.analisis_por_modelo
            .sort((a, b) => b.count - a.count)
            .map((item, index) => {
              const totalAnalisis = metrics.total_analisis
              const percentage = totalAnalisis > 0 ? (item.count / totalAnalisis) * 100 : 0

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="default">{item.modelo}</Badge>
                      <span className="text-slate-400 text-sm">
                        {item.count} análisis ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-semibold">
                        ${item.costo.toFixed(4)} USD
                      </p>
                      <p className="text-slate-500 text-xs">
                        {(item.tokens / 1000).toFixed(1)}k tokens
                      </p>
                    </div>
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

      {/* Analysis by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Análisis por Tipo</h2>
          <div className="space-y-3">
            {metrics.analisis_por_tipo
              .sort((a, b) => b.count - a.count)
              .map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-white font-medium">{item.tipo}</p>
                    <p className="text-slate-400 text-sm">{item.count} análisis</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">${item.costo.toFixed(4)}</p>
                    <p className="text-slate-500 text-xs">
                      {(item.tokens / 1000).toFixed(1)}k tokens
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Tendencia (Últimos 7 días)</h2>
          <div className="space-y-3">
            {metrics.tendencia_diaria.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm">{item.fecha}</span>
                  <div className="text-right">
                    <span className="text-white text-sm font-semibold">{item.count} análisis</span>
                    <p className="text-slate-500 text-xs">${item.costo.toFixed(3)}</p>
                  </div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (item.count / Math.max(...metrics.tendencia_diaria.map((d) => d.count))) * 100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cost Optimization Tips */}
      <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-6">
        <h3 className="text-blue-100 font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Optimización de Costos
        </h3>
        <div className="space-y-2 text-blue-200 text-sm">
          <p>
            • <strong>Costo promedio por análisis:</strong> $
            {metrics.total_analisis > 0
              ? (metrics.total_costo_usd / metrics.total_analisis).toFixed(4)
              : '0.0000'}{' '}
            USD
          </p>
          <p>
            • <strong>Tokens por análisis:</strong>{' '}
            {metrics.total_analisis > 0
              ? Math.round(metrics.total_tokens / metrics.total_analisis)
              : 0}{' '}
            tokens
          </p>
          <p>
            • <strong>Latencia promedio:</strong> {metrics.promedio_latencia_ms.toFixed(0)}ms -{' '}
            {metrics.promedio_latencia_ms < 2000
              ? 'Excelente'
              : metrics.promedio_latencia_ms < 5000
              ? 'Bueno'
              : 'Puede mejorar'}
          </p>
          <p className="mt-3 text-blue-300">
            💡 Considera usar modelos más eficientes para análisis simples y reservar modelos
            premium para tareas complejas.
          </p>
        </div>
      </div>
    </div>
  )
}
