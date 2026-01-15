# Sistema ETL - Bases Curriculares MINEDUC

## Descripción

Sistema de extracción, transformación y carga (ETL) para obtener objetivos de aprendizaje desde el sitio oficial del Ministerio de Educación de Chile (curriculumnacional.cl).

## Componentes

### 1. Edge Function: `extraer-bases-curriculares`

**Ubicación**: `supabase/functions/extraer-bases-curriculares/index.ts`

**Funcionalidad**:
- Extrae objetivos de aprendizaje de 1° a 6° básico
- Obtiene información de todas las asignaturas disponibles
- Identifica priorización (Basal = 1, otros = 0)
- Extrae actividades complementarias con sus URLs
- Genera CSV con formato UTF-8, separador `;`

**Columnas del CSV generado**:
```
Asignatura;OA;Eje;Objetivo de aprendizaje;Actividad comp. 1;URL Act. 1;Actividad comp. 2;URL Act. 2;Actividad comp. 3;URL Act. 3;Priorización
```

**Ejemplo de ejecución**:
```bash
curl -X POST \
  https://[tu-proyecto].supabase.co/functions/v1/extraer-bases-curriculares \
  -H "Authorization: Bearer [tu-token]" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'
```

### 2. Base de Datos

**Migración**: `supabase/migrations/20250115_procesos_etl.sql`

**Tablas creadas**:

#### `procesos_etl`
Registro de todos los procesos ETL ejecutados:
- Estado de ejecución (pendiente, en_progreso, completado, error)
- Métricas (registros procesados, duración, etc.)
- Logs y errores
- Archivos generados

#### `documentos_transformados`
Documentos CSV/JSON generados por los procesos:
- Información del archivo (nombre, tamaño, formato)
- URL de descarga firmada
- Metadatos del contenido
- Versionado

**Funciones RPC**:
- `iniciar_proceso_etl()`: Crea un nuevo registro de proceso
- `finalizar_proceso_etl()`: Marca proceso como completado/error
- `agregar_log_proceso_etl()`: Agrega mensajes de log durante ejecución

### 3. Interfaz de Administración

**Ubicación**: `/admin/etl`

**Características**:
- ✅ Dashboard con estadísticas de procesos
- ✅ Lista de procesos recientes con filtros
- ✅ Botón para ejecutar extracción manual
- ✅ Visualización de logs en tiempo real
- ✅ Descarga de documentos generados
- ✅ Modal con detalles completos de cada proceso

**Acceso**: Solo usuarios con rol `admin`

## Flujo de Ejecución

1. **Usuario admin** accede a `/admin/etl`
2. Hace clic en "Ejecutar Extracción"
3. El sistema:
   - Crea registro en `procesos_etl` con estado `en_progreso`
   - Inicia scraping de curriculumnacional.cl
   - Por cada asignatura:
     - Extrae objetivos de aprendizaje
     - Obtiene actividades complementarias
     - Registra logs del progreso
   - Genera CSV con todos los datos
   - Sube archivo a Storage (`documentos-transformados/bases-curriculares/`)
   - Registra documento en `documentos_transformados`
   - Marca proceso como `completado` o `error`
4. **Usuario** puede:
   - Ver progreso en tiempo real
   - Descargar CSV generado
   - Revisar logs y métricas

## Almacenamiento

**Bucket de Supabase Storage**: `documentos-transformados`

**Estructura de directorios**:
```
documentos-transformados/
├── bases-curriculares/
│   ├── bases_curriculares_1_a_6_basico_con_actividades_2025-01-15.csv
│   ├── bases_curriculares_1_a_6_basico_con_actividades_2025-01-16.csv
│   └── ...
└── [otros-tipos-de-documentos]/
```

**Permisos**:
- Bucket privado (no público)
- URLs firmadas con validez de 1 año
- Solo admin puede subir archivos
- Usuarios autenticados pueden descargar (si se les comparte el link)

## Formato del CSV

**Encoding**: UTF-8 con BOM
**Separador**: Punto y coma (`;`)
**Escapado**: Campos con `;`, `"` o saltos de línea se envuelven en comillas dobles

**Ejemplo**:
```csv
Asignatura;OA;Eje;Objetivo de aprendizaje;Actividad comp. 1;URL Act. 1;Actividad comp. 2;URL Act. 2;Actividad comp. 3;URL Act. 3;Priorización
Artes Visuales;AR01 OA 01;Expresar y crear visualmente;"Expresar y crear trabajos de arte a partir de la observación del entorno natural: paisaje, animales y plantas";La luna en el arte;https://www.curriculumnacional.cl/recursos/la-luna-en-el-arte;;;;1
Matemática;MA01 OA 01;Números y operaciones;Contar números del 0 al 100 de 1 en 1;Ficha N° 1 Movimiento en 15';https://www.curriculumnacional.cl/recursos/ficha-1;Ficha N° 8 Movimiento en 15';https://www.curriculumnacional.cl/recursos/ficha-8;;0
```

## Configuración

### Variables de Entorno

Asegúrate de tener configuradas:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[tu-proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[tu-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[tu-service-role-key]
```

### Rate Limiting

La Edge Function implementa rate limiting para no sobrecargar el sitio del MINEDUC:
- Delay entre requests: 500ms
- Max reintentos: 3
- Backoff exponencial en caso de error

## Extensibilidad

El sistema está diseñado para ser extensible. Para agregar nuevos procesos ETL:

1. **Crear nueva Edge Function** en `supabase/functions/`
2. **Usar las funciones RPC** existentes:
   ```typescript
   // Iniciar proceso
   const procesoId = await supabase.rpc('iniciar_proceso_etl', {
     p_nombre: 'mi_nuevo_proceso',
     p_tipo_proceso: 'extraccion',
     p_descripcion: 'Descripción del proceso'
   })
   
   // Agregar logs
   await supabase.rpc('agregar_log_proceso_etl', {
     p_proceso_id: procesoId,
     p_mensaje: 'Mensaje de log'
   })
   
   // Finalizar proceso
   await supabase.rpc('finalizar_proceso_etl', {
     p_proceso_id: procesoId,
     p_estado: 'completado',
     p_total_registros: 100
   })
   ```

3. **Registrar documentos** generados en `documentos_transformados`
4. **Agregar botón** en `/admin/etl` para ejecutar el nuevo proceso

## Monitoreo

### Logs
- Logs de ejecución se guardan en tabla `procesos_etl.logs`
- Errores se registran en `procesos_etl.errores` con stack trace
- Visible en modal de detalles del proceso

### Métricas
- Total de registros procesados
- Registros exitosos vs fallidos
- Duración total (ms)
- Tasa de éxito (%)

### Alertas
- Sistema puede notificar a admins sobre errores (feature futura)
- Integración con sistema de notificaciones existente

## Seguridad

✅ **Autenticación**: Solo usuarios autenticados con rol `admin`
✅ **RLS (Row Level Security)**: Políticas en tablas para acceso admin-only
✅ **Service Role**: Edge Function usa service role para escribir sin RLS
✅ **URLs Firmadas**: Storage privado con URLs temporales
✅ **Rate Limiting**: Previene sobrecarga del sitio fuente
✅ **Validación**: Validación de datos antes de insertar en BD

## Troubleshooting

### Problema: "No autorizado" al ejecutar extracción
**Solución**: Verificar que el usuario tiene rol `admin` en tabla `profiles`

### Problema: Edge Function timeout
**Solución**: La función tiene límite de 10 asignaturas en modo test. Para producción, quitar el `.slice(0, 10)` en línea 340

### Problema: CSV con caracteres raros
**Solución**: Asegurar que el archivo se descarga y abre con encoding UTF-8

### Problema: Bucket no existe
**Solución**: La función crea el bucket automáticamente, pero verificar permisos de service role

## Mantenimiento

### Limpieza de datos antiguos
Ejecutar periódicamente:
```sql
-- Eliminar procesos antiguos (>90 días)
DELETE FROM procesos_etl 
WHERE created_at < NOW() - INTERVAL '90 days'
  AND estado IN ('completado', 'cancelado');

-- Eliminar documentos viejos (>1 año)
DELETE FROM documentos_transformados
WHERE created_at < NOW() - INTERVAL '1 year'
  AND es_version_actual = false;
```

### Actualización de selectores
Si el sitio curriculumnacional.cl cambia su estructura HTML:
1. Revisar patrones regex en `extraer-bases-curriculares/index.ts`
2. Actualizar funciones `extraerObjetivos()` y `extraerActividades()`
3. Probar con página de test antes de ejecutar completo

## Roadmap

- [ ] Extracción automática programada (cron job)
- [ ] Notificaciones a admins cuando hay nuevos OAs
- [ ] Comparación de versiones (diff entre CSVs)
- [ ] Export a otros formatos (JSON, Excel, PDF)
- [ ] Integración con sistema de planificaciones
- [ ] API REST para consultar OAs extraídos
- [ ] Dashboard de análisis de Bases Curriculares
