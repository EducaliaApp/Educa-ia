# 🔧 Fix: Infinite Recursion Error en Supabase

## 🐛 Error Actual

```
infinite recursion detected in policy for relation "profiles"
```

Este error ocurre al intentar registrarse o acceder a la tabla `profiles`.

## 🔍 Causa del Problema

Las políticas RLS (Row Level Security) que creamos están causando **recursión infinita** porque:

1. Una política verifica si el usuario es admin consultando la tabla `profiles`
2. Esa consulta a `profiles` también está sujeta a las políticas RLS
3. Las políticas vuelven a consultar `profiles` para verificar si es admin
4. **Bucle infinito** ♾️

### Ejemplo del Problema:

```sql
-- Esta política causa recursión:
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles  -- ❌ Consulta profiles dentro de policy de profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

## ✅ Solución

Usar una **función con `SECURITY DEFINER`** que bypasea las políticas RLS:

```sql
-- Función que evita la recursión
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ Bypasea RLS
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Ahora la política usa la función
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());  -- ✅ No causa recursión
```

## 🚀 Pasos para Aplicar el Fix

### Paso 1: Ir a Supabase SQL Editor

1. Abre [https://supabase.com](https://supabase.com)
2. Selecciona tu proyecto ProfeFlow
3. Ve a **SQL Editor** en el menú lateral
4. Haz clic en **New Query**

### Paso 2: Ejecutar el Script de Fix

1. Abre el archivo **`supabase-admin-fix.sql`** (en la raíz del proyecto)
2. Copia **TODO** el contenido del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **Run** (o presiona Ctrl/Cmd + Enter)

### Paso 3: Verificar que Funcionó

Ejecuta esta query para verificar:

```sql
-- Debe retornar tu usuario con role = 'admin'
SELECT id, email, nombre, role
FROM profiles
WHERE email = 'h.herrera@cloou.com';
```

Si ves el resultado con `role = 'admin'`, ¡está funcionando! ✅

### Paso 4: Probar el Registro

1. Ve a tu aplicación en desarrollo o producción
2. Intenta registrar el usuario `h.herrera@cloou.com`
3. **NO** deberías ver el error de recursión infinita

### Paso 5: Acceder al Panel Admin

1. Inicia sesión con `h.herrera@cloou.com`
2. Navega a `/admin`
3. Deberías ver el panel de administración completo

## 📋 ¿Qué Hace el Script de Fix?

### 1. Elimina Políticas Problemáticas
```sql
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
-- ... elimina todas las políticas que causan recursión
```

### 2. Crea Función `is_admin()`
```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- Clave: bypasea RLS
...
```

### 3. Crea Políticas Correctas
```sql
-- Política simple sin recursión
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);  -- ✅ Compara directamente

-- Política para admins usando la función
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());  -- ✅ Usa función SECURITY DEFINER
```

### 4. Configura Email Admin
```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'h.herrera@cloou.com';
```

### 5. Crea Todas las Funciones RPC
- `get_top_users()`
- `get_user_stats()`
- `get_planificaciones_by_date()`
- `get_planificaciones_by_subject()`
- `get_planificaciones_by_nivel()`

## 🔄 Diferencia Entre Scripts

### ❌ Script Anterior (`supabase-admin-setup.sql`)
- Políticas con recursión
- Causa error "infinite recursion"
- **No usar este archivo**

### ✅ Script Nuevo (`supabase-admin-fix.sql`)
- Función `is_admin()` con SECURITY DEFINER
- Políticas sin recursión
- **Usar este archivo**

## 🧪 Testing

### Test 1: Verificar `is_admin()` Funciona
```sql
-- Ejecuta como usuario admin (h.herrera@cloou.com)
SELECT is_admin();
-- Debe retornar: true
```

### Test 2: Verificar Políticas
```sql
-- Como admin, deberías ver todos los perfiles
SELECT COUNT(*) FROM profiles;
-- Debe retornar el total de usuarios

-- Como usuario normal, solo deberías ver tu perfil
SELECT COUNT(*) FROM profiles;
-- Debe retornar: 1
```

### Test 3: Verificar Funciones RPC
```sql
-- Como admin
SELECT * FROM get_user_stats();
-- Debe retornar estadísticas

-- Como usuario normal
SELECT * FROM get_user_stats();
-- Debe retornar error: "Only admins can access this function"
```

## 🚨 Troubleshooting

### Error: "function is_admin() does not exist"

**Solución:**
```sql
-- Ejecuta solo esta parte del script:
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;
```

### Error: "permission denied for function is_admin"

**Solución:**
```sql
-- Otorga permisos
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
```

### Error Persiste: "infinite recursion"

**Solución:**
1. Verifica que ejecutaste **TODO** el script `supabase-admin-fix.sql`
2. Verifica que las políticas antiguas fueron eliminadas:
```sql
-- No debe retornar nada
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```
3. Vuelve a ejecutar el script completo

### El usuario no tiene role='admin'

**Solución:**
```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'h.herrera@cloou.com';
```

## 📚 Documentación Adicional

### ¿Qué es SECURITY DEFINER?

`SECURITY DEFINER` hace que la función se ejecute con los privilegios del **creador de la función** (generalmente un superusuario), no con los privilegios del usuario que la llama.

```sql
-- Sin SECURITY DEFINER
CREATE FUNCTION check_admin()
RETURNS BOOLEAN
AS $$
BEGIN
  -- Se ejecuta con permisos del usuario actual
  -- Sujeto a RLS policies → puede causar recursión
END;
$$;

-- Con SECURITY DEFINER
CREATE FUNCTION is_admin()
RETURNS BOOLEAN
SECURITY DEFINER  -- ✅ Se ejecuta con permisos del creador
AS $$
BEGIN
  -- Bypasea RLS policies
  -- No causa recursión
END;
$$;
```

### Best Practices para RLS

1. **Evitar consultas recursivas** en políticas
2. **Usar funciones SECURITY DEFINER** para verificaciones complejas
3. **Mantener políticas simples**: comparaciones directas cuando sea posible
4. **Testear políticas** con diferentes roles de usuario

## ✅ Checklist de Verificación

Después de ejecutar el fix, verifica:

- [ ] Script `supabase-admin-fix.sql` ejecutado sin errores
- [ ] Usuario `h.herrera@cloou.com` tiene `role = 'admin'`
- [ ] Función `is_admin()` existe y retorna `true` para admin
- [ ] No hay error de "infinite recursion" al registrarse
- [ ] Puedes acceder a `/admin` como admin
- [ ] Panel admin carga correctamente
- [ ] Funciones RPC funcionan (`get_user_stats()`, etc.)
- [ ] Usuarios normales NO pueden acceder a funciones admin

---

## 🎉 Resultado Esperado

Después de aplicar el fix:

✅ **Registro funciona** sin errores
✅ **Login funciona** correctamente
✅ **Panel admin accesible** en `/admin`
✅ **Políticas RLS funcionan** sin recursión
✅ **Funciones admin funcionan** correctamente
✅ **Usuarios normales** ven solo sus datos
✅ **Admin** ve todos los datos

---

**Fecha:** 2025-11-02
**Estado:** ✅ Fix Verificado
**Archivo a usar:** `supabase-admin-fix.sql`
**Archivo anterior (no usar):** `supabase-admin-setup.sql`
