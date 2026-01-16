# 💾 Sistema de Caché de Extracciones IA

## 🎯 Problema Resuelto

**ANTES**: Cada vez que ejecutabas el pipeline, volvías a pagar por extracciones IA de los mismos PDFs:

```bash
# Primera ejecución
python fase2_transform.py
# → 20 docs × $0.025 = $0.50

# Segunda ejecución (después de un fix)
python fase2_transform.py
# → 20 docs × $0.025 = $0.50 DE NUEVO 💸

# Total: $1.00 por el mismo contenido
```

**DESPUÉS**: Sistema de caché reutiliza extracciones previas:

```bash
# Primera ejecución
python fase2_transform_multiproveedor.py
# → 20 docs × $0.025 = $0.50

# Segunda ejecución
python fase2_transform_multiproveedor.py
# → 20 docs desde caché = $0.00 ✅

# AHORRO: $0.50 (100% en re-ejecuciones)
```

## 🏗️ Arquitectura del Caché

### Tabla de Base de Datos

```sql
CREATE TABLE extraccion_cache (
    pdf_hash TEXT PRIMARY KEY,           -- SHA-256 del contenido binario
    tipo_documento TEXT NOT NULL,        -- rubricas, manuales, etc.
    contenido_markdown TEXT NOT NULL,    -- Resultado de la extracción
    metadata JSONB NOT NULL,             -- Proveedor, costo, fecha, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 1       -- Contador de reutilizaciones
);
```

### Flujo de Funcionamiento

```
┌─────────────────────────┐
│ PDF de Storage          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 1. Generar Hash SHA-256 │  ← hash_pdf = sha256(pdf_bytes)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Buscar en Caché      │  ← SELECT FROM extraccion_cache WHERE pdf_hash = ?
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌──────────┐   ┌──────────┐
│ HIT ✅   │   │ MISS ❌  │
│ Retornar │   │ Extraer  │
│ Guardado │   │ con IA   │
│ $0.00    │   │ $0.025   │
└──────────┘   └────┬─────┘
                    │
                    ▼
            ┌───────────────┐
            │ Guardar Cache │
            └───────────────┘
```

## 📊 Beneficios Medibles

### Escenario Real: Desarrollo del Pipeline

```
Ciclo de desarrollo típico:
├─ Implementación inicial: 5 ejecuciones
├─ Debugging y fixes: 10 ejecuciones
├─ Testing en producción: 3 ejecuciones
└─ TOTAL: 18 ejecuciones

Con 20 documentos por ejecución:

SIN CACHÉ:
18 ejecuciones × 20 docs × $0.025 = $9.00 💸

CON CACHÉ:
1ª ejecución: 20 docs × $0.025 = $0.50
2ª-18ª ejecuciones: 20 docs × $0.00 = $0.00
TOTAL: $0.50 ✅

AHORRO: $8.50 (94%)
```

### Casos de Uso del Caché

| Escenario | Cache Hit Rate | Ahorro |
|-----------|---------------|--------|
| **Re-ejecución completa** | 100% | 100% |
| **5 docs nuevos, 15 existentes** | 75% | 75% |
| **Documentos renombrados** | 100% | 100% |
| **Versión actualizada de doc** | 0% | 0% (correcto) |

## 🔍 Características Técnicas

### 1. Hash del Contenido (no del nombre)

```python
# Hash basado en contenido binario
pdf_hash = hashlib.sha256(pdf_bytes).hexdigest()

# Ventajas:
✅ Documento renombrado → MISMO hash → Usa caché
✅ Documento movido → MISMO hash → Usa caché
✅ Contenido actualizado → HASH DIFERENTE → Re-procesa
```

**Ejemplo**:
```
rubrica_mbe_v1.pdf (hash: a1b2c3...)
    ↓ renombrar a
rubrica_evaluacion_2024.pdf (hash: a1b2c3... IGUAL)
    → Cache HIT ✅
```

### 2. Scope por Tipo de Documento

El caché es específico por tipo:

```python
cache_key = (pdf_hash, tipo_documento)

# Ejemplos:
('a1b2c3...', 'rubricas')     → Entrada 1
('a1b2c3...', 'manuales')     → Entrada 2 (diferente!)
```

**Razón**: El mismo PDF puede extraerse de forma diferente según el tipo (prompts especializados).

### 3. Métricas de Uso

Cada entrada del caché registra:

```json
{
  "metadata": {
    "proveedor": "gemini",
    "costo_original_usd": 0.025,
    "fecha_extraccion": "2025-11-08T10:30:00Z",
    "longitud_chars": 12450,
    "tipo_pdf": "escaneado_complejo",
    "version_script": "2.0"
  },
  "access_count": 5,  // Reutilizado 5 veces
  "last_accessed_at": "2025-11-08T15:45:00Z"
}
```

**Utilidad**: Calcular ROI del caché

```sql
-- Ahorro total generado por el caché
SELECT 
    SUM((metadata->>'costo_original_usd')::float * (access_count - 1)) as ahorro_total_usd,
    SUM(access_count - 1) as total_reutilizaciones
FROM extraccion_cache;
```

## 🚀 Uso

### Configuración Inicial

1. **Crear tabla** (ejecutar una vez):

```sql
CREATE TABLE IF NOT EXISTS extraccion_cache (
    pdf_hash TEXT PRIMARY KEY,
    tipo_documento TEXT NOT NULL,
    contenido_markdown TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    access_count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_cache_lookup ON extraccion_cache(pdf_hash, tipo_documento);
ALTER TABLE extraccion_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON extraccion_cache FOR ALL USING (auth.role() = 'service_role');
```

2. **Ejecutar pipeline** (automático):

```bash
python scripts/pipeline-document-mineduc/fase2_transform_multiproveedor.py
```

El caché se gestiona automáticamente - no requiere configuración adicional.

### Ejemplo de Salida

```
📄 Procesando 25 PDFs...
🤖 IA: ✅ Habilitada
   Proveedores: GEMINI → OPENAI → ANTHROPIC

📄 Rúbrica MBE Nivel 1.pdf
  📋 Tipo: escaneado_complejo
  🔍 CACHÉ MISS - Extrayendo con IA...
  🤖 Intentando con GEMINI... ✅ Éxito
  💾 Guardado en caché (hash: 7f3a9b2c...)
  ✅ 12,450 chars (ia_gemini) $0.0000

📄 Rúbrica MBE Nivel 1.pdf  (segunda ejecución)
  📋 Tipo: escaneado_complejo
  💾 CACHÉ HIT (reutilización #2) - Ahorro: $0.0250
     Extracción original: gemini
  ✅ 12,450 chars (ia_cache) $0.0000

==================================================
✅ Transformados: 25/25
💰 Costo total IA: $0.25 USD
📊 Proveedores usados: {
  "gemini": 10,
  "cache": 15,   ← 15 docs reutilizados!
  "pymupdf": 0
}
```

## 🔧 Mantenimiento

### Limpiar Caché Antiguo

Opcional - eliminar entradas no accedidas en 90+ días:

```sql
-- Ver qué se eliminaría
SELECT 
    COUNT(*) as total_a_eliminar,
    SUM((metadata->>'costo_original_usd')::float) as valor_acumulado
FROM extraccion_cache
WHERE last_accessed_at < NOW() - INTERVAL '90 days';

-- Ejecutar limpieza
DELETE FROM extraccion_cache
WHERE last_accessed_at < NOW() - INTERVAL '90 days';
```

**Recomendación**: NO limpiar caché a menos que haya problemas de espacio en BD.

### Invalidar Caché de un Documento

Si necesitas forzar re-extracción:

```sql
-- Por hash específico
DELETE FROM extraccion_cache WHERE pdf_hash = 'a1b2c3...';

-- Por tipo de documento (invalidar todas las rúbricas)
DELETE FROM extraccion_cache WHERE tipo_documento = 'rubricas';

-- Invalidar TODO el caché (usar con precaución)
TRUNCATE extraccion_cache;
```

## 📈 Métricas y Reportes

### Dashboard de Caché

```sql
-- Resumen general
SELECT 
    COUNT(*) as total_documentos_cacheados,
    SUM(access_count) as total_accesos,
    SUM(access_count - 1) as total_reutilizaciones,
    SUM((metadata->>'costo_original_usd')::float * (access_count - 1)) as ahorro_acumulado_usd
FROM extraccion_cache;

-- Por tipo de documento
SELECT 
    tipo_documento,
    COUNT(*) as docs_cacheados,
    SUM(access_count - 1) as reutilizaciones,
    ROUND(SUM((metadata->>'costo_original_usd')::float * (access_count - 1))::numeric, 2) as ahorro_usd
FROM extraccion_cache
GROUP BY tipo_documento
ORDER BY ahorro_usd DESC;

-- Top 10 documentos más reutilizados
SELECT 
    pdf_hash,
    tipo_documento,
    access_count,
    metadata->>'costo_original_usd' as costo_original,
    ROUND(((access_count - 1) * (metadata->>'costo_original_usd')::float)::numeric, 2) as ahorro_total
FROM extraccion_cache
ORDER BY access_count DESC
LIMIT 10;

-- Tasa de hit del caché (últimos 30 días)
SELECT 
    DATE(created_at) as fecha,
    COUNT(*) as nuevas_extracciones,
    (SELECT SUM(access_count - 1) FROM extraccion_cache WHERE DATE(created_at) = DATE(ec.created_at)) as cache_hits
FROM extraccion_cache ec
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
```

### Ejemplo de Resultados

```
total_documentos_cacheados | 45
total_accesos              | 127
total_reutilizaciones      | 82
ahorro_acumulado_usd       | 2.05
```

**Interpretación**: 45 documentos únicos han sido accedidos 127 veces, generando 82 reutilizaciones que ahorraron $2.05 USD.

## ⚠️ Consideraciones

### Cuándo NO se usa el caché

1. **Documento modificado**: Contenido diferente → hash diferente → extracción nueva ✅
2. **Tipo de documento cambiado**: Mismo PDF pero tipo diferente → entrada caché diferente ✅
3. **Primera ejecución**: Caché vacío → todas son MISS

### Espacio en Disco

```
Estimación de espacio por documento cacheado:
├─ Hash (64 chars): ~100 bytes
├─ Contenido Markdown promedio: ~15 KB
├─ Metadata JSON: ~500 bytes
└─ TOTAL por documento: ~16 KB

100 documentos cacheados ≈ 1.6 MB
1,000 documentos ≈ 16 MB
10,000 documentos ≈ 160 MB
```

**Conclusión**: Espacio insignificante, mantener caché indefinidamente.

## 🎯 Casos de Uso Reales

### Desarrollo Iterativo

```
Desarrollando nueva feature:
├─ Ejecución 1: Implementación → $0.50 (cache miss)
├─ Ejecución 2: Fix bug → $0.00 (cache hit)
├─ Ejecución 3: Testing → $0.00 (cache hit)
├─ Ejecución 4: Ajuste → $0.00 (cache hit)
└─ Ejecución 5: Deploy → $0.00 (cache hit)

AHORRO: $2.00 (80%)
```

### Documentos MINEDUC Actualizados

```
Escenario: MINEDUC publica nueva versión de rúbrica

rubrica_2024.pdf (hash: abc123) → Procesado en Enero
    ↓ MINEDUC actualiza contenido
rubrica_2025.pdf (hash: xyz789) → Nuevo hash → Re-procesa

✅ Sistema detecta cambio automáticamente
```

### Testing en CI/CD

```yaml
# GitHub Actions ejecuta pipeline en cada PR
# Sin caché: Cada PR × 20 docs × $0.025 = $0.50
# 100 PRs/mes = $50/mes

# Con caché: Solo primera ejecución = $0.50/mes
# AHORRO: $49.50/mes (99%)
```

---

**Última actualización**: Noviembre 2025  
**Versión**: 3.0 (con Sistema de Caché)
