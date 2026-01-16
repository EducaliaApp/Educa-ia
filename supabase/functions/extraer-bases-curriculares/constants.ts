/**
 * Constantes compartidas para la extracción de Bases Curriculares
 */

/**
 * Patrón regex para validar códigos OA completos
 * Formato: 2-4 letras + 2 dígitos + espacio + "OA"/"OAH"/"OAA" + espacio + alfanumérico
 * Ejemplos válidos:
 *   - "AR01 OA 01" (Objetivo de Aprendizaje de Contenido)
 *   - "MA04 OAH a" (Objetivo de Aprendizaje de Habilidades)
 *   - "LE05 OAA A" (Objetivo de Aprendizaje de Actitudes)
 * Usa anclas ^ y $ para validación estricta del formato completo
 */
export const PATRON_VALIDACION_OA = /^[A-Z]{2,4}\d{2}\s+OA[AH]?\s+[A-Za-z0-9]{1,2}$/i

/**
 * Patrón regex para extraer códigos OA desde texto
 * Mismo formato que PATRON_VALIDACION_OA pero con grupo de captura
 * y sin anclas para encontrar el patrón dentro de texto más largo
 * Ejemplos:
 *   - Extrae "AR01 OA 01" desde "Objetivo de aprendizaje AR01 OA 01"
 *   - Extrae "MA04 OAH a" desde "Objetivo de habilidad MA04 OAH a"
 *   - Extrae "LE05 OAA A" desde "Objetivo de actitud LE05 OAA A"
 */
export const PATRON_EXTRACCION_OA = /([A-Z]{2,4}\d{2}\s+OA[AH]?\s+[A-Za-z0-9]{1,2})/i
