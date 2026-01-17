import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const variantStyles = {
  default:
    'bg-slate-900/90 border border-slate-800 shadow-[0_25px_80px_rgba(2,6,23,0.45)] backdrop-blur-sm',
  muted:
    'bg-slate-900/70 border border-slate-800/80 shadow-[0_20px_60px_rgba(2,6,23,0.35)] backdrop-blur-sm',
  success:
    'bg-emerald-950/40 border border-emerald-500/30 shadow-[0_20px_60px_rgba(6,78,59,0.35)]',
  warning:
    'bg-amber-950/30 border border-amber-500/30 shadow-[0_20px_60px_rgba(120,53,15,0.35)]',
  danger:
    'bg-rose-950/30 border border-rose-500/30 shadow-[0_20px_60px_rgba(136,19,55,0.35)]',
}

type Variant = keyof typeof variantStyles

type Padding = 'none' | 'xs' | 'sm' | 'md' | 'lg'

const paddingMap: Record<Padding, string> = {
  none: '',
  xs: 'p-3',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

interface AdminSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  padding?: Padding
  interactive?: boolean
}

export function AdminSurface({
  variant = 'default',
  padding = 'md',
  interactive = false,
  className,
  ...props
}: AdminSurfaceProps) {
  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-200',
        variantStyles[variant],
        paddingMap[padding],
        interactive && 'hover:border-slate-600 hover:bg-slate-900/95 hover:shadow-[0_30px_90px_rgba(2,6,23,0.55)]',
        className
      )}
      {...props}
    />
  )
}
