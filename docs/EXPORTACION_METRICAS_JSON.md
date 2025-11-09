# 📊 Exportación de Métricas JSON - Pipeline RAG

## 📋 Resumen Ejecutivo

✅ **Archivos Modificados**:
- `scripts/pipeline-document-mineduc/fase2_transform_multiproveedor.py` → `transform_metrics.json`
- `scripts/pipeline-document-mineduc/fase3_load.py` → `load_metrics.json`  
- `scripts/pipeline-document-mineduc/fase4_validacion_calidad.py` → `validation_metrics.json`
- `scripts/pipeline-document-mineduc/fase5_optimize.py` → `optimize_metrics.json`
- (fase6 ya incluía `metrics_report.json` originalmente)

✅ **Workflow Actualizado**: `.github/workflows/pipeline-documentos-mineduc.yml`
- JSON-first extraction con `jq`
- Fallback automático a `grep`
- 7 artifacts persistentes (7-90 días retention)
- Resumen consolidado con tabla Markdown

✅ **Beneficios**:
- Métricas estructuradas para análisis histórico
- Integración con dashboards externos (Grafana, Kibana)
- Debugging facilitado (logs + JSON en mismo artifact)
- Compatibilidad backward (scripts mantienen output consola)

---

## Implementación Completada

Se ha agregado funcionalidad de exportación de métricas en formato JSON a todas las fases del pipeline ETL RAG.

---

## ✅ Scripts Modificados

### 1. **fase2_transform_multiproveedor.py**

#### Archivo JSON Generado: `transform_metrics.json`

```json
{
  "timestamp": "2025-11-08T22:13:45.123456",
  "fase": "transform",
  "documentos_procesados": 10,
  "transformados": 9,
  "fallidos": 1,
  "tasa_exito": 90.0,
  "tiempo_total_segundos": 45.32,
  "tiempo_promedio_por_doc": 5.03,
  "speedup_paralelismo": 3.2,
  "costo_ia": {
    "total_usd": 0.0234,
    "promedio_por_doc_usd": 0.0026
  },
  "proveedores_usados": {
    "gemini": {
      "count": 5,
      "porcentaje": 55.6
    },
    "gpt-4o": {
      "count": 3,
      "porcentaje": 33.3
    },
    "cache": {
      "count": 1,
      "porcentaje": 11.1
    }
  },
  "cache_stats": {
    "cache_hits": 1,
    "cache_miss": 8
  }
}
```

#### Función Agregada:
```python
def export_metrics_json(metrics: dict, filepath: str):
    """Exporta métricas en formato JSON para GitHub Actions"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(metrics, f, indent=2, ensure_ascii=False)
        print(f"\n📄 Métricas exportadas: {filepath}")
    except Exception as e:
        print(f"\n⚠️ Error exportando métricas: {e}")
```

---

### 2. **fase3_load.py**

#### Archivo JSON Generado: `load_metrics.json`

```json
{
  "timestamp": "2025-11-08T22:14:05.654321",
  "fase": "load",
  "documentos_procesados": 9,
  "documentos_cargados": 9,
  "documentos_fallidos": 0,
  "tasa_exito": 100.0,
  "chunks": {
    "total_generados": 145,
    "promedio_por_documento": 16
  },
  "embeddings": {
    "modelo": "text-embedding-3-large",
    "dimensiones": 1536,
    "tokens_totales": 87450,
    "tokens_promedio_por_doc": 9716
  },
  "costos": {
    "total_usd": 0.0114,
    "promedio_por_documento_usd": 0.0013,
    "costo_por_1k_tokens_usd": 0.00013
  },
  "configuracion": {
    "max_chunk_size": 6000,
    "min_chunk_size": 500,
    "overlap_size": 200
  }
}
```

#### Función Agregada

```python
def export_metrics_json(metrics: dict, filepath: str):
    """Exporta métricas en formato JSON para GitHub Actions"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(metrics, f, indent=2, ensure_ascii=False)
        print(f"\n📄 Métricas exportadas: {filepath}")
    except Exception as e:
        print(f"\n⚠️ Error exportando métricas: {e}")
```

#### Modificaciones
- Importado `json` en headers
- Agregada función `export_metrics_json()` antes del `sys.exit()`
- Incluye configuración de chunking y embeddings
- Calcula costo por 1K tokens para referencia

---

### 3. **fase4_validacion_calidad.py**

#### Archivo JSON Generado: `validation_metrics.json`

```json
{
  "timestamp": "2025-11-08T22:14:12.987654",
  "fase": "validacion",
  "total_documentos": 9,
  "aprobados": 8,
  "rechazados": 1,
  "calidad_promedio": 0.8523,
  "total_chunks": 145,
  "chunks_sin_embedding": 2,
  "tasa_aprobacion": 88.89,
  "detalles_rechazados": [
    {
      "id": "doc_123",
      "titulo": "Documento con problemas",
      "calidad": 0.45,
      "chunks": {
        "total": 5,
        "sin_embedding": 2
      }
    }
  ]
}
```

#### Modificaciones:
- Agregada función `export_metrics_json()` en el bloque `if __name__ == '__main__'`
- Exporta métricas antes del `sys.exit()`
- Incluye detalles de documentos rechazados

---

### 3. **fase5_optimize.py**

#### Archivo JSON Generado: `optimize_metrics.json`

```json
{
  "timestamp": "2025-11-08T22:15:30.456789",
  "fase": "optimize",
  "salud_sistema": true,
  "indices_verificados": true,
  "optimizacion_exitosa": true,
  "estadisticas_actualizadas": true,
  "metricas": {
    "documentos_completados": 9,
    "chunks_con_embedding": 145,
    "ratio_chunks_doc": 16.1,
    "embeddings_en_cache": 120,
    "tamano_indice_estimado_mb": 1.1
  },
  "recomendacion_reindexar": false
}
```

#### Modificaciones:
- Exporta métricas al final de `main()` antes del `return`
- Incluye `import json` dentro de la función para evitar dependencia global
- Captura estado de salud del sistema y métricas de índices

---

### 4. **fase6_metrics.py**

✅ **Ya incluía exportación JSON** mediante el argumento `--export-json`

Archivo generado: `metrics_report.json` (como se definió previamente)

---

## 🔧 GitHub Actions Workflow

El workflow ya está configurado para:

### Lectura de Métricas JSON

```yaml
- name: Ejecutar transformación
  id: transform
  run: |
    python scripts/pipeline-document-mineduc/fase2_transform_multiproveedor.py 2>&1 | tee transform.log
    
    # Leer de JSON (prioritario)
    if [ -f transform_metrics.json ]; then
      transformed=$(jq -r '.transformados' transform_metrics.json)
      cost=$(jq -r '.costo_ia.total_usd' transform_metrics.json)
      success="true"
    else
      # Fallback a grep
      transformed=$(grep -oP "Transformados: \K[0-9]+" transform.log || echo "0")
      cost=$(grep -oP "Costo total IA: \\$\K[0-9.]+" transform.log || echo "0")
      success="false"
    fi
    
    echo "count=$transformed" >> $GITHUB_OUTPUT
    echo "cost=$cost" >> $GITHUB_OUTPUT
```

### Upload de Artefactos

```yaml
- name: Upload transform metrics
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: transform-metrics
    path: |
      transform.log
      transform_metrics.json
    if-no-files-found: ignore
    retention-days: 30
```

---

## 📁 Artefactos Generados por Fase

| Fase | Archivo JSON | Retención | Contenido Clave |
|------|--------------|-----------|-----------------|
| **1. Extract** | `monitor_response.json` | 7 días | Documentos nuevos/actualizados |
| **2. Transform** | `transform_metrics.json` | 30 días | Transformados, costo IA, proveedores |
| **3. Load** | `load_metrics.json` | 30 días | Chunks, tokens, embeddings, costo |
| **4. Validación** | `validation_metrics.json` | 30 días | Calidad, aprobados/rechazados |
| **5. Optimización** | `optimize_metrics.json` | 30 días | Índices, salud sistema |
| **6. Métricas** | `metrics_report.json` | 90 días | Consolidado + histórico |

---

## 🎯 Beneficios

### 1. **Robustez**
- ✅ Fallback automático a `grep` si JSON no existe
- ✅ Validación de campos con `jq`
- ✅ Manejo de errores en exportación

### 2. **Trazabilidad**
- ✅ Timestamp en cada métrica
- ✅ Artefactos persistentes (7-90 días)
- ✅ Histórico completo por workflow run

### 3. **Integración**
- ✅ Compatible con dashboards externos (Grafana, Kibana)
- ✅ API-friendly (JSON estándar)
- ✅ Fácil parsing con `jq` o Python

### 4. **Debugging**
- ✅ Logs + JSON en mismo artefacto
- ✅ Detalles de documentos rechazados
- ✅ Métricas de proveedores IA usados

---

## 🚀 Uso

### Descarga Manual de Métricas

```bash
# Desde workflow run
gh run download <run-id> -n transform-metrics

# Ver métricas
cat transform_metrics.json | jq '.'

# Extraer costo específico
cat transform_metrics.json | jq -r '.costo_ia.total_usd'
```

### Análisis Programático

```python
import json

# Cargar métricas
with open('transform_metrics.json') as f:
    metrics = json.load(f)

# Análisis
print(f"Tasa de éxito: {metrics['tasa_exito']}%")
print(f"Proveedor más usado: {max(metrics['proveedores_usados'].items(), key=lambda x: x[1]['count'])[0]}")
print(f"Ahorro por caché: ${metrics['cache_stats']['cache_hits'] * 0.003:.4f}")
```

---

## ⚠️ Notas Importantes

### Compatibilidad Backward

Los scripts mantienen compatibilidad con ejecuciones previas:
- ✅ Si falla exportación JSON → solo warning, no error fatal
- ✅ Workflow tiene fallback a `grep` de logs
- ✅ JSON es adicional, no reemplaza logs existentes

### Formato JSON Estándar

Todos los archivos usan:
- Encoding UTF-8
- `indent=2` para legibilidad
- `ensure_ascii=False` para caracteres especiales
- Campos consistentes: `timestamp`, `fase`, etc.

### Ubicación de Archivos

Los archivos JSON se generan en el **directorio de trabajo actual** donde se ejecuta el script:
- En GitHub Actions: Directorio raíz del repo
- Local: Donde ejecutes `python scripts/...`

---

## 📊 Dashboard Recomendado

Con estos JSONs puedes crear dashboard que muestre:

1. **Tendencia de costos** (por fecha)
2. **Distribución de proveedores IA**
3. **Tasa de éxito por fase**
4. **Velocidad de procesamiento** (docs/hora)
5. **Efectividad de caché** (% hits)
6. **Calidad promedio de documentos**

---

**Implementado por**: GitHub Copilot  
**Fecha**: 2025-11-08  
**Versión**: v2.1 (JSON Export)
