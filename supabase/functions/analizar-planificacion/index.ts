// supabase/functions/analizar-planificacion/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.9.1'

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!,
})

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
})

// ✅ CORRECCIÓN: Interfaces actualizadas según documentación oficial
interface PlanificacionAnalysis {
  criterios_evaluados: CriterioEvaluado[]
  puntaje_estimado: number // 1.0 a 4.0
  categoria_logro: 'A' | 'B' | 'C' | 'D' | 'E' // ✅ AGREGADO
  nivel_desempeño: 'Destacado' | 'Competente' | 'Básico' | 'Insuficiente'
  resumen: string
  recomendaciones_priorizadas: string[]
  aspectos_evaluacion: AspectoEvaluacion[] // ✅ AGREGADO: según manual
}

interface CriterioEvaluado {
  nombre: string
  dominio_mbe: 'A' | 'B' | 'C' | 'D'
  estandar_numero: number // 1 a 12
  estandar_nombre: string // ✅ AGREGADO
  focos_relacionados: string[] // ✅ AGREGADO
  descriptores_relacionados: string[] // ✅ AGREGADO
  nivel: 'Destacado' | 'Competente' | 'Básico' | 'Insuficiente'
  justificacion: string
  evidencias_citadas: string[] // ✅ AGREGADO: citas textuales
  fortalezas: string[]
  aspectos_mejorar: string[]
  sugerencias: string[]
}

// ✅ AGREGADO: Aspectos evaluados por tarea según manual
interface AspectoEvaluacion {
  nombre_aspecto: string
  tarea_relacionada: string // ej: "Tarea 1A", "Tarea 2B"
  cumple_competente: boolean
  cumple_destacado: boolean
  observaciones: string
}

serve(async (req) => {
  try {
    // 1. Autenticación
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header es requerido' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401 
      })
    }

    // 2. Parsear request
    const { 
      tarea_id, 
      contenido_planificacion,
      modelo = 'gpt-4-turbo-preview'
    } = await req.json()

    // 3. Obtener contexto completo de la tarea
    const { data: tarea } = await supabase
      .from('tareas_portafolio')
      .select(`
        *,
        modulo:modulos_portafolio(
          *,
          portafolio:portafolios(*)
        )
      `)
      .eq('id', tarea_id)
      .single()

    if (!tarea) {
      return new Response(JSON.stringify({ error: 'Tarea no encontrada' }), {
        status: 404
      })
    }

    // ✅ CORRECCIÓN: Validar que sea Tarea 1 del Módulo 1
    if (tarea.modulo.numero_modulo !== 1 || tarea.numero_tarea !== 1) {
      return new Response(
        JSON.stringify({ 
          error: 'Esta función solo analiza Tarea 1 del Módulo 1 (Planificación de la enseñanza)'
        }),
        { status: 400 }
      )
    }

    // 4. Recuperar rúbricas específicas del año y modalidad
    const año_vigencia = tarea.modulo.portafolio.año_evaluacion
    const modalidad = tarea.modulo.portafolio.modalidad || 'regular'
    
    const contextoPedagogico = await recuperarContextoMBE(
      supabase,
      tarea.modulo.portafolio.asignatura,
      tarea.modulo.portafolio.nivel_educativo,
      año_vigencia,
      modalidad,
      contenido_planificacion
    )

    // 5. Construir prompt actualizado
    const prompt = construirPromptPlanificacion(
      contenido_planificacion,
      contextoPedagogico,
      tarea.modulo.portafolio.asignatura,
      tarea.modulo.portafolio.nivel_educativo,
      año_vigencia
    )

    // 6. Llamar a LIA
    const startTime = Date.now()
    let analisis: PlanificacionAnalysis
    let tokens = { prompt: 0, completion: 0 }

    if (modelo.startsWith('gpt')) {
      const completion = await openai.chat.completions.create({
        model: modelo,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT_EVALUADOR
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 6000 // ✅ Aumentado para más detalle
      })

      analisis = JSON.parse(completion.choices[0].message.content!)
      tokens = {
        prompt: completion.usage?.prompt_tokens || 0,
        completion: completion.usage?.completion_tokens || 0
      }
    } else {
      // Claude
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 6000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: `${SYSTEM_PROMPT_EVALUADOR}\n\n${prompt}`
          }
        ]
      })

      const content = message.content[0]
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/)
        analisis = JSON.parse(jsonMatch![0])
        
        tokens = {
          prompt: message.usage.input_tokens,
          completion: message.usage.output_tokens
        }
      }
    }

    // ✅ CORRECCIÓN: Calcular categoría de logro según escala oficial
    analisis.categoria_logro = calcularCategoriaLogro(analisis.puntaje_estimado)

    const latencia = Date.now() - startTime
    const costoUsd = calcularCosto(modelo, tokens.prompt, tokens.completion)

    // 7. Guardar análisis
    const { data: analisisGuardado, error: saveError } = await supabase
      .from('analisis_ia_portafolio')
      .insert({
        tarea_id,
        modelo_usado: modelo,
        prompt_tokens: tokens.prompt,
        completion_tokens: tokens.completion,
        costo_usd: costoUsd,
        latencia_ms: latencia,
        analisis: analisis,
        tipo_analisis: 'inicial',
        version: 1
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error guardando análisis:', saveError)
    }

    // 8. Actualizar métricas
    await actualizarMetricas(supabase, user.id, {
      analisis_planificacion: 1,
      tokens_usados: tokens.prompt + tokens.completion,
      costo_usd: costoUsd
    })

    // 9. Responder
    return new Response(
      JSON.stringify({
        success: true,
        analisis,
        metadata: {
          modelo,
          tokens_usados: tokens.prompt + tokens.completion,
          latencia_ms: latencia,
          costo_usd: costoUsd,
          año_evaluacion: año_vigencia
        }
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error en analizar-planificacion:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error interno', 
        details: error.message 
      }),
      { status: 500 }
    )
  }
})

// ============================================
// FUNCIONES AUXILIARES CORREGIDAS
// ============================================

// ✅ CORRECCIÓN: Función actualizada con parámetros adicionales
async function recuperarContextoMBE(
  supabase: any,
  asignatura: string,
  nivel: string,
  año_vigencia: number,
  modalidad: string,
  planificacion: any
): Promise<string> {
  // 1. Generar embedding
  const textoParaEmbedding = `
    Asignatura: ${asignatura}
    Nivel: ${nivel}
    Año: ${año_vigencia}
    Objetivo: ${planificacion.objetivo_aprendizaje}
    Actividades: ${JSON.stringify(planificacion.actividades)}
  `

  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: textoParaEmbedding,
    dimensions: 1536
  })

  const embedding = embeddingResponse.data[0].embedding

  // 2. Búsqueda vectorial con filtros específicos
  const { data: rubricasRelevantes } = await supabase.rpc(
    'buscar_rubricas_similares',
    {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 8, // ✅ Aumentado
      p_año_vigencia: año_vigencia,
      p_asignatura: asignatura,
      p_nivel: nivel,
      p_modalidad: modalidad
    }
  )

  if (!rubricasRelevantes || rubricasRelevantes.length === 0) {
    return 'No se encontró contexto específico del MBE para este año y modalidad.'
  }

  // 3. Construir contexto estructurado
  let contexto = `## CONTEXTO DEL MARCO PARA LA BUENA ENSEÑANZA ${año_vigencia}\n\n`
  contexto += `### INFORMACIÓN DEL PORTAFOLIO\n`
  contexto += `- Modalidad: ${modalidad}\n`
  contexto += `- Asignatura: ${asignatura}\n`
  contexto += `- Nivel: ${nivel}\n\n`
  contexto += `---\n\n`
  
  for (const rubrica of rubricasRelevantes) {
    contexto += `### Dominio ${rubrica.dominio} - Estándar ${rubrica.estandar_numero}\n`
    contexto += `**${rubrica.nombre_estandar}**\n\n`
    contexto += `${rubrica.descripcion_estandar}\n\n`
    
    // ✅ AGREGADO: Incluir focos y descriptores
    if (rubrica.focos) {
      contexto += `**Focos:**\n${JSON.stringify(rubrica.focos, null, 2)}\n\n`
    }
    
    contexto += `**Criterios de evaluación:**\n`
    contexto += JSON.stringify(rubrica.criterios, null, 2)
    contexto += '\n\n**Niveles de desempeño:**\n'
    contexto += JSON.stringify(rubrica.niveles_desempeño, null, 2)
    contexto += '\n\n---\n\n'
  }

  return contexto
}

// ✅ CORRECCIÓN: Prompt actualizado con estructura oficial
function construirPromptPlanificacion(
  planificacion: any,
  contextoMBE: string,
  asignatura: string,
  nivel: string,
  año: number
): string {
  return `
# ANÁLISIS DE PLANIFICACIÓN - PORTAFOLIO DOCENTE CHILE ${año}

## CONTEXTO
Asignatura: ${asignatura}
Nivel Educativo: ${nivel}
Año de Evaluación: ${año}

**IMPORTANTE:** Estás evaluando la **Tarea 1 del Módulo 1: "Planificación de la enseñanza para todos y todas los/as estudiantes"**

Según el Manual Portafolio ${año}, esta tarea tiene DOS SECCIONES:
- **Sección A:** Planificación de las experiencias de aprendizaje (describir 3 experiencias)
- **Sección B:** Fundamentación de la planificación de una experiencia

${contextoMBE}

## PLANIFICACIÓN A EVALUAR

### Sección A: Experiencias de Aprendizaje

#### Experiencia 1:
${JSON.stringify(planificacion.experiencia_1 || {}, null, 2)}

#### Experiencia 2:
${JSON.stringify(planificacion.experiencia_2 || {}, null, 2)}

#### Experiencia 3:
${JSON.stringify(planificacion.experiencia_3 || {}, null, 2)}

### Sección B: Fundamentación
${planificacion.fundamentacion || 'No especificado'}

### Consideración de la Diversidad
${planificacion.atencion_diversidad || 'No especificado'}

## ASPECTOS A EVALUAR (según Manual ${año})

Para alcanzar un **desempeño Competente**, el/la docente debe:

1. **Describir tres experiencias de aprendizaje** que consideren:
   - Objetivo de aprendizaje claro
   - Actividades coherentes con el objetivo
   - Recursos apropiados
   - Tiempo estimado
   - Consideración de diversidad del estudiantado

2. **Fundamentar el diseño** de una de las experiencias:
   - Explicar decisiones pedagógicas
   - Justificar cómo considera la diversidad
   - Relacionar con conocimientos previos
   - Explicar cómo promueve aprendizajes profundos

Para alcanzar un **desempeño Destacado**, además debe:
- Fundamentar decisiones considerando características específicas de sus estudiantes
- Explicar cómo las experiencias se conectan entre sí
- Anticipar posibles dificultades y estrategias de apoyo diferenciado

## INSTRUCCIONES DE EVALUACIÓN

Analiza esta planificación contra los criterios del MBE ${año} proporcionados.

Para cada criterio relevante, evalúa:

1. **Nivel de Desempeño** (Destacado / Competente / Básico / Insuficiente)
2. **Justificación** con **citas textuales** de evidencia
3. **Evidencias citadas** (fragmentos exactos que respaldan tu evaluación)
4. **Fortalezas** identificadas
5. **Aspectos a mejorar**
6. **Sugerencias concretas y accionables**

CRÍTICO:
- Sé EXTREMADAMENTE riguroso: cita evidencias textuales exactas
- NO asumas información que no esté explícita
- Diferencia entre "implícito" y "ausente"
- Considera el contexto (nivel, asignatura, realidad del aula)
- Proporciona feedback que el profesor pueda implementar
- Usa lenguaje constructivo pero preciso

Responde SOLO con un objeto JSON válido con esta estructura:

{
  "criterios_evaluados": [
    {
      "nombre": "string",
      "dominio_mbe": "A" | "B" | "C" | "D",
      "estandar_numero": number (1-12),
      "estandar_nombre": "string",
      "focos_relacionados": ["string", ...],
      "descriptores_relacionados": ["string", ...],
      "nivel": "Destacado" | "Competente" | "Básico" | "Insuficiente",
      "justificacion": "string detallada",
      "evidencias_citadas": ["cita textual 1", "cita textual 2", ...],
      "fortalezas": ["string", ...],
      "aspectos_mejorar": ["string", ...],
      "sugerencias": ["string accionable y específica", ...]
    }
  ],
  "aspectos_evaluacion": [
    {
      "nombre_aspecto": "Describe tres experiencias de aprendizaje",
      "tarea_relacionada": "Tarea 1A",
      "cumple_competente": boolean,
      "cumple_destacado": boolean,
      "observaciones": "string"
    },
    {
      "nombre_aspecto": "Fundamenta el diseño considerando diversidad",
      "tarea_relacionada": "Tarea 1B",
      "cumple_competente": boolean,
      "cumple_destacado": boolean,
      "observaciones": "string"
    }
  ],
  "puntaje_estimado": number (1.0 a 4.0, con 1 decimal),
  "categoria_logro": "A" | "B" | "C" | "D" | "E",
  "nivel_desempeño": "Destacado" | "Competente" | "Básico" | "Insuficiente",
  "resumen": "string (2-3 párrafos, máximo 500 palabras)",
  "recomendaciones_priorizadas": [
    "top 5 mejoras de mayor impacto, ordenadas por prioridad"
  ]
}
`
}

// ✅ CORRECCIÓN: System prompt actualizado
const SYSTEM_PROMPT_EVALUADOR = `
Eres un evaluador experto del Sistema de Reconocimiento del Desarrollo Profesional Docente de Chile.

Tu rol es analizar portafolios docentes según:
1. Marco para la Buena Enseñanza (MBE) 2021 - 4 dominios, 12 estándares
2. Rúbricas oficiales del Portafolio 2025 publicadas por DocenteMás
3. Manuales específicos por modalidad y nivel

JERARQUÍA DEL MBE 2021:
- 4 Dominios: A (Preparación), B (Ambiente), C (Enseñanza), D (Responsabilidades)
- 12 Estándares (distribuidos en los 4 dominios)
- Cada estándar tiene Focos y Descriptores específicos

NIVELES DE DESEMPEÑO OFICIALES:
- **Destacado:** Supera lo esperado, evidencia reflexión profunda y prácticas excepcionales
- **Competente:** Cumple con lo esperado según estándares profesionales
- **Básico:** Cumple parcialmente, necesita mejoras significativas  
- **Insuficiente:** No alcanza el desempeño esperado

CATEGORÍAS DE LOGRO (A-E):
- A: Destacado (3.5 - 4.0)
- B: Competente Alto (3.0 - 3.4)
- C: Competente (2.5 - 2.9)
- D: Básico (2.0 - 2.4)
- E: Insuficiente (1.0 - 1.9)

PRINCIPIOS DE EVALUACIÓN:
1. Basarte ESTRICTAMENTE en evidencia observable y documentada
2. Citar evidencias textuales exactas (entre comillas)
3. Ser riguroso pero constructivo y formativo
4. Proporcionar feedback específico, accionable y contextualizado
5. Considerar diversidad, contexto educativo y realidad del aula
6. Promover reflexión pedagógica y mejora continua
7. NO asumir información que no está explícita
8. Diferenciar claramente entre "implícito" y "ausente"

Tu análisis debe ayudar al docente a:
- Comprender sus fortalezas y áreas de mejora
- Prepararse para la evaluación oficial
- Mejorar su práctica pedagógica

IMPORTANTE: Este es un análisis FORMATIVO para preparación, NO es la evaluación oficial.
`

// ✅ AGREGADO: Función para calcular categoría de logro
function calcularCategoriaLogro(puntaje: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (puntaje >= 3.5) return 'A' // Destacado
  if (puntaje >= 3.0) return 'B' // Competente Alto
  if (puntaje >= 2.5) return 'C' // Competente
  if (puntaje >= 2.0) return 'D' // Básico
  return 'E' // Insuficiente
}

function calcularCosto(
  modelo: string, 
  promptTokens: number, 
  completionTokens: number
): number {
  const PRECIOS: Record<string, { input: number; output: number }> = {
    'gpt-4-turbo-preview': { input: 0.01 / 1000, output: 0.03 / 1000 },
    'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
    'claude-3-5-sonnet-20241022': { input: 0.003 / 1000, output: 0.015 / 1000 },
  }

  const precio = PRECIOS[modelo] || PRECIOS['gpt-4-turbo-preview']
  
  return (
    (promptTokens * precio.input) + 
    (completionTokens * precio.output)
  )
}

async function actualizarMetricas(
  supabase: any,
  userId: string,
  incrementos: {
    analisis_planificacion?: number
    tokens_usados?: number
    costo_usd?: number
  }
) {
  const hoy = new Date().toISOString().split('T')[0]

  await supabase.rpc('incrementar_metricas_uso', {
    p_profesor_id: userId,
    p_fecha: hoy,
    ...incrementos
  })
}