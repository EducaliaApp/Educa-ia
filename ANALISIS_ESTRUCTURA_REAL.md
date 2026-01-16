# 🔍 Análisis de Estructura HTML Real del Sitio

**Fecha:** 2026-01-16
**URL Analizada:** https://www.curriculumnacional.cl/curriculum/1o-6o-basico/

---

## 📊 Estructura Real vs Esperada

### ❌ Problema 1: Extracción de Asignaturas

**Esperado en código:**
```html
<div class="asignatura">
  <a href="/curriculum/artes-visuales/1-basico">Artes Visuales 1° Básico</a>
</div>
```

**Real en sitio:**
```html
<div class="subject subject-grades">
  <a href="/curriculum/1o-6o-basico/artes-visuales">
    <span class="subject-title">Artes Visuales</span>
  </a>
  <div class="grades-wrapper">
    <a href="/curriculum/1o-6o-basico/artes-visuales/1-basico" class="badge rounded-pill transparent">1° Básico</a>
    <a href="/curriculum/1o-6o-basico/artes-visuales/2-basico" class="badge rounded-pill transparent">2° Básico</a>
    ...
  </div>
</div>
```

**Impacto:** ⚠️ La función `extraerAsignaturasYCursos()` NO encontrará ninguna asignatura

---

### ✅ Estructura de OAs: Funciona (con ajustes menores)

**Real en sitio:**
```html
<div class="items-wrapper">
  <h3 class="link">
    <a href="/curriculum/1o-6o-basico/artes-visuales#eje-115--145">Expresar y crear visualmente</a>
  </h3>

  <div class="item-wrappers">
    <div class="item-wrapper prioritized">
      <h4 class="wrapper-title-oa prioritized">
        <span class="oa-title">Objetivo de aprendizaje AR01 OA 01</span>
        <span class="prioritized">Basal</span>
        <span class="number-title">   AR01 OA 01</span>
      </h4>

      <div class="field field--name-description field__item">
        <div class="tex2jax_process">
          <div class="tex2jax_process">
            <p>Expresar y crear trabajos de arte a partir de la observación del: ...</p>
          </div>
        </div>
      </div>

      <a href="/curriculum/1o-6o-basico/artes-visuales/1-basico/ar01-oa-01" class="link-more">Ver actividades</a>
    </div>
  </div>
</div>
```

**Diferencias encontradas:**

1. **Código OA en `.oa-title`:**
   - **Esperado:** `"AR01 OA 01"`
   - **Real:** `"Objetivo de aprendizaje AR01 OA 01"`
   - **Solución:** Extraer con regex mejorado que busque el patrón dentro del texto

2. **Descripción en `.field__item`:**
   - **Esperado:** Texto directo dentro del div
   - **Real:** Anidado dentro de varios divs `tex2jax_process` > `<p>`
   - **Solución:** Buscar `<p>` dentro de `.field__item`

3. **Priorización:**
   - **Esperado:** Buscar clase `prioritized`
   - **Real:** ✅ Funciona correctamente (clase en `.item-wrapper`)

---

## 🔧 Correcciones Necesarias

### 1. Actualizar `extraerAsignaturasYCursos()`

**Código actual (NO FUNCIONA):**
```typescript
const patronAsignatura = /<div[^>]*class=[^>]*asignatura[^>]*>[\s\S]*?<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi
```

**Código corregido:**
```typescript
// Buscar estructura: .subject-title + links en .grades-wrapper
const patronAsignatura = /<div[^>]*class=[^>]*subject-grades[^>]*>[\s\S]*?<span[^>]*class=[^>]*subject-title[^>]*>([^<]*)<\/span>[\s\S]*?<div[^>]*class=[^>]*grades-wrapper[^>]*>([\s\S]*?)<\/div>/gi

// Luego extraer cada link de curso del grades-wrapper:
const patronCurso = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi
```

### 2. Actualizar extracción de código OA

**Código actual:**
```typescript
const codigoMatch = bloqueOA.match(/<div[^>]*class=[^>]*oa-title[^>]*>([^<]*)<\/div>/i)
const codigo = codigoMatch ? limpiarTexto(codigoMatch[1]) : ''
```

**Código corregido:**
```typescript
const codigoMatch = bloqueOA.match(/<span[^>]*class=[^>]*oa-title[^>]*>([^<]*)<\/span>/i)
let codigo = codigoMatch ? limpiarTexto(codigoMatch[1]) : ''

// Extraer solo el código del formato "Objetivo de aprendizaje AR01 OA 01"
const codigoExtraido = codigo.match(/([A-Z]{2,4}\d{2}\s+OA\s+\d{1,2})/i)
codigo = codigoExtraido ? codigoExtraido[1] : ''
```

### 3. Actualizar extracción de descripción

**Código actual:**
```typescript
const objetivoMatch = bloqueOA.match(/<div[^>]*class=[^>]*field__item[^>]*>([^<]*)<\/div>/i)
const objetivo = objetivoMatch ? limpiarTexto(objetivoMatch[1]) : ''
```

**Código corregido:**
```typescript
// Buscar field__item y extraer el texto del <p> interno
const objetivoMatch = bloqueOA.match(/<div[^>]*class=[^>]*field__item[^>]*>[\s\S]*?<p[^>]*>([^<]*)<\/p>/i)
const objetivo = objetivoMatch ? limpiarTexto(objetivoMatch[1]) : ''
```

---

## 📋 Checklist de Actualización

- [ ] Actualizar `extraerAsignaturasYCursos()` para buscar `.subject-title` y `.grades-wrapper`
- [ ] Extraer múltiples cursos de cada asignatura (1° a 6° básico)
- [ ] Actualizar extracción de código OA desde `.oa-title` (span, no div)
- [ ] Agregar regex para extraer código desde texto "Objetivo de aprendizaje XX## OA ##"
- [ ] Actualizar extracción de descripción para buscar `<p>` dentro de `.field__item`
- [ ] Probar con datos reales del sitio
- [ ] Validar que extrae correctamente todos los OAs

---

## 🎯 Asignaturas Encontradas en el Sitio

Total: **12 asignaturas**

1. Artes Visuales (1° a 6° básico)
2. Ciencias Naturales (1° a 6° básico)
3. Educación Física y Salud (1° a 6° básico)
4. Historia, Geografía y Ciencias Sociales (1° a 6° básico)
5. Inglés (Propuesta) (1° a 6° básico)
6. Inglés (5° a 6° básico)
7. Lengua y Cultura de los Pueblos Originarios Ancestrales (1° a 6° básico)
8. Lenguaje y Comunicación (1° a 6° básico)
9. Matemática (1° a 6° básico)
10. Música (1° a 6° básico)
11. Orientación (1° a 6° básico)
12. Religión (1° a 6° básico)
13. Tecnología (1° a 6° básico)

**Total de cursos (asignatura + nivel):** ~70 combinaciones

---

## 🧪 Ejemplo de Datos Extraídos Correctamente

**Asignatura:** Artes Visuales 1° Básico
**URL:** https://www.curriculumnacional.cl/curriculum/1o-6o-basico/artes-visuales/1-basico

**OA Ejemplo:**
- **Código:** AR01 OA 01
- **Eje:** Expresar y crear visualmente
- **Descripción:** Expresar y crear trabajos de arte a partir de la observación del: entorno natural: paisaje, animales y plantas; entorno cultural: vida cotidiana y familiar; entorno artístico: obras de arte local, chileno, latinoamericano y del resto del mundo.
- **Priorizado:** Sí (Basal)
- **Link actividades:** /curriculum/1o-6o-basico/artes-visuales/1-basico/ar01-oa-01

---

## ⚠️ Conclusión

La estructura HTML real del sitio es **sustancialmente diferente** de lo que esperábamos en el código inicial.

**Impacto:**
- ❌ **Crítico:** `extraerAsignaturasYCursos()` NO funciona (busca clase incorrecta)
- ⚠️ **Medio:** `extraerObjetivos()` funciona parcialmente (necesita ajustes en extracción de código y descripción)

**Prioridad:** 🔴 ALTA - Actualizar código antes del despliegue en producción.

**Próximos pasos:**
1. Actualizar Edge Function con las correcciones identificadas
2. Probar con datos reales del sitio usando curl
3. Validar extracción completa de al menos 2 asignaturas
4. Commit y push de cambios
5. Desplegar a producción
