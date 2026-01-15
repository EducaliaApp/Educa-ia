#!/bin/bash

# Verification script for User Role Management System
# This script checks that all necessary files and components are in place

echo "🔍 Verificando Sistema de Gestión de Usuarios con Roles..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 - NO ENCONTRADO"
        return 1
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $3"
        return 0
    else
        echo -e "${RED}✗${NC} $3 - NO ENCONTRADO"
        return 1
    fi
}

errors=0

echo "📁 Verificando archivos principales..."
check_file "supabase/migrations/20250115_user_role_management.sql" || ((errors++))
check_file "components/admin/CreateUserModal.tsx" || ((errors++))
check_file "docs/USER_ROLE_MANAGEMENT.md" || ((errors++))
echo ""

echo "🔧 Verificando componentes actualizados..."
check_file "components/admin/EditUserModal.tsx" || ((errors++))
check_file "components/admin/admin-sidebar.tsx" || ((errors++))
check_file "components/admin/user-table.tsx" || ((errors++))
check_file "app/admin/usuarios/page.tsx" || ((errors++))
check_file "app/api/admin/usuarios/route.ts" || ((errors++))
echo ""

echo "📝 Verificando tipos TypeScript..."
check_content "lib/supabase/types.ts" "role_id" "role_id agregado a tipos Profile" || ((errors++))
echo ""

echo "🗄️ Verificando migración de base de datos..."
check_content "supabase/migrations/20250115_user_role_management.sql" "ADD COLUMN IF NOT EXISTS role_id" "Columna role_id" || ((errors++))
check_content "supabase/migrations/20250115_user_role_management.sql" "profiles_with_roles" "Vista profiles_with_roles" || ((errors++))
check_content "supabase/migrations/20250115_user_role_management.sql" "INSERT INTO public.roles" "Roles por defecto" || ((errors++))
echo ""

echo "🔌 Verificando API endpoints..."
check_content "app/api/admin/usuarios/route.ts" "export async function POST" "Endpoint POST para crear usuarios" || ((errors++))
check_content "app/api/admin/usuarios/route.ts" "profiles_with_roles" "Uso de vista profiles_with_roles" || ((errors++))
check_content "app/api/admin/usuarios/route.ts" "roleId" "Manejo de roleId" || ((errors++))
echo ""

echo "🎨 Verificando componentes UI..."
check_content "components/admin/CreateUserModal.tsx" "CreateUserModal" "Componente CreateUserModal" || ((errors++))
check_content "components/admin/EditUserModal.tsx" "roleId" "roleId en EditUserModal" || ((errors++))
check_content "components/admin/admin-sidebar.tsx" "Gestión de Usuarios" "Agrupación en sidebar" || ((errors++))
check_content "app/admin/usuarios/page.tsx" "CreateUserModal" "CreateUserModal importado" || ((errors++))
check_content "app/admin/usuarios/page.tsx" "Crear Usuario" "Botón Crear Usuario" || ((errors++))
echo ""

echo "📋 Resumen de verificación:"
if [ $errors -eq 0 ]; then
    echo -e "${GREEN}✓ Todos los archivos y componentes están presentes${NC}"
    echo ""
    echo "✅ El sistema está listo para pruebas"
    echo ""
    echo "📌 Próximos pasos:"
    echo "  1. Aplicar migración: supabase/migrations/20250115_user_role_management.sql"
    echo "  2. Reiniciar servidor: npm run dev"
    echo "  3. Navegar a: http://localhost:3000/admin/usuarios"
    echo "  4. Probar creación y edición de usuarios"
    exit 0
else
    echo -e "${RED}✗ Se encontraron $errors error(es)${NC}"
    echo ""
    echo "⚠️  Algunos archivos o componentes faltan"
    exit 1
fi
