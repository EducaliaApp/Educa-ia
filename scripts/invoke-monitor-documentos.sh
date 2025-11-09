#!/bin/bash

# Script para invocar la Edge Function monitor-documentos-oficiales
# Uso: ./scripts/invoke-monitor-documentos.sh

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Invocando Edge Function: monitor-documentos-oficiales${NC}\n"

# Obtener credenciales de Supabase
PROJECT_REF="cqfhayframohiulwauny"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

# Intentar obtener el anon key de diferentes fuentes
ANON_KEY=""

if [ -f ".env.local" ]; then
  ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d '=' -f2)
elif [ -f ".env" ]; then
  ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env | cut -d '=' -f2)
fi

if [ -z "$ANON_KEY" ]; then
  echo -e "${RED}❌ Error: No se encontró NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local o .env${NC}"
  echo -e "${YELLOW}💡 Obtén el anon key desde:${NC}"
  echo "   https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api"
  exit 1
fi

# Payload
PAYLOAD='{"force": true}'

echo -e "${YELLOW}📡 Endpoint:${NC} ${SUPABASE_URL}/functions/v1/monitor-documentos-oficiales"
echo -e "${YELLOW}📦 Payload:${NC} ${PAYLOAD}\n"

# Invocar función
echo -e "${GREEN}⏳ Ejecutando...${NC}\n"

RESPONSE=$(curl -s -w "\n%{http_code}" --location --request POST \
  "${SUPABASE_URL}/functions/v1/monitor-documentos-oficiales" \
  --header "Authorization: Bearer ${ANON_KEY}" \
  --header "Content-Type: application/json" \
  --data "${PAYLOAD}")

# Separar body y status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo -e "${YELLOW}📊 HTTP Status:${NC} ${HTTP_CODE}\n"

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo -e "${GREEN}✅ Éxito!${NC}\n"
  echo -e "${YELLOW}📄 Respuesta:${NC}"
  echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
else
  echo -e "${RED}❌ Error!${NC}\n"
  echo -e "${YELLOW}📄 Respuesta:${NC}"
  echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
  exit 1
fi

echo ""
echo -e "${GREEN}✨ Monitoreo completado${NC}"
