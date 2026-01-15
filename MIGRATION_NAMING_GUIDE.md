# Guía de Migraciones de Base de Datos

## 📋 Formato Requerido para Migraciones

Supabase CLI requiere que todas las migraciones sigan un formato específico de nombre para que puedan ser ejecutadas automáticamente en el pipeline CI/CD.

### Patrón de Nombre

```
YYYYMMDDHHmmss_description.sql
```

Donde:
- `YYYY` = Año (4 dígitos)
- `MM` = Mes (2 dígitos, 01-12)
- `DD` = Día (2 dígitos, 01-31)
- `HH` = Hora (2 dígitos, 00-23, UTC)
- `mm` = Minutos (2 dígitos, 00-59)
- `ss` = Segundos (2 dígitos, 00-59)
- `description` = Descripción corta en snake_case

### ✅ Ejemplos Correctos

```
20250106_function_logs.sql
20250107_fix_nivel_educativo_type.sql
20250115_admin_maintainers.sql
20250116120000_add_user_preferences.sql
```

### ❌ Ejemplos Incorrectos

```
01_function_logs.sql              (solo número, sin timestamp)
schema-rubricas.sql                (sin timestamp, formato libre)
2025-01-15_migration.sql          (guiones en lugar de formato compacto)
20250115_Migration.sql            (descripción con mayúsculas)
```

## 🚀 Crear una Nueva Migración

### Usando Supabase CLI (Recomendado)

El CLI automáticamente genera el timestamp correcto:

```bash
# Crear nueva migración
supabase migration new add_user_preferences

# Esto crea algo como:
# supabase/migrations/20250116120543_add_user_preferences.sql
```

### Manualmente (No Recomendado)

Si por alguna razón necesitas crear el archivo manualmente:

1. Obtén el timestamp actual en formato UTC:
   ```bash
   date -u +"%Y%m%d%H%M%S"
   ```

2. Crea el archivo con el formato correcto:
   ```bash
   touch supabase/migrations/20250116120543_your_description.sql
   ```

## 📂 Estructura de Directorios

```
supabase/
└── migrations/
    ├── 20250106_function_logs.sql        ✅ Activa
    ├── 20250107_fix_nivel_educativo.sql  ✅ Activa
    ├── 20250115_admin_maintainers.sql    ✅ Activa
    └── archive/                          📦 Archivadas
        ├── README.md
        ├── 00_create_enums.sql           ❌ Formato antiguo
        ├── 01_function_logs_fixed.sql    ❌ Formato antiguo
        └── schema-rubricas.sql           ❌ Sin formato
```

## 🔄 Flujo de Trabajo

### 1. Desarrollo Local

```bash
# 1. Crear migración
supabase migration new add_new_feature

# 2. Editar el archivo SQL generado
code supabase/migrations/20250116120543_add_new_feature.sql

# 3. Probar localmente (opcional)
supabase db reset

# 4. Verificar que funciona
supabase migration list
```

### 2. Commit y Push

```bash
# Agregar migración al repositorio
git add supabase/migrations/20250116120543_add_new_feature.sql
git commit -m "feat: add new feature migration"
git push origin feature/new-feature
```

### 3. Pull Request y Merge

Cuando haces merge del PR a `main`:
1. ✅ GitHub Actions ejecuta automáticamente
2. ✅ Aplica las nuevas migraciones
3. ✅ Verifica que se aplicaron correctamente
4. ✅ Despliega la aplicación

## ⚠️ Consideraciones Importantes

### Orden de Ejecución

Las migraciones se ejecutan en **orden cronológico** basado en el timestamp:

```
20250106_first.sql    (se ejecuta primero)
20250107_second.sql   (se ejecuta segundo)
20250115_third.sql    (se ejecuta tercero)
```

### No Modificar Timestamps

**Nunca modifiques manualmente el timestamp** de una migración existente:
- ❌ Puede romper el orden de ejecución
- ❌ Puede causar que se ejecute dos veces
- ❌ Puede causar inconsistencias entre ambientes

### Migraciones son Inmutables

Una vez que una migración se ha aplicado en producción:
- ✅ No la modifiques
- ✅ No la elimines
- ✅ Crea una nueva migración para cambios adicionales

## 🐛 Solución de Problemas

### Error: "file name must match pattern"

```
Skipping migration schema-rubricas.sql...
(file name must match pattern "<timestamp>_name.sql")
```

**Solución**: Renombra o mueve el archivo a `archive/`

### Error: "duplicate key value violates unique constraint"

```
ERROR: duplicate key value violates unique constraint
"pg_namespace_nspname_index"
```

**Causas comunes**:
1. Intentando aplicar migraciones que ya fueron ejecutadas manualmente
2. Migraciones con contenido duplicado
3. Schema de migraciones corrupto

**Solución**:
1. Verifica qué migraciones ya están aplicadas:
   ```bash
   supabase migration list
   ```

2. Si las migraciones están duplicadas, muévelas a `archive/`

3. Si el problema persiste, verifica el estado en Supabase Dashboard

### Workflow Falla en CI

Si el workflow falla:
1. Revisa los logs en GitHub Actions → pestaña "Actions"
2. Busca el paso "Run Migrations" y revisa el output
3. Verifica que todos los archivos en `supabase/migrations/` siguen el formato correcto
4. Confirma que no hay migraciones duplicadas

## 📚 Referencias

- [Supabase CLI - Database Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Supabase CLI - supabase db push](https://supabase.com/docs/reference/cli/supabase-db-push)
- [GitHub Actions Workflow](/.github/workflows/deploy-and-migrate.yml)
- [Migraciones Archivadas](/supabase/migrations/archive/README.md)

## ✅ Checklist de Migración

Antes de crear un PR con migraciones:

- [ ] El nombre del archivo sigue el formato `YYYYMMDDHHmmss_description.sql`
- [ ] La descripción es clara y en snake_case
- [ ] El SQL usa `IF NOT EXISTS` para crear objetos
- [ ] El SQL usa `IF EXISTS` para eliminar objetos
- [ ] Probé la migración localmente con `supabase db reset`
- [ ] No modifiqué migraciones existentes
- [ ] Documenté cambios importantes en el commit message
