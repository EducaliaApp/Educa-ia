'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface StatsChartProps {
  data: any[]
  type: 'line' | 'bar' | 'pie'
  dataKey?: string
  xAxisKey?: string
  title?: string
  height?: number
  colors?: string[]
}

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
        {label && <p className="text-slate-400 text-sm mb-1">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-white text-sm font-medium">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function StatsChart({
  data,
  type,
  dataKey = 'value',
  xAxisKey = 'name',
  title,
  height = 300,
  colors = DEFAULT_COLORS,
}: StatsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-slate-400 text-sm">No hay datos disponibles</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
      {title && <h3 className="text-white font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        {type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey={xAxisKey}
              stroke="#94A3B8"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#94A3B8" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={colors[0]}
              strokeWidth={2}
              dot={{ fill: colors[0], r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        ) : type === 'bar' ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey={xAxisKey}
              stroke="#94A3B8"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#94A3B8" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={dataKey} fill={colors[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(props: any) =>
                `${props.name}: ${((props.percent || 0) * 100).toFixed(0)}%`
              }
              outerRadius={100}
              fill="#8884d8"
              dataKey={dataKey}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
