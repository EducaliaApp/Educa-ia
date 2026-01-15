# Testing Guide - Sistema ETL Bases Curriculares

## Pre-requisitos

1. **Base de datos configurada**:
   ```bash
   # Aplicar migración
   psql -h [tu-db-host] -U postgres -d postgres -f supabase/migrations/20250115002_procesos_etl.sql
   ```

2. **Edge Function desplegada**:
   ```bash
   supabase functions deploy extraer-bases-curriculares
   ```

3. **Usuario admin**:
   - Debe existir un usuario con `role = 'admin'` en tabla `profiles`

## Test 1: Verificar estructura de BD

```sql
-- Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('procesos_etl', 'documentos_transformados');

-- Verificar funciones RPC
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%proceso_etl%';
```

**Resultado esperado**: 
- 2 tablas encontradas
- 3 funciones RPC: `iniciar_proceso_etl`, `finalizar_proceso_etl`, `agregar_log_proceso_etl`

## Test 2: Acceder a interfaz admin

1. Login como usuario admin
2. Navegar a `/admin/etl`
3. Verificar que se muestra:
   - Dashboard con 4 cards de estadísticas
   - Botón "Ejecutar Extracción"
   - Tabla de procesos (puede estar vacía)
   - Sección de documentos generados

**Resultado esperado**: Página carga sin errores

## Test 3: Ejecutar extracción (modo test)

1. En `/admin/etl`, click en "Ejecutar Extracción"
2. Esperar 30-60 segundos (procesa 10 asignaturas)
3. Verificar que:
   - Mensaje de éxito aparece
   - Tabla de procesos muestra nuevo registro
   - Estado = "Completado"
   - Aparece nuevo documento en sección inferior

**Resultado esperado**: 
- Proceso completado exitosamente
- CSV generado y visible
- Link de descarga funcional

## Test 4: Verificar CSV generado

1. Descargar CSV desde interfaz
2. Abrir con Excel/LibreOffice/VSCode
3. Verificar:
   - Encoding UTF-8 (caracteres especiales se ven bien)
   - Separador: punto y coma (`;`)
   - Headers correctos (11 columnas)
   - Datos en cada fila
   - Columna "Priorización" tiene valores 0 o 1

**Ejemplo de contenido esperado**:
```csv
Asignatura;OA;Eje;Objetivo de aprendizaje;Actividad comp. 1;URL Act. 1;Actividad comp. 2;URL Act. 2;Actividad comp. 3;URL Act. 3;Priorización
Artes Visuales;AR01 OA 01;Expresar y crear visualmente;...;La luna en el arte;https://...;;;;1
```

## Test 5: Revisar detalles del proceso

1. En tabla de procesos, click en ícono de ojo 👁️
2. Modal se abre con detalles
3. Verificar:
   - Información completa del proceso
   - Logs visibles (si hay)
   - Métricas: registros totales, exitosos, fallidos
   - Duración del proceso
   - Archivos generados con link de descarga

**Resultado esperado**: Modal muestra toda la información correctamente

## Test 6: Verificar Storage

```sql
-- Verificar bucket existe
SELECT name, public, file_size_limit 
FROM storage.buckets 
WHERE name = 'documentos-transformados';

-- Verificar archivo en storage
SELECT name, metadata->>'size', created_at 
FROM storage.objects 
WHERE bucket_id = 'documentos-transformados'
ORDER BY created_at DESC 
LIMIT 5;
```

**Resultado esperado**:
- Bucket existe y es privado
- Archivos CSV presentes con tamaño > 0

## Test 7: Verificar URLs firmadas

1. Copiar URL de descarga de un documento
2. Abrir en navegador (sin autenticación)
3. Verificar que archivo descarga correctamente
4. Intentar cambiar parámetros de URL (token, path)
5. Verificar que falla (401 o 403)

**Resultado esperado**:
- URL firmada funciona
- URL manipulada falla

## Test 8: Permisos RLS

```sql
-- Como usuario NO admin, intentar leer procesos
SET ROLE anon;
SELECT * FROM procesos_etl;
-- Debería fallar o retornar 0 filas

-- Como admin
SET ROLE authenticated;
-- Simular ser usuario admin
SELECT * FROM procesos_etl;
-- Debería funcionar si el usuario tiene role='admin'
```

**Resultado esperado**: RLS protege los datos

## Test 9: Manejo de errores

1. Desconectar internet o bloquear curriculumnacional.cl
2. Ejecutar extracción
3. Verificar que:
   - Proceso se marca como "error"
   - Error se registra en tabla
   - Mensaje de error se muestra al usuario
   - No se genera CSV corrupto

**Resultado esperado**: Error manejado gracefully

## Test 10: Carga completa (Opcional)

⚠️ **ADVERTENCIA**: Este test tarda ~10-20 minutos

1. Editar `extraer-bases-curriculares/index.ts`
2. Cambiar línea 340: remover `.slice(0, 10)`
   ```typescript
   for (const asig of asignaturas) { // Sin límite
   ```
3. Re-desplegar función
4. Ejecutar extracción
5. Verificar:
   - Procesa TODAS las asignaturas (60+)
   - CSV con cientos de objetivos
   - Tiempo total ~10-20 minutos
   - Sin timeouts

**Resultado esperado**: 
- Proceso completa sin timeout
- CSV con ~500-1000 objetivos
- Tamaño ~100-500 KB

## Troubleshooting

### Error: "No autorizado"
```sql
-- Verificar rol del usuario
SELECT id, email, role FROM profiles WHERE id = '[user-id]';
-- Debe tener role = 'admin'
```

### Error: "Bucket no existe"
```sql
-- Crear bucket manualmente
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos-transformados', 'documentos-transformados', false);
```

### Error: "Function timeout"
- Verificar límite de 10 asignaturas está activo (línea 340)
- Si persiste, revisar logs de Supabase

### CSV con caracteres raros
- Verificar que el editor/Excel usa UTF-8
- En Excel: Datos → Desde texto → UTF-8

## Métricas de éxito

| Métrica | Valor esperado |
|---------|----------------|
| Tiempo de extracción (10 asig) | 30-60 segundos |
| Tiempo de extracción (completa) | 10-20 minutos |
| Objetivos extraídos | 50-100 (test), 500-1000 (completo) |
| Tamaño CSV | 10-50 KB (test), 100-500 KB (completo) |
| Tasa de éxito | > 95% |
| Errores de red | < 5% con reintentos |

## Checklist de Validación

- [ ] Migración SQL aplicada correctamente
- [ ] Edge Function desplegada y accesible
- [ ] Interfaz `/admin/etl` carga sin errores
- [ ] Botón de ejecución funciona
- [ ] CSV se genera con formato correcto
- [ ] URLs de descarga funcionan
- [ ] Storage tiene bucket y archivos
- [ ] RLS protege las tablas
- [ ] Logs se registran correctamente
- [ ] Modal de detalles muestra información
- [ ] Manejo de errores funciona
- [ ] Permisos de admin se validan

## Reporte de Bugs

Si encuentras algún bug, reportar con:
1. Pasos para reproducir
2. Resultado esperado vs obtenido
3. Logs de consola (si hay)
4. Screenshot de error
5. Estado de la BD (query relevante)
