// hooks/useAIAnalysis.ts

import { useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
// import { useToast } from '@/components/ui/use-toast'

export interface AnalysisResult {
  criterios_evaluados: CriterioEvaluado[]
  puntaje_estimado: number
  nivel_desempeño: string
  resumen: string
  recomendaciones_priorizadas: string[]
}

export interface CriterioEvaluado {
  nombre: string
  dominio_mbe: string
  estandar: number
  nivel: 'Destacado' | 'Competente' | 'Básico' | 'Insuficiente'
  justificacion: string
  fortalezas: string[]
  aspectos_mejorar: string[]
  sugerencias: string[]
}

export function useAIAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  // const { toast } = useToast()

  const analyzePlanificacion = useCallback(
    async (tareaId: string, contenido: any, modelo: string = 'gpt-4-turbo-preview') => {
      setIsAnalyzing(true)
      setError(null)

      try {
        // Llamar a Edge Function
        const { data: { session } } = await supabase.auth.getSession()
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analizar-planificacion`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
              tarea_id: tareaId,
              contenido_planificacion: contenido,
              modelo
            })
          }
        )

        if (!response.ok) {
          throw new Error('Error al analizar planificación')
        }

        const result = await response.json()
        
        setAnalysis(result.analisis)

        // toast({
        //   title: '✨ Análisis completado',
        //   description: `Tu planificación ha sido evaluada. Nivel estimado: ${result.analisis.nivel_desempeño}`,
        //   variant: 'default'
        // })

        return result.analisis
        
      } catch (err: any) {
        const errorMsg = err.message || 'Error al analizar'
        setError(errorMsg)

        // toast({
        //   title: 'Error en el análisis',
        //   description: errorMsg,
        //   variant: 'destructive'
        // })

        return null
      } finally {
        setIsAnalyzing(false)
      }
    },
    [supabase]
  )

  const reset = useCallback(() => {
    setAnalysis(null)
    setError(null)
  }, [])

  return {
    analyzePlanificacion,
    isAnalyzing,
    analysis,
    error,
    reset
  }
}