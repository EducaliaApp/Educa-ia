// components/portafolio/PortafolioCard.tsx
'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { BookOpen, Calendar, TrendingUp } from 'lucide-react'

interface PortafolioCardProps {
  id: string
  año_evaluacion: number
  asignatura: string
  nivel_educativo: string
  estado: string
  progreso_porcentaje: number
  puntaje_estimado_ia?: number
  categoria_logro?: string
  created_at: string
}

export function PortafolioCard({
  id,
  año_evaluacion,
  asignatura,
  nivel_educativo,
  estado,
  progreso_porcentaje,
  puntaje_estimado_ia,
  categoria_logro,
  created_at
}: PortafolioCardProps) {
  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      borrador: 'bg-gray-500',
      en_revision: 'bg-yellow-500',
      completado: 'bg-green-500',
      enviado: 'bg-blue-500',
    }
    return colors[estado] || 'bg-gray-500'
  }

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      borrador: 'Borrador',
      en_revision: 'En Revisión',
      completado: 'Completado',
      enviado: 'Enviado',
    }
    return labels[estado] || estado
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Portafolio {año_evaluacion}
            </h3>
            <p className="text-sm text-gray-600">{asignatura}</p>
            <p className="text-xs text-gray-500">{nivel_educativo}</p>
          </div>
          <Badge className={getEstadoColor(estado)}>
            {getEstadoLabel(estado)}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Progreso</span>
            <span className="font-medium">{progreso_porcentaje}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progreso_porcentaje}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center text-gray-400 mb-1">
              <Calendar className="h-4 w-4" />
            </div>
            <p className="text-xs text-gray-500">Creado</p>
            <p className="text-sm font-medium">
              {new Date(created_at).toLocaleDateString('es-CL', {
                day: '2-digit',
                month: 'short',
              })}
            </p>
          </div>

          {puntaje_estimado_ia && (
            <div className="text-center">
              <div className="flex items-center justify-center text-gray-400 mb-1">
                <TrendingUp className="h-4 w-4" />
              </div>
              <p className="text-xs text-gray-500">Puntaje LIA</p>
              <p className="text-sm font-medium">{puntaje_estimado_ia.toFixed(1)}/4.0</p>
            </div>
          )}

          {categoria_logro && (
            <div className="text-center">
              <div className="flex items-center justify-center text-gray-400 mb-1">
                <BookOpen className="h-4 w-4" />
              </div>
              <p className="text-xs text-gray-500">Categoría</p>
              <p className="text-sm font-medium">{categoria_logro}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link href={`/dashboard/portafolio/${id}`} className="flex-1">
            <Button className="w-full" variant="outline">
              Ver Detalles
            </Button>
          </Link>
          <Link href={`/dashboard/portafolio/${id}/editar`}>
            <Button>
              Editar
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}
