# Troubleshooting 403 Errors en Admin Routes

## Si sigues viendo errores 403 después del fix

El código ha sido actualizado para usar el cliente admin en las verificaciones de rol, pero si aún ves errores 403, revisa lo siguiente:

### 1. ✅ Verifica que el código esté desplegado

Los cambios fueron hechos en los siguientes commits:
- `733ceed` - Fix inicial para rutas admin
- `fee87f8` - Fix faltante en GET handler de roles
- `eb18191` - Documentación

**Asegúrate de que estos cambios estén desplegados en Vercel:**
1. Ve a tu dashboard de Vercel
2. Verifica que el deployment más reciente incluya estos commits
3. Si no, haz un push del branch o mergea a main para triggear un nuevo deploy

### 2. ⚠️ CRÍTICO: Verifica la variable de entorno SUPABASE_SERVICE_ROLE_KEY

El fix requiere que `SUPABASE_SERVICE_ROLE_KEY` esté configurada en Vercel. Sin esta variable, las verificaciones de admin fallarán.

**Cómo verificar:**
1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Busca `SUPABASE_SERVICE_ROLE_KEY`

**Si NO está configurada:**
1. Ve a tu proyecto Supabase → Settings → API
2. Copia el valor de "service_role key" (mantén esto secreto!)
3. En Vercel: Settings → Environment Variables → Add New
4. Nombre: `SUPABASE_SERVICE_ROLE_KEY`
5. Valor: pega la service_role key de Supabase
6. Scope: Production, Preview, Development (marca todos)
7. Haz un redeploy del proyecto después de agregar la variable

### 3. 🔍 Revisa los logs del servidor

Con el último commit, agregamos logging mejorado. Revisa los logs de Vercel:

1. Ve a tu proyecto en Vercel
2. Deployments → selecciona el deployment actual
3. Functions → selecciona la función API que está fallando
4. Busca mensajes como:
   - `[isUserAdmin] Error checking admin role:` - indica problema con la base de datos
   - `[isUserAdmin] No profile found for user:` - el usuario no tiene perfil
   - `[GET /api/admin/planes] User is not admin:` - el usuario no tiene rol admin
   - `Missing SUPABASE_SERVICE_ROLE_KEY` - la variable de entorno no está configurada

### 4. 🗄️ Verifica el rol del usuario en la base de datos

Conecta a tu base de datos Supabase y ejecuta:

```sql
-- Verifica el rol del usuario (reemplaza con tu user_id)
SELECT id, email, role, role_id 
FROM profiles 
WHERE email = 'tu-email@ejemplo.com';

-- Si role es NULL o no es 'admin', actualízalo:
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'tu-email@ejemplo.com';

-- Opcionalmente, también configura role_id (si tienes la tabla roles)
UPDATE profiles p
SET role_id = r.id
FROM roles r
WHERE r.codigo = 'admin' 
  AND p.email = 'tu-email@ejemplo.com';
```

### 5. 🔄 Limpia el caché

A veces Vercel o el navegador cachean respuestas:

**En el navegador:**
- Abre DevTools (F12)
- Haz click derecho en el botón de recargar
- Selecciona "Empty Cache and Hard Reload"

**En Vercel:**
- Si tienes un plan Pro, puedes invalidar el caché
- O simplemente haz un nuevo deployment

### 6. 📊 Verifica los errores 500 de Supabase

Los logs también muestran errores 500 de Supabase directos:
```
GET https://cqfhayframohiulwauny.supabase.co/rest/v1/profiles?select=id%2Cnivel 500
```

Esto indica que hay queries directas de Supabase desde el cliente que están fallando por RLS. Estas queries NO pasan por nuestras API routes y necesitan ser corregidas por separado.

**Para corregir estos:**
1. Identifica qué páginas están haciendo estas queries directas
2. Considera crear API routes para esas queries también
3. O ajusta las políticas RLS para permitir estas lecturas

### 7. 🆘 Si nada funciona

Comparte los logs completos de Vercel que incluyan:
- El error exacto
- Los mensajes de log que agregamos
- El resultado de la query SQL para verificar el rol del usuario

Esto nos ayudará a diagnosticar el problema específico.

## Checklist rápido

- [ ] Código desplegado en Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada en Vercel
- [ ] Redeploy después de agregar la variable
- [ ] Usuario tiene `role = 'admin'` en la tabla profiles
- [ ] Caché del navegador limpiado
- [ ] Logs de Vercel revisados

## Cambios recientes al código

Para referencia, el patrón actualizado en todas las rutas admin es:

```typescript
// Verificación de autenticación
const supabase = await createClient()
const { data: { user }, error: authError } = await supabase.auth.getUser()

if (authError || !user) {
  console.error('[GET /api/admin/planes] Auth error:', authError)
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

// Verificación de rol admin usando admin client
const userIsAdmin = await isUserAdmin(user.id)
if (!userIsAdmin) {
  console.warn('[GET /api/admin/planes] User is not admin:', user.id)
  return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
}
```

La función `isUserAdmin()` ahora incluye logging detallado de errores.
