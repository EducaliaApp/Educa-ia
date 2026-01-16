# Sistema de ETL y Monitoreo - Admin Panel

## Descripción General

El sistema de ETL (Extract, Transform, Load) de ProfeFlow permite extraer, transformar y cargar datos maestros desde fuentes oficiales del MINEDUC. Este documento describe la arquitectura, funcionalidades y mejores prácticas del sistema.

## Funcionalidades Principales

### 1. Vista Admin/ETL (`/admin/etl`)

La vista principal del sistema ETL proporciona:

- **Ejecución Manual de Procesos**: Botón para ejecutar extracción de bases curriculares
- **Estadísticas en Tiempo Real**: Métricas agregadas de procesos ejecutados
- **Historial de Ejecuciones**: Tabla con filtros avanzados y paginación
- **Visualización de Logs**: Modal dedicado para revisar logs detallados
- **Gráficos de Tendencias**: Visualización de procesos por fecha

### 2. Componentes Principales

#### **MetricsCard**
Muestra métricas clave con iconos y tendencias:
- Total de procesos
- Tasa de éxito
- Registros procesados
- Documentos generados

#### **ETLStatsChart**
Gráficos visuales que muestran:
- Procesos completados vs errores por día
- Registros procesados por día
- Tendencias y promedios

#### **ETLProcessTable**
Tabla avanzada con:
- Filtros por estado, tipo y búsqueda
- Paginación (10 items por página)
- Acciones: Ver Logs, Ver Detalles, Descargar
- Indicadores visuales de progreso (barras de éxito)

#### **ETLLogsViewer**
Modal completo para visualización de logs:
- Filtros por nivel (info, warning, error, success)
- Búsqueda en logs
- Copiar logs individuales o todos
- Descargar logs como archivo .txt
- Visualización de errores destacados

## Arquitectura

### Base de Datos

#### Tabla: `procesos_etl`
```sql
CREATE TABLE procesos_etl (
    id UUID PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    tipo_proceso VARCHAR(50) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(50) DEFAULT 'pendiente',
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    duracion_ms BIGINT,
    total_registros INTEGER DEFAULT 0,
    registros_exitosos INTEGER DEFAULT 0,
    registros_fallidos INTEGER DEFAULT 0,
    archivos_generados JSONB DEFAULT '[]',
    logs TEXT[],
    errores JSONB DEFAULT '[]',
    configuracion JSONB DEFAULT '{}',
    ejecutado_por UUID REFERENCES profiles(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Estados posibles:**
- `pendiente`: Proceso creado pero no iniciado
- `en_progreso`: Proceso ejecutándose actualmente
- `completado`: Proceso finalizado exitosamente
- `error`: Proceso finalizado con errores
- `cancelado`: Proceso cancelado manualmente

#### Tabla: `documentos_transformados`
```sql
CREATE TABLE documentos_transformados (
    id UUID PRIMARY KEY,
    proceso_etl_id UUID REFERENCES procesos_etl(id) ON DELETE CASCADE,
    nombre_archivo VARCHAR(500) NOT NULL,
    tipo_documento VARCHAR(100) NOT NULL,
    formato VARCHAR(20) NOT NULL,
    storage_bucket VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    tamaño_bytes BIGINT,
    url_descarga TEXT,
    num_registros INTEGER,
    columnas TEXT[],
    resumen_contenido JSONB DEFAULT '{}',
    version VARCHAR(50),
    es_version_actual BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RPC Functions

#### `estadisticas_procesos_etl()`
Retorna estadísticas generales:
```json
{
  "total_procesos": 50,
  "procesos_completados": 45,
  "procesos_en_progreso": 1,
  "procesos_error": 4,
  "tasa_exito": 91.8,
  "total_registros_procesados": 15000,
  "duracion_promedio_ms": 120000,
  "total_documentos_generados": 90
}
```

#### `obtener_historial_procesos_etl(...)`
Parámetros:
- `p_estado`: Filtrar por estado
- `p_tipo_proceso`: Filtrar por tipo
- `p_fecha_desde`: Fecha inicio
- `p_fecha_hasta`: Fecha fin
- `p_limite`: Número de resultados (max: 100)
- `p_offset`: Offset para paginación

#### `obtener_detalle_proceso_etl(p_proceso_id UUID)`
Retorna detalles completos incluyendo:
- Datos del proceso
- Documentos generados
- Logs parseados con timestamps
- Estadísticas calculadas

#### `estadisticas_procesos_por_fecha(p_dias INTEGER)`
Retorna estadísticas agrupadas por fecha para los últimos N días.

### API Routes

#### `POST /api/admin/etl/ejecutar`
Ejecuta un proceso ETL.

**Request:**
```json
{
  "proceso": "extraer_bases_curriculares",
  "config": {
    "force": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "proceso": "extraer_bases_curriculares",
  "resultado": {
    "proceso_id": "uuid",
    "estadisticas": {
      "asignaturas_procesadas": 48,
      "total_objetivos": 500,
      "duracion_ms": 120000
    }
  }
}
```

#### `GET /api/admin/etl/historial`
Obtiene historial de procesos con filtros.

**Query Params:**
- `estado`: Filtrar por estado
- `tipo_proceso`: Filtrar por tipo
- `fecha_desde`: ISO 8601
- `fecha_hasta`: ISO 8601
- `limite`: max 100 (default: 50)
- `offset`: default 0

#### `GET /api/admin/etl/estadisticas`
Obtiene estadísticas completas.

**Query Params:**
- `dias`: Número de días para estadísticas (default: 30)

### Edge Functions

#### `extraer-bases-curriculares`
Extrae objetivos de aprendizaje desde curriculumnacional.cl.

**Flujo:**
1. Crear proceso ETL con estado `en_progreso`
2. Obtener página principal
3. Extraer links de asignaturas y cursos
4. Para cada asignatura:
   - Extraer objetivos de aprendizaje
   - Extraer actividades complementarias
   - Insertar en `objetivos_aprendizaje` (upsert)
5. Generar archivos CSV y JSON
6. Subir a Supabase Storage
7. Registrar en `documentos_transformados`
8. Finalizar proceso con estado `completado` o `error`

**Logging:**
- Cada paso importante se registra en `procesos_etl.logs`
- Errores se almacenan en `procesos_etl.errores`

## Flujo de Trabajo

### Ejecución Manual

1. Usuario admin accede a `/admin/etl`
2. Presiona botón "Ejecutar Extracción"
3. Frontend llama a `/api/admin/etl/ejecutar`
4. API verifica permisos y llama a Edge Function
5. Edge Function ejecuta el proceso y retorna resultado
6. Frontend recarga datos y muestra mensaje de éxito/error

### Monitoreo de Progreso

1. Durante la ejecución, los logs se van agregando a la base de datos
2. Usuario puede refrescar la vista para ver progreso
3. Si el proceso está `en_progreso`, se muestra indicador visual
4. Al finalizar, el estado cambia a `completado` o `error`

### Revisión de Logs

1. Usuario hace clic en botón "Ver Logs" de un proceso
2. Se abre modal `ETLLogsViewer`
3. Logs se muestran con formato y colores según nivel
4. Usuario puede filtrar, buscar, copiar o descargar

## Mejores Prácticas

### Para Desarrolladores

1. **Logging Detallado**: Siempre agregar logs en puntos clave del proceso
   ```typescript
   await supabase.rpc('agregar_log_proceso_etl', {
     p_proceso_id: procesoId,
     p_mensaje: 'Descripción clara del paso actual',
   })
   ```

2. **Manejo de Errores**: Capturar errores y registrarlos
   ```typescript
   try {
     // operación
   } catch (error) {
     await supabase.rpc('agregar_log_proceso_etl', {
       p_proceso_id: procesoId,
       p_mensaje: `❌ Error: ${error.message}`,
     })
   }
   ```

3. **Finalizar Siempre**: Asegurar que el proceso se finalice
   ```typescript
   await supabase.rpc('finalizar_proceso_etl', {
     p_proceso_id: procesoId,
     p_estado: 'completado',
     p_total_registros: totalRegistros,
     p_registros_exitosos: exitosos,
     p_registros_fallidos: fallidos,
   })
   ```

4. **Tracking de Métricas**: Registrar métricas importantes
   - Duración de pasos individuales
   - Cantidad de registros procesados
   - Tasa de éxito/fallo
   - Archivos generados

### Para Administradores

1. **Monitoreo Regular**: Revisar vista ETL diariamente
2. **Atención a Errores**: Investigar procesos con estado `error`
3. **Revisión de Logs**: Usar logs para debugging y optimización
4. **Documentación**: Documentar problemas recurrentes y soluciones

## Seguridad

- **RLS (Row Level Security)**: Solo admins pueden acceder a procesos ETL
- **Autenticación**: Todas las APIs verifican rol de admin
- **SECURITY DEFINER**: RPC functions usan `SECURITY DEFINER` para bypass RLS desde Edge Functions
- **Grants Explícitos**: Solo usuarios autenticados pueden ejecutar RPCs

## Extensibilidad

### Agregar Nuevo Proceso ETL

1. Crear Edge Function en `supabase/functions/[nombre-proceso]/`
2. Implementar patrón de logging y tracking
3. Agregar a `funcionesDisponibles` en `/api/admin/etl/ejecutar/route.ts`
4. Actualizar UI en `/app/admin/etl/page.tsx` si es necesario

### Ejemplo:
```typescript
// supabase/functions/nuevo-proceso/index.ts
export async function handler(req: Request): Promise<Response> {
  const supabase = crearClienteServicio(req)

  // 1. Crear proceso
  const { data: procesoId } = await supabase.rpc('iniciar_proceso_etl', {
    p_nombre: 'nuevo_proceso',
    p_tipo_proceso: 'extraccion',
    p_descripcion: 'Descripción del proceso',
  })

  try {
    // 2. Ejecutar lógica
    await supabase.rpc('agregar_log_proceso_etl', {
      p_proceso_id: procesoId,
      p_mensaje: 'Iniciando proceso...',
    })

    // ... lógica del proceso ...

    // 3. Finalizar
    await supabase.rpc('finalizar_proceso_etl', {
      p_proceso_id: procesoId,
      p_estado: 'completado',
      p_total_registros: total,
      p_registros_exitosos: exitosos,
    })

    return new Response(JSON.stringify({ success: true }))
  } catch (error) {
    await supabase.rpc('finalizar_proceso_etl', {
      p_proceso_id: procesoId,
      p_estado: 'error',
      p_errores: JSON.stringify([{ mensaje: error.message }]),
    })
    throw error
  }
}
```

## Troubleshooting

### Problema: No se ven estadísticas

**Solución:**
1. Verificar que existan procesos en `procesos_etl`
2. Verificar permisos RLS
3. Revisar consola del navegador para errores de API
4. Verificar que las RPC functions estén creadas (ejecutar migración)

### Problema: Error al ejecutar extracción

**Solución:**
1. Verificar que la Edge Function esté deployada
2. Verificar secrets (OPENAI_API_KEY, etc.) en Supabase
3. Revisar logs de la Edge Function en Supabase Dashboard
4. Verificar conectividad a curriculumnacional.cl

### Problema: Logs no se muestran

**Solución:**
1. Verificar que el array `logs` no esté null en la base de datos
2. Verificar que el formato de logs incluya timestamp
3. Revisar que la RPC `agregar_log_proceso_etl` esté funcionando

## Recursos Adicionales

- [Documentación de Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentación de RPC Functions](https://supabase.com/docs/guides/database/functions)
- [Currículum Nacional Chile](https://www.curriculumnacional.cl)

## Changelog

### 2026-01-16
- ✅ Creado sistema completo de ETL con monitoreo
- ✅ Agregadas RPC functions para estadísticas
- ✅ Creados componentes: ETLStatsChart, ETLProcessTable, ETLLogsViewer
- ✅ Implementadas APIs: /ejecutar, /historial, /estadisticas
- ✅ Refactorizada vista admin/etl
- ✅ Documentación completa del sistema
