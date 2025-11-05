// types/portafolio-oficial.ts

/**
 * TIPOS OFICIALES DEL PORTAFOLIO DOCENTE CHILE 2025
 * Basado en Manuales Oficiales del MINEDUC
 */

// ============================================
// ENUMS Y CONSTANTES
// ============================================

export enum NivelEducativo {
  PARVULARIA = 'parvularia',
  BASICA_1_6 = 'basica_1_6',
  BASICA_7_8_MEDIA = 'basica_7_8_media',
  MEDIA_TP = 'media_tp',
  EPJA = 'epja', // Educación Personas Jóvenes y Adultas
  ESPECIAL_REGULAR = 'especial_regular',
  ESPECIAL_NEEP = 'especial_neep',
  HOSPITALARIA = 'hospitalaria',
  ENCIERRO = 'encierro',
  LENGUA_INDIGENA = 'lengua_indigena'
}

export enum NivelDesempeño {
  DESTACADO = 'Destacado',
  COMPETENTE = 'Competente',
  BASICO = 'Básico',
  INSUFICIENTE = 'Insuficiente'
}

export enum CategoriaLogro {
  A = 'A', // Destacado (3.5-4.0)
  B = 'B', // Competente Alto (3.0-3.4)
  C = 'C', // Competente (2.5-2.9)
  D = 'D', // Básico (2.0-2.4)
  E = 'E'  // Insuficiente (1.0-1.9)
}

export enum DominioMBE {
  A = 'A', // Preparación del proceso de enseñanza y aprendizaje
  B = 'B', // Creación de ambiente propicio
  C = 'C', // Enseñanza para el aprendizaje
  D = 'D'  // Responsabilidades profesionales
}

// ============================================
// MÓDULO 1: PLANIFICACIÓN, EVALUACIÓN Y REFLEXIÓN
// ============================================

export interface Modulo1 {
  tarea_1: Tarea1Planificacion
  tarea_2: Tarea2EvaluacionFormativa
  tarea_3: Tarea3ReflexionSocioemocional
}

// TAREA 1: Planificación
export interface Tarea1Planificacion {
  seccion_a: SeccionA_Planificacion
  seccion_b: SeccionB_Fundamentacion
}

export interface SeccionA_Planificacion {
  experiencia_1: ExperienciaAprendizaje
  experiencia_2: ExperienciaAprendizaje
  experiencia_3: ExperienciaAprendizaje
}

export interface ExperienciaAprendizaje {
  objetivo_aprendizaje: string
  conocimientos_previos: string
  actividades: Actividad[]
  recursos: string[]
  tiempo_estimado: string // ej: "90 minutos", "2 clases de 45 min"
  atencion_diversidad: string
}

export interface Actividad {
  descripcion: string
  tipo: 'inicio' | 'desarrollo' | 'cierre'
  duracion_minutos: number
  organizacion: 'individual' | 'parejas' | 'grupos' | 'plenario'
}

export interface SeccionB_Fundamentacion {
  experiencia_seleccionada: 1 | 2 | 3
  fundamentacion_decisiones: string
  consideracion_diversidad: string
  conexion_conocimientos_previos: string
  promocion_aprendizaje_profundo: string
}

// TAREA 2: Evaluación Formativa
export interface Tarea2EvaluacionFormativa {
  seccion_a: SeccionA_EstrategiaMonitoreo
  seccion_b: SeccionB_AnalisisUsoFormativo
}

export interface SeccionA_EstrategiaMonitoreo {
  estrategia_descrita: string
  instrumentos_utilizados: string[]
  criterios_evaluacion: string
  momento_aplicacion: string
}

export interface SeccionB_AnalisisUsoFormativo {
  analisis_resultados: string
  conclusiones: string[]
  ajustes_realizados: string[]
  impacto_ajustes: string
}

// TAREA 3: Reflexión Socioemocional
export interface Tarea3ReflexionSocioemocional {
  aprendizaje_socioemocional_identificado: string
  situaciones_observadas: string
  reflexion_actitudes_propias: string
  facilita_o_dificulta: 'facilita' | 'dificulta' | 'ambos'
  acciones_futuras: string[]
}

// ============================================
// MÓDULO 2: CLASE GRABADA
// ============================================

export interface Modulo2 {
  tarea_4: Tarea4ClaseGrabada
}

export interface Tarea4ClaseGrabada {
  video: VideoClase
  ficha_descriptiva: FichaDescriptivaClase
}

export interface VideoClase {
  storage_path: string
  duracion_segundos: number
  fecha_grabacion: string
  url_video?: string
  procesado: boolean
  transcripcion?: string
}

export interface FichaDescriptivaClase {
  curso_nivel: string
  cantidad_estudiantes: number
  objetivo_aprendizaje: string
  objetivo_propuesto_lograr: string
  que_trabajo_antes: string
  que_trabajo_despues: string
  contribucion_desnaturalizar_genero: string
  situaciones_interferentes?: string
}

// ============================================
// MÓDULO 3: TRABAJO COLABORATIVO
// ============================================

export interface Modulo3 {
  tarea_5: Tarea5TrabajoColaborativo
}

export interface Tarea5TrabajoColaborativo {
  presenta_parte_voluntaria: boolean
  parte_obligatoria: ParteObligatoriaModulo3
  parte_voluntaria?: ParteVoluntariaModulo3
}

export interface ParteObligatoriaModulo3 {
  seccion_a: {
    a1_relevancia_problema: string // Puede ser grupal
    a2_reflexion_conjunta_dialogo: string // Puede ser grupal
  }
  seccion_b: {
    b1_aprendizajes_profesionales: string // DEBE ser individual
  }
}

export interface ParteVoluntariaModulo3 {
  seccion_a: {
    a11_reflexion_necesidades_desde_evidencia: string // Puede ser grupal
    a3_seguimiento_implementacion: string // Puede ser grupal
  }
  seccion_b: {
    b2_reflexion_creencias_pedagogicas: string // DEBE ser individual
  }
  seccion_c: {
    c1_evaluacion_forma_trabajo: string // DEBE ser individual
  }
}

// ============================================
// PORTAFOLIO COMPLETO
// ============================================

export interface PortafolioCompleto {
  id: string
  profesor_id: string
  año_evaluacion: number
  asignatura: string
  nivel_educativo: NivelEducativo
  modalidad: string
  
  estado: 'borrador' | 'en_revision' | 'completado' | 'enviado'
  progreso_porcentaje: number
  
  modulo_1: Modulo1
  modulo_2: Modulo2
  modulo_3: Modulo3
  
  // Evaluación IA
  puntaje_estimado_ia?: number
  categoria_logro?: CategoriaLogro
  nivel_desempeño_estimado?: NivelDesempeño
  confianza_evaluacion?: number
  
  created_at: string
  updated_at: string
  submitted_at?: string
}

// ============================================
// ANÁLISIS IA POR TAREA
// ============================================

export interface AnalisisIA_Tarea {
  tarea_id: string
  modulo_numero: 1 | 2 | 3
  tarea_numero: 1 | 2 | 3 | 4 | 5
  
  criterios_evaluados: CriterioEvaluado[]
  aspectos_evaluacion: AspectoEvaluacion[]
  
  puntaje_estimado: number // 1.0 a 4.0
  categoria_logro: CategoriaLogro
  nivel_desempeño: NivelDesempeño
  
  resumen: string
  recomendaciones_priorizadas: string[]
  
  metadata: {
    modelo_usado: string
    tokens_usados: number
    latencia_ms: number
    costo_usd: number
    año_evaluacion: number
  }
}

export interface CriterioEvaluado {
  nombre: string
  dominio_mbe: DominioMBE
  estandar_numero: number // 1-12
  estandar_nombre: string
  focos_relacionados: string[]
  descriptores_relacionados: string[]
  
  nivel: NivelDesempeño
  justificacion: string
  evidencias_citadas: string[] // Citas textuales
  
  fortalezas: string[]
  aspectos_mejorar: string[]
  sugerencias: string[]
}

export interface AspectoEvaluacion {
  nombre_aspecto: string
  tarea_relacionada: string // ej: "Tarea 1A", "Tarea 2B"
  cumple_competente: boolean
  cumple_destacado: boolean
  observaciones: string
}

// ============================================
// RÚBRICAS MBE
// ============================================

export interface RubricaMBE {
  id: string
  asignatura: string
  nivel_educativo: NivelEducativo
  año_vigencia: number
  modalidad: string
  
  dominio: DominioMBE
  estandar_numero: number
  nombre_estandar: string
  descripcion_estandar: string
  
  focos: Foco[]
  criterios: Criterio[]
  niveles_desempeño: NivelDesempeñoRubrica[]
  
  embedding?: number[] // Para RAG
  contenido_texto: string
}

export interface Foco {
  numero: number
  descripcion: string
  descriptores: Descriptor[]
}

export interface Descriptor {
  codigo: string // ej: "1.4", "2.3"
  descripcion: string
}

export interface Criterio {
  nombre: string
  descripcion: string
  indicadores: string[]
}

export interface NivelDesempeñoRubrica {
  nivel: NivelDesempeño
  puntaje: number
  descripcion: string
  ejemplos?: string[]
}