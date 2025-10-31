'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, ClipboardCheck, Settings, Crown, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import Button from './ui/Button'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'

interface SidebarProps {
  profile: Profile
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Planificaciones', href: '/dashboard/planificaciones', icon: FileText },
  { name: 'Evaluaciones', href: '/dashboard/evaluaciones', icon: ClipboardCheck },
  { name: 'Mi Cuenta', href: '/dashboard/settings', icon: Settings },
]

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isPro = profile.plan === 'pro'
  const creditosUsados = profile.creditos_usados_planificaciones
  const creditosTotal = isPro ? '∞' : profile.creditos_planificaciones

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Profe<span className="text-primary">Flow</span>
          </h1>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Plan Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            {isPro ? (
              <Crown className="h-5 w-5 text-yellow-500" />
            ) : (
              <div className="h-5 w-5" />
            )}
            <span className="font-semibold text-gray-900">
              Plan {isPro ? 'PRO' : 'FREE'}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Créditos usados este mes
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{creditosUsados}</span>
              <span className="text-gray-500">/ {creditosTotal}</span>
            </div>
          </div>

          {!isPro && (
            <Link href="/upgrade">
              <Button variant="primary" size="sm" className="w-full">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade a PRO
              </Button>
            </Link>
          )}
        </div>

        {/* User info and logout */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile.nombre || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {profile.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="ml-3 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
