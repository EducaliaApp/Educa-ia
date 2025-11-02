# Panel de Administración ProfeFlow - Guía de Setup

## 📋 Resumen

Se ha creado un panel de administración completo para ProfeFlow con las siguientes características:

### ✅ Funcionalidades Implementadas

1. **Middleware de Protección**
   - Rutas `/admin/*` protegidas con verificación de role
   - Solo usuarios con `role='admin'` pueden acceder
   - Redirección automática para usuarios no autorizados

2. **Dashboard Principal** (`/admin`)
   - Métricas clave: Total usuarios, Conversión %, MRR, Planificaciones hoy
   - Gráfico de planificaciones últimos 7 días
   - Top 10 usuarios más activos
   - Últimos 10 usuarios registrados

3. **Gestión de Usuarios** (`/admin/usuarios`)
   - Vista completa de todos los usuarios
   - Filtros: búsqueda por nombre/email, filtro por plan
   - Botón para cambiar plan FREE ↔ PRO
   - Contador de planificaciones por usuario

4. **Vista de Planificaciones** (`/admin/planificaciones`)
   - Tabla con todas las planificaciones de todos los usuarios
   - Filtros por usuario/unidad y asignatura
   - Modal para ver contenido completo de cada planificación
   - Estadísticas: total, esta semana, asignaturas únicas

5. **Analytics** (`/admin/analytics`)
   - Gráfico de crecimiento de usuarios (últimos 30 días)
   - Pie chart: planificaciones por asignatura
   - Bar chart: planificaciones por nivel
   - Métricas: promedio plan./usuario, tasa de retención
   - Top asignaturas y distribución por nivel

### 🎨 Diseño

- Tema oscuro (bg-slate-950, slate-900)
- Acentos en azul (#3B82F6)
- Sidebar de navegación con iconos
- Cards con hover states
- Responsive design completo

---

## 🚀 Instrucciones de Setup

### Paso 1: Ejecutar SQL en Supabase

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Navega a **SQL Editor**
3. Abre el archivo `supabase-admin-setup.sql` (ubicado en la raíz del proyecto)
4. Copia TODO el contenido y ejecútalo tal como está (ya incluye tu email configurado)
5. Verifica que funcionó ejecutando:

```sql
SELECT id, email, nombre, role FROM profiles WHERE email = 'h.herrera@cloou.com';
```

### Paso 2: Instalar Dependencias

Las dependencias ya están instaladas. Si necesitas reinstalarlas:

```bash
npm install
```

### Paso 3: Verificar Variables de Entorno

Asegúrate de tener en tu `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-supabase-anon-key
```

### Paso 4: Ejecutar en Desarrollo

```bash
npm run dev
```

### Paso 5: Acceder al Panel Admin

1. Inicia sesión con tu cuenta de admin
2. Navega a: `http://localhost:3000/admin`
3. Deberías ver el dashboard de administración

---

## 📁 Estructura de Archivos Creados

```
app/
├── (admin)/
│   ├── layout.tsx                  # Layout con sidebar y tema oscuro
│   ├── page.tsx                    # Dashboard principal
│   ├── usuarios/
│   │   └── page.tsx                # Gestión de usuarios
│   ├── planificaciones/
│   │   └── page.tsx                # Vista de planificaciones
│   └── analytics/
│       └── page.tsx                # Analytics y gráficos

components/
├── admin/
│   ├── admin-sidebar.tsx           # Sidebar de navegación
│   ├── metrics-card.tsx            # Card para KPIs
│   ├── stats-chart.tsx             # Gráficos (line, bar, pie)
│   └── user-table.tsx              # Tabla de usuarios
└── ui/
    └── Badge.tsx                   # Componente Badge (nuevo)

lib/
└── utils.ts                        # Funciones formatDate y formatCurrency

middleware.ts                       # Protección de rutas admin
supabase-admin-setup.sql           # Script SQL para setup
```

---

## 🔧 Funciones RPC Creadas en Supabase

El script SQL crea las siguientes funciones:

1. **`get_user_stats()`**
   - Retorna estadísticas generales: total usuarios, conversión, MRR, etc.

2. **`get_top_users(limit_count)`**
   - Retorna los usuarios más activos ordenados por planificaciones

3. **`get_planificaciones_by_date(days_back)`**
   - Retorna planificaciones agrupadas por fecha

4. **`get_planificaciones_by_subject()`**
   - Retorna planificaciones agrupadas por asignatura

5. **`get_planificaciones_by_nivel()`**
   - Retorna planificaciones agrupadas por nivel

---

## 🔐 Políticas RLS Creadas

- **Profiles**: Los admins pueden ver y actualizar todos los perfiles
- **Planificaciones**: Los admins pueden ver todas las planificaciones
- **Evaluaciones**: Los admins pueden ver todas las evaluaciones

---

## 🧪 Testing del Panel

### Verificaciones Básicas

1. **Acceso**
   - ✅ Usuario sin role admin no puede acceder a `/admin`
   - ✅ Usuario con role admin puede acceder a `/admin`
   - ✅ Redirección correcta a `/dashboard` para no-admins

2. **Dashboard Principal**
   - ✅ Métricas se cargan correctamente
   - ✅ Gráfico muestra datos de últimos 7 días
   - ✅ Top 10 usuarios se visualiza
   - ✅ Últimos usuarios registrados aparecen

3. **Gestión de Usuarios**
   - ✅ Búsqueda por nombre/email funciona
   - ✅ Filtro por plan funciona
   - ✅ Cambio de plan FREE ↔ PRO funciona
   - ✅ Contador de planificaciones es correcto

4. **Planificaciones**
   - ✅ Tabla muestra todas las planificaciones
   - ✅ Filtros funcionan correctamente
   - ✅ Modal muestra contenido completo
   - ✅ Información de usuario es correcta

5. **Analytics**
   - ✅ Gráficos se renderizan correctamente
   - ✅ Métricas son precisas
   - ✅ Charts interactivos (recharts)

---

## 🎯 Próximos Pasos Opcionales

Mejoras futuras que podrías considerar:

1. **Exportar Datos**
   - Botón para exportar usuarios a CSV
   - Exportar planificaciones a Excel

2. **Filtros Avanzados**
   - Rango de fechas personalizado
   - Filtros múltiples combinados

3. **Notificaciones**
   - Enviar emails desde el panel
   - Notificaciones push a usuarios

4. **Auditoría**
   - Log de cambios de plan
   - Historial de acciones de admin

5. **Dashboard Personalizable**
   - Widgets arrastrables
   - Preferencias guardadas

---

## 🐛 Troubleshooting

### Error: "Only admins can access this function"

**Solución**: Verifica que ejecutaste el SQL y que tu usuario tiene `role = 'admin'`:

```sql
SELECT role FROM profiles WHERE email = 'tu-email@ejemplo.com';
```

### Error: Middleware redirect loop

**Solución**: Limpia cookies y vuelve a iniciar sesión.

### Error: Gráficos no se muestran

**Solución**: Verifica que recharts esté instalado:

```bash
npm install recharts
```

### Error: "Cannot read properties of null"

**Solución**: Puede que no haya datos aún. Crea algunos usuarios y planificaciones de prueba.

---

## 📧 Soporte

Si tienes problemas:

1. Verifica que el SQL se ejecutó correctamente
2. Revisa la consola del navegador para errores
3. Verifica que tu usuario tiene role='admin'
4. Asegúrate de estar autenticado

---

## ✨ Créditos

Panel de administración creado para **ProfeFlow**
Tecnologías: Next.js 14, TypeScript, Supabase, Tailwind CSS, Recharts
