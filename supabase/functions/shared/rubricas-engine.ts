// supabase/functions/shared/rubricas-engine.ts

import { RubricaCompleta, ContenidoTarea, EvaluacionIndicador, CondicionVerificada } from './types.ts'

export class RubricasEngine {
  
  /**
   * Evalúa un indicador completo contra su rúbrica oficial
   */
  async evaluarIndicador(
    rubrica: RubricaCompleta,
    contenido: ContenidoTarea,
    evaluadorIA: any
  ): Promise<EvaluacionIndicador> {
    
    const startTime = Date.now()
    let tokensUsados = 0
    
    // Evaluar cada nivel de arriba hacia abajo
    const niveles: Array<'destacado' | 'competente' | 'basico'> = [
      'destacado',
      'competente', 
      'basico'
    ]
    
    for (const nombreNivel of niveles) {
      const nivel = rubrica[`nivel_${nombreNivel}`]
      
      const verificacion = await this.verificarNivel(
        nivel,
        contenido,
        rubrica,
        evaluadorIA
      )
      
      tokensUsados += verificacion.tokens_usados
      
      if (verificacion.cumple_nivel) {
        return {
          indicador_id: rubrica.indicador_id,
          nombre_indicador: rubrica.nombre_indicador,
          nivel_alcanzado: this.capitalizarNivel(nombreNivel),
          puntaje: nivel.puntaje,
          confianza: verificacion.confianza,
          condiciones_evaluadas: verificacion.condiciones,
          condiciones_cumplidas: verificacion.condiciones.filter(c => c.cumple).length,
          condiciones_totales: verificacion.condiciones.length,
          evidencias_textuales: verificacion.evidencias,
          justificacion: verificacion.justificacion,
          para_siguiente_nivel: await this.analizarGap(nombreNivel, niveles, rubrica, verificacion),
          acciones_concretas: await this.generarAcciones(nombreNivel, rubrica, verificacion, evaluadorIA),
          tiempo_evaluacion_ms: Date.now() - startTime,
          tokens_usados: tokensUsados
        }
      }
    }
    
    // No cumple ningún nivel → Insatisfactorio
    const nivelInsuf = rubrica.nivel_insatisfactorio
    
    return {
      indicador_id: rubrica.indicador_id,
      nombre_indicador: rubrica.nombre_indicador,
      nivel_alcanzado: 'Insatisfactorio',
      puntaje: 1.0,
      confianza: 0.9,
      condiciones_evaluadas: [],
      condiciones_cumplidas: 0,
      condiciones_totales: 0,
      evidencias_textuales: [],
      justificacion: nivelInsuf.descripcion,
      para_siguiente_nivel: `Para alcanzar nivel Básico: ${rubrica.nivel_basico.descripcion}`,
      acciones_concretas: await this.generarAccionesBasico(rubrica, contenido, evaluadorIA),
      tiempo_evaluacion_ms: Date.now() - startTime,
      tokens_usados: tokensUsados
    }
  }
  
  /**
   * Verifica si se cumplen todas las condiciones de un nivel
   */
  private async verificarNivel(
    nivel: any,
    contenido: ContenidoTarea,
    rubrica: RubricaCompleta,
    evaluadorIA: any
  ): Promise<{
    cumple_nivel: boolean
    confianza: number
    condiciones: CondicionVerificada[]
    evidencias: string[]
    justificacion: string
    tokens_usados: number
  }> {
    
    let tokensUsados = 0
    const condicionesVerificadas: CondicionVerificada[] = []
    const todasEvidencias: string[] = []
    
    // Verificar cada condición
    for (const condicion of nivel.condiciones) {
      const verificacion = await this.verificarCondicion(
        condicion,
        contenido,
        rubrica,
        evaluadorIA
      )
      
      condicionesVerificadas.push(verificacion)
      todasEvidencias.push(...verificacion.evidencias_encontradas)
      tokensUsados += verificacion.tokens_usados || 0
    }
    
    // Aplicar lógica AND/OR
    const cumpleNivel = this.aplicarLogica(
      nivel.operador_logico,
      condicionesVerificadas
    )
    
    // Calcular confianza promedio
    const confianzaPromedio = condicionesVerificadas.reduce(
      (sum, c) => sum + c.confianza, 0
    ) / condicionesVerificadas.length
    
    // Generar justificación
    const justificacion = this.generarJustificacion(
      cumpleNivel,
      condicionesVerificadas,
      todasEvidencias
    )
    
    return {
      cumple_nivel: cumpleNivel,
      confianza: confianzaPromedio,
      condiciones: condicionesVerificadas,
      evidencias: [...new Set(todasEvidencias)], // Eliminar duplicados
      justificacion,
      tokens_usados: tokensUsados
    }
  }
  
  /**
   * Verifica una condición individual
   */
  private async verificarCondicion(
    condicion: any,
    contenido: ContenidoTarea,
    rubrica: RubricaCompleta,
    evaluadorIA: any
  ): Promise<CondicionVerificada & { tokens_usados?: number }> {
    
    // Extraer contenido relevante para esta condición
    const contenidoRelevante = this.extraerContenidoRelevante(
      contenido,
      rubrica.evidencia_revisar
    )
    
    // Construir prompt específico
    const prompt = this.construirPromptVerificacion(
      condicion,
      contenidoRelevante,
      rubrica
    )
    
    // Llamar a LIA
    const respuesta = await evaluadorIA.verificarCondicion(prompt)
    
    return {
      condicion_id: condicion.id,
      texto_condicion: condicion.texto,
      cumple: respuesta.cumple,
      confianza: respuesta.confianza,
      evidencias_encontradas: respuesta.evidencias_textuales || [],
      razonamiento: respuesta.justificacion,
      tokens_usados: respuesta.tokens_usados
    }
  }
  
  /**
   * Construye el prompt de verificación para una condición
   */
  private construirPromptVerificacion(
    condicion: any,
    contenido: string,
    rubrica: RubricaCompleta
  ): string {
    
    return `# VERIFICACIÓN DE CONDICIÓN - RÚBRICA OFICIAL MINEDUC 2025

## CONTEXTO DEL INDICADOR
**Indicador:** ${rubrica.nombre_indicador}
**Descripción:** ${rubrica.descripcion_indicador}

## CONDICIÓN A VERIFICAR
${condicion.texto}

${condicion.palabras_clave ? `**Palabras clave a buscar:** ${condicion.palabras_clave.join(', ')}` : ''}

## CONTENIDO DEL PROFESOR EVALUADO
${contenido}

## NOTAS ACLARATORIAS OFICIALES
${rubrica.notas_aclaratorias.map((nota, i) => `${i + 1}. ${nota}`).join('\n')}

## INSTRUCCIONES DE EVALUACIÓN

Eres un evaluador experto del Sistema de Reconocimiento Docente de Chile.

Tu tarea es determinar si el contenido del profesor cumple **EXACTAMENTE** con la condición especificada según la rúbrica oficial.

**CRITERIOS DE RIGOR:**
1. ✅ SOLO marca como cumplida si hay evidencia EXPLÍCITA y VERIFICABLE
2. ❌ Si algo es implícito, ambiguo o requiere inferencia → NO cumple
3. 📎 Cita fragmentos textuales EXACTOS como evidencia (entre comillas)
4. 🔍 Considera definiciones oficiales de las notas aclaratorias
5. ⚖️ Sé consistente: mismos criterios para todos los docentes

**CUANTIFICADORES:**
${this.explicarCuantificador(condicion)}

Responde SOLO con un objeto JSON válido:

\`\`\`json
{
  "cumple": boolean,
  "confianza": number, // 0.0 a 1.0
  "evidencias_textuales": [
    "cita textual exacta 1",
    "cita textual exacta 2"
  ],
  "justificacion": "string explicando por qué cumple o no cumple, referenciando las evidencias",
  "que_falta_si_no_cumple": "string específico sobre qué debería agregar o modificar el profesor"
}
\`\`\`

IMPORTANTE: No incluyas markdown, solo el JSON puro.`
  }
  
  /**
   * Explica el cuantificador de la condición
   */
  private explicarCuantificador(condicion: any): string {
    if (!condicion.cuantificador) return ''
    
    const explicaciones = {
      'todos': '- "TODOS" significa 100% sin excepción. Si falta aunque sea uno, NO cumple.',
      'mayoria': '- "La mayoría" significa más del 50%. Cuenta cuántos hay y verifica que sean >50%.',
      'al_menos_uno': '- "Al menos uno" significa 1 o más. Pero solo marca cumplido si realmente existe.',
      'ninguno': '- "Ninguno" significa 0, cero absoluto. Si existe aunque sea uno, NO cumple.'
    }
    
    return explicaciones[condicion.cuantificador] || ''
  }
  
  /**
   * Extrae contenido relevante para evaluar
   */
  private extraerContenidoRelevante(
    contenido: ContenidoTarea,
    evidenciasRevisar: string[]
  ): string {
    
    let textoRelevante = ''
    
    for (const path of evidenciasRevisar) {
      const partes = path.split('.')
      let valor = contenido.contenido
      
      for (const parte of partes) {
        if (valor && typeof valor === 'object' && parte in valor) {
          valor = valor[parte]
        } else {
          valor = undefined
          break
        }
      }
      
      if (valor) {
        textoRelevante += `\n### ${path}:\n${JSON.stringify(valor, null, 2)}\n`
      }
    }
    
    return textoRelevante || JSON.stringify(contenido.contenido, null, 2)
  }
  
  /**
   * Aplica lógica AND/OR
   */
  private aplicarLogica(
    operador: 'AND' | 'OR',
    condiciones: CondicionVerificada[]
  ): boolean {
    
    if (operador === 'AND') {
      return condiciones.every(c => c.cumple)
    } else {
      return condiciones.some(c => c.cumple)
    }
  }
  
  /**
   * Genera justificación narrativa
   */
  private generarJustificacion(
    cumpleNivel: boolean,
    condiciones: CondicionVerificada[],
    evidencias: string[]
  ): string {
    
    if (cumpleNivel) {
      const cumplidas = condiciones.filter(c => c.cumple)
      return `El docente alcanza este nivel porque cumple con ${cumplidas.length} de ${condiciones.length} condiciones requeridas. ${
        cumplidas.map(c => `• ${c.texto_condicion}: ${c.razonamiento}`).join(' ')
      }`
    } else {
      const noCumplidas = condiciones.filter(c => !c.cumple)
      return `El docente no alcanza este nivel porque no cumple con ${noCumplidas.length} condiciones: ${
        noCumplidas.map(c => `• ${c.texto_condicion}: ${c.razonamiento}`).join(' ')
      }`
    }
  }
  
  /**
   * Analiza qué falta para el siguiente nivel
   */
  private async analizarGap(
    nivelActual: string,
    todosNiveles: string[],
    rubrica: RubricaCompleta,
    verificacionActual: any
  ): Promise<string> {
    
    const indiceActual = todosNiveles.indexOf(nivelActual)
    if (indiceActual === 0) return '' // Ya está en el máximo
    
    const siguienteNivel = todosNiveles[indiceActual - 1]
    const nivelSiguiente = rubrica[`nivel_${siguienteNivel}`]
    
    return `Para alcanzar nivel ${this.capitalizarNivel(siguienteNivel)}, debes: ${nivelSiguiente.descripcion}`
  }
  
  /**
   * Genera acciones concretas
   */
  private async generarAcciones(
    nivelActual: string,
    rubrica: RubricaCompleta,
    verificacion: any,
    evaluadorIA: any
  ): Promise<string[]> {
    
    const condicionesNoCumplidas = verificacion.condiciones.filter((c: any) => !c.cumple)
    
    if (condicionesNoCumplidas.length === 0) {
      return ['✅ Mantén este nivel de calidad en tu portafolio final']
    }
    
    const acciones: string[] = []
    
    for (const condicion of condicionesNoCumplidas) {
      if (condicion.que_falta_si_no_cumple) {
        acciones.push(`🔧 ${condicion.que_falta_si_no_cumple}`)
      }
    }
    
    return acciones
  }
  
  private async generarAccionesBasico(
    rubrica: RubricaCompleta,
    contenido: ContenidoTarea,
    evaluadorIA: any
  ): Promise<string[]> {
    
    return [
      `📝 Revisa los requisitos del nivel Básico: ${rubrica.nivel_basico.descripcion}`,
      `📚 Consulta las notas aclaratorias en el manual oficial`,
      `🎯 Enfócate primero en cumplir las condiciones mínimas`
    ]
  }
  
  private capitalizarNivel(nivel: string): 'Insatisfactorio' | 'Básico' | 'Competente' | 'Destacado' {
    const mapa: Record<string, any> = {
      'insatisfactorio': 'Insatisfactorio',
      'basico': 'Básico',
      'competente': 'Competente',
      'destacado': 'Destacado'
    }
    return mapa[nivel] || 'Insatisfactorio'
  }
}