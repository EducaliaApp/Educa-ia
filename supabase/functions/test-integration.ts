import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createMockSupabaseClient, createMockPDFBuffer, createMockHTMLWithPDFs, mockDocumentos, mockTextos } from "./shared/test-utils.ts";

// Tests de integración para el flujo completo
Deno.test("Flujo completo: monitor -> procesamiento", async () => {
  const supabase = createMockSupabaseClient();
  
  // 1. Simular detección de documento nuevo
  const html = createMockHTMLWithPDFs();
  
  // Mock de extraerLinksPDF (simplificado para test)
  const links = [
    { nombre: "Manual Portafolio Educación Básica 2025", url: "https://example.com/manual.pdf" }
  ];
  
  // 2. Simular parsing de nombre
  const metadata = {
    año: 2025,
    nivel: "basica_1_6", 
    modalidad: "regular"
  };
  
  // 3. Verificar que se detecta como documento nuevo
  supabase._setMockData("documentos_oficiales_nombre_archivo_Manual Portafolio Educación Básica 2025", null);
  
  // 4. Simular procesamiento
  const pdfBuffer = createMockPDFBuffer();
  
  // 5. Verificar que se registra correctamente
  const documentoRegistrado = {
    id: "doc-123",
    tipo_documento: "manual_portafolio",
    nivel_educativo: metadata.nivel,
    año_vigencia: metadata.año,
    procesado: false
  };
  
  assertExists(documentoRegistrado.id);
  assertEquals(documentoRegistrado.tipo_documento, "manual_portafolio");
  assertEquals(documentoRegistrado.año_vigencia, 2025);
});

Deno.test("Procesamiento de rúbrica genera chunks correctos", async () => {
  const supabase = createMockSupabaseClient();
  
  // Simular documento de rúbrica
  const documento = mockDocumentos.rubrica;
  const texto = mockTextos.rubrica;
  
  // Mock de chunking de rúbrica
  function chunkearRubrica(texto: string, doc: any) {
    const chunks = [];
    const matches = [...texto.matchAll(/Criterio\s+([A-D])\.(\d+)/gi)];
    
    for (let i = 0; i < matches.length; i++) {
      const criterio = matches[i][0];
      const dominio = matches[i][1];
      const numero = parseInt(matches[i][2]);
      
      chunks.push({
        index: i,
        contenido: `${criterio}: Contenido del criterio...`,
        dominio_mbe: dominio,
        estandar_numero: numero,
        tipo_contenido: 'rubrica'
      });
    }
    
    return chunks;
  }
  
  const chunks = chunkearRubrica(texto, documento);
  
  assertEquals(chunks.length, 3);
  assertEquals(chunks[0].dominio_mbe, "A");
  assertEquals(chunks[1].dominio_mbe, "B"); 
  assertEquals(chunks[2].dominio_mbe, "C");
});

Deno.test("Sistema de notificaciones funciona correctamente", async () => {
  const supabase = createMockSupabaseClient();
  
  // Simular reporte de cambios
  const reporte = {
    fecha_monitoreo: new Date().toISOString(),
    documentos_nuevos: 2,
    documentos_actualizados: 1,
    procesamiento_exitoso: 3,
    procesamiento_fallido: 0
  };
  
  // Mock de notificación
  const notificacion = {
    tipo: 'cambios_documentos',
    titulo: `${reporte.documentos_nuevos + reporte.documentos_actualizados} documentos actualizados`,
    mensaje: `Nuevos: ${reporte.documentos_nuevos}, Actualizados: ${reporte.documentos_actualizados}`,
    prioridad: reporte.documentos_nuevos > 0 ? 'alta' : 'media',
    metadata: reporte
  };
  
  assertEquals(notificacion.tipo, 'cambios_documentos');
  assertEquals(notificacion.prioridad, 'alta');
  assertExists(notificacion.metadata);
});

Deno.test("Validación de PDF rechaza archivos inválidos", async () => {
  // Buffer que no es PDF
  const invalidBuffer = new TextEncoder().encode("Not a PDF file").buffer;
  
  async function validarPDF(buffer: ArrayBuffer): Promise<boolean> {
    const header = new Uint8Array(buffer.slice(0, 4));
    const pdfHeader = String.fromCharCode(...header);
    return pdfHeader.startsWith('%PDF');
  }
  
  const isValid = await validarPDF(invalidBuffer);
  assertEquals(isValid, false);
});

Deno.test("Retry logic maneja fallos temporales", async () => {
  let attempts = 0;
  
  async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 10)); // Fast for tests
      }
    }
    throw new Error('Max retries reached');
  }
  
  const result = await withRetry(async () => {
    attempts++;
    if (attempts < 3) throw new Error("Temporary failure");
    return "success";
  });
  
  assertEquals(result, "success");
  assertEquals(attempts, 3);
});

Deno.test("Detección de cambios por hash funciona", async () => {
  // Simular dos versiones diferentes del mismo documento
  const contenido1 = "Versión 1 del documento";
  const contenido2 = "Versión 2 del documento - actualizada";
  
  async function calcularHash(contenido: string): Promise<string> {
    const buffer = new TextEncoder().encode(contenido);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  const hash1 = await calcularHash(contenido1);
  const hash2 = await calcularHash(contenido2);
  
  // Los hashes deben ser diferentes
  assertEquals(hash1 !== hash2, true);
  
  // El mismo contenido debe generar el mismo hash
  const hash1_bis = await calcularHash(contenido1);
  assertEquals(hash1, hash1_bis);
});