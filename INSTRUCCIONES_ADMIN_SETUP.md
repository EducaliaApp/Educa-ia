# 🚀 Instrucciones de Setup - Panel Admin ProfeFlow

## Para: h.herrera@cloou.com

---

## ✅ **Paso 1: Ejecutar SQL en Supabase**

### 1.1 Ir a Supabase
1. Abre [https://supabase.com](https://supabase.com)
2. Selecciona tu proyecto ProfeFlow
3. En el menú lateral, ve a **SQL Editor**

### 1.2 Ejecutar el Script
1. Haz clic en **New Query**
2. Copia **TODO** el contenido del archivo `supabase-admin-setup.sql` (ubicado en la raíz del proyecto)
3. Pégalo en el editor SQL
4. Haz clic en **Run** (o presiona Ctrl+Enter / Cmd+Enter)

El script ya está configurado con tu email: **h.herrera@cloou.com**

### 1.3 Verificar que funcionó
Ejecuta esta query de verificación:

```sql
SELECT id, email, nombre, role FROM profiles WHERE email = 'h.herrera@cloou.com';
```

**Resultado esperado:**
Deberías ver una fila con tu usuario y `role = 'admin'`

---

## ✅ **Paso 2: Probar el Panel**

### 2.1 Iniciar el servidor de desarrollo

```bash
npm run dev
```

### 2.2 Acceder al panel admin
1. Abre tu navegador en: `http://localhost:3000`
2. Inicia sesión con tu cuenta: **h.herrera@cloou.com**
3. Una vez autenticado, navega a: `http://localhost:3000/admin`

### 2.3 ¿Qué deberías ver?
✅ Dashboard con métricas (usuarios, conversión, MRR, planificaciones)
✅ Sidebar de navegación oscuro
✅ Acceso a 4 secciones:
   - Dashboard
   - Usuarios
   - Planificaciones
   - Analytics

---

## ❌ **Si algo no funciona:**

### Problema 1: "No puedes acceder a /admin"
**Solución:**
1. Verifica que ejecutaste el SQL correctamente
2. Ejecuta esta query:
   ```sql
   SELECT role FROM profiles WHERE email = 'h.herrera@cloou.com';
   ```
3. Si `role` es `NULL` o `'user'`, ejecuta:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'h.herrera@cloou.com';
   ```
4. Cierra sesión y vuelve a iniciar sesión

### Problema 2: "Error: Only admins can access this function"
**Solución:**
1. Asegúrate de que ejecutaste **TODO** el script SQL, no solo la parte del UPDATE
2. El script crea funciones RPC que necesitan las políticas de seguridad

### Problema 3: No hay datos en el dashboard
**Solución:**
Esto es normal si no tienes usuarios o planificaciones aún. El panel mostrará ceros y gráficos vacíos.

---

## 🎯 **Funcionalidades del Panel Admin**

### 📊 **Dashboard** (`/admin`)
- Total de usuarios (FREE vs PRO)
- Tasa de conversión (%)
- MRR (Monthly Recurring Revenue en CLP)
- Planificaciones generadas hoy
- Gráfico de planificaciones últimos 7 días
- Top 10 usuarios más activos
- Últimos 10 usuarios registrados

### 👥 **Gestión de Usuarios** (`/admin/usuarios`)
- Ver todos los usuarios registrados
- Buscar por nombre o email
- Filtrar por plan (FREE/PRO/Todos)
- Cambiar plan de usuario con un click (FREE ↔ PRO)
- Ver cantidad de planificaciones por usuario
- Ver fecha de registro

### 📝 **Planificaciones** (`/admin/planificaciones`)
- Ver todas las planificaciones de todos los usuarios
- Filtrar por asignatura
- Buscar por usuario o unidad
- Ver estadísticas (total, esta semana, asignaturas únicas)
- Click en "Ver" para abrir modal con contenido completo

### 📈 **Analytics** (`/admin/analytics`)
- Gráfico de crecimiento de usuarios (últimos 30 días)
- Pie chart: Planificaciones por asignatura
- Bar chart: Planificaciones por nivel
- Métricas clave:
  - Promedio de planificaciones por usuario
  - Usuarios activos en últimos 7 días
  - Tasa de retención
  - Nuevos usuarios último mes

---

## 🎨 **Diseño del Panel**

- **Tema oscuro** profesional (slate-950, slate-900)
- **Sidebar de navegación** con iconos
- **Cards con métricas** y colores diferenciados
- **Gráficos interactivos** con Recharts
- **100% responsive** (funciona en desktop, tablet, móvil)
- **Loading states** en todas las tablas
- **Hover effects** suaves

---

## 🔐 **Seguridad**

- Solo usuarios con `role = 'admin'` pueden acceder
- Middleware verifica el role en cada request
- Row Level Security (RLS) en Supabase
- Todas las funciones RPC verifican que el usuario sea admin
- Redirección automática al dashboard si no eres admin

---

## 📁 **Archivos Creados**

```
app/(admin)/
├── layout.tsx              # Layout con sidebar
├── page.tsx                # Dashboard principal
├── usuarios/page.tsx       # Gestión de usuarios
├── planificaciones/page.tsx # Vista de planificaciones
└── analytics/page.tsx      # Analytics

components/admin/
├── admin-sidebar.tsx       # Sidebar de navegación
├── metrics-card.tsx        # Cards de métricas
├── stats-chart.tsx         # Gráficos
└── user-table.tsx          # Tabla de usuarios

supabase-admin-setup.sql    # Script de setup
```

---

## 🚀 **Próximos Pasos Opcionales**

Una vez que el panel funcione, podrías considerar:

1. **Exportar datos**
   - Agregar botón para exportar usuarios a CSV
   - Exportar planificaciones a Excel

2. **Notificaciones**
   - Enviar emails masivos a usuarios
   - Notificar a usuarios sobre actualizaciones

3. **Filtros avanzados**
   - Rango de fechas personalizado
   - Filtros combinados múltiples

4. **Auditoría**
   - Log de cambios de plan
   - Historial de acciones de admin

5. **Dashboard personalizable**
   - Widgets arrastrables
   - Guardar preferencias de visualización

---

## 📞 **Soporte**

Si tienes problemas o preguntas:

1. Revisa la sección "Si algo no funciona" arriba
2. Verifica la consola del navegador (F12) para errores
3. Asegúrate de que todas las dependencias estén instaladas: `npm install`
4. Limpia la caché de Next.js: `rm -rf .next && npm run dev`

---

## ✨ **¡Listo!**

Tu panel de administración está completo y listo para usar. Solo necesitas:

1. ✅ Ejecutar el SQL en Supabase
2. ✅ Iniciar sesión con h.herrera@cloou.com
3. ✅ Ir a /admin

**¡Disfruta tu nuevo panel de administración! 🎉**
