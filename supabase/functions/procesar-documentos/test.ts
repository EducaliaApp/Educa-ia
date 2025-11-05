import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Mock retry function
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100)); // Faster for tests
    }
  }
  throw new Error('Max retries reached');
}

// Mock PDF validation
async function validarPDF(arrayBuffer: ArrayBuffer): Promise<boolean> {
  try {
    const header = new Uint8Array(arrayBuffer.slice(0, 4));
    const pdfHeader = String.fromCharCode(...header);
    return pdfHeader.startsWith('%PDF');
  } catch {
    return false;
  }
}

// Mock chunking functions
function detectarDominioMBE(texto: string) {
  const dominios = {
    A: ['preparación', 'planificación', 'diseño'],
    B: ['ambiente', 'clima', 'convivencia'],
    C: ['enseñanza', 'aprendizaje', 'instrucción'],
    D: ['profesional', 'reflexión', 'colaboración']
  };
  
  for (const [dominio, keywords] of Object.entries(dominios)) {
    for (const keyword of keywords) {
      if (new RegExp(keyword, 'i').test(texto)) return dominio;
    }
  }
  return null;
}

function chunkearRubrica(texto: string, documento: any) {
  const chunks = [];
  let chunkIndex = 0;
  const patronCriterio = /(?:Criterio|Descriptor|Nivel)\s+([A-D]\.??\d+)/gi;
  const matches = [...texto.matchAll(patronCriterio)];
  
  for (let i = 0; i < matches.length; i++) {
    const inicio = matches[i].index!;
    const fin = matches[i + 1]?.index || texto.length;
    const contenidoChunk = texto.substring(inicio, fin).trim();
    
    if (contenidoChunk.length < 50) continue;
    
    const criterioMatch = matches[i][1];
    const dominio = criterioMatch[0].toUpperCase();
    const estandar = parseInt(criterioMatch.match(/\d+/)?.[0] || '0');
    
    chunks.push({
      index: chunkIndex++,
      contenido: contenidoChunk,
      seccion: `Criterio ${criterioMatch}`,
      dominio_mbe: dominio,
      estandar_numero: estandar,
      tipo_contenido: 'rubrica',
      metadata: {
        año: documento.año_vigencia,
        asignatura: documento.asignatura
      }
    });
  }
  
  return chunks;
}

function chunkearGenerico(texto: string, documento: any) {
  const CHUNK_SIZE = 1500;
  const OVERLAP = 200;
  const chunks = [];
  let start = 0;
  let chunkIndex = 0;
  
  while (start < texto.length) {
    const end = Math.min(start + CHUNK_SIZE, texto.length);
    const chunk = texto.substring(start, end);
    
    chunks.push({
      index: chunkIndex++,
      contenido: chunk,
      tipo_contenido: 'general',
      metadata: {
        año: documento.año_vigencia
      }
    });
    
    start += CHUNK_SIZE - OVERLAP;
  }
  
  return chunks;
}

// Tests
Deno.test("withRetry - éxito en primer intento", async () => {
  let attempts = 0;
  const result = await withRetry(async () => {
    attempts++;
    return "success";
  });
  
  assertEquals(result, "success");
  assertEquals(attempts, 1);
});

Deno.test("withRetry - éxito después de fallos", async () => {
  let attempts = 0;
  const result = await withRetry(async () => {
    attempts++;
    if (attempts < 3) throw new Error("Temporary failure");
    return "success";
  });
  
  assertEquals(result, "success");
  assertEquals(attempts, 3);
});

Deno.test("withRetry - falla después de max intentos", async () => {
  let attempts = 0;
  
  await assertRejects(
    async () => {
      await withRetry(async () => {
        attempts++;
        throw new Error("Persistent failure");
      }, 2);
    },
    Error,
    "Persistent failure"
  );
  
  assertEquals(attempts, 2);
});

Deno.test("validarPDF - válido con header correcto", async () => {
  const pdfHeader = new TextEncoder().encode("%PDF-1.4");
  const buffer = new ArrayBuffer(100);
  const view = new Uint8Array(buffer);
  view.set(pdfHeader);
  
  const isValid = await validarPDF(buffer);
  assertEquals(isValid, true);
});

Deno.test("validarPDF - inválido sin header PDF", async () => {
  const buffer = new TextEncoder().encode("Not a PDF").buffer;
  
  const isValid = await validarPDF(buffer);
  assertEquals(isValid, false);
});

Deno.test("detectarDominioMBE - detecta dominio A", () => {
  const texto = "La planificación de la clase incluye objetivos claros";
  const dominio = detectarDominioMBE(texto);
  
  assertEquals(dominio, "A");
});

Deno.test("detectarDominioMBE - detecta dominio B", () => {
  const texto = "El ambiente de aprendizaje favorece la convivencia";
  const dominio = detectarDominioMBE(texto);
  
  assertEquals(dominio, "B");
});

Deno.test("detectarDominioMBE - retorna null si no encuentra", () => {
  const texto = "Texto sin palabras clave específicas";
  const dominio = detectarDominioMBE(texto);
  
  assertEquals(dominio, null);
});

Deno.test("chunkearRubrica - procesa criterios correctamente", () => {
  const texto = `
    Criterio A.1: Preparación de la enseñanza
    El docente demuestra conocimiento del contenido...
    
    Criterio B.2: Ambiente para el aprendizaje
    Establece un clima de respeto...
  `;
  
  const documento = { año_vigencia: 2025, asignatura: "Matemática" };
  const chunks = chunkearRubrica(texto, documento);
  
  assertEquals(chunks.length, 2);
  assertEquals(chunks[0].dominio_mbe, "A");
  assertEquals(chunks[0].estandar_numero, 1);
  assertEquals(chunks[1].dominio_mbe, "B");
  assertEquals(chunks[1].estandar_numero, 2);
});

Deno.test("chunkearRubrica - ignora chunks muy cortos", () => {
  const texto = `
    Criterio A.1: Corto
    Criterio B.2: Este es un criterio con suficiente contenido para ser procesado correctamente
  `;
  
  const documento = { año_vigencia: 2025 };
  const chunks = chunkearRubrica(texto, documento);
  
  assertEquals(chunks.length, 1);
  assertEquals(chunks[0].dominio_mbe, "B");
});

Deno.test("chunkearGenerico - divide texto en chunks con overlap", () => {
  const texto = "A".repeat(2000); // Texto de 2000 caracteres
  const documento = { año_vigencia: 2025 };
  
  const chunks = chunkearGenerico(texto, documento);
  
  assertEquals(chunks.length, 2); // Debería crear 2 chunks con overlap
  assertEquals(chunks[0].contenido.length, 1500);
  assertEquals(chunks[0].tipo_contenido, "general");
});

Deno.test("chunkearGenerico - maneja texto corto", () => {
  const texto = "Texto corto";
  const documento = { año_vigencia: 2025 };
  
  const chunks = chunkearGenerico(texto, documento);
  
  assertEquals(chunks.length, 1);
  assertEquals(chunks[0].contenido, texto);
});