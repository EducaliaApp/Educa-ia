# GitHub Actions Workflows

Este directorio contiene los workflows de CI/CD para el proyecto.

## Workflows Disponibles

### 1. `deploy-and-migrate.yml` - Deploy y Migraciones de Base de Datos

**Trigger**: 
- PR merged a `main` o `production`
- Push directo a `main` o `production`
- Ejecución manual (workflow_dispatch)

**Funcionalidad**:
- ✅ Ejecuta migraciones de Supabase automáticamente
- ✅ Repara conflictos históricos de migración
- ✅ Verifica estado de la base de datos
- ✅ Trigger deployment a Vercel

**Jobs**:
1. **migrate**: Ejecuta migraciones usando `supabase db push`
   - Repara automáticamente migraciones huérfanas (00, 01, 02)
   - Maneja conflictos de versión 20250115
2. **verify**: Verifica el schema de la base de datos
3. **deploy**: Trigger deployment a Vercel

**Secrets requeridos**:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_ID`

### 2. `deploy-edge-functions.yml` - Deploy de Edge Functions

**Trigger**:
- PR merged a `main` o `production` con cambios en `supabase/functions/**`
- Ejecución manual (workflow_dispatch)

**Funcionalidad**:
- ✅ Despliega Edge Functions de Supabase automáticamente
- ✅ Permite desplegar todas las funciones o una específica
- ✅ Verifica deployment con `supabase functions list`
- ✅ Genera documentación de funciones desplegadas

**Jobs**:
1. **deploy-functions**: Despliega Edge Functions
   - Deploy individual: especifica `function_name` en workflow_dispatch
   - Deploy masivo: deja `function_name` vacío
2. **update-docs**: Genera lista de funciones desplegadas

**Secrets requeridos**:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`

**Uso manual**:
```bash
# Desde GitHub UI: Actions → Deploy Edge Functions → Run workflow
# Selecciona:
# - Environment: staging/production
# - Function name: (vacío para todas) o nombre específico
```

### 3. Otros Workflows

- **`pipeline-curriculum-nacional.yaml`**: Pipeline para scraping de curriculum nacional
- **`pipeline-documentos-mineduc.yml`**: Pipeline para documentos MINEDUC
- **`extract-rubricas-ia.yml`**: Extracción de rúbricas con IA

## Convención de Nombres para Migraciones

### Formato

```
YYYYMMDDXXX_descripcion_migracion.sql
```

**Componentes**:
- `YYYYMMDD`: Fecha en formato año-mes-día (ej: 20250115)
- `XXX`: Número de secuencia de 3 dígitos (001, 002, 003, etc.)
- `descripcion_migracion`: Descripción corta en snake_case

**Ejemplos**:
```
20250115001_user_role_management.sql
20250115002_procesos_etl.sql
20250115003_add_timestamps.sql
```

### ¿Por qué usar secuencia?

El workflow `deploy-and-migrate.yml` tiene lógica especial para reparar conflictos cuando hay múltiples migraciones con el mismo prefijo de fecha (`20250115`). Usar una secuencia de 3 dígitos:

1. ✅ **Evita conflictos**: Cada migración tiene un ID único
2. ✅ **Orden claro**: Las migraciones se ejecutan en orden numérico
3. ✅ **Compatible con CI**: El workflow puede manejarlas sin repair
4. ✅ **Legible**: Es fácil ver el orden de aplicación

### Lógica de Repair en CI

El workflow tiene esta lógica (líneas 99-113 de `deploy-and-migrate.yml`):

```yaml
# Check if remote has migration 20250115 that CLI can't reconcile
if echo "$MIGRATION_LIST" | grep -E "^\s+\|\s*20250115\s+\|" > /dev/null 2>&1; then
  echo "⚠️  Found migration version conflict for 20250115"
  echo "Marking it as reverted to allow fresh migration..."
  supabase migration repair --status reverted 20250115
fi
```

Esto maneja casos históricos donde se usó solo `20250115_` sin secuencia, causando conflictos. **Nuevas migraciones deben usar la secuencia** para evitar este problema.

## Mejores Prácticas

### Migraciones

1. **Siempre usar secuencia**: `20250115001_`, `20250115002_`, etc.
2. **Nombres descriptivos**: `add_procesos_etl`, no solo `update`
3. **Una migración por cambio**: No mezclar múltiples cambios
4. **Probar localmente**: `supabase db push` antes de commit
5. **Documentar**: Comentar cambios complejos en el SQL

### Edge Functions

1. **Probar localmente**: `supabase functions serve` antes de deploy
2. **Actualizar deno.json**: Agregar imports necesarios
3. **Documentar**: README en cada función con ejemplos de uso
4. **Verificar JWT**: Usar `--no-verify-jwt` solo si es necesario
5. **Logs**: Usar `console.log` para debugging, visible en Dashboard

### Workflow Dispatch

Ambos workflows soportan ejecución manual:

**Migraciones**:
```bash
# GitHub UI: Actions → Deploy and Run Migrations → Run workflow
# Selecciona environment: staging/production
```

**Edge Functions**:
```bash
# GitHub UI: Actions → Deploy Edge Functions → Run workflow
# Selecciona:
# - Environment: staging/production
# - Function name: extraer-bases-curriculares (o vacío para todas)
```

## Troubleshooting

### Error: "Migration version conflict"

**Síntoma**: Workflow falla con mensaje sobre conflicto de versión 20250115

**Solución**: El workflow automáticamente repara esto. Si persiste:
```bash
supabase migration repair --status reverted 20250115
```

### Error: "Function deployment failed"

**Síntoma**: Edge Function no se despliega

**Causas comunes**:
1. Syntax error en TypeScript
2. Falta import en deno.json
3. Dependencia no disponible en Deno
4. Timeout (función muy pesada)

**Solución**:
1. Probar localmente: `supabase functions serve nombre-funcion`
2. Verificar logs en Dashboard → Edge Functions
3. Revisar imports en deno.json
4. Optimizar código si es muy pesado

### Error: "Orphaned migrations"

**Síntoma**: Workflow menciona migraciones huérfanas (00, 01, 02)

**Solución**: El workflow automáticamente las marca como revertidas. Esto es normal para migraciones legacy.

## Monitoreo

### Post-Deployment

Después de cada deployment:

1. **Verificar Logs**:
   - Supabase Dashboard → Logs
   - GitHub Actions → Workflow run logs

2. **Probar Endpoints**:
   - Edge Functions: Supabase Dashboard → Edge Functions → Test
   - Database: Ejecutar queries de verificación

3. **Revisar Errores**:
   - Dashboard → Edge Functions → Logs
   - Dashboard → Database → Query logs

## Referencias

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
