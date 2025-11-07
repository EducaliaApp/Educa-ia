// types/rubricas.ts
// Tipos TypeScript para el Sistema de Rúbricas MBE 2025

/**
 * Tipo de verificación de una condición
 */
export type TipoVerificacion = 'presencia' | 'calidad' | 'cantidad' | 'especifica'

/**
 * Lógica de evaluación de condiciones
 */
export type LogicaEvaluacion = 'AND' | 'OR'

/**
 * Niveles de desempeño MBE
 */
export type NivelDesempeno = 'Destacado' | 'Competente' | 'Básico' | 'Insatisfactorio'

/**
 * Letra asociada al nivel
 */
export type LetraNivel = 'D' | 'C' | 'B' | 'I'

/**
 * Puntaje numérico del nivel
 */
export type PuntajeNivel = 4.0 | 3.0 | 2.0 | 1.0

/**
 * Criterios de verificación de una condición
 */
export interface CriteriosVerificacion {
  palabras_clave?: string[]
  longitud_minima?: number
  elementos_requeridos?: string[]
  patron?: string // Regex pattern
}

/**
 * Condición individual de evaluación
 */
export interface Condicion {
  id: string
  descripcion: string
  tipo: TipoVerificacion
  requiere_evidencia: boolean
  criterios: CriteriosVerificacion
  peso?: number
}

/**
 * Detalle de un nivel de desempeño
 */
export interface NivelDetalle {
  nivel: NivelDesempeno
  letra: LetraNivel
  puntaje: PuntajeNivel
  logica: LogicaEvaluacion
  descripcion: string
  condiciones: Condicion[]
  notas?: string
}

/**
 * Estructura completa de niveles de desempeño
 */
export interface NivelesDesempeno {
  destacado: NivelDetalle
  competente: NivelDetalle
  basico: NivelDetalle
  insatisfactorio: NivelDetalle
}

/**
 * Rúbrica MBE completa
 */
export interface Rubrica {
  id: string
  created_at: string
  updated_at: string

  // Identificación
  indicador_id: string
  nombre_indicador: string
  descripcion_general: string

  // Contexto
  año_vigencia: number
  nivel_educativo: string
  asignatura: string | null
  modalidad: string

  // Módulo y tarea
  modulo: number
  tarea: number | null

  // Peso
  peso_porcentaje: number

  // Niveles
  niveles_desempeno: NivelesDesempeno

  // Metadata
  fuente_oficial: string
  pagina_manual: number
  notas_aclaratorias: string
  ejemplos: string[]

  // Estado
  activo: boolean
  version: string
}

/**
 * Contexto para cargar rúbricas
 */
export interface ContextoRubricas {
  año: number
  nivel_educativo: string
  asignatura: string
  modulo: number
  tarea?: number
}

/**
 * Condición evaluada con resultado
 */
export interface CondicionEvaluada {
  condicion_id: string
  descripcion: string
  cumple: boolean
  evidencia_textual: string
  razon: string
}

/**
 * Prioridad de recomendación
 */
export type PrioridadRecomendacion = 'alta' | 'media' | 'baja'

/**
 * Recomendación de mejora
 */
export interface Recomendacion {
  prioridad: PrioridadRecomendacion
  accion: string
  impacto: string
}

/**
 * Evaluación preliminar (respuesta de IA)
 */
export interface EvaluacionPreliminar {
  nivel_alcanzado: NivelDesempeno
  puntaje: PuntajeNivel
  condiciones_evaluadas: CondicionEvaluada[]
  condiciones_cumplidas: number
  condiciones_totales: number
  justificacion: string
  para_siguiente_nivel?: string
  fortalezas: string[]
  recomendaciones: Recomendacion[]
  evidencias_destacadas: string[]
}

/**
 * Evaluación final de un indicador (con correcciones y estadísticas)
 */
export interface EvaluacionIndicador extends EvaluacionPreliminar {
  correccion_aplicada: boolean
  nota_correccion?: string
  promedio_nacional?: number
  desviacion_estandar?: number
  percentil?: number
}

/**
 * Resultado de evaluación de indicador para guardar en BD
 */
export interface EvaluacionIndicadorDB {
  id?: string
  tarea_id: string
  indicador_id: string
  rubrica_id?: string

  // Resultado
  nivel_alcanzado: NivelDesempeno
  puntaje: PuntajeNivel

  // Condiciones
  condiciones_cumplidas: number
  condiciones_totales: number
  condiciones_evaluadas: CondicionEvaluada[]

  // Feedback
  justificacion: string
  para_siguiente_nivel?: string
  evidencias_textuales: string[]
  fortalezas: string[]
  recomendaciones: Recomendacion[]

  // Correcciones
  correccion_aplicada: boolean
  nota_correccion?: string

  // Estadísticas
  promedio_nacional?: number
  desviacion_estandar?: number
  percentil?: number

  // Metadata
  modelo_ia?: string
  tokens_utilizados?: number
  tiempo_evaluacion_ms?: number
}

/**
 * Estadísticas agregadas de un indicador
 */
export interface EstadisticasIndicador {
  id: string
  indicador_id: string
  año: number
  nivel_educativo: string
  asignatura: string | null

  total_evaluaciones: number
  puntaje_promedio: number
  desviacion_estandar: number

  porcentaje_destacado: number
  porcentaje_competente: number
  porcentaje_basico: number
  porcentaje_insatisfactorio: number

  ultima_actualizacion: string
}

/**
 * Configuración del evaluador de IA
 */
export interface ConfiguracionIA {
  modelo: 'claude-sonnet-4' | 'claude-opus-4' | 'gpt-4-turbo' | 'gpt-4o'
  apiKey: string
  temperatura?: number
  maxTokens?: number
  timeout?: number
}

/**
 * Opciones para construcción de prompt
 */
export interface OpcionesPrompt {
  incluir_ejemplos?: boolean
  incluir_notas?: boolean
  formato_respuesta?: 'json' | 'texto'
  idioma?: 'es' | 'en'
}

/**
 * Resultado de llamada a IA
 */
export interface ResultadoIA {
  contenido: string
  tokens_utilizados: number
  tiempo_ms: number
  modelo: string
  error?: string
}

/**
 * Logger para Edge Functions
 */
export interface Logger {
  info: (mensaje: string, metadata?: any) => void
  warn: (mensaje: string, metadata?: any) => void
  error: (mensaje: string, error?: Error | string) => void
  debug: (mensaje: string, metadata?: any) => void
}

/**
 * Resultado completo de análisis de tarea
 */
export interface ResultadoAnalisisTarea {
  tarea_id: string
  modulo: number
  tarea: number

  indicadores_evaluados: number
  puntaje_promedio: number
  categoria_logro: 'A' | 'B' | 'C' | 'D' | 'E'

  evaluaciones: EvaluacionIndicador[]

  fortalezas_generales: string[]
  areas_mejora: string[]
  recomendaciones_prioritarias: Recomendacion[]

  tiempo_total_ms: number
  tokens_totales: number
}
