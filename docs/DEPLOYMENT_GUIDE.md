# 🚀 Guía de Despliegue: Sistema de Gestión de Usuarios con Roles

## ✅ Pre-requisitos

Antes de comenzar, verifica que tienes:
- [x] Acceso al panel de Supabase del proyecto
- [x] Permisos para ejecutar SQL en el proyecto
- [x] Acceso al repositorio de código
- [x] Variables de entorno configuradas (`.env.local`)

## 📋 Pasos de Despliegue

### 1. Migración de Base de Datos (Automática vía CI/CD)

> **✅ IMPORTANTE**: Este proyecto utiliza GitHub Actions para aplicar migraciones automáticamente.
> Ver [CI_CD_MIGRATIONS_SETUP.md](../CI_CD_MIGRATIONS_SETUP.md) para más detalles.

La migración `20250115001_user_role_management.sql` ya está en el formato correcto y se ejecutará automáticamente cuando:

1. **Se hace merge del Pull Request a `main`** - El workflow `deploy-and-migrate.yml` se ejecuta automáticamente
2. **Se hace push directo a `main`** - Las migraciones se aplican inmediatamente
3. **Ejecución manual** - Desde GitHub Actions → "Deploy and Run Migrations" → "Run workflow"

#### Flujo Automático (Recomendado)

```bash
# 1. Crear Pull Request desde esta rama
# 2. Esperar revisión y aprobación
# 3. Hacer merge a main
# 4. GitHub Actions ejecutará automáticamente:
#    - Aplicación de migraciones
#    - Verificación de schema
#    - Deployment a Vercel
```

**Monitoreo del proceso**:
- Ve a la pestaña `Actions` en GitHub
- Busca el workflow "Deploy and Run Migrations"
- Revisa los logs de cada job (migrate, verify, deploy)

#### Opción Manual (Solo si es necesario)

**Desde Supabase Dashboard**:
1. Abre el proyecto en Supabase Dashboard
2. Navega a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido de `supabase/migrations/20250115001_user_role_management.sql`
5. Ejecuta la query
6. Verifica que no hay errores

**Desde CLI**:
```bash
# Solo para desarrollo local o emergencias
supabase db push
```

> **⚠️ Nota**: La opción manual solo debe usarse en casos excepcionales. El CI/CD garantiza que las migraciones se apliquen de forma consistente y segura.

### 2. Verificar la Migración

Ejecuta estas queries para verificar que todo se aplicó correctamente:

```sql
-- 1. Verificar que la columna role_id existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'role_id';

-- 2. Verificar que existen los roles por defecto
SELECT nombre, codigo, activo FROM public.roles;

-- Debe mostrar:
-- Usuario    | user  | true
-- Administrador | admin | true

-- 3. Verificar que la vista existe
SELECT table_name 
FROM information_schema.views 
WHERE table_name = 'profiles_with_roles';

-- 4. Verificar migración de datos (si hay perfiles existentes)
SELECT 
  COUNT(*) as total_profiles,
  COUNT(role_id) as profiles_with_role_id
FROM public.profiles;

-- Los dos números deben ser iguales
```

### 3. Desplegar Código

#### Git Flow

```bash
# 1. Asegúrate de estar en la rama correcta
git checkout copilot/add-admin-user-role-view

# 2. Verificar que todo está committed
git status
# Debe mostrar: "nothing to commit, working tree clean"

# 3. Crear Pull Request en GitHub
# O hacer merge a main si tienes permisos

# 4. Hacer merge a main
git checkout main
git merge copilot/add-admin-user-role-view
git push origin main
```

#### Deploy Automático (Vercel/Similar)

Si tienes CD configurado, el deploy se hará automáticamente al hacer push a `main`.

#### Deploy Manual

```bash
# 1. Instalar dependencias
npm install

# 2. Construir el proyecto
npm run build

# 3. Verificar que no hay errores de build

# 4. Iniciar en producción
npm run start
```

### 4. Verificar Implementación

#### a) Ejecutar Script de Verificación

```bash
bash scripts/verify-user-role-system.sh
```

Debe mostrar:
```
✓ Todos los archivos y componentes están presentes
✅ El sistema está listo para pruebas
```

#### b) Verificación Manual

1. **Iniciar servidor**
   ```bash
   npm run dev
   ```

2. **Login como Admin**
   - Navega a `/login`
   - Ingresa con cuenta admin

3. **Verificar Menú**
   - Verifica que existe sección "Gestión de Usuarios"
   - Debe mostrar:
     - 👥 Usuarios
     - 🛡️ Roles

4. **Probar Vista Usuarios** (`/admin/usuarios`)
   - ✓ Lista de usuarios se carga
   - ✓ Botón "Crear Usuario" visible
   - ✓ Filtros funcionan
   - ✓ Columna "Rol" muestra nombres correctos

5. **Probar Crear Usuario**
   - Clic en "Crear Usuario"
   - Modal se abre correctamente
   - Completar formulario:
     - Email: test@ejemplo.cl
     - Contraseña: Test123456
     - Nombre: Usuario de Prueba
     - Plan: Free
     - Rol: Usuario
   - Clic en "Crear Usuario"
   - ✓ Usuario se crea sin errores
   - ✓ Aparece en la lista

6. **Probar Editar Usuario**
   - Clic en "Editar" del usuario creado
   - Modal se abre con datos actuales
   - Cambiar rol a "Administrador"
   - Guardar cambios
   - ✓ Cambios se guardan correctamente
   - ✓ Rol se actualiza en la lista

7. **Verificar en Base de Datos**
   ```sql
   -- Verificar que el usuario tiene role_id correcto
   SELECT 
     p.nombre,
     p.email,
     p.role,
     p.role_id,
     r.nombre as role_nombre
   FROM profiles p
   LEFT JOIN roles r ON p.role_id = r.id
   WHERE p.email = 'test@ejemplo.cl';
   ```

### 5. Testing de Roles

#### Crear Nuevo Rol Personalizado

```sql
INSERT INTO public.roles (nombre, codigo, descripcion, permisos, activo)
VALUES (
  'Coordinador',
  'coordinator',
  'Coordinador pedagógico con permisos especiales',
  '["planificaciones.ver_todas", "evaluaciones.ver_todas", "portafolios.ver_todos"]'::jsonb,
  true
);
```

#### Verificar Aparición en UI

1. Refrescar página `/admin/usuarios`
2. Clic en "Crear Usuario" o "Editar"
3. ✓ Verificar que "Coordinador" aparece en dropdown de roles

### 6. Rollback Plan (Si algo sale mal)

#### Rollback de Migración

```sql
-- 1. Remover foreign key constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_id_fkey;

-- 2. Remover columna role_id
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role_id;

-- 3. Remover vista
DROP VIEW IF EXISTS public.profiles_with_roles;

-- 4. Remover políticas RLS de roles
DROP POLICY IF EXISTS "Authenticated users can view active roles" ON public.roles;

-- Nota: Los roles creados permanecerán en la tabla roles,
-- puedes eliminarlos manualmente si es necesario
```

#### Rollback de Código

```bash
# Revertir al commit anterior
git revert HEAD

# O hacer checkout al commit anterior
git checkout <commit-anterior>

# Push de cambios
git push origin main
```

### 7. Monitoreo Post-Despliegue

#### a) Logs de Aplicación

Monitorea los logs por errores relacionados a:
- `createAdminClient`
- `/api/admin/usuarios`
- `profiles_with_roles`

#### b) Métricas de Base de Datos

```sql
-- Monitorear queries lentas
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%profiles_with_roles%'
ORDER BY mean_exec_time DESC;

-- Verificar uso de índices
SELECT * FROM pg_stat_user_indexes 
WHERE indexrelname = 'idx_profiles_role_id';
```

#### c) Verificaciones de Seguridad

```sql
-- Verificar que RLS está activo
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'roles');

-- Debe mostrar rowsecurity = true para ambas
```

### 8. Documentación para Usuarios

Crea una guía rápida para administradores:

```markdown
# Guía Rápida: Gestión de Usuarios

## Crear Usuario
1. Ve a Panel Admin > Gestión de Usuarios > Usuarios
2. Clic en "Crear Usuario"
3. Completa formulario
4. Selecciona rol y plan
5. Clic en "Crear Usuario"

## Cambiar Rol de Usuario
1. Busca usuario en la lista
2. Clic en "Editar"
3. Selecciona nuevo rol
4. Clic en "Guardar Cambios"

## Gestionar Roles
1. Ve a Panel Admin > Gestión de Usuarios > Roles
2. Crea, edita o desactiva roles
3. Los cambios se reflejan inmediatamente
```

## ✅ Checklist Final de Despliegue

Antes de considerar el despliegue completo, verifica:

- [ ] Migración aplicada sin errores
- [ ] Roles por defecto creados
- [ ] Vista `profiles_with_roles` funciona
- [ ] Código desplegado a producción
- [ ] Script de verificación pasa
- [ ] Login admin funciona
- [ ] Menú "Gestión de Usuarios" visible
- [ ] Crear usuario funciona
- [ ] Editar usuario funciona
- [ ] Cambiar rol funciona
- [ ] Roles aparecen en dropdowns
- [ ] RLS configurado correctamente
- [ ] Logs sin errores críticos
- [ ] Documentación entregada al equipo

## 🆘 Soporte

Si encuentras problemas:

1. **Revisa documentación**:
   - `docs/USER_ROLE_MANAGEMENT.md`
   - `docs/USER_ROLE_VISUAL_GUIDE.md`
   - `IMPLEMENTACION_ROLES_RESUMEN.md`

2. **Ejecuta verificación**:
   ```bash
   bash scripts/verify-user-role-system.sh
   ```

3. **Revisa logs**:
   - Logs de aplicación
   - Logs de Supabase
   - Console del navegador (F12)

4. **Queries de debug**:
   ```sql
   -- Ver todos los perfiles con sus roles
   SELECT * FROM profiles_with_roles LIMIT 10;
   
   -- Ver roles disponibles
   SELECT * FROM roles WHERE activo = true;
   
   -- Ver últimos usuarios creados
   SELECT * FROM profiles 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

## 🎉 Completado

Una vez que todos los checks pasen, el sistema está en producción y listo para usar.

¡Felicitaciones! Has desplegado exitosamente el Sistema de Gestión de Usuarios con Roles.
