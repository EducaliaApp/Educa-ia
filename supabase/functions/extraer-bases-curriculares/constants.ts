/**
 * Constantes compartidas para la extracción de Bases Curriculares
 */

/**
 * Patrón regex para validar códigos OA completos
 * Formato: 2-4 letras + 2 dígitos + espacio + "OA" + espacio + 1-2 dígitos
 * Ejemplos válidos: "AR01 OA 01", "CN03 OA 05", "HI05 OA 12"
 * Usa anclas ^ y $ para validación estricta del formato completo
 */
export const PATRON_VALIDACION_OA = /^[A-Z]{2,4}\d{2}\s+OA\s+\d{1,2}$/i

/**
 * Patrón regex para extraer códigos OA desde texto
 * Mismo formato que PATRON_VALIDACION_OA pero con grupo de captura
 * y sin anclas para encontrar el patrón dentro de texto más largo
 * Ejemplo: extrae "AR01 OA 01" desde "Objetivo de aprendizaje AR01 OA 01"
 */
export const PATRON_EXTRACCION_OA = /([A-Z]{2,4}\d{2}\s+OA\s+\d{1,2})/i
