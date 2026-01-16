# Solución a errores 403 en páginas de administración

## Problema
Las vistas de administración (`/admin/roles` y `/admin/usuarios`) no mostraban los datos de roles y usuarios almacenados en la base de datos. La consola del navegador mostraba errores 403 (Forbidden) al intentar acceder a las APIs:

- `/api/admin/usuarios` - 403 Forbidden
- `/api/admin/roles` - 403 Forbidden  
- `/api/admin/planes` - 403 Forbidden

## Causa raíz
Las rutas API de administración verificaban el rol de admin del usuario usando el cliente regular de Supabase (`createClient()`), que está sujeto a las políticas de Row Level Security (RLS). 

Aunque las políticas RLS permiten a los usuarios ver su propio perfil (`auth.uid() = id`), en el contexto de las rutas API de Next.js 14 puede haber problemas con:
- La gestión de cookies/sesión
- El contexto de autenticación
- El timing de las peticiones

Esto causaba que la verificación del rol fallara y retornara 403, incluso para usuarios admin legítimos.

## Solución implementada
Se modificaron todas las rutas API de administración para usar el helper `isUserAdmin()` que:

1. **Usa el cliente admin** (`createAdminClient()`) con privilegios de `service_role`
2. **Bypasa las políticas RLS** para verificar roles de forma confiable
3. **Es más explícito** sobre operaciones que requieren privilegios elevados
4. **Es consistente** con el resto del código que realiza operaciones admin

### Archivos modificados
```
app/api/admin/roles/route.ts    - 4 handlers (GET, POST, PUT, DELETE)
app/api/admin/usuarios/route.ts - 4 handlers (GET, POST, PUT, DELETE)
app/api/admin/planes/route.ts   - 4 handlers (GET, POST, PUT, DELETE)
```

### Antes del cambio
```typescript
// Verificación de rol usando cliente regular (sujeto a RLS)
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (!profile || profile.role !== 'admin') {
  return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
}
```

### Después del cambio
```typescript
// Verificación de rol usando cliente admin (bypasa RLS)
const userIsAdmin = await isUserAdmin(user.id)
if (!userIsAdmin) {
  return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
}
```

## Beneficios de la solución
1. ✅ **Más confiable**: No depende de cookies/sesión en rutas API
2. ✅ **Más seguro**: Verificación explícita con privilegios elevados
3. ✅ **Más consistente**: Mismo patrón que otras operaciones admin
4. ✅ **Mejor mantenibilidad**: Código más claro y fácil de entender

## Próximos pasos
1. Despliega los cambios a tu entorno
2. Accede a `/admin/roles` y `/admin/usuarios`
3. Verifica que los datos se muestren correctamente
4. Confirma que no hay errores 403 en la consola del navegador

## Notas técnicas
- El helper `isUserAdmin()` está definido en `lib/supabase/admin.ts`
- Usa el cliente admin que requiere `SUPABASE_SERVICE_ROLE_KEY`
- Esta clave NUNCA debe exponerse al cliente/navegador
- Solo debe usarse en código del servidor (API routes, Server Components)

## Referencias
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js 14 API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Supabase Service Role](https://supabase.com/docs/guides/api/api-keys#the-servicerole-key)
