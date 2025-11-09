# Pipeline ETL Completo - Flujo End-to-End

## Arquitectura del Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    PIPELINE ETL COMPLETO                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   EXTRACT    │ ───> │  TRANSFORM   │ ───> │     LOAD     │
└──────────────┘      └──────────────┘      └──────────────┘
      │                      │                      │
      ▼                      ▼                      ▼
  Descargar PDF        Extraer Texto         Guardar en BD
  desde URLs           Generar Embeddings    PostgreSQL + pg_vector
```

## Componentes del Sistema

### 1. Edge Function: Monitor de Documentos
**Archivo**: `supabase/functions/monitor-documentos-oficiales/index.ts`

**Responsabilidades**:
- ✅ Scrapear sitio DocenteMás
- ✅ Detectar documentos nuevos/actualizados
- ✅ Descargar PDFs y guardar en Supabase Storage
- ✅ Registrar metadata en tabla `documentos_oficiales`
- ✅ Marcar documentos como `procesado: false`

**Salida**:
```json
{
  "documentos_nuevos": 5,
  "documentos_actualizados": 2,
  "detalles": [...]
}
```

### 2. Script Python: Pipeline Completo ETL
**Archivo**: `scripts/pipeline-document-mineduc/pipeline-completo.py`

**Responsabilidades**:
- ✅ Obtener documentos pendientes (`procesado: false`)
- ✅ Descargar PDF desde `url_original`
- ✅ Extraer texto con PyMuPDF
- ✅ Generar embedding con OpenAI
- ✅ Guardar texto + embedding en BD
- ✅ Marcar como `procesado: true`

**Flujo Detallado**:

```python
# PASO 1: Obtener documentos pendientes
documentos = supabase.table('documentos_oficiales')
    .select('id, titulo, url_original')
    .eq('procesado', False)
    .execute()

# PASO 2: Procesar cada documento
for doc in documentos:
    # 2.1 Descargar PDF
    pdf_data = requests.get(doc['url_original']).content
    
    # 2.2 Extraer texto
    with fitz.open(stream=pdf_data) as pdf:
        texto = "\n".join([page.get_text() for page in pdf])
    
    # 2.3 Generar embedding
    embedding = openai.embeddings.create(
        model="text-embedding-3-small",
        input=texto[:8000]
    ).data[0].embedding
    
    # 2.4 Guardar en BD
    supabase.table('documentos_oficiales').update({
        'contenido_texto': texto,
        'embedding': embedding,
        'procesado': True,
        'fecha_procesamiento': datetime.now()
    }).eq('id', doc['id']).execute()
```

### 3. GitHub Actions Workflow
**Archivo**: `.github/workflows/sync-rubricas-mineduc.yml`

**Ejecución**:
- 🕐 Automática: Domingos a las 2 AM UTC
- 🔘 Manual: Workflow dispatch

**Jobs**:

```yaml
1. monitor-documentos
   ├─ Invocar Edge Function
   ├─ Detectar documentos nuevos
   └─ Output: has_changes=true/false

2. process-documents (si has_changes=true)
   ├─ Ejecutar pipeline-completo.py
   ├─ Descargar + Procesar + Guardar
   └─ Output: processed_count=N

3. extract-rubricas (si processed_count>0)
   ├─ Ejecutar rubric-extractor.py
   ├─ Extraer rúbricas estructuradas
   └─ Guardar en tabla rubricas_mbe
```

## Flujo Completo End-to-End

### Escenario: Nuevo Documento Detectado

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DETECCIÓN (Edge Function)                                    │
└─────────────────────────────────────────────────────────────────┘

DocenteMás Website
    │
    ├─> Scraping HTML
    │   └─> Detectar: "Manual Ed. Básica 2025.pdf"
    │
    ├─> Descargar PDF
    │   └─> Guardar en Storage: documentos-oficiales/manuales/2025/...
    │
    └─> Registrar en BD
        INSERT INTO documentos_oficiales (
            titulo: "Manual Ed. Básica 2025",
            url_original: "https://...",
            storage_path: "manuales/2025/...",
            procesado: FALSE  ← IMPORTANTE
        )

┌─────────────────────────────────────────────────────────────────┐
│ 2. PROCESAMIENTO (Python Pipeline)                              │
└─────────────────────────────────────────────────────────────────┘

SELECT * FROM documentos_oficiales WHERE procesado = FALSE
    │
    ├─> Documento encontrado: "Manual Ed. Básica 2025"
    │
    ├─> EXTRACT: Descargar desde url_original
    │   └─> requests.get(url_original) → pdf_data (bytes)
    │
    ├─> TRANSFORM: Procesar PDF
    │   ├─> PyMuPDF: Extraer texto → "Objetivos de aprendizaje..."
    │   └─> OpenAI API: Generar embedding → [0.123, -0.456, ...] (1536 dims)
    │       ⚠️ OpenAI NO almacena el embedding, solo lo genera
    │
    └─> LOAD: Guardar en PostgreSQL con pg_vector
        UPDATE documentos_oficiales SET
            contenido_texto = "Objetivos de aprendizaje...",
            embedding = [0.123, -0.456, ...],  ← Vector guardado en PostgreSQL
            procesado = TRUE,
            fecha_procesamiento = NOW(),
            embedding_model = 'text-embedding-3-small',
            embedding_version = 'v1.0'
        WHERE id = documento_id
        
        ✅ Embedding persistido en PostgreSQL para búsquedas futuras

┌─────────────────────────────────────────────────────────────────┐
│ 3. EXTRACCIÓN DE RÚBRICAS (Opcional)                            │
└─────────────────────────────────────────────────────────────────┘

Si tipo_documento = 'rubricas':
    │
    ├─> Leer contenido_texto
    │
    ├─> Extraer con IA (OpenAI → Gemini → Cohere → Anthropic)
    │   └─> JSON estructurado con criterios y niveles
    │
    └─> Guardar en tabla rubricas_mbe
        INSERT INTO rubricas_mbe (
            documento_id,
            asignatura,
            nivel_educativo,
            criterios: {...},
            niveles_desempeño: {...}
        )
```

## Ventajas del Diseño Actual

### ✅ Separación de Responsabilidades
- **Edge Function**: Detección y descarga inicial
- **Python Script**: Procesamiento pesado (OCR, embeddings)
- **Rubric Extractor**: Extracción estructurada con IA

### ✅ Resiliencia
- Cada componente puede fallar independientemente
- Reintentos automáticos en cada etapa
- Estado persistente en BD (`procesado: false/true`)

### ✅ Escalabilidad
- Procesamiento por lotes (50 documentos a la vez)
- Límite de páginas (50 por PDF)
- Timeout protection en cada etapa

### ✅ Observabilidad
- Logs detallados en cada paso
- Métricas en tabla `metricas_pipeline_rag`
- Notificaciones a administradores

## Optimizaciones Implementadas

### 1. Sin Almacenamiento Redundante
```python
# ❌ ANTES: Descargar desde Storage
pdf_data = supabase.storage.from_('documentos-oficiales').download(storage_path)

# ✅ AHORA: Descargar desde URL original
pdf_data = requests.get(url_original).content
```

**Ahorro**: ~90% en costos de Storage

### 2. Procesamiento en Memoria
```python
# Todo el procesamiento en memoria, sin archivos temporales
with fitz.open(stream=pdf_data, filetype="pdf") as doc:
    texto = extraer_texto(doc)
    embedding = generar_embedding(texto)
    guardar_en_bd(texto, embedding)
```

### 3. Embeddings Optimizados
```python
# Usar solo contenido relevante (primeras 8000 caracteres)
texto_limpio = limpiar_texto(texto)[:8000]
embedding = openai.embeddings.create(
    model="text-embedding-3-small",  # Modelo más económico
    input=texto_limpio
)
```

**Ahorro**: ~$0.01 por documento

## Monitoreo y Debugging

### Ver Documentos Pendientes
```sql
SELECT id, titulo, url_original, fecha_descarga
FROM documentos_oficiales
WHERE procesado = FALSE
ORDER BY fecha_descarga DESC;
```

### Ver Documentos Procesados Hoy
```sql
SELECT id, titulo, 
       LENGTH(contenido_texto) as texto_length,
       embedding_model,
       fecha_procesamiento
FROM documentos_oficiales
WHERE procesado = TRUE
  AND fecha_procesamiento::date = CURRENT_DATE;
```

### Ver Errores de Procesamiento
```sql
SELECT documento_id, error_mensaje, fecha_error
FROM reintentos_procesamiento
WHERE fecha_error > NOW() - INTERVAL '24 hours'
ORDER BY fecha_error DESC;
```

## Ejecución Manual

### Ejecutar Pipeline Completo
```bash
cd scripts/pipeline-document-mineduc
python pipeline-completo.py
```

### Ejecutar Solo Extracción de Rúbricas
```bash
python rubric-extractor.py --auto --verbose
```

### Ejecutar Workflow Completo
```bash
# Desde GitHub Actions UI
# 1. Ir a Actions tab
# 2. Seleccionar "Sync Datos MINEDUC"
# 3. Click "Run workflow"
# 4. Configurar opciones:
#    - force_full_sync: true/false
#    - force_rubric_extraction: true/false
```

## Próximos Pasos

### Mejoras Planificadas
- [ ] Procesamiento paralelo (múltiples documentos simultáneos)
- [ ] Cache de embeddings para documentos similares
- [ ] Detección inteligente de cambios (diff semántico)
- [ ] Compresión de texto antes de almacenar
- [ ] Índices vectoriales optimizados (HNSW en lugar de IVFFlat)

### Integraciones Futuras
- [ ] Webhook para notificaciones en tiempo real
- [ ] Dashboard de monitoreo del pipeline
- [ ] API REST para consultar estado del pipeline
- [ ] Exportación de métricas a Prometheus/Grafana
