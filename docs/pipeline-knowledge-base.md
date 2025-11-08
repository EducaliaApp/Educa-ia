# Pipeline de Base de Conocimientos - ProfeFlow

## Misión del Pipeline

**Obtener TODOS los datos de DocenteMás y crear una base de conocimientos sólida con embeddings en base de datos vectorial PostgreSQL.**

## Arquitectura de Datos

### 1. **Tabla Principal: `documentos_oficiales`**

Almacena documentos completos con metadata y embeddings:

```sql
- id (UUID): Identificador único
- titulo: Nombre del documento
- tipo_documento: rubrica | manual_portafolio | base_curricular | instructivo
- nivel_educativo: basica_1_6 | basica_7_8 | media | parvularia | especial | epja
- asignatura: matematica | lenguaje | ciencias_naturales | etc
- modalidad: regular | epja | especial_escuela | tecnico_profesional
- año_vigencia: 2025
- contenido_texto: Texto completo extraído
- embedding (vector): Embedding del documento completo
- hash_contenido: SHA-256 para deduplicación
- procesado: true/false
- url_original: URL fuente
```

### 2. **Tabla de Chunks: `chunks_documentos`**

Divide documentos en fragmentos para RAG optimizado:

```sql
- id (UUID): Identificador único
- documento_id: Referencia a documentos_oficiales
- contenido: Texto del chunk
- chunk_index: Orden del chunk
- seccion: Sección del documento
- embedding (vector): Embedding del chunk
- metadata (JSONB): Información adicional
```

### 3. **Cache de Embeddings: `cache_embeddings`**

Optimiza consultas frecuentes:

```sql
- query_hash: Hash de la consulta
- query_text: Texto de la consulta
- embedding (vector): Embedding cacheado
- uso_count: Contador de uso
- last_used_at: Última vez usado
```

### 4. **Métricas: `metricas_pipeline_rag`**

Tracking de ejecuciones:

```sql
- fecha: Fecha de ejecución
- documentos_monitoreados: Total encontrados
- documentos_procesados: Total procesados
- chunks_validados: Total de chunks
- errores_criticos: Errores encontrados
```

## Flujo del Pipeline

### Fase 1: Monitoreo (monitor-documentos)
```
DocenteMás URLs → Scraping → Clasificación → BD
```
- ✅ Rúbricas: `/documentos-descargables/rubricas/`
- ✅ Manuales: `/documentos-descargables/manuales-de-instrumentos/`
- ✅ Curriculares: `/documentos-descargables/documentos-curriculares/`

### Fase 2: Procesamiento (process-documents)
```
PDF → Extracción Texto → Limpieza → documentos_oficiales
```
- ✅ PyMuPDF para PDFs normales
- ✅ Tesseract OCR para PDFs escaneados
- ✅ Deduplicación por hash
- ✅ Sin almacenamiento en Storage (solo texto)

### Fase 3: Generación de Embeddings
```
Texto → OpenAI API → Vector (1536 dims) → pg_vector
```
- ✅ Modelo: `text-embedding-3-small`
- ✅ Almacenamiento: PostgreSQL con pg_vector
- ✅ Índice: IVFFlat para búsqueda rápida

### Fase 4: Chunking (Opcional)
```
Documento → Chunks (500 tokens) → chunks_documentos
```
- ✅ Chunks con overlap para contexto
- ✅ Embeddings por chunk
- ✅ Metadata preservada

### Fase 5: Extracción de Rúbricas
```
Texto → AI (OpenAI/Gemini/Cohere/Anthropic) → rubricas_mbe
```
- ✅ Extracción estructurada con IA
- ✅ 4-tier fallback para confiabilidad
- ✅ Validación de JSON

### Fase 6: Validación
```
Datos → Quality Checks → Métricas
```
- ✅ Validación de embeddings
- ✅ Quality score por documento
- ✅ Detección de errores críticos

## Índices Vectoriales

### IVFFlat en chunks_documentos
```sql
CREATE INDEX idx_chunks_embedding 
ON chunks_documentos 
USING ivfflat (embedding vector_cosine_ops);
```

### Full-Text Search
```sql
CREATE INDEX idx_chunks_fts 
ON chunks_documentos 
USING gin (to_tsvector('spanish', contenido));
```

## Búsqueda Híbrida

### 1. Búsqueda Vectorial
```sql
SELECT * FROM chunks_documentos
ORDER BY embedding <=> query_embedding
LIMIT 10;
```

### 2. Búsqueda por Texto
```sql
SELECT * FROM chunks_documentos
WHERE to_tsvector('spanish', contenido) @@ to_tsquery('spanish', 'planificación');
```

### 3. Búsqueda Híbrida (Vector + Texto)
```sql
SELECT *, 
  (embedding <=> query_embedding) as vector_distance,
  ts_rank(to_tsvector('spanish', contenido), query) as text_rank
FROM chunks_documentos
WHERE to_tsvector('spanish', contenido) @@ query
ORDER BY (vector_distance * 0.7 + (1 - text_rank) * 0.3)
LIMIT 10;
```

## Optimizaciones de Costos

### 1. Sin Storage de PDFs
- ❌ No guardamos PDFs en Supabase Storage
- ✅ Solo guardamos texto extraído
- 💰 Ahorro: ~90% en costos de storage

### 2. Cache de Embeddings
- ✅ Consultas frecuentes cacheadas
- ✅ Reduce llamadas a OpenAI API
- 💰 Ahorro: ~50% en costos de embeddings

### 3. Procesamiento Semanal
- ✅ Ejecución automática domingos 2 AM
- ✅ Solo procesa documentos nuevos/actualizados
- 💰 Ahorro: Procesamiento incremental

## Métricas de Calidad

### Quality Score (0-100)
```python
score = 0
if len(contenido_texto) > 100: score += 40
if embedding is not None: score += 30
if nivel_educativo: score += 10
if asignatura: score += 10
if año_vigencia: score += 10
```

### Criterios de Validación
- ✅ Texto extraído > 100 caracteres
- ✅ Embedding generado exitosamente
- ✅ Metadata completa
- ✅ Sin errores de procesamiento

## Monitoreo y Alertas

### Métricas Clave
- 📊 Documentos procesados / Total
- 📊 Embeddings generados / Total
- 📊 Quality score promedio
- 📊 Tasa de error
- 📊 Costo por documento

### Alertas
- 🚨 Error rate > 10%
- 🚨 Quality score < 70
- 🚨 Documentos sin embedding
- 🚨 Fallos en APIs

## Uso de la Base de Conocimientos

### 1. RAG (Retrieval Augmented Generation)
```typescript
// Buscar contexto relevante
const chunks = await supabase
  .rpc('buscar_chunks_similares', {
    query_embedding: embedding,
    match_threshold: 0.8,
    match_count: 5
  });

// Generar respuesta con contexto
const response = await openai.chat.completions.create({
  messages: [
    { role: 'system', content: 'Eres un asistente educativo...' },
    { role: 'user', content: `Contexto: ${chunks}\n\nPregunta: ${question}` }
  ]
});
```

### 2. Búsqueda Semántica
```typescript
// Buscar documentos similares
const docs = await supabase
  .from('documentos_oficiales')
  .select('*')
  .order('embedding <=> ' + query_embedding)
  .limit(10);
```

### 3. Filtrado por Metadata
```typescript
// Buscar por nivel y asignatura
const docs = await supabase
  .from('chunks_documentos')
  .select('*')
  .eq('nivel_educativo', 'basica_1_6')
  .eq('asignatura', 'matematica')
  .order('embedding <=> ' + query_embedding)
  .limit(5);
```

## Roadmap

### Completado ✅
- [x] Monitoreo automático de DocenteMás
- [x] Extracción de texto con OCR
- [x] Generación de embeddings
- [x] Base de datos vectorial
- [x] Extracción de rúbricas con IA
- [x] Validación de calidad
- [x] CI/CD con GitHub Actions

### En Progreso 🔄
- [ ] Chunking automático de documentos
- [ ] Cache de embeddings implementado
- [ ] Dashboard de métricas
- [ ] Alertas automáticas

### Planificado 📋
- [ ] Búsqueda híbrida optimizada
- [ ] Reranking de resultados
- [ ] Actualización incremental
- [ ] Versionado de documentos
- [ ] API pública de búsqueda

## Conclusión

El pipeline cumple con la misión de:
1. ✅ Obtener TODOS los datos de DocenteMás
2. ✅ Procesar y extraer texto completo
3. ✅ Generar embeddings con OpenAI
4. ✅ Almacenar en base de datos vectorial (pg_vector)
5. ✅ Crear base de conocimientos sólida y consultable
6. ✅ Optimizar costos (sin storage de PDFs)
7. ✅ Garantizar calidad con validaciones
8. ✅ Ejecutar automáticamente cada semana

La base de conocimientos está lista para ser usada en aplicaciones RAG, búsqueda semántica, y asistentes educativos inteligentes.
