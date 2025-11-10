#!/bin/bash
# Script para procesar documentos en múltiples ejecuciones hasta completar

SUPABASE_URL="https://cqfhayframohiulwauny.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZmhheWZyYW1vaGl1bHdhdW55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk0NzQ5NCwiZXhwIjoyMDc3NTIzNDk0fQ.CtrvHtM1urfgMd2UMSOK3tjnpxSOe0oLuQ9qBEyVC4g"

MAX_ITERATIONS=10  # Máximo 10 ejecuciones
WAIT_BETWEEN=5     # Esperar 5 segundos entre ejecuciones

echo "🚀 Iniciando procesamiento por lotes..."
echo "   Máximo de iteraciones: $MAX_ITERATIONS"
echo ""

for i in $(seq 1 $MAX_ITERATIONS); do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Ejecución $i de $MAX_ITERATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Ejecutar Edge Function
  response=$(curl -s -X POST \
    "${SUPABASE_URL}/functions/v1/monitor-documentos-oficiales" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    --data '{}' \
    --max-time 180)
  
  # Verificar si falló
  if [ $? -ne 0 ]; then
    echo "❌ Error ejecutando función (timeout o error de red)"
    echo "   Esperando 10 segundos antes de reintentar..."
    sleep 10
    continue
  fi
  
  # Extraer métricas del response
  echo ""
  echo "$response" | jq -r '
    if .reporte then
      "✅ Completado exitosamente\n" +
      "   📊 Detectados en web: \(.reporte.documentos_detectados)\n" +
      "   🆕 Nuevos registrados: \(.reporte.documentos_nuevos)\n" +
      "   ⏭️  Duplicados: \(.reporte.documentos_duplicados)\n" +
      "\n" +
      "   📦 PIPELINE DE DESCARGA:\n" +
      "   ✅ Descargados en este lote: \(.reporte.procesamiento_exitoso)\n" +
      "   ❌ Fallos: \(.reporte.procesamiento_fallido)\n" +
      "   ⏳ Pendientes descarga: \(.reporte.pipeline_pendientes_descarga)\n" +
      "   ✅ Total descargados: \(.reporte.pipeline_descargados)\n" +
      "   📦 Total en BD: \(.reporte.pipeline_total)\n" +
      "\n" +
      "   ⏱️  Tiempo: \(.reporte.tiempo_total_ms / 1000)s"
    else
      "❌ Error: \(.error // "Respuesta inválida")"
    end
  '
  
  # Extraer pendientes del pipeline (no solo nuevos)
  pendientes=$(echo "$response" | jq -r '.reporte.pipeline_pendientes_descarga // 0')
  
  # Si no hay pendientes, terminar
  if [ "$pendientes" == "0" ]; then
    echo ""
    echo "🎉 ¡Todos los documentos han sido procesados!"
    exit 0
  fi
  
  # Esperar antes de próxima iteración
  if [ $i -lt $MAX_ITERATIONS ]; then
    echo ""
    echo "⏳ Esperando ${WAIT_BETWEEN}s antes de próxima ejecución..."
    sleep $WAIT_BETWEEN
  fi
done

echo ""
echo "⚠️  Alcanzado límite de $MAX_ITERATIONS iteraciones"
echo "   Ejecuta el script nuevamente si aún hay documentos pendientes"
