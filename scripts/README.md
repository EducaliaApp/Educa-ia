# Scripts de Administración ProfeFlow

Este directorio contiene scripts útiles para tareas de administración, mantenimiento y desarrollo.

## 📋 Índice de Scripts

### Migraciones de Base de Datos

#### `sync-orphaned-migrations.sh`
Sincroniza migraciones que existen en la base de datos remota pero no en el repositorio local.

**Uso:**
```bash
./scripts/sync-orphaned-migrations.sh
```

**¿Cuándo usar?**
- Cuando el CI/CD falla con error: "Remote migration versions not found in local migrations directory"
- Después de que alguien ejecute migraciones directamente en producción
- Al cambiar de rama y encontrar desincronización con remoto

**Qué hace:**
1. Lista todas las migraciones y detecta huérfanas (remoto sin local)
2. Marca las migraciones huérfanas como "revertidas" en el historial
3. Descarga las migraciones desde la base de datos remota usando `supabase db pull`
4. Verifica que los archivos se hayan descargado correctamente
5. Muestra instrucciones para commitear los cambios

**Ejemplo de output:**
```
🔍 Sincronizador de Migraciones Huérfanas de Supabase
=====================================================

📋 Paso 1: Verificando estado de migraciones...

⚠️  Se encontraron 1 migración(es) huérfana(s):
   - 20260116202916

¿Deseas sincronizar estas migraciones? (s/N): s

📋 Paso 2: Marcando migraciones como revertidas...
   ✓ 20260116202916 marcada como revertida

📋 Paso 3: Descargando migraciones desde remoto...
✅ Migraciones descargadas exitosamente

✅ Sincronización completada
```

**Requisitos:**
- Supabase CLI instalado (`brew install supabase/tap/supabase`)
- Proyecto Supabase enlazado (`supabase link`)
- Variables de entorno configuradas (SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD)

---

#### `run-migrations.ts`
Ejecuta migraciones de base de datos de forma programática.

**Uso:**
```bash
npm run migrate
# o
npx tsx scripts/run-migrations.ts
```

---

### Gestión de Usuarios

#### `create-admin.js`
Crea un usuario administrador en el sistema.

**Uso:**
```bash
node scripts/create-admin.js
```

**Variables de entorno requeridas:**
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key de Supabase
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase

---

### ETL y Datos Curriculares

#### `seed-rubricas-mbe.ts`
Carga las rúbricas del Marco para la Buena Enseñanza (MBE) en la base de datos.

**Uso:**
```bash
npx tsx scripts/seed-rubricas-mbe.ts
```

**Qué hace:**
- Lee los archivos JSON de rúbricas MBE
- Inserta o actualiza las rúbricas en la tabla `rubricas_mbe`
- Valida la estructura de datos antes de insertar

---

## 🔧 Configuración General

### Variables de Entorno

La mayoría de los scripts requieren las siguientes variables de entorno:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ACCESS_TOKEN=your-access-token
SUPABASE_DB_PASSWORD=your-db-password
SUPABASE_PROJECT_ID=your-project-id
```

### Instalación de Dependencias

```bash
# Node.js/TypeScript scripts
npm install

# Supabase CLI
brew install supabase/tap/supabase
```

## 📚 Documentación Relacionada

- [Guía de Troubleshooting de Migraciones](../docs/MIGRATION_TROUBLESHOOTING.md)
- [Guía de Deployment](../docs/DEPLOYMENT_GUIDE.md)
- [ETL Testing Guide](../docs/ETL_TESTING_GUIDE.md)

## 🚨 Notas Importantes

### Seguridad
- **NUNCA** commitees variables de entorno o claves secretas
- Usa `.env.local` para desarrollo local (ignorado por git)
- En producción, usa secrets de GitHub Actions o variables de entorno de Vercel

### Backups
Antes de ejecutar scripts que modifiquen datos en producción:
1. Haz un backup de la base de datos
2. Prueba primero en staging
3. Verifica que tienes forma de revertir los cambios

### Permisos
Algunos scripts requieren permisos de `service_role`. Úsalos con cuidado y solo cuando sea necesario.

## 🆘 Soporte

Si encuentras problemas:
1. Revisa la documentación en `/docs`
2. Verifica que las variables de entorno estén configuradas
3. Consulta los logs de Supabase en el dashboard
4. Crea un issue en GitHub con detalles del error

---

**Última actualización:** 2026-01-16  
**Mantenedor:** Equipo DevOps
