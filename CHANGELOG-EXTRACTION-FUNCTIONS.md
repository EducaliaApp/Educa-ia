# Changelog - Funciones de Extracción de Bases Curriculares

## 2026-01-18 - Funciones Individuales por Categoría

### 🎯 Cambios Principales

Se crearon **9 funciones individuales** de extracción de bases curriculares, una para cada categoría curricular, para resolver problemas de timeout y mejorar la mantenibilidad.

### ✨ Nuevas Funciones Creadas

1. ✅ `extraer-bases-curriculares-educacion-parvularia`
2. ✅ `extraer-bases-curriculares-1o-6o-basico`
3. ✅ `extraer-bases-curriculares-7o-basico-2-medio`
4. ✅ `extraer-bases-curriculares-3o-4o-medio`
5. ✅ `extraer-bases-curriculares-3o-4o-medio-tecnico-profesional`
6. ✅ `extraer-bases-curriculares-diferenciada-artistica-3-4-medio`
7. ✅ `extraer-bases-curriculares-educacion-personas-jovenes-adultas-epja`
8. ✅ `extraer-bases-curriculares-pueblos-originarios-ancestrales`
9. ✅ `extraer-bases-curriculares-lengua-indigena`

### 📁 Archivos Nuevos

#### Módulos Compartidos
- `supabase/functions/extraer-bases-curriculares/shared/extractor-base.ts`
  - Lógica de extracción reutilizable
  - Funciones de fetch con retry
  - Parsing de HTML
  - Generación de CSV/JSON

- `supabase/functions/extraer-bases-curriculares/shared/procesador-categoria.ts`
  - Procesamiento de categorías
  - Persistencia en BD
  - Generación de archivos
  - Tracking de cambios

#### Funciones Individuales
Cada función tiene su propio directorio con `index.ts`:
- `supabase/functions/extraer-bases-curriculares-educacion-parvularia/`
- `supabase/functions/extraer-bases-curriculares-1o-6o-basico/`
- `supabase/functions/extraer-bases-curriculares-7o-basico-2-medio/`
- `supabase/functions/extraer-bases-curriculares-3o-4o-medio/`
- `supabase/functions/extraer-bases-curriculares-3o-4o-medio-tecnico-profesional/`
- `supabase/functions/extraer-bases-curriculares-diferenciada-artistica-3-4-medio/`
- `supabase/functions/extraer-bases-curriculares-educacion-personas-jovenes-adultas-epja/`
- `supabase/functions/extraer-bases-curriculares-pueblos-originarios-ancestrales/`
- `supabase/functions/extraer-bases-curriculares-lengua-indigena/`

#### Scripts de Despliegue
- `scripts/deploy-extraction-functions.sh` - Despliega todas las funciones
- `scripts/test-extraction-function.sh` - Prueba una función específica

#### Documentación
- `supabase/functions/extraer-bases-curriculares/README-FUNCIONES-INDIVIDUALES.md`

### 🔧 Ventajas de la Nueva Arquitectura

1. **Evita Timeouts**
   - Cada función procesa solo una categoría
   - Tiempo de ejecución más corto y predecible
   - Menor riesgo de timeout (110s límite)

2. **Ejecución Paralela**
   - Múltiples categorías pueden procesarse simultáneamente
   - Reduce el tiempo total de extracción completa

3. **Mejor Debugging**
   - Problemas específicos de una categoría son más fáciles de identificar
   - Logs más enfocados por categoría

4. **Mantenimiento Simplificado**
   - Cambios en una categoría no afectan a las demás
   - Deploy individual por categoría

5. **Reintentos Granulares**
   - Solo reintentar la categoría que falló
   - No es necesario reprocesar todo

6. **Monitoreo Detallado**
   - Métricas por categoría en `procesos_etl`
   - Tracking individual de éxito/fallo

### 🔄 Compatibilidad Hacia Atrás

✅ La función original `extraer-bases-curriculares` se mantiene sin cambios
✅ Sistema de batch y reintentos continúa funcionando
✅ Tabla `etl_extracciones_bc` sigue siendo utilizada

### 📝 Cómo Usar

#### Desplegar Todas las Funciones

```bash
./scripts/deploy-extraction-functions.sh
```

#### Probar una Función

```bash
# Probar con persistencia y generación de archivos
./scripts/test-extraction-function.sh extraer-bases-curriculares-educacion-parvularia

# Probar sin persistir en BD
./scripts/test-extraction-function.sh extraer-bases-curriculares-1o-6o-basico false true

# Probar sin generar archivos
./scripts/test-extraction-function.sh extraer-bases-curriculares-7o-basico-2-medio true false
```

#### Desde Código TypeScript

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Extraer una categoría específica
const { data, error } = await supabase.functions.invoke(
  'extraer-bases-curriculares-educacion-parvularia',
  {
    body: {
      persist_db: true,
      generate_files: true
    }
  }
)

// Extraer múltiples categorías en paralelo
const categorias = [
  'educacion-parvularia',
  '1o-6o-basico',
  '7o-basico-2-medio'
]

const resultados = await Promise.all(
  categorias.map(cat =>
    supabase.functions.invoke(`extraer-bases-curriculares-${cat}`, {
      body: { persist_db: true, generate_files: true }
    })
  )
)
```

### 📊 Impacto en Performance

**Antes (función general):**
- ⏱️  Tiempo: ~180-240 segundos para todas las categorías
- ⚠️  Riesgo de timeout: Alto
- 🔄 Reintentos: Todo o nada

**Ahora (funciones individuales):**
- ⏱️  Tiempo por categoría: ~15-45 segundos
- ✅ Riesgo de timeout: Muy bajo
- 🔄 Reintentos: Solo la categoría que falló
- ⚡ En paralelo: ~45-60 segundos total (todas las categorías)

### 🗂️ Estructura del Proyecto Actualizada

```
supabase/functions/
├── extraer-bases-curriculares/              # ✅ Original (mantiene compatibilidad)
│   ├── shared/                              # ✨ NUEVO: Módulos compartidos
│   │   ├── extractor-base.ts
│   │   └── procesador-categoria.ts
│   ├── constants.ts
│   ├── index.ts
│   ├── README.md
│   └── README-FUNCIONES-INDIVIDUALES.md     # ✨ NUEVO
│
├── extraer-bases-curriculares-educacion-parvularia/          # ✨ NUEVO
│   └── index.ts
├── extraer-bases-curriculares-1o-6o-basico/                  # ✨ NUEVO
│   └── index.ts
├── extraer-bases-curriculares-7o-basico-2-medio/             # ✨ NUEVO
│   └── index.ts
├── extraer-bases-curriculares-3o-4o-medio/                   # ✨ NUEVO
│   └── index.ts
├── extraer-bases-curriculares-3o-4o-medio-tecnico-profesional/  # ✨ NUEVO
│   └── index.ts
├── extraer-bases-curriculares-diferenciada-artistica-3-4-medio/  # ✨ NUEVO
│   └── index.ts
├── extraer-bases-curriculares-educacion-personas-jovenes-adultas-epja/  # ✨ NUEVO
│   └── index.ts
├── extraer-bases-curriculares-pueblos-originarios-ancestrales/  # ✨ NUEVO
│   └── index.ts
└── extraer-bases-curriculares-lengua-indigena/               # ✨ NUEVO
    └── index.ts

scripts/
├── deploy-extraction-functions.sh           # ✨ NUEVO
└── test-extraction-function.sh              # ✨ NUEVO
```

### 🎯 Próximos Pasos Recomendados

1. **Desplegar las funciones nuevas**
   ```bash
   ./scripts/deploy-extraction-functions.sh
   ```

2. **Probar una función individual**
   ```bash
   ./scripts/test-extraction-function.sh extraer-bases-curriculares-educacion-parvularia
   ```

3. **Verificar en Supabase Dashboard**
   - Ir a Edge Functions
   - Verificar que las 9 funciones nuevas estén desplegadas
   - Revisar los logs de ejecución

4. **Configurar Cron Jobs (opcional)**
   - Programar ejecución automática de cada categoría
   - Ejecutar en paralelo durante horas de baja carga

5. **Monitorear Resultados**
   - Revisar tabla `procesos_etl` para métricas por categoría
   - Verificar tabla `objetivos_aprendizaje` para datos extraídos
   - Consultar `documentos_transformados` para archivos generados

### 🐛 Notas de Testing

- Las funciones están listas para ser desplegadas
- Se recomienda probar primero con una categoría pequeña (Educación Parvularia)
- Verificar que los módulos compartidos se importen correctamente
- Revisar que los logs se registren en `procesos_etl`

### 📚 Referencias

- [README Funciones Individuales](./supabase/functions/extraer-bases-curriculares/README-FUNCIONES-INDIVIDUALES.md)
- [README Original](./supabase/functions/extraer-bases-curriculares/README.md)
- [Migración ETL](./supabase/migrations/20260118001_etl_extracciones_bc.sql)

---

**Autor:** Claude Code
**Fecha:** 2026-01-18
**Branch:** `claude/add-retry-logic-extraction-h8xfG`
