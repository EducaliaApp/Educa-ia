#!/bin/bash
# Monitor de ejecución del pipeline

echo "🔍 Monitoreando Pipeline RAG MINEDUC..."
echo "========================================"

# Obtener el run más reciente
RUN_ID=$(gh run list --workflow=pipeline-documentos-mineduc.yml --limit 1 --json databaseId --jq '.[0].databaseId')

if [ -z "$RUN_ID" ]; then
    echo "❌ No se encontró ninguna ejecución reciente"
    exit 1
fi

echo "📊 Run ID: $RUN_ID"
echo ""

# Función para mostrar estado
show_status() {
    gh run view $RUN_ID --json status,conclusion,jobs \
        --jq '{
            status: .status,
            conclusion: .conclusion,
            jobs: [.jobs[] | {
                name: .name,
                status: .status,
                conclusion: .conclusion,
                startedAt: .startedAt,
                completedAt: .completedAt
            }]
        }' | jq -r '
        "Estado General: \(.status) / \(.conclusion // "en progreso")",
        "",
        "FASES:",
        (.jobs[] | "  \(.name): \(.status) [\(.conclusion // "...")]")
    '
}

# Loop de monitoreo
while true; do
    clear
    echo "🔍 Monitoreando Pipeline RAG MINEDUC"
    echo "========================================"
    echo "Run ID: $RUN_ID"
    echo "Última actualización: $(date '+%H:%M:%S')"
    echo ""
    
    show_status
    
    # Verificar si terminó
    STATUS=$(gh run view $RUN_ID --json status --jq '.status')
    if [ "$STATUS" == "completed" ]; then
        echo ""
        echo "✅ Pipeline completado"
        
        # Mostrar resumen final
        echo ""
        echo "📊 RESUMEN FINAL:"
        gh run view $RUN_ID --log-failed
        break
    fi
    
    echo ""
    echo "⏱️  Actualizando en 10 segundos... (Ctrl+C para salir)"
    sleep 10
done

# Abrir en navegador al finalizar
echo ""
echo "🌐 Abriendo dashboard..."
gh run view $RUN_ID --web
