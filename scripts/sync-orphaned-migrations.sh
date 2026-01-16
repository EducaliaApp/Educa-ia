#!/bin/bash

# Script para sincronizar migraciones huérfanas desde la base de datos remota
# Uso: ./sync-orphaned-migrations.sh

set -e  # Salir en caso de error

echo "🔍 Sincronizador de Migraciones Huérfanas de Supabase"
echo "====================================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -d "supabase/migrations" ]; then
    echo -e "${RED}❌ Error: No se encuentra el directorio supabase/migrations${NC}"
    echo "Por favor ejecuta este script desde la raíz del proyecto."
    exit 1
fi

# Verificar que Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Error: Supabase CLI no está instalado${NC}"
    echo "Instala con: brew install supabase/tap/supabase"
    exit 1
fi

echo -e "${BLUE}📋 Paso 1: Verificando estado de migraciones...${NC}"
echo ""
MIGRATION_LIST=$(supabase migration list 2>&1 || true)
echo "$MIGRATION_LIST"
echo ""

# Extraer migraciones huérfanas (Remote sin Local)
ORPHANED=()
while IFS= read -r line; do
    # Buscar líneas que empiezan con espacios/pipes (columna Local vacía)
    # seguido de un número en la columna Remote
    if echo "$line" | grep -qE "^\s+\|\s+[0-9]+\s+\|"; then
        # Extraer versión de la columna Remote (segunda columna)
        version=$(echo "$line" | awk -F'|' '{print $2}' | tr -d ' ')
        if [[ -n "$version" ]]; then
            ORPHANED+=("$version")
        fi
    fi
done <<< "$MIGRATION_LIST"

if [ ${#ORPHANED[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ No se encontraron migraciones huérfanas${NC}"
    echo "Todas las migraciones remotas existen localmente."
    exit 0
fi

echo -e "${YELLOW}⚠️  Se encontraron ${#ORPHANED[@]} migración(es) huérfana(s):${NC}"
for migration in "${ORPHANED[@]}"; do
    echo "   - $migration"
done
echo ""

# Confirmar con el usuario
read -p "¿Deseas sincronizar estas migraciones? (s/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo -e "${YELLOW}Operación cancelada por el usuario.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}📋 Paso 2: Marcando migraciones como revertidas...${NC}"
for migration in "${ORPHANED[@]}"; do
    echo "   Procesando: $migration"
    if supabase migration repair --status reverted "$migration" 2>&1; then
        echo -e "   ${GREEN}✓${NC} $migration marcada como revertida"
    else
        echo -e "   ${RED}✗${NC} Error al reparar $migration"
    fi
done
echo ""

echo -e "${BLUE}📋 Paso 3: Verificando conflicto con 20250115...${NC}"
# El CLI de Supabase a veces falla en db pull si hay un conflicto con 20250115
# Intentar repararlo preventivamente
MIGRATION_LIST_UPDATED=$(supabase migration list 2>&1 || true)
if echo "$MIGRATION_LIST_UPDATED" | grep -qE "^\s+\|\s*20250115\s+\|"; then
    echo -e "   ${YELLOW}⚠️${NC} Detectado conflicto conocido con 20250115"
    echo "   Reparando..."
    supabase migration repair --status reverted 20250115 2>&1 || true
fi

# Si existe el archivo local 20250115_admin_maintainers.sql, moverlo a archive
if [ -f "supabase/migrations/20250115_admin_maintainers.sql" ]; then
    echo -e "   ${YELLOW}⚠️${NC} Moviendo archivo conflictivo 20250115_admin_maintainers.sql a archive/"
    mv supabase/migrations/20250115_admin_maintainers.sql supabase/migrations/archive/ || true
fi
echo ""

echo -e "${BLUE}📋 Paso 4: Descargando migraciones desde remoto...${NC}"
if supabase db pull; then
    echo -e "${GREEN}✅ Migraciones descargadas exitosamente${NC}"
else
    echo -e "${RED}❌ Error al descargar migraciones${NC}"
    echo ""
    echo -e "${YELLOW}Intentando solución alternativa: aplicar migraciones locales...${NC}"
    if supabase db push --include-all; then
        echo -e "${GREEN}✅ Migraciones locales aplicadas${NC}"
    else
        echo -e "${RED}❌ No se pudo sincronizar. Revisa manualmente.${NC}"
        exit 1
    fi
fi
echo ""

echo -e "${BLUE}📋 Paso 5: Verificando archivos descargados...${NC}"
echo "Archivos en supabase/migrations/:"
ls -la supabase/migrations/ | tail -n +4  # Omitir líneas de total y .
echo ""

echo -e "${BLUE}📋 Paso 6: Verificando estado final...${NC}"
supabase migration list
echo ""

echo -e "${GREEN}✅ Sincronización completada${NC}"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo "1. Revisa los archivos descargados en supabase/migrations/"
echo "2. Verifica que sean correctos"
echo "3. Commitea los cambios:"
echo "   git add supabase/migrations/"
echo "   git commit -m 'sync: agregar migraciones huérfanas desde remoto'"
echo "   git push"
echo ""
