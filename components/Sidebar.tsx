'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  Home,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Briefcase,
  Heart,
  FilePlus,
  Files,
  CheckCircle2,
  BarChart3,
  FolderOpen,
  Target,
  Award,
  Medal,
  Upload,
  ShieldCheck,
  Settings,
  BookmarkCheck,
  MessageCircle,
  Users,
  CalendarDays,
  ListChecks,
  Crown,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Button from './ui/Button'
import { createClient } from '@/lib/supabase/client'
import { isMissingSupabaseEnvError } from '@/lib/supabase/config'
import type { Profile } from '@/lib/supabase/types'
import type { RoadmapCategoryFlags } from '@/lib/flags/types'

interface SidebarProps {
  profile: Profile
  flags: RoadmapCategoryFlags
}

interface NavigationLink {
  name: string
  icon: LucideIcon
  href?: string
  disabled?: boolean
  children?: NavigationLink[]
}

interface NavigationSection {
  name: string
  icon: LucideIcon
  href?: string
  isEnabled: boolean
  items?: NavigationLink[]
}

const buildNavigation = (
  flags: RoadmapCategoryFlags,
): NavigationSection[] => [
  {
    name: 'Inicio',
    icon: Home,
    href: '/dashboard',
    isEnabled: flags.menuItemInicio,
  },
  {
    name: 'Planifica',
    icon: BookOpen,
    isEnabled: flags.menuItemPlanifica,
    items: [
      {
        name: 'Crear Planificación',
        href: '/dashboard/planificaciones/nueva',
        icon: FilePlus,
      },
      {
        name: 'Mis Planificaciones',
        href: '/dashboard/planificaciones',
        icon: Files,
      },
    ],
  },
  {
    name: 'Evalúa',
    icon: ClipboardList,
    isEnabled: flags.menuItemEvalua,
    items: [
      {
        name: 'Crear Evaluaciones',
        href: '/dashboard/evaluaciones/nueva',
        icon: FilePlus,
      },
      {
        name: 'Corregir y Retroalimentar',
        href: '/dashboard/evaluaciones',
        icon: CheckCircle2,
      },
      {
        name: 'Análisis de Resultados',
        icon: BarChart3,
        disabled: true,
      },
    ],
  },
  {
    name: 'Mi Carrera',
    icon: GraduationCap,
    isEnabled: flags.menuItemMiCarrera,
    items: [
      {
        name: 'Portafolio Docente',
        icon: FolderOpen,
        disabled: true,
      },
      {
        name: 'Evaluación Docente',
        icon: Target,
        disabled: true,
      },
      {
        name: 'Mis Certificados',
        icon: Award,
        children: [
          {
            name: 'Obtenidos',
            icon: Medal,
            disabled: true,
          },
          {
            name: 'Cargados',
            icon: Upload,
            disabled: true,
          },
          {
            name: 'Verificar Certificados',
            icon: ShieldCheck,
            disabled: true,
          },
        ],
      },
      {
        name: 'Mi Perfil de Competencias',
        icon: BarChart3,
        disabled: true,
      },
      {
        name: 'Configuración de Cuenta',
        href: '/dashboard/settings',
        icon: Settings,
      },
    ],
  },
  {
    name: 'Empleo',
    icon: Briefcase,
    isEnabled: flags.menuItemEmpleo,
    items: [
      {
        name: 'Empleos para ti',
        icon: Briefcase,
        disabled: true,
      },
      {
        name: 'Mis Postulaciones',
        icon: ListChecks,
        disabled: true,
      },
      {
        name: 'Siguiendo',
        icon: BookmarkCheck,
        disabled: true,
      },
      {
        name: 'Eventos',
        icon: CalendarDays,
        disabled: true,
      },
    ],
  },
  {
    name: 'Salud',
    icon: Heart,
    isEnabled: flags.menuItemSalud,
    items: [
      {
        name: '¿Necesitas Charlar?',
        icon: MessageCircle,
        disabled: true,
      },
      {
        name: 'Profesionales de salud',
        icon: Users,
        disabled: true,
      },
      {
        name: 'Eventos',
        icon: CalendarDays,
        disabled: true,
      },
    ],
  },
]

export default function Sidebar({ profile, flags }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const navigation = buildNavigation(flags)

  const matchesPath = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  const isLinkActive = (link: NavigationLink): boolean => {
    if (!link.disabled && link.href && matchesPath(link.href)) {
      return true
    }

    if (link.children) {
      return link.children.some(isLinkActive)
    }

    return false
  }

  const renderLinks = (links: NavigationLink[], depth = 0) =>
    links.map((link) => {
      const linkIsActive = isLinkActive(link)
      const hasChildren = Boolean(link.children?.length)
      const isInteractive = Boolean(link.href) && !link.disabled
      const paddingClasses = depth === 0 ? 'pl-11 pr-3' : 'pl-16 pr-3'
      const stateClasses = link.disabled
        ? 'text-gray-400 cursor-not-allowed'
        : linkIsActive
        ? 'bg-primary text-white'
        : isInteractive
        ? 'text-gray-600 hover:bg-gray-100'
        : 'text-gray-500'
      const interactiveClasses = isInteractive ? 'transition-colors' : ''

      const content = link.href && !link.disabled ? (
        <Link
          href={link.href}
          className={cn(
            'flex items-center gap-3 py-2 rounded-lg text-sm font-medium',
            paddingClasses,
            interactiveClasses,
            stateClasses
          )}
        >
          <link.icon className="h-4 w-4" />
          <span>{link.name}</span>
        </Link>
      ) : (
        <div
          className={cn(
            'flex items-center gap-3 py-2 rounded-lg text-sm font-medium',
            paddingClasses,
            interactiveClasses,
            stateClasses
          )}
        >
          <link.icon className="h-4 w-4" />
          <span>{link.name}</span>
        </div>
      )

      return (
        <div key={link.name} className="space-y-1">
          {content}
          {hasChildren && (
            <div className="space-y-1">{renderLinks(link.children!, depth + 1)}</div>
          )}
        </div>
      )
    })

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
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
      <nav className="flex-1 px-4 py-2 space-y-4 overflow-y-auto">
        {navigation.map((section) => {
          if (!section.isEnabled) {
            return null
          }

          const hasItems = Boolean(section.items?.length)
          const sectionIsActive = hasItems
            ? section.items!.some(isLinkActive)
            : section.href
            ? matchesPath(section.href)
            : false

          if (!hasItems && section.href) {
            return (
              <Link
                key={section.name}
                href={section.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-100',
                  sectionIsActive && 'bg-primary text-white'
                )}
              >
                <section.icon className="h-5 w-5" />
                <span className="font-medium">{section.name}</span>
              </Link>
            )
          }

          return (
            <div key={section.name} className="space-y-2">
              <div
                className={cn(
                  'flex items-center gap-3 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500',
                  sectionIsActive && 'text-primary'
                )}
              >
                <section.icon className="h-4 w-4" />
                <span>{section.name}</span>
              </div>
              {section.items && <div className="space-y-1">{renderLinks(section.items)}</div>}
            </div>
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
