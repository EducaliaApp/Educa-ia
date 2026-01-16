// supabase/functions/shared/types.ts

export interface RubricaNivel {
  descripcion: string
  condiciones: Condicion[]
  operador_logico: 'AND' | 'OR'
  puntaje: number // 1.0, 2.0, 3.0, 4.0
  ejemplos?: string[]
}

export interface Condicion {
  id: string
  texto: string
  tipo: 'cuantitativa' | 'cualitativa' | 'presencia' | 'comparativa'
  
  // Cuantitativas (ej: "TODOS los indicadores", "al menos la mitad")
  cuantificador?: 'todos' | 'mayoria' | 'al_menos_uno' | 'ninguno'
  porcentaje_minimo?: number
  
  // Verificación
  verificable_automaticamente: boolean
  requiere_evidencia_textual: boolean
  
  // Para LIA
  prompt_verificacion: string
  palabras_clave?: string[]
  patrones_regex?: string[]
}

export interface RubricaCompleta {
  id: string
  indicador_id: string
  nombre_indicador: string
  descripcion_indicador: string
  
  // Clasificación
  modulo: 1 | 2 | 3
  tarea: 1 | 2 | 3 | 4 | 5
  seccion?: string // 'A', 'B', 'C'
  obligatorio: boolean
  
  // MBE
  dominio_mbe?: 'A' | 'B' | 'C' | 'D'
  estandares_relacionados?: number[]
  descriptores_relacionados?: string[]
  
  // Evidencia
  evidencia_revisar: string[]
  
  // Niveles
  nivel_insatisfactorio: RubricaNivel
  nivel_basico: RubricaNivel
  nivel_competente: RubricaNivel
  nivel_destacado: RubricaNivel
  
  // Metadatos
  notas_aclaratorias: string[]
  peso_ponderacion: number
  
  // Para RAG
  contenido_texto: string
  embedding?: number[]
}

export interface EvaluacionIndicador {
  indicador_id: string
  nombre_indicador: string
  
  // Resultado
  nivel_alcanzado: 'Insatisfactorio' | 'Básico' | 'Competente' | 'Destacado'
  puntaje: number
  confianza: number // 0-1
  
  // Verificación detallada
  condiciones_evaluadas: CondicionVerificada[]
  condiciones_cumplidas: number
  condiciones_totales: number
  
  // Evidencias
  evidencias_textuales: string[]
  justificacion: string
  
  // Gap analysis
  para_siguiente_nivel?: string
  acciones_concretas: string[]
  
  // Comparativa
  promedio_nacional?: number
  percentil?: number
  
  // Metadatos
  tiempo_evaluacion_ms: number
  tokens_usados: number
}

export interface CondicionVerificada {
  condicion_id: string
  texto_condicion: string
  cumple: boolean
  confianza: number
  evidencias_encontradas: string[]
  razonamiento: string
}

export interface ContenidoTarea {
  tarea_id: string
  modulo: number
  numero_tarea: number
  contenido: Record<string, any>
  archivos_adjuntos?: string[]
}

export interface AnalisisCompleto {
  tarea_id: string
  indicadores_evaluados: EvaluacionIndicador[]
  
  // Resumen
  puntaje_promedio: number
  nivel_predominante: string
  
  // Fortalezas y oportunidades
  indicadores_destacados: string[]
  indicadores_mejorar: string[]
  
  // Recomendaciones priorizadas
  recomendaciones: Recomendacion[]
  
  // Metadatos
  modelo_usado: string
  tiempo_total_ms: number
  tokens_totales: number
  costo_usd: number
}

export interface Recomendacion {
  prioridad: 'alta' | 'media' | 'baja'
  indicador_relacionado: string
  titulo: string
  descripcion: string
  acciones_especificas: string[]
  impacto_estimado_puntos: number
  tiempo_estimado_horas: number
}