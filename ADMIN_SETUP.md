# 🔧 Panel de Administración - ProfeFlow

Este documento explica cómo configurar y usar el panel de administración de ProfeFlow.

## 🚀 Configuración Inicial

### 1. Crear Usuario Administrador

#### Opción A: Script Automatizado (Recomendado)

Ejecuta el script automatizado para crear el usuario admin inicial:

```bash
npm run admin:create
```

**Requisitos:**
- Variables de entorno configuradas en `.env.local`
- `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`

#### Opción B: SQL Manual

Si no tienes las variables configuradas, genera el SQL:

```bash
npm run admin:create-sql
```

Luego ejecuta el SQL generado en el SQL Editor de Supabase.

**Credenciales del administrador:**
- **Email:** `admin@educalia.cl`
- **Contraseña:** `Admin2024!ProfeFlow`

### 2. Configuración Manual (Alternativa)

Si prefieres configurar manualmente, ejecuta el SQL en Supabase:

```bash
# Ejecutar en el SQL Editor de Supabase
cat sql/admin/create-admin-user.sql
```

### 3. Configurar Políticas RLS

Asegúrate de que las políticas de seguridad estén configuradas:

```bash
# Ejecutar en el SQL Editor de Supabase
cat sql/admin/supabase-admin-setup.sql
```

## 📊 Funcionalidades del Panel Admin

### Dashboard Principal (`/admin`)

- **Métricas en tiempo real:**
  - Total de usuarios (FREE vs PRO)
  - Tasa de conversión
  - MRR (Monthly Recurring Revenue)
  - Usuarios activos
  - Planificaciones y evaluaciones generadas

- **Gráficos y analytics:**
  - Planificaciones por día (últimos 7 días)
  - Distribución de usuarios por plan
  - Top 10 usuarios más activos

- **Acciones rápidas:**
  - Enlaces directos a gestión de usuarios
  - Acceso a planificaciones
  - Analytics avanzados

### Gestión de Usuarios (`/admin/usuarios`)

- Ver todos los usuarios registrados
- Filtrar por plan (FREE/PRO)
- Ver estadísticas de uso por usuario
- Cambiar planes de usuario
- Ver actividad reciente

### Planificaciones (`/admin/planificaciones`)

- Ver todas las planificaciones generadas
- Filtrar por asignatura, nivel, fecha
- Ver contenido completo de planificaciones
- Estadísticas de uso por materia

### Analytics (`/admin/analytics`)

- Métricas detalladas de conversión
- Análisis de retención de usuarios
- Reportes de ingresos
- Tendencias de uso de la plataforma

### Sistema (`/admin/system`)

- Estado de salud del sistema
- Configuración de límites y precios
- Monitoreo de servicios
- Logs de actividad del sistema

## 🔐 Seguridad y Permisos

### Middleware de Protección

El panel admin está protegido por middleware que verifica:

1. **Autenticación:** Usuario debe estar logueado
2. **Autorización:** Usuario debe tener `role = 'admin'`
3. **Redirección:** Usuarios no-admin son redirigidos a `/dashboard`

### Políticas RLS (Row Level Security)

- **Función `is_admin()`:** Verifica si el usuario actual es administrador
- **Políticas por tabla:** Admins pueden ver/editar todos los registros
- **Usuarios normales:** Solo pueden ver/editar sus propios registros

### Funciones RPC Protegidas

Todas las funciones RPC del admin verifican permisos:

```sql
-- Ejemplo de verificación en función RPC
IF NOT (public.is_admin() OR is_service_role) THEN
  RAISE EXCEPTION 'Only admins can access this function';
END IF;
```

## 🛠️ Desarrollo y Mantenimiento

### Agregar Nuevas Métricas

1. Crear función RPC en Supabase:

```sql
CREATE OR REPLACE FUNCTION public.get_nueva_metrica()
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar permisos admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;
  
  -- Tu lógica aquí
END;
$$;
```

2. Agregar al dashboard:

```typescript
// En app/admin/page.tsx
const { data: nuevaMetrica } = await supabase.rpc('get_nueva_metrica')
```

### Agregar Nueva Página Admin

1. Crear archivo en `app/admin/nueva-pagina/page.tsx`
2. Agregar al sidebar en `components/admin/admin-sidebar.tsx`
3. La protección se aplica automáticamente via `app/admin/layout.tsx`

### Componentes Reutilizables

- `MetricsCard`: Para mostrar métricas con iconos
- `DashboardCharts`: Para gráficos y visualizaciones
- `RecentUsersTable`: Para tablas de usuarios
- `Badge`: Para estados y etiquetas

## 📈 Métricas Disponibles

### Funciones RPC Implementadas

- `get_user_stats()`: Estadísticas generales de usuarios
- `get_top_users(limit)`: Top usuarios más activos
- `get_planificaciones_by_date(days)`: Planificaciones por fecha
- `get_planificaciones_by_subject()`: Planificaciones por asignatura
- `get_planificaciones_by_nivel()`: Planificaciones por nivel

### Métricas Calculadas

- **Tasa de conversión:** `(usuarios_pro / total_usuarios) * 100`
- **MRR:** `usuarios_pro * 6990` (precio mensual)
- **Usuarios activos:** Usuarios con actividad en últimos 7 días
- **Crecimiento:** Comparación mes a mes

## 🚨 Troubleshooting

### Error: "Only admins can access this function"

**Causa:** Usuario no tiene rol de admin o función RLS mal configurada

**Solución:**
```sql
-- Verificar rol del usuario
SELECT role FROM profiles WHERE email = 'tu-email@ejemplo.com';

-- Actualizar rol si es necesario
UPDATE profiles SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';
```

### Error: "infinite recursion detected"

**Causa:** Políticas RLS mal configuradas que se llaman recursivamente

**Solución:**
```bash
# Re-ejecutar setup sin recursión
cat sql/admin/supabase-admin-setup.sql
```

### Panel admin no carga

**Causa:** Variables de entorno faltantes o configuración incorrecta

**Solución:**
1. Verificar `.env.local` tiene todas las variables
2. Verificar conexión a Supabase
3. Verificar que el usuario tiene rol admin

## 📝 Logs y Monitoreo

### Logs de Acceso

El middleware registra automáticamente:
- Intentos de acceso al panel admin
- Usuarios sin permisos
- Redirecciones por falta de autenticación

### Métricas de Rendimiento

- Tiempo de carga de dashboard
- Consultas RPC más lentas
- Errores de base de datos

## 🔄 Actualizaciones

### Migrar Nuevas Funciones

1. Crear archivo SQL en `sql/admin/`
2. Ejecutar en Supabase SQL Editor
3. Actualizar componentes React según sea necesario
4. Probar en desarrollo antes de producción

### Backup de Configuración

```bash
# Exportar configuración actual
pg_dump --schema-only tu_db > backup-admin-schema.sql
```

---

## 📞 Soporte

Para problemas con el panel admin:

1. Revisar logs en Supabase Dashboard
2. Verificar políticas RLS están activas
3. Confirmar que funciones RPC tienen permisos correctos
4. Contactar al equipo de desarrollo si persisten los problemas