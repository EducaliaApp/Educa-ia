# 🚨 SOLUCIÓN AL ERROR DE RECURSIÓN INFINITA

## ⚠️ SI VES ESTE ERROR:
```
infinite recursion detected in policy for relation "profiles"
```

## ✅ SOLUCIÓN EN 3 PASOS:

### PASO 1: Ir a Supabase SQL Editor

1. Abre https://supabase.com
2. Selecciona tu proyecto
3. Click en **SQL Editor** (menú lateral)
4. Click en **New Query**

### PASO 2: Copiar y Ejecutar

1. Abre el archivo: **`supabase-admin-setup.sql`**
2. Copia TODO el contenido (Ctrl+A, Ctrl+C)
3. Pégalo en Supabase SQL Editor
4. Click en **Run** (o Ctrl+Enter)

> ℹ️ Este script ya incluye la función `is_admin()` con `SECURITY DEFINER` y recrea todas las políticas sin recursión. Si antes ejecutaste otro script, no importa: este limpia y vuelve a crear todo correctamente.

### PASO 3: Verificar

Ejecuta esta query:
```sql
SELECT * FROM profiles WHERE email = 'h.herrera@cloou.com';
```

Deberías ver `role = 'admin'`

## ✅ AHORA PUEDES:

1. **Registrarte** sin errores
2. **Login** normalmente
3. **Acceder a /admin** como admin

## 🔧 QUÉ HACE EL SCRIPT:

- ✅ Elimina políticas problemáticas
- ✅ Crea función `is_admin()` con `SECURITY DEFINER`
- ✅ Reconstruye políticas para `profiles`, `planificaciones` y `evaluaciones`
- ✅ Configura tus funciones RPC para admin panel
- ✅ Te hace admin automáticamente

## ❓ ¿CUÁL ARCHIVO USO?

| Archivo | ¿Usar? |
|---------|--------|
| **supabase-admin-setup.sql** | ✅ **SÍ - USA ESTE** |
| SUPABASE_FINAL_FIX.sql | ❌ Obsoleto |
| supabase-admin-fix.sql | ❌ Reemplazado |
| supabase-recursion-fix-v2.sql | ❌ Reemplazado |

## 🎯 RESUMEN:

**1 SOLO ARCHIVO:** `supabase-admin-setup.sql`

**1 SOLO PASO:** Ejecutarlo en Supabase SQL Editor

**RESULTADO:** Error resuelto ✅
