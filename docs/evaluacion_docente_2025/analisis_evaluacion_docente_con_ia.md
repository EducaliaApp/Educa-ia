# 🎯 MANUAL: SISTEMA DE ANÁLISIS DE PORTAFOLIO CON LIA

## 📑 TABLA DE CONTENIDOS

1. [Introducción](#introducción-2)
2. [Arquitectura del Sistema](#arquitectura-2)
3. [Instalación](#instalación-2)
4. [Uso de las Functions](#uso-functions)
5. [Flujos de Trabajo](#flujos-trabajo)
6. [Ejemplos de Integración](#ejemplos-integración)
7. [Optimización y Costos](#optimización-costos)
8. [Monitoreo y Logs](#monitoreo-logs)

---

## 1. INTRODUCCIÓN {#introducción-2}

### ¿Qué hace este sistema?

El **Sistema de Análisis de Portafolio con LIA** evalúa automáticamente cada tarea del portafolio docente usando:

- **Rúbricas oficiales MINEDUC 2025**
- **Motor de evaluación con LIA** (Claude Sonnet 4 / GPT-4)
- **Verificación rigurosa** de condiciones
- **Feedback accionable** con evidencias

### Componentes
```
┌─────────────────────────────────────────────┐
│     SISTEMA DE ANÁLISIS CON LIA              │
└─────────────────────────────────────────────┘
        │
        ├─ Edge Functions (Supabase)
        │   ├─ analizar-modulo1-tarea1
        │   ├─ analizar-modulo1-tarea2
        │   ├─ analizar-modulo1-tarea3
        │   ├─ analizar-modulo2-clase-grabada
        │   ├─ analizar-modulo3-trabajo-colaborativo
        │   └─ analizar-portafolio-completo
        │
        ├─ Motor de Rúbricas (TypeScript)
        │   ├─ Carga rúbricas desde BD
        │   ├─ Verifica condiciones
        │   └─ Calcula puntajes
        │
        ├─ Evaluador LIA (TypeScript)
        │   ├─ Claude Sonnet 4
        │   ├─ GPT-4 Turbo
        │   └─ Prompts especializados
        │
        └─ Base de Datos (PostgreSQL)
            ├─ rubricas_mbe
            ├─ evaluaciones_indicador
            ├─ analisis_ia_portafolio
            └─ estadisticas_indicadores

```

## 2. ARQUITECTURA DEL SISTEMA {#arquitectura-2}

### Flujo de Evaluación

```

// FLUJO COMPLETO DE EVALUACIÓN

Usuario sube contenido de Tarea 1 (Planificación)
        ↓
Frontend llama: POST /functions/v1/analizar-modulo1-tarea1
        ↓
Edge Function:
├─ 1. Autenticar usuario
├─ 2. Recuperar tarea de BD
├─ 3. Cargar rúbricas relevantes (basica_1_6, matemática, 2025)
├─ 4. Para cada indicador:
│   ├─ a. Construir prompt con condiciones específicas
│   ├─ b. Llamar a LIA (Claude/GPT)
│   ├─ c. Verificar cada condición
│   ├─ d. Determinar nivel alcanzado (I/B/C/D)
│   └─ e. Calcular puntaje (1.0 - 4.0)
├─ 5. Agregar resultados
├─ 6. Priorizar recomendaciones
├─ 7. Comparar con estadísticas nacionales
├─ 8. Guardar en BD
└─ 9. Retornar JSON con resultados
        ↓
Frontend muestra:
├─ Puntaje por indicador
├─ Nivel alcanzado
├─ Evidencias citadas
├─ Recomendaciones priorizadas
└─ Comparativa nacional

```

## 3. INSTALACIÓN {#instalación-2}

### 3.1 Requisitos Previos

``` bash
# Supabase CLI instalado
supabase --version

# Deno instalado (para Edge Functions)
deno --version

# Node.js 18+ (para desarrollo)
node --version

```

### 3.2 Estructura de Archivos

``` bash
supabase/
├── functions/
│   ├── analizar-modulo1-tarea1/
│   │   └── index.ts
│   ├── analizar-modulo1-tarea2/
│   │   └── index.ts
│   ├── analizar-modulo1-tarea3/
│   │   └── index.ts
│   ├── analizar-modulo2-clase-grabada/
│   │   └── index.ts
│   ├── analizar-modulo3-trabajo-colaborativo/
│   │   └── index.ts
│   ├── analizar-portafolio-completo/
│   │   └── index.ts
│   └── shared/
│       ├── rubricas-engine.ts      # Motor de rúbricas
│       ├── ia-evaluator.ts         # Evaluador LIA
│       ├── types.ts                # Tipos TypeScript
│       └── utils.ts                # Utilidades
├── migrations/
│   └── 20250104_rubricas_completas.sql
└── config.toml

```

### 3.3 Desplegar funciones

``` bash

# 1. Ubicarse en el directorio del proyecto
cd supabase

# 2. Iniciar Supabase (si no está iniciado)
supabase start

# 3. Aplicar migraciones
supabase db push

# 4. Desplegar todas las functions
supabase functions deploy analizar-modulo1-tarea1
supabase functions deploy analizar-modulo1-tarea2
supabase functions deploy analizar-modulo1-tarea3
supabase functions deploy analizar-modulo2-clase-grabada
supabase functions deploy analizar-modulo3-trabajo-colaborativo
supabase functions deploy analizar-portafolio-completo

# 5. Configurar secrets
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 6. Verificar deployment
supabase functions list

```

### Script de deployment automatizado:

``` bash
# scripts/deploy-functions.sh

#!/bin/bash

set -e

echo "🚀 Desplegando Edge Functions..."

FUNCTIONS=(
  "analizar-modulo1-tarea1"
  "analizar-modulo1-tarea2"
  "analizar-modulo1-tarea3"
  "analizar-modulo2-clase-grabada"
  "analizar-modulo3-trabajo-colaborativo"
  "analizar-portafolio-completo"
)

for func in "${FUNCTIONS[@]}"; do
  echo "Desplegando $func..."
  supabase functions deploy "$func" --no-verify-jwt
  echo "✅ $func desplegada"
done

echo "🎉 Todas las functions desplegadas exitosamente"

```

## 4. USO DE LAS FUNCTIONS {#uso-functions}

### 4.1 Desde el Frontend (React/Next.js)

```typescript

// lib/analisis-portafolio.ts

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface AnalisisRequest {
  tarea_id: string
  modelo?: 'claude-sonnet-4' | 'gpt-4-turbo'
}

export interface AnalisisResponse {
  success: boolean
  analisis_id: string
  resumen: {
    puntaje_promedio: number
    categoria_logro: string
    nivel_predominante: string
    indicadores_evaluados: number
  }
  indicadores: EvaluacionIndicador[]
  recomendaciones: Recomendacion[]
  metadata: {
    modelo: string
    tokens_usados: number
    latencia_ms: number
    costo_usd: number
  }
}

/**
 * Analiza una tarea específica del portafolio
 */
export async function analizarTarea(
  modulo: 1 | 2 | 3,
  tarea: 1 | 2 | 3 | 4 | 5,
  tareaId: string,
  modelo: 'claude-sonnet-4' | 'gpt-4-turbo' = 'claude-sonnet-4'
): Promise<AnalisisResponse> {
  
  // Mapear a la function correcta
  const functionMap = {
    '1-1': 'analizar-modulo1-tarea1',
    '1-2': 'analizar-modulo1-tarea2',
    '1-3': 'analizar-modulo1-tarea3',
    '2-4': 'analizar-modulo2-clase-grabada',
    '3-5': 'analizar-modulo3-trabajo-colaborativo',
  }
  
  const functionName = functionMap[`${modulo}-${tarea}`]
  
  if (!functionName) {
    throw new Error(`No existe función para Módulo ${modulo}, Tarea ${tarea}`)
  }
  
  // Llamar a la Edge Function
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: {
      tarea_id: tareaId,
      modelo
    }
  })
  
  if (error) {
    throw new Error(`Error en análisis: ${error.message}`)
  }
  
  return data
}

/**
 * Analiza el portafolio completo
 */
export async function analizarPortafolioCompleto(
  portafolioId: string
): Promise<any> {
  
  const { data, error } = await supabase.functions.invoke(
    'analizar-portafolio-completo',
    {
      body: { portafolio_id: portafolioId }
    }
  )
  
  if (error) {
    throw new Error(`Error en análisis completo: ${error.message}`)
  }
  
  return data
}

```

### 4.2 Componente React de Ejemplo

```tsx

// components/AnalizadorTarea.tsx

'use client'

import { useState } from 'react'
import { analizarTarea } from '@/lib/analisis-portafolio'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  tareaId: string
  modulo: 1 | 2 | 3
  numeroTarea: 1 | 2 | 3 | 4 | 5
  nombreTarea: string
}

export function AnalizadorTarea({ tareaId, modulo, numeroTarea, nombreTarea }: Props) {
  const [analizando, setAnalizando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const iniciarAnalisis = async () => {
    setAnalizando(true)
    setError(null)
    
    try {
      const resultado = await analizarTarea(modulo, numeroTarea, tareaId)
      setResultado(resultado)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAnalizando(false)
    }
  }

  const getNivelColor = (nivel: string) => {
    const colores = {
      'Destacado': 'bg-green-500',
      'Competente': 'bg-blue-500',
      'Básico': 'bg-yellow-500',
      'Insatisfactorio': 'bg-red-500'
    }
    return colores[nivel as keyof typeof colores] || 'bg-gray-500'
  }

  const getCategoriaLabel = (categoria: string) => {
    const labels = {
      'A': 'Destacado',
      'B': 'Competente Alto',
      'C': 'Competente',
      'D': 'Básico',
      'E': 'Insuficiente'
    }
    return labels[categoria as keyof typeof labels] || categoria
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{nombreTarea}</span>
            <Badge variant="outline">Módulo {modulo}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={iniciarAnalisis}
            disabled={analizando}
            className="w-full"
          >
            {analizando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analizando con LIA...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Analizar con LIA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-red-600">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-medium">Error en el análisis</p>
                <p className="text-sm text-red-500">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultados */}
      {resultado && (
        <>
          {/* Resumen General */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Resumen General</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Puntaje</p>
                  <p className="text-2xl font-bold">
                    {resultado.resumen.puntaje_promedio.toFixed(1)}
                    <span className="text-sm text-gray-500">/4.0</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Categoría</p>
                  <Badge className="mt-1">
                    {getCategoriaLabel(resultado.resumen.categoria_logro)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nivel</p>
                  <Badge className={getNivelColor(resultado.resumen.nivel_predominante)}>
                    {resultado.resumen.nivel_predominante}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Indicadores</p>
                  <p className="text-2xl font-bold">
                    {resultado.resumen.indicadores_evaluados}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Indicadores Detallados */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Evaluación por Indicador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resultado.indicadores.map((ind: any, idx: number) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Header del indicador */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium">{ind.nombre_indicador}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {ind.condiciones_cumplidas} de {ind.condiciones_totales} condiciones cumplidas
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={getNivelColor(ind.nivel_alcanzado)}>
                          {ind.nivel_alcanzado}
                        </Badge>
                        <p className="text-2xl font-bold mt-1">
                          {ind.puntaje.toFixed(1)}
                        </p>
                      </div>
                    </div>

                    {/* Justificación */}
                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <p className="text-sm">{ind.justificacion}</p>
                    </div>

                    {/* Evidencias */}
                    {ind.evidencias_textuales.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-2">📎 Evidencias encontradas:</p>
                        <ul className="space-y-1">
                          {ind.evidencias_textuales.slice(0, 3).map((ev: string, i: number) => (
                            <li key={i} className="text-sm text-gray-600 italic">
                              "{ev.substring(0, 150)}..."
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Para siguiente nivel */}
                    {ind.para_siguiente_nivel && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-3">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          💡 Para mejorar:
                        </p>
                        <p className="text-sm text-blue-800">{ind.para_siguiente_nivel}</p>
                      </div>
                    )}

                    {/* Acciones concretas */}
                    {ind.acciones_concretas.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">🔧 Acciones sugeridas:</p>
                        <ul className="space-y-1">
                          {ind.acciones_concretas.map((accion: string, i: number) => (
                            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span>{accion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Comparativa nacional */}
                    {ind.promedio_nacional && (
                      <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Promedio nacional: {ind.promedio_nacional.toFixed(1)}
                        </span>
                        <Badge variant={ind.puntaje >= ind.promedio_nacional ? 'default' : 'secondary'}>
                          {ind.puntaje >= ind.promedio_nacional 
                            ? `↑ ${(ind.puntaje - ind.promedio_nacional).toFixed(1)} sobre promedio`
                            : `↓ ${(ind.promedio_nacional - ind.puntaje).toFixed(1)} bajo promedio`
                          }
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recomendaciones Priorizadas */}
          <Card>
            <CardHeader>
              <CardTitle>🎯 Recomendaciones Priorizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resultado.recomendaciones.map((rec: any, idx: number) => (
                  <div
                    key={idx}
                    className={`border-l-4 p-4 rounded ${
                      rec.prioridad === 'alta' ? 'border-red-500 bg-red-50' :
                      rec.prioridad === 'media' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <Badge variant={rec.prioridad === 'alta' ? 'destructive' : 'default'}>
                          Prioridad {rec.prioridad}
                        </Badge>
                        <h4 className="font-medium mt-2">{rec.indicador}</h4>
                        <p className="text-sm mt-1">{rec.accion}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm text-gray-500">Impacto</p>
                        <p className="text-lg font-bold text-green-600">
                          +{rec.impacto_puntos.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                      <span>⏱️ ~{rec.tiempo_horas}h</span>
                      <span className="flex-1">{rec.razon}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Modelo: {resultado.metadata.modelo}</span>
                <span>Tokens: {resultado.metadata.tokens_usados.toLocaleString()}</span>
                <span>Tiempo: {(resultado.metadata.latencia_ms / 1000).toFixed(1)}s</span>
                <span>Costo: ${resultado.metadata.costo_usd.toFixed(4)}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

```

### 4.3 Hook Personalizado para Análisis

```typescript

// hooks/useAnalisisPortafolio.ts

import { useState, useCallback } from 'react'
import { analizarTarea, analizarPortafolioCompleto } from '@/lib/analisis-portafolio'

export function useAnalisisPortafolio() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<any>(null)

  const analizarTareaHook = useCallback(async (
    modulo: 1 | 2 | 3,
    tarea: 1 | 2 | 3 | 4 | 5,
    tareaId: string,
    modelo: 'claude-sonnet-4' | 'gpt-4-turbo' = 'claude-sonnet-4'
  ) => {
    setLoading(true)
    setError(null)
    
    try {
      const res = await analizarTarea(modulo, tarea, tareaId, modelo)
      setResultado(res)
      return res
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const analizarPortafolioCompletoHook = useCallback(async (portafolioId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const res = await analizarPortafolioCompleto(portafolioId)
      setResultado(res)
      return res
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResultado(null)
    setError(null)
  }, [])

  return {
    loading,
    error,
    resultado,
    analizarTarea: analizarTareaHook,
    analizarPortafolioCompleto: analizarPortafolioCompletoHook,
    reset
  }
}

```

## 5. FLUJOS DE TRABAJO {#flujos-trabajo}

### 5.1 Flujo: Análisis Individual de Tarea

``` tsx
// pages/tareas/[id]/analizar.tsx

export default function AnalisisTareaPage() {
  const router = useRouter()
  const { id: tareaId } = router.query
  const { analizarTarea, loading, resultado, error } = useAnalisisPortafolio()
  const [tarea, setTarea] = useState<any>(null)

  // Cargar tarea
  useEffect(() => {
    if (tareaId) {
      cargarTarea(tareaId as string)
    }
  }, [tareaId])

  const cargarTarea = async (id: string) => {
    const { data } = await supabase
      .from('tareas_portafolio')
      .select('*, modulo:modulos_portafolio(*)')
      .eq('id', id)
      .single()
    
    setTarea(data)
  }

  const handleAnalizar = async () => {
    if (!tarea) return
    
    try {
      await analizarTarea(
        tarea.modulo.numero_modulo,
        tarea.numero_tarea,
        tarea.id,
        'claude-sonnet-4'
      )
      
      // Mostrar notificación de éxito
      toast.success('¡Análisis completado!')
    } catch (err) {
      toast.error('Error al analizar la tarea')
    }
  }

  if (!tarea) return <div>Cargando...</div>

  return (
    <div className="container mx-auto py-8">
      <AnalizadorTarea
        tareaId={tarea.id}
        modulo={tarea.modulo.numero_modulo}
        numeroTarea={tarea.numero_tarea}
        nombreTarea={tarea.nombre_tarea}
      />
    </div>
  )
}

```

### 5.2 Flujo: Análisis Completo del Portafolio


``` tsx
// pages/portafolio/[id]/dashboard.tsx

import { useState, useEffect } from 'react'
import { useAnalisisPortafolio } from '@/hooks/useAnalisisPortafolio'
import { PortafolioOverview } from '@/components/PortafolioOverview'
import { ProgresoModulos } from '@/components/ProgresoModulos'
import { RecomendacionesGlobales } from '@/components/RecomendacionesGlobales'

export default function PortafolioDashboard() {
  const router = useRouter()
  const { id: portafolioId } = router.query
  const { analizarPortafolioCompleto, loading, resultado } = useAnalisisPortafolio()
  
  const [portafolio, setPortafolio] = useState<any>(null)
  const [ultimoAnalisis, setUltimoAnalisis] = useState<any>(null)

  useEffect(() => {
    if (portafolioId) {
      cargarPortafolio(portafolioId as string)
      cargarUltimoAnalisis(portafolioId as string)
    }
  }, [portafolioId])

  const cargarPortafolio = async (id: string) => {
    const { data } = await supabase
      .from('portafolios')
      .select(`
        *,
        modulos:modulos_portafolio(
          *,
          tareas:tareas_portafolio(
            *,
            analisis:analisis_ia_portafolio(*)
          )
        )
      `)
      .eq('id', id)
      .single()
    
    setPortafolio(data)
  }

  const cargarUltimoAnalisis = async (id: string) => {
    // Obtener último análisis completo
    const { data } = await supabase
      .from('analisis_ia_portafolio')
      .select('*')
      .eq('portafolio_id', id)
      .eq('tipo_analisis', 'completo')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (data) {
      setUltimoAnalisis(data)
    }
  }

  const handleAnalizarCompleto = async () => {
    if (!portafolio) return
    
    try {
      const resultado = await analizarPortafolioCompleto(portafolio.id)
      
      setUltimoAnalisis(resultado)
      
      toast.success('¡Análisis completo del portafolio finalizado!')
    } catch (err) {
      toast.error('Error al analizar el portafolio completo')
    }
  }

  if (!portafolio) return <Loading />

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Overview */}
      <PortafolioOverview portafolio={portafolio} />

      {/* Botón de análisis completo */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Análisis Completo del Portafolio</h3>
              <p className="text-sm text-gray-500 mt-1">
                Evalúa todas las tareas completadas y genera un reporte integrado
              </p>
            </div>
            <Button
              onClick={handleAnalizarCompleto}
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analizar Todo
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados del último análisis */}
      {ultimoAnalisis && (
        <>
          {/* Resumen ejecutivo */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Resumen Ejecutivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Puntaje Final</p>
                  <div className="text-4xl font-bold">
                    {ultimoAnalisis.resumen_ejecutivo.puntaje_final}
                  </div>
                  <Badge className="mt-2">
                    Categoría {ultimoAnalisis.resumen_ejecutivo.categoria_logro}
                  </Badge>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Tramo Proyectado</p>
                  <p className="text-lg font-semibold mt-4">
                    {ultimoAnalisis.resumen_ejecutivo.tramo_proyectado}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">vs Promedio Nacional</p>
                  <div className="text-2xl font-bold mt-4">
                    {ultimoAnalisis.resumen_ejecutivo.promedio_nacional
                      ? (
                          ultimoAnalisis.resumen_ejecutivo.puntaje_final -
                          ultimoAnalisis.resumen_ejecutivo.promedio_nacional
                        ).toFixed(1)
                      : 'N/A'
                    }
                  </div>
                  <p className="text-sm text-gray-500">
                    {ultimoAnalisis.resumen_ejecutivo.posicion_relativa}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Progreso</p>
                  <div className="text-2xl font-bold mt-4">
                    {ultimoAnalisis.progreso.porcentaje}%
                  </div>
                  <p className="text-sm text-gray-500">
                    {ultimoAnalisis.progreso.tareas_completadas} de {ultimoAnalisis.progreso.tareas_totales} tareas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Puntajes por módulo */}
          <ProgresoModulos puntajes={ultimoAnalisis.puntajes_por_modulo} />

          {/* Fortalezas */}
          {ultimoAnalisis.fortalezas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>💪 Fortalezas Identificadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ultimoAnalisis.fortalezas.map((fortaleza: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-green-50 rounded-lg"
                    >
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <p className="text-sm">{fortaleza}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Oportunidades de mejora */}
          {ultimoAnalisis.oportunidades_mejora.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>🎯 Oportunidades de Mejora Prioritarias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ultimoAnalisis.oportunidades_mejora.map((oportunidad: any, idx: number) => (
                    <div
                      key={idx}
                      className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{oportunidad.tarea}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Puntaje actual: {oportunidad.puntaje}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-4">
                          Potencial: +{oportunidad.gap} pts
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informe comparativo narrativo */}
          <Card>
            <CardHeader>
              <CardTitle>📈 Análisis Comparativo</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: ultimoAnalisis.informe_comparativo }}
              />
            </CardContent>
          </Card>

          {/* Siguiente paso recomendado */}
          <Card className="border-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 rounded-full p-3">
                  <Lightbulb className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-2">💡 Siguiente Paso Recomendado</h4>
                  <p className="text-gray-700">{ultimoAnalisis.siguiente_paso}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Grid de tareas */}
      <ProgresoModulos portafolio={portafolio} />
    </div>
  )
}

```

## 6. OPTIMIZACIÓN Y COSTOS {#optimización-costos}

### 6.1 Estrategias de Optimización

``` ts

// lib/optimization.ts

/**
 * Cache de rúbricas en memoria para evitar queries repetitivas
 */
const rubricasCache = new Map<string, any>()

export function getCachedRubricas(key: string): any | null {
  return rubricasCache.get(key) || null
}

export function setCachedRubricas(key: string, rubricas: any): void {
  rubricasCache.set(key, rubricas)
  
  // Limpiar cache después de 1 hora
  setTimeout(() => {
    rubricasCache.delete(key)
  }, 3600000)
}

/**
 * Batching de evaluaciones para reducir llamadas a LIA
 */
export async function evaluarIndicadoresBatch(
  indicadores: any[],
  contenido: any,
  evaluador: any
): Promise<any[]> {
  
  // Agrupar indicadores similares
  const grupos = agruparIndicadoresSimilares(indicadores)
  
  // Evaluar cada grupo en paralelo
  const promesas = grupos.map(grupo => 
    evaluarGrupo(grupo, contenido, evaluador)
  )
  
  const resultados = await Promise.all(promesas)
  
  return resultados.flat()
}

function agruparIndicadoresSimilares(indicadores: any[]): any[][] {
  // Agrupar por módulo y tarea
  const grupos: Record<string, any[]> = {}
  
  for (const indicador of indicadores) {
    const key = `${indicador.modulo}-${indicador.tarea}`
    if (!grupos[key]) {
      grupos[key] = []
    }
    grupos[key].push(indicador)
  }
  
  return Object.values(grupos)
}

/**
 * Selección inteligente de modelo según complejidad
 */
export function seleccionarModelo(
  complejidad: 'simple' | 'media' | 'alta',
  presupuesto: 'bajo' | 'medio' | 'alto'
): 'gpt-4-turbo' | 'claude-sonnet-4' {
  
  // Matriz de decisión
  if (presupuesto === 'bajo') {
    return 'gpt-4-turbo' // Más económico
  }
  
  if (complejidad === 'alta') {
    return 'claude-sonnet-4' // Mejor calidad
  }
  
  return 'gpt-4-turbo' // Balance
}

```

### 6.2 Análisis de Costos

``` ts

// lib/cost-analysis.ts

export interface CostBreakdown {
  costo_total: number
  costo_por_indicador: number
  costo_por_tarea: number
  tokens_promedio: number
  comparativa_modelos: {
    gpt4: number
    claude: number
  }
}

export function calcularCostoEstimado(
  nivel_educativo: string,
  num_indicadores: number,
  modelo: 'gpt-4-turbo' | 'claude-sonnet-4'
): CostBreakdown {
  
  // Estimaciones basadas en promedios reales
  const TOKENS_POR_INDICADOR = {
    'gpt-4-turbo': 2500,      // Prompt + completion
    'claude-sonnet-4': 3000   // Más verboso pero mejor
  }
  
  const COSTO_POR_1K_TOKENS = {
    'gpt-4-turbo': {
      input: 0.01,
      output: 0.03
    },
    'claude-sonnet-4': {
      input: 0.003,
      output: 0.015
    }
  }
  
  const tokens_promedio = TOKENS_POR_INDICADOR[modelo]
  const precios = COSTO_POR_1K_TOKENS[modelo]
  
  // Asumiendo ratio 60/40 input/output
  const costo_por_indicador = (
    (tokens_promedio * 0.6 * precios.input / 1000) +
    (tokens_promedio * 0.4 * precios.output / 1000)
  )
  
  const costo_total = costo_por_indicador * num_indicadores
  
  // Comparativa
  const costo_gpt4 = calcularCostoModelo('gpt-4-turbo', num_indicadores)
  const costo_claude = calcularCostoModelo('claude-sonnet-4', num_indicadores)
  
  return {
    costo_total,
    costo_por_indicador,
    costo_por_tarea: costo_total / 5, // Asumiendo 5 tareas
    tokens_promedio,
    comparativa_modelos: {
      gpt4: costo_gpt4,
      claude: costo_claude
    }
  }
}

function calcularCostoModelo(modelo: string, num_indicadores: number): number {
  // Implementación simplificada
  const tokens = modelo === 'gpt-4-turbo' ? 2500 : 3000
  const precio = modelo === 'gpt-4-turbo' ? 0.02 : 0.01
  return (tokens * num_indicadores * precio) / 1000
}

/**
 * Tabla de referencia de costos
 */
export const TABLA_COSTOS_REFERENCIA = {
  por_tarea: {
    basica_1_6: {
      tarea1: 0.15, // USD
      tarea2: 0.12,
      tarea3: 0.10,
      promedio: 0.12
    },
    basica_7_8_media: {
      tarea1: 0.18,
      tarea2: 0.15,
      tarea3: 0.12,
      tarea4_clase: 0.25, // Incluye transcripción
      promedio: 0.175
    }
  },
  portafolio_completo: {
    basica_1_6: 0.60,     // 5 tareas
    basica_7_8_media: 0.88, // 5 tareas + clase
    parvularia: 0.55,
    especial: 0.70
  },
  mensual_profesor_activo: {
    bajo: 2.50,   // 4-5 análisis/mes
    medio: 5.00,  // 8-10 análisis/mes
    alto: 10.00   // 15-20 análisis/mes
  }
}

```

6.3 Dashboard de Costos (Admin)

``` tsx
// components/admin/CostDashboard.tsx

export function CostDashboard() {
  const [stats, setStats] = useState<any>(null)
  
  useEffect(() => {
    cargarEstadisticas()
  }, [])
  
  const cargarEstadisticas = async () => {
    const { data } = await supabase.rpc('get_cost_statistics', {
      fecha_inicio: startOfMonth(new Date()),
      fecha_fin: new Date()
    })
    
    setStats(data)
  }
  
  if (!stats) return <Loading />
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">💰 Análisis de Costos LIA</h2>
      
      {/* Resumen del mes */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gasto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${stats.gasto_total.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">Este mes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Análisis Realizados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats.total_analisis.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">
              ${(stats.gasto_total / stats.total_analisis).toFixed(3)} c/u
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tokens Usados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {(stats.tokens_totales / 1000000).toFixed(1)}M
            </p>
            <p className="text-sm text-gray-500">
              {(stats.tokens_totales / stats.total_analisis).toLocaleString()} promedio
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Proyección Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${stats.proyeccion_mes.toFixed(2)}
            </p>
            <Badge variant={stats.dentro_presupuesto ? 'default' : 'destructive'}>
              {stats.dentro_presupuesto ? 'En presupuesto' : 'Sobre presupuesto'}
            </Badge>
          </CardContent>
        </Card>
      </div>
      
      {/* Gráfico de distribución */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Costos por Modelo</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={stats.por_modelo} />
        </CardContent>
      </Card>
      
      {/* Top usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Usuarios por Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.top_usuarios.map((usuario: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <span>{usuario.email}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">{usuario.analisis} análisis</span>
                  <span className="font-medium">${usuario.costo.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

```

## 7. MONITOREO Y LOGS {#monitoreo-logs}

### 7.1 Sistema de Logging en Edge Functions

``` ts

// supabase/functions/shared/logger.ts

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  function_name: string
  user_id?: string
  message: string
  metadata?: Record<string, any>
  duration_ms?: number
  error?: {
    message: string
    stack?: string
  }
}

export class Logger {
  private functionName: string
  private userId?: string
  private startTime: number
  
  constructor(functionName: string, userId?: string) {
    this.functionName = functionName
    this.userId = userId
    this.startTime = Date.now()
  }
  
  private async log(level: LogLevel, message: string, metadata?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      function_name: this.functionName,
      user_id: this.userId,
      message,
      metadata,
      duration_ms: Date.now() - this.startTime
    }
    
    // Log a consola (visible en Supabase Dashboard)
    console.log(JSON.stringify(entry))
    
    // Guardar en BD si es ERROR o WARN
    if (level === LogLevel.ERROR || level === LogLevel.WARN) {
      await this.saveToDatabase(entry)
    }
  }
  
  private async saveToDatabase(entry: LogEntry) {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      
      await supabase.table('function_logs').insert({
        level: entry.level,
        function_name: entry.function_name,
        user_id: entry.user_id,
        message: entry.message,
        metadata: entry.metadata,
        duration_ms: entry.duration_ms,
        error_details: entry.error
      })
    } catch (err) {
      console.error('Error guardando log:', err)
    }
  }
  
  debug(message: string, metadata?: any) {
    return this.log(LogLevel.DEBUG, message, metadata)
  }
  
  info(message: string, metadata?: any) {
    return this.log(LogLevel.INFO, message, metadata)
  }
  
  warn(message: string, metadata?: any) {
    return this.log(LogLevel.WARN, message, metadata)
  }
  
  error(message: string, error?: Error, metadata?: any) {
    return this.log(LogLevel.ERROR, message, {
      ...metadata,
      error: error ? {
        message: error.message,
        stack: error.stack
      } : undefined
    })
  }
  
  /**
   * Mide el tiempo de ejecución de una función
   */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now()
    
    try {
      const result = await fn()
      const duration = Date.now() - start
      
      await this.info(`${label} completado`, { duration_ms: duration })
      
      return result
    } catch (error) {
      const duration = Date.now() - start
      
      await this.error(`${label} falló`, error as Error, { duration_ms: duration })
      
      throw error
    }
  }
}

/**
 * Helper para crear logger en functions
 */
export function createLogger(functionName: string, userId?: string): Logger {
  return new Logger(functionName, userId)
}

```

### 7.2 Tabla de Logs en Base de Datos

``` sql
-- Migración: Sistema de logs
CREATE TABLE IF NOT EXISTS function_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  level TEXT NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
  function_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  duration_ms INTEGER,
  error_details JSONB,
  
  -- Índices para búsquedas rápidas
  INDEX idx_logs_created (created_at DESC),
  INDEX idx_logs_level (level),
  INDEX idx_logs_function (function_name),
  INDEX idx_logs_user (user_id)
);

-- Auto-limpieza de logs antiguos (retener 30 días)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM function_logs
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND level IN ('DEBUG', 'INFO');
  
  -- Mantener WARN y ERROR por 90 días
  DELETE FROM function_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND level IN ('WARN', 'ERROR');
END;
$$;

-- Cron job para ejecutar limpieza diaria
SELECT cron.schedule(
  'cleanup-function-logs',
  '0 3 * * *', -- 3 AM diario
  $$SELECT cleanup_old_logs()$$
);

-- Políticas RLS
ALTER TABLE function_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver logs
CREATE POLICY "Admins pueden ver todos los logs"
  ON function_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Usuarios pueden ver sus propios logs
CREATE POLICY "Usuarios ven sus propios logs"
  ON function_logs FOR SELECT
  USING (auth.uid() = user_id);

```

### 7.3 Uso del Logger en Functions

``` tsx
// supabase/functions/analizar-modulo1-tarea1/index.ts
// (Extracto con logging implementado)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createLogger } from '../shared/logger.ts'

serve(async (req) => {
  const logger = createLogger('analizar-modulo1-tarea1')
  
  try {
    logger.info('Solicitud recibida', {
      method: req.method,
      url: req.url
    })
    
    // Autenticación
    const user = await logger.time('Autenticación', async () => {
      return await autenticarUsuario(supabase)
    })
    
    logger.info('Usuario autenticado', {
      user_id: user.id,
      email: user.email
    })
    
    // Parsear body
    const body = await req.json()
    const { tarea_id, modelo } = body
    
    logger.debug('Parámetros recibidos', { tarea_id, modelo })
    
    // Recuperar rúbricas
    const rubricas = await logger.time('Carga de rúbricas', async () => {
      return await recuperarRubricasRelevantes(supabase, ...)
    })
    
    logger.info(`Rúbricas cargadas: ${rubricas.length}`)
    
    // Evaluar indicadores
    const evaluaciones = []
    
    for (let i = 0; i < rubricas.length; i++) {
      const rubrica = rubricas[i]
      
      logger.debug(`Evaluando indicador ${i + 1}/${rubricas.length}`, {
        indicador: rubrica.nombre_indicador
      })
      
      try {
        const evaluacion = await logger.time(
          `Evaluación: ${rubrica.nombre_indicador}`,
          async () => {
            return await rubricasEngine.evaluarIndicador(
              rubrica,
              contenido,
              iaEvaluator
            )
          }
        )
        
        evaluaciones.push(evaluacion)
        
        logger.info(`Indicador evaluado`, {
          indicador: rubrica.nombre_indicador,
          nivel: evaluacion.nivel_alcanzado,
          puntaje: evaluacion.puntaje
        })
        
      } catch (error) {
        logger.error(
          `Error evaluando indicador: ${rubrica.nombre_indicador}`,
          error as Error,
          { indicador_id: rubrica.indicador_id }
        )
        
        // Continuar con siguiente indicador
        continue
      }
    }
    
    // Guardar resultados
    const analisisId = await logger.time('Guardar en BD', async () => {
      return await guardarEvaluacion(supabase, tarea_id, evaluaciones, metadata)
    })
    
    logger.info('Análisis completado exitosamente', {
      analisis_id: analisisId,
      indicadores_evaluados: evaluaciones.length,
      puntaje_promedio: calcularPuntajePromedio(evaluaciones)
    })
    
    return new Response(
      JSON.stringify({ success: true, analisis_id: analisisId, ... }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    logger.error('Error fatal en función', error as Error)
    
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        details: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

```

### 7.4 Dashboard de Monitoreo (Admin)

``` tsx
// components/admin/MonitoringDashboard.tsx

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function MonitoringDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [errorLogs, setErrorLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    cargarDatos()
    
    // Actualizar cada 30 segundos
    const interval = setInterval(cargarDatos, 30000)
    return () => clearInterval(interval)
  }, [])
  
  const cargarDatos = async () => {
    setLoading(true)
    
    try {
      // Stats de las últimas 24h
      const { data: statsData } = await supabase.rpc('get_function_stats', {
        periodo_horas: 24
      })
      
      setStats(statsData)
      
      // Logs recientes
      const { data: logs } = await supabase
        .from('function_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      
      setRecentLogs(logs || [])
      
      // Solo errores
      const { data: errors } = await supabase
        .from('function_logs')
        .select('*')
        .eq('level', 'ERROR')
        .order('created_at', { ascending: false })
        .limit(20)
      
      setErrorLogs(errors || [])
      
    } catch (error) {
      console.error('Error cargando datos de monitoreo:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading && !stats) return <div>Cargando...</div>
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">📊 Monitoreo de Edge Functions</h2>
        <Badge variant={stats?.health_status === 'healthy' ? 'default' : 'destructive'}>
          {stats?.health_status === 'healthy' ? '✅ Sistema saludable' : '⚠️ Problemas detectados'}
        </Badge>
      </div>
      
      {/* Métricas principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Invocaciones (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.total_invocaciones || 0}</p>
            <p className="text-sm text-gray-500">
              {stats?.tasa_exito?.toFixed(1)}% exitosas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tiempo Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {(stats?.duracion_promedio_ms / 1000).toFixed(1)}s
            </p>
            <p className="text-sm text-gray-500">
              P95: {(stats?.duracion_p95_ms / 1000).toFixed(1)}s
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Errores</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {stats?.total_errores || 0}
            </p>
            <p className="text-sm text-gray-500">
              {stats?.tasa_error?.toFixed(2)}% tasa de error
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Usuarios Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.usuarios_activos || 0}</p>
            <p className="text-sm text-gray-500">
              Última hora
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs de logs */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList>
          <TabsTrigger value="recent">Logs Recientes</TabsTrigger>
          <TabsTrigger value="errors">
            Errores
            {errorLogs.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {errorLogs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
        </TabsList>
        
        {/* Logs recientes */}
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Logs en Tiempo Real</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentLogs.map((log) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Errores */}
        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Errores Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {errorLogs.map((log) => (
                  <ErrorLogEntry key={log.id} log={log} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Rendimiento */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por Función</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceChart data={stats?.por_funcion} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Alertas activas */}
      {stats?.alertas && stats.alertas.length > 0 && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle>⚠️ Alertas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.alertas.map((alerta: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-yellow-50 rounded"
                >
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{alerta.titulo}</p>
                    <p className="text-sm text-gray-600">{alerta.descripcion}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(alerta.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Componente para mostrar un log
function LogEntry({ log }: { log: any }) {
  const getLevelColor = (level: string) => {
    const colors = {
      'DEBUG': 'text-gray-500',
      'INFO': 'text-blue-600',
      'WARN': 'text-yellow-600',
      'ERROR': 'text-red-600'
    }
    return colors[level as keyof typeof colors] || 'text-gray-500'
  }
  
  return (
    <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded text-sm font-mono">
      <span className="text-gray-400">
        {format(new Date(log.created_at), 'HH:mm:ss')}
      </span>
      <Badge variant="outline" className={getLevelColor(log.level)}>
        {log.level}
      </Badge>
      <span className="text-gray-600">{log.function_name}</span>
      <span className="flex-1">{log.message}</span>
      {log.duration_ms && (
        <span className="text-gray-400">{log.duration_ms}ms</span>
      )}
    </div>
  )
}

// Componente para mostrar un error detallado
function ErrorLogEntry({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="destructive">ERROR</Badge>
            <span className="font-medium">{log.function_name}</span>
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
            </span>
          </div>
          <p className="text-sm mb-2">{log.message}</p>
          
          {log.error_details && (
            <div className="text-sm">
              <p className="font-medium text-red-700">
                {log.error_details.message}
              </p>
              
              {expanded && log.error_details.stack && (
                <pre className="mt-2 p-2 bg-white rounded text-xs overflow-x-auto">
                  {log.error_details.stack}
                </pre>
              )}
            </div>
          )}
          
          {log.metadata && (
            <details className="mt-2">
              <summary className="text-sm cursor-pointer text-gray-600 hover:text-gray-900">
                Metadata
              </summary>
              <pre className="mt-2 p-2 bg-white rounded text-xs overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </details>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Menos' : 'Más'}
        </Button>
      </div>
    </div>
  )
}

```

### 7.5 Función SQL para Estadísticas

``` sql

-- Función: Obtener estadísticas de functions
CREATE OR REPLACE FUNCTION get_function_stats(periodo_horas INTEGER DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  resultado JSONB;
  total_invocaciones INTEGER;
  total_errores INTEGER;
  duracion_promedio NUMERIC;
  duracion_p95 NUMERIC;
  usuarios_unicos INTEGER;
BEGIN
  -- Calcular métricas
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE level = 'ERROR'),
    AVG(duration_ms),
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)
  INTO
    total_invocaciones,
    total_errores,
    duracion_promedio,
    duracion_p95
  FROM function_logs
  WHERE created_at > NOW() - (periodo_horas || ' hours')::INTERVAL;
  
  -- Usuarios únicos
  SELECT COUNT(DISTINCT user_id)
  INTO usuarios_unicos
  FROM function_logs
  WHERE created_at > NOW() - (periodo_horas || ' hours')::INTERVAL
    AND user_id IS NOT NULL;
  
  -- Construir resultado
  resultado := jsonb_build_object(
    'total_invocaciones', COALESCE(total_invocaciones, 0),
    'total_errores', COALESCE(total_errores, 0),
    'tasa_exito', CASE 
      WHEN total_invocaciones > 0 
      THEN ((total_invocaciones - total_errores)::NUMERIC / total_invocaciones * 100)
      ELSE 100 
    END,
    'tasa_error', CASE 
      WHEN total_invocaciones > 0 
      THEN (total_errores::NUMERIC / total_invocaciones * 100)
      ELSE 0 
    END,
    'duracion_promedio_ms', COALESCE(duracion_promedio, 0),
    'duracion_p95_ms', COALESCE(duracion_p95, 0),
    'usuarios_activos', COALESCE(usuarios_unicos, 0),
    'health_status', CASE
      WHEN COALESCE(total_errores, 0)::NUMERIC / NULLIF(total_invocaciones, 0) > 0.1 THEN 'unhealthy'
      WHEN COALESCE(duracion_promedio, 0) > 30000 THEN 'slow'
      ELSE 'healthy'
    END
  );
  
  -- Agregar stats por función
  resultado := resultado || jsonb_build_object(
    'por_funcion',
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'function_name', function_name,
          'invocaciones', COUNT(*),
          'errores', COUNT(*) FILTER (WHERE level = 'ERROR'),
          'duracion_promedio_ms', AVG(duration_ms)
        )
      )
      FROM function_logs
      WHERE created_at > NOW() - (periodo_horas || ' hours')::INTERVAL
      GROUP BY function_name
      ORDER BY COUNT(*) DESC
    )
  );
  
  RETURN resultado;
END;
$$;

-- Función: Detectar alertas
CREATE OR REPLACE FUNCTION detectar_alertas()
RETURNS TABLE(
  tipo TEXT,
  severidad TEXT,
  titulo TEXT,
  descripcion TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Tasa de error alta (>10% en última hora)
  RETURN QUERY
  SELECT
    'error_rate'::TEXT,
    'high'::TEXT,
    'Tasa de error elevada'::TEXT,
    'La tasa de error supera el 10% en la última hora'::TEXT,
    NOW()
  FROM function_logs
  WHERE created_at > NOW() - INTERVAL '1 hour'
  GROUP BY 1
  HAVING COUNT(*) FILTER (WHERE level = 'ERROR')::NUMERIC / COUNT(*) > 0.1;
  
  -- Latencia alta (P95 > 30 segundos)
  RETURN QUERY
  SELECT
    'high_latency'::TEXT,
    'medium'::TEXT,
    'Latencia elevada'::TEXT,
    'El P95 de latencia supera los 30 segundos'::TEXT,
    NOW()
  WHERE (
    SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)
    FROM function_logs
    WHERE created_at > NOW() - INTERVAL '1 hour'
      AND duration_ms IS NOT NULL
  ) > 30000;
  
  -- Picos de uso inusuales
  RETURN QUERY
  SELECT
    'usage_spike'::TEXT,
    'low'::TEXT,
    'Pico de uso detectado'::TEXT,
    format('Uso %sx por encima del promedio', spike_ratio)::TEXT,
    NOW()
  FROM (
    SELECT
      COUNT(*)::NUMERIC / (
        SELECT AVG(cnt)
        FROM (
          SELECT COUNT(*) as cnt
          FROM function_logs
          WHERE created_at > NOW() - INTERVAL '7 days'
          GROUP BY DATE_TRUNC('hour', created_at)
        ) daily_avg
      ) as spike_ratio
    FROM function_logs
    WHERE created_at > NOW() - INTERVAL '1 hour'
  ) spike_check
  WHERE spike_ratio > 3;
END;
$$;

```

### 7.6 Alertas Automáticas (Webhook/Email)

``` ts

// supabase/functions/check-health/index.ts
// Function que se ejecuta cada 5 minutos para verificar salud

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Obtener estadísticas
    const { data: stats } = await supabase.rpc('get_function_stats', {
      periodo_horas: 1
    })
    
    // Detectar alertas
    const { data: alertas } = await supabase.rpc('detectar_alertas')
    
    // Si hay alertas críticas, notificar
    if (alertas && alertas.length > 0) {
      const alertasCriticas = alertas.filter((a: any) => a.severidad === 'high')
      
      if (alertasCriticas.length > 0) {
        await enviarNotificacionCritica(alertasCriticas, stats)
      }
    }
    
    // Guardar health check
    await supabase.table('health_checks').insert({
      timestamp: new Date().toISOString(),
      status: stats.health_status,
      metrics: stats,
      alertas: alertas
    })
    
    return new Response(
      JSON.stringify({
        success: true,
        health_status: stats.health_status,
        alertas_detectadas: alertas?.length || 0
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error en health check:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function enviarNotificacionCritica(alertas: any[], stats: any) {
  // Opción 1: Email (usando Resend, SendGrid, etc.)
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  
  if (RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'alerts@tuapp.com',
        to: ['admin@tuapp.com'],
        subject: '🚨 ALERTA CRÍTICA: Sistema de Análisis LIA',
        html: generarHTMLAlerta(alertas, stats)
      })
    })
    
    if (!response.ok) {
      console.error('Error enviando email:', await response.text())
    }
  }
  
  // Opción 2: Slack
  const SLACK_WEBHOOK = Deno.env.get('SLACK_WEBHOOK_URL')
  
  if (SLACK_WEBHOOK) {
    await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '🚨 *ALERTA CRÍTICA*',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${alertas.length} alertas críticas detectadas*\n\n${
                alertas.map((a: any) => `• ${a.titulo}: ${a.descripcion}`).join('\n')
              }`
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Tasa de Error:*\n${stats.tasa_error.toFixed(2)}%`
              },
              {
                type: 'mrkdwn',
                text: `*Latencia P95:*\n${(stats.duracion_p95_ms / 1000).toFixed(1)}s`
              }
            ]
          }
        ]
      })
    })
  }
}

function generarHTMLAlerta(alertas: any[], stats: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .alert { background: #fee; border-left: 4px solid #f00; padding: 15px; margin: 10px 0; }
        .stats { background: #f5f5f5; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h2>🚨 Alertas Críticas del Sistema</h2>
      
      ${alertas.map(a => `
        <div class="alert">
          <h3>${a.titulo}</h3>
          <p>${a.descripcion}</p>
          <small>Severidad: ${a.severidad}</small>
        </div>
      `).join('')}
      
      <div class="stats">
        <h3>Métricas Actuales</h3>
        <ul>
          <li>Tasa de Error: ${stats.tasa_error.toFixed(2)}%</li>
          <li>Latencia P95: ${(stats.duracion_p95_ms / 1000).toFixed(1)}s</li>
          <li>Total Invocaciones (1h): ${stats.total_invocaciones}</li>
        </ul>
      </div>
      
      <p>
        <a href="https://tuapp.com/admin/monitoring">Ver Dashboard Completo</a>
      </p>
    </body>
    </html>
  `
}

```

### 7.7 Configuración de Cron para Health Check

``` bash

# En Supabase Dashboard > Edge Functions > Cron Jobs

# Ejecutar health check cada 5 minutos
*/5 * * * * check-health

```


## 8. TROUBLESHOOTING COMÚN

### Problema 1: Functions timeout después de 60 segundos

**Síntoma:**

``` bash

Error: Function timeout after 60000ms

```

**Solución:**

``` ts

// Dividir análisis en chunks más pequeños
async function analizarConTimeout(
  indicadores: any[],
  timeout: number = 50000 // 50s safety margin
): Promise<any[]> {
  const resultados = []
  const startTime = Date.now()
  
  for (const indicador of indicadores) {
    // Verificar tiempo restante
    if (Date.now() - startTime > timeout) {
      console.warn('Timeout inminente, guardando progreso parcial')
      break
    }
    
    const resultado = await evaluarIndicador(indicador)
    resultados.push(resultado)
  }
  
  return resultados
}
```

### Problema 2: Rate limits de APIs de LIA

**Síntoma:**

``` bash
Error: Rate limit exceeded (429)

```

**Solución:**

``` ts
import { retry } from 'https://esm.sh/@std/async@0.1.0/retry'

async function llamarIAConRetry(prompt: string) {
  return await retry(
    async () => {
      return await anthropic.messages.create({...})
    },
    {
      maxAttempts: 3,
      minTimeout: 1000,
      maxTimeout: 5000,
      multiplier: 2
    }
  )
}

```

### Problema 3: Costos inesperadamente altos

**Diagnóstico:**

``` sql

-- Ver usuarios con más uso
SELECT
  user_id,
  u.email,
  COUNT(*) as analisis_count,
  SUM((metadata->>'tokens_usados')::INTEGER) as tokens_totales,
  SUM((metadata->>'costo_usd')::NUMERIC) as costo_total
FROM function_logs fl
JOIN auth.users u ON u.id = fl.user_id
WHERE fl.created_at > NOW() - INTERVAL '7 days'
  AND fl.level = 'INFO'
  AND fl.message LIKE '%completado%'
GROUP BY user_id, u.email
ORDER BY costo_total DESC
LIMIT 20;

```

**Solucion**

- Implementar límites por usuario
- Usar modelo más económico para análisis preliminares
- Cache de evaluaciones previas

