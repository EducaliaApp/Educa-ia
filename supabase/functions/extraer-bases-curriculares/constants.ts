/**
 * Constantes compartidas para la extracción de Bases Curriculares
 */

// ============================================
// PATRONES CLÁSICOS (1° a 2° Medio)
// ============================================

/**
 * Patrón regex para validar códigos OA completos (formato clásico)
 * Formato: 2-4 letras + 2 dígitos + espacio + "OA"/"OAH"/"OAA" + espacio + alfanumérico
 * Ejemplos válidos:
 *   - "AR01 OA 01" (Objetivo de Aprendizaje de Contenido)
 *   - "MA04 OAH a" (Objetivo de Aprendizaje de Habilidades)
 *   - "LE05 OAA A" (Objetivo de Aprendizaje de Actitudes)
 * Usa anclas ^ y $ para validación estricta del formato completo
 */
export const PATRON_VALIDACION_OA = /^[A-Z]{2,4}\d{2}\s+OA[AH]?\s+[A-Za-z0-9]{1,2}$/i

/**
 * Patrón regex para extraer códigos OA desde texto (formato clásico)
 * Mismo formato que PATRON_VALIDACION_OA pero con grupo de captura
 * y sin anclas para encontrar el patrón dentro de texto más largo
 * Ejemplos:
 *   - Extrae "AR01 OA 01" desde "Objetivo de aprendizaje AR01 OA 01"
 *   - Extrae "MA04 OAH a" desde "Objetivo de habilidad MA04 OAH a"
 *   - Extrae "LE05 OAA A" desde "Objetivo de actitud LE05 OAA A"
 */
export const PATRON_EXTRACCION_OA = /([A-Z]{2,4}\d{2}\s+OA[AH]?\s+[A-Za-z0-9]{1,2})/i

// ============================================
// PATRONES 3° Y 4° MEDIO
// ============================================

/**
 * Patrón para códigos OA de 3° y 4° Medio Formación General
 * Formato: FG-[ASIG]-[NIVEL]-OAC-[NUM]
 * Ejemplos:
 *   - "FG-LELI-3M-OAC-01" (Lengua y Literatura 3° Medio FG)
 *   - "FG-MATE-4M-OAC-05" (Matemática 4° Medio FG)
 */
export const PATRON_VALIDACION_OA_3_4_MEDIO_FG = /^FG-[A-Z]{4}-[34]M-OAC-\d{2}$/i
export const PATRON_EXTRACCION_OA_3_4_MEDIO_FG = /(FG-[A-Z]{4}-[34]M-OAC-\d{2})/i

/**
 * Patrón para códigos OA de 3° y 4° Medio Humanista Científico
 * Formato: [AREA]-[ASIG]-3y4-OAC-[NUM]
 * Ejemplos:
 *   - "CN-BCMO-3y4-OAC-01" (Biología Celular y Molecular)
 *   - "CN-FISI-3y4-OAC-03" (Física)
 *   - "AR-AVAM-3y4-OAC-02" (Artes Visuales Audiovisuales)
 */
export const PATRON_VALIDACION_OA_3_4_MEDIO_HC = /^[A-Z]{2}-[A-Z]{4}-3y4-OAC-\d{2}$/i
export const PATRON_EXTRACCION_OA_3_4_MEDIO_HC = /([A-Z]{2}-[A-Z]{4}-3y4-OAC-\d{2})/i

/**
 * Patrón para códigos OA de 3° y 4° Medio Técnico Profesional
 * Formato simple: OA [NUM]
 * Ejemplos:
 *   - "OA 1" (Objetivo de Aprendizaje 1)
 *   - "OA 10" (Objetivo de Aprendizaje 10)
 */
export const PATRON_VALIDACION_OA_3_4_MEDIO_TP = /^OA\s+\d{1,2}$/i
export const PATRON_EXTRACCION_OA_3_4_MEDIO_TP = /(OA\s+\d{1,2})/i

// ============================================
// PATRONES EDUCACIÓN PARVULARIA
// ============================================

/**
 * Patrón para códigos OA de Educación Parvularia
 * Formato: OA[T] [NUM] [NUCLEO] [NIVEL]
 * Ejemplos:
 *   - "OA 01 LV NT" (Lenguaje Verbal, Nivel Transición)
 *   - "OAT 01 IA SC" (OA Transversal, Identidad y Autonomía, Sala Cuna)
 */
export const PATRON_VALIDACION_OA_PARVULARIA = /^OAT?\s+\d{2}\s+[A-Z]{2,4}\s+[A-Z]{2}$/i
export const PATRON_EXTRACCION_OA_PARVULARIA = /(OAT?\s+\d{2}\s+[A-Z]{2,4}\s+[A-Z]{2})/i

// ============================================
// PATRONES LENGUA INDÍGENA
// ============================================

/**
 * Patrón para códigos OF (Objetivos Fundamentales) de Lengua Indígena
 * Formato: [ASIG][NUM] OF [LETRA]
 * Ejemplos:
 *   - "LI07 OF A" (Lengua Indígena 7° básico)
 *   - "LI08 OF B" (Lengua Indígena 8° básico)
 */
export const PATRON_VALIDACION_OF_LENGUA_INDIGENA = /^[A-Z]{2}\d{2}\s+OF\s+[A-Z]$/i
export const PATRON_EXTRACCION_OF_LENGUA_INDIGENA = /([A-Z]{2}\d{2}\s+OF\s+[A-Z])/i

// ============================================
// PATRÓN UNIVERSAL (todos los formatos)
// ============================================

/**
 * Patrón universal que acepta todos los formatos de OA/OF
 * Combina todos los patrones anteriores
 */
export const PATRON_VALIDACION_OA_UNIVERSAL = new RegExp(
  `^(${PATRON_VALIDACION_OA.source.slice(1, -1)}|` +
  `${PATRON_VALIDACION_OA_3_4_MEDIO_FG.source.slice(1, -1)}|` +
  `${PATRON_VALIDACION_OA_3_4_MEDIO_HC.source.slice(1, -1)}|` +
  `${PATRON_VALIDACION_OA_3_4_MEDIO_TP.source.slice(1, -1)}|` +
  `${PATRON_VALIDACION_OA_PARVULARIA.source.slice(1, -1)}|` +
  `${PATRON_VALIDACION_OF_LENGUA_INDIGENA.source.slice(1, -1)})$`,
  'i'
)

export const PATRON_EXTRACCION_OA_UNIVERSAL = new RegExp(
  `(${PATRON_EXTRACCION_OA.source.slice(1, -1)}|` +
  `${PATRON_EXTRACCION_OA_3_4_MEDIO_FG.source.slice(1, -1)}|` +
  `${PATRON_EXTRACCION_OA_3_4_MEDIO_HC.source.slice(1, -1)}|` +
  `${PATRON_EXTRACCION_OA_3_4_MEDIO_TP.source.slice(1, -1)}|` +
  `${PATRON_EXTRACCION_OA_PARVULARIA.source.slice(1, -1)}|` +
  `${PATRON_EXTRACCION_OF_LENGUA_INDIGENA.source.slice(1, -1)})`,
  'i'
)
