#!/bin/bash

# Script para probar una función de extracción de bases curriculares

set -e

# Verificar argumentos
if [ $# -lt 1 ]; then
  echo "Uso: $0 <nombre-funcion> [persist_db] [generate_files]"
  echo ""
  echo "Ejemplos:"
  echo "  $0 extraer-bases-curriculares-educacion-parvularia"
  echo "  $0 extraer-bases-curriculares-1o-6o-basico true false"
  echo ""
  echo "Funciones disponibles:"
  echo "  - extraer-bases-curriculares-educacion-parvularia"
  echo "  - extraer-bases-curriculares-1o-6o-basico"
  echo "  - extraer-bases-curriculares-7o-basico-2-medio"
  echo "  - extraer-bases-curriculares-3o-4o-medio"
  echo "  - extraer-bases-curriculares-3o-4o-medio-tecnico-profesional"
  echo "  - extraer-bases-curriculares-diferenciada-artistica-3-4-medio"
  echo "  - extraer-bases-curriculares-educacion-personas-jovenes-adultas-epja"
  echo "  - extraer-bases-curriculares-pueblos-originarios-ancestrales"
  echo "  - extraer-bases-curriculares-lengua-indigena"
  exit 1
fi

FUNCTION_NAME=$1
PERSIST_DB=${2:-true}
GENERATE_FILES=${3:-true}

echo "🧪 Probando función: $FUNCTION_NAME"
echo "📊 Configuración:"
echo "  - persist_db: $PERSIST_DB"
echo "  - generate_files: $GENERATE_FILES"
echo ""

# Crear el body del request
REQUEST_BODY=$(cat <<EOF
{
  "persist_db": $PERSIST_DB,
  "generate_files": $GENERATE_FILES
}
EOF
)

echo "📡 Invocando función..."
echo ""

# Invocar la función
supabase functions invoke "$FUNCTION_NAME" \
  --body "$REQUEST_BODY" \
  --no-verify-jwt

echo ""
echo "✅ Función invocada correctamente"
