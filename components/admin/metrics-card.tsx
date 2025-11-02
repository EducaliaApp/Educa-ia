import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  iconColor?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}

const iconColorClasses = {
  blue: 'bg-blue-600/10 text-blue-600',
  green: 'bg-green-600/10 text-green-600',
  purple: 'bg-purple-600/10 text-purple-600',
  orange: 'bg-orange-600/10 text-orange-600',
  red: 'bg-red-600/10 text-red-600',
}

export function MetricsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  iconColor = 'blue',
}: MetricsCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-white text-3xl font-bold">{value}</h3>
            {trend && (
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-green-500' : 'text-red-500'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={cn('p-3 rounded-lg', iconColorClasses[iconColor])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}
