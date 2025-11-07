// supabase/functions/_shared/ia-evaluator.ts
// Evaluador de IA que soporta Claude (Anthropic) y GPT-4 (OpenAI)

import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.20.0'
import OpenAI from 'https://esm.sh/openai@4.28.0'

export interface ConfiguracionIA {
  modelo: 'claude-sonnet-4' | 'claude-opus-4' | 'gpt-4-turbo' | 'gpt-4o'
  apiKey: string
  temperatura?: number
  maxTokens?: number
  timeout?: number
}

export interface ResultadoIA {
  contenido: string
  tokens_utilizados: number
  tiempo_ms: number
  modelo: string
  error?: string
}

export class IAEvaluator {
  private config: ConfiguracionIA
  private clienteAnthropic?: Anthropic
  private clienteOpenAI?: OpenAI

  constructor(config: ConfiguracionIA) {
    this.config = {
      temperatura: 0.3, // Baja temperatura para evaluaciones consistentes
      maxTokens: 4000,
      timeout: 60000, // 60 segundos
      ...config,
    }

    // Inicializar cliente según modelo
    if (this.config.modelo.startsWith('claude')) {
      this.clienteAnthropic = new Anthropic({
        apiKey: this.config.apiKey,
      })
    } else {
      this.clienteOpenAI = new OpenAI({
        apiKey: this.config.apiKey,
      })
    }
  }

  /**
   * Evaluar usando IA
   */
  async evaluar(prompt: string): Promise<ResultadoIA> {
    const inicio = Date.now()

    try {
      if (this.config.modelo.startsWith('claude')) {
        return await this.evaluarConClaude(prompt, inicio)
      } else {
        return await this.evaluarConGPT(prompt, inicio)
      }
    } catch (error) {
      const tiempo_ms = Date.now() - inicio
      throw new Error(`Error en evaluación IA: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Evaluar con Claude (Anthropic)
   */
  private async evaluarConClaude(prompt: string, inicio: number): Promise<ResultadoIA> {
    if (!this.clienteAnthropic) {
      throw new Error('Cliente Anthropic no inicializado')
    }

    const modeloMap: Record<string, string> = {
      'claude-sonnet-4': 'claude-sonnet-4-20250514',
      'claude-opus-4': 'claude-opus-4-20250514',
    }

    const modeloReal = modeloMap[this.config.modelo] || 'claude-sonnet-4-20250514'

    const response = await this.clienteAnthropic.messages.create({
      model: modeloReal,
      max_tokens: this.config.maxTokens!,
      temperature: this.config.temperatura!,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const tiempo_ms = Date.now() - inicio

    // Extraer contenido de texto
    const contenido = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n')

    return {
      contenido,
      tokens_utilizados: response.usage.input_tokens + response.usage.output_tokens,
      tiempo_ms,
      modelo: modeloReal,
    }
  }

  /**
   * Evaluar con GPT-4 (OpenAI)
   */
  private async evaluarConGPT(prompt: string, inicio: number): Promise<ResultadoIA> {
    if (!this.clienteOpenAI) {
      throw new Error('Cliente OpenAI no inicializado')
    }

    const modeloMap: Record<string, string> = {
      'gpt-4-turbo': 'gpt-4-turbo-preview',
      'gpt-4o': 'gpt-4o',
    }

    const modeloReal = modeloMap[this.config.modelo] || 'gpt-4-turbo-preview'

    const response = await this.clienteOpenAI.chat.completions.create({
      model: modeloReal,
      messages: [
        {
          role: 'system',
          content: 'Eres un evaluador experto del Sistema de Reconocimiento Profesional Docente de Chile (MINEDUC). Respondes solo en formato JSON válido.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: this.config.temperatura!,
      max_tokens: this.config.maxTokens!,
      response_format: { type: 'json_object' },
    })

    const tiempo_ms = Date.now() - inicio

    const contenido = response.choices[0]?.message?.content || ''

    return {
      contenido,
      tokens_utilizados: response.usage?.total_tokens || 0,
      tiempo_ms,
      modelo: modeloReal,
    }
  }
}
