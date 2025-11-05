// scripts/seed-fuentes-documentacion.ts

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seedFuentesDocumentacion() {
  const fuentes = [
    {
      nombre: 'DocenteMás - Portal Oficial',
      url_base: 'https://www.docentemas.cl',
      tipo_fuente: 'docentemas',
      frecuencia_check: '1 day',
      metadata: {
        descripcion: 'Portal oficial del Sistema de Reconocimiento',
        prioridad: 'alta'
      }
    },
    {
      nombre: 'CPEIP - Centro de Perfeccionamiento',
      url_base: 'https://www.cpeip.cl',
      tipo_fuente: 'cpeip',
      frecuencia_check: '1 day',
      metadata: {
        descripcion: 'Centro de Perfeccionamiento, Experimentación e Investigaciones Pedagógicas',
        prioridad: 'alta'
      }
    },
    {
      nombre: 'Estándares Docentes MINEDUC',
      url_base: 'https://estandaresdocentes.mineduc.cl',
      tipo_fuente: 'mineduc',
      frecuencia_check: '1 week',
      metadata: {
        descripcion: 'Estándares de la Profesión Docente',
        prioridad: 'media'
      }
    },
    {
      nombre: 'Biblioteca Digital MINEDUC',
      url_base: 'https://bibliotecadigital.mineduc.cl',
      tipo_fuente: 'biblioteca_digital',
      frecuencia_check: '1 week',
      metadata: {
        descripcion: 'Repositorio de documentos oficiales',
        prioridad: 'media'
      }
    }
  ]

  for (const fuente of fuentes) {
    const { data, error } = await supabase
      .from('fuentes_documentacion')
      .upsert(fuente, { onConflict: 'url_base' })
      .select()

    if (error) {
      console.error(`Error agregando fuente ${fuente.nombre}:`, error)
    } else {
      console.log(`✅ Fuente agregada: ${fuente.nombre}`)
    }
  }

  // Agregar URLs específicas a monitorear
  const urls = [
    {
      url: 'https://www.docentemas.cl/download/manuales-portafolio/',
      tipo_contenido: 'listado',
      selector_enlaces: 'a[href$=".pdf"]',
      patron_validacion: '.*manual.*portafolio.*2025.*'
    },
    {
      url: 'https://www.docentemas.cl/download/rubricas-portafolio/',
      tipo_contenido: 'listado',
      selector_enlaces: 'a[href$=".pdf"]',
      patron_validacion: '.*rúbrica.*2025.*'
    }
  ]

  // ... insertar URLs
}

seedFuentesDocumentacion()