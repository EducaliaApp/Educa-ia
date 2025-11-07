# Guía para Poblar la Base de Conocimiento RAG

**Estado actual:** Infraestructura lista, esperando datos del MINEDUC

```
✅ Migración ejecutada
✅ 2 rúbricas existentes (sin embeddings)
⏭️ 0 documentos oficiales
⏭️ 0 chunks procesados
```

---

## 🎯 Objetivo

Poblar la base de datos con documentos oficiales del MINEDUC Chile para alimentar el sistema RAG que evalúa portafolios docentes.

---

## 📋 Checklist de Población

### Fase 1: Generar Embeddings de Rúbricas Existentes ✅

**Estado:** 2 rúbricas sin embeddings

**Acción:**

```bash
# Configurar variables de entorno
export OPENAI_API_KEY='sk-...'
export SUPABASE_URL='https://[PROJECT_REF].supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='eyJ...'

# Ejecutar script
deno run --allow-net --allow-env scripts/generar-embeddings-rubricas.ts
```

**Resultado esperado:**
```
✅ Procesadas: 2
📈 Total: 2
```

**Verificación:**

```sql
SELECT * FROM obtener_estadisticas_rag();
-- rubricas_con_embedding debería ser 2
```

---

### Fase 2: Monitorear Documentos Oficiales MINEDUC ⏭️

**Objetivo:** Descargar manuales y rúbricas oficiales de DocenteMás y CPEIP

**Opción A: Ejecutar Edge Function manualmente**

```bash
# Invocar función de monitoreo
curl -X POST \
  "https://[PROJECT_REF].supabase.co/functions/v1/monitor-documentos-oficiales" \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Opción B: Usar GitHub Actions (recomendado)**

1. Configurar secrets en GitHub:
   ```
   Settings → Secrets and variables → Actions → New repository secret

   ANTHROPIC_API_KEY = sk-ant-...
   OPENAI_API_KEY = sk-...
   SUPABASE_URL = https://[PROJECT_REF].supabase.co
   SUPABASE_SERVICE_ROLE_KEY = eyJ...
   SLACK_WEBHOOK_URL = https://hooks.slack.com/... (opcional)
   ```

2. Activar workflow manualmente:
   ```
   Actions → sync-rubricas-mineduc → Run workflow
   ```

3. Verificar logs en tiempo real

**Resultado esperado:**
```
📊 Reporte de Monitoreo:
  - Documentos detectados: 15-30
  - Documentos nuevos: 15-30
  - Documentos actualizados: 0
```

**Verificación:**

```sql
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE procesado = TRUE) as procesados,
  COUNT(*) FILTER (WHERE procesado = FALSE) as pendientes
FROM documentos_oficiales;
```

---

### Fase 3: Procesar Documentos y Generar Chunks ⏭️

**Objetivo:** Extraer texto de PDFs, generar chunks y embeddings

**Automático:** Los documentos se procesan automáticamente después del monitoreo

**Manual (si necesario):**

```bash
# Invocar función de procesamiento para un documento específico
curl -X POST \
  "https://[PROJECT_REF].supabase.co/functions/v1/procesar-documentos" \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"documento_id": "UUID-DEL-DOCUMENTO"}'
```

**Resultado esperado:**
```
✅ Documento procesado: 120 chunks creados
```

**Verificación:**

```sql
SELECT * FROM obtener_estadisticas_rag();
-- total_chunks debería ser > 0
-- chunks_con_embedding debería ser > 0
```

---

### Fase 4: Validar Calidad de Datos ⏭️

**Objetivo:** Verificar que los datos procesados son válidos

```bash
# Ejecutar script de validación
deno run --allow-net --allow-env --allow-write scripts/validate-rag-data.ts
```

**Resultado esperado:**
```
✅ VALIDACIÓN EXITOSA
📈 Métricas de Calidad:
  - Chunks válidos: 95%+
  - Documentos procesados: 100%
```

**Verificación:**

```sql
SELECT * FROM validaciones_rag ORDER BY fecha DESC LIMIT 1;
```

---

### Fase 5: Probar Búsqueda RAG ⏭️

**Objetivo:** Verificar que la búsqueda semántica funciona

**Paso 1: Generar embedding de prueba**

Puedes usar OpenAI Playground o este script:

```typescript
// Generar embedding de consulta
const response = await fetch('https://api.openai.com/v1/embeddings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model: 'text-embedding-3-large',
    input: 'planificación de clases de matemáticas para 5° básico',
    dimensions: 1536
  })
})

const data = await response.json()
const embedding = data.data[0].embedding
```

**Paso 2: Ejecutar búsqueda en SQL Editor**

```sql
-- Buscar rúbricas similares (ejemplo con vector dummy)
SELECT
  indicador_id,
  nombre_indicador,
  asignatura,
  nivel_educativo,
  similarity
FROM buscar_rubricas_similares(
  ARRAY[0.1, 0.2, ...]::vector(1536),  -- Usar embedding real aquí
  0.7,  -- threshold
  5,    -- match_count
  2025, -- año
  'Matemática',
  'basica_1_6'::nivel_educativo,
  'regular'
);
```

**Resultado esperado:**
```
| indicador_id | nombre_indicador | similarity |
|--------------|------------------|------------|
| M1_I1        | Identifica...    | 0.85       |
| M1_I2        | Planifica...     | 0.78       |
```

**Paso 3: Probar desde Edge Function**

Crear una tarea de prueba y ejecutar:

```bash
curl -X POST \
  "https://[PROJECT_REF].supabase.co/functions/v1/analizar-planificacion" \
  -H "Authorization: Bearer [ACCESS_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "tarea_id": "UUID-DE-TAREA-PRUEBA",
    "contenido_planificacion": {
      "objetivo_aprendizaje": "Que los estudiantes comprendan fracciones",
      "actividades": [...]
    }
  }'
```

---

## 📊 Métricas de Éxito

### Estado Inicial (Actual)

```
total_chunks: 0
chunks_con_embedding: 0
total_documentos: 0
total_rubricas: 2
rubricas_con_embedding: 0 ← FASE 1
```

### Estado Objetivo (Post-Población)

```
total_chunks: 500-2000
chunks_con_embedding: 500-2000
total_documentos: 30-50
documentos_procesados: 30-50
total_rubricas: 8-15
rubricas_con_embedding: 8-15
similitud_promedio_7d: 0.75+
latencia_promedio_7d: <300ms
```

---

## 🔄 Automatización Semanal

Una vez poblada la base de datos, el workflow de GitHub Actions se ejecutará automáticamente:

- **Frecuencia:** Domingos a las 2 AM UTC
- **Acción:** Monitorear cambios en DocenteMás
- **Si hay cambios:** Descargar, procesar, validar y notificar

**Verificar configuración:**

```bash
# Ver cronjobs activos
SELECT * FROM cron.job WHERE jobname LIKE '%rubricas%';

# Ver última ejecución
SELECT * FROM metricas_pipeline_rag ORDER BY fecha DESC LIMIT 5;
```

---

## 🐛 Troubleshooting

### Problema: "No se encontraron documentos en DocenteMás"

**Posibles causas:**
1. URLs de DocenteMás cambiaron
2. Estructura HTML del sitio cambió
3. Bloqueo por User-Agent

**Solución:**
```typescript
// Actualizar URLs en: supabase/functions/monitor-documentos-oficiales/index.ts
const URLS_OFICIALES = {
  manuales: 'https://www.docentemas.cl/portafolio-2025/manuales',
  rubricas: 'https://www.docentemas.cl/portafolio-2025/rubricas',
  documentos: 'https://www.docentemas.cl/documentos-descargables'
}
```

### Problema: "Chunks sin embedding después de procesar"

**Causa:** Falla en llamada a OpenAI API

**Solución:**
```sql
-- Ver chunks sin embedding
SELECT documento_id, COUNT(*) as chunks_sin_embedding
FROM chunks_documentos
WHERE embedding IS NULL
GROUP BY documento_id;

-- Reprocesar documento específico
-- Ejecutar Edge Function procesar-documentos con el documento_id
```

### Problema: "Búsqueda retorna 0 resultados"

**Causa:** Threshold muy alto o embeddings no generados

**Solución:**
```sql
-- Probar con threshold más bajo
SELECT * FROM buscar_rubricas_similares(
  ARRAY[...]::vector(1536),
  0.5,  -- Reducir a 50%
  10
);

-- Verificar que hay embeddings
SELECT COUNT(*) FROM rubricas_mbe WHERE embedding IS NOT NULL;
SELECT COUNT(*) FROM chunks_documentos WHERE embedding IS NOT NULL;
```

---

## 💰 Costos Estimados (OpenAI)

### Generación Inicial de Embeddings

```
Rúbricas: 10 rúbricas × ~2000 tokens × $0.00013/1K tokens = $0.003
Documentos: 30 PDFs × 100 chunks × 500 tokens × $0.00013/1K tokens = $0.20
Total inicial: ~$0.21
```

### Mantenimiento Mensual

```
Monitoreo semanal: 4 ejecuciones × 5 docs nuevos × 100 chunks = 2000 chunks
Costo: 2000 × 500 tokens × $0.00013/1K tokens = $0.13/mes
```

**Con caché de embeddings (60% reducción):**
```
Costo mensual con caché: ~$0.05/mes
```

---

## 📝 Próximos Pasos Inmediatos

1. ✅ **Ejecutar Fase 1** - Generar embeddings de 2 rúbricas existentes
   ```bash
   deno run --allow-net --allow-env scripts/generar-embeddings-rubricas.ts
   ```

2. ⏭️ **Configurar GitHub Actions** - Agregar secrets necesarios

3. ⏭️ **Ejecutar Fase 2** - Primera ejecución del workflow
   ```
   Actions → sync-rubricas-mineduc → Run workflow
   ```

4. ⏭️ **Verificar resultados** - Revisar métricas
   ```sql
   SELECT * FROM obtener_estadisticas_rag();
   ```

5. ⏭️ **Configurar Cohere** - Para reranking (opcional pero recomendado)
   ```
   Settings → Edge Functions → Secrets → COHERE_API_KEY
   ```

---

**Última actualización:** 2025-01-07
**Versión:** 1.0
