# MLOps Pipeline - Documentación

## Descripción General

Pipeline de procesamiento de documentos MINEDUC con mejores prácticas MLOps que incluye:

- **ETL completo**: Extracción, transformación y carga de datos
- **Validación de calidad**: Verificación automática de documentos procesados
- **Optimización**: Índices vectoriales optimizados para búsquedas rápidas
- **Métricas**: Registro detallado en tablas de métricas

## Arquitectura del Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    MLOPS PIPELINE                           │
└─────────────────────────────────────────────────────────────┘

FASE 1: OBTENCIÓN
├── Consulta documentos_oficiales (procesado = false)
└── Límite: 50 documentos por ejecución

FASE 2: ETL
├── EXTRACT
│   ├── Descarga PDF desde URL original
│   └── Validación de descarga exitosa
├── TRANSFORM
│   ├── Extracción de texto con PyMuPDF
│   ├── Limpieza y normalización
│   └── Fallback a OCR si es necesario
└── LOAD
    ├── Generación de embeddings (OpenAI)
    ├── Conteo de tokens y costo
    └── Almacenamiento en PostgreSQL

FASE 3: VALIDACIÓN
├── Validación de calidad del texto
├── Cálculo de score de calidad (0-1)
└── Conteo de chunks validados

FASE 4: OPTIMIZACIÓN
├── Creación de índices HNSW
├── Análisis de tabla para estadísticas
└── Optimización de búsquedas vectoriales

FASE 5: MÉTRICAS
├── Registro en metricas_procesamiento
├── Registro en metricas_pipeline_rag
└── Generación de reporte final
```

## Tablas de Métricas

### metricas_procesamiento

Registra métricas detalladas de cada ejecución del pipeline:

```sql
{
  tipo: 'etl_documentos',
  documentos_procesados: 10,
  documentos_fallidos: 2,
  tiempo_total_ms: 45000,
  concurrencia_usada: 1,
  metadata: {
    tiempo_extraccion_ms: 15000,
    tiempo_embedding_ms: 25000,
    tiempo_validacion_ms: 5000,
    tokens_usados: 50000,
    costo_estimado_usd: 0.0010,
    calidad_promedio: 0.85,
    chunks_validados: 10
  }
}
```

### metricas_pipeline_rag

Registra métricas agregadas por fecha:

```sql
{
  fecha: '2025-01-15',
  documentos_monitoreados: 12,
  documentos_procesados: 10,
  chunks_validados: 10,
  errores_criticos: 0,
  latencia_monitoreo_ms: 0,
  latencia_procesamiento_ms: 45000,
  workflow_run_id: 'pipeline_20250115_143022'
}
```

## Criterios de Validación de Calidad

El sistema valida la calidad de cada documento procesado con 5 criterios:

1. **Longitud mínima (20%)**: ≥500 caracteres
2. **Palabras legibles (30%)**: ≥100 palabras válidas
3. **Ratio palabras/caracteres (20%)**: Proporción adecuada
4. **Sin metadata excesiva (15%)**: Limpieza correcta
5. **Tiene embedding (15%)**: Vector generado exitosamente

**Score mínimo aprobatorio**: 0.7 (70%)

## Optimización de Embeddings

### Índice HNSW

El pipeline crea automáticamente índices HNSW (Hierarchical Navigable Small World) para búsquedas vectoriales rápidas:

```sql
CREATE INDEX idx_documentos_embedding_hnsw 
ON documentos_oficiales 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Ventajas de HNSW**:
- Búsquedas 10-100x más rápidas que IVFFlat
- Mejor recall (precisión)
- No requiere entrenamiento previo
- Escalable a millones de vectores

**Parámetros**:
- `m = 16`: Número de conexiones por nodo (balance velocidad/memoria)
- `ef_construction = 64`: Calidad del índice durante construcción

## Costos y Tokens

### Modelo de Embeddings

- **Modelo**: `text-embedding-3-small`
- **Dimensiones**: 1536
- **Costo**: $0.02 por 1M tokens
- **Límite por documento**: 8000 caracteres (~2000 tokens)

### Estimación de Costos

```
Documento promedio: 2000 tokens
Costo por documento: $0.00004 USD
100 documentos: $0.004 USD
1000 documentos: $0.04 USD
```

## Ejecución

### Manual

```bash
# Pipeline completo con métricas
python scripts/pipeline-document-mineduc/mlops_pipeline.py

# Solo validación de calidad
python scripts/pipeline-document-mineduc/fase4_validacion_calidad.py
```

### GitHub Actions

El pipeline se ejecuta automáticamente:

- **Programado**: Domingos a las 2 AM UTC
- **Manual**: Workflow dispatch con opciones

```yaml
workflow_dispatch:
  inputs:
    force_full_sync: boolean
    slack_notification: boolean
```

## Monitoreo y Alertas

### Métricas Clave

1. **Tasa de éxito**: `documentos_procesados / total`
2. **Calidad promedio**: Score promedio de validación
3. **Latencia**: Tiempo total de procesamiento
4. **Costo**: Gasto en tokens de OpenAI

### Umbrales de Alerta

- ⚠️ Calidad promedio < 70%
- ⚠️ Tasa de error > 20%
- ⚠️ Latencia > 60 segundos por documento
- ⚠️ Costo > $0.10 por ejecución

## Consultas Útiles

### Ver métricas recientes

```sql
-- Últimas 10 ejecuciones
SELECT 
  tipo,
  documentos_procesados,
  documentos_fallidos,
  tiempo_total_ms,
  metadata->>'costo_estimado_usd' as costo,
  metadata->>'calidad_promedio' as calidad,
  created_at
FROM metricas_procesamiento
WHERE tipo = 'etl_documentos'
ORDER BY created_at DESC
LIMIT 10;
```

### Métricas agregadas por fecha

```sql
-- Resumen semanal
SELECT 
  fecha,
  documentos_monitoreados,
  documentos_procesados,
  chunks_validados,
  errores_criticos,
  latencia_procesamiento_ms
FROM metricas_pipeline_rag
WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY fecha DESC;
```

### Documentos con baja calidad

```sql
-- Documentos que necesitan reprocesamiento
SELECT 
  id,
  titulo,
  tipo_documento,
  LENGTH(contenido_texto) as texto_length,
  procesado,
  fecha_procesamiento
FROM documentos_oficiales
WHERE procesado = true
  AND LENGTH(contenido_texto) < 500
ORDER BY fecha_procesamiento DESC;
```

## Troubleshooting

### Error: "No se pudo extraer texto"

**Causa**: PDF escaneado sin OCR
**Solución**: El pipeline intenta OCR automáticamente con Tesseract

### Error: "Embedding generation failed"

**Causa**: Texto muy largo o API key inválida
**Solución**: Verificar OPENAI_API_KEY y límite de 8000 caracteres

### Error: "Índice HNSW no se puede crear"

**Causa**: Extensión pgvector no instalada
**Solución**: 
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Mejoras Futuras

- [ ] Procesamiento paralelo con concurrencia
- [ ] Chunking inteligente para documentos largos
- [ ] Reranking con modelos de embeddings múltiples
- [ ] Cache de embeddings para documentos similares
- [ ] Alertas automáticas por Slack/Email
- [ ] Dashboard de métricas en tiempo real
- [ ] A/B testing de modelos de embeddings
- [ ] Versionado de embeddings para rollback
