# Guía Visual: Mantenedores Admin

## Nuevas Páginas Implementadas

### 1. Gestión de Planes (`/admin/planes`)

**Características:**
- Vista en grid de todos los planes del sistema
- Indicador visual de planes activos/inactivos
- Precio destacado con formato chileno
- Sección de límites mostrando créditos por tipo
- Lista de características principales
- Acciones: Editar, Activar/Desactivar, Eliminar

**Funcionalidades del Modal de Creación/Edición:**
- Información básica: nombre, código, descripción
- Precio mensual en CLP
- Estado activo/inactivo
- Límites de créditos:
  - Créditos de planificaciones
  - Créditos de evaluaciones
- Permisos especiales:
  - ✓ Análisis de portafolio
  - ✓ Exportar PDF sin marca de agua
  - ✓ Soporte prioritario
- Gestión de características:
  - Agregar características personalizadas
  - Eliminar características existentes

**Ejemplo de Uso:**
```
Plan Gratuito (free)
- Precio: $0/mes
- 5 planificaciones/mes
- 3 evaluaciones/mes
- Sin análisis de portafolio
- Con marca de agua en PDF

Plan Pro (pro)
- Precio: $6,990/mes
- Planificaciones ilimitadas (999,999)
- Evaluaciones ilimitadas (999,999)
- Con análisis de portafolio
- PDF sin marca de agua
- Soporte prioritario
```

---

### 2. Gestión de Roles (`/admin/roles`)

**Características:**
- Vista en grid con iconos de Shield para cada rol
- Indicador de activo/inactivo
- Vista previa de permisos (primeros 4 + contador)
- Acciones: Editar, Activar/Desactivar, Eliminar

**Funcionalidades del Modal de Creación/Edición:**
- Información básica: nombre, código, descripción
- Estado activo/inactivo
- Selector de permisos predefinidos
- Campo para agregar permisos personalizados
- Lista visual de todos los permisos asignados

**Permisos Predefinidos Disponibles:**
- `planificaciones.crear`
- `planificaciones.ver_propias`
- `planificaciones.ver_todas`
- `planificaciones.editar_propias`
- `planificaciones.editar_todas`
- `planificaciones.eliminar_propias`
- `planificaciones.eliminar_todas`
- `evaluaciones.crear`
- `evaluaciones.ver_propias`
- `evaluaciones.ver_todas`
- `evaluaciones.eliminar_propias`
- `evaluaciones.eliminar_todas`
- `portafolios.crear`
- `portafolios.ver_propios`
- `portafolios.ver_todos`
- `usuarios.ver_todos`
- `usuarios.editar`
- `usuarios.eliminar`
- `planes.ver`
- `planes.crear`
- `planes.editar`
- `planes.eliminar`
- `roles.ver`
- `roles.crear`
- `roles.editar`
- `roles.eliminar`
- `metricas.ver`
- `sistema.configurar`

**Roles por Defecto:**
```
Usuario (user)
- Permisos básicos de creación y gestión de contenido propio

Administrador (admin)
- Todos los permisos del sistema
- Acceso completo al panel admin
```

---

### 3. Gestión de Usuarios Mejorada (`/admin/usuarios`)

**Nuevas Características:**
- Columna de "Rol" con icono Shield para admins
- Botón "Editar" que abre modal completo
- Filtro adicional por rol (usuarios/admins)
- Estadísticas actualizadas:
  - Total Usuarios
  - Usuarios Regulares
  - Administradores

**Modal de Edición de Usuario:**
- Campos editables:
  - Nombre
  - Email
  - Asignatura
  - Nivel
  - Plan (con selector de todos los planes disponibles)
  - Rol (con selector de todos los roles disponibles)
- Al cambiar el plan:
  - ⚠️ Mensaje de advertencia indicando ajuste automático de créditos
  - Función RPC actualiza créditos según límites del nuevo plan
- Validación de campos requeridos
- Botones de acción: Cancelar, Guardar Cambios

**Flujo de Cambio de Plan:**
1. Admin selecciona un usuario
2. Hace clic en "Editar"
3. Cambia el plan de "free" a "pro"
4. Sistema muestra: "Los créditos se ajustarán automáticamente según el nuevo plan"
5. Al guardar:
   - Se actualiza `profiles.plan` a "pro"
   - Se ejecuta RPC `actualizar_plan_usuario`
   - Créditos cambian de 5/3 a ilimitados (999999)
   - Usuario recibe beneficios del nuevo plan

---

### 4. Sidebar Admin Actualizado

**Nuevos Enlaces:**
- 📊 Dashboard
- 👥 Usuarios
- 📄 Planificaciones
- ✅ Evaluaciones
- 💼 Portafolios
- **💳 Planes** ← NUEVO
- **🛡️ Roles** ← NUEVO
- 🎓 MINEDUC
- 🤖 Métricas IA
- 📈 Analytics
- ⚙️ Sistema

---

## Flujos de Trabajo Típicos

### Crear un Nuevo Plan Personalizado

1. Admin navega a `/admin/planes`
2. Clic en "Nuevo Plan"
3. Completa formulario:
   - Nombre: "Plan Educativo"
   - Código: "educativo"
   - Descripción: "Plan especial para instituciones"
   - Precio: $12,990
   - Créditos planificaciones: 50
   - Créditos evaluaciones: 30
   - ✓ Análisis de portafolio
   - ✓ Exportar PDF
   - ✓ Soporte prioritario
4. Agrega características:
   - "Hasta 50 docentes"
   - "Dashboard institucional"
   - "Reportes mensuales"
5. Clic en "Crear Plan"
6. Nuevo plan aparece en la lista

### Cambiar Usuario de Free a Pro

1. Admin navega a `/admin/usuarios`
2. Busca usuario "María González"
3. Clic en "Editar"
4. Cambia plan de "free" a "pro"
5. Observa mensaje: "Los créditos se ajustarán automáticamente"
6. Clic en "Guardar Cambios"
7. Sistema actualiza:
   - Plan → "pro"
   - Créditos planificaciones: 5 → 999,999
   - Créditos evaluaciones: 3 → 999,999
8. Usuario María ahora tiene acceso a todas las funciones Pro

### Crear Rol Personalizado

1. Admin navega a `/admin/roles`
2. Clic en "Nuevo Rol"
3. Completa formulario:
   - Nombre: "Coordinador"
   - Código: "coordinator"
   - Descripción: "Coordinador de área con permisos extendidos"
4. Selecciona permisos:
   - ✓ planificaciones.ver_todas
   - ✓ evaluaciones.ver_todas
   - ✓ usuarios.ver_todos
   - ✓ metricas.ver
5. Agrega permiso personalizado: "reportes.exportar"
6. Clic en "Crear Rol"
7. Nuevo rol disponible para asignar a usuarios

---

## Beneficios de la Implementación

### Para Administradores
✅ Gestión centralizada de planes y precios
✅ Fácil creación de planes personalizados
✅ Control granular de permisos por rol
✅ Cambios de plan sin scripts manuales
✅ Visualización clara de límites y características

### Para el Sistema
✅ Datos normalizados en base de datos
✅ Escalabilidad para nuevos planes
✅ Auditoría de cambios (timestamps)
✅ Integridad referencial garantizada
✅ RLS policies para seguridad

### Para Usuarios
✅ Transiciones suaves entre planes
✅ Límites claros y transparentes
✅ Sin interrupciones de servicio
✅ Créditos ajustados automáticamente

---

## Seguridad Implementada

### Row Level Security (RLS)
- ✓ Todas las tablas protegidas con RLS
- ✓ Solo admins pueden modificar planes y roles
- ✓ Usuarios regulares solo ven planes y roles activos

### Validaciones
- ✓ Códigos únicos para planes y roles
- ✓ Campos requeridos validados
- ✓ Estados activo/inactivo controlados

### Funciones de BD
- ✓ `SECURITY DEFINER` para bypass controlado de RLS
- ✓ Validación de existencia de planes antes de asignar
- ✓ Transacciones atómicas para cambios de plan

---

## Próximos Pasos Sugeridos

1. **Testing en Staging**
   - Verificar todos los flujos
   - Probar cambios masivos de planes
   - Validar permisos por rol

2. **Capacitación**
   - Documentar procedimientos para admins
   - Crear videos tutoriales
   - Manual de troubleshooting

3. **Monitoreo**
   - Métricas de cambios de planes
   - Alertas de errores en actualización
   - Dashboard de conversiones

4. **Mejoras Futuras**
   - Histórico de cambios de plan
   - Notificaciones automáticas
   - Límites personalizados por usuario
   - Planes con períodos de prueba
