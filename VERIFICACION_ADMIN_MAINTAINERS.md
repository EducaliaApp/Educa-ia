# Checklist de Verificación: Mantenedores Admin

## Pre-requisitos

- [ ] La migración `20250115_admin_maintainers.sql` ha sido aplicada en la base de datos
- [ ] Existe al menos un usuario con `role = 'admin'` en la tabla `profiles`
- [ ] Las variables de entorno están configuradas (`SUPABASE_SERVICE_ROLE_KEY`)

## Verificación de Base de Datos

Ejecuta estos queries en Supabase Dashboard > SQL Editor:

```sql
-- 1. Verificar que las tablas existen
SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
AND tablename IN ('planes', 'planes_limites', 'roles');

-- 2. Verificar datos de planes
SELECT id, nombre, codigo, precio_mensual_clp, activo FROM planes;

-- 3. Verificar límites de planes
SELECT p.nombre, pl.creditos_planificaciones, pl.creditos_evaluaciones, 
       pl.analisis_portafolio, pl.exportar_pdf
FROM planes p 
JOIN planes_limites pl ON p.id = pl.plan_id;

-- 4. Verificar roles
SELECT id, nombre, codigo, activo FROM roles;

-- 5. Verificar que profiles tiene columna role
SELECT id, email, nombre, plan, role FROM profiles LIMIT 5;

-- 6. Verificar políticas RLS
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('planes', 'planes_limites', 'roles', 'profiles');
```

## Verificación de Funcionalidad

### `/admin/usuarios`

- [ ] **GET**: La página carga y muestra todos los usuarios
  - [ ] Se muestran correctamente: nombre, email, plan, rol
  - [ ] Los usuarios con `role = 'admin'` tienen icono Shield amarillo
  - [ ] Se muestran créditos correctamente (usados/totales)
  - [ ] Los contadores de "Total Usuarios", "Usuarios Regulares" y "Administradores" son correctos

- [ ] **Filtros**: Funcionan correctamente
  - [ ] Búsqueda por nombre o email
  - [ ] Filtro por plan (free/pro)
  - [ ] Filtro por rol (user/admin)

- [ ] **Editar Usuario**: Modal funciona correctamente
  - [ ] Al hacer clic en "Editar", se abre el modal con datos precargados
  - [ ] Se pueden editar todos los campos (nombre, email, asignatura, nivel)
  - [ ] El selector de planes muestra planes de la tabla `planes`
  - [ ] El selector de roles muestra roles de la tabla `roles`
  - [ ] Al cambiar el plan, se muestra mensaje: "Los créditos se ajustarán automáticamente"
  - [ ] Al guardar, se actualizan los datos en la BD
  - [ ] Si se cambió el plan, los créditos se ajustan automáticamente

- [ ] **Ajustar Créditos**: Modal funciona correctamente
  - [ ] Se abre al hacer clic en "Créditos"
  - [ ] Permite ajustar créditos manualmente

### `/admin/roles`

- [ ] **GET**: La página carga y muestra todos los roles
  - [ ] Se muestran en formato de tarjetas (cards)
  - [ ] Cada rol muestra: nombre, código, descripción
  - [ ] Se muestran los primeros 4 permisos + contador de más
  - [ ] Indicador verde/rojo para roles activos/inactivos

- [ ] **Crear Rol**: Funciona correctamente
  - [ ] Al hacer clic en "Nuevo Rol", se abre el modal
  - [ ] Se pueden completar todos los campos
  - [ ] El selector de permisos muestra todos los permisos predefinidos
  - [ ] Se pueden agregar permisos personalizados
  - [ ] Los permisos agregados se muestran en una lista
  - [ ] Se pueden eliminar permisos de la lista
  - [ ] Al guardar, el rol se crea en la BD
  - [ ] El nuevo rol aparece en la lista

- [ ] **Editar Rol**: Funciona correctamente
  - [ ] Al hacer clic en "Editar", se abre el modal con datos precargados
  - [ ] El código NO es editable (disabled)
  - [ ] Se pueden editar otros campos
  - [ ] Se pueden agregar/quitar permisos
  - [ ] Al guardar, los cambios se reflejan en la BD

- [ ] **Activar/Desactivar Rol**: Funciona correctamente
  - [ ] Al hacer clic en "Activar/Desactivar", cambia el estado
  - [ ] El indicador visual se actualiza
  - [ ] Los roles inactivos aparecen con opacidad reducida

- [ ] **Eliminar Rol**: Funciona correctamente
  - [ ] Al hacer clic en eliminar, pide confirmación
  - [ ] Al confirmar, el rol se elimina de la BD
  - [ ] El rol desaparece de la lista

### `/admin/planes`

- [ ] **GET**: La página carga y muestra todos los planes
  - [ ] Se muestran en formato de tarjetas (cards)
  - [ ] Cada plan muestra: nombre, código, precio
  - [ ] Se muestra sección de "Límites" con créditos
  - [ ] Se muestran las primeras 3 características
  - [ ] Indicador verde/rojo para planes activos/inactivos

- [ ] **Crear Plan**: Funciona correctamente
  - [ ] Al hacer clic en "Nuevo Plan", se abre el modal
  - [ ] Se pueden completar todos los campos básicos
  - [ ] Se pueden configurar límites de créditos
  - [ ] Se pueden activar/desactivar permisos especiales (checkboxes)
  - [ ] Se pueden agregar características personalizadas
  - [ ] Al guardar, se crean el plan Y sus límites
  - [ ] El nuevo plan aparece en la lista

- [ ] **Editar Plan**: Funciona correctamente
  - [ ] Al hacer clic en "Editar", se abre el modal con datos precargados
  - [ ] El código NO es editable (disabled)
  - [ ] Se pueden editar campos del plan
  - [ ] Se pueden editar límites
  - [ ] Se pueden agregar/quitar características
  - [ ] Al guardar, se actualizan plan Y límites

- [ ] **Activar/Desactivar Plan**: Funciona correctamente
  - [ ] Al hacer clic en "Activar/Desactivar", cambia el estado
  - [ ] El indicador visual se actualiza
  - [ ] Los planes inactivos aparecen con opacidad reducida

- [ ] **Eliminar Plan**: Funciona correctamente
  - [ ] Al hacer clic en eliminar, pide confirmación
  - [ ] Al confirmar, se elimina el plan (y sus límites en CASCADE)
  - [ ] El plan desaparece de la lista

## Verificación de Seguridad

- [ ] **Acceso no autorizado**: Un usuario sin sesión NO puede acceder a las páginas admin
- [ ] **Acceso de usuario regular**: Un usuario con `role = 'user'` NO puede acceder a las páginas admin
- [ ] **Acceso de admin**: Un usuario con `role = 'admin'` SÍ puede acceder y realizar operaciones

## Verificación de Integridad de Datos

```sql
-- Verificar que cambios de plan actualizan créditos
SELECT id, nombre, plan, creditos_planificaciones, creditos_evaluaciones 
FROM profiles WHERE id = '<user-id-que-cambio-plan>';

-- Verificar relación planes-limites
SELECT COUNT(*) as planes_sin_limites FROM planes p
LEFT JOIN planes_limites pl ON p.id = pl.plan_id
WHERE pl.id IS NULL;
-- Debe retornar 0

-- Verificar que no hay códigos duplicados
SELECT codigo, COUNT(*) FROM planes GROUP BY codigo HAVING COUNT(*) > 1;
SELECT codigo, COUNT(*) FROM roles GROUP BY codigo HAVING COUNT(*) > 1;
-- Ambos deben retornar 0 filas
```

## Verificación de Rendimiento

- [ ] La carga de `/admin/usuarios` es razonablemente rápida (< 2 segundos con ~100 usuarios)
- [ ] La carga de `/admin/roles` es inmediata
- [ ] La carga de `/admin/planes` es inmediata
- [ ] Las operaciones CRUD responden en < 1 segundo

## Errores Comunes y Soluciones

### Error: "No autorizado" o "Acceso denegado"
**Solución**: Verificar que el usuario tiene `role = 'admin'` en la tabla `profiles`

### Error: "Missing SUPABASE_SERVICE_ROLE_KEY"
**Solución**: Agregar la variable de entorno en Vercel/servidor

### Roles/Planes no se muestran
**Solución**: Verificar que la migración `20250115_admin_maintainers.sql` fue aplicada

### Error al cambiar plan: "El plan no existe"
**Solución**: Verificar que el código del plan existe en la tabla `planes` y está activo

### Error RPC "actualizar_plan_usuario"
**Solución**: Verificar que la función existe:
```sql
SELECT proname, prosrc FROM pg_proc WHERE proname = 'actualizar_plan_usuario';
```

## Casos de Prueba Sugeridos

1. **Cambio de plan free → pro**
   - Usuario con plan 'free' tiene 5 créditos planificaciones
   - Admin cambia a 'pro'
   - Verificar que ahora tiene 999999 créditos

2. **Crear rol personalizado y asignar**
   - Crear rol "Coordinador" con permisos limitados
   - Asignar rol a un usuario
   - Verificar que el usuario tiene el nuevo rol

3. **Crear plan personalizado**
   - Crear plan "Educativo" con límites específicos
   - Asignar plan a un usuario
   - Verificar que créditos se ajustan correctamente

4. **Desactivar plan/rol**
   - Desactivar un plan
   - Verificar que no aparece en selector de EditUserModal

## Notas Finales

- Todas las operaciones deben ser transaccionales y atómicas
- Los errores deben mostrarse al usuario de forma clara
- Los cambios deben reflejarse inmediatamente en la UI
- No debe haber llamadas directas al cliente Supabase desde el frontend para operaciones admin
