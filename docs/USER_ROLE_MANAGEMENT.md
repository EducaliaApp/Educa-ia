# Sistema de Gestión de Usuarios con Roles

## Resumen de Implementación

Este documento describe la implementación del sistema de gestión de usuarios con roles en ProfeFlow, permitiendo administrar usuarios desde el panel de administración con asignación de roles desde la tabla `roles` de Supabase.

> **✅ CI/CD Integrado**: La migración sigue el formato requerido por el workflow automático de GitHub Actions. Ver [CI_CD_MIGRATIONS_SETUP.md](../CI_CD_MIGRATIONS_SETUP.md) para detalles del proceso de deployment.

## Cambios Implementados

### 1. Base de Datos (Migration: `20250115001_user_role_management.sql`)

#### Esquema Actualizado
- **Tabla `profiles`**: Agregada columna `role_id` (UUID, nullable) con foreign key a `roles.id`
- **Tabla `roles`**: Ya existente, ahora con políticas RLS apropiadas
- **Vista `profiles_with_roles`**: Nueva vista que combina perfiles con información completa de roles

#### Roles por Defecto
Se crean automáticamente dos roles:
- **Usuario** (`user`): Acceso estándar a funcionalidades básicas
- **Administrador** (`admin`): Acceso completo al sistema

#### Migración de Datos
- Los valores existentes en `profiles.role` (texto) se migran automáticamente a `role_id` (UUID)
- El campo `role` se mantiene por compatibilidad legacy
- La función `handle_new_user()` se actualiza para asignar `role_id` por defecto

### 2. API Routes

#### POST `/api/admin/usuarios`
Crea un nuevo usuario con:
- Autenticación en Supabase Auth
- Perfil automático en tabla `profiles`
- Asignación de rol desde tabla `roles`
- Asignación de plan con créditos correspondientes

**Body:**
```json
{
  "email": "usuario@ejemplo.cl",
  "password": "contraseña123",
  "nombre": "Nombre Usuario",
  "asignatura": "Matemáticas",
  "nivel": "8° Básico",
  "plan": "free",
  "roleId": "uuid-del-rol"
}
```

#### GET `/api/admin/usuarios`
- Retorna usuarios con información completa de roles desde vista `profiles_with_roles`
- Incluye campos: `role_codigo`, `role_nombre`, `role_descripcion`, `role_permisos`

#### PUT `/api/admin/usuarios`
- Actualiza usuarios incluyendo asignación de rol vía `roleId`
- Sincroniza campos `role` (legacy) y `role_id` automáticamente

### 3. Componentes

#### `CreateUserModal.tsx`
Modal para crear nuevos usuarios con:
- Formulario completo (email, contraseña, nombre, asignatura, nivel)
- Selector de plan (desde API `/api/admin/planes`)
- Selector de rol (desde API `/api/admin/roles`)
- Validación de campos requeridos
- Manejo de errores con mensajes descriptivos

#### `EditUserModal.tsx` (Actualizado)
- Selector de roles desde tabla `roles` en lugar de valores hardcodeados
- Conversión automática entre `role_codigo` y `role_id`
- Mantiene compatibilidad con sistema legacy

#### `UserTable.tsx` (Actualizado)
- Muestra `role_nombre` en lugar de solo código
- Mantiene indicador visual para administradores

#### `admin-sidebar.tsx` (Actualizado)
- Agrupa "Usuarios" y "Roles" bajo sección "Gestión de Usuarios"
- Mejora la navegación y organización del menú

### 4. Tipos TypeScript

Actualizado `lib/supabase/types.ts`:
```typescript
profiles: {
  Row: {
    // ... campos existentes
    role: string        // Legacy
    role_id: string | null  // Nuevo sistema
  }
}
```

## Uso

### Crear un Usuario desde el Panel Admin

1. Navegar a `/admin/usuarios`
2. Hacer clic en botón "Crear Usuario"
3. Completar formulario:
   - Email y contraseña (requeridos)
   - Nombre, asignatura, nivel (opcionales)
   - Seleccionar plan y rol
4. Hacer clic en "Crear Usuario"

El sistema automáticamente:
- Crea el usuario en Supabase Auth
- Genera perfil en tabla `profiles`
- Asigna rol desde tabla `roles`
- Configura créditos según el plan

### Editar Usuario

1. En lista de usuarios, hacer clic en "Editar"
2. Modificar campos necesarios
3. Cambiar rol desde dropdown (carga dinámicamente desde tabla `roles`)
4. Guardar cambios

### Gestionar Roles

1. Navegar a `/admin/roles`
2. Crear, editar o desactivar roles
3. Los roles activos aparecen automáticamente en selectores de usuario

## Arquitectura

### Flujo de Creación de Usuario

```
Admin Panel → POST /api/admin/usuarios
  ↓
1. Crear usuario en auth.users (Supabase Auth Admin)
  ↓
2. Trigger handle_new_user() crea perfil base
  ↓
3. API actualiza perfil con datos completos + role_id
  ↓
4. Usuario listo con perfil y rol asignado
```

### Relaciones de Base de Datos

```
auth.users (Supabase Auth)
  ↓ (1:1)
profiles
  ↓ (N:1)
roles
```

### Compatibilidad Legacy

El sistema mantiene doble compatibilidad:
- **Nuevo**: `profiles.role_id` → `roles.id` (recomendado)
- **Legacy**: `profiles.role` texto (mantenido por compatibilidad)

Ambos campos se sincronizan automáticamente en la API.

## Políticas de Seguridad (RLS)

- **`profiles`**: Solo el usuario puede ver/editar su propio perfil
- **`roles`**: Usuarios autenticados pueden ver roles activos
- **Admin Operations**: Se usa `createAdminClient()` para bypass de RLS en operaciones administrativas

## Migraciones Futuras

Para agregar nuevos roles:
```sql
INSERT INTO public.roles (nombre, codigo, descripcion, permisos, activo)
VALUES (
  'Nombre del Rol',
  'codigo_rol',
  'Descripción del rol',
  '["permiso.1", "permiso.2"]'::jsonb,
  true
);
```

## Notas Importantes

1. **Service Role**: La API usa `createAdminClient()` para operaciones que requieren bypass de RLS
2. **Seguridad**: Las contraseñas se manejan directamente por Supabase Auth Admin API
3. **Email Verification**: Los usuarios creados por admin se auto-confirman (`email_confirm: true`)
4. **Créditos**: Se asignan automáticamente según el plan seleccionado

## Testing

Para probar el sistema:
1. Ejecutar migración `20250115001_user_role_management.sql` en Supabase
2. Verificar que roles por defecto se crearon
3. Probar creación de usuario desde `/admin/usuarios`
4. Verificar que perfil y rol se asignaron correctamente
5. Probar edición de usuario y cambio de rol
