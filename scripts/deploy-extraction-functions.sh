#!/bin/bash

# Script para desplegar todas las funciones de extracción de bases curriculares

set -e

echo "🚀 Desplegando funciones de extracción de bases curriculares..."
echo ""

# Lista de funciones a desplegar
FUNCTIONS=(
  "extraer-bases-curriculares"
  "extraer-bases-curriculares-educacion-parvularia"
  "extraer-bases-curriculares-1o-6o-basico"
  "extraer-bases-curriculares-7o-basico-2-medio"
  "extraer-bases-curriculares-3o-4o-medio"
  "extraer-bases-curriculares-3o-4o-medio-tecnico-profesional"
  "extraer-bases-curriculares-diferenciada-artistica-3-4-medio"
  "extraer-bases-curriculares-educacion-personas-jovenes-adultas-epja"
  "extraer-bases-curriculares-pueblos-originarios-ancestrales"
  "extraer-bases-curriculares-lengua-indigena"
)

# Contador de éxito
SUCCESS_COUNT=0
FAIL_COUNT=0

# Desplegar cada función
for FUNCTION in "${FUNCTIONS[@]}"; do
  echo "📦 Desplegando: $FUNCTION"

  if supabase functions deploy "$FUNCTION" --no-verify-jwt; then
    echo "✅ $FUNCTION desplegada correctamente"
    ((SUCCESS_COUNT++))
  else
    echo "❌ Error desplegando $FUNCTION"
    ((FAIL_COUNT++))
  fi

  echo ""
done

# Resumen
echo "========================================="
echo "✅ Funciones desplegadas exitosamente: $SUCCESS_COUNT"
echo "❌ Funciones con errores: $FAIL_COUNT"
echo "========================================="

if [ $FAIL_COUNT -eq 0 ]; then
  echo "🎉 Todas las funciones se desplegaron correctamente!"
  exit 0
else
  echo "⚠️  Algunas funciones fallaron al desplegarse"
  exit 1
fi
