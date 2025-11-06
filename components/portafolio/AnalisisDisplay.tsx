// components/portafolio/AnalisisDisplay.tsx
'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  Target,
  Sparkles
} from 'lucide-react'

interface EvaluacionIndicador {
  id: string
  indicador_id: string
  nombre_indicador: string
  nivel_alcanzado: 'Destacado' | 'Competente' | 'Básico' | 'Insatisfactorio'
  puntaje: number
  confianza?: number
  condiciones_cumplidas: number
  condiciones_totales: number
  evidencias_textuales: string[]
  justificacion: string
  para_siguiente_nivel?: string
  acciones_concretas: string[]
}

interface AnalisisDisplayProps {
  analisis: {
    id: string
    puntaje_estimado: number
    categoria_logro: string
    nivel_desempeño: string
    modelo_usado: string
    prompt_tokens: number
    completion_tokens: number
    costo_usd: number
    latencia_ms: number
    created_at: string
  }
  evaluaciones: EvaluacionIndicador[]
  showMetadata?: boolean
}

export function AnalisisDisplay({
  analisis,
  evaluaciones,
  showMetadata = true
}: AnalisisDisplayProps) {

  const getNivelColor = (nivel: string) => {
    const colores: Record<string, string> = {
      'Destacado': 'bg-green-600 text-white',
      'Competente': 'bg-blue-600 text-white',
      'Básico': 'bg-yellow-600 text-white',
      'Insatisfactorio': 'bg-red-600 text-white'
    }
    return colores[nivel] || 'bg-gray-600 text-white'
  }

  const getCategoriaLabel = (categoria: string) => {
    const labels: Record<string, string> = {
      'A': 'Destacado',
      'B': 'Competente Alto',
      'C': 'Competente',
      'D': 'Básico',
      'E': 'Insuficiente'
    }
    return labels[categoria] || categoria
  }

  return (
    <div className="space-y-6">
      {/* Header - Resumen General */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-bold">Análisis IA - Resultados</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Puntaje */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Puntaje Estimado</p>
              <div className="text-4xl font-bold text-blue-600">
                {analisis.puntaje_estimado.toFixed(1)}
              </div>
              <p className="text-sm text-gray-500">/4.0</p>
            </div>

            {/* Categoría */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Categoría de Logro</p>
              <Badge className="text-lg px-4 py-2 bg-blue-600">
                {getCategoriaLabel(analisis.categoria_logro)}
              </Badge>
            </div>

            {/* Nivel */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Nivel Predominante</p>
              <Badge className={`text-lg px-4 py-2 ${getNivelColor(analisis.nivel_desempeño)}`}>
                {analisis.nivel_desempeño}
              </Badge>
            </div>

            {/* Indicadores */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Indicadores Evaluados</p>
              <div className="text-4xl font-bold text-gray-900">
                {evaluaciones.length}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Evaluaciones por Indicador */}
      <div>
        <h3 className="text-xl font-bold mb-4">Evaluación por Indicador MBE</h3>
        <div className="space-y-4">
          {evaluaciones.map((evaluacion) => (
            <Card key={evaluacion.id} className="hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header del Indicador */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-lg">{evaluacion.nombre_indicador}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>
                        {evaluacion.condiciones_cumplidas} de {evaluacion.condiciones_totales} condiciones cumplidas
                      </span>
                      {evaluacion.confianza && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Confianza: {(evaluacion.confianza * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getNivelColor(evaluacion.nivel_alcanzado)}>
                      {evaluacion.nivel_alcanzado}
                    </Badge>
                    <p className="text-3xl font-bold mt-2 text-gray-900">
                      {evaluacion.puntaje.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-500">/4.0</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        evaluacion.nivel_alcanzado === 'Destacado' ? 'bg-green-600' :
                        evaluacion.nivel_alcanzado === 'Competente' ? 'bg-blue-600' :
                        evaluacion.nivel_alcanzado === 'Básico' ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}
                      style={{
                        width: `${(evaluacion.condiciones_cumplidas / evaluacion.condiciones_totales) * 100}%`
                      }}
                    />
                  </div>
                </div>

                {/* Justificación */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Justificación:</p>
                  <p className="text-sm text-gray-800">{evaluacion.justificacion}</p>
                </div>

                {/* Evidencias */}
                {evaluacion.evidencias_textuales.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Evidencias Encontradas:
                    </p>
                    <div className="space-y-2">
                      {evaluacion.evidencias_textuales.slice(0, 3).map((evidencia, idx) => (
                        <div
                          key={idx}
                          className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r"
                        >
                          <p className="text-sm text-gray-700 italic">
                            "{evidencia.substring(0, 200)}{evidencia.length > 200 ? '...' : ''}"
                          </p>
                        </div>
                      ))}
                      {evaluacion.evidencias_textuales.length > 3 && (
                        <p className="text-xs text-gray-500 pl-3">
                          +{evaluacion.evidencias_textuales.length - 3} evidencias más
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Para Siguiente Nivel */}
                {evaluacion.para_siguiente_nivel && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
                    <p className="text-sm font-medium text-yellow-900 mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Para alcanzar el siguiente nivel:
                    </p>
                    <p className="text-sm text-yellow-800">{evaluacion.para_siguiente_nivel}</p>
                  </div>
                )}

                {/* Acciones Concretas */}
                {evaluacion.acciones_concretas.length > 0 && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4">
                    <p className="text-sm font-medium text-green-900 mb-2">
                      Acciones Recomendadas:
                    </p>
                    <ul className="space-y-2">
                      {evaluacion.acciones_concretas.map((accion, idx) => (
                        <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{accion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Metadata */}
      {showMetadata && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Información del Análisis</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Modelo IA</p>
                <p className="font-medium">{analisis.modelo_usado}</p>
              </div>
              <div>
                <p className="text-gray-600">Tokens Usados</p>
                <p className="font-medium">{analisis.prompt_tokens + analisis.completion_tokens}</p>
              </div>
              <div>
                <p className="text-gray-600">Tiempo</p>
                <p className="font-medium">{(analisis.latencia_ms / 1000).toFixed(1)}s</p>
              </div>
              <div>
                <p className="text-gray-600">Costo</p>
                <p className="font-medium">${analisis.costo_usd.toFixed(4)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500">
                Análisis realizado el {new Date(analisis.created_at).toLocaleString('es-CL')}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
