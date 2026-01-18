# 🔄 Solución: Sistema de Reintentos para Extracción de Bases Curriculares

## 🎯 Problema Resuelto

La extracción de las 9 categorías curriculares toma **2-3 horas**, pero las Edge Functions de Supabase tienen un límite de tiempo de ejecución (~110 segundos). El proceso llegaba al timeout antes de completarse.

## ✅ Solución Implementada

### Sistema de Reintentos con Checkpoints

Implementamos un sistema que:
1. **Procesa por lotes (batches)** de categorías en lugar de todas a la vez
2. **Guarda el progreso** en la tabla `etl_extracciones_bc`
3. **Permite reanudar** desde donde quedó usando `continue_run_id`
4. **Retorna 202 Accepted** cuando quedan categorías pendientes

## 📊 Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│  Inicio de Extracción                                    │
│  POST /extraer-bases-curriculares                        │
│  { "batch_categorias": 2 }                              │
└─────────────────┬───────────────────────────────────────┘
                  │
                  v
        ┌─────────────────────┐
        │  ¿Es continuación?  │
        └─────────┬───────────┘
                  │
         ┌────────┴────────┐
         │ SÍ              │ NO
         v                 v
┌────────────────┐  ┌─────────────────┐
│ Obtener Run    │  │ Crear Run       │
│ Existente      │  │ Nuevo           │
└────────┬───────┘  └────────┬────────┘
         │                   │
         └──────────┬────────┘
                    │
                    v
        ┌───────────────────────┐
        │ Procesar Batch        │
        │ (ej: 2 categorías)    │
        │ con límite de tiempo  │
        └───────────┬───────────┘
                    │
                    v
        ┌───────────────────────┐
        │ Persistir Objetivos   │
        │ en BD                 │
        └───────────┬───────────┘
                    │
                    v
        ┌───────────────────────┐
        │ Actualizar Run        │
        │ (progreso, pendientes)│
        └───────────┬───────────┘
                    │
         ┌──────────┴──────────┐
         │ ¿Quedan pendientes? │
         └──────────┬──────────┘
                    │
         ┌──────────┴──────────┐
         │ SÍ                  │ NO
         v                     v
┌────────────────┐    ┌────────────────┐
│ Retornar 202   │    │ Generar        │
│ Accepted       │    │ Archivos       │
│ + run_id       │    │ CSV/JSON       │
└────────────────┘    └────────┬───────┘
                               │
                               v
                      ┌────────────────┐
                      │ Retornar 200   │
                      │ OK             │
                      └────────────────┘
```

## 🔧 Cómo Usar

### 1. Primera Ejecución (Nuevo Run)

```bash
curl -X POST \
  https://[tu-proyecto].supabase.co/functions/v1/extraer-bases-curriculares \
  -H "Authorization: Bearer [tu-service-role-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "persist_db": true,
    "generate_files": true,
    "batch_categorias": 2
  }'
```

**Respuesta (202 Accepted):**
```json
{
  "success": true,
  "estado": "partial",
  "run_id": "uuid-del-run",
  "categorias_pendientes": [
    "https://www.curriculumnacional.cl/curriculum/7o-basico-2-medio",
    "https://www.curriculumnacional.cl/curriculum/3o-4o-medio",
    "..."
  ],
  "categorias_procesadas": [
    "https://www.curriculumnacional.cl/curriculum/educacion-parvularia",
    "https://www.curriculumnacional.cl/curriculum/1o-6o-basico"
  ],
  "asignaturas_procesadas": 25,
  "total_objetivos": 450,
  "duracion_ms": 105000
}
```

### 2. Continuar Ejecución

Usa el `run_id` de la respuesta anterior:

```bash
curl -X POST \
  https://[tu-proyecto].supabase.co/functions/v1/extraer-bases-curriculares \
  -H "Authorization: Bearer [tu-service-role-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "continue_run_id": "uuid-del-run",
    "batch_categorias": 2
  }'
```

**Repite** hasta que la respuesta sea **200 OK** (todas las categorías completadas).

### 3. Última Ejecución (200 OK)

Cuando se completan todas las categorías:

```json
{
  "success": true,
  "proceso_id": "uuid-proceso-etl",
  "archivos": [
    {
      "nombre": "bases_curriculares_Todas_las_Categorias_2026-01-18-153045.csv",
      "size": 5242880,
      "url": "https://..."
    }
  ],
  "estadisticas": {
    "asignaturas_procesadas": 150,
    "total_objetivos": 2500,
    "objetivos_priorizados": 800,
    "duracion_ms": 95000
  }
}
```

## 📋 Parámetros de Configuración

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `batch_categorias` | number | 1 | Cuántas categorías procesar por ejecución |
| `persist_db` | boolean | true | Si guardar en `objetivos_aprendizaje` |
| `generate_files` | boolean | true | Si generar CSV/JSON |
| `continue_run_id` | string | null | UUID del run a continuar |
| `force` | boolean | false | Forzar re-extracción |

## 🎯 Estrategias de Batch

### Estrategia Conservadora (Recomendada)
```json
{
  "batch_categorias": 1
}
```
- **Ventaja**: Mínimo riesgo de timeout
- **Desventaja**: Requiere 9 ejecuciones para completar
- **Tiempo por ejecución**: ~60-90 segundos
- **Tiempo total**: ~10-15 minutos (9 ejecuciones)

### Estrategia Balanceada
```json
{
  "batch_categorias": 2
}
```
- **Ventaja**: Balance entre velocidad y seguridad
- **Desventaja**: Requiere 5 ejecuciones
- **Tiempo por ejecución**: ~100-110 segundos
- **Tiempo total**: ~8-10 minutos (5 ejecuciones)

### Estrategia Agresiva
```json
{
  "batch_categorias": 3
}
```
- **Ventaja**: Más rápido (3 ejecuciones)
- **Desventaja**: Mayor riesgo de timeout en categorías grandes
- **Tiempo por ejecución**: ~110 segundos (cerca del límite)
- **Tiempo total**: ~6-8 minutos (3 ejecuciones)

## 🗃️ Tabla de Control: `etl_extracciones_bc`

### Estructura
```sql
CREATE TABLE etl_extracciones_bc (
  id uuid PRIMARY KEY,
  estado text NOT NULL, -- pending | running | partial | completed | failed
  categorias_pendientes text[] NOT NULL,
  categorias_procesadas text[] NOT NULL,
  asignaturas_procesadas integer DEFAULT 0,
  objetivos_extraidos integer DEFAULT 0,
  proceso_etl_id uuid,
  ultimo_checkpoint jsonb,
  detalle jsonb,
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  finished_at timestamptz
);
```

### Estados

| Estado | Descripción |
|--------|-------------|
| `pending` | Run creado pero no iniciado |
| `running` | Procesando actualmente |
| `partial` | Parcialmente completado, quedan categorías pendientes |
| `completed` | Todas las categorías procesadas |
| `failed` | Error irrecuperable |

### Consultar Estado de un Run

```sql
SELECT
  id,
  estado,
  array_length(categorias_procesadas, 1) as procesadas,
  array_length(categorias_pendientes, 1) as pendientes,
  asignaturas_procesadas,
  objetivos_extraidos,
  started_at,
  updated_at
FROM etl_extracciones_bc
WHERE id = 'uuid-del-run';
```

## 🔄 Flujo Automático con Script

Para automatizar las ejecuciones hasta completar:

```javascript
// auto-extract-bc.js
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function extractWithRetries() {
  let runId = null
  let completed = false

  while (!completed) {
    const body = runId
      ? { continue_run_id: runId, batch_categorias: 2 }
      : { batch_categorias: 2 }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/extraer-bases-curriculares`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const result = await response.json()

    if (response.status === 200) {
      console.log('✅ Extracción completada!')
      console.log(`Total objetivos: ${result.estadisticas.total_objetivos}`)
      completed = true
    } else if (response.status === 202) {
      runId = result.run_id
      console.log(`⏳ Parcial: ${result.asignaturas_procesadas} asignaturas, ${result.total_objetivos} objetivos`)
      console.log(`Pendientes: ${result.categorias_pendientes.length} categorías`)

      // Esperar un poco antes de continuar
      await new Promise(resolve => setTimeout(resolve, 2000))
    } else {
      console.error('❌ Error:', result)
      break
    }
  }
}

extractWithRetries()
```

## 🧪 Testing

### Test Manual

```bash
# 1. Nueva extracción con batch de 1
curl -X POST https://[...]/extraer-bases-curriculares \
  -H "Authorization: Bearer [...]" \
  -d '{"batch_categorias": 1}'

# Guarda el run_id de la respuesta

# 2. Continuar extracción
curl -X POST https://[...]/extraer-bases-curriculares \
  -H "Authorization: Bearer [...]" \
  -d '{"continue_run_id": "uuid-aqui", "batch_categorias": 1}'

# 3. Verificar en base de datos
# SELECT * FROM etl_extracciones_bc WHERE id = 'uuid-aqui';
```

### Verificar Todas las Categorías

```sql
-- Debe retornar 9 categorías distintas
SELECT DISTINCT categoria
FROM objetivos_aprendizaje
ORDER BY categoria;

-- Contar objetivos por categoría
SELECT
  categoria,
  COUNT(*) as total_objetivos,
  COUNT(*) FILTER (WHERE priorizado = true) as priorizados
FROM objetivos_aprendizaje
GROUP BY categoria
ORDER BY categoria;
```

## 📊 Métricas Esperadas

### Por Categoría (aproximado)

| Categoría | Asignaturas | Objetivos (aprox) |
|-----------|-------------|-------------------|
| Educación Parvularia | 8 | 150-200 |
| Educación Básica 1° a 6° | 12 | 800-1000 |
| Educación Media 7° a 2° | 15 | 600-800 |
| Form. Dif. Científico-Humanista | 10 | 300-400 |
| Form. Dif. Técnico Profesional | 20+ | 400-500 |
| Form. Dif. Artística | 5 | 100-150 |
| EPJA | 8 | 200-300 |
| Pueblos Originarios | 10 | 150-200 |
| Lengua Indígena | 5 | 100-150 |
| **TOTAL** | **~150** | **~2500-3500** |

## 🚨 Troubleshooting

### Problema: "Run ya completado anteriormente"

**Causa**: Intentando continuar un run que ya terminó.

**Solución**: Iniciar un nuevo run sin `continue_run_id`.

### Problema: Timeout incluso con batch_categorias=1

**Causa**: Una categoría específica tiene demasiadas asignaturas.

**Solución**:
1. Identificar cuál categoría causa el problema
2. Reducir `MAX_ASIGNATURAS` temporalmente para esa categoría
3. O dividir la categoría manualmente

### Problema: No se guardan objetivos en BD

**Causa**: `persist_db: false` en la configuración.

**Solución**: Enviar `"persist_db": true` en el request.

### Problema: Categorías pendientes no disminuyen

**Causa**: Error en el procesamiento que no se está capturando.

**Solución**:
1. Revisar logs del proceso ETL
2. Verificar tabla `procesos_etl` para ver errores
3. Consultar `etl_extracciones_bc.detalle` para más info

## ✅ Ventajas de la Solución

1. **✅ Sin timeouts**: Procesa por lotes que caben en el límite de tiempo
2. **✅ Reanudable**: Si falla, puede continuar desde donde quedó
3. **✅ Trackeable**: Estado visible en `etl_extracciones_bc`
4. **✅ Flexible**: Configurable con `batch_categorias`
5. **✅ Seguro**: Guarda progreso en cada batch
6. **✅ Completo**: Procesa TODAS las 9 categorías

## 🎯 Resultado Final

Después de ejecutar todos los batches:

- ✅ 9 categorías curriculares extraídas
- ✅ ~150 asignaturas procesadas
- ✅ ~2500-3500 objetivos de aprendizaje en BD
- ✅ Archivos CSV/JSON generados
- ✅ Estado `completed` en `etl_extracciones_bc`

## 📝 Próximos Pasos Recomendados

1. **Automatización**: Crear un cron job que ejecute el script automático
2. **Notificaciones**: Enviar email/Slack cuando se complete
3. **Dashboard**: Visualizar progreso en tiempo real en `/admin/etl`
4. **Optimización**: Ajustar `batch_categorias` basándose en métricas reales
5. **Monitoreo**: Alertas si un run tarda demasiado o falla
