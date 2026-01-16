#!/bin/bash

echo "Testing Edge Function con skipScraping=true..."

curl -s -X POST \
  "https://cqfhayframohiulwauny.supabase.co/functions/v1/monitor-documentos-oficiales" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZmhheWZyYW1vaGl1bHdhdW55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk0NzQ5NCwiZXhwIjoyMDc3NTIzNDk0fQ.CtrvHtM1urfgMd2UMSOK3tjnpxSOe0oLuQ9qBEyVC4g" \
  -H "Content-Type: application/json" \
  -d '{"skipScraping": true}' \
  --max-time 45 \
  -o /tmp/response.json \
  -w "\nHTTP: %{http_code}\nTime: %{time_total}s\n"

echo ""
echo "=== RESPONSE ==="
cat /tmp/response.json | jq '.' 2>/dev/null || cat /tmp/response.json
