# Test de Políticas RLS para Panel de Administración

## Objetivo
Verificar que las políticas RLS permiten a usuarios con rol `admin` o `maintainer` acceder a datos de todos los usuarios.

## Pre-requisitos
1. Usuario con rol `admin` creado y autenticado
2. Al menos 2 usuarios regulares con datos de prueba

## Test Cases

### TC1: Admin puede ver todos los perfiles
**Pasos:**
1. Autenticarse como usuario admin
2. Consultar `GET /rest/v1/profiles?select=id,email,role`

**Resultado esperado:**
- Status: 200 OK
- Response incluye perfiles de múltiples usuarios
- No hay error 403 o 500

### TC2: Admin puede ver todas las evaluaciones
**Pasos:**
1. Autenticarse como usuario admin
2. Consultar `GET /rest/v1/evaluaciones?select=id,user_id,tipo`

**Resultado esperado:**
- Status: 200 OK
- Response incluye evaluaciones de múltiples usuarios
- No hay error 403 o 500

### TC3: Admin puede ver todas las planificaciones
**Pasos:**
1. Autenticarse como usuario admin
2. Consultar `GET /rest/v1/planificaciones?select=id,user_id,asignatura`

**Resultado esperado:**
- Status: 200 OK
- Response incluye planificaciones de múltiples usuarios
- No hay error 403 o 500

### TC4: API de objetivos de aprendizaje funciona para admin
**Pasos:**
1. Autenticarse como usuario admin
2. Consultar `GET /api/admin/objetivos-aprendizaje?page=1&pageSize=20`

**Resultado esperado:**
- Status: 200 OK
- Response incluye objetivos con paginación
- No hay error 403

### TC5: APIs de ETL funcionan para admin
**Pasos:**
1. Autenticarse como usuario admin
2. Consultar `GET /api/admin/etl/historial?limite=10`
3. Consultar `GET /api/admin/etl/estadisticas?dias=30`

**Resultado esperado:**
- Status: 200 OK en ambas llamadas
- No hay errores 403

### TC6: Usuario regular NO puede ver perfiles de otros
**Pasos:**
1. Autenticarse como usuario regular (no admin)
2. Consultar `GET /rest/v1/profiles?select=id,email,role`

**Resultado esperado:**
- Status: 200 OK pero solo retorna el perfil del usuario autenticado
- No retorna perfiles de otros usuarios

## Verificación SQL de Políticas

```sql
-- Verificar que las políticas existen
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename IN ('profiles', 'evaluaciones', 'planificaciones', 'procesos_etl')
  AND policyname LIKE '%Admin%'
ORDER BY tablename, policyname;

-- Verificar que el índice de role existe
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'profiles' 
  AND indexname = 'idx_profiles_role';
```

## Estado de la Prueba
- [ ] TC1: Pendiente
- [ ] TC2: Pendiente
- [ ] TC3: Pendiente
- [ ] TC4: Pendiente
- [ ] TC5: Pendiente
- [ ] TC6: Pendiente

## Notas
- Las políticas RLS fueron creadas en la migración `20260116005_fix_admin_rls_policies.sql`
- Las políticas permiten acceso a usuarios con `role IN ('admin', 'maintainer')`
- Se agregaron índices para mejorar el rendimiento de las queries
