# Guía de Migración: Mantenedores Admin

## Resumen
Esta migración agrega mantenedores administrativos completos para gestionar planes, límites de créditos y roles en ProfeFlow.

## Cambios Implementados

### 1. Nuevas Tablas de Base de Datos

#### Tabla `planes`
Gestiona los planes disponibles en el sistema (free, pro, enterprise, etc.)
- `id`: UUID, clave primaria
- `nombre`: Nombre del plan (ej: "Plan Gratuito", "Plan Pro")
- `codigo`: Código único del plan (ej: "free", "pro")
- `descripcion`: Descripción del plan
- `precio_mensual_clp`: Precio mensual en pesos chilenos
- `activo`: Boolean, indica si el plan está activo
- `caracteristicas`: JSONB, array de características del plan
- Timestamps: `created_at`, `updated_at`

#### Tabla `planes_limites`
Define los límites y permisos por plan
- `id`: UUID, clave primaria
- `plan_id`: FK a tabla planes
- `creditos_planificaciones`: Créditos mensuales para planificaciones
- `creditos_evaluaciones`: Créditos mensuales para evaluaciones
- `analisis_portafolio`: Boolean, permiso para análisis de portafolio
- `exportar_pdf`: Boolean, permiso para exportar PDF sin marca de agua
- `soporte_prioritario`: Boolean, acceso a soporte prioritario
- Timestamps: `created_at`, `updated_at`

#### Tabla `roles`
Gestiona roles y permisos del sistema
- `id`: UUID, clave primaria
- `nombre`: Nombre del rol (ej: "Usuario", "Administrador")
- `codigo`: Código único del rol (ej: "user", "admin")
- `descripcion`: Descripción del rol
- `permisos`: JSONB, array de permisos
- `activo`: Boolean, indica si el rol está activo
- Timestamps: `created_at`, `updated_at`

### 2. Funciones PostgreSQL

#### `get_plan_limites(plan_codigo TEXT)`
Obtiene los límites de un plan específico por su código.

#### `actualizar_plan_usuario(usuario_id UUID, nuevo_plan_codigo TEXT)`
Actualiza el plan de un usuario y ajusta automáticamente sus créditos según los límites del nuevo plan.

### 3. Datos Iniciales

La migración crea automáticamente:
- **Plan Free**: 5 planificaciones, 3 evaluaciones, $0/mes
- **Plan Pro**: Planificaciones y evaluaciones ilimitadas, $6,990/mes
- **Rol User**: Permisos básicos de usuario
- **Rol Admin**: Permisos completos de administración

### 4. Nuevas Páginas Admin

#### `/admin/planes`
- Visualización de todos los planes en tarjetas
- Crear, editar, eliminar planes
- Gestionar características del plan
- Configurar límites de créditos
- Activar/desactivar planes

#### `/admin/roles`
- Visualización de roles del sistema
- Crear, editar, eliminar roles
- Gestionar permisos (predefinidos o personalizados)
- Activar/desactivar roles

#### `/admin/usuarios` (Mejorado)
- Nueva columna de "Rol" con indicador visual para admins
- Modal de edición completo para cambiar plan y rol
- Filtros por plan y rol
- Estadísticas actualizadas (usuarios regulares vs admins)
- Al cambiar plan, los créditos se ajustan automáticamente

### 5. Componentes Nuevos

#### `EditUserModal.tsx`
Modal para editar información completa del usuario:
- Nombre, email, asignatura, nivel
- Cambiar plan (con ajuste automático de créditos)
- Cambiar rol
- Integración con las nuevas tablas

### 6. Actualizaciones al Sidebar Admin
- Nuevos iconos y enlaces a "Planes" y "Roles"
- Iconos: `CreditCard` para Planes, `Shield` para Roles

## Instrucciones de Aplicación

### Opción 1: CI/CD Automático (Recomendado) ⭐

**Para proyectos en producción**, configura el workflow de GitHub Actions para ejecutar migraciones automáticamente:

1. Configura los secrets requeridos en GitHub (ver `CI_CD_MIGRATIONS_SETUP.md`)
2. Haz merge de tu PR a `main` o `production`
3. El workflow ejecutará las migraciones automáticamente
4. Verifica en GitHub Actions que se aplicaron correctamente

**Ventajas:**
- ✅ Automatizado y consistente
- ✅ Se ejecuta antes del deployment
- ✅ Logs centralizados
- ✅ Rollback más fácil

Ver guía completa: **`CI_CD_MIGRATIONS_SETUP.md`**

### Opción 2: Mediante Supabase CLI

```bash
# Asegúrate de tener Supabase CLI instalado
supabase migration up
```

### Opción 3: Mediante Supabase Dashboard

1. Accede al Supabase Dashboard de tu proyecto
2. Ve a la sección "SQL Editor"
3. Copia y pega el contenido de `supabase/migrations/20250115_admin_maintainers.sql`
4. Ejecuta la query
5. Verifica que se crearon las tablas con:
   ```sql
   SELECT * FROM planes;
   SELECT * FROM roles;
   ```

### Opción 4: Script de Migración Manual (No Recomendado)

```bash
npm run migrate
# Y selecciona la migración 20250115_admin_maintainers.sql
```

**Nota:** Para proyectos en producción, se recomienda usar la Opción 1 (CI/CD) para mayor confiabilidad y trazabilidad.

## Verificación Post-Migración

Después de aplicar la migración, verifica:

```sql
-- Verificar planes
SELECT nombre, codigo, precio_mensual_clp FROM planes;

-- Verificar límites de planes
SELECT p.nombre, pl.creditos_planificaciones, pl.creditos_evaluaciones 
FROM planes p 
JOIN planes_limites pl ON p.id = pl.plan_id;

-- Verificar roles
SELECT nombre, codigo FROM roles;

-- Verificar RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('planes', 'planes_limites', 'roles');
```

## Consideraciones de Seguridad

1. **RLS Policies**: Todas las tablas tienen Row Level Security habilitado
2. **Permisos Admin**: Solo usuarios con `role = 'admin'` pueden modificar planes, límites y roles
3. **Usuarios pueden ver**: Planes activos y roles activos
4. **Service Role**: La función `actualizar_plan_usuario` usa SECURITY DEFINER para bypass de RLS

## Rollback

Si necesitas revertir los cambios:

```sql
-- Eliminar tablas
DROP TABLE IF EXISTS planes_limites CASCADE;
DROP TABLE IF EXISTS planes CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Eliminar funciones
DROP FUNCTION IF EXISTS get_plan_limites(TEXT);
DROP FUNCTION IF EXISTS actualizar_plan_usuario(UUID, TEXT);
```

## Testing

Para probar las nuevas funcionalidades:

1. **Planes**:
   - Navega a `/admin/planes`
   - Crea un nuevo plan de prueba
   - Edita características y límites
   - Desactiva/activa el plan

2. **Roles**:
   - Navega a `/admin/roles`
   - Crea un nuevo rol personalizado
   - Asigna permisos
   - Desactiva/activa el rol

3. **Usuarios**:
   - Navega a `/admin/usuarios`
   - Busca un usuario
   - Haz clic en "Editar"
   - Cambia su plan (observa que créditos se actualizan automáticamente)
   - Cambia su rol

## Próximos Pasos

Mejoras sugeridas para el futuro:
- [ ] Agregar histórico de cambios de planes
- [ ] Notificaciones por email al cambiar plan
- [ ] Límites personalizados por usuario (overrides)
- [ ] Planes con períodos de prueba
- [ ] Roles con jerarquías y herencia de permisos
- [ ] Audit log de cambios administrativos

## Soporte

Para dudas o problemas con la migración, contacta al equipo de desarrollo.
