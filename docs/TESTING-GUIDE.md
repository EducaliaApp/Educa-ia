# 🧪 Guía de Pruebas - Extracción de Bases Curriculares

Esta guía detalla cómo ejecutar pruebas exhaustivas de la función de scraping del currículum nacional.

## 📋 Tabla de Contenidos

1. [Scripts de Prueba Disponibles](#scripts-de-prueba-disponibles)
2. [Pruebas de Conectividad y URLs](#pruebas-de-conectividad-y-urls)
3. [Pruebas de Extracción de Datos](#pruebas-de-extracción-de-datos)
4. [Pruebas de Base de Datos](#pruebas-de-base-de-datos)
5. [Pruebas de Archivos CSV/JSON](#pruebas-de-archivos-csvjson)
6. [Casos Borde y Errores](#casos-borde-y-errores)
7. [Checklist de Validación](#checklist-de-validación)

---

## Scripts de Prueba Disponibles

### 1. `test-scraping-local.js` (Node.js - Sin Supabase)

Prueba la extracción de asignaturas sin necesidad de configurar Supabase.

```bash
node test-scraping-local.js
```

**Valida:**
- ✅ Conectividad a todas las URLs de categorías
- ✅ Extracción de asignaturas de cada categoría
- ✅ Detección automática de estructura HTML (Tipo 1, 2, 3)
- ✅ Identificación de categorías con problemas

**Tiempo de ejecución:** ~30 segundos

---

### 2. `test-database-validation.js` (Node.js - Requiere Supabase)

Valida los datos guardados en la base de datos Supabase.

**Configuración requerida:**
```bash
# En .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Ejecutar:**
```bash
node test-database-validation.js
```

**Valida:**
- ✅ Esquema de tabla `objetivos_aprendizaje`
- ✅ Total de objetivos extraídos
- ✅ Distribución por categoría
- ✅ Distribución por tipo (OA, OAH, OAA)
- ✅ Objetivos priorizados vs no priorizados
- ✅ Actividades complementarias
- ✅ Archivos CSV/JSON generados
- ✅ Procesos ETL ejecutados

**Tiempo de ejecución:** ~10 segundos

---

### 3. `test-scraping-complete.ts` (Deno - Requiere Supabase)

Suite completa de pruebas incluyendo invocación de Edge Function.

**Ejecutar:**
```bash
export NEXT_PUBLIC_SUPABASE_URL="https://..."
export SUPABASE_SERVICE_ROLE_KEY="..."
deno run --allow-net --allow-env test-scraping-complete.ts
```

**Valida:**
- ✅ Todo lo anterior
- ✅ Invocación de Edge Function
- ✅ Respuesta de la función
- ✅ Estadísticas de procesamiento

---

## Pruebas de Conectividad y URLs

### Test Manual 1: Verificar URLs con cURL

```bash
# Educación Parvularia
curl -I https://www.curriculumnacional.cl/curriculum/educacion-parvularia

# Educación Básica 1° a 6°
curl -I https://www.curriculumnacional.cl/curriculum/1o-6o-basico

# Educación Media 7° a 2° Medio
curl -I https://www.curriculumnacional.cl/curriculum/7o-basico-2-medio

# 3° y 4° Medio
curl -I https://www.curriculumnacional.cl/curriculum/3o-4o-medio

# Técnico Profesional
curl -I https://www.curriculumnacional.cl/curriculum/3o-4o-medio-tecnico-profesional

# Artística
curl -I https://www.curriculumnacional.cl/recursos/terminales-formacion-diferenciada-artistica-3-4-medio-0

# EPJA
curl -I https://www.curriculumnacional.cl/curriculum/bases-curriculares-educacion-personas-jovenes-adultas-epja

# Pueblos Originarios
curl -I https://www.curriculumnacional.cl/pueblos-originarios-ancestrales

# Lengua Indígena
curl -I https://www.curriculumnacional.cl/curriculum/7o-basico-2o-medio/lengua-indigena
```

**Resultado esperado:** `HTTP/2 200` para todas las URLs

---

### Test Manual 2: Verificar Estructura HTML

```bash
# Descargar HTML de una categoría
curl -s https://www.curriculumnacional.cl/curriculum/1o-6o-basico > test-basica.html

# Buscar clases clave
grep -o 'class="subject-grades"' test-basica.html | wc -l
grep -o 'class="grades-wrapper"' test-basica.html | wc -l
grep -o 'class="subject-title"' test-basica.html | wc -l
```

**Resultado esperado para 1°-6° Básico:**
- `subject-grades`: ~8 (una por asignatura)
- `grades-wrapper`: ~8
- `subject-title`: ~8

---

## Pruebas de Extracción de Datos

### Test Automatizado: Extraer Asignaturas

```bash
node test-scraping-local.js
```

**Resultados esperados:**

| Categoría | Asignaturas Esperadas | Estructura HTML |
|-----------|----------------------|-----------------|
| Educación Parvularia | 10-15 | Tipo 2 o 3 |
| Educación Básica 1° a 6° | 48 (8 asignaturas × 6 cursos) | Tipo 1 |
| Educación Media 7° a 2° Medio | 32-40 | Tipo 2 |
| 3° y 4° Medio (FG + HC) | 50-80 | Tipo 2 |
| Técnico Profesional | 20-40 | Tipo 2 o 3 |
| Artística | 10-20 | Tipo 2 o 3 |
| EPJA | 4-8 | Tipo 2 |
| Pueblos Originarios | 5-15 | Tipo 2 o 3 |
| Lengua Indígena | 4-8 | Tipo 2 |

**Total esperado:** ~180-300 asignaturas (dependiendo de la estructura del sitio)

---

### Test Manual 3: Validar Objetivos de Aprendizaje

```bash
# Extraer una asignatura específica
curl -s "https://www.curriculumnacional.cl/curriculum/1o-6o-basico/artes-visuales/1-basico" > test-artes-1basico.html

# Buscar objetivos (estructura Tipo A)
grep -o 'class="oa-cnt"' test-artes-1basico.html | wc -l

# Buscar objetivos (estructura Tipo B)
grep -o 'class="item-wrapper"' test-artes-1basico.html | wc -l
```

**Resultado esperado:** Entre 5-20 objetivos por asignatura/curso

---

## Pruebas de Base de Datos

### Test 1: Validar Inserción de Datos

```bash
node test-database-validation.js
```

**Checklist de validación:**

- [ ] Tabla `objetivos_aprendizaje` existe
- [ ] Se pueden insertar objetivos de prueba
- [ ] Total de objetivos > 0
- [ ] Existen objetivos en al menos 5 categorías diferentes
- [ ] Existen objetivos de los 3 tipos: contenido, habilidad, actitud
- [ ] Hay objetivos priorizados (priorizado = true)
- [ ] Campo `actividades` es un array JSON válido
- [ ] Campo `hash_contenido` está poblado
- [ ] `created_at` y `updated_at` tienen timestamps válidos

---

### Test 2: Consultas SQL Directas en Supabase

```sql
-- Total de objetivos
SELECT COUNT(*) as total FROM objetivos_aprendizaje;

-- Objetivos por categoría
SELECT categoria, COUNT(*) as total
FROM objetivos_aprendizaje
GROUP BY categoria
ORDER BY total DESC;

-- Objetivos por tipo
SELECT tipo_objetivo, COUNT(*) as total
FROM objetivos_aprendizaje
GROUP BY tipo_objetivo;

-- Objetivos priorizados
SELECT
  categoria,
  COUNT(*) FILTER (WHERE priorizado = true) as priorizados,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE priorizado = true) / COUNT(*), 2) as porcentaje
FROM objetivos_aprendizaje
GROUP BY categoria;

-- Objetivos con actividades
SELECT
  categoria,
  COUNT(*) FILTER (WHERE jsonb_array_length(actividades) > 0) as con_actividades,
  COUNT(*) as total
FROM objetivos_aprendizaje
GROUP BY categoria;

-- Ejemplo de objetivo completo
SELECT * FROM objetivos_aprendizaje LIMIT 1;
```

---

### Test 3: Validar Tracking de Cambios

```sql
-- Verificar que hash_contenido está calculado
SELECT
  COUNT(*) FILTER (WHERE hash_contenido IS NOT NULL) as con_hash,
  COUNT(*) FILTER (WHERE hash_contenido IS NULL) as sin_hash
FROM objetivos_aprendizaje;

-- Verificar timestamps de verificación
SELECT
  MIN(ultima_verificacion) as primera_verificacion,
  MAX(ultima_verificacion) as ultima_verificacion,
  COUNT(DISTINCT ultima_verificacion::date) as dias_diferentes
FROM objetivos_aprendizaje;
```

---

## Pruebas de Archivos CSV/JSON

### Test 1: Verificar Archivos en Storage

```sql
-- Listar archivos generados
SELECT
  nombre_archivo,
  formato,
  tamaño_bytes / 1024 as tamaño_kb,
  num_registros,
  created_at
FROM documentos_transformados
WHERE tipo_documento = 'bases_curriculares'
ORDER BY created_at DESC
LIMIT 10;
```

**Checklist:**
- [ ] Existen archivos CSV generados
- [ ] Existen archivos JSON generados
- [ ] Cada categoría tiene su par CSV + JSON
- [ ] Tamaño de archivos > 0 KB
- [ ] `num_registros` coincide con objetivos de esa categoría

---

### Test 2: Descargar y Validar CSV

```bash
# Descargar CSV desde Supabase Storage (usando URL firmada)
# La URL se obtiene de la columna `url_descarga` en documentos_transformados

# Validar formato CSV
head -5 archivo.csv

# Validar columnas
head -1 archivo.csv | tr ';' '\n'
```

**Columnas esperadas:**
```
Categoria
Asignatura
Nivel
Curso
OA
Eje
Objetivo de Aprendizaje
Tipo
Actividad 1
URL Actividad 1
Actividad 2
URL Actividad 2
Actividad 3
URL Actividad 3
Actividad 4
URL Actividad 4
Priorizado
```

**Validar datos:**
```bash
# Contar líneas (debe ser num_registros + 1 header)
wc -l archivo.csv

# Verificar que no hay líneas vacías
grep -c '^$' archivo.csv  # Debe ser 0

# Verificar separador (punto y coma)
head -1 archivo.csv | grep -o ';' | wc -l  # Debe ser 16
```

---

### Test 3: Descargar y Validar JSON

```bash
# Descargar JSON
# URL desde documentos_transformados.url_descarga

# Validar que es JSON válido
jq '.' archivo.json > /dev/null && echo "✅ JSON válido" || echo "❌ JSON inválido"

# Verificar estructura
jq '.metadata' archivo.json
jq '.objetivos | length' archivo.json

# Verificar un objetivo
jq '.objetivos[0]' archivo.json
```

**Estructura esperada:**
```json
{
  "metadata": {
    "titulo": "...",
    "fuente": "https://www.curriculumnacional.cl",
    "fecha_extraccion": "2026-01-17T...",
    "total_objetivos": 123,
    "objetivos_priorizados": 45
  },
  "objetivos": [
    {
      "asignatura": "Artes Visuales",
      "codigo": "AR01 OA 01",
      "eje": "Expresar y crear visualmente",
      "objetivo": "...",
      "tipo_objetivo": "contenido",
      "categoria": "Educación Básica 1° a 6°",
      "actividades": [
        { "titulo": "...", "url": "..." }
      ],
      "priorizado": true,
      "metadata": {
        "nivel": "1° Básico",
        "curso": "1° Básico",
        "fecha_extraccion": "..."
      }
    }
  ]
}
```

---

## Casos Borde y Errores

### Test 1: Manejar Categorías Sin Datos

```bash
# Categorías que podrían no tener estructura conocida
# - Pueblos Originarios Ancestrales
# - Lengua Indígena
# - EPJA

# Probar manualmente cada una
node -e "
const { extraerAsignaturas } = require('./test-scraping-local.js');
const https = require('https');

const url = 'https://www.curriculumnacional.cl/pueblos-originarios-ancestrales';

https.get(url, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const asignaturas = extraerAsignaturas(data, url);
    console.log(\`Asignaturas: \${asignaturas.length}\`);
    if (asignaturas.length === 0) {
      console.log('⚠️  Estructura no soportada');
    }
  });
});
"
```

---

### Test 2: Manejar Errores 404

```bash
# Probar URL que no existe
curl -I https://www.curriculumnacional.cl/curriculum/categoria-inexistente
```

**Resultado esperado:** HTTP 404

**Validar que la función:**
- [ ] No reintenta en 404
- [ ] Registra el error en logs
- [ ] Continúa con las siguientes categorías
- [ ] No marca el proceso ETL como fallido

---

### Test 3: Manejar Timeouts

```bash
# Simular timeout (30 segundos)
# La función debe:
# - Usar AbortController
# - Reintentar hasta MAX_RETRIES
# - Fallar con mensaje claro si todos los reintentos fallan
```

**Validar en logs:**
```
Timeout para https://... después de 30000ms
Intento 1/3 - Reintentando...
Timeout para https://... después de 30000ms
Intento 2/3 - Reintentando...
...
```

---

### Test 4: Validar Códigos OA Inválidos

La función debe ignorar códigos que no cumplan el patrón:
- ✅ Válido: `AR01 OA 01`, `MA04 OAH a`, `LE05 OAA A`
- ❌ Inválido: `Objetivo 1`, `OA`, `AR01 01`

**Verificar en logs:**
```
⚠️  Código OA inválido ignorado: Objetivo 1
```

---

## Checklist de Validación

### Pre-Despliegue

- [ ] Todas las 9 URLs responden con HTTP 200
- [ ] Script `test-scraping-local.js` extrae asignaturas de todas las categorías
- [ ] Al menos 180 asignaturas totales extraídas
- [ ] Estructuras HTML Tipo 1, 2 y 3 funcionan correctamente
- [ ] `npm run lint` pasa sin errores
- [ ] `npm run build` compila exitosamente

### Post-Despliegue (Modo TEST)

- [ ] Edge Function desplegada en Supabase
- [ ] Configurar `MAX_CATEGORIAS: 2, MAX_ASIGNATURAS: 5`
- [ ] Invocar función y verificar respuesta exitosa
- [ ] Verificar que se crearon registros en `objetivos_aprendizaje`
- [ ] Verificar que se crearon archivos CSV y JSON
- [ ] Verificar logs en Supabase Dashboard

### Post-Despliegue (Modo PRODUCCIÓN)

- [ ] Configurar `MAX_CATEGORIAS: 0, MAX_ASIGNATURAS: 0`
- [ ] Invocar función
- [ ] Tiempo de ejecución < 30 minutos
- [ ] Sin errores HTTP (excepto 404 esperados)
- [ ] Total objetivos extraídos > 500
- [ ] 9 pares de archivos CSV/JSON generados
- [ ] Proceso ETL marcado como `completado`

### Validación de Datos

- [ ] Total objetivos coincide con suma de archivos CSV
- [ ] Todas las categorías tienen > 0 objetivos
- [ ] Tipos de objetivos: contenido, habilidad, actitud presentes
- [ ] Objetivos priorizados > 0
- [ ] Al menos 30% de objetivos tienen actividades
- [ ] Todos los códigos OA son válidos (patrón correcto)
- [ ] Hash de contenido calculado para todos los objetivos

### Validación de Archivos

- [ ] CSV: Formato válido con punto y coma como separador
- [ ] CSV: 17 columnas por fila
- [ ] CSV: Sin líneas vacías
- [ ] JSON: Válido según jq
- [ ] JSON: Estructura con metadata y objetivos
- [ ] Archivos accesibles vía URL firmada

---

## Solución de Problemas

### Problema: No se extraen asignaturas de una categoría

**Diagnóstico:**
```bash
# Descargar HTML
curl -s URL_CATEGORIA > debug.html

# Buscar clases
grep -o 'class="[^"]*"' debug.html | sort | uniq -c | sort -rn | head -20
```

**Solución:**
1. Identificar la estructura HTML usada
2. Actualizar función `extraerAsignaturasYCursos()` en `index.ts`
3. Añadir nuevo patrón de extracción

---

### Problema: Objetivos con código OA inválido

**Diagnóstico:**
```sql
SELECT codigo, COUNT(*)
FROM objetivos_aprendizaje
WHERE codigo !~ '^[A-Z]{2,4}[0-9]{2}\s+OA(A|H)?\s+[0-9A-Za-z]+$'
GROUP BY codigo;
```

**Solución:**
1. Revisar `PATRON_VALIDACION_OA` en `constants.ts`
2. Ajustar regex para cubrir nuevos formatos
3. Re-extraer datos

---

### Problema: Archivos CSV con encoding incorrecto

**Diagnóstico:**
```bash
file -i archivo.csv
# Debe ser: text/plain; charset=utf-8
```

**Solución:**
1. Verificar que `generarCSV()` use UTF-8
2. Asegurar BOM si es necesario para Excel
3. Validar en `subirArchivoStorage()` el `contentType`

---

## Comandos Útiles

```bash
# Ver logs de Edge Function en tiempo real
supabase functions logs extraer-bases-curriculares --tail

# Descargar todos los archivos generados
# (requiere acceso a Supabase Storage)

# Limpiar tabla de prueba
# (solo en desarrollo)
# DELETE FROM objetivos_aprendizaje WHERE categoria = 'Test';

# Ejecutar todas las pruebas locales
node test-scraping-local.js
node test-database-validation.js  # Requiere .env.local

# Generar reporte de cobertura
node test-scraping-local.js > test-report-$(date +%Y%m%d-%H%M%S).txt
```

---

## Resultados Esperados

### Modo TEST (MAX_CATEGORIAS: 2, MAX_ASIGNATURAS: 5)

```
📊 Estadísticas esperadas:
   - Categorías procesadas: 2
   - Asignaturas procesadas: ~10 (5 por categoría)
   - Total objetivos: ~50-100
   - Duración: 1-3 minutos
   - Archivos generados: 4 (2 CSV + 2 JSON)
```

### Modo PRODUCCIÓN (MAX_CATEGORIAS: 0, MAX_ASIGNATURAS: 0)

```
📊 Estadísticas esperadas:
   - Categorías procesadas: 9
   - Asignaturas procesadas: 180-300
   - Total objetivos: 500-2000
   - Objetivos priorizados: 200-800
   - Objetivos con actividades: 150-600
   - Duración: 15-30 minutos
   - Archivos generados: 18 (9 CSV + 9 JSON)
```

---

## Contacto y Soporte

Para reportar problemas o hacer preguntas:
- Revisar logs en Supabase Dashboard
- Consultar tabla `proceso_etl_logs`
- Crear issue en GitHub con logs adjuntos

---

**Última actualización:** 2026-01-17
**Versión:** 2.0
