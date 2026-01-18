'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { Crown, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import Button from './ui/Button'
import { createClient } from '@/lib/supabase/client'
import { isMissingSupabaseEnvError } from '@/lib/supabase/config'
import type { Profile } from '@/lib/supabase/types'

interface MobileSidebarProps {
  profile: Profile
  navigation: Array<{
    name: string
    icon: LucideIcon
    href?: string
    isEnabled: boolean
    items?: Array<{
      name: string
      icon: LucideIcon
      href?: string
      disabled?: boolean
      children?: Array<{
        name: string
        icon: LucideIcon
        href?: string
        disabled?: boolean
      }>
    }>
  }>
  onClose?: () => void
}

/**
 * Sidebar optimizada para móvil
 * Versión simplificada sin scroll interno, lista vertical
 */
export default function MobileSidebar({ profile, navigation, onClose }: Readonly<MobileSidebarProps>) {
  const pathname = usePathname()
  const router = useRouter()

  const matchesPath = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      onClose?.()
      router.push('/login')
      router.refresh()
    } catch (error) {
      if (isMissingSupabaseEnvError(error)) {
        console.error('No se puede cerrar sesión sin configurar Supabase.')
      } else {
        console.error('Error al cerrar sesión:', error)
      }
    }
  }

  const isPro = profile.plan === 'pro'
  const creditosUsados = profile.creditos_usados_planificaciones
  const creditosTotal = isPro ? '∞' : profile.creditos_planificaciones

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
          <h1 className="text-xl font-bold text-gray-900">
            Profe<span className="text-primary">Flow</span>
          </h1>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {navigation.map((section) => {
          if (!section.isEnabled) {
            return null
          }

          const hasItems = Boolean(section.items?.length)
          const sectionIsActive = section.href ? matchesPath(section.href) : false

          if (!hasItems && section.href) {
            return (
              <Link
                key={section.name}
                href={section.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-base',
                  'min-h-touch', // Touch target
                  sectionIsActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <section.icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{section.name}</span>
              </Link>
            )
          }

          return (
            <div key={section.name} className="space-y-1">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <section.icon className="h-4 w-4" />
                <span>{section.name}</span>
              </div>
              {section.items?.map((item) => {
                const isActive = item.href ? matchesPath(item.href) : false
                
                if (item.disabled) {
                  return (
                    <div
                      key={item.name}
                      className="flex items-center gap-3 px-6 py-2 text-sm text-gray-400 cursor-not-allowed"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </div>
                  )
                }

                if (!item.href) {
                  return (
                    <div key={item.name} className="px-6 py-2 text-sm text-gray-500">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </div>
                      {item.children?.map((child) => (
                        <div
                          key={child.name}
                          className={cn(
                            'flex items-center gap-3 pl-7 py-2 mt-1 text-sm',
                            child.disabled ? 'text-gray-400' : 'text-gray-600'
                          )}
                        >
                          <child.icon className="h-3 w-3" />
                          <span>{child.name}</span>
                        </div>
                      ))}
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-6 py-2.5 rounded-lg text-sm transition-colors',
                      'min-h-touch', // Touch target
                      isActive
                        ? 'bg-primary text-white font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Plan Info - Compacta para móvil */}
      <div className="p-3 border-t border-gray-200 space-y-3">
        <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            {isPro && <Crown className="h-4 w-4 text-yellow-500" />}
            <span className="text-sm font-semibold text-gray-900">
              Plan {isPro ? 'PRO' : 'FREE'}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-gray-600">Créditos usados</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-gray-900">{creditosUsados}</span>
              <span className="text-sm text-gray-500">/ {creditosTotal}</span>
            </div>
          </div>

          {!isPro && (
            <Link href="/upgrade" onClick={onClose}>
              <Button variant="primary" size="sm" className="w-full mt-2">
                <Crown className="h-3 w-3 mr-1" />
                Upgrade a PRO
              </Button>
            </Link>
          )}
        </div>

        {/* User info */}
        <div className="flex items-center justify-between py-2 border-t border-gray-200">
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
            className="ml-2 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 min-h-touch min-w-touch"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
