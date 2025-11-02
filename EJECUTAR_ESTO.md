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

1. Abre el archivo: **`SUPABASE_FINAL_FIX.sql`**
2. Copia TODO el contenido (Ctrl+A, Ctrl+C)
3. Pégalo en Supabase SQL Editor
4. Click en **Run** (o Ctrl+Enter)

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
- ✅ Crea políticas simples (sin recursión)
- ✅ Te hace admin
- ✅ Crea funciones para el panel admin

## ❓ ¿CUÁL ARCHIVO USO?

| Archivo | ¿Usar? |
|---------|--------|
| **SUPABASE_FINAL_FIX.sql** | ✅ **SÍ - USA ESTE** |
| supabase-admin-fix.sql | ❌ No |
| supabase-admin-setup.sql | ❌ No |
| supabase-recursion-fix-v2.sql | ❌ No |

## 🎯 RESUMEN:

**1 SOLO ARCHIVO:** `SUPABASE_FINAL_FIX.sql`

**1 SOLO PASO:** Ejecutarlo en Supabase SQL Editor

**RESULTADO:** Error resuelto ✅
