#!/bin/bash

# Script para ejecutar la migración de mejoras RAG de manera segura
# Uso: ./apply-rag-migration.sh

set -e  # Exit on error

echo "🔧 Aplicando migración: Mejoras Sistema RAG"
echo "============================================"
echo ""

# Verificar que existe el archivo de migración
MIGRATION_FILE="sql/migrations/20250107_mejoras_rag.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: No se encuentra el archivo de migración: $MIGRATION_FILE"
    exit 1
fi

echo "✅ Archivo de migración encontrado"
echo ""

# Verificar variables de entorno
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "⚠️  Variable SUPABASE_DB_URL no definida"
    echo "💡 Necesitas configurar la URL de conexión a la base de datos"
    echo ""
    echo "Ejemplo:"
    echo "  export SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres'"
    echo ""
    echo "O ejecuta directamente con psql:"
    echo "  psql [DATABASE_URL] -f $MIGRATION_FILE"
    echo ""
    exit 1
fi

echo "✅ Variable SUPABASE_DB_URL configurada"
echo ""

# Confirmar con el usuario
echo "📋 Esta migración creará:"
echo "   - 5 nuevas tablas (cache_embeddings, metricas_rag, etc.)"
echo "   - 6 índices vectoriales"
echo "   - 3 funciones SQL"
echo "   - Políticas RLS"
echo "   - 1 cronjob de mantenimiento"
echo ""
read -p "¿Deseas continuar? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migración cancelada"
    exit 1
fi

echo ""
echo "🚀 Ejecutando migración..."
echo ""

# Ejecutar migración
if psql "$SUPABASE_DB_URL" -f "$MIGRATION_FILE"; then
    echo ""
    echo "✅ Migración completada exitosamente"
    echo ""
    echo "📊 Próximos pasos:"
    echo "   1. Verificar estadísticas: SELECT * FROM obtener_estadisticas_rag();"
    echo "   2. Configurar COHERE_API_KEY para reranking"
    echo "   3. Activar GitHub Actions workflow"
    echo ""
else
    echo ""
    echo "❌ Error al ejecutar la migración"
    echo "💡 Revisa los errores anteriores"
    exit 1
fi
