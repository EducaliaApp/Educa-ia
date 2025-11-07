# Documentación: Componentes de Portafolio Implementados

Este documento detalla todos los componentes creados para el sistema de portafolios de ProfeFlow, cómo usarlos, e integrarlos en el flujo completo.

---

## 📦 COMPONENTES IMPLEMENTADOS

### 1. Hook de Guardado Automático

**Archivo:** `hooks/useAutoSave.ts`

Hook personalizado que implementa guardado automático con debounce de 30 segundos.

#### Uso:

```typescript
import { useAutoSave } from '@/hooks/useAutoSave'

const { isSaving, lastSaved, error, saveNow } = useAutoSave({
  data: formData, // Datos a guardar
  onSave: async (data) => {
    // Función que guarda los datos
    await supabase
      .from('tareas_portafolio')
      .update({ contenido: data })
      .eq('id', tareaId)
  },
  delay: 30000, // 30 segundos (configurable)
  enabled: !readOnly, // Habilitar/deshabilitar
})
```

#### Características:
- ✅ Debouncing automático
- ✅ Detección de cambios
- ✅ Guardado manual con `saveNow()`
- ✅ Manejo de errores
- ✅ Timestamp del último guardado

---

### 2. Indicador de Guardado Automático

**Archivo:** `components/ui/AutoSaveIndicator.tsx`

Componente visual que muestra el estado del guardado.

#### Uso:

```tsx
<AutoSaveIndicator
  isSaving={isSaving}
  lastSaved={lastSaved}
  error={saveError}
/>
```

#### Estados visuales:
- 🔵 **Guardando...** (con spinner)
- ✅ **Guardado hace X minutos**
- ❌ **Error al guardar**
- ⚪ **Sin cambios**

---

### 3. Editores de Tareas - Módulo 1

#### 3.1 Editor Tarea 1A: Planificación

**Archivo:** `components/portafolio/editores/Tarea1AEditor.tsx`

Editor completo para diseñar 3 experiencias de aprendizaje.

**Estructura de datos:**

```typescript
interface SeccionA_Planificacion {
  experiencia_1: ExperienciaAprendizaje
  experiencia_2: ExperienciaAprendizaje
  experiencia_3: ExperienciaAprendizaje
}

interface ExperienciaAprendizaje {
  objetivo_aprendizaje: string
  conocimientos_previos: string
  actividades: Actividad[] // Inicio, desarrollo, cierre
  recursos: string[]
  tiempo_estimado: string
  atencion_diversidad: string
}
```

**Uso en página:**

```tsx
import { Tarea1AEditor } from '@/components/portafolio/editores/Tarea1AEditor'

<Tarea1AEditor
  tareaId={tareaId}
  initialData={tarea.contenido?.seccion_a}
  onSave={async (data) => {
    await supabase
      .from('tareas_portafolio')
      .update({
        contenido: { ...tarea.contenido, seccion_a: data }
      })
      .eq('id', tareaId)
  }}
  readOnly={portafolio.estado === 'enviado'}
/>
```

**Características:**
- ✅ 3 experiencias expandibles/colapsables
- ✅ Gestión de actividades (agregar/eliminar)
- ✅ Gestión de recursos
- ✅ Validación con Zod
- ✅ Guardado automático integrado
- ✅ Indicador de completitud por experiencia
- ✅ Contador de caracteres

---

#### 3.2 Editor Tarea 1B: Fundamentación

**Archivo:** `components/portafolio/editores/Tarea1BEditor.tsx`

Editor para fundamentar decisiones pedagógicas sobre una experiencia seleccionada.

**Estructura de datos:**

```typescript
interface SeccionB_Fundamentacion {
  experiencia_seleccionada: '1' | '2' | '3'
  fundamentacion_decisiones: string // 100-1000 caracteres
  consideracion_diversidad: string // 100-800 caracteres
  conexion_conocimientos_previos: string // 100-800 caracteres
  promocion_aprendizaje_profundo: string // 100-800 caracteres
}
```

**Características:**
- ✅ Selector de experiencia
- ✅ 4 campos de reflexión pedagógica
- ✅ Validación de longitud mínima/máxima
- ✅ Indicadores de calidad pedagógica
- ✅ Barra de progreso

---

#### 3.3 Editor Tarea 2A: Estrategia de Monitoreo

**Archivo:** `components/portafolio/editores/Tarea2AEditor.tsx`

Editor para estrategia de evaluación formativa.

**Estructura de datos:**

```typescript
interface SeccionA_EstrategiaMonitoreo {
  estrategia_descrita: string
  instrumentos_utilizados: string[]
  criterios_evaluacion: string
  momento_aplicacion: string
}
```

---

#### 3.4 Editor Tarea 3: Reflexión Socioemocional

**Archivo:** `components/portafolio/editores/Tarea3Editor.tsx`

Editor para reflexión socioemocional (opcional).

**Características:**
- ✅ Badge "Tarea Opcional"
- ✅ Tema socioemocional con icono de corazón
- ✅ 5 secciones de reflexión

---

### 4. Instrucciones de Envío a DocenteMás

**Archivo:** `components/portafolio/InstruccionesEnvio.tsx`

Componente completo con instrucciones paso a paso para enviar el portafolio al MINEDUC.

#### Uso:

```tsx
import { InstruccionesEnvio } from '@/components/portafolio/InstruccionesEnvio'

<InstruccionesEnvio
  portafolio={{
    id: portafolio.id,
    año_evaluacion: 2025,
    asignatura: 'Matemática',
    nivel_educativo: 'basica_1_6',
    fecha_limite: '2025-08-15',
    estado: 'completado',
    video_link: 'https://...'
  }}
  onDescargarPDF={async () => {
    // Lógica para descargar PDF
  }}
  onMarcarEnviado={async () => {
    await supabase
      .from('portafolios')
      .update({
        estado: 'enviado',
        submitted_at: new Date().toISOString()
      })
      .eq('id', portafolio.id)
  }}
/>
```

#### Características:
- ✅ 7 pasos detallados con iconos
- ✅ Cálculo de días restantes hasta fecha límite
- ✅ Badge de alerta si quedan <7 días
- ✅ Enlaces a www.docentemas.cl
- ✅ Información de contacto MINEDUC
- ✅ Botón "Marcar como enviado"
- ✅ Requisitos del video
- ✅ Checklist de módulos

---

### 5. Generador de PDF Oficial MINEDUC

**Archivo:** `lib/pdf/generador-pdf-oficial-mineduc.ts`

Clase completa para generar PDF en formato oficial MINEDUC.

#### Uso directo:

```typescript
import { GeneradorPDFOficialMINEDUC } from '@/lib/pdf/generador-pdf-oficial-mineduc'

const generador = new GeneradorPDFOficialMINEDUC()

await generador.generar({
  profesor: {
    nombre_completo: 'Juan Pérez',
    rut: '12.345.678-9',
    establecimiento: 'Escuela República de Chile',
    rbd: '12345',
    comuna: 'Santiago',
    region: 'Metropolitana'
  },
  portafolio: {
    año_evaluacion: 2025,
    asignatura: 'Matemática',
    nivel_educativo: 'basica_1_6',
    curso: '5° Básico A',
    numero_estudiantes: 32,
    fecha_elaboracion: new Date()
  },
  modulo1: { ... },
  modulo2: { ... },
  modulo3: { ... }
})

generador.descargar('Portafolio_2025_Matematica.pdf')
```

#### O usar la función helper:

```typescript
import { generarYDescargarPDFOficial } from '@/lib/pdf/generador-pdf-oficial-mineduc'

await generarYDescargarPDFOficial(datos)
```

#### Características del PDF:
- ✅ Formato Letter (8.5" x 11")
- ✅ Portada oficial con logo y datos
- ✅ Tabla de contenidos automática
- ✅ Numeración de páginas
- ✅ Estructura por módulos
- ✅ Estilo tipográfico profesional
- ✅ Colores institucionales
- ✅ Metadatos completos

---

### 6. Componente de Exportación PDF

**Archivo:** `components/portafolio/ExportarPDFOficial.tsx`

Componente React que integra el generador de PDF con validación de completitud.

#### Uso:

```tsx
import { ExportarPDFOficial } from '@/components/portafolio/ExportarPDFOficial'

<ExportarPDFOficial
  portafolio={portafolioCompleto}
  disabled={false}
  onExportSuccess={() => {
    toast.success('PDF generado exitosamente')
  }}
  onExportError={(error) => {
    toast.error(`Error: ${error.message}`)
  }}
/>
```

#### Características:
- ✅ Validación de completitud antes de exportar
- ✅ Lista de módulos faltantes
- ✅ Indicador de estado de generación
- ✅ Badge "Generado recientemente"
- ✅ Lista de características del PDF
- ✅ Botón deshabilitado si falta contenido

---

## 🔗 INTEGRACIÓN EN PÁGINAS

### Página de Tarea Individual

**Archivo:** `app/(dashboard)/dashboard/portafolio/[id]/modulo/[numero]/tarea/[tarea]/page.tsx`

```tsx
import { Tarea1AEditor } from '@/components/portafolio/editores/Tarea1AEditor'
import { Tarea1BEditor } from '@/components/portafolio/editores/Tarea1BEditor'
import { Tarea2AEditor } from '@/components/portafolio/editores/Tarea2AEditor'
import { Tarea3Editor } from '@/components/portafolio/editores/Tarea3Editor'

export default async function TareaPage({ params }) {
  const { id: portafolioId, numero: moduloNum, tarea: tareaNum } = await params

  // Obtener datos de la tarea
  const { data: tarea } = await supabase
    .from('tareas_portafolio')
    .select('*, modulo:modulos_portafolio!inner(*)')
    .eq('id', tareaId)
    .single()

  // Renderizar editor según módulo y tarea
  const renderEditor = () => {
    const key = `${moduloNum}-${tareaNum}`

    switch (key) {
      case '1-1':
        return (
          <Tarea1AEditor
            tareaId={tarea.id}
            initialData={tarea.contenido?.seccion_a}
            onSave={handleSave}
            readOnly={isReadOnly}
          />
        )
      case '1-2':
        return <Tarea1BEditor {...props} />
      case '1-3':
        return <Tarea2AEditor {...props} />
      case '1-4':
        return <Tarea3Editor {...props} />
      default:
        return <div>Editor en desarrollo</div>
    }
  }

  return (
    <div className="container mx-auto py-8">
      {renderEditor()}
    </div>
  )
}
```

---

### Página de Descarga

**Archivo:** `app/(dashboard)/dashboard/portafolio/[id]/descargar/page.tsx` *(CREAR)*

```tsx
import { ExportarPDFOficial } from '@/components/portafolio/ExportarPDFOficial'
import { InstruccionesEnvio } from '@/components/portafolio/InstruccionesEnvio'

export default async function DescargarPage({ params }) {
  const { id } = await params

  // Obtener portafolio completo
  const { data: portafolio } = await supabase
    .from('portafolios')
    .select(`
      *,
      profesor:profiles!profesor_id(*),
      modulos:modulos_portafolio(
        *,
        tareas:tareas_portafolio(*)
      )
    `)
    .eq('id', id)
    .single()

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">Descargar Portafolio</h1>

      <ExportarPDFOficial
        portafolio={portafolio}
        onExportSuccess={() => {}}
      />

      <InstruccionesEnvio
        portafolio={portafolio}
        onDescargarPDF={() => {}}
        onMarcarEnviado={async () => {
          await supabase
            .from('portafolios')
            .update({ estado: 'enviado' })
            .eq('id', id)
        }}
      />
    </div>
  )
}
```

---

## 📋 COMPONENTES PENDIENTES

### 1. Editor Módulo 2 - Video y Ficha

**Archivo:** `components/portafolio/editores/Modulo2Editor.tsx` *(POR CREAR)*

Debe incluir:
- Subidor de video (Supabase Storage)
- Preview de video
- Editor de ficha descriptiva
- Marcador de segmentos clave del video

---

### 2. Editor Módulo 3 - Trabajo Colaborativo

**Archivo:** `components/portafolio/editores/Modulo3Editor.tsx` *(POR CREAR)*

Debe incluir:
- Parte obligatoria (3 secciones)
- Parte voluntaria (toggle para habilitar/deshabilitar)
- Distinción entre secciones grupales e individuales

---

### 3. Validación de Completitud

**Archivo:** `lib/portafolio/validacion-completitud.ts` *(POR CREAR)*

Función que verifica si un portafolio está completo:

```typescript
export function validarCompletitudPortafolio(portafolio: any) {
  const errores: string[] = []

  // Módulo 1: Tareas 1 y 2 obligatorias
  if (!portafolio.modulo1?.tarea1) {
    errores.push('Falta Tarea 1: Planificación')
  }

  if (!portafolio.modulo1?.tarea2) {
    errores.push('Falta Tarea 2: Evaluación')
  }

  // Módulo 2: Video y ficha obligatorios
  if (!portafolio.modulo2?.video) {
    errores.push('Falta video de clase (Módulo 2)')
  }

  if (!portafolio.modulo2?.ficha) {
    errores.push('Falta ficha descriptiva (Módulo 2)')
  }

  // Módulo 3: Parte obligatoria
  if (!portafolio.modulo3?.parte_obligatoria) {
    errores.push('Falta parte obligatoria de Trabajo Colaborativo')
  }

  return {
    completo: errores.length === 0,
    errores,
    progreso: calcularProgreso(portafolio)
  }
}
```

---

### 4. Sistema de Marcado como Enviado

**Archivo:** `lib/portafolio/gestionar-estados.ts` *(POR CREAR)*

```typescript
export async function marcarComoEnviado(
  portafolioId: string,
  supabase: SupabaseClient
) {
  // Validar completitud
  const { completo, errores } = await validarCompletitudPortafolio(portafolioId)

  if (!completo) {
    throw new Error(`Portafolio incompleto: ${errores.join(', ')}`)
  }

  // Actualizar estado
  const { error } = await supabase
    .from('portafolios')
    .update({
      estado: 'enviado',
      submitted_at: new Date().toISOString()
    })
    .eq('id', portafolioId)

  if (error) throw error

  return { success: true }
}
```

---

## 🚀 PRÓXIMOS PASOS

### Alta Prioridad

1. **Crear editores faltantes:**
   - `Modulo2Editor.tsx` (Video + Ficha)
   - `Modulo3Editor.tsx` (Trabajo Colaborativo)

2. **Implementar subida de video:**
   - Integración con Supabase Storage
   - Progress bar de subida
   - Validación de formato y duración

3. **Completar generador de PDF:**
   - Agregar contenido real de tareas (actualmente placeholder)
   - Formatear JSONB de tareas correctamente
   - Agregar imágenes/gráficos si aplica

### Media Prioridad

4. **Sistema de estados:**
   - Implementar transiciones: borrador → en_revision → completado → enviado
   - Bloqueo de edición cuando estado = 'enviado'
   - Confirmaciones antes de cambiar estado

5. **Validación de completitud:**
   - Función centralizada de validación
   - Warnings en tiempo real
   - Progress bar global del portafolio

### Baja Prioridad

6. **Análisis previo a descarga:**
   - Modal con análisis rápido antes de exportar
   - Sugerencias de último momento

7. **Exportación DOCX:**
   - Instalar biblioteca `docx`
   - Crear generador similar al PDF

8. **Paquete ZIP:**
   - Instalar `JSZip`
   - Empaquetar PDF + DOCX + videos

---

## 🔧 MIGRACIONES NECESARIAS

### Agregar columnas faltantes a `portafolios`:

```sql
ALTER TABLE portafolios
  ADD COLUMN IF NOT EXISTS nombre TEXT,
  ADD COLUMN IF NOT EXISTS curso_aplicacion TEXT,
  ADD COLUMN IF NOT EXISTS numero_estudiantes INTEGER,
  ADD COLUMN IF NOT EXISTS fecha_limite DATE;

CREATE INDEX IF NOT EXISTS idx_portafolios_fecha_limite
  ON portafolios(fecha_limite);
```

### Agregar columna `tipo_modulo` a `modulos_portafolio`:

```sql
UPDATE modulos_portafolio
SET tipo_modulo = CASE
  WHEN numero_modulo = 1 THEN 'planificacion'
  WHEN numero_modulo = 2 THEN 'clase_grabada'
  WHEN numero_modulo = 3 THEN 'trabajo_colaborativo'
END
WHERE tipo_modulo IS NULL;
```

---

## 📝 NOTAS IMPORTANTES

1. **Todos los editores incluyen guardado automático** - No es necesario botón "Guardar"

2. **Validación en tiempo real con Zod** - Los errores se muestran inmediatamente

3. **Componentes read-only** - Todos los editores soportan modo `readOnly` para portafolios enviados

4. **Contador de caracteres** - Los campos con límites muestran "X / Y caracteres"

5. **Progreso visual** - Barras de progreso y badges de completitud

6. **Diseño consistente** - Todos los editores siguen el mismo patrón visual

7. **Accesibilidad** - Uso de componentes UI con labels, descriptions y mensajes de error

---

## 🎨 CONVENCIONES DE DISEÑO

- **Color principal:** Blue-600 (#2563EB)
- **Color secundario:** Gray-500 (#6B7280)
- **Success:** Green-600
- **Warning:** Yellow-600
- **Error:** Red-600

- **Iconos:** Lucide React
- **Tipografía:** Helvetica/Sans-serif
- **Espaciado:** Tailwind spacing scale

---

## 🧪 TESTING

Para probar los componentes:

1. Crear un portafolio nuevo
2. Navegar a una tarea específica
3. Llenar los campos
4. Observar guardado automático (30 segundos)
5. Verificar que el indicador muestre "Guardado hace X segundos"
6. Recargar página y verificar persistencia
7. Completar todos los módulos
8. Ir a página de descarga
9. Generar PDF oficial
10. Seguir instrucciones de envío

---

**Última actualización:** 2025-01-07
**Versión:** 1.0
**Autor:** Claude Code
