# Sistema de Rúbricas MBE 2025 - ProfeFlow

## 📋 Índice

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Base de Datos](#base-de-datos)
4. [Motor de Rúbricas](#motor-de-rúbricas)
5. [Evaluador de IA](#evaluador-de-ia)
6. [Edge Functions](#edge-functions)
7. [Guía de Uso](#guía-de-uso)
8. [Agregar Nuevas Rúbricas](#agregar-nuevas-rúbricas)
9. [Ejemplos Completos](#ejemplos-completos)
10. [Troubleshooting](#troubleshooting)

---

## Introducción

El Sistema de Rúbricas MBE 2025 es una implementación completa del Marco para la Buena Enseñanza (MBE) de Chile, diseñado para evaluar automáticamente el trabajo docente usando Inteligencia Artificial.

### Características Principales

- ✅ **Evaluación automática** con Claude Sonnet 4 u OpenAI GPT-4
- ✅ **4 niveles de desempeño**: Destacado (4.0), Competente (3.0), Básico (2.0), Insatisfactorio (1.0)
- ✅ **Verificación automática de lógica**: AND/OR en condiciones
- ✅ **Corrección automática**: Si la IA asigna un nivel incorrecto, el sistema lo corrige
- ✅ **Estadísticas comparativas**: Percentiles y promedios nacionales
- ✅ **Feedback detallado**: Fortalezas, recomendaciones priorizadas, evidencias textuales
- ✅ **Escalable**: Fácil agregar nuevas rúbricas y módulos

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                      │
│  - Componentes de portafolio                                │
│  - Hooks: useAIAnalysis                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTP + JWT Bearer Token
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              EDGE FUNCTIONS (Deno Runtime)                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  analizar-modulo1-tarea1/index.ts                    │   │
│  │  - Autentica usuario                                 │   │
│  │  - Carga contexto de tarea                           │   │
│  │  - Inicializa RubricasEngine                         │   │
│  │  - Inicializa IAEvaluator                            │   │
│  │  - Evalúa cada indicador                             │   │
│  │  - Guarda resultados                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  _shared/rubricas-engine.ts                          │   │
│  │  - cargarRubricas()                                  │   │
│  │  - evaluarIndicador()                                │   │
│  │  - construirPrompt()                                 │   │
│  │  - verificarLogica()                                 │   │
│  │  - enriquecerConEstadisticas()                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  _shared/ia-evaluator.ts                             │   │
│  │  - evaluar() → Claude/GPT-4                          │   │
│  │  - Retorna JSON estructurado                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ SQL Queries
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  SUPABASE (PostgreSQL)                       │
│                                                              │
│  📊 rubricas_mbe                                             │
│     - indicador_id, niveles_desempeno (JSONB)                │
│                                                              │
│  📊 evaluaciones_indicador                                   │
│     - tarea_id, indicador_id, nivel_alcanzado, puntaje       │
│     - condiciones_evaluadas (JSONB)                          │
│     - recomendaciones (JSONB)                                │
│                                                              │
│  📊 estadisticas_indicadores                                 │
│     - promedio_nacional, desviacion_estandar                 │
│     - porcentajes por nivel                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Base de Datos

### Tabla: `rubricas_mbe`

Almacena las rúbricas oficiales del MBE 2025.

```sql
CREATE TABLE rubricas_mbe (
  id UUID PRIMARY KEY,
  indicador_id TEXT NOT NULL,              -- Ej: "M1_I1", "M2_I3"
  nombre_indicador TEXT NOT NULL,
  descripcion_general TEXT,

  -- Contexto
  año_vigencia INTEGER DEFAULT 2025,
  nivel_educativo TEXT NOT NULL,           -- "general", "basica", "media"
  asignatura TEXT,                         -- NULL = generalista
  modalidad TEXT DEFAULT 'regular',

  -- Módulo/Tarea
  modulo INTEGER CHECK (modulo IN (1,2,3)),
  tarea INTEGER,

  -- Ponderación
  peso_porcentaje NUMERIC(5,2),

  -- Estructura de evaluación (JSONB)
  niveles_desempeno JSONB NOT NULL,

  -- Metadata
  fuente_oficial TEXT,
  pagina_manual INTEGER,
  notas_aclaratorias TEXT,
  ejemplos TEXT[],

  -- Estado
  activo BOOLEAN DEFAULT TRUE,
  version TEXT DEFAULT '1.0',

  UNIQUE(indicador_id, año_vigencia, nivel_educativo, COALESCE(asignatura, ''))
);
```

#### Estructura de `niveles_desempeno` (JSONB)

```json
{
  "destacado": {
    "nivel": "Destacado",
    "letra": "D",
    "puntaje": 4.0,
    "logica": "AND",
    "descripcion": "Descripción del nivel destacado...",
    "condiciones": [
      {
        "id": "D_1",
        "descripcion": "Primera condición",
        "tipo": "calidad",
        "requiere_evidencia": true,
        "criterios": {
          "palabras_clave": ["objetivo", "aprendizaje"],
          "longitud_minima": 50
        },
        "peso": 1.0
      }
    ],
    "notas": "Notas adicionales del nivel"
  },
  "competente": { ... },
  "basico": { ... },
  "insatisfactorio": { ... }
}
```

**Lógica de condiciones:**
- `"logica": "AND"` → Deben cumplirse **TODAS** las condiciones
- `"logica": "OR"` → Debe cumplirse **AL MENOS UNA** condición

### Tabla: `evaluaciones_indicador`

Almacena los resultados de evaluaciones de indicadores.

```sql
CREATE TABLE evaluaciones_indicador (
  id UUID PRIMARY KEY,
  tarea_id UUID REFERENCES tareas_portafolio(id),
  indicador_id TEXT NOT NULL,
  rubrica_id UUID REFERENCES rubricas_mbe(id),

  -- Resultado
  nivel_alcanzado TEXT CHECK (nivel_alcanzado IN ('Destacado', 'Competente', 'Básico', 'Insatisfactorio')),
  puntaje NUMERIC(3,1) CHECK (puntaje IN (4.0, 3.0, 2.0, 1.0)),

  -- Condiciones
  condiciones_cumplidas INTEGER,
  condiciones_totales INTEGER,
  condiciones_evaluadas JSONB,

  -- Feedback
  justificacion TEXT,
  para_siguiente_nivel TEXT,
  evidencias_textuales TEXT[],
  fortalezas TEXT[],
  recomendaciones JSONB,

  -- Correcciones
  correccion_aplicada BOOLEAN DEFAULT FALSE,
  nota_correccion TEXT,

  -- Estadísticas
  promedio_nacional NUMERIC(3,2),
  desviacion_estandar NUMERIC(3,2),
  percentil INTEGER,

  -- Metadata
  modelo_ia TEXT,
  tokens_utilizados INTEGER,
  tiempo_evaluacion_ms INTEGER,

  UNIQUE(tarea_id, indicador_id)
);
```

### Tabla: `estadisticas_indicadores`

Estadísticas agregadas para comparación y benchmarking.

```sql
CREATE TABLE estadisticas_indicadores (
  id UUID PRIMARY KEY,
  indicador_id TEXT NOT NULL,
  año INTEGER,
  nivel_educativo TEXT,
  asignatura TEXT,

  total_evaluaciones INTEGER,
  puntaje_promedio NUMERIC(3,2),
  desviacion_estandar NUMERIC(3,2),

  porcentaje_destacado NUMERIC(5,2),
  porcentaje_competente NUMERIC(5,2),
  porcentaje_basico NUMERIC(5,2),
  porcentaje_insatisfactorio NUMERIC(5,2),

  ultima_actualizacion TIMESTAMPTZ,

  UNIQUE(indicador_id, año, nivel_educativo, COALESCE(asignatura, ''))
);
```

---

## Motor de Rúbricas

El `RubricasEngine` es el corazón del sistema. Orquesta todo el proceso de evaluación.

### Métodos Principales

#### 1. `cargarRubricas(contexto)`

Carga las rúbricas relevantes según el contexto educativo.

```typescript
const rubricasEngine = new RubricasEngine(supabase, 'contexto-evaluacion')

const rubricas = await rubricasEngine.cargarRubricas({
  año: 2025,
  nivel_educativo: 'basica',
  asignatura: 'Lenguaje',
  modulo: 1,
  tarea: 1
})

// Retorna: Rubrica[]
```

**Filtros aplicados:**
- Año de vigencia
- Nivel educativo
- Asignatura (incluye generalistas con `asignatura: NULL`)
- Módulo y tarea
- Solo rúbricas activas

#### 2. `evaluarIndicador(rubrica, contenido, iaEvaluator)`

Evalúa un indicador específico usando IA.

```typescript
const iaEvaluator = new IAEvaluator({
  modelo: 'claude-sonnet-4',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  temperatura: 0.3,
  maxTokens: 4000
})

const evaluacion = await rubricasEngine.evaluarIndicador(
  rubrica,        // Rubrica cargada
  contenidoDocente, // String con la respuesta del docente
  iaEvaluator     // Evaluador de IA
)

// Retorna: EvaluacionIndicador
```

**Proceso interno:**
1. Construye prompt especializado con la rúbrica
2. Llama a IA (Claude o GPT-4)
3. Parsea respuesta JSON
4. Verifica lógica de condiciones (AND/OR)
5. Corrige nivel si es necesario
6. Enriquece con estadísticas
7. Retorna evaluación completa

#### 3. `construirPrompt(rubrica, contenido)` (privado)

Genera un prompt especializado y estructurado:

```
# EVALUACIÓN DE INDICADOR - SISTEMA DOCENTE CHILE

## CONTEXTO
Eres un evaluador experto del Sistema de Reconocimiento Profesional Docente...

## INDICADOR A EVALUAR
**ID:** M1_I1
**Nombre:** Identifica el aprendizaje que espera que sus estudiantes logren
...

## NIVELES DE DESEMPEÑO
### 🌟 NIVEL DESTACADO (4.0 puntos)
Descripción...
**Condiciones (deben cumplirse TODAS):**
1. ...
2. ...

## CONTENIDO DEL/LA DOCENTE A EVALUAR
```
Respuesta del docente...
```

## REGLAS CRÍTICAS
- NO seas benévolo
- NO asumas: si no hay evidencia, no se cumple
- SÉ ESTRICTO con lógica AND
- CITA textualmente

## RESPONDE SOLO CON ESTE JSON:
{ ... }
```

#### 4. `verificarLogica(evaluacion, rubrica)` (privado)

Verifica que la IA haya aplicado correctamente la lógica AND/OR.

**Ejemplo de corrección:**

```typescript
// IA asignó "Destacado" pero solo cumplió 2 de 3 condiciones
// y la lógica es AND → el sistema corrige a "Competente"

{
  ...evaluacion,
  nivel_alcanzado: "Competente",
  puntaje: 3.0,
  correccion_aplicada: true,
  nota_correccion: "El nivel fue ajustado automáticamente según la lógica de condiciones"
}
```

#### 5. `enriquecerConEstadisticas(evaluacion, rubrica)` (privado)

Agrega datos de comparación nacional:

```typescript
{
  ...evaluacion,
  promedio_nacional: 2.8,
  desviacion_estandar: 0.6,
  percentil: 73  // Este docente está en el percentil 73
}
```

**Cálculo de percentil:**
- Usa distribución normal estándar
- Z-score: `(puntaje - promedio) / desviacion`
- Función erf() para conversión a percentil

---

## Evaluador de IA

El `IAEvaluator` abstrae la comunicación con Claude y GPT-4.

### Inicialización

```typescript
import { IAEvaluator } from '../_shared/ia-evaluator.ts'

// Opción 1: Claude Sonnet 4
const evaluatorClaude = new IAEvaluator({
  modelo: 'claude-sonnet-4',
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
  temperatura: 0.3,  // Evaluaciones consistentes
  maxTokens: 4000
})

// Opción 2: GPT-4 Turbo
const evaluatorGPT = new IAEvaluator({
  modelo: 'gpt-4-turbo',
  apiKey: Deno.env.get('OPENAI_API_KEY')!,
  temperatura: 0.3,
  maxTokens: 4000
})
```

### Método `evaluar(prompt)`

```typescript
const resultado = await iaEvaluator.evaluar(prompt)

// Retorna: ResultadoIA
{
  contenido: string,        // Respuesta JSON de la IA
  tokens_utilizados: number,
  tiempo_ms: number,
  modelo: string,
  error?: string
}
```

### Modelos Soportados

- `claude-sonnet-4` → Anthropic API
- `claude-opus-4` → Anthropic API
- `gpt-4-turbo` → OpenAI API
- `gpt-4o` → OpenAI API

**Recomendación:** `claude-sonnet-4` con `temperatura: 0.3` para evaluaciones más consistentes.

---

## Edge Functions

Las Edge Functions ejecutan el análisis en Deno runtime de Supabase.

### Estructura de una Edge Function

```typescript
// supabase/functions/analizar-modulo1-tarea1/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { RubricasEngine } from '../_shared/rubricas-engine.ts'
import { IAEvaluator } from '../_shared/ia-evaluator.ts'
import { Logger } from '../_shared/logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const logger = new Logger('analizar-modulo1-tarea1')

  try {
    // 2. Obtener datos
    const { tarea_id } = await req.json()

    // 3. Autenticar y conectar a Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 4. Cargar contexto de la tarea
    const { data: tarea } = await supabase
      .from('tareas_portafolio')
      .select(`
        *,
        modulo:modulos_portafolio!inner(
          *,
          portafolio:portafolios!inner(
            nivel_educativo,
            asignatura,
            año_evaluacion
          )
        )
      `)
      .eq('id', tarea_id)
      .single()

    const portafolio = tarea.modulo.portafolio

    // 5. Inicializar motor de rúbricas
    const rubricasEngine = new RubricasEngine(supabase, 'analizar-m1-t1')

    // 6. Cargar rúbricas
    const rubricas = await rubricasEngine.cargarRubricas({
      año: portafolio.año_evaluacion,
      nivel_educativo: portafolio.nivel_educativo,
      asignatura: portafolio.asignatura,
      modulo: 1,
      tarea: 1,
    })

    // 7. Inicializar evaluador de IA
    const iaEvaluator = new IAEvaluator({
      modelo: 'claude-sonnet-4',
      apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
      temperatura: 0.3,
      maxTokens: 4000,
    })

    // 8. Evaluar cada indicador
    const evaluaciones = []

    for (const rubrica of rubricas) {
      logger.info(`Evaluando ${rubrica.indicador_id}...`)

      const evaluacion = await rubricasEngine.evaluarIndicador(
        rubrica,
        tarea.contenido_texto, // El texto a evaluar
        iaEvaluator
      )

      // 9. Guardar en BD
      await supabase
        .from('evaluaciones_indicador')
        .upsert({
          tarea_id,
          indicador_id: rubrica.indicador_id,
          rubrica_id: rubrica.id,
          nivel_alcanzado: evaluacion.nivel_alcanzado,
          puntaje: evaluacion.puntaje,
          condiciones_cumplidas: evaluacion.condiciones_cumplidas,
          condiciones_totales: evaluacion.condiciones_totales,
          condiciones_evaluadas: evaluacion.condiciones_evaluadas,
          justificacion: evaluacion.justificacion,
          para_siguiente_nivel: evaluacion.para_siguiente_nivel,
          evidencias_textuales: evaluacion.evidencias_destacadas,
          fortalezas: evaluacion.fortalezas,
          recomendaciones: evaluacion.recomendaciones,
          correccion_aplicada: evaluacion.correccion_aplicada,
          nota_correccion: evaluacion.nota_correccion,
          promedio_nacional: evaluacion.promedio_nacional,
          desviacion_estandar: evaluacion.desviacion_estandar,
          percentil: evaluacion.percentil,
        })

      evaluaciones.push(evaluacion)

      logger.info(`✅ ${rubrica.indicador_id} evaluado: ${evaluacion.nivel_alcanzado} (${evaluacion.puntaje})`)
    }

    // 10. Retornar resultado
    return new Response(
      JSON.stringify({
        success: true,
        evaluaciones,
        puntaje_promedio: evaluaciones.reduce((sum, e) => sum + e.puntaje, 0) / evaluaciones.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    logger.error('Error en análisis', error as Error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
```

### Desplegar Edge Function

```bash
# 1. Configurar secretos en Supabase Dashboard
# Settings → Edge Functions → Secrets:
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# 2. Desplegar
supabase functions deploy analizar-modulo1-tarea1

# 3. Ver logs
supabase functions logs analizar-modulo1-tarea1
```

---

## Guía de Uso

### Setup Inicial

#### 1. Ejecutar migración

```bash
# En Supabase SQL Editor
-- Ejecutar: sql/migrations/20250107_create_rubricas_mbe.sql
```

#### 2. Cargar datos de rúbricas

```bash
# En Supabase SQL Editor
-- Ejecutar: sql/seed/seed_rubricas_modulo1.sql

# O desde terminal (si tienes CLI configurado)
npm run seed:rubricas
```

#### 3. Configurar API Keys

En `.env.local` (Next.js):
```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

En Supabase Dashboard → Edge Functions → Secrets:
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### Usar desde Frontend

```typescript
// hooks/useAIAnalysis.ts (ya existe en ProfeFlow)
import { useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

export function useAIAnalysis() {
  const supabase = createBrowserClient()

  const analizarTarea = useCallback(async (tareaId: string) => {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) throw new Error('No autenticado')

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analizar-modulo1-tarea1`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tarea_id: tareaId }),
      }
    )

    if (!response.ok) {
      throw new Error('Error al analizar tarea')
    }

    return await response.json()
  }, [supabase])

  return { analizarTarea }
}

// Uso en componente
function MiComponente() {
  const { analizarTarea } = useAIAnalysis()

  const handleAnalizar = async () => {
    try {
      const resultado = await analizarTarea(tareaId)
      console.log('Evaluaciones:', resultado.evaluaciones)
      console.log('Puntaje promedio:', resultado.puntaje_promedio)
    } catch (error) {
      console.error(error)
    }
  }

  return <button onClick={handleAnalizar}>Analizar con IA</button>
}
```

---

## Agregar Nuevas Rúbricas

### Paso 1: Preparar datos de la rúbrica

Estructura completa en JSONB:

```json
{
  "destacado": {
    "nivel": "Destacado",
    "letra": "D",
    "puntaje": 4.0,
    "logica": "AND",
    "descripcion": "Descripción detallada del nivel destacado...",
    "condiciones": [
      {
        "id": "D_1",
        "descripcion": "Primera condición",
        "tipo": "calidad",
        "requiere_evidencia": true,
        "criterios": {
          "palabras_clave": ["palabra1", "palabra2"],
          "longitud_minima": 50,
          "elementos_requeridos": ["elemento1", "elemento2"]
        },
        "peso": 1.0
      }
    ],
    "notas": "Notas adicionales"
  },
  "competente": { ... },
  "basico": { ... },
  "insatisfactorio": { ... }
}
```

### Paso 2: Crear script de seed

```sql
-- sql/seed/seed_rubricas_modulo2.sql

INSERT INTO rubricas_mbe (
  indicador_id,
  nombre_indicador,
  descripcion_general,
  año_vigencia,
  nivel_educativo,
  asignatura,
  modalidad,
  modulo,
  tarea,
  peso_porcentaje,
  niveles_desempeno,
  fuente_oficial,
  pagina_manual,
  notas_aclaratorias,
  ejemplos,
  activo,
  version
) VALUES (
  'M2_I1',
  'Nombre del indicador',
  'Descripción general...',
  2025,
  'general',
  NULL,
  'regular',
  2,
  1,
  20.00,
  '{...}'::jsonb,  -- ← JSON completo aquí
  'Manual MBE 2025',
  25,
  'Notas aclaratorias...',
  ARRAY['Ejemplo 1', 'Ejemplo 2'],
  true,
  '1.0'
) ON CONFLICT (indicador_id, año_vigencia, nivel_educativo, COALESCE(asignatura, ''))
DO UPDATE SET
  niveles_desempeno = EXCLUDED.niveles_desempeno,
  updated_at = NOW();
```

### Paso 3: Ejecutar seed

```bash
# En Supabase SQL Editor
-- Ejecutar el archivo seed

# Verificar inserción
SELECT indicador_id, nombre_indicador
FROM rubricas_mbe
WHERE indicador_id = 'M2_I1';
```

### Paso 4: Crear Edge Function específica (opcional)

Si el módulo requiere lógica especializada, crear nueva Edge Function:

```bash
# Copiar estructura base
cp -r supabase/functions/analizar-modulo1-tarea1 \
      supabase/functions/analizar-modulo2-tarea1

# Editar y adaptar lógica específica

# Desplegar
supabase functions deploy analizar-modulo2-tarea1
```

---

## Ejemplos Completos

### Ejemplo 1: Evaluar Módulo 1, Tarea 1

```typescript
// Edge Function completo
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { RubricasEngine } from '../_shared/rubricas-engine.ts'
import { IAEvaluator } from '../_shared/ia-evaluator.ts'

serve(async (req) => {
  const { tarea_id } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Cargar tarea con contexto
  const { data: tarea } = await supabase
    .from('tareas_portafolio')
    .select('*, modulo:modulos_portafolio!inner(*, portafolio:portafolios!inner(*))')
    .eq('id', tarea_id)
    .single()

  const portafolio = tarea.modulo.portafolio

  // Inicializar motor
  const engine = new RubricasEngine(supabase, 'eval-m1-t1')

  // Cargar rúbricas
  const rubricas = await engine.cargarRubricas({
    año: portafolio.año_evaluacion,
    nivel_educativo: portafolio.nivel_educativo,
    asignatura: portafolio.asignatura,
    modulo: 1,
    tarea: 1
  })

  // Inicializar IA
  const ia = new IAEvaluator({
    modelo: 'claude-sonnet-4',
    apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
    temperatura: 0.3,
    maxTokens: 4000
  })

  // Evaluar
  const evaluaciones = []
  for (const rubrica of rubricas) {
    const evaluacion = await engine.evaluarIndicador(
      rubrica,
      tarea.planificacion_texto,
      ia
    )

    // Guardar
    await supabase.from('evaluaciones_indicador').upsert({
      tarea_id,
      indicador_id: rubrica.indicador_id,
      ...evaluacion
    })

    evaluaciones.push(evaluacion)
  }

  return new Response(JSON.stringify({ success: true, evaluaciones }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### Ejemplo 2: Consultar evaluaciones desde Next.js

```typescript
// app/api/portafolio/evaluaciones/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tareaId = searchParams.get('tarea_id')

  const supabase = createClient()

  const { data, error } = await supabase
    .from('evaluaciones_indicador')
    .select('*')
    .eq('tarea_id', tareaId)
    .order('indicador_id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ evaluaciones: data })
}
```

### Ejemplo 3: Mostrar evaluaciones en UI

```typescript
// components/portafolio/ResultadosEvaluacion.tsx
'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

interface Evaluacion {
  indicador_id: string
  nivel_alcanzado: string
  puntaje: number
  justificacion: string
  fortalezas: string[]
  recomendaciones: Array<{
    prioridad: string
    accion: string
    impacto: string
  }>
  percentil?: number
}

export function ResultadosEvaluacion({ tareaId }: { tareaId: string }) {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/portafolio/evaluaciones?tarea_id=${tareaId}`)
      .then(res => res.json())
      .then(data => {
        setEvaluaciones(data.evaluaciones)
        setLoading(false)
      })
  }, [tareaId])

  if (loading) return <div>Cargando evaluaciones...</div>

  const promedioGeneral = evaluaciones.reduce((sum, e) => sum + e.puntaje, 0) / evaluaciones.length

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-2">Resumen General</h2>
        <div className="text-4xl font-bold text-blue-600">{promedioGeneral.toFixed(2)}</div>
        <p className="text-gray-600">Puntaje promedio</p>
      </Card>

      {evaluaciones.map((evaluacion) => (
        <Card key={evaluacion.indicador_id} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">{evaluacion.indicador_id}</h3>
              <Badge variant={getBadgeVariant(evaluacion.nivel_alcanzado)}>
                {evaluacion.nivel_alcanzado} - {evaluacion.puntaje}
              </Badge>
              {evaluacion.percentil && (
                <span className="ml-2 text-sm text-gray-600">
                  Percentil {evaluacion.percentil}
                </span>
              )}
            </div>
          </div>

          <p className="text-gray-700 mb-4">{evaluacion.justificacion}</p>

          {evaluacion.fortalezas.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-green-700 mb-2">✅ Fortalezas</h4>
              <ul className="list-disc list-inside space-y-1">
                {evaluacion.fortalezas.map((f, i) => (
                  <li key={i} className="text-sm">{f}</li>
                ))}
              </ul>
            </div>
          )}

          {evaluacion.recomendaciones.length > 0 && (
            <div>
              <h4 className="font-semibold text-orange-700 mb-2">💡 Recomendaciones</h4>
              <div className="space-y-2">
                {evaluacion.recomendaciones.map((rec, i) => (
                  <div key={i} className="border-l-4 border-orange-400 pl-3 py-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={rec.prioridad === 'alta' ? 'danger' : 'warning'}>
                        {rec.prioridad}
                      </Badge>
                      <span className="font-medium text-sm">{rec.accion}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{rec.impacto}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

function getBadgeVariant(nivel: string) {
  switch (nivel) {
    case 'Destacado': return 'success'
    case 'Competente': return 'default'
    case 'Básico': return 'warning'
    case 'Insatisfactorio': return 'danger'
    default: return 'default'
  }
}
```

---

## Troubleshooting

### Problema: "No se encontraron rúbricas para el contexto especificado"

**Causa:** Filtros demasiado estrictos o datos no cargados.

**Solución:**
```sql
-- Verificar rúbricas disponibles
SELECT indicador_id, nivel_educativo, asignatura, modulo, tarea, activo
FROM rubricas_mbe
WHERE año_vigencia = 2025
ORDER BY modulo, tarea;

-- Si están inactivas, activar
UPDATE rubricas_mbe
SET activo = TRUE
WHERE indicador_id = 'M1_I1';
```

### Problema: "Error cargando rúbricas: column 'rubricas_mbe.activo' does not exist"

**Causa:** Migración no ejecutada.

**Solución:**
```bash
# Ejecutar migración en Supabase SQL Editor
-- sql/migrations/20250107_create_rubricas_mbe.sql
```

### Problema: IA retorna nivel incorrecto constantemente

**Causa:** Prompt ambiguo o temperatura muy alta.

**Solución:**
```typescript
// Reducir temperatura
const ia = new IAEvaluator({
  modelo: 'claude-sonnet-4',
  apiKey: '...',
  temperatura: 0.2,  // ← Más determinístico
  maxTokens: 4000
})

// El sistema verificará la lógica y corregirá automáticamente
// Revisar: evaluacion.correccion_aplicada === true
```

### Problema: "Anthropic API key not found"

**Causa:** Variable de entorno no configurada en Edge Functions.

**Solución:**
```bash
# En Supabase Dashboard:
# Settings → Edge Functions → Secrets
# Agregar: ANTHROPIC_API_KEY=sk-ant-...

# Verificar en función:
console.log('API Key exists:', !!Deno.env.get('ANTHROPIC_API_KEY'))
```

### Problema: Evaluaciones muy lentas

**Causa:** Llamadas secuenciales a IA.

**Solución:** Paralelizar evaluaciones:
```typescript
// ❌ Lento (secuencial)
for (const rubrica of rubricas) {
  const evaluacion = await engine.evaluarIndicador(...)
}

// ✅ Rápido (paralelo)
const promesas = rubricas.map(rubrica =>
  engine.evaluarIndicador(rubrica, contenido, ia)
)
const evaluaciones = await Promise.all(promesas)
```

### Problema: JSON parsing error en respuesta de IA

**Causa:** IA retornó texto con markdown.

**Solución:** El `parsearRespuesta()` ya limpia markdown automáticamente:
```typescript
// Limpia:
// ```json\n{ ... }\n```
// { ... } // comentario
// Y extrae solo el JSON válido
```

Si persiste, revisar logs:
```bash
supabase functions logs analizar-modulo1-tarea1 --tail
```

---

## Conclusión

El Sistema de Rúbricas MBE 2025 está completamente implementado y listo para evaluar portafolios docentes con precisión y consistencia.

### Checklist de Implementación

- ✅ Migración SQL ejecutada
- ✅ Tipos TypeScript definidos
- ✅ RubricasEngine implementado
- ✅ IAEvaluator configurado
- ✅ Edge Functions desplegadas
- ✅ Rúbricas M1 cargadas
- ✅ Sistema de logging
- ✅ Verificación automática de lógica
- ✅ Estadísticas comparativas
- ✅ Documentación completa

### Próximos Pasos

1. **Cargar rúbricas de Módulos 2 y 3**
2. **Crear Edge Functions específicas por módulo/tarea**
3. **Implementar dashboard de resultados en UI**
4. **Configurar alertas de errores**
5. **Optimizar costos de IA** (cacheo de prompts, batch processing)

---

**Documentación generada:** 2025-01-07
**Versión:** 1.0
**Autor:** ProfeFlow Team
