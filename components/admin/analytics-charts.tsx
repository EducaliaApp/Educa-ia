'use client'

import { StatsChart } from '@/components/admin/stats-chart'

interface AnalyticsChartsProps {
  userGrowthData: Array<{ name: string; value: number }>
  subjectData: Array<{ name: string; value: number }>
  nivelData: Array<{ name: string; value: number }>
}

export function AnalyticsCharts({ userGrowthData, subjectData, nivelData }: Readonly<AnalyticsChartsProps>) {
  return (
    <>
      {/* User Growth Chart */}
      <div>
        <StatsChart
          data={userGrowthData}
          type="line"
          dataKey="value"
          xAxisKey="name"
          title="Crecimiento de Usuarios - Últimos 30 días"
          height={300}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Planificaciones by Subject - Pie Chart */}
        <StatsChart
          data={subjectData}
          type="pie"
          dataKey="value"
          xAxisKey="name"
          title="Planificaciones por Asignatura"
          height={350}
        />

        {/* Planificaciones by Nivel - Bar Chart */}
        <StatsChart
          data={nivelData}
          type="bar"
          dataKey="value"
          xAxisKey="name"
          title="Planificaciones por Nivel"
          height={350}
        />
      </div>
    </>
  )
}
