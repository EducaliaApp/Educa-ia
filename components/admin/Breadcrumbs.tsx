'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

const routeNames: { [key: string]: string } = {
  admin: 'Dashboard',
  usuarios: 'Usuarios',
  planificaciones: 'Planificaciones',
  evaluaciones: 'Evaluaciones',
  portafolios: 'Portafolios',
  mineduc: 'MINEDUC',
  'metricas-ia': 'Métricas IA',
  analytics: 'Analytics',
  system: 'Sistema',
  'rag-validation': 'Validación RAG',
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  // Build breadcrumb items
  const breadcrumbs = segments.map((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/')
    const name = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    const isLast = index === segments.length - 1

    return {
      name,
      path,
      isLast,
    }
  })

  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <nav className="flex items-center space-x-2 text-sm mb-6">
      <Link
        href="/admin"
        className="flex items-center text-slate-400 hover:text-white transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>

      {breadcrumbs.map((breadcrumb, index) => (
        <div key={breadcrumb.path} className="flex items-center">
          <ChevronRight className="w-4 h-4 text-slate-600 mx-1" />
          {breadcrumb.isLast ? (
            <span className="text-white font-medium">{breadcrumb.name}</span>
          ) : (
            <Link
              href={breadcrumb.path}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {breadcrumb.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
