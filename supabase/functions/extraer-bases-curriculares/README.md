# Edge Function: Extraer Bases Curriculares

Esta Edge Function extrae las Bases Curriculares de 1° a 6° Básico desde el sitio oficial del Ministerio de Educación de Chile (curriculumnacional.cl).

## 🎯 Objetivo

Realizar scraping automatizado de:
- Objetivos de Aprendizaje (OA)
- Ejes curriculares
- Actividades complementarias (hasta 4 por OA)
- Indicadores de priorización

Generando archivos en formato **CSV** y **JSON**.

## 📁 Formatos de Salida

### CSV
Formato compatible con hojas de cálculo, con las siguientes columnas:

```
Asignatura;OA;Eje;Objetivo de Aprendizaje;Actividad 1;URL Actividad 1;Actividad 2;URL Actividad 2;Actividad 3;URL Actividad 3;Actividad 4;URL Actividad 4;Priorizado
```

**Ejemplo:**
```csv
Artes Visuales;AR01 OA 01;Expresar y crear visualmente;Expresar y crear trabajos de arte...;La luna en el arte;https://...;Proyecto interdisciplinario...;https://...;;;1
```

### JSON
Formato estructurado para APIs y procesamiento automatizado:

```json
{
  "metadata": {
    "titulo": "Bases Curriculares 1° a 6° Básico - Ministerio de Educación de Chile",
    "fuente": "https://www.curriculumnacional.cl",
    "fecha_extraccion": "2026-01-16T12:00:00.000Z",
    "total_objetivos": 500,
    "objetivos_priorizados": 250
  },
  "objetivos": [
    {
      "asignatura": "Artes Visuales",
      "codigo": "AR01 OA 01",
      "eje": "Expresar y crear visualmente",
      "objetivo": "Expresar y crear trabajos de arte...",
      "actividades": [
        {
          "titulo": "La luna en el arte",
          "url": "https://www.curriculumnacional.cl/recursos/archivo/La-luna-en-el-arte"
        }
      ],
      "priorizado": true,
      "metadata": {
        "nivel": "1° Básico",
        "curso": "1° Básico",
        "fecha_extraccion": "2026-01-16T12:00:00.000Z"
      }
    }
  ]
}
```

## 🚀 Uso

### Despliegue en Supabase

```bash
# 1. Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# 2. Iniciar sesión
supabase login

# 3. Link al proyecto
supabase link --project-ref TU_PROJECT_REF

# 4. Desplegar función
supabase functions deploy extraer-bases-curriculares
```

### Invocar desde cliente

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Invocar función
const { data, error } = await supabase.functions.invoke('extraer-bases-curriculares', {
  body: { force: false }
})

if (error) {
  console.error('Error:', error)
} else {
  console.log('Proceso completado:', data)
  console.log('Archivos generados:', data.archivos)
  console.log('Estadísticas:', data.estadisticas)
}
```

### Respuesta

```json
{
  "success": true,
  "proceso_id": "550e8400-e29b-41d4-a716-446655440000",
  "archivos": [
    {
      "nombre": "bases_curriculares_1_a_6_basico_2026-01-16.csv",
      "path": "bases-curriculares/bases_curriculares_1_a_6_basico_2026-01-16.csv",
      "size": 524288,
      "url": "https://....supabase.co/storage/v1/object/sign/...",
      "formato": "csv"
    },
    {
      "nombre": "bases_curriculares_1_a_6_basico_2026-01-16.json",
      "path": "bases-curriculares/bases_curriculares_1_a_6_basico_2026-01-16.json",
      "size": 1048576,
      "url": "https://....supabase.co/storage/v1/object/sign/...",
      "formato": "json"
    }
  ],
  "estadisticas": {
    "asignaturas_procesadas": 48,
    "total_objetivos": 500,
    "objetivos_priorizados": 250,
    "duracion_ms": 120000
  }
}
```

## ⚙️ Configuración

En `index.ts`, sección `CONFIG`:

```typescript
const CONFIG = {
  BASE_URL: 'https://www.curriculumnacional.cl',
  START_URL: 'https://www.curriculumnacional.cl/curriculum/1o-6o-basico/',
  DELAY_BETWEEN_REQUESTS: 500, // Rate limiting (ms)
  MAX_RETRIES: 3, // Reintentos en caso de error
  USER_AGENT: 'Mozilla/5.0 (compatible; ProfeFlow-Bot/1.0; +https://profeflow.cl)',

  // IMPORTANTE: Configurar según ambiente
  MAX_ASIGNATURAS: 0, // 0 = PRODUCCIÓN (todas), >0 = TEST (limitar cantidad)

  // Formatos de salida
  GENERAR_CSV: true,
  GENERAR_JSON: true,
}
```

### Modo TEST vs PRODUCCIÓN

**TEST (desarrollo):**
```typescript
MAX_ASIGNATURAS: 10, // Solo procesar 10 asignaturas
```

**PRODUCCIÓN:**
```typescript
MAX_ASIGNATURAS: 0, // Procesar todas las asignaturas
```

## 🔧 Características Técnicas

### ✅ Validaciones Implementadas

1. **Validación de códigos OA**: Verifica formato `XX## OA ##` (ej: "AR01 OA 01")
2. **Validación de URLs**: Verifica que las URLs sean válidas antes de almacenar
3. **Limpieza de texto**: Elimina espacios múltiples y caracteres especiales
4. **Escape CSV**: Maneja correctamente punto y coma, comillas y saltos de línea

### 🔄 Manejo de Errores

- **Retry automático**: Hasta 3 intentos con backoff exponencial
- **Rate limiting**: 500ms entre requests para no sobrecargar el servidor
- **Logging detallado**: Registra cada paso en la tabla `proceso_etl_logs`
- **Errores parciales**: Continúa procesando aunque falle una asignatura

### 🏗️ Soporte Multi-Estructura

La función soporta **2 estructuras HTML** diferentes del sitio:

**TIPO A** (1°-6° básico):
- `.oa-cnt`: Contenedor de OA
- `.oa-numero`: Código del OA
- `.oa-eje`: Eje curricular
- `.oa-descripcion`: Descripción del objetivo
- `.oa-basal`: Indicador de priorización

**TIPO B** (otros niveles):
- `.items-wrapper`: Contenedor de ejes
- `.item-wrapper`: Contenedor de OA
- `.oa-title`: Título del OA
- `.field__item`: Descripción
- `.prioritized`: Indicador de priorización

### 📦 Almacenamiento

Los archivos se almacenan en Supabase Storage:

- **Bucket**: `documentos-transformados`
- **Path**: `bases-curriculares/bases_curriculares_1_a_6_basico_YYYY-MM-DD.{csv,json}`
- **Acceso**: URLs firmadas válidas por 1 año
- **Registro**: Se registra en la tabla `documentos_transformados`

## 📊 Monitoreo

La función registra métricas en las siguientes tablas:

1. **`procesos_etl`**: Información general del proceso
   - Estado: `en_progreso`, `completado`, `error`
   - Timestamps de inicio/fin
   - Configuración utilizada

2. **`proceso_etl_logs`**: Logs detallados
   - Cada paso del proceso
   - Asignaturas procesadas
   - Errores encontrados

3. **`documentos_transformados`**: Archivos generados
   - Metadata del documento
   - URL de descarga
   - Estadísticas de contenido

## 🛡️ Seguridad

- **Autenticación**: Requiere Service Role Key para operaciones administrativas
- **Validación de entrada**: Sanitiza todos los datos extraídos
- **Rate limiting**: Evita sobrecarga del servidor origen
- **Storage privado**: Archivos no son públicos, requieren URL firmada

## 🐛 Troubleshooting

### Error: "No se encontraron asignaturas"
- Verificar que `START_URL` sea correcta
- Verificar conectividad a curriculumnacional.cl
- Revisar si cambió la estructura HTML del sitio

### Error: "No se pudieron extraer actividades"
- Las actividades son opcionales, no bloquea el proceso
- Revisar logs para ver qué OAs no tienen actividades
- Verificar URLs de detalle de OA

### Error: "HTTP 429: Too Many Requests"
- Aumentar `DELAY_BETWEEN_REQUESTS` en CONFIG
- Reducir número de asignaturas en modo test

### Error: "Timeout"
- La función puede tardar varios minutos (modo producción: ~2-5 min)
- Verificar límites de timeout en Supabase (ajustar si es necesario)

## 📝 Cambios vs Versión Original

### ✅ Correcciones Implementadas

1. **✨ NUEVO: Generación de JSON** además de CSV
2. **✅ Headers CSV ajustados** al formato del ejemplo proporcionado
3. **✅ Modo PRODUCCIÓN activado** (`MAX_ASIGNATURAS: 0`)
4. **✅ Validaciones robustas** de códigos OA y URLs
5. **✅ Múltiples selectores para actividades** con fallbacks
6. **✅ Mejor manejo de errores** parciales

### 📋 Formato CSV Actualizado

**Antes:**
```
Nivel;Curso;Asignatura;OA;Eje/Núcleo;Objetivo de aprendizaje;Actividad comp. 1;URL Act. 1;...
```

**Ahora:**
```
Asignatura;OA;Eje;Objetivo de Aprendizaje;Actividad 1;URL Actividad 1;Actividad 2;URL Actividad 2;...
```

## 📚 Dependencias

- Deno Standard Library (HTTP server)
- Supabase JS Client (@supabase/supabase-js@2.39.3)
- Módulo compartido: `../shared/service-auth.ts`

## 📄 Licencia

Este código es parte del proyecto Educa-IA y está sujeto a la licencia del proyecto principal.

## 👥 Soporte

Para reportar problemas o sugerencias:
1. Crear issue en el repositorio
2. Revisar logs en Supabase Dashboard → Edge Functions
3. Consultar tabla `proceso_etl_logs` para debugging detallado
