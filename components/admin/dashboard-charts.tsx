'use client'

import { StatsChart } from '@/components/admin/stats-chart'

interface DashboardChartsProps {
  chartData: Array<{ name: string; value: number }>
  freeUsers: number
  proUsers: number
  totalUsers: number
}

export function DashboardCharts({ chartData, freeUsers, proUsers, totalUsers }: DashboardChartsProps) {
  return (
    <>
      {/* Planificaciones Chart */}
      <StatsChart
        data={chartData}
        type="line"
        dataKey="value"
        xAxisKey="name"
        title="Planificaciones - Últimos 7 días"
        height={300}
      />

      {/* User Distribution */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h3 className="text-white font-semibold mb-4">Distribución de Usuarios</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-slate-400">Usuarios FREE</span>
            </div>
            <span className="text-white font-semibold">{freeUsers}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              <span className="text-slate-400">Usuarios PRO</span>
            </div>
            <span className="text-white font-semibold">{proUsers}</span>
          </div>
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Total</span>
              <span className="text-white font-bold text-lg">{totalUsers}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
