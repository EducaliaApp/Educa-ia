# Almacenamiento de Embeddings - Aclaración

## ❓ Pregunta Común: ¿Dónde se guardan los embeddings?

### ✅ Respuesta: En PostgreSQL (tu base de datos)

Los embeddings **NO** se almacenan en OpenAI. OpenAI solo los **genera**.

## 🔄 Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. GENERAR EMBEDDING (OpenAI API)                           │
└─────────────────────────────────────────────────────────────┘

Texto: "Manual de Matemática para Educación Básica..."
    │
    ├─> Enviar a OpenAI API
    │   POST https://api.openai.com/v1/embeddings
    │   {
    │     "model": "text-embedding-3-small",
    │     "input": "Manual de Matemática..."
    │   }
    │
    └─> Recibir vector (1536 números)
        [0.0234, -0.0567, 0.0123, ..., 0.0891]
        
        ⚠️ OpenAI NO guarda este vector
        ⚠️ Solo lo genera y te lo devuelve

┌─────────────────────────────────────────────────────────────┐
│ 2. GUARDAR EN POSTGRESQL (Tu Base de Datos)                 │
└─────────────────────────────────────────────────────────────┘

UPDATE documentos_oficiales SET
    embedding = '[0.0234, -0.0567, 0.0123, ..., 0.0891]'::vector(1536)
WHERE id = 'abc-123'

✅ Ahora el embedding está en TU base de datos
✅ Puedes hacer búsquedas vectoriales sin llamar a OpenAI
✅ Persiste para siempre (hasta que lo borres)

┌─────────────────────────────────────────────────────────────┐
│ 3. USAR EN BÚSQUEDAS (Sin llamar a OpenAI)                  │
└─────────────────────────────────────────────────────────────┘

-- Búsqueda vectorial usando embeddings guardados
SELECT titulo, contenido_texto,
       1 - (embedding <=> query_embedding) as similitud
FROM documentos_oficiales
WHERE 1 - (embedding <=> query_embedding) > 0.7
ORDER BY embedding <=> query_embedding
LIMIT 10;

✅ Búsqueda ultra-rápida (50-200ms)
✅ Sin costo adicional de OpenAI
✅ Usa índice vectorial IVFFlat
```

## 💾 Estructura en PostgreSQL

```sql
-- Tabla documentos_oficiales
CREATE TABLE documentos_oficiales (
    id uuid PRIMARY KEY,
    titulo text,
    contenido_texto text,
    
    -- ✅ AQUÍ se guarda el embedding (1536 dimensiones)
    embedding vector(1536),
    
    -- Metadata del embedding
    embedding_model text DEFAULT 'text-embedding-3-small',
    embedding_version text DEFAULT 'v1.0',
    embedding_generated_at timestamptz,
    
    procesado boolean DEFAULT false,
    fecha_procesamiento timestamptz
);

-- Índice vectorial para búsquedas rápidas
CREATE INDEX idx_documentos_embedding 
ON documentos_oficiales 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## 🔍 Verificar que los Embeddings están Guardados

### Opción 1: SQL
```bash
# Ejecutar en Supabase SQL Editor
psql -f scripts/verificar-embeddings.sql
```

### Opción 2: Python
```bash
cd scripts
python verificar-embeddings.py
```

### Opción 3: Supabase Dashboard
```sql
-- En SQL Editor de Supabase
SELECT 
    titulo,
    embedding IS NOT NULL as tiene_embedding,
    array_length(embedding, 1) as dimensiones
FROM documentos_oficiales
WHERE procesado = true
LIMIT 5;
```

## 💰 Costos

### Generar Embeddings (OpenAI)
```
Costo: $0.00002 por 1K tokens
Ejemplo: Documento de 8000 caracteres ≈ 2K tokens
Costo por documento: $0.00004 (una sola vez)
```

### Almacenar Embeddings (PostgreSQL)
```
Tamaño: 1536 floats × 4 bytes = 6KB por documento
100 documentos = 600KB
1000 documentos = 6MB

Costo de almacenamiento: ~$0.00 (incluido en plan Supabase)
```

### Buscar con Embeddings (PostgreSQL)
```
Costo: $0.00 (sin llamadas a OpenAI)
Velocidad: 50-200ms por búsqueda
Escalabilidad: Constante con índices vectoriales
```

## 🎯 Casos de Uso en ProfeFlow

### 1. Generar Planificación
```typescript
// Usuario: "Planificación de matemática para 3° básico"

// 1. Generar embedding de la query (OpenAI)
const queryEmbedding = await openai.embeddings.create({
  input: "planificación matemática 3° básico"
})

// 2. Buscar en PostgreSQL (sin OpenAI)
const docs = await supabase.rpc('buscar_documentos_similares', {
  query_embedding: queryEmbedding.data[0].embedding,
  match_threshold: 0.7
})

// 3. Usar documentos encontrados en GPT-4
const planificacion = await openai.chat.completions.create({
  messages: [{
    role: "system",
    content: `Contexto oficial: ${docs.map(d => d.contenido_texto).join('\n')}`
  }]
})
```

### 2. Evaluar Portafolio Docente
```typescript
// 1. Extraer texto del portafolio
const textoPortafolio = await extraerTexto(pdf)

// 2. Generar embedding (OpenAI - una vez)
const embedding = await openai.embeddings.create({
  input: textoPortafolio
})

// 3. Buscar rúbricas MBE relevantes (PostgreSQL)
const rubricas = await supabase.rpc('buscar_rubricas_similares', {
  query_embedding: embedding.data[0].embedding,
  asignatura: "Matemática"
})

// 4. Evaluar con IA
const evaluacion = await evaluarConIA(textoPortafolio, rubricas)
```

## ✅ Conclusión

| Aspecto | OpenAI | PostgreSQL |
|---------|--------|------------|
| **Genera embeddings** | ✅ Sí | ❌ No |
| **Almacena embeddings** | ❌ No | ✅ Sí |
| **Búsqueda vectorial** | ❌ No | ✅ Sí |
| **Costo por búsqueda** | $0.00002 | $0.00 |
| **Velocidad búsqueda** | 200-500ms | 50-200ms |
| **Persistencia** | No | Permanente |

**Tu pipeline actual es correcto**: OpenAI genera, PostgreSQL almacena y busca.
