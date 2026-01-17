# Resolución de Conflicto de Versión de Migraciones

## Problema Detectado

El workflow de GitHub Actions `deploy-and-migrate.yml` estaba fallando con el siguiente error:

```
ERROR: duplicate key value violates unique constraint "schema_migrations_pkey" (SQLSTATE 23505)
Key (version)=(20250115) already exists.
```

## Causa Raíz

Dos archivos de migración tenían el mismo prefijo de versión `20250115`:
- `20250115_admin_maintainers.sql`
- `20250115_user_role_management.sql`

Cuando Supabase ejecuta las migraciones, intenta insertar cada versión en la tabla `supabase_migrations.schema_migrations` usando el prefijo de fecha como clave primaria. Dado que ambas migraciones tienen la misma fecha sin precisión de sub-segundos, se genera una violación de clave única.

## Solución Implementada

### 1. Renombrar Archivo de Migración
Se renombró el archivo `20250115_user_role_management.sql` a `20250115001_user_role_management.sql`, añadiendo milisegundos (`001`) para crear una versión única.

**Razón del orden**: La migración `user_role_management` depende de la tabla `roles` creada por la migración `admin_maintainers`, por lo que debe ejecutarse después.

### 2. Actualizar Referencias en Documentación

Se actualizaron todas las referencias al nombre antiguo en los siguientes archivos:
- `IMPLEMENTACION_ROLES_RESUMEN.md` (4 ocurrencias)
- `docs/DEPLOYMENT_GUIDE.md` (2 ocurrencias)
- `docs/USER_ROLE_MANAGEMENT.md` (2 ocurrencias)
- `scripts/verify-user-role-system.sh` (4 ocurrencias)

### 3. Orden Final de Migraciones

Las migraciones ahora se ejecutan en el siguiente orden cronológico:
1. `20250106_function_logs.sql`
2. `20250107_fix_nivel_educativo_type.sql`
3. `20250115_admin_maintainers.sql` (crea tabla `roles`)
4. `20250115001_user_role_management.sql` (agrega `role_id` a `profiles`)

## Prevención de Futuros Conflictos

### Convención de Nombres de Migraciones

Seguir el formato recomendado por Supabase:
```
YYYYMMDDHHMMSS_descripcion.sql
```

**Ejemplo**:
```
20250115143022_descripcion.sql  ✅ Correcto (con timestamp completo)
20250115_descripcion.sql        ⚠️  Riesgo de colisión
```

### Comandos Supabase CLI

Para crear migraciones automáticamente con timestamp único:
```bash
supabase migration new descripcion_de_la_migracion
```

Esto genera archivos con formato `YYYYMMDDHHMMSS_descripcion.sql` automáticamente.

### Verificación antes de Commit

Antes de hacer commit de nuevas migraciones, verificar que no existan versiones duplicadas:
```bash
# Listar migraciones ordenadas
ls -1 supabase/migrations/*.sql | sort

# Verificar prefijos únicos (no debe haber duplicados)
ls -1 supabase/migrations/*.sql | cut -d'_' -f1 | sort | uniq -d
```

Si el último comando devuelve algún resultado, hay versiones duplicadas que deben resolverse.

## Testing

Para probar que las migraciones funcionan correctamente:

1. **Localmente** (ambiente de desarrollo):
```bash
supabase db reset  # Resetea la BD local
supabase db push   # Aplica todas las migraciones
```

2. **CI/CD** (GitHub Actions):
El workflow se ejecuta automáticamente al hacer merge a `main` o `production`.

3. **Producción** (Manual si necesario):
```bash
supabase link --project-ref $PROJECT_ID
supabase db push
```

## Referencias

- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [CI_CD_MIGRATIONS_SETUP.md](./CI_CD_MIGRATIONS_SETUP.md)
- [MIGRATION_NAMING_GUIDE.md](./MIGRATION_NAMING_GUIDE.md)

## Fecha de Resolución

**2026-01-15**: Fix implementado y documentado
