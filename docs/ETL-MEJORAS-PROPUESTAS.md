# Análisis y Mejoras - Función Extraer Bases Curriculares

## 📋 Análisis del Estado Actual

### ✅ Funcionalidades Ya Implementadas

1. **Población de la tabla `objetivos_aprendizaje`**: ✅ **SÍ está implementada**
   - Ubicación: Líneas 913-977
   - Método: Upsert directo a la tabla
   - Conflict key: `(codigo, categoria, nivel, version)`
   - Registra proceso_etl_id para trazabilidad

2. **Generación de archivos CSV y JSON**: ✅ **SÍ está implementada**
   - CSV: Líneas 982-1023
   - JSON: Líneas 1028-1077
   - Sube a Supabase Storage (bucket: `documentos-transformados`)
   - Registra en tabla `documentos_transformados`

3. **Extracción de categorías**: ✅ **SÍ está implementada**
   - Función `extraerCategoriaDesdeURL()` (líneas 137-158)
   - Mapea todas las categorías curriculares del MINEDUC

### ❌ Problemas Identificados

#### 1. **Nombre de Archivos Incorrecto**

**Problema:**
```typescript
// Línea 698-701: HARDCODEADO a "1_a_6_basico"
function generarNombreArchivo(formato: 'csv' | 'json', fecha: Date = new Date()): string {
  const fechaStr = fecha.toISOString().split('T')[0]  // Solo fecha, sin hora
  return `bases_curriculares_1_a_6_basico_${fechaStr}.${formato}`  // ❌ Siempre mismo nombre
}
```

**Requerimiento:**
```
bases_curriculares_[categoria]_aaaa-mm-dd-hhmmss.csv

Ejemplo:
bases_curriculares_Educación_Básica_1°_a_6°_2026-01-16-153045.csv
```

**Impacto:**
- ❌ No diferencia entre categorías curriculares
- ❌ Sobrescribe archivos del mismo día
- ❌ No permite múltiples ejecuciones diarias

#### 2. **Sin Tracking de Cambios**

**Problema:**
```typescript
// Líneas 953-958: Siempre hace upsert, sin verificar cambios
const { error } = await supabase
  .from('objetivos_aprendizaje')
  .upsert(registro, {
    onConflict: 'codigo,categoria,nivel,version',
    ignoreDuplicates: false,  // ❌ Siempre actualiza
  })
```

**Impacto:**
- ❌ Actualiza registros sin cambios reales
- ❌ No hay registro de cuándo se actualizó cada objetivo
- ❌ No se puede auditar qué cambió y cuándo
- ❌ Genera carga innecesaria en la BD

#### 3. **No Hay Parámetro para Controlar Persistencia**

**Problema:**
- La función SIEMPRE persiste a la base de datos
- No hay opción de solo generar archivos
- No es flexible para desarrollo/testing

**Impacto:**
- ❌ Dificulta testing (siempre afecta BD)
- ❌ No permite iterar solo en la extracción
- ❌ No permite generar archivos sin afectar BD de producción

#### 4. **Falta Metadata de Última Actualización**

**Problema:**
- No hay campo `ultima_actualizacion` en la tabla
- No se registra cuándo fue la última vez que se verificó un objetivo
- No se puede saber si un objetivo está desactualizado

---

## 🎯 Propuesta de Solución

### Opción 1: Todo en Una Función (Actual)

```
[Scraping] → [Persistencia BD] → [Generación Archivos]
```

**Pros:**
- ✅ Simple
- ✅ Atómico (todo o nada)
- ✅ Fácil de entender

**Contras:**
- ❌ Mezcla responsabilidades
- ❌ Difícil de escalar
- ❌ No flexible para testing

### Opción 2: Funciones Separadas

```
Función 1: [Scraping] → [Archivos CSV/JSON]
Función 2: [Leer CSV/JSON] → [Persistencia BD]
```

**Pros:**
- ✅ Separación de responsabilidades
- ✅ Reutilizable
- ✅ Permite procesamiento asíncrono

**Contras:**
- ❌ Más complejidad
- ❌ Requiere storage intermediario
- ❌ Más difícil de debuggear

### Opción 3: Parámetro Opcional ✅ **RECOMENDADA**

```
[Scraping] → [if persist_db] → [Persistencia BD] → [Generación Archivos]
```

**Pros:**
- ✅ Flexible
- ✅ Mantiene simplicidad
- ✅ Permite control fino
- ✅ Compatible con código actual

**Contras:**
- ⚠️ Ninguno significativo

---

## 🛠️ Mejoras Propuestas

### 1. **Mejorar Generación de Nombres de Archivo**

**Implementación:**

```typescript
/**
 * Genera nombre de archivo con categoría y timestamp completo
 * Formato: bases_curriculares_[categoria]_aaaa-mm-dd-hhmmss.{formato}
 */
function generarNombreArchivo(
  formato: 'csv' | 'json',
  categoria: string,
  fecha: Date = new Date()
): string {
  // Formatear timestamp: 2026-01-16-153045
  const year = fecha.getFullYear()
  const month = String(fecha.getMonth() + 1).padStart(2, '0')
  const day = String(fecha.getDate()).padStart(2, '0')
  const hours = String(fecha.getHours()).padStart(2, '0')
  const minutes = String(fecha.getMinutes()).padStart(2, '0')
  const seconds = String(fecha.getSeconds()).padStart(2, '0')

  const timestamp = `${year}-${month}-${day}-${hours}${minutes}${seconds}`

  // Normalizar categoría para nombre de archivo
  const categoriaNormalizada = categoria
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[°]/g, '') // Eliminar símbolos de grado
    .replace(/\s+/g, '_') // Espacios a guiones bajos
    .replace(/[()]/g, '') // Eliminar paréntesis

  return `bases_curriculares_${categoriaNormalizada}_${timestamp}.${formato}`
}

// Ejemplo de uso:
// generarNombreArchivo('csv', 'Educación Básica 1° a 6°')
// → bases_curriculares_Educacion_Basica_1_a_6_2026-01-16-153045.csv
```

### 2. **Agregar Sistema de Tracking de Cambios**

**Migración de Base de Datos:**

```sql
-- Agregar campos para tracking
ALTER TABLE objetivos_aprendizaje
ADD COLUMN IF NOT EXISTS hash_contenido VARCHAR(64),
ADD COLUMN IF NOT EXISTS ultima_verificacion TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS ultima_actualizacion TIMESTAMPTZ DEFAULT NOW();

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_objetivos_ultima_verificacion
ON objetivos_aprendizaje(ultima_verificacion);

-- Comentarios
COMMENT ON COLUMN objetivos_aprendizaje.hash_contenido IS
'Hash SHA-256 del contenido para detectar cambios';
COMMENT ON COLUMN objetivos_aprendizaje.ultima_verificacion IS
'Última vez que se verificó este objetivo en el scraping';
COMMENT ON COLUMN objetivos_aprendizaje.ultima_actualizacion IS
'Última vez que se actualizó el contenido de este objetivo';
```

**Implementación en la Función:**

```typescript
/**
 * Calcula hash SHA-256 de un objetivo para detectar cambios
 */
async function calcularHashObjetivo(obj: any): Promise<string> {
  const contenido = JSON.stringify({
    codigo: obj.codigo,
    objetivo: obj.objetivo,
    eje: obj.eje,
    priorizado: obj.priorizado,
    actividades: obj.actividades,
  })

  const encoder = new TextEncoder()
  const data = encoder.encode(contenido)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verifica si un objetivo ha cambiado
 */
async function verificarCambios(
  supabase: any,
  codigo: string,
  categoria: string,
  nivel: string,
  version: string,
  nuevoHash: string
): Promise<{ cambio: boolean; registroExiste: boolean }> {
  const { data, error } = await supabase
    .from('objetivos_aprendizaje')
    .select('hash_contenido')
    .eq('codigo', codigo)
    .eq('categoria', categoria)
    .eq('nivel', nivel)
    .eq('version', version)
    .single()

  if (error || !data) {
    return { cambio: true, registroExiste: false }
  }

  return {
    cambio: data.hash_contenido !== nuevoHash,
    registroExiste: true
  }
}

// En el loop de persistencia (línea 923):
for (const obj of todosLosObjetivos) {
  try {
    // ... preparar registro ...

    // Calcular hash del contenido
    const hashContenido = await calcularHashObjetivo(registro)

    // Verificar si hay cambios
    const { cambio, registroExiste } = await verificarCambios(
      supabase,
      registro.codigo,
      registro.categoria,
      registro.nivel,
      registro.version,
      hashContenido
    )

    // Solo actualizar si hay cambios o es nuevo
    if (cambio) {
      const registroConHash = {
        ...registro,
        hash_contenido: hashContenido,
        ultima_verificacion: new Date().toISOString(),
        ultima_actualizacion: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('objetivos_aprendizaje')
        .upsert(registroConHash, {
          onConflict: 'codigo,categoria,nivel,version',
          ignoreDuplicates: false,
        })

      if (!error) {
        if (registroExiste) {
          objetivosActualizados++
        } else {
          objetivosNuevos++
        }
      }
    } else {
      // Solo actualizar timestamp de verificación
      await supabase
        .from('objetivos_aprendizaje')
        .update({ ultima_verificacion: new Date().toISOString() })
        .eq('codigo', registro.codigo)
        .eq('categoria', registro.categoria)
        .eq('nivel', registro.nivel)
        .eq('version', registro.version)

      objetivosSinCambios++
    }
  } catch (error) {
    // ...
  }
}

console.log(`✓ Resultados: ${objetivosNuevos} nuevos, ${objetivosActualizados} actualizados, ${objetivosSinCambios} sin cambios`)
```

### 3. **Agregar Parámetro `persist_db`**

**Modificar Handler:**

```typescript
export async function handler(req: Request): Promise<Response> {
  const startTime = Date.now()

  try {
    console.log('🚀 Iniciando extracción de Bases Curriculares...')

    // Autenticación
    const supabase = crearClienteServicio(req)

    // ✅ NUEVO: Obtener configuración del request
    const requestBody = await req.json().catch(() => ({}))
    const {
      force = false,
      persist_db = true,  // ✅ NUEVO: Controla si persiste a BD
      generate_files = true,  // ✅ NUEVO: Controla si genera archivos
    } = requestBody

    console.log(`📊 Configuración:`)
    console.log(`  - Modo: ${CONFIG.MAX_ASIGNATURAS > 0 ? 'TEST' : 'PRODUCCIÓN'}`)
    console.log(`  - Persistir a BD: ${persist_db ? 'SÍ' : 'NO'}`)
    console.log(`  - Generar archivos: ${generate_files ? 'SÍ' : 'NO'}`)

    // ... extracción ...

    // ✅ Persistencia condicional
    if (persist_db) {
      console.log('💾 Persistiendo objetivos en la base de datos...')
      // ... código de persistencia ...
    } else {
      console.log('⏭️  Omitiendo persistencia a base de datos (persist_db=false)')
    }

    // ✅ Generación de archivos condicional
    if (generate_files) {
      // Generar CSV y JSON
    } else {
      console.log('⏭️  Omitiendo generación de archivos (generate_files=false)')
    }

    // ...
  } catch (error) {
    // ...
  }
}
```

### 4. **Crear Vista de Estadísticas de Actualización**

**Migración SQL:**

```sql
-- Vista para estadísticas de actualización
CREATE OR REPLACE VIEW estadisticas_actualizacion_objetivos AS
SELECT
  categoria,
  COUNT(*) as total_objetivos,
  COUNT(CASE WHEN ultima_actualizacion > NOW() - INTERVAL '7 days' THEN 1 END) as actualizados_ultima_semana,
  COUNT(CASE WHEN ultima_actualizacion > NOW() - INTERVAL '30 days' THEN 1 END) as actualizados_ultimo_mes,
  COUNT(CASE WHEN ultima_verificacion > NOW() - INTERVAL '7 days' THEN 1 END) as verificados_ultima_semana,
  MAX(ultima_actualizacion) as ultima_actualizacion_categoria,
  MAX(ultima_verificacion) as ultima_verificacion_categoria
FROM objetivos_aprendizaje
GROUP BY categoria;

-- Grant para authenticated users
GRANT SELECT ON estadisticas_actualizacion_objetivos TO authenticated;
```

---

## 📊 Comparación de Enfoques

| Aspecto | Actual | Con Mejoras |
|---------|--------|-------------|
| **Nombre archivos** | `bases_curriculares_1_a_6_basico_2026-01-16.csv` | `bases_curriculares_Educacion_Basica_1_a_6_2026-01-16-153045.csv` |
| **Categorías soportadas** | Solo muestra "1 a 6 basico" | Todas las categorías MINEDUC |
| **Timestamp** | Solo fecha (día) | Fecha + hora completa |
| **Colisiones** | Posibles (mismo día) | Imposibles (precisión de segundos) |
| **Tracking cambios** | No existe | Hash SHA-256 + timestamps |
| **Actualizaciones** | Siempre actualiza | Solo si hay cambios reales |
| **Auditoría** | No disponible | `ultima_verificacion`, `ultima_actualizacion` |
| **Flexibilidad** | Siempre persiste | Parámetros `persist_db`, `generate_files` |
| **Performance** | ~1820 upserts | ~728 nuevos + ~50 actualizados + ~1042 sin cambios |
| **Testing** | Afecta BD siempre | Puede ejecutar sin afectar BD |

---

## 🎯 Plan de Implementación

### Fase 1: Mejoras Críticas ✅

1. **Migración de base de datos**
   - Agregar campos `hash_contenido`, `ultima_verificacion`, `ultima_actualizacion`
   - Crear índices
   - Crear vista de estadísticas

2. **Mejorar generación de nombres**
   - Modificar `generarNombreArchivo()`
   - Incluir categoría real
   - Timestamp completo (aaaa-mm-dd-hhmmss)

3. **Sistema de tracking**
   - Función `calcularHashObjetivo()`
   - Función `verificarCambios()`
   - Lógica de actualización condicional

### Fase 2: Mejoras de Flexibilidad ✅

4. **Parámetros opcionales**
   - `persist_db` (default: true)
   - `generate_files` (default: true)
   - Logging mejorado

5. **Estadísticas mejoradas**
   - Contador de nuevos vs actualizados vs sin cambios
   - Logs más informativos

### Fase 3: Documentación y Testing ✅

6. **Documentación**
   - Actualizar README
   - Ejemplos de uso
   - Guía de troubleshooting

7. **Testing**
   - Test con `persist_db=false`
   - Validar nombres de archivo
   - Verificar tracking de cambios

---

## 📝 Ejemplos de Uso

### Uso Normal (Producción)

```bash
# Extrae, persiste y genera archivos
POST /functions/v1/extraer-bases-curriculares
{
  "force": false
}
# persist_db=true (default)
# generate_files=true (default)
```

### Solo Generar Archivos (Testing)

```bash
# Extrae y genera archivos, NO persiste a BD
POST /functions/v1/extraer-bases-curriculares
{
  "persist_db": false,
  "generate_files": true
}
```

### Solo Persistir (Actualización Manual)

```bash
# Extrae y persiste, NO genera archivos
POST /functions/v1/extraer-bases-curriculares
{
  "persist_db": true,
  "generate_files": false
}
```

### Extracción Completa

```bash
# Todo: extrae, persiste y genera archivos
POST /functions/v1/extraer-bases-curriculares
{
  "force": false,
  "persist_db": true,
  "generate_files": true
}
```

---

## ✅ Checklist de Implementación

### Migración de Base de Datos
- [ ] Crear migración con campos nuevos
- [ ] Crear índices
- [ ] Crear vista de estadísticas
- [ ] Aplicar en desarrollo
- [ ] Validar en desarrollo
- [ ] Aplicar en producción

### Código de la Función
- [ ] Modificar `generarNombreArchivo()`
- [ ] Agregar `calcularHashObjetivo()`
- [ ] Agregar `verificarCambios()`
- [ ] Modificar loop de persistencia
- [ ] Agregar parámetros `persist_db` y `generate_files`
- [ ] Actualizar logging

### Testing
- [ ] Test con categorías diferentes
- [ ] Validar nombres de archivo
- [ ] Test de tracking de cambios
- [ ] Test con `persist_db=false`
- [ ] Test con `generate_files=false`

### Documentación
- [ ] Actualizar docs/ETL-SCRAPING-FIXES.md
- [ ] Crear docs/ETL-FILE-NAMING.md
- [ ] Actualizar docs/ADMIN-ETL.md

---

**Fecha:** 2026-01-16
**Autor:** Claude Code
**Versión:** 1.0.0
