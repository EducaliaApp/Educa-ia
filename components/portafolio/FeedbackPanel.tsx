// components/portafolio/FeedbackPanel.tsx
'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  AlertCircle,
  TrendingUp,
  Clock,
  Target,
  CheckCircle2,
  ArrowRight,
  Zap
} from 'lucide-react'

interface Recomendacion {
  indicador: string
  nivel_actual: string
  nivel_objetivo: string
  prioridad: 'alta' | 'media' | 'baja'
  impacto_puntos: number
  tiempo_horas: number
  accion: string
  razon: string
  pasos?: string[]
}

interface FeedbackPanelProps {
  recomendaciones: Recomendacion[]
  puntajeActual: number
  puntajeObjetivo?: number
  onSelectRecomendacion?: (recomendacion: Recomendacion) => void
}

export function FeedbackPanel({
  recomendaciones,
  puntajeActual,
  puntajeObjetivo = 4.0,
  onSelectRecomendacion
}: FeedbackPanelProps) {

  const getPrioridadColor = (prioridad: string) => {
    const colores: Record<string, string> = {
      'alta': 'border-red-500 bg-red-50',
      'media': 'border-yellow-500 bg-yellow-50',
      'baja': 'border-blue-500 bg-blue-50'
    }
    return colores[prioridad] || 'border-gray-500 bg-gray-50'
  }

  const getPrioridadBadgeColor = (prioridad: string) => {
    const colores: Record<string, string> = {
      'alta': 'bg-red-600',
      'media': 'bg-yellow-600',
      'baja': 'bg-blue-600'
    }
    return colores[prioridad] || 'bg-gray-600'
  }

  const recomendacionesOrdenadas = [...recomendaciones].sort((a, b) => {
    const prioridadOrden: Record<string, number> = { alta: 3, media: 2, baja: 1 }
    if (prioridadOrden[a.prioridad] !== prioridadOrden[b.prioridad]) {
      return prioridadOrden[b.prioridad] - prioridadOrden[a.prioridad]
    }
    return b.impacto_puntos - a.impacto_puntos
  })

  const mejoraPotencial = recomendaciones.reduce(
    (sum, rec) => sum + rec.impacto_puntos,
    0
  )

  return (
    <div className="space-y-6">
      {/* Header - Resumen de Mejora Potencial */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-bold">Plan de Mejora Personalizado</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Puntaje Actual</p>
              <p className="text-3xl font-bold text-gray-900">{puntajeActual.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Mejora Potencial</p>
              <p className="text-3xl font-bold text-green-600">+{mejoraPotencial.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Puntaje Proyectado</p>
              <p className="text-3xl font-bold text-blue-600">
                {Math.min(puntajeActual + mejoraPotencial, 4.0).toFixed(1)}
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-white rounded-lg">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Progreso hacia el objetivo</span>
              <span className="font-medium">
                {((puntajeActual / puntajeObjetivo) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all"
                style={{ width: `${Math.min((puntajeActual / puntajeObjetivo) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Recomendaciones Priorizadas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">
            Recomendaciones Priorizadas ({recomendaciones.length})
          </h3>
          <div className="flex gap-2">
            <Badge className="bg-red-600">
              {recomendaciones.filter(r => r.prioridad === 'alta').length} Alta
            </Badge>
            <Badge className="bg-yellow-600">
              {recomendaciones.filter(r => r.prioridad === 'media').length} Media
            </Badge>
            <Badge className="bg-blue-600">
              {recomendaciones.filter(r => r.prioridad === 'baja').length} Baja
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          {recomendacionesOrdenadas.map((recomendacion, idx) => (
            <Card
              key={idx}
              className={`border-l-4 ${getPrioridadColor(recomendacion.prioridad)} hover:shadow-lg transition-all cursor-pointer`}
              onClick={() => onSelectRecomendacion?.(recomendacion)}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getPrioridadBadgeColor(recomendacion.prioridad)}>
                        Prioridad {recomendacion.prioridad.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-600">#{idx + 1}</span>
                    </div>
                    <h4 className="font-semibold text-lg mb-1">{recomendacion.indicador}</h4>
                    <p className="text-sm text-gray-700">{recomendacion.accion}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="flex items-center gap-1 text-green-600 mb-1">
                      <TrendingUp className="h-5 w-5" />
                      <span className="text-2xl font-bold">
                        +{recomendacion.impacto_puntos.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">puntos</p>
                  </div>
                </div>

                {/* Transición de Nivel */}
                <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-lg">
                  <Badge className="bg-gray-600">
                    {recomendacion.nivel_actual}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <Badge className="bg-green-600">
                    {recomendacion.nivel_objetivo}
                  </Badge>
                  <div className="flex-1 text-right">
                    <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>~{recomendacion.tiempo_horas}h de trabajo</span>
                    </div>
                  </div>
                </div>

                {/* Razón */}
                <div className="mb-4 p-3 bg-white rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    ¿Por qué es importante?
                  </p>
                  <p className="text-sm text-gray-600">{recomendacion.razon}</p>
                </div>

                {/* Pasos de Acción */}
                {recomendacion.pasos && recomendacion.pasos.length > 0 && (
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Pasos sugeridos:
                    </p>
                    <ol className="space-y-2">
                      {recomendacion.pasos.map((paso, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                            {pIdx + 1}
                          </span>
                          <span>{paso}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Action Button */}
                {onSelectRecomendacion && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectRecomendacion(recomendacion)
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Trabajar en esta mejora
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Tip Final */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-2">
                💡 Consejo ProfeFlow
              </p>
              <p className="text-sm text-blue-800">
                Enfócate primero en las recomendaciones de <strong>Prioridad Alta</strong> para maximizar
                el impacto de tu esfuerzo. Cada mejora suma hacia tu objetivo de {puntajeObjetivo.toFixed(1)} puntos.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
