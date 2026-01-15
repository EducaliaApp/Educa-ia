# Configuración CI/CD para Migraciones Automáticas

Este documento explica cómo configurar y utilizar el pipeline CI/CD para ejecutar migraciones de Supabase automáticamente.

> **⚠️ IMPORTANTE**: Las migraciones deben seguir un formato de nombre específico. Ver [MIGRATION_NAMING_GUIDE.md](MIGRATION_NAMING_GUIDE.md) para detalles.

## 📋 Descripción General

El workflow `deploy-and-migrate.yml` automatiza la ejecución de migraciones de base de datos durante el proceso de deployment, eliminando la necesidad de ejecutar `supabase migration up` manualmente.

## 🚀 Características

- ✅ Ejecuta migraciones automáticamente en cada push a `main` o `production`
- ✅ Verifica que las migraciones se aplicaron correctamente
- ✅ Soporta ejecución manual con selección de ambiente
- ✅ Se ejecuta antes del deployment de Vercel
- ✅ Notifica si hay errores en las migraciones
- ✅ Valida formato de nombres de archivos de migración

## 🔧 Requisitos Previos

### 1. Instalar Supabase CLI localmente (opcional pero recomendado)

```bash
npm install -g supabase
```

### 2. Configurar Secrets en GitHub

Debes agregar los siguientes secrets en tu repositorio de GitHub:

1. Ve a: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

2. Agrega estos secrets:

| Secret | Descripción | Dónde obtenerlo |
|--------|-------------|-----------------|
| `SUPABASE_ACCESS_TOKEN` | Token de acceso a Supabase | [Supabase Dashboard](https://app.supabase.com/account/tokens) → Account → Access Tokens → Generate new token |
| `SUPABASE_PROJECT_ID` | ID del proyecto Supabase | URL de tu proyecto: `https://app.supabase.com/project/[PROJECT_ID]` o Dashboard → Project Settings → General → Reference ID |
| `SUPABASE_DB_PASSWORD` | Password de la base de datos | Dashboard → Project Settings → Database → Database password (o la que definiste al crear el proyecto) |

### 3. Obtener Supabase Access Token

```bash
# Opción 1: Via CLI
supabase login

# Opción 2: Via Dashboard
# 1. Ir a https://app.supabase.com/account/tokens
# 2. Click en "Generate new token"
# 3. Dale un nombre (ej: "GitHub Actions")
# 4. Copiar el token y agregarlo a GitHub Secrets
```

### 4. Obtener Project ID

```bash
# Opción 1: Via CLI (si ya hiciste login y link)
supabase projects list

# Opción 2: Via Dashboard
# Está en la URL: https://app.supabase.com/project/[aqui-esta-el-id]
# O en: Project Settings → General → Reference ID
```

## 📝 Configuración de Secrets (Paso a Paso)

### En GitHub:

1. **Ir a tu repositorio** → `Settings` (pestaña superior)

2. **En el menú lateral** → `Secrets and variables` → `Actions`

3. **Click en** `New repository secret`

4. **Agregar cada secret:**

   **Secret 1: SUPABASE_ACCESS_TOKEN**
   ```
   Name: SUPABASE_ACCESS_TOKEN
   Value: [tu-token-de-supabase]
   ```

   **Secret 2: SUPABASE_PROJECT_ID**
   ```
   Name: SUPABASE_PROJECT_ID
   Value: [tu-project-id]
   ```

   **Secret 3: SUPABASE_DB_PASSWORD**
   ```
   Name: SUPABASE_DB_PASSWORD
   Value: [tu-database-password]
   ```

5. **Verificar** que los 3 secrets aparezcan en la lista

## 🎯 Uso del Workflow

### Ejecución Automática

El workflow se ejecuta automáticamente en estos casos:

1. **Push directo a `main` o `production`:**
   ```bash
   git push origin main
   ```

2. **Merge de Pull Request a `main` o `production`:**
   - Cuando haces merge de un PR, las migraciones se ejecutan automáticamente

### Ejecución Manual

Puedes ejecutar el workflow manualmente desde GitHub:

1. Ve a: `Actions` → `Deploy and Run Migrations`
2. Click en `Run workflow`
3. Selecciona el ambiente (staging/production)
4. Click en `Run workflow`

## 📊 Monitoreo del Workflow

### Ver Logs

1. Ve a la pestaña `Actions` en GitHub
2. Click en el workflow run más reciente
3. Click en cada job para ver logs detallados:
   - **migrate**: Ejecución de migraciones
   - **verify**: Verificación del esquema
   - **deploy**: Status del deployment

### Estados Posibles

- ✅ **Success**: Migraciones aplicadas correctamente
- ❌ **Failure**: Error en migraciones (requiere revisión manual)
- ⏭️ **Skipped**: No se aplicaron migraciones (no hay cambios)

## 🔄 Flujo de Trabajo Típico

> **📖 Ver [MIGRATION_NAMING_GUIDE.md](MIGRATION_NAMING_GUIDE.md)** para detalles completos sobre el formato de nombres de migraciones.

### 1. Desarrollo Local

```bash
# 1. Crear nueva migración (automáticamente genera el timestamp correcto)
supabase migration new nombre_de_migracion

# Esto crea: supabase/migrations/YYYYMMDDHHmmss_nombre_de_migracion.sql

# 2. Editar el archivo en supabase/migrations/
# 3. Probar localmente (opcional)
supabase db reset

# 4. Commit y push
git add supabase/migrations/
git commit -m "feat: add new migration"
git push origin feature/nueva-migracion
```

### 2. Pull Request

```bash
# Crear PR desde tu branch a main
# El workflow NO se ejecuta en el PR abierto (solo al merge)
```

### 3. Merge a Main

```bash
# Al hacer merge del PR:
# 1. GitHub ejecuta el workflow automáticamente
# 2. Aplica las migraciones a la BD de producción
# 3. Verifica que se aplicaron correctamente
# 4. Despliega la aplicación a Vercel
```

## 🛡️ Seguridad y Mejores Prácticas

### ✅ Recomendaciones

1. **Nunca commitees secrets** al repositorio
2. **Usa environments** de GitHub para separar staging/production
3. **Prueba migraciones localmente** antes de hacer merge
4. **Revisa logs** después de cada deployment
5. **Mantén backups** antes de migraciones grandes

### ⚠️ Consideraciones Importantes

1. **Migraciones son irreversibles** en producción
2. **No hagas rollback manual** sin consultar los logs
3. **Si falla una migración**, el deployment se detiene
4. **Verifica datos sensibles** antes de hacer DROP o DELETE
5. **Nombres de archivos deben seguir el formato `YYYYMMDDHHmmss_description.sql`** - ver [MIGRATION_NAMING_GUIDE.md](MIGRATION_NAMING_GUIDE.md)

## 🔍 Troubleshooting

### Error: "file name must match pattern"

```
Skipping migration schema-rubricas.sql...
(file name must match pattern "<timestamp>_name.sql")
```

**Causa**: El archivo de migración no sigue el formato requerido `YYYYMMDDHHmmss_description.sql`

**Solución**:
1. Mueve el archivo a `supabase/migrations/archive/` si ya fue aplicado manualmente
2. O renómbralo usando `supabase migration new` para generar uno nuevo con el formato correcto
3. Ver [MIGRATION_NAMING_GUIDE.md](MIGRATION_NAMING_GUIDE.md) para más detalles

### Error: "duplicate key value violates unique constraint"

```
ERROR: duplicate key value violates unique constraint "pg_namespace_nspname_index"
```

**Causa**: Intentando aplicar migraciones que ya fueron ejecutadas manualmente o hay contenido duplicado

**Solución**:
1. Verifica qué migraciones ya están aplicadas: `supabase migration list`
2. Si las migraciones están duplicadas, muévelas a `supabase/migrations/archive/`
3. Ver las migraciones archivadas en `supabase/migrations/archive/README.md`

### Error: "Authentication failed"

```bash
# Verificar que el token sea válido
# Regenerar token en Supabase Dashboard si es necesario
```

### Error: "Project not found"

```bash
# Verificar SUPABASE_PROJECT_ID
# Debe ser el Reference ID, no el nombre del proyecto
```

### Error: "Database connection failed"

```bash
# Verificar SUPABASE_DB_PASSWORD
# Asegurarse de que coincida con el password actual de la BD
```

### Migración se aplicó pero con errores

```bash
# 1. Revisar logs del workflow
# 2. Conectarse a Supabase Dashboard → SQL Editor
# 3. Verificar estado de la migración:
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 10;

# 4. Si es necesario, revertir manualmente o crear migración correctiva
```

## 📚 Recursos Adicionales

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)

## 🔄 Actualización del Workflow

Si necesitas modificar el workflow:

1. Edita `.github/workflows/deploy-and-migrate.yml`
2. Commit y push los cambios
3. El workflow actualizado se usará en el próximo run

## ✅ Checklist de Configuración

Antes de usar el workflow por primera vez, verifica:

- [ ] Supabase Access Token agregado a GitHub Secrets
- [ ] Supabase Project ID agregado a GitHub Secrets
- [ ] Database Password agregado a GitHub Secrets
- [ ] Workflow file existe en `.github/workflows/deploy-and-migrate.yml`
- [ ] Branch `main` o `production` configurada como protected
- [ ] Primera ejecución manual exitosa
- [ ] Logs revisados y sin errores

## 📞 Soporte

Si tienes problemas con la configuración:
1. Revisa los logs del workflow en GitHub Actions
2. Verifica que todos los secrets estén correctamente configurados
3. Consulta la documentación oficial de Supabase CLI

---

**Nota:** Este workflow asume que tienes un proyecto de Supabase configurado y migraciones en `supabase/migrations/`. Si es tu primera vez configurando esto, asegúrate de tener el proyecto inicializado correctamente.
