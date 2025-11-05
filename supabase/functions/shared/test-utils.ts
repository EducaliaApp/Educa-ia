// Utilidades compartidas para tests
export function createMockSupabaseClient() {
  const mockData = new Map();
  
  return {
    from: (table: string) => ({
      select: (columns = '*') => ({
        eq: (column: string, value: any) => ({
          single: () => ({
            data: mockData.get(`${table}_${column}_${value}`),
            error: null
          })
        }),
        limit: (count: number) => ({
          data: Array.from(mockData.values()).slice(0, count),
          error: null
        })
      }),
      insert: (data: any) => ({
        select: () => ({
          single: () => ({
            data: { id: 'mock-id', ...data },
            error: null
          })
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          data: { ...data },
          error: null
        })
      })
    }),
    storage: {
      from: (bucket: string) => ({
        download: (path: string) => ({
          data: new Blob(['mock pdf content']),
          error: null
        }),
        upload: (path: string, file: any) => ({
          data: { path },
          error: null
        })
      })
    },
    functions: {
      invoke: (name: string, options: any) => ({
        data: { success: true },
        error: null
      })
    },
    channel: (name: string) => ({
      send: (payload: any) => Promise.resolve(),
      on: () => ({ subscribe: () => {} })
    }),
    // Helper para agregar datos mock
    _setMockData: (key: string, value: any) => {
      mockData.set(key, value);
    }
  };
}

export function createMockPDFBuffer(): ArrayBuffer {
  const pdfHeader = "%PDF-1.4\n";
  const pdfContent = `
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test content) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000185 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
279
%%EOF
  `;
  
  return new TextEncoder().encode(pdfHeader + pdfContent).buffer;
}

export function createMockHTMLWithPDFs(): string {
  return `
    <html>
      <body>
        <div class="documentos">
          <a href="/docs/manual-portafolio-2025.pdf">Manual Portafolio Educación Básica 2025</a>
          <a href="https://example.com/rubricas-parvularia-2025.pdf" title="Rúbricas Parvularia">Rúbricas</a>
          <a href="/docs/manual-especial-2025.pdf">Manual Educación Especial Regular 2025</a>
          <span><a href="/docs/instructivo-2024.pdf">Instructivo General 2024</a></span>
        </div>
      </body>
    </html>
  `;
}

export const mockDocumentos = {
  rubrica: {
    id: 'doc-1',
    tipo_documento: 'rubrica',
    año_vigencia: 2025,
    asignatura: 'Matemática',
    nivel_educativo: 'basica_1_6'
  },
  manual: {
    id: 'doc-2', 
    tipo_documento: 'manual_portafolio',
    año_vigencia: 2025,
    nivel_educativo: 'basica_7_8_media'
  },
  mbe: {
    id: 'doc-3',
    tipo_documento: 'mbe', 
    año_vigencia: 2021,
    nivel_educativo: 'regular'
  }
};

export const mockTextos = {
  rubrica: `
    Criterio A.1: Preparación de la enseñanza
    El docente demuestra conocimiento profundo del contenido que enseña, 
    organizando el currículum de manera coherente con los objetivos de aprendizaje.
    
    Criterio B.2: Ambiente para el aprendizaje  
    Establece un clima de respeto mutuo y organiza un ambiente estructurado
    que favorece el aprendizaje de todos los estudiantes.
    
    Criterio C.3: Enseñanza para el aprendizaje
    Implementa estrategias de enseñanza desafiantes y coherentes con los
    objetivos de aprendizaje y las características de los estudiantes.
  `,
  
  manual: `
    Módulo 1: Planificación y Evaluación
    
    Tarea 1: Diseño de experiencias de aprendizaje
    En esta tarea deberá planificar tres experiencias de aprendizaje
    que demuestren su capacidad para organizar el proceso educativo.
    
    Tarea 2: Evaluación formativa
    Describa una estrategia de evaluación formativa implementada
    durante el desarrollo de las experiencias planificadas.
    
    Módulo 2: Clase grabada
    
    Tarea 3: Video de clase
    Grabe una clase de 30 minutos que muestre su práctica pedagógica.
  `,
  
  mbe: `
    Estándar 1: Conoce a los estudiantes de educación básica
    El profesor de Educación Básica conoce las características del desarrollo
    correspondientes a las edades de sus estudiantes.
    
    Estándar 2: Está preparado para promover el desarrollo personal
    El profesor está preparado para promover el desarrollo personal y social
    de los estudiantes de acuerdo a sus características y necesidades.
  `
};