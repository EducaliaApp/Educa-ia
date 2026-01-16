import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { DocumentProcessor } from "./document-processor.ts";

Deno.test("DocumentProcessor - retry logic funciona", async () => {
  const processor = new DocumentProcessor();
  let attempts = 0;
  
  const result = await processor.processWithRetry(async () => {
    attempts++;
    if (attempts < 3) throw new Error("Temporary failure");
    return "success";
  }, "test operation");
  
  assertEquals(result, "success");
  assertEquals(attempts, 3);
});

Deno.test("DocumentProcessor - validación PDF correcta", async () => {
  const processor = new DocumentProcessor();
  
  // PDF válido
  const validPDF = new TextEncoder().encode("%PDF-1.4\n" + "A".repeat(2000)).buffer;
  const isValid = await processor.validatePDF(validPDF);
  assertEquals(isValid, true);
  
  // PDF inválido
  const invalidPDF = new TextEncoder().encode("Not a PDF").buffer;
  const isInvalid = await processor.validatePDF(invalidPDF);
  assertEquals(isInvalid, false);
});

Deno.test("DocumentProcessor - validación de contenido", async () => {
  const processor = new DocumentProcessor();
  
  // Contenido de rúbrica válido
  const rubricaText = "Este documento contiene criterios de evaluación y descriptores de nivel";
  const isValidRubrica = await processor.validateDocumentContent(rubricaText, "rubrica");
  assertEquals(isValidRubrica, true);
  
  // Contenido que no corresponde
  const invalidText = "Este es un texto genérico sin palabras clave";
  const isInvalidContent = await processor.validateDocumentContent(invalidText, "rubrica");
  assertEquals(isInvalidContent, false);
});

Deno.test("DocumentProcessor - logging funciona", async () => {
  const processor = new DocumentProcessor();
  
  await processor.processWithRetry(async () => {
    throw new Error("Test error");
  }, "test operation", 1).catch(() => {});
  
  const logs = processor.getLogs();
  assertEquals(logs.length > 0, true);
  assertEquals(logs.some(log => log.level === 'error'), true);
});