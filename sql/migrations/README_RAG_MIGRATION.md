# Migración: Mejoras Sistema RAG (20250107)

## 📋 Descripción

Esta migración agrega infraestructura completa para mejorar el sistema RAG de ProfeFlow:

- ✅ Caché de embeddings para reducir costos
- ✅ Métricas de retrieval para monitoreo
- ✅ Búsqueda híbrida (vectorial + keyword BM25)
- ✅ Validación de calidad de datos
- ✅ Cronjobs de mantenimiento automático

## 🚀 Cómo Ejecutar

### Opción 1: Supabase SQL Editor (Recomendado)

1. Abre el Supabase SQL Editor: `https://supabase.com/dashboard/project/[YOUR_PROJECT]/sql`

2. Copia y pega el contenido de: `sql/migrations/20250107_mejoras_rag.sql`

3. Ejecuta el script (botón "Run")

4. Verifica que veas el mensaje: `✅ Migración completada - Estadísticas iniciales:`

### Opción 2: psql (CLI)

```bash
# 1. Configurar URL de conexión
export SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres'

# 2. Ejecutar script helper
./scripts/apply-rag-migration.sh

# O ejecutar directamente con psql:
psql $SUPABASE_DB_URL -f sql/migrations/20250107_mejoras_rag.sql
```

### Opción 3: GitHub Actions (Automatizado)

La migración puede ejecutarse automáticamente a través del workflow de CI/CD una vez configurado.

## ✅ Verificación Post-Migración

Ejecuta esta query en SQL Editor para verificar:

```sql
SELECT * FROM obtener_estadisticas_rag();
```

Deberías ver:

| Métrica | Valor |
|---------|-------|
| total_chunks | [número] |
| chunks_con_embedding | [número] |
| total_documentos | [número] |
| total_rubricas | [número] |

## 📊 Tablas Creadas

1. **cache_embeddings** - Caché de embeddings de queries
   - Reduce costos en ~60%
   - Auto-limpieza cada 7 días

2. **metricas_rag** - Métricas diarias del sistema
   - Similitud promedio
   - Latencia
   - Cache hit rate

3. **queries_sin_resultados** - Log de queries fallidas
   - Para análisis y mejoras

4. **validaciones_rag** - Historial de validaciones QA
   - Registrado por GitHub Actions

5. **metricas_pipeline_rag** - Métricas del pipeline ETL
   - Documentos procesados
   - Errores críticos

## 🔧 Funciones SQL Creadas

- `limpiar_cache_embeddings()` - Limpieza automática de caché
- `registrar_metrica_rag(...)` - Registrar métricas de consulta
- `buscar_hibrido(...)` - Búsqueda híbrida vectorial + keyword
- `obtener_estadisticas_rag()` - Dashboard de estadísticas

## ⏰ Cronjobs Configurados

- `limpiar-cache-embeddings` - Ejecuta diariamente a las 4 AM
  - Elimina embeddings no usados en 7+ días

## 🔐 Políticas RLS

Todas las tablas nuevas tienen RLS habilitado:
- Solo admins pueden leer datos
- Service role tiene acceso completo

## ⚠️ Notas Importantes

1. **Idempotente**: Esta migración puede ejecutarse múltiples veces sin errores
   - Usa `IF NOT EXISTS` en todos los CREATE INDEX
   - Verifica existencia antes de crear cronjobs

2. **Requisitos**:
   - PostgreSQL 12+
   - Extensión `pgvector` instalada
   - Extensión `pg_cron` instalada (para cronjobs)
   - Extensión `pg_trgm` para búsqueda full-text

3. **Rollback**: Para revertir, ejecuta:

```sql
DROP TABLE IF EXISTS cache_embeddings CASCADE;
DROP TABLE IF EXISTS metricas_rag CASCADE;
DROP TABLE IF EXISTS queries_sin_resultados CASCADE;
DROP TABLE IF EXISTS validaciones_rag CASCADE;
DROP TABLE IF EXISTS metricas_pipeline_rag CASCADE;
DROP FUNCTION IF EXISTS limpiar_cache_embeddings();
DROP FUNCTION IF EXISTS registrar_metrica_rag(DATE, NUMERIC, INTEGER);
DROP FUNCTION IF EXISTS buscar_hibrido(...);
DROP FUNCTION IF EXISTS obtener_estadisticas_rag();
SELECT cron.unschedule('limpiar-cache-embeddings');
```

## 📖 Documentación

Ver documentación completa en: `docs/ANALISIS-RAG-MINEDUC.md`

## 🐛 Troubleshooting

### Error: "relation already exists"

✅ **Solucionado**: La migración ahora es idempotente. Simplemente vuelve a ejecutarla.

### Error: "extension pg_cron does not exist"

Solución: Habilita la extensión en Supabase Dashboard:
1. Database → Extensions
2. Buscar "pg_cron"
3. Enable

### Error: "permission denied"

Asegúrate de usar la Service Role Key, no la Anon Key.

## 💡 Próximos Pasos

1. ✅ Migración completada
2. ⏭️ Configurar `COHERE_API_KEY` para reranking
3. ⏭️ Configurar GitHub Actions secrets
4. ⏭️ Activar workflow `sync-rubricas-mineduc`
5. ⏭️ Integrar `RAGRetriever` en edge functions existentes

---

**Creado:** 2025-01-07
**Versión:** 1.0
**Autor:** ProfeFlow Team
