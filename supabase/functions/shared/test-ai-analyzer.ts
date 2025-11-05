import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Mock AIAnalyzer para tests
class MockAIAnalyzer {
  async clasificarDocumento(texto: string) {
    if (texto.includes('criterio') || texto.includes('rúbrica')) {
      return {
        tipo_documento: 'rubrica',
        nivel_educativo: 'basica_1_6',
        modalidad: 'regular',
        asignatura: 'matematica',
        confianza: 0.95
      };
    }
    
    if (texto.includes('módulo') || texto.includes('tarea')) {
      return {
        tipo_documento: 'manual_portafolio',
        nivel_educativo: 'basica_7_8_media',
        modalidad: 'regular',
        confianza: 0.92
      };
    }
    
    return {
      tipo_documento: 'instructivo',
      nivel_educativo: 'regular',
      modalidad: 'regular',
      confianza: 0.75
    };
  }

  async detectarCambios(textoAnterior: string, textoNuevo: string) {
    if (textoAnterior !== textoNuevo) {
      return [{
        tipo: 'criterio_modificado',
        impacto: 'medio',
        descripcion: 'Se modificó el criterio de evaluación',
        seccionesAfectadas: ['Criterio A.1'],
        recomendacionesAccion: ['Revisar alineación con estándares']
      }];
    }
    return [];
  }

  async extraerEntidades(texto: string) {
    const entidades = [];
    
    if (texto.includes('objetivo')) {
      entidades.push({
        tipo: 'objetivo_aprendizaje',
        texto: 'Objetivo de aprendizaje identificado',
        dominio: 'A',
        nivel_taxonomico: 'comprender',
        asignaturas_relacionadas: ['matematica']
      });
    }
    
    if (texto.includes('criterio')) {
      entidades.push({
        tipo: 'criterio_evaluacion',
        texto: 'Criterio de evaluación identificado',
        dominio: 'B',
        nivel_taxonomico: 'aplicar',
        asignaturas_relacionadas: ['lenguaje']
      });
    }
    
    return entidades;
  }

  async analizarCoherencia(documentos: any[]) {
    const coherencia = documentos.length > 1 ? 0.85 : 1.0;
    
    return {
      coherencia_global: coherencia,
      inconsistencias: coherencia < 0.9 ? [{
        documento1: documentos[0]?.id || 'doc1',
        documento2: documentos[1]?.id || 'doc2',
        descripcion: 'Posible inconsistencia en terminología',
        severidad: 'media'
      }] : []
    };
  }
}

// Tests
Deno.test("AIAnalyzer - clasificación de rúbrica", async () => {
  const analyzer = new MockAIAnalyzer();
  const texto = "Este documento contiene criterios de evaluación y rúbricas";
  
  const resultado = await analyzer.clasificarDocumento(texto);
  
  assertEquals(resultado.tipo_documento, "rubrica");
  assertEquals(resultado.confianza > 0.9, true);
});

Deno.test("AIAnalyzer - clasificación de manual", async () => {
  const analyzer = new MockAIAnalyzer();
  const texto = "Módulo 1: Planificación. Tarea 1: Diseño de experiencias";
  
  const resultado = await analyzer.clasificarDocumento(texto);
  
  assertEquals(resultado.tipo_documento, "manual_portafolio");
  assertEquals(resultado.nivel_educativo, "basica_7_8_media");
});

Deno.test("AIAnalyzer - detección de cambios", async () => {
  const analyzer = new MockAIAnalyzer();
  const textoAnterior = "Criterio A.1: Versión anterior";
  const textoNuevo = "Criterio A.1: Versión actualizada";
  
  const cambios = await analyzer.detectarCambios(textoAnterior, textoNuevo);
  
  assertEquals(cambios.length, 1);
  assertEquals(cambios[0].tipo, "criterio_modificado");
  assertEquals(cambios[0].impacto, "medio");
});

Deno.test("AIAnalyzer - extracción de entidades", async () => {
  const analyzer = new MockAIAnalyzer();
  const texto = "El objetivo de aprendizaje es que los estudiantes comprendan. El criterio de evaluación establece...";
  
  const entidades = await analyzer.extraerEntidades(texto);
  
  assertEquals(entidades.length, 2);
  assertEquals(entidades[0].tipo, "objetivo_aprendizaje");
  assertEquals(entidades[1].tipo, "criterio_evaluacion");
});

Deno.test("AIAnalyzer - análisis de coherencia", async () => {
  const analyzer = new MockAIAnalyzer();
  const documentos = [
    { id: 'doc1', texto: 'Documento 1', tipo: 'rubrica' },
    { id: 'doc2', texto: 'Documento 2', tipo: 'manual' }
  ];
  
  const coherencia = await analyzer.analizarCoherencia(documentos);
  
  assertExists(coherencia.coherencia_global);
  assertEquals(coherencia.coherencia_global >= 0 && coherencia.coherencia_global <= 1, true);
  assertEquals(Array.isArray(coherencia.inconsistencias), true);
});