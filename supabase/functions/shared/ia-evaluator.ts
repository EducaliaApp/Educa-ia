// supabase/functions/shared/ia-evaluator.ts

import OpenAI from 'https://esm.sh/openai@4'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.9.1'

export interface RespuestaVerificacion {
  cumple: boolean
  confianza: number
  evidencias_textuales: string[]
  justificacion: string
  que_falta_si_no_cumple?: string
  tokens_usados: number
}

export class IAEvaluator {
  private openai: OpenAI
  private anthropic: Anthropic
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!,
    })
    
    this.anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
    })
  }
  
  /**
   * Verifica una condición usando LIA
   */
  async verificarCondicion(
    prompt: string,
    modelo: 'gpt-4-turbo' | 'claude-sonnet-4' = 'claude-sonnet-4'
  ): Promise<RespuestaVerificacion> {
    
    if (modelo === 'gpt-4-turbo') {
      return await this.verificarConGPT(prompt)
    } else {
      return await this.verificarConClaude(prompt)
    }
  }
  
  /**
   * Verificación con GPT-4
   */
  private async verificarConGPT(prompt: string): Promise<RespuestaVerificacion> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT_VERIFICADOR
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2, // Baja temperatura para consistencia
        max_tokens: 2000
      })
      
      const respuesta = JSON.parse(completion.choices[0].message.content!)
      
      return {
        ...respuesta,
        tokens_usados: completion.usage?.total_tokens || 0
      }
    } catch (error) {
      console.error('Error en verificación GPT:', error)
      throw new Error(`Error al verificar con GPT: ${error.message}`)
    }
  }
  
  /**
   * Verificación con Claude
   */
  private async verificarConClaude(prompt: string): Promise<RespuestaVerificacion> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: `${SYSTEM_PROMPT_VERIFICADOR}\n\n${prompt}`
          }
        ]
      })
      
      const content = message.content[0]
      if (content.type !== 'text') {
        throw new Error('Respuesta inesperada de Claude')
      }
      
      // Claude a veces envuelve JSON en markdown
      const textoLimpio = content.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      const respuesta = JSON.parse(textoLimpio)
      
      return {
        ...respuesta,
        tokens_usados: message.usage.input_tokens + message.usage.output_tokens
      }
    } catch (error) {
      console.error('Error en verificación Claude:', error)
      throw new Error(`Error al verificar con Claude: ${error.message}`)
    }
  }
  
  /**
   * Genera análisis comparativo con estadísticas
   */
  async generarAnalisisComparativo(
    evaluacion: any,
    estadisticas: any
  ): Promise<string> {
    
    const prompt = `# ANÁLISIS COMPARATIVO DE DESEMPEÑO

## TU EVALUACIÓN
${JSON.stringify(evaluacion, null, 2)}

## ESTADÍSTICAS NACIONALES
${JSON.stringify(estadisticas, null, 2)}

Genera un análisis breve (2-3 párrafos) que:
1. Compare el desempeño del docente con el promedio nacional
2. Identifique en qué percentil se encuentra
3. Resalte fortalezas relativas
4. Sugiera áreas de oportunidad basadas en el benchmark

Responde en formato markdown, tono profesional pero alentador.`
    
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'Eres un analista experto en evaluación docente.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
    
    return completion.choices[0].message.content!
  }
  
  /**
   * Prioriza recomendaciones por impacto
   */
  async priorizarRecomendaciones(
    indicadoresEvaluados: any[],
    metaDeseada: number = 3.5
  ): Promise<any[]> {
    
    const prompt = `# PRIORIZACIÓN DE MEJORAS

## SITUACIÓN ACTUAL
${JSON.stringify(indicadoresEvaluados, null, 2)}

## META
Alcanzar puntaje de ${metaDeseada}

Analiza los indicadores y genera una lista priorizada de mejoras considerando:
1. Impacto potencial en el puntaje final
2. Facilidad de implementación (tiempo/esfuerzo)
3. Efecto multiplicador (mejora que ayuda en múltiples indicadores)

Responde SOLO con JSON:
\`\`\`json
{
  "recomendaciones": [
    {
      "prioridad": "alta|media|baja",
      "indicador": "nombre del indicador",
      "accion": "descripción específica",
      "impacto_puntos": number,
      "tiempo_horas": number,
      "razon": "por qué es prioritaria"
    }
  ]
}
\`\`\``
    
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500
    })
    
    const respuesta = JSON.parse(completion.choices[0].message.content!)
    return respuesta.recomendaciones
  }
}

const SYSTEM_PROMPT_VERIFICADOR = `Eres un evaluador experto y riguroso del Sistema de Reconocimiento del Desarrollo Profesional Docente de Chile.

Tu responsabilidad es verificar si el contenido presentado por un docente cumple con criterios específicos de las rúbricas oficiales del Portafolio Docente 2025.

PRINCIPIOS DE EVALUACIÓN:
1. **Rigor Extremo:** Solo marca como cumplida una condición si hay evidencia explícita y verificable
2. **Objetividad:** Evalúa basándote SOLO en lo que está escrito, sin inferencias
3. **Consistencia:** Aplica los mismos criterios a todos los docentes
4. **Evidencia Textual:** Siempre cita fragmentos exactos entre comillas
5. **Definiciones Oficiales:** Usa las definiciones del MINEDUC, no interpretaciones personales

ESCALA DE CONFIANZA:
- 0.9-1.0: Evidencia absolutamente clara y explícita
- 0.7-0.89: Evidencia clara pero podría ser más específica
- 0.5-0.69: Evidencia presente pero ambigua
- 0.3-0.49: Evidencia débil o requiere inferencia
- 0.0-0.29: No hay evidencia o es completamente inadecuada

IMPORTANTE: Tu evaluación impacta directamente la progresión profesional del docente. Sé riguroso pero justo.`