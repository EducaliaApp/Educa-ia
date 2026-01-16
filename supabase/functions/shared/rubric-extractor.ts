// supabase/functions/shared/rubric-extractor.ts

interface RubricaExtraida {
  indicador_id: string
  nombre_indicador: string
  descripcion_indicador: string
  evidencia_revisar: string[]
  nivel_insatisfactorio: NivelRubrica
  nivel_basico: NivelRubrica
  nivel_competente: NivelRubrica
  nivel_destacado: NivelRubrica
  notas_aclaratorias: string[]
  nivel_educativo: string
  asignatura?: string
  año_vigencia: number
  modalidad: string
  modulo: number
  tarea: number
}

interface NivelRubrica {
  descripcion: string
  condiciones: CondicionRubrica[]
  operador_logico: 'AND' | 'OR'
  puntaje: number
}

interface CondicionRubrica {
  id: string
  texto: string
  tipo: 'cuantitativa' | 'cualitativa' | 'presencia'
  cuantificador: 'todos' | 'mayoria' | 'al_menos_uno' | 'ninguno'
  verificable_automaticamente: boolean
}

export class RubricExtractor {
  private openai: any

  constructor() {
    // Usar OpenAI como fallback si Anthropic no está disponible
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (openaiKey) {
      this.openai = {
        chat: {
          completions: {
            create: async (params: any) => {
              const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${openaiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
              })
              return await response.json()
            }
          }
        }
      }
    }
  }

  async extraerRubricas(contenidoTexto: string, metadata: any): Promise<RubricaExtraida[]> {
    console.log('🔍 Extrayendo rúbricas del documento...')
    
    // 1. Identificar secciones de rúbricas
    const secciones = this.identificarSeccionesRubricas(contenidoTexto)
    console.log(`  Encontradas ${secciones.length} posibles rúbricas`)
    
    if (secciones.length === 0) {
      return []
    }
    
    // 2. Extraer cada rúbrica
    const rubricas: RubricaExtraida[] = []
    
    for (let i = 0; i < secciones.length; i++) {
      console.log(`  Procesando rúbrica ${i + 1}/${secciones.length}...`)
      
      const rubrica = await this.extraerRubricaIndividual(secciones[i], metadata)
      if (rubrica) {
        rubricas.push(rubrica)
      }
    }
    
    console.log(`  ✅ ${rubricas.length} rúbricas extraídas exitosamente`)
    return rubricas
  }

  private identificarSeccionesRubricas(texto: string): string[] {
    const secciones: string[] = []
    
    // Patrones mejorados para documentos MINEDUC
    const patrones = [
      // Patrón principal: "Rúbrica del indicador" hasta el siguiente
      /Rúbrica del indicador[^:]*:.*?(?=Rúbrica del indicador|$)/gis,
      
      // Patrón de niveles de desempeño
      /(?:INSATISFACTORIO|Insatisfactorio).*?(?:BÁSICO|Básico).*?(?:COMPETENTE|Competente).*?(?:DESTACADO|Destacado).*?(?=(?:INSATISFACTORIO|Insatisfactorio)|$)/gis,
      
      // Patrón de indicadores numerados
      /Indicador\s+\d+[.:]\s*.*?(?=Indicador\s+\d+|$)/gis,
      
      // Patrón de módulos y tareas
      /Módulo\s+\d+.*?Tarea\s+\d+.*?(?=Módulo\s+\d+|$)/gis
    ]
    
    for (const patron of patrones) {
      const matches = Array.from(texto.matchAll(patron))
      for (const match of matches) {
        const seccion = match[0].trim()
        if (seccion.length > 300) { // Filtrar secciones muy cortas
          secciones.push(seccion)
        }
      }
    }
    
    // Eliminar duplicados y ordenar por posición
    return Array.from(new Set(secciones))
  }

  private async extraerRubricaIndividual(
    textoRubrica: string, 
    metadata: any
  ): Promise<RubricaExtraida | null> {
    
    const prompt = `Extrae la información estructurada de esta rúbrica oficial del MINEDUC:

${textoRubrica.substring(0, 6000)}

Identifica:
1. Nombre del indicador
2. Descripción del indicador  
3. Evidencia que se debe revisar
4. Niveles: Insatisfactorio, Básico, Competente, Destacado
5. Condiciones específicas de cada nivel
6. Notas aclaratorias

IMPORTANTE:
- Las condiciones deben ser EXACTAS del texto original
- Identifica operadores lógicos (Y, O)
- Marca cuantificadores (todos, la mayoría, al menos uno)

Responde SOLO con JSON válido:
{
  "indicador_id": "string (ej: 'mod1_tarea1_indicador1')",
  "nombre_indicador": "string",
  "descripcion_indicador": "string",
  "evidencia_revisar": ["string"],
  "nivel_insatisfactorio": {
    "descripcion": "string",
    "condiciones": [],
    "operador_logico": "AND",
    "puntaje": 1.0
  },
  "nivel_basico": {
    "descripcion": "string",
    "condiciones": [
      {
        "id": "condicion_1",
        "texto": "string EXACTO del documento",
        "tipo": "cuantitativa|cualitativa|presencia",
        "cuantificador": "todos|mayoria|al_menos_uno|ninguno",
        "verificable_automaticamente": true
      }
    ],
    "operador_logico": "AND",
    "puntaje": 2.0
  },
  "nivel_competente": {
    "descripcion": "string",
    "condiciones": [],
    "operador_logico": "AND",
    "puntaje": 3.0
  },
  "nivel_destacado": {
    "descripcion": "string", 
    "condiciones": [],
    "operador_logico": "AND",
    "puntaje": 4.0
  },
  "notas_aclaratorias": ["string"]
}

NO inventes información. Si algo no está claro, déjalo vacío.`

    try {
      if (!this.openai) {
        console.warn('  ⚠️ OpenAI no configurado, saltando extracción')
        return null
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 4000
      })
      
      const contenido = response.choices?.[0]?.message?.content
      if (!contenido) {
        console.warn('  ⚠️ No se recibió respuesta de OpenAI')
        return null
      }
      
      const rubrica = JSON.parse(contenido) as RubricaExtraida
      
      // Agregar metadata
      rubrica.nivel_educativo = metadata.nivel_educativo
      rubrica.asignatura = metadata.asignatura
      rubrica.año_vigencia = metadata.año_vigencia
      rubrica.modalidad = metadata.modalidad || 'regular'
      
      // Inferir módulo y tarea
      this.inferirModuloTarea(rubrica)
      
      return rubrica
      
    } catch (error) {
      console.error(`  ⚠️ Error extrayendo rúbrica: ${error.message}`)
      return null
    }
  }

  private inferirModuloTarea(rubrica: RubricaExtraida): void {
    const indicadorId = rubrica.indicador_id || ''
    
    // Patrón: mod1_tarea2_indicador3
    const match = indicadorId.match(/mod(\d+)_tarea(\d+)/)
    
    if (match) {
      rubrica.modulo = parseInt(match[1])
      rubrica.tarea = parseInt(match[2])
    } else {
      // Valores por defecto
      rubrica.modulo = 1
      rubrica.tarea = 1
    }
  }

  async guardarRubricas(rubricas: RubricaExtraida[], supabase: any): Promise<number> {
    let guardadas = 0
    
    for (const rubrica of rubricas) {
      try {
        // Verificar si ya existe
        const { data: existente } = await supabase
          .from('rubricas_mbe')
          .select('id')
          .eq('indicador_id', rubrica.indicador_id)
          .eq('año_vigencia', rubrica.año_vigencia)
          .maybeSingle()
        
        if (existente) {
          // Actualizar
          await supabase
            .from('rubricas_mbe')
            .update(rubrica)
            .eq('id', existente.id)
          
          console.log(`  ✓ Actualizada: ${rubrica.nombre_indicador}`)
        } else {
          // Insertar
          await supabase
            .from('rubricas_mbe')
            .insert(rubrica)
          
          console.log(`  ✓ Guardada: ${rubrica.nombre_indicador}`)
        }
        
        guardadas++
        
      } catch (error) {
        console.error(`  ✗ Error guardando ${rubrica.nombre_indicador}: ${error.message}`)
      }
    }
    
    console.log(`\n✅ ${guardadas}/${rubricas.length} rúbricas guardadas`)
    return guardadas
  }

  // Método para verificar si un documento contiene rúbricas
  static contieneRubricas(contenidoTexto: string): boolean {
    const indicadores = [
      'insatisfactorio',
      'básico', 
      'competente',
      'destacado',
      'rúbrica del indicador',
      'nivel de desempeño',
      'criterio de evaluación'
    ]
    
    const contenidoLower = contenidoTexto.toLowerCase()
    const encontrados = indicadores.filter(indicador => 
      contenidoLower.includes(indicador)
    ).length
    
    // Debe tener al menos 3 indicadores para considerarse rúbrica
    return encontrados >= 3
  }
}