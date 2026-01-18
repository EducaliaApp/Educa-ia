'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/supabase/types'
import type { RoadmapCategoryFlags } from '@/lib/flags/types'
import { MobileMenuButton } from './ui/MobileMenuButton'
import { MobileDrawer } from './ui/MobileDrawer'
import MobileSidebar from './MobileSidebar'
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
  Shield,
} from 'lucide-react'

interface DashboardLayoutClientProps {
  profile: Profile
  flags: RoadmapCategoryFlags
  children: React.ReactNode
}

/**
 * Client component para manejar la navegación móvil
 * Envuelve el layout del dashboard con el menú móvil
 */
export default function DashboardLayoutClient({
  profile,
  flags,
  children,
}: DashboardLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Construir navegación (igual que en Sidebar.tsx)
  const isAdmin = profile.role === 'admin'
  
  const navigation = [
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
          href: '/dashboard/portafolio',
          icon: FolderOpen,
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

  // Agregar administración si es admin
  if (isAdmin) {
    navigation.push({
      name: 'Administración',
      icon: Shield,
      href: '/admin',
      isEnabled: true,
    })
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Mobile header with menu button */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 h-14 flex items-center px-4">
          <MobileMenuButton onToggle={setMobileMenuOpen} />
          <h1 className="ml-3 text-lg font-bold text-gray-900">
            Profe<span className="text-primary">Flow</span>
          </h1>
        </div>

        {/* Mobile padding for fixed header */}
        <div className="md:hidden h-14 w-full" />

        {children}
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="Menú"
      >
        <MobileSidebar
          profile={profile}
          navigation={navigation}
          onClose={() => setMobileMenuOpen(false)}
        />
      </MobileDrawer>
    </>
  )
}
