# Admin API Routes

Este directorio contiene las API routes del lado del servidor para operaciones administrativas en ProfeFlow.

## Rutas Disponibles

### `/api/admin/usuarios`

Gestión de usuarios del sistema.

**GET** - Obtener todos los usuarios
- Requiere: Autenticación + rol `admin`
- Retorna: Lista de usuarios con sus planificaciones count
- Usa: Admin client para bypass de RLS

**PUT** - Actualizar usuario
- Requiere: Autenticación + rol `admin`
- Body: `{ userId: string, updates: { nombre?, email?, plan?, role?, asignatura?, nivel? } }`
- Si se actualiza `plan`, se ejecuta RPC `actualizar_plan_usuario` para ajustar créditos automáticamente
- Retorna: `{ success: true }`

**DELETE** - Eliminar usuario
- Requiere: Autenticación + rol `admin`
- Query: `?userId=<uuid>`
- Retorna: `{ success: true }`

### `/api/admin/roles`

Gestión de roles y permisos.

**GET** - Obtener todos los roles
- Requiere: Autenticación + rol `admin`
- Retorna: Lista de roles con sus permisos

**POST** - Crear nuevo rol
- Requiere: Autenticación + rol `admin`
- Body: `{ nombre: string, codigo: string, descripcion?: string, permisos?: string[], activo?: boolean }`
- Retorna: `{ role: Role }`

**PUT** - Actualizar rol
- Requiere: Autenticación + rol `admin`
- Body: `{ roleId: string, updates: { nombre?, descripcion?, permisos?, activo? } }`
- Retorna: `{ success: true }`

**DELETE** - Eliminar rol
- Requiere: Autenticación + rol `admin`
- Query: `?roleId=<uuid>`
- Retorna: `{ success: true }`

### `/api/admin/planes`

Gestión de planes de suscripción.

**GET** - Obtener todos los planes con sus límites
- Requiere: Autenticación + rol `admin`
- Retorna: Lista de planes con sus `limites` embebidos

**POST** - Crear nuevo plan
- Requiere: Autenticación + rol `admin`
- Body: `{ nombre, codigo, descripcion?, precio_mensual_clp?, activo?, caracteristicas?, creditos_planificaciones?, creditos_evaluaciones?, analisis_portafolio?, exportar_pdf?, soporte_prioritario? }`
- Crea el plan y sus límites automáticamente
- Retorna: `{ plan: Plan }`

**PUT** - Actualizar plan
- Requiere: Autenticación + rol `admin`
- Body: `{ planId: string, planUpdates?: {...}, limitesUpdates?: {...} }`
- Actualiza plan y/o límites según lo proporcionado
- Retorna: `{ success: true }`

**DELETE** - Eliminar plan
- Requiere: Autenticación + rol `admin`
- Query: `?planId=<uuid>`
- Los límites se eliminan automáticamente (CASCADE)
- Retorna: `{ success: true }`

## Seguridad

Todas las rutas implementan:

1. **Verificación de autenticación**: Se verifica que existe un usuario autenticado
2. **Verificación de rol admin**: Solo usuarios con `role = 'admin'` pueden acceder
3. **Admin client**: Se usa `createAdminClient()` para operaciones de BD, que bypasea RLS
4. **Validación de datos**: Se validan los datos requeridos antes de procesar

## Uso desde el Frontend

```typescript
// Ejemplo: Obtener usuarios
const response = await fetch('/api/admin/usuarios')
const data = await response.json()
const users = data.users

// Ejemplo: Actualizar usuario
await fetch('/api/admin/usuarios', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    updates: {
      nombre: 'Nuevo Nombre',
      plan: 'pro', // Esto actualizará créditos automáticamente
      role: 'admin',
    },
  }),
})

// Ejemplo: Crear rol
await fetch('/api/admin/roles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nombre: 'Coordinador',
    codigo: 'coordinator',
    permisos: ['planificaciones.ver_todas', 'usuarios.ver_todos'],
    activo: true,
  }),
})
```

## Beneficios de este Enfoque

1. **Seguridad**: Las credenciales de service_role nunca se exponen al cliente
2. **Centralización**: Lógica de negocio centralizada en el servidor
3. **Validación**: Validación consistente de datos en un solo lugar
4. **Auditabilidad**: Fácil agregar logging/auditoría en el futuro
5. **Escalabilidad**: Fácil agregar rate limiting, caché, etc.

## Próximas Mejoras

- [ ] Agregar logging de todas las operaciones admin
- [ ] Implementar rate limiting
- [ ] Agregar paginación a GET endpoints
- [ ] Agregar búsqueda y filtros avanzados
- [ ] Implementar audit trail (registro de cambios)
- [ ] Agregar validación con Zod o similar
