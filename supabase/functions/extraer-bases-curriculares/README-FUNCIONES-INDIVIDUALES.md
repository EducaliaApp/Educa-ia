# Funciones Individuales de Extracción de Bases Curriculares

Este documento describe la nueva arquitectura de funciones separadas por categoría para la extracción de bases curriculares.

## 🎯 Propósito

Para evitar timeouts y mejorar la mantenibilidad, se crearon funciones individuales para cada categoría curricular. Cada función:

- ✅ Procesa solo una categoría específica
- ✅ Evita timeouts al tener menos datos que procesar
- ✅ Puede ejecutarse independientemente
- ✅ Es más fácil de debuggear y mantener
- ✅ Permite ejecución paralela de múltiples categorías

## 📁 Estructura

```
supabase/functions/
├── extraer-bases-curriculares/           # Función general (mantiene compatibilidad)
│   ├── shared/                           # Módulos compartidos
│   │   ├── extractor-base.ts            # Lógica de extracción base
│   │   └── procesador-categoria.ts      # Procesador de categorías
│   ├── constants.ts
│   ├── index.ts
│   └── README.md
├── extraer-bases-curriculares-educacion-parvularia/
├── extraer-bases-curriculares-1o-6o-basico/
├── extraer-bases-curriculares-7o-basico-2-medio/
├── extraer-bases-curriculares-3o-4o-medio/
├── extraer-bases-curriculares-3o-4o-medio-tecnico-profesional/
├── extraer-bases-curriculares-diferenciada-artistica-3-4-medio/
├── extraer-bases-curriculares-educacion-personas-jovenes-adultas-epja/
├── extraer-bases-curriculares-pueblos-originarios-ancestrales/
└── extraer-bases-curriculares-lengua-indigena/
```

## 🚀 Funciones Disponibles

### 1. Educación Parvularia
**Función:** `extraer-bases-curriculares-educacion-parvularia`
**URL:** https://www.curriculumnacional.cl/curriculum/educacion-parvularia
**Descripción:** Extrae objetivos de aprendizaje de Educación Parvularia

### 2. Educación Básica 1° a 6°
**Función:** `extraer-bases-curriculares-1o-6o-basico`
**URL:** https://www.curriculumnacional.cl/curriculum/1o-6o-basico
**Descripción:** Extrae objetivos de aprendizaje de 1° a 6° Básico

### 3. Educación Media 7° a 2° Medio
**Función:** `extraer-bases-curriculares-7o-basico-2-medio`
**URL:** https://www.curriculumnacional.cl/curriculum/7o-basico-2-medio
**Descripción:** Extrae objetivos de aprendizaje de 7° Básico a 2° Medio

### 4. Formación Diferenciada Científico-Humanista 3° a 4° Medio
**Función:** `extraer-bases-curriculares-3o-4o-medio`
**URL:** https://www.curriculumnacional.cl/curriculum/3o-4o-medio
**Descripción:** Extrae objetivos de aprendizaje de 3° a 4° Medio Científico-Humanista

### 5. Formación Diferenciada Técnico Profesional 3° a 4° Medio
**Función:** `extraer-bases-curriculares-3o-4o-medio-tecnico-profesional`
**URL:** https://www.curriculumnacional.cl/curriculum/3o-4o-medio-tecnico-profesional
**Descripción:** Extrae objetivos de aprendizaje de 3° a 4° Medio Técnico Profesional

### 6. Formación Diferenciada Artística 3° a 4° Medio
**Función:** `extraer-bases-curriculares-diferenciada-artistica-3-4-medio`
**URL:** https://www.curriculumnacional.cl/recursos/terminales-formacion-diferenciada-artistica-3-4-medio-0
**Descripción:** Extrae objetivos de aprendizaje de Formación Diferenciada Artística

### 7. Educación de Personas Jóvenes y Adultas (EPJA)
**Función:** `extraer-bases-curriculares-educacion-personas-jovenes-adultas-epja`
**URL:** https://www.curriculumnacional.cl/curriculum/bases-curriculares-educacion-personas-jovenes-adultas-epja
**Descripción:** Extrae objetivos de aprendizaje de EPJA

### 8. Lengua y Cultura de los Pueblos Originarios Ancestrales
**Función:** `extraer-bases-curriculares-pueblos-originarios-ancestrales`
**URL:** https://www.curriculumnacional.cl/pueblos-originarios-ancestrales
**Descripción:** Extrae objetivos de aprendizaje de Pueblos Originarios

### 9. Lengua Indígena 7° Básico a 2° Medio
**Función:** `extraer-bases-curriculares-lengua-indigena`
**URL:** https://www.curriculumnacional.cl/curriculum/7o-basico-2o-medio/lengua-indigena
**Descripción:** Extrae objetivos de aprendizaje de Lengua Indígena

## 📝 Uso

### Despliegue

```bash
# Desplegar todas las funciones
supabase functions deploy extraer-bases-curriculares-educacion-parvularia
supabase functions deploy extraer-bases-curriculares-1o-6o-basico
supabase functions deploy extraer-bases-curriculares-7o-basico-2-medio
supabase functions deploy extraer-bases-curriculares-3o-4o-medio
supabase functions deploy extraer-bases-curriculares-3o-4o-medio-tecnico-profesional
supabase functions deploy extraer-bases-curriculares-diferenciada-artistica-3-4-medio
supabase functions deploy extraer-bases-curriculares-educacion-personas-jovenes-adultas-epja
supabase functions deploy extraer-bases-curriculares-pueblos-originarios-ancestrales
supabase functions deploy extraer-bases-curriculares-lengua-indigena
```

### Invocación desde Cliente

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Invocar función de Educación Parvularia
const { data, error } = await supabase.functions.invoke(
  'extraer-bases-curriculares-educacion-parvularia',
  {
    body: {
      persist_db: true,     // Guardar en BD
      generate_files: true, // Generar archivos CSV/JSON
    }
  }
)

if (error) {
  console.error('Error:', error)
} else {
  console.log('Proceso completado:', data)
  console.log('Categoría:', data.categoria)
  console.log('Objetivos extraídos:', data.estadisticas.total_objetivos)
  console.log('Archivos generados:', data.archivos)
}
```

### Invocación en Paralelo (Múltiples Categorías)

```typescript
// Ejecutar múltiples categorías en paralelo
const funcionesCategoria = [
  'extraer-bases-curriculares-educacion-parvularia',
  'extraer-bases-curriculares-1o-6o-basico',
  'extraer-bases-curriculares-7o-basico-2-medio',
]

const resultados = await Promise.all(
  funcionesCategoria.map(funcion =>
    supabase.functions.invoke(funcion, {
      body: { persist_db: true, generate_files: true }
    })
  )
)

console.log('Todas las categorías procesadas:', resultados)
```

## 📊 Configuración

Cada función acepta los siguientes parámetros en el body del request:

```typescript
{
  persist_db: boolean      // true: guardar en BD, false: solo extraer (default: true)
  generate_files: boolean  // true: generar CSV/JSON, false: omitir (default: true)
}
```

## 📤 Respuesta

Cada función retorna:

```json
{
  "success": true,
  "proceso_id": "uuid",
  "categoria": "Educación Parvularia",
  "archivos": [
    {
      "nombre": "bases_curriculares_Educacion_Parvularia_2026-01-18-140530.csv",
      "path": "bases-curriculares/...",
      "size": 123456,
      "url": "https://...signed-url...",
      "formato": "csv"
    },
    {
      "nombre": "bases_curriculares_Educacion_Parvularia_2026-01-18-140530.json",
      "path": "bases-curriculares/...",
      "size": 234567,
      "url": "https://...signed-url...",
      "formato": "json"
    }
  ],
  "configuracion": {
    "persist_db": true,
    "generate_files": true
  },
  "estadisticas": {
    "asignaturas_procesadas": 15,
    "total_objetivos": 320,
    "objetivos_priorizados": 160,
    "objetivos_contenido": 250,
    "objetivos_habilidades": 50,
    "objetivos_actitudes": 20,
    "duracion_ms": 45000,
    "tracking": {
      "objetivos_nuevos": 10,
      "objetivos_actualizados": 5,
      "objetivos_sin_cambios": 305,
      "objetivos_error": 0
    }
  }
}
```

## 🔧 Módulos Compartidos

### `shared/extractor-base.ts`
Contiene toda la lógica de extracción:
- Funciones de fetch con retry
- Extracción de HTML
- Parsing de objetivos de aprendizaje
- Extracción de actividades
- Generación de CSV/JSON
- Utilities de validación

### `shared/procesador-categoria.ts`
Contiene la lógica de procesamiento:
- Procesamiento de categoría completa
- Procesamiento de asignaturas
- Persistencia en base de datos
- Generación y subida de archivos
- Tracking de cambios

## 🎯 Ventajas de la Nueva Arquitectura

1. **Evita Timeouts:** Cada función procesa solo una categoría, reduciendo el tiempo de ejecución
2. **Ejecución Paralela:** Múltiples categorías pueden procesarse simultáneamente
3. **Debugging Más Fácil:** Problemas específicos de una categoría no afectan a las demás
4. **Mantenimiento Simplificado:** Cambios en una categoría no requieren redeployment de todas
5. **Reintentos Granulares:** Puedes reintentar solo la categoría que falló
6. **Monitoreo Detallado:** Métricas por categoría en lugar de métricas agregadas

## 🔄 Compatibilidad

La función original `extraer-bases-curriculares` se mantiene para compatibilidad hacia atrás y puede procesar todas las categorías con el sistema de batch.

## 📝 Logs y Monitoreo

Cada función registra su progreso en:
- **`procesos_etl`**: Información general del proceso
- **`proceso_etl_logs`**: Logs detallados de cada paso
- **`documentos_transformados`**: Archivos generados

```sql
-- Ver últimos procesos por categoría
SELECT
  nombre,
  estado,
  total_registros,
  duracion_ms,
  created_at
FROM procesos_etl
WHERE nombre LIKE 'extraer_bases_curriculares_%'
ORDER BY created_at DESC;
```

## 🐛 Troubleshooting

### Error: "Module not found"
Asegúrate de que los módulos compartidos están en la ruta correcta:
```
extraer-bases-curriculares/shared/extractor-base.ts
extraer-bases-curriculares/shared/procesador-categoria.ts
```

### Error: "Timeout"
- Las funciones individuales no deberían experimentar timeouts
- Si ocurre, verifica la conectividad a curriculumnacional.cl
- Revisa el número de asignaturas en esa categoría específica

### Error: "No se encontraron asignaturas"
- Verifica que la URL de la categoría sea correcta
- Revisa si cambió la estructura HTML del sitio
- Consulta los logs de la función para más detalles

## 📚 Referencias

- [Función Original](./README.md)
- [Documentación Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Curriculum Nacional](https://www.curriculumnacional.cl)
