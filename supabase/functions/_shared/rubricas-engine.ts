// supabase/functions/_shared/rubricas-engine.ts
// Motor completo de evaluación de rúbricas MBE 2025

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { IAEvaluator } from './ia-evaluator.ts'
import { Logger } from './logger.ts'

// Tipos
export interface Rubrica {
  id: string
  indicador_id: string
  nombre_indicador: string
  descripcion_general: string
  año_vigencia: number
  nivel_educativo: string
  asignatura: string | null
  modulo: number
  tarea: number | null
  peso_porcentaje: number
  niveles_desempeno: NivelesDesempeno
  fuente_oficial: string
  pagina_manual: number
  notas_aclaratorias: string
  ejemplos: string[]
}

export interface NivelesDesempeno {
  destacado: NivelDetalle
  competente: NivelDetalle
  basico: NivelDetalle
  insatisfactorio: NivelDetalle
}

export interface NivelDetalle {
  nivel: string
  letra: string
  puntaje: number
  logica: 'AND' | 'OR'
  descripcion: string
  condiciones: Condicion[]
  notas?: string
}

export interface Condicion {
  id: string
  descripcion: string
  tipo: string
  requiere_evidencia: boolean
  criterios: {
    palabras_clave?: string[]
    longitud_minima?: number
    elementos_requeridos?: string[]
    patron?: string
  }
  peso?: number
}

export interface CondicionEvaluada {
  condicion_id: string
  descripcion: string
  cumple: boolean
  evidencia_textual: string
  razon: string
}

export interface Recomendacion {
  prioridad: 'alta' | 'media' | 'baja'
  accion: string
  impacto: string
}

export interface EvaluacionPreliminar {
  nivel_alcanzado: string
  puntaje: number
  condiciones_evaluadas: CondicionEvaluada[]
  condiciones_cumplidas: number
  condiciones_totales: number
  justificacion: string
  para_siguiente_nivel?: string
  fortalezas: string[]
  recomendaciones: Recomendacion[]
  evidencias_destacadas: string[]
}

export interface EvaluacionIndicador extends EvaluacionPreliminar {
  correccion_aplicada: boolean
  nota_correccion?: string
  promedio_nacional?: number
  desviacion_estandar?: number
  percentil?: number
}

export interface ContextoRubricas {
  año: number
  nivel_educativo: string
  asignatura: string
  modulo: number
  tarea?: number
}

export class RubricasEngine {
  private logger: Logger

  constructor(
    private supabase: SupabaseClient,
    context: string = 'RubricasEngine'
  ) {
    this.logger = new Logger(context)
  }

  /**
   * Cargar rúbricas relevantes según contexto
   */
  async cargarRubricas(contexto: ContextoRubricas): Promise<Rubrica[]> {
    this.logger.info('Cargando rúbricas...', contexto)

    let query = this.supabase
      .from('rubricas_mbe')
      .select('*')
      .eq('año_vigencia', contexto.año)
      .eq('nivel_educativo', contexto.nivel_educativo)
      .eq('modulo', contexto.modulo)
      .eq('activo', true)

    // Filtrar por asignatura (o generalista)
    query = query.or(`asignatura.eq.${contexto.asignatura},asignatura.is.null`)

    // Filtrar por tarea si se especifica
    if (contexto.tarea) {
      query = query.eq('tarea', contexto.tarea)
    }

    const { data, error } = await query.order('indicador_id')

    if (error) {
      throw new Error(`Error cargando rúbricas: ${error.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error(`No se encontraron rúbricas para el contexto especificado`)
    }

    this.logger.info(`✅ Cargadas ${data.length} rúbricas`)

    return data as Rubrica[]
  }

  /**
   * Evaluar un indicador específico
   */
  async evaluarIndicador(
    rubrica: Rubrica,
    contenido: string,
    iaEvaluator: IAEvaluator
  ): Promise<EvaluacionIndicador> {
    this.logger.info(`📊 Evaluando indicador: ${rubrica.indicador_id}`)

    // 1. Construir prompt
    const prompt = this.construirPrompt(rubrica, contenido)

    // 2. Llamar a IA
    const respuestaIA = await iaEvaluator.evaluar(prompt)

    // 3. Parsear y validar respuesta
    const evaluacionPreliminar = this.parsearRespuesta(respuestaIA.contenido)

    // 4. Verificar lógica de condiciones
    const evaluacionValidada = this.verificarLogica(evaluacionPreliminar, rubrica)

    // 5. Enriquecer con estadísticas
    const evaluacionFinal = await this.enriquecerConEstadisticas(
      evaluacionValidada,
      rubrica
    )

    this.logger.info(
      `✅ Indicador evaluado: ${evaluacionFinal.nivel_alcanzado} (${evaluacionFinal.puntaje})`
    )

    return evaluacionFinal
  }

  /**
   * Construir prompt especializado para el indicador
   */
  private construirPrompt(rubrica: Rubrica, contenido: string): string {
    const niveles = rubrica.niveles_desempeno

    const prompt = `# EVALUACIÓN DE INDICADOR - SISTEMA DOCENTE CHILE

## CONTEXTO
Eres un evaluador experto del Sistema de Reconocimiento Profesional Docente de Chile (MINEDUC).
Tu tarea es evaluar objetivamente el desempeño de un/a docente según las rúbricas oficiales del Marco para la Buena Enseñanza (MBE).

## INDICADOR A EVALUAR
**ID:** ${rubrica.indicador_id}
**Nombre:** ${rubrica.nombre_indicador}
**Descripción:** ${rubrica.descripcion_general}

## NIVELES DE DESEMPEÑO

### 🌟 NIVEL DESTACADO (4.0 puntos)
${niveles.destacado.descripcion}

**Condiciones (deben cumplirse ${niveles.destacado.logica === 'AND' ? 'TODAS' : 'AL MENOS UNA'}):**
${niveles.destacado.condiciones.map((c, i) => `${i + 1}. ${c.descripcion}`).join('\n')}

${niveles.destacado.notas ? `\n**Notas:** ${niveles.destacado.notas}\n` : ''}

### ✅ NIVEL COMPETENTE (3.0 puntos)
${niveles.competente.descripcion}

**Condiciones (deben cumplirse ${niveles.competente.logica === 'AND' ? 'TODAS' : 'AL MENOS UNA'}):**
${niveles.competente.condiciones.map((c, i) => `${i + 1}. ${c.descripcion}`).join('\n')}

### ⚠️ NIVEL BÁSICO (2.0 puntos)
${niveles.basico.descripcion}

**Condiciones (deben cumplirse ${niveles.basico.logica === 'AND' ? 'TODAS' : 'AL MENOS UNA'}):**
${niveles.basico.condiciones.map((c, i) => `${i + 1}. ${c.descripcion}`).join('\n')}

### ❌ NIVEL INSATISFACTORIO (1.0 puntos)
${niveles.insatisfactorio.descripcion}

## CONTENIDO DEL/LA DOCENTE A EVALUAR
\`\`\`
${contenido}
\`\`\`

## INSTRUCCIONES DE EVALUACIÓN

1. **Lee cuidadosamente** todo el contenido del docente
2. **Identifica evidencias** textuales que demuestren cumplimiento de condiciones
3. **Determina el nivel** más alto alcanzado según las condiciones cumplidas
4. **Justifica** tu decisión con claridad
5. **Sugiere mejoras** específicas y accionables

## REGLAS CRÍTICAS

- ⚠️ **NO seas benévolo**: Evalúa con el mismo rigor que los evaluadores oficiales
- ⚠️ **NO asumas**: Si no hay evidencia explícita, la condición NO se cumple
- ⚠️ **SÉ ESTRICTO** con la lógica AND: deben cumplirse TODAS las condiciones
- ⚠️ **CITA textualmente**: Cada evidencia debe tener una cita del contenido
- ⚠️ **SÉ ESPECÍFICO**: Las recomendaciones deben ser concretas y aplicables

## RESPONDE SOLO CON ESTE JSON (sin markdown, sin comentarios):

{
  "nivel_alcanzado": "Destacado" | "Competente" | "Básico" | "Insatisfactorio",
  "puntaje": 4.0 | 3.0 | 2.0 | 1.0,
  "condiciones_evaluadas": [
    {
      "condicion_id": "D_1",
      "descripcion": "descripción de la condición",
      "cumple": true,
      "evidencia_textual": "cita exacta del contenido",
      "razon": "por qué cumple o no"
    }
  ],
  "condiciones_cumplidas": 2,
  "condiciones_totales": 3,
  "justificacion": "Explicación de 2-3 oraciones",
  "para_siguiente_nivel": "Qué falta para el siguiente nivel",
  "fortalezas": ["fortaleza 1", "fortaleza 2"],
  "recomendaciones": [
    {
      "prioridad": "alta",
      "accion": "acción específica",
      "impacto": "cómo mejorará"
    }
  ],
  "evidencias_destacadas": ["cita 1", "cita 2"]
}
`

    return prompt
  }

  /**
   * Parsear respuesta de IA
   */
  private parsearRespuesta(respuestaIA: string): EvaluacionPreliminar {
    // Limpiar markdown
    let jsonText = respuestaIA.trim()
    jsonText = jsonText.replace(/```json\s*/g, '')
    jsonText = jsonText.replace(/```\s*/g, '')
    jsonText = jsonText.replace(/\/\/.*$/gm, '')

    // Buscar primer { y último }
    const start = jsonText.indexOf('{')
    const end = jsonText.lastIndexOf('}')

    if (start === -1 || end === -1) {
      throw new Error('No se encontró JSON válido en la respuesta')
    }

    jsonText = jsonText.substring(start, end + 1)

    try {
      const parsed = JSON.parse(jsonText)

      // Validar estructura
      if (!parsed.nivel_alcanzado || !parsed.puntaje || !parsed.condiciones_evaluadas) {
        throw new Error('JSON incompleto: faltan campos requeridos')
      }

      return parsed as EvaluacionPreliminar
    } catch (error) {
      throw new Error(
        `Error parseando JSON: ${error instanceof Error ? error.message : String(error)}\n\nJSON: ${jsonText}`
      )
    }
  }

  /**
   * Verificar que la lógica de condiciones sea correcta
   */
  private verificarLogica(
    evaluacion: EvaluacionPreliminar,
    rubrica: Rubrica
  ): EvaluacionIndicador {
    const nivel = evaluacion.nivel_alcanzado.toLowerCase() as keyof NivelesDesempeno
    const nivelConfig = rubrica.niveles_desempeno[nivel]

    if (!nivelConfig) {
      throw new Error(`Nivel no válido: ${evaluacion.nivel_alcanzado}`)
    }

    // Contar condiciones cumplidas
    const cumplidas = evaluacion.condiciones_evaluadas.filter((c) => c.cumple).length
    const totales = nivelConfig.condiciones.length

    // Verificar lógica
    let nivelCorrecto = false

    if (nivelConfig.logica === 'AND') {
      nivelCorrecto = cumplidas === totales
    } else {
      nivelCorrecto = cumplidas >= 1
    }

    if (!nivelCorrecto) {
      this.logger.warn(`Lógica inconsistente detectada para ${rubrica.indicador_id}`, {
        nivel_asignado: evaluacion.nivel_alcanzado,
        logica_requerida: nivelConfig.logica,
        cumplidas,
        totales,
      })

      // Forzar nivel correcto
      const nivelForzado = this.determinarNivelCorrecto(evaluacion, rubrica)

      this.logger.warn(`Nivel corregido a: ${nivelForzado}`)

      return {
        ...evaluacion,
        nivel_alcanzado: nivelForzado,
        puntaje: this.getPuntajeNivel(nivelForzado),
        correccion_aplicada: true,
        nota_correccion: 'El nivel fue ajustado automáticamente según la lógica de condiciones',
      }
    }

    return {
      ...evaluacion,
      correccion_aplicada: false,
    }
  }

  /**
   * Determinar nivel correcto basado en condiciones
   */
  private determinarNivelCorrecto(
    evaluacion: EvaluacionPreliminar,
    rubrica: Rubrica
  ): string {
    const niveles = ['destacado', 'competente', 'basico', 'insatisfactorio'] as const

    for (const nivelKey of niveles) {
      const nivel = rubrica.niveles_desempeno[nivelKey]

      // Contar cuántas condiciones de este nivel se cumplen
      const condicionesCumplidas = evaluacion.condiciones_evaluadas.filter(
        (c) => nivel.condiciones.some((nc) => nc.id === c.condicion_id) && c.cumple
      ).length

      const condicionesTotales = nivel.condiciones.length

      // Verificar si cumple la lógica de este nivel
      if (nivel.logica === 'AND' && condicionesCumplidas === condicionesTotales) {
        return nivel.nivel
      }

      if (nivel.logica === 'OR' && condicionesCumplidas >= 1) {
        return nivel.nivel
      }
    }

    // Si no cumple ningún nivel superior, es Insatisfactorio
    return 'Insatisfactorio'
  }

  /**
   * Obtener puntaje según nivel
   */
  private getPuntajeNivel(nivel: string): number {
    const puntajes: Record<string, number> = {
      Destacado: 4.0,
      Competente: 3.0,
      Básico: 2.0,
      Insatisfactorio: 1.0,
    }
    return puntajes[nivel] || 1.0
  }

  /**
   * Enriquecer evaluación con estadísticas
   */
  private async enriquecerConEstadisticas(
    evaluacion: EvaluacionIndicador,
    rubrica: Rubrica
  ): Promise<EvaluacionIndicador> {
    try {
      const { data: stats } = await this.supabase
        .from('estadisticas_indicadores')
        .select('puntaje_promedio, desviacion_estandar')
        .eq('indicador_id', rubrica.indicador_id)
        .eq('año', new Date().getFullYear())
        .eq('nivel_educativo', rubrica.nivel_educativo)
        .single()

      if (stats) {
        return {
          ...evaluacion,
          promedio_nacional: stats.puntaje_promedio,
          desviacion_estandar: stats.desviacion_estandar,
          percentil: this.calcularPercentil(
            evaluacion.puntaje,
            stats.puntaje_promedio,
            stats.desviacion_estandar
          ),
        }
      }
    } catch (error) {
      // No hay estadísticas disponibles, continuar sin ellas
      this.logger.debug('No hay estadísticas disponibles para este indicador')
    }

    return evaluacion
  }

  /**
   * Calcular percentil aproximado
   */
  private calcularPercentil(puntaje: number, promedio: number, desviacion: number): number {
    if (desviacion === 0) return 50

    // Calcular Z-score
    const z = (puntaje - promedio) / desviacion

    // Aproximación de percentil usando función de distribución normal
    const percentil = 0.5 * (1 + this.erf(z / Math.sqrt(2)))

    return Math.round(percentil * 100)
  }

  /**
   * Función de error (aproximación)
   */
  private erf(x: number): number {
    const sign = x >= 0 ? 1 : -1
    x = Math.abs(x)

    const a1 = 0.254829592
    const a2 = -0.284496736
    const a3 = 1.421413741
    const a4 = -1.453152027
    const a5 = 1.061405429
    const p = 0.3275911

    const t = 1.0 / (1.0 + p * x)
    const y =
      1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

    return sign * y
  }
}
