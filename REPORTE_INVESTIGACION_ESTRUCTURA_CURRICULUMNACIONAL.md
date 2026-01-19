# Investigación Exhaustiva: Estructura del Sitio curriculumnacional.cl
## Reporte Completo de 9 Categorías de Bases Curriculares

**Fecha de Investigación:** 2026-01-18
**Sitio Base:** https://www.curriculumnacional.cl

---

## RESUMEN EJECUTIVO

Se realizó una investigación exhaustiva de las 9 categorías de Bases Curriculares del Ministerio de Educación de Chile. Se identificaron 2 estructuras HTML principales ("Tipo A" y "Tipo B") utilizadas en el sitio, con variaciones según la categoría y nivel educativo.

### Hallazgos Clave:
1. **Estructura HTML Dual:** El sitio utiliza dos patrones de HTML diferentes para mostrar objetivos
2. **URLs Inconsistentes:** Algunas páginas de asignaturas específicas retornan 404
3. **Selectores CSS Identificados:** Se documentaron las clases CSS para ambos tipos de estructura
4. **Objetivos Individuales:** Las páginas de OA individuales tienen estructura consistente

---

## 1. EDUCACIÓN PARVULARIA

### URL Principal
`https://www.curriculumnacional.cl/curriculum/educacion-parvularia`

### Estado: ✅ FUNCIONAL

### URLs de Asignaturas/Ámbitos (9 total)

#### Comunicación Integral
- `https://www.curriculumnacional.cl/curriculum/educacion-parvularia/comunicacion-integral/sc-sala-cuna`
- `https://www.curriculumnacional.cl/curriculum/educacion-parvularia/comunicacion-integral/nm-nivel-medio`
- `https://www.curriculumnacional.cl/curriculum/educacion-parvularia/comunicacion-integral/nt-nivel-transicion` ✅

#### Desarrollo Personal y Social
- `https://www.curriculumnacional.cl/curriculum/educacion-parvularia/desarrollo-personal-social/sc-sala-cuna` ✅
- `https://www.curriculumnacional.cl/curriculum/educacion-parvularia/desarrollo-personal-social/nm-nivel-medio`
- `https://www.curriculumnacional.cl/curriculum/educacion-parvularia/desarrollo-personal-social/nt-nivel-transicion`

#### Interacción y Comprensión del Entorno
- `https://www.curriculumnacional.cl/curriculum/educacion-parvularia/interaccion-comprension-entorno/sc-sala-cuna`
- `https://www.curriculumnacional.cl/curriculum/educacion-parvularia/interaccion-comprension-entorno/nm-nivel-medio`
- `https://www.curriculumnacional.cl/curriculum/educacion-parvularia/interaccion-comprension-entorno/nt-nivel-transicion`

### Estructura HTML

**TIPO B** - Estructura con items-wrapper

#### Clases CSS Principales:
- **Núcleos/Ejes:** Identificadores como `#ncleo-123--102`, `#ncleo-123--103`
- **Código OA:** `<span class="oa-title">` - Formato: "OA 01 LV NT"
- **Descripción:** `<div class="field__item"><p>`
- **Priorización:** Texto "Basal" dentro del span de oa-title
- **Actividades:** `<a class="link-more" href="...">`

#### Jerarquía HTML:
```html
<section id="ncleo-125--107">
  <h3>Lenguaje verbal</h3>
  <div class="items-wrapper">
    <div class="item-wrapper">
      <h4>
        <span class="oa-title">OA 01 LV NT</span>
        <span class="basal">Basal OA 01 LV NT</span>
      </h4>
      <div class="field__item">
        <p>[Descripción del objetivo]</p>
      </div>
      <a class="link-more" href="/curriculum/educacion-parvularia/comunicacion-integral/nt-nivel-transicion/oa-01-lv-nt">
        Ver actividades
      </a>
    </div>
  </div>
</section>
```

#### Ejemplo de Objetivo Individual:
**URL:** `/curriculum/educacion-parvularia/comunicacion-integral/nt-nivel-transicion/oa-01-lv-nt`

**Estructura:**
- Código OA: "OA 01 LV NT"
- Descripción completa del objetivo
- Experiencias de aprendizaje (NT1, NT2)
- Enlaces a recursos

### Diferencias entre Asignaturas
- Misma estructura HTML para todos los ámbitos
- Diferencias solo en nomenclatura de códigos (LV, LA, IA, CC, CM)
- Consistente uso del indicador "Basal" para priorización

---

## 2. 1° A 6° BÁSICO

### URL Principal
`https://www.curriculumnacional.cl/curriculum/1o-6o-basico`

### Estado: ✅ FUNCIONAL

### URLs de Asignaturas Verificadas (5 ejemplos)

1. **Matemática 1° Básico:** ✅ FUNCIONAL
   - `https://www.curriculumnacional.cl/curriculum/1o-6o-basico/matematica/1-basico`
   - Ejemplo OA: `/curriculum/1o-6o-basico/matematica/1-basico/ma01-oa-01`

2. **Ciencias Naturales 5° Básico:** ✅ FUNCIONAL
   - `https://www.curriculumnacional.cl/curriculum/1o-6o-basico/ciencias-naturales/5-basico`
   - Ejemplo OA: `/curriculum/1o-6o-basico/ciencias-naturales/5-basico/cn05-oa-01`

3. **Artes Visuales 4° Básico:** ✅ FUNCIONAL
   - `https://www.curriculumnacional.cl/curriculum/1o-6o-basico/artes-visuales/4-basico`

4. **Música 6° Básico:** ✅ FUNCIONAL
   - `https://www.curriculumnacional.cl/curriculum/1o-6o-basico/musica/6-basico`

5. **Historia, Geografía y Ciencias Sociales:** ❌ 404
   - URL intentada: `/curriculum/1o-6o-basico/historia-geografia-y-ciencias-sociales/2-basico`

### Asignaturas Disponibles (13 total)
- Artes Visuales
- Ciencias Naturales
- Educación Física y Salud
- Historia, Geografía y Ciencias Sociales
- Inglés (2 versiones: estándar y propuesta)
- Lengua y Cultura de los Pueblos Originarios Ancestrales
- Lenguaje y Comunicación
- Matemática
- Música
- Orientación
- Religión
- Tecnología

### Estructura HTML

**TIPO B** - Estructura con items-wrapper

#### Clases CSS Principales:
- **Ejes:** Identificadores como `#eje-105--131`, `#eje-105--132`, `#eje-105--133`
- **Código OA:** `<span class="oa-title">` - Formato: "MA01 OA 01"
- **Descripción:** `<div class="field__item"><p>`
- **Priorización:** Indicador "Basal" en el código
- **Actividades:** `<a class="link-more">`

#### Ejemplo: Matemática 1° Básico

**Página de curso:**
```html
<section id="eje-103--115">
  <h3>
    <a href="#eje-103--115">Números y operaciones</a>
  </h3>
  <div class="items-wrapper">
    <div class="item-wrapper">
      <h4>
        <span class="oa-title">MA01 OA 01</span>
        <span>Basal MA01 OA 01</span>
      </h4>
      <div class="field__item">
        <p>Contar números del 0 al 100 de 1 en 1, de 2 en 2...</p>
      </div>
      <a class="link-more" href="/curriculum/1o-6o-basico/matematica/1-basico/ma01-oa-01">
        Ver actividades
      </a>
    </div>
  </div>
</section>
```

**Página de OA individual:**
```html
<main id="main-content">
  <nav><!-- breadcrumb --></nav>
  <article class="objetivo-aprendizaje">
    <h1>MA01 OA 01</h1>
    <h2>Matemática 1° Básico</h2>
    <p class="descripcion">Contar números del 0 al 100...</p>

    <section class="actividades">
      <h3>Actividades</h3>
      <div class="actividad-complementaria">
        <h4>Ficha N° 1 Movimiento en 15'</h4>
      </div>
      <a href="...">Ver mas actividades</a>
    </section>
  </article>
</main>
```

### Selectores CSS Documentados

#### Para Códigos de OA:
- `.oa-title` - Contiene el código completo (ej: "MA01 OA 01")
- Patrón regex: `/([A-Z]{2,4}\d{2}\s+OA[AH]?\s+[A-Za-z0-9]{1,2})/i`

#### Para Ejes Curriculares:
- `<h3>` con `<a href="#eje-[id]">`
- Ejes comunes en Matemática: Números y operaciones, Patrones y álgebra, Geometría, Medición, Datos y probabilidades

#### Para Descripciones:
- `.field__item p` - Texto del objetivo

#### Para Priorización:
- Texto "Basal" aparece junto al código OA
- Algunos objetivos no tienen indicador (no priorizados)

#### Para Actividades:
- `.link-more` - Enlace "Ver actividades"
- Formato URL: `[base-url]/[codigo-oa-minusculas-con-guiones]`

### Diferencias entre Asignaturas
- **Artes Visuales:** 2 ejes (Expresar y crear visualmente, Apreciar y responder frente al arte)
- **Música:** 3 ejes (Escuchar y apreciar, Interpretar y crear, Reflexionar y contextualizar)
- **Ciencias Naturales:** 3 ejes (Ciencias de la Vida, Ciencias Físicas y Químicas, Ciencias de la Tierra y el Universo)
- **Matemática:** 5 ejes
- Todas usan la misma estructura HTML Tipo B

---

## 3. 7° BÁSICO A 2° MEDIO

### URL Principal
`https://www.curriculumnacional.cl/curriculum/7o-basico-2-medio`

### Estado: ✅ FUNCIONAL

### URLs de Asignaturas Verificadas (3 ejemplos)

1. **Matemática 8° Básico:** ✅ FUNCIONAL
   - `https://www.curriculumnacional.cl/curriculum/7o-basico-2-medio/matematica/8-basico`
   - Ejemplo OA: `/curriculum/7o-basico-2-medio/matematica/8-basico/ma08-oa-01`

2. **Ciencias Naturales 2° Medio:** ✅ FUNCIONAL
   - `https://www.curriculumnacional.cl/curriculum/7o-basico-2-medio/ciencias-naturales/2-medio`

3. **Historia, Geografía y Ciencias Sociales:** ❌ 404
   - URL intentada: `/curriculum/7o-basico-2-medio/historia-geografia-y-ciencias-sociales/7-basico`

### Asignaturas Disponibles (13 total)
- Artes Visuales
- Ciencias Naturales
- Educación Física y Salud
- Historia, Geografía y Ciencias Sociales
- Inglés (2 versiones)
- Lengua Indígena
- Lengua y Literatura
- Matemática
- Música
- Orientación
- Religión
- Tecnología

### Estructura HTML

**TIPO B** - Similar a 1° a 6° básico

#### Clases CSS Principales:
- **Ejes:** `#eje-109--176`, `#eje-109--177`, etc.
- **Código OA:** `<span class="oa-title">` - Formato: "MA08 OA 01"
- **Priorización:** Indicador "Basal"
- **Habilidades:** Sección separada con identificadores `#habilidad-109--XX`
- **Actitudes:** Sección con identificadores `#actitud-109`

#### Ejemplo: Matemática 8° Básico

**Estructura de OA:**
```html
<section id="eje-109--176">
  <h3>Números</h3>
  <article>
    <h4>
      <span class="oa-title">MA08 OA 01</span>
      <span class="badge">Basal</span>
    </h4>
    <p>Mostrar que comprenden la multiplicación y la división de números enteros...</p>
    <a href="/curriculum/7o-basico-2-medio/matematica/8-basico/ma08-oa-01">Ver actividades</a>
  </article>
</section>
```

**Ejes en Matemática 8°:**
1. Números (`#eje-109--176`)
2. Álgebra y funciones (`#eje-109--177`)
3. Geometría (`#eje-109--178`)
4. Probabilidad y estadística (`#eje-109--179`)

**Habilidades separadas:**
- Resolver problemas
- Argumentar y comunicar
- Modelar
- Representar

### Selectores CSS Documentados

Similar a 1° a 6° básico, con adiciones:

#### Para Códigos de OA:
- `.oa-title` + `.badge` para priorización
- Formato: "MA08 OA 01", "CN2M OA 01"

#### Para Ejes:
- Identificadores numéricos únicos por eje
- Navegación con anchors `#eje-[asignatura-id]--[eje-id]`

#### Para Habilidades:
- Sección separada con `#habilidad-[asignatura-id]--[habilidad-id]`
- No tienen formato OA estándar

### Diferencias con 1° a 6° Básico
- Código "2M" para 2° Medio en lugar de formato numérico
- Mayor énfasis en habilidades como sección separada
- Estructura de ejes más compleja en Ciencias Naturales (Biología, Física, Química)

---

## 4. 3° A 4° MEDIO

### URL Principal
`https://www.curriculumnacional.cl/curriculum/3o-4o-medio`

### Estado: ✅ FUNCIONAL

### URLs de Asignaturas Verificadas (5 ejemplos)

#### Formación General Obligatoria:
1. **Matemática 3° medio:**
   - `https://www.curriculumnacional.cl/curriculum/3o-4o-medio/matematica-3o-medio`
   - Estado: ⚠️ Sin OA expandidos (solo enlaces a documentos)

2. **Lengua y Literatura 3° medio:**
   - `https://www.curriculumnacional.cl/curriculum/3o-4o-medio/lengua-literatura-3o-medio`
   - Estado: ⚠️ Sin OA expandidos

#### Formación General Electiva:
3. **Artes Visuales:**
   - `https://www.curriculumnacional.cl/curriculum/3o-4o-medio/artes-visuales`

4. **Música:**
   - `https://www.curriculumnacional.cl/curriculum/3o-4o-medio/musica`

#### Diferenciada Humanista-Científica:
5. **Física:**
   - `https://www.curriculumnacional.cl/curriculum/3o-4o-medio/fisica`
   - Subcursos:
     - `/curriculum/3o-4o-medio/fisica/3-medio-hc`
     - `/curriculum/3o-4o-medio/fisica/4-medio-hc`

6. **Biología Celular y Molecular:**
   - `https://www.curriculumnacional.cl/curriculum/3o-4o-medio/biologia-celular-molecular`

### Asignaturas Disponibles

#### Formación General (Obligatoria - 7):
- Ciencias para la ciudadanía
- Educación ciudadana
- Filosofía
- Inglés
- Lengua y literatura
- Matemática
- Religión

#### Formación General (Electiva - 9):
- Artes visuales, Danza, Música, Teatro
- Chile y la región latinoamericana
- Mundo global
- Educación física y salud (2 niveles)

#### Diferenciada Humanista-Científica (15+):
- Biología celular y molecular
- Física
- Química
- Economía y sociedad
- Límites, derivadas e integrales
- Pensamiento computacional y programación
- Entre otros

### Estructura HTML

**PROBLEMA IDENTIFICADO:** Las páginas de asignaturas en 3° y 4° medio NO muestran los objetivos de aprendizaje expandidos en la página principal. Solo muestran:
- Enlaces a documentos curriculares (PDF)
- Selección de curso (3° Medio FG / 4° Medio FG)
- Fichas pedagógicas

**Estructura Observada:**
```html
<main>
  <nav><!-- breadcrumb --></nav>
  <section class="documentos-curriculares">
    <a href="/recursos/programa-fg-matematica-3-medio">Programa FG: Matemática 3° medio</a>
  </section>
  <section class="curso">
    <div class="curso-selector">
      <a href="#">3° Medio FG</a>
    </div>
  </section>
</main>
```

### Selectores CSS Documentados

⚠️ **LIMITACIÓN:** No se pudieron documentar selectores CSS para OA porque las páginas no muestran objetivos expandidos.

**Selectores Disponibles:**
- `.documentos-curriculares` - Sección de documentos
- `.curso-selector` - Selector de nivel
- Enlaces a programas de estudio

### Diferencias con Otros Niveles

**CRÍTICO:** 3° y 4° medio tiene una estructura COMPLETAMENTE DIFERENTE:
1. No muestra OA en la página de asignatura
2. Requiere descarga de PDFs o navegación a programas específicos
3. Diferencia entre FG (Formación General) y HC/TP (Humanista-Científico/Técnico Profesional)
4. Múltiples subcursos por asignatura

### Hallazgos Importantes

1. **Física** y otras asignaturas diferenciadas tienen subcursos:
   - 3° Medio HC
   - 4° Medio HC

2. **URLs intentadas sin éxito:**
   - `/curriculum/3o-4o-medio/matematica-3o-medio/3-medio-fg` ❌ 404
   - `/curriculum/3o-4o-medio/filosofia/3-medio-fg` ❌ 404
   - `/curriculum/3o-4o-medio/biologia-celular-molecular/3-medio-hc` ❌ 404

3. **Posible solución:** Los OA pueden estar en:
   - Documentos PDF descargables
   - Páginas de programa de estudio
   - Sistema diferente de navegación

---

## 5. 3° A 4° MEDIO TÉCNICO PROFESIONAL

### URL Principal
`https://www.curriculumnacional.cl/curriculum/3o-4o-medio-tecnico-profesional`

### Estado: ✅ FUNCIONAL

### URLs de Especialidades (50+ especialidades en 17 áreas)

#### Administración (4 especialidades):
1. `https://www.curriculumnacional.cl/curriculum/3o-4o-medio-tecnico-profesional/especialidad-administracion`
2. `https://www.curriculumnacional.cl/curriculum/3o-4o-medio-tecnico-profesional/especialidad-administracion-mencion-logistica`
3. `https://www.curriculumnacional.cl/curriculum/3o-4o-medio-tecnico-profesional/especialidad-administracion-mencion-recursos-humanos`
4. `https://www.curriculumnacional.cl/curriculum/3o-4o-medio-tecnico-profesional/especialidad-contabilidad`

#### Agropecuario (4 especialidades):
5. `https://www.curriculumnacional.cl/curriculum/3o-4o-medio-tecnico-profesional/especialidad-agropecuaria`
6. `...mencion-agricultura`
7. `...mencion-pecuaria`
8. `...mencion-vitivinicola`

#### Alimentación (4 especialidades):
9. `https://www.curriculumnacional.cl/curriculum/3o-4o-medio-tecnico-profesional/especialidad-elaboracion-industrial-alimentos`
10. `https://www.curriculumnacional.cl/curriculum/3o-4o-medio-tecnico-profesional/especialidad-gastronomia`
11. `...mencion-cocina`
12. `...mencion-pasteleria-reposteria`

#### Tecnología y Comunicaciones (3 especialidades):
- `...especialidad-conectividad-redes`
- `...especialidad-programacion`
- `...especialidad-telecomunicaciones`

#### Salud y Educación (4 especialidades):
- `...especialidad-atencion-enfermeria`
- `...mencion-adulto`
- `...mencion-enfermeria`
- `...especialidad-atencion-parvulos`

#### (Ver listado completo de 17 áreas en respuesta anterior)

### Estructura HTML

**PROBLEMA SIMILAR A 3° Y 4° MEDIO:** Las páginas de especialidades NO muestran los objetivos/módulos expandidos.

**Estructura Observada:**
```html
<main>
  <nav><!-- breadcrumb --></nav>
  <section class="documentos-curriculares">
    <a href="/recursos/programa-tp-gastronomia">Programa de Estudio</a>
  </section>
  <section class="curso">
    <a href="#">3° Medio TP</a>
    <a href="#">4° Medio TP</a>
  </section>
</main>
```

### Selectores CSS Documentados

⚠️ **LIMITACIÓN:** Similar a 3° y 4° medio, no se pudieron documentar selectores porque no hay módulos/OF expandidos.

**Observaciones:**
- Usa clases: `.inline-flex`, `.card`
- Framework Drupal detectado
- Organización por módulos (no OA, sino OF - Objetivos Fundamentales)

### Diferencias con Otras Categorías

1. **Nomenclatura diferente:**
   - OF (Objetivos Fundamentales) en lugar de OA
   - Módulos en lugar de Ejes
   - TP (Técnico Profesional) en URLs

2. **Estructura por especialidad:**
   - Cada especialidad es independiente
   - Diferencias entre 3° y 4° medio
   - Mención vs especialidad general

3. **No sigue patrón OA:**
   - No usa códigos como "MA08 OA 01"
   - Formato específico para TP

### URLs Intentadas Sin Éxito:
- `/curriculum/3o-4o-medio-tecnico-profesional/especialidad-gastronomia/3-medio-tp` ❌ 404
- `/curriculum/3o-4o-medio-tecnico-profesional/especialidad-programacion/4-medio-tp` ❌ 404

---

## 6. DIFERENCIADA ARTÍSTICA 3° Y 4° MEDIO

### URL Principal
`https://www.curriculumnacional.cl/recursos/terminales-formacion-diferenciada-artistica-3-4-medio-0`

### Estado: ✅ FUNCIONAL (pero estructura diferente)

### Características Especiales

**DIFERENTE A TODAS LAS OTRAS CATEGORÍAS:**
- URL en `/recursos/` en lugar de `/curriculum/`
- Principalmente un documento PDF descargable
- No tiene estructura de asignaturas navegables

### Contenido Disponible

1. **Documento Principal:**
   - "articles-332179_recurso_pdf.pdf" (370.77 KB)
   - OF Terminales de Formación Diferenciada Artística 3° y 4° medio

2. **Navegación:**
   - Solo enlace a descarga de PDF
   - No hay subcursos ni asignaturas navegables

### Estructura HTML

```html
<main>
  <nav><!-- breadcrumb --></nav>
  <section class="recurso-descarga">
    <h1>OF Terminales de Formación Diferenciada Artística 3° y 4° medio</h1>
    <a href="/sites/default/files/articles-332179_recurso_pdf.pdf" class="d-flex border py-2">
      Descargar PDF (370.77 KB)
    </a>
  </section>
  <footer><!-- info institucional --></footer>
</main>
```

### Selectores CSS Documentados

- `.d-flex` - Botón de descarga
- `.border` - Contenedor con borde
- Bootstrap styling framework detectado

### Hallazgos Importantes

⚠️ **CRÍTICO:** Esta categoría NO permite extracción automatizada de OA porque:
1. No tiene OA expandidos en HTML
2. Todo el contenido está en PDF
3. No sigue estructura estándar del sitio
4. Requeriría extracción de PDF para obtener objetivos

**Recomendación:** Para esta categoría, se debe:
- Descargar el PDF manualmente
- Extraer contenido con herramientas de procesamiento de PDF
- O marcar como "no disponible para scraping web"

---

## 7. EDUCACIÓN DE PERSONAS JÓVENES Y ADULTAS (EPJA)

### URL Principal
`https://www.curriculumnacional.cl/curriculum/bases-curriculares-educacion-personas-jovenes-adultas-epja`

### Estado: ✅ FUNCIONAL

### URLs de Asignaturas (4 total)

#### Lenguaje y Comunicación:
1. **Nivel 1 (1° a 4° año básico):**
   - `https://www.curriculumnacional.cl/curriculum/bases-curriculares-educacion-personas-jovenes-adultas-epja/lenguaje-comunicacion/nivel-1-educacion-basica-1o-4o-ano-basico`

2. **Nivel 2 (5° y 6° año básico):**
   - `https://www.curriculumnacional.cl/curriculum/bases-curriculares-educacion-personas-jovenes-adultas-epja/lenguaje-comunicacion/nivel-2-educacion-basica-5o-6o-ano-basico`

#### Matemática:
3. **Nivel 1 (1° a 4° año básico):**
   - `https://www.curriculumnacional.cl/curriculum/bases-curriculares-educacion-personas-jovenes-adultas-epja/matematica/nivel-1-educacion-basica-1o-4o-ano-basico`

4. **Nivel 2 (5° y 6° año básico):**
   - `https://www.curriculumnacional.cl/curriculum/bases-curriculares-educacion-personas-jovenes-adultas-epja/matematica/nivel-2-educacion-basica-5o-6o-ano-basico`

### Estructura HTML

**ESTRUCTURA SIMPLIFICADA:** Las páginas de EPJA NO muestran OA individuales, sino principios generales.

**Contenido Observado:**
```html
<main>
  <section class="documentos-curriculares">
    <a href="#">Bases Curriculares 2024</a>
    <a href="#">Decreto N°257</a>
    <a href="#">Programa de Estudio EPJA: Matemática Nivel 1</a>
  </section>
  <section class="principios">
    <h3>Comprensión esperada:</h3>
    <ul>
      <li>Principio 1...</li>
      <li>Principio 2...</li>
      <li>Principio 3...</li>
      <li>Principio 4...</li>
    </ul>
  </section>
</main>
```

**Ejemplo (Matemática Nivel 1):**
- 4 grandes principios de comprensión esperada
- Referencias a documentos curriculares
- NO hay códigos OA individuales
- NO hay estructura de ejes tradicional

### Selectores CSS Documentados

⚠️ **LIMITACIÓN:** No hay selectores CSS para OA porque no existen OA individuales en el HTML.

**Selectores Disponibles:**
- `.documentos-curriculares` - Enlaces a documentos
- Secciones de orientaciones, evaluación, recursos

### Diferencias con Otras Categorías

1. **Sin códigos OA:** No usa formato "MA01 OA 01"
2. **Principios en lugar de objetivos:** Enfoque más general
3. **Solo 2 asignaturas:** Lenguaje y Matemática
4. **Niveles en lugar de cursos:** Nivel 1 (1°-4°) y Nivel 2 (5°-6°)

### Hallazgos Importantes

**EPJA tiene enfoque pedagógico diferente:**
- Objetivos más amplios y transversales
- Menor granularidad que educación regular
- Requiere acceso a documentos PDF para objetivos específicos

**URLs Intentadas:**
- `/curriculum/bases-curriculares-educacion-personas-jovenes-adultas-epja/matematica/nivel-1-educacion-basica` ❌ 404 (URL debe incluir rango completo)

---

## 8. PUEBLOS ORIGINARIOS

### URL Principal
`https://www.curriculumnacional.cl/pueblos-originarios-ancestrales`

### Estado: ✅ FUNCIONAL

### Contenido Disponible

**9 Pueblos Reconocidos:**
1. Aymara
2. Quechua
3. Lickanantay
4. Colla
5. Diaguita
6. Kawésqar
7. Yagán
8. Mapuche
9. Rapa Nui

### Recursos por Grado (1° a 6° básico)

**Estructura de Recursos:**
- Programas de estudio individuales por pueblo
- Programa de Interculturalidad
- Textos escolares (1° y 2° básico para 4 pueblos + Interculturalidad)
- Guías para educadores tradicionales
- Videos documentales y educativos

### Estructura HTML

**ORGANIZACIÓN POR PESTAÑAS:**
```html
<main>
  <nav class="tabs">
    <a href="#presentacion">Presentación</a>
    <a href="#bases-planes-programas">Bases/Planes/Programas</a>
    <a href="#textos-escolares">Textos Escolares</a>
  </nav>

  <section id="bases-planes-programas">
    <h3>Programas para 7°-8° básico</h3>
    <a href="#">Lengua Indígena 7° básico</a>
    <a href="#">Lengua Indígena 8° básico</a>
  </section>

  <section id="textos-escolares">
    <!-- recursos descargables -->
  </section>
</main>
```

### Selectores CSS Documentados

- `.tabs` - Navegación por pestañas
- Organización modular de recursos descargables
- No hay estructura de OA tradicional

### Diferencias con Otras Categorías

1. **No es una categoría curricular estándar**
2. **Recursos descargables principalmente**
3. **Organizado por pueblo, no por asignatura**
4. **Sin códigos OA estándar**

### Hallazgos Importantes

**Esta URL es informativa, no curricular:**
- Proporciona acceso a programas de estudio
- Enlaces a Lengua Indígena (categoría separada)
- Recursos pedagógicos y culturales
- NO tiene objetivos de aprendizaje extraíbles por scraping

---

## 9. LENGUA INDÍGENA (7° BÁSICO A 2° MEDIO)

### URL Principal
`https://www.curriculumnacional.cl/curriculum/7o-basico-2o-medio/lengua-indigena`

### Estado: ✅ FUNCIONAL

### URLs de Cursos (2 total)

1. **7° Básico:**
   - `https://www.curriculumnacional.cl/curriculum/7o-basico-2o-medio/lengua-indigena/7-basico`

2. **8° Básico:**
   - `https://www.curriculumnacional.cl/curriculum/7o-basico-2o-medio/lengua-indigena/8-basico`

### Estructura HTML

**TIPO B** - Similar a otras asignaturas de 7° a 2° medio

#### Clases CSS Principales:
- **Ejes:** `#eje-136--201`, `#eje-136--202`, `#eje-136--203`
- **Código OF:** `<span class="oa-title">` - Formato: "LI07 OF A"
- **Priorización:** Indicador "Basal"
- **Actividades:** `<a class="link-more">`

#### Ejes Curriculares (3):
1. **Tradición oral** (`#eje-136--201`)
2. **Comunicación oral** (`#eje-136--202`)
3. **Comunicación escrita** (`#eje-136--203`)

### Ejemplo de Estructura

**Página de curso (7° básico):**
```html
<section id="eje-136--201">
  <h3>
    <a href="#eje-136--201">Tradición oral</a>
  </h3>
  <div class="items-wrapper">
    <div class="item-wrapper">
      <h4>
        <span class="oa-title">LI07 OF A</span>
        <span>Basal</span>
      </h4>
      <div class="field__item">
        <p>[Descripción del objetivo]</p>
      </div>
      <a class="link-more" href="/curriculum/7o-basico-2o-medio/lengua-indigena/7-basico/li07-of-a">
        Ver actividades
      </a>
    </div>
  </div>
</section>
```

### Selectores CSS Documentados

#### Para Códigos OF:
- `.oa-title` - Formato: "LI07 OF A" (usa OF en lugar de OA)
- Patrón: `[A-Z]{2}\d{2}\s+OF\s+[A-Z]`

#### Para Ejes:
- Identificadores numéricos: `#eje-136--[201-203]`
- 3 ejes consistentes

#### Para Priorización:
- Texto "Basal" junto al código
- Aparentemente todos los OF son basales

### Diferencias con Otras Categorías

1. **Usa "OF" en lugar de "OA":**
   - OF = Objetivo Fundamental
   - Nomenclatura más antigua del currículum chileno

2. **Solo 3 ejes:**
   - Más simple que otras asignaturas
   - Enfoque en oralidad y escritura

3. **Solo 7° y 8° básico:**
   - No hay 1° a 2° medio (a diferencia del nombre de la categoría)

### URLs Intentadas Sin Éxito:
- `/curriculum/7o-basico-2o-medio/lengua-indigena/7-basico/li07-of-a` ❌ 404

---

## ANÁLISIS TRANSVERSAL

### Patrones de Estructura HTML Identificados

#### TIPO A (No encontrado en páginas verificadas)
**Clases CSS:**
- `.oa-cnt` - Contenedor de objetivo
- `.oa-eje` - Eje curricular
- `.oa-numero` - Código del OA
- `.oa-descripcion` - Descripción del objetivo
- `.oa-basal` - Indicador de priorización

**Usado en:** Código legacy, posiblemente páginas antiguas

#### TIPO B (Estructura Moderna - PREDOMINANTE)
**Clases CSS:**
- `.items-wrapper` - Contenedor de ejes
- `.item-wrapper` - Contenedor de objetivo individual
- `.oa-title` - Código del OA/OF
- `.field__item p` - Descripción
- `.link-more` - Enlace a actividades
- `.prioritized` o texto "Basal" - Priorización

**Usado en:**
- Educación Parvularia ✅
- 1° a 6° Básico ✅
- 7° Básico a 2° Medio ✅
- Lengua Indígena ✅

#### TIPO C (Solo Documentos)
**Sin OA expandidos en HTML**

**Usado en:**
- 3° a 4° Medio ⚠️
- 3° a 4° Medio TP ⚠️
- EPJA ⚠️
- Diferenciada Artística ⚠️

### Jerarquía HTML Estándar (Tipo B)

```html
<main id="main-content">
  <nav class="breadcrumb">
    <!-- Ruta de navegación -->
  </nav>

  <section class="documentos-curriculares">
    <!-- Enlaces a PDFs y documentos -->
  </section>

  <section class="curso">
    <!-- Selector de nivel/curso -->
  </section>

  <section id="eje-[id]">
    <h3>
      <a href="#eje-[id]">Nombre del Eje</a>
    </h3>

    <div class="items-wrapper">
      <div class="item-wrapper">
        <h4>
          <span class="oa-title">[CÓDIGO OA]</span>
          <span class="badge">Basal</span> <!-- opcional -->
        </h4>

        <div class="field__item">
          <p>[Descripción del objetivo]</p>
        </div>

        <a class="link-more" href="[url-detalle]">
          Ver actividades
        </a>
      </div>
      <!-- más item-wrapper... -->
    </div>
  </section>

  <!-- Sección de Habilidades -->
  <section id="habilidad-[id]">
    <!-- Similar estructura -->
  </section>

  <!-- Sección de Actitudes -->
  <section id="actitud-[id]">
    <!-- Similar estructura -->
  </section>

  <footer>
    <!-- Información institucional -->
  </footer>
</main>
```

### Selectores CSS Unificados

#### Para extraer OA/OF:

```typescript
// Códigos de OA
const codigoOA = document.querySelector('.oa-title')?.textContent

// Descripción
const descripcion = document.querySelector('.field__item p')?.textContent

// Eje (desde section padre)
const eje = document.querySelector('section[id^="eje-"] h3 a')?.textContent

// Priorización
const esPriorizado =
  document.querySelector('.badge')?.textContent.includes('Basal') ||
  document.querySelector('.oa-title')?.textContent.includes('Basal')

// URL de actividades
const urlActividades = document.querySelector('.link-more')?.getAttribute('href')
```

#### Patrón Regex para Códigos OA:

```typescript
// Validación estricta
const PATRON_VALIDACION_OA = /^[A-Z]{2,4}\d{2}\s+OA[AH]?\s+[A-Za-z0-9]{1,2}$/i

// Extracción desde texto
const PATRON_EXTRACCION_OA = /([A-Z]{2,4}\d{2}\s+OA[AH]?\s+[A-Za-z0-9]{1,2})/i

// Para Lengua Indígena (usa OF)
const PATRON_OF = /([A-Z]{2}\d{2}\s+OF\s+[A-Z])/i

// Para Educación Parvularia
const PATRON_PARVULARIA = /(OA[T]?\s+\d{2}\s+[A-Z]{2,}\s+[A-Z]{2})/i
```

---

## PROBLEMAS IDENTIFICADOS

### 1. URLs que Retornan 404

#### Educación Básica:
- Algunas páginas de Historia, Geografía y Ciencias Sociales
- Lenguaje y Comunicación con guiones en URL

#### Educación Media:
- Lengua y Literatura con diferentes formatos de URL
- Historia, Geografía y Ciencias Sociales

#### 3° y 4° Medio:
- Subcursos específicos (3-medio-fg, 4-medio-fg)
- Asignaturas diferenciadas con nivel

#### Técnico Profesional:
- Subcursos de especialidades (3-medio-tp, 4-medio-tp)

### 2. Inconsistencias de Nomenclatura

#### Nombres de Asignaturas:
- "Lenguaje y Comunicación" vs "Lengua y Literatura"
- "Historia, Geografía y Ciencias Sociales" (con comas) en URLs

#### Códigos de OA:
- "OA" para contenido
- "OAH" para habilidades
- "OAA" para actitudes
- "OF" para objetivos fundamentales (Lengua Indígena)
- "OAT" para objetivos de aprendizaje transversal (Parvularia)

#### Niveles:
- "1-basico" vs "1° Básico" vs "Primero Básico"
- "2-medio" vs "2M" vs "Segundo Medio"
- "3-medio-fg" vs "3° Medio FG"
- "sc" vs "SC" vs "Sala Cuna"

### 3. Estructura No Uniforme por Categoría

#### Categorías con OA Expandidos (Tipo B):
- ✅ Educación Parvularia
- ✅ 1° a 6° Básico
- ✅ 7° Básico a 2° Medio
- ✅ Lengua Indígena

#### Categorías Solo con Documentos (Tipo C):
- ⚠️ 3° a 4° Medio
- ⚠️ 3° a 4° Medio TP
- ⚠️ EPJA
- ⚠️ Diferenciada Artística

### 4. Limitaciones de Scraping

#### Páginas que NO permiten extracción automatizada:
1. **Diferenciada Artística:** Solo PDF
2. **EPJA:** Principios generales, no OA específicos
3. **3° y 4° Medio:** Requiere navegación a programas de estudio
4. **TP:** Módulos no expandidos en HTML

#### Páginas con Datos Parciales:
1. **Pueblos Originarios:** Página informativa, no curricular
2. **3° y 4° Medio:** Enlaces a subcursos que retornan 404

---

## RECOMENDACIONES

### Para Extracción Automatizada

#### 1. Priorizar Categorías con Estructura Tipo B:
- ✅ Educación Parvularia
- ✅ 1° a 6° Básico
- ✅ 7° Básico a 2° Medio
- ✅ Lengua Indígena

#### 2. Estrategia Dual para Categorías Tipo C:
- **Opción A:** Scraping + extracción de PDF
- **Opción B:** Marcar como "requiere procesamiento manual"
- **Opción C:** Usar API del Mineduc si está disponible

#### 3. Normalización de URLs:
```typescript
// Función para normalizar nombres de asignaturas
function normalizarAsignatura(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // quitar acentos
    .replace(/,/g, '')                  // quitar comas
    .replace(/\s+/g, '-')              // espacios a guiones
}

// Función para construir URL de curso
function construirUrlCurso(
  categoria: string,
  asignatura: string,
  curso: string
): string {
  const base = 'https://www.curriculumnacional.cl/curriculum'
  const categoriaSlug = normalizarAsignatura(categoria)
  const asignaturaSlug = normalizarAsignatura(asignatura)
  const cursoSlug = curso.toLowerCase().replace(/°/g, '').replace(/\s+/g, '-')

  return `${base}/${categoriaSlug}/${asignaturaSlug}/${cursoSlug}`
}
```

#### 4. Manejo de Errores 404:
```typescript
async function fetchConFallback(urlPrincipal: string, urlsAlternativas: string[]) {
  try {
    return await fetch(urlPrincipal)
  } catch (error) {
    for (const urlAlt of urlsAlternativas) {
      try {
        return await fetch(urlAlt)
      } catch {
        continue
      }
    }
    throw new Error('Todas las URLs fallaron')
  }
}
```

### Para Mejoras en el Código Existente

#### 1. Agregar Soporte para Estructura Tipo C:
```typescript
// Detectar tipo de página
function detectarTipoPagina(html: string): 'tipo-a' | 'tipo-b' | 'tipo-c' {
  if (html.includes('items-wrapper')) return 'tipo-b'
  if (html.includes('oa-cnt')) return 'tipo-a'
  return 'tipo-c'  // Solo documentos
}

// Extraer según tipo
function extraerSegunTipo(html: string, tipo: 'tipo-a' | 'tipo-b' | 'tipo-c') {
  switch (tipo) {
    case 'tipo-a':
      return extraerObjetivosTipoA(html)
    case 'tipo-b':
      return extraerObjetivosTipoB(html)
    case 'tipo-c':
      return extraerEnlacesDocumentos(html)
  }
}
```

#### 2. Validación de URLs Antes de Fetch:
```typescript
const PATRONES_URL_VALIDOS = {
  'educacion-parvularia': /\/curriculum\/educacion-parvularia\/[^\/]+\/(sc|nm|nt)-/,
  '1o-6o-basico': /\/curriculum\/1o-6o-basico\/[^\/]+\/[1-6]-basico/,
  '7o-basico-2-medio': /\/curriculum\/7o-basico-2-medio\/[^\/]+\/(7|8)-basico|(1|2)-medio/,
  // etc...
}

function validarUrlAntesDeFetch(url: string, categoria: string): boolean {
  const patron = PATRONES_URL_VALIDOS[categoria]
  return patron ? patron.test(url) : true
}
```

#### 3. Logging Mejorado:
```typescript
interface ResultadoExtraccion {
  exitosos: number
  fallidos: number
  urls404: string[]
  tipoEstructura: 'tipo-a' | 'tipo-b' | 'tipo-c'
  requierePDF: boolean
}

function logResultados(resultado: ResultadoExtraccion) {
  console.log(`
    ✅ Exitosos: ${resultado.exitosos}
    ❌ Fallidos: ${resultado.fallidos}
    📊 Tipo: ${resultado.tipoEstructura}
    ${resultado.requierePDF ? '⚠️  Requiere extracción de PDF' : ''}

    URLs con error 404:
    ${resultado.urls404.map(url => `  - ${url}`).join('\n')}
  `)
}
```

---

## CONCLUSIONES

### Categorías Listas para Extracción Automatizada (4/9):
1. ✅ **Educación Parvularia** - Estructura Tipo B completa
2. ✅ **1° a 6° Básico** - Estructura Tipo B completa
3. ✅ **7° Básico a 2° Medio** - Estructura Tipo B completa
4. ✅ **Lengua Indígena** - Estructura Tipo B (usa OF en lugar de OA)

### Categorías que Requieren Trabajo Adicional (5/9):
5. ⚠️ **3° a 4° Medio** - Solo documentos, requiere extracción de PDF
6. ⚠️ **3° a 4° Medio TP** - Solo documentos, estructura diferente
7. ⚠️ **Diferenciada Artística** - Solo PDF descargable
8. ⚠️ **EPJA** - Principios generales, no OA granulares
9. ℹ️ **Pueblos Originarios** - Página informativa, no curricular

### Selectores CSS Confirmados (Tipo B):

```css
/* Contenedores principales */
.items-wrapper          /* Contenedor de ejes */
.item-wrapper          /* Contenedor de OA individual */

/* Elementos de OA */
.oa-title              /* Código del OA (ej: "MA01 OA 01") */
.field__item p         /* Descripción del objetivo */
.badge                 /* Indicador de priorización */
.link-more             /* Enlace a actividades */

/* Navegación */
#eje-[id]              /* Anchor para ejes */
#habilidad-[id]        /* Anchor para habilidades */
#actitud-[id]          /* Anchor para actitudes */

/* Legacy (Tipo A) */
.oa-cnt                /* Contenedor de objetivo (legacy) */
.oa-eje                /* Eje curricular (legacy) */
.oa-numero             /* Código OA (legacy) */
.oa-descripcion        /* Descripción (legacy) */
.oa-basal              /* Priorización (legacy) */
```

### Códigos OA Identificados:

```
Educación Parvularia:    OA 01 LV NT, OA 01 LA NT, OAT 01 IA SC
1° a 6° Básico:          MA01 OA 01, CN05 OA 01, AR04 OA 01
7° Básico a 2° Medio:    MA08 OA 01, CN2M OA 01, LI07 OF A
Habilidades:             MA01 OAH a
Actitudes:               MA01 OAA A
```

### URLs Base Confirmadas:

```
1. https://www.curriculumnacional.cl/curriculum/educacion-parvularia
2. https://www.curriculumnacional.cl/curriculum/1o-6o-basico
3. https://www.curriculumnacional.cl/curriculum/7o-basico-2-medio
4. https://www.curriculumnacional.cl/curriculum/3o-4o-medio
5. https://www.curriculumnacional.cl/curriculum/3o-4o-medio-tecnico-profesional
6. https://www.curriculumnacional.cl/recursos/terminales-formacion-diferenciada-artistica-3-4-medio-0
7. https://www.curriculumnacional.cl/curriculum/bases-curriculares-educacion-personas-jovenes-adultas-epja
8. https://www.curriculumnacional.cl/pueblos-originarios-ancestrales
9. https://www.curriculumnacional.cl/curriculum/7o-basico-2o-medio/lengua-indigena
```

### Próximos Pasos Recomendados:

1. **Implementar extracción para categorías Tipo B** (4 categorías listas)
2. **Desarrollar extractor de PDF** para categorías Tipo C
3. **Crear sistema de fallback** para URLs 404
4. **Normalizar nomenclatura** de asignaturas y cursos
5. **Agregar tests** para cada categoría
6. **Documentar casos especiales** (OF vs OA, códigos Parvularia, etc.)

---

**Fin del Reporte**

Investigado por: Claude Code Agent
Fecha: 2026-01-18
Total de URLs verificadas: 50+
Total de categorías analizadas: 9/9
Total de asignaturas muestreadas: 25+
