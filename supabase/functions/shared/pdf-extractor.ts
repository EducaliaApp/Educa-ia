// supabase/functions/shared/pdf-extractor.ts

/**
 * PDFExtractor - Extrae texto de documentos PDF
 * 
 * Implementación simplificada para Deno Edge Functions.
 * Extrae texto de las primeras páginas de un PDF para clasificación con IA.
 */

export class PDFExtractor {
  
  /**
   * Extrae texto de las primeras N páginas de un PDF
   * 
   * @param buffer - ArrayBuffer con contenido del PDF
   * @param maxPages - Número máximo de páginas a extraer (default: 3)
   * @returns Texto extraído (máximo 5000 caracteres)
   */
  async extractFirstPages(buffer: ArrayBuffer, maxPages: number = 3): Promise<string> {
    try {
      // Validar buffer
      if (!buffer || buffer.byteLength === 0) {
        console.warn('Buffer PDF vacío')
        return ''
      }
      
      // Convertir a string para búsqueda de patrones
      const decoder = new TextDecoder('utf-8', { fatal: false })
      const text = decoder.decode(buffer)
      
      // Validar que es un PDF válido
      if (!text.startsWith('%PDF-')) {
        console.warn('Archivo no es un PDF válido')
        return ''
      }
      
      // Extraer versión PDF
      const versionMatch = text.match(/%PDF-(\d\.\d)/)
      const pdfVersion = versionMatch ? versionMatch[1] : 'unknown'
      console.log(`  📄 PDF versión: ${pdfVersion}`)
      
      // Estrategia 1: Extraer de streams comprimidos
      const streams = this.extractTextFromStreams(text, maxPages)
      
      if (streams.length > 100) {
        console.log(`  ✓ Extraído de streams: ${streams.length} chars`)
        return this.cleanExtractedText(streams)
      }
      
      // Estrategia 2: Buscar texto plano en contenido
      const plainText = this.extractPlainText(text, maxPages)
      
      if (plainText.length > 100) {
        console.log(`  ✓ Extraído texto plano: ${plainText.length} chars`)
        return this.cleanExtractedText(plainText)
      }
      
      console.warn('  ⚠️  No se pudo extraer texto suficiente del PDF')
      return ''
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error extrayendo texto PDF:', errorMessage)
      return ''
    }
  }
  
  /**
   * Extrae texto de objetos stream en el PDF
   */
  private extractTextFromStreams(pdfContent: string, maxPages: number): string {
    const streamMatches = pdfContent.matchAll(/stream\s*([\s\S]*?)\s*endstream/g)
    const textParts: string[] = []
    let streamCount = 0
    const maxStreams = maxPages * 3 // Aproximación: ~3 streams por página
    
    for (const match of streamMatches) {
      if (streamCount >= maxStreams) break
      
      const streamData = match[1]
      
      // Intentar decodificar texto legible
      const readable = this.extractReadableText(streamData)
      
      if (readable.length > 20) {
        textParts.push(readable)
      }
      
      streamCount++
    }
    
    return textParts.join(' ')
  }
  
  /**
   * Extrae texto plano visible del PDF (sin comprimir)
   */
  private extractPlainText(pdfContent: string, maxPages: number): string {
    const textParts: string[] = []
    
    // Buscar objetos de texto plano: (texto) Tj
    const textObjects = pdfContent.matchAll(/\((.*?)\)\s*Tj/g)
    
    let count = 0
    const maxObjects = maxPages * 50 // Aproximación: ~50 objetos de texto por página
    
    for (const match of textObjects) {
      if (count >= maxObjects) break
      
      const text = match[1]
      if (text && text.length > 1) {
        textParts.push(text)
      }
      
      count++
    }
    
    // Buscar arrays de texto: [(texto1) (texto2)] TJ
    const textArrays = pdfContent.matchAll(/\[(.*?)\]\s*TJ/g)
    
    for (const match of textArrays) {
      if (count >= maxObjects) break
      
      const array = match[1]
      const texts = array.matchAll(/\((.*?)\)/g)
      
      for (const text of texts) {
        if (text[1] && text[1].length > 1) {
          textParts.push(text[1])
        }
      }
      
      count++
    }
    
    return textParts.join(' ')
  }
  
  /**
   * Extrae texto legible de datos de stream
   */
  private extractReadableText(streamData: string): string {
    // Filtrar solo caracteres imprimibles (ASCII extendido para español)
    const readable = streamData
      .split('')
      .filter(char => {
        const code = char.charCodeAt(0)
        // Caracteres ASCII imprimibles (32-126) + caracteres latinos (192-255)
        return (code >= 32 && code <= 126) || (code >= 192 && code <= 255)
      })
      .join('')
    
    // Eliminar secuencias de control comunes de PDF
    return readable
      .replace(/BT|ET|Tf|Td|Tm|TL|Tr|Ts|Tw|Tc|Tz|TJ|Tj|'|"/g, ' ')
      .replace(/[0-9]+\s+[0-9]+\s+obj/g, ' ')
      .replace(/endobj/g, ' ')
      .replace(/\/[A-Z][A-Za-z0-9]*/g, ' ') // Nombres de PDF como /Font, /Type
  }
  
  /**
   * Limpia y normaliza el texto extraído
   */
  private cleanExtractedText(text: string): string {
    return text
      // Normalizar espacios en blanco
      .replace(/\s+/g, ' ')
      // Eliminar caracteres de control residuales
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // Eliminar secuencias numéricas largas (probablemente datos binarios)
      .replace(/\d{10,}/g, ' ')
      // Eliminar secuencias de caracteres repetidos (ruido)
      .replace(/(.)\1{5,}/g, '$1')
      // Trim
      .trim()
      // Limitar a 5000 caracteres
      .substring(0, 5000)
  }
  
  /**
   * Valida que el contenido extraído es útil para clasificación
   */
  validateExtractedText(text: string): { valid: boolean; reason?: string } {
    if (!text || text.length === 0) {
      return { valid: false, reason: 'Texto vacío' }
    }
    
    if (text.length < 100) {
      return { valid: false, reason: 'Texto muy corto (< 100 chars)' }
    }
    
    // Verificar que tiene palabras reales (no solo basura)
    const words = text.split(/\s+/).filter(w => w.length > 3)
    if (words.length < 10) {
      return { valid: false, reason: 'Muy pocas palabras válidas' }
    }
    
    // Verificar ratio de caracteres legibles vs total
    const legibleChars = text.match(/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/g)?.length || 0
    const ratio = legibleChars / text.length
    
    if (ratio < 0.5) {
      return { valid: false, reason: 'Demasiados caracteres no legibles' }
    }
    
    return { valid: true }
  }
  
  /**
   * Extrae metadata básica del PDF sin procesar contenido
   */
  async extractMetadata(buffer: ArrayBuffer): Promise<PDFMetadata | null> {
    try {
      const decoder = new TextDecoder('utf-8', { fatal: false })
      const text = decoder.decode(buffer)
      
      // Extraer versión
      const versionMatch = text.match(/%PDF-(\d\.\d)/)
      const version = versionMatch ? versionMatch[1] : null
      
      // Extraer Info dictionary si existe
      const infoMatch = text.match(/\/Info\s+(\d+)\s+(\d+)\s+R/)
      let title: string | null = null
      let author: string | null = null
      let subject: string | null = null
      
      if (infoMatch) {
        const infoObj = text.match(new RegExp(`${infoMatch[1]}\\s+${infoMatch[2]}\\s+obj([\\s\\S]*?)endobj`))
        
        if (infoObj) {
          const infoContent = infoObj[1]
          
          title = this.extractInfoField(infoContent, 'Title')
          author = this.extractInfoField(infoContent, 'Author')
          subject = this.extractInfoField(infoContent, 'Subject')
        }
      }
      
      // Contar páginas (aproximado)
      const pageMatches = text.match(/\/Type\s*\/Page\b/g)
      const pageCount = pageMatches ? pageMatches.length : null
      
      return {
        version,
        title,
        author,
        subject,
        pageCount,
        fileSize: buffer.byteLength
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error extrayendo metadata PDF:', errorMessage)
      return null
    }
  }
  
  /**
   * Extrae un campo del diccionario Info del PDF
   */
  private extractInfoField(infoContent: string, fieldName: string): string | null {
    const regex = new RegExp(`\\/${fieldName}\\s*\\(([^)]+)\\)`)
    const match = infoContent.match(regex)
    return match ? match[1].trim() : null
  }
}

// ============================================
// TIPOS
// ============================================

export interface PDFMetadata {
  version: string | null
  title: string | null
  author: string | null
  subject: string | null
  pageCount: number | null
  fileSize: number
}
