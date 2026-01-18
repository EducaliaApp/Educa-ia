'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, BarChart3, Settings, ArrowLeft, LogOut, ClipboardCheck, Briefcase, GraduationCap, Cpu, CreditCard, Shield, Database, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  group?: string
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Usuarios',
    href: '/admin/usuarios',
    icon: Users,
    group: 'usuarios',
  },
  {
    name: 'Roles',
    href: '/admin/roles',
    icon: Shield,
    group: 'usuarios',
  },
  {
    name: 'Planificaciones',
    href: '/admin/planificaciones',
    icon: FileText,
  },
  {
    name: 'Evaluaciones',
    href: '/admin/evaluaciones',
    icon: ClipboardCheck,
  },
  {
    name: 'Portafolios',
    href: '/admin/portafolios',
    icon: Briefcase,
  },
  {
    name: 'Planes',
    href: '/admin/planes',
    icon: CreditCard,
  },
  {
    name: 'Estadísticas MINEDUC',
    href: '/admin/mineduc',
    icon: GraduationCap,
    group: 'data_maestra',
  },
  {
    name: 'Objetivos Aprendizaje',
    href: '/admin/objetivos-aprendizaje',
    icon: BookOpen,
    group: 'data_maestra',
  },
  {
    name: 'ETL / Procesos',
    href: '/admin/etl',
    icon: Database,
    group: 'data_maestra',
  },
  {
    name: 'Métricas IA',
    href: '/admin/metricas-ia',
    icon: Cpu,
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    name: 'Sistema',
    href: '/admin/system',
    icon: Settings,
  },
]

interface AdminSidebarProps {
  readonly userName?: string
  readonly userEmail?: string
}

export function AdminSidebar({ userName, userEmail }: AdminSidebarProps) {
  const pathname = usePathname()

  // Group navigation items
  const groupedItems = navItems.reduce((acc, item) => {
    const group = item.group || 'main'
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {} as Record<string, NavItem[]>)

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon
    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        )}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{item.name}</span>
      </Link>
    )
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">PF</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">ProfeFlow</h1>
            <p className="text-slate-400 text-xs">Panel Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Main items (no group) */}
        {groupedItems.main?.map(renderNavItem)}
        
        {/* Usuarios group */}
        {groupedItems.usuarios && (
          <>
            <div className="pt-4 pb-2">
              <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Gestión de Usuarios
              </h3>
            </div>
            {groupedItems.usuarios.map(renderNavItem)}
          </>
        )}

        {/* Data Maestra group */}
        {groupedItems.data_maestra && (
          <>
            <div className="pt-4 pb-2">
              <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Data Maestra
              </h3>
            </div>
            {groupedItems.data_maestra.map(renderNavItem)}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        {/* User info */}
        {userName && (
          <div className="px-4 py-2 bg-slate-800 rounded-lg mb-2">
            <p className="text-white text-sm font-medium truncate">{userName}</p>
            <p className="text-slate-400 text-xs truncate">{userEmail}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              Admin
            </span>
          </div>
        )}

        {/* Back to app button */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors w-full"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Volver a app</span>
        </Link>
      </div>
    </aside>
  )
}
