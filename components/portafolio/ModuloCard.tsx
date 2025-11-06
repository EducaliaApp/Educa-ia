// components/portafolio/ModuloCard.tsx
'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Circle, Clock } from 'lucide-react'

interface Tarea {
  id: string
  numero_tarea: number
  nombre_tarea: string
  completado: boolean
}

interface ModuloCardProps {
  id: string
  portafolioId: string
  numero_modulo: number
  completado: boolean
  progreso_porcentaje: number
  tareas?: Tarea[]
}

export function ModuloCard({
  id,
  portafolioId,
  numero_modulo,
  completado,
  progreso_porcentaje,
  tareas = []
}: ModuloCardProps) {
  const getModuloTitulo = (numero: number) => {
    const titulos: Record<number, string> = {
      1: 'Planificación, Evaluación y Reflexión',
      2: 'Clase Grabada',
      3: 'Trabajo Colaborativo',
    }
    return titulos[numero] || `Módulo ${numero}`
  }

  const getModuloDescripcion = (numero: number) => {
    const descripciones: Record<number, string> = {
      1: 'Planifica una unidad, diseña evaluación y reflexiona sobre tu práctica',
      2: 'Graba y analiza una clase de 40-45 minutos',
      3: 'Documenta y reflexiona sobre trabajo colaborativo con colegas',
    }
    return descripciones[numero] || ''
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Módulo {numero_modulo}
              </h3>
              {completado ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-600" />
              )}
            </div>
            <p className="text-base font-medium text-gray-700 mb-1">
              {getModuloTitulo(numero_modulo)}
            </p>
            <p className="text-sm text-gray-600">
              {getModuloDescripcion(numero_modulo)}
            </p>
          </div>
          <Badge className={completado ? 'bg-green-600' : 'bg-yellow-600'}>
            {completado ? 'Completado' : 'En Progreso'}
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

        {/* Tareas */}
        {tareas.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Tareas:</p>
            <div className="space-y-1">
              {tareas.map((tarea) => (
                <div
                  key={tarea.id}
                  className="flex items-center gap-2 text-sm"
                >
                  {tarea.completado ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className={tarea.completado ? 'text-gray-600' : 'text-gray-900'}>
                    Tarea {tarea.numero_tarea}: {tarea.nombre_tarea}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/dashboard/portafolio/${portafolioId}/modulo/${numero_modulo}`}
            className="flex-1"
          >
            <Button className="w-full" variant="outline">
              Ver Módulo
            </Button>
          </Link>
          {!completado && (
            <Link
              href={`/dashboard/portafolio/${portafolioId}/modulo/${numero_modulo}/editar`}
            >
              <Button>
                Continuar
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  )
}
