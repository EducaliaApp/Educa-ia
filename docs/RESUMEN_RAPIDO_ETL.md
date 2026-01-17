# Resumen Rápido - Corrección Errores ETL

## ¿Qué se arregló?
- ❌ Error CORS al ejecutar extracción desde `/admin/etl`
- ❌ Error 500 al cargar lista de procesos y documentos
- ❌ Edge Function usaba autenticación incorrecta

## Archivos Cambiados
1. `supabase/functions/extraer-bases-curriculares/index.ts` - CORS + auth de usuario
2. `supabase/migrations/20250116001_fix_etl_rpc_permissions.sql` - Permisos RPC + storage
3. `SOLUCION_ERRORES_ETL.md` - Documentación detallada

## Para Desplegar (3 pasos)

### 1. Configurar Variable de Entorno en Supabase
```
Dashboard > Edge Functions > Settings
Variable: ALLOWED_ORIGIN
Valor: https://educa-ia-six.vercel.app
```

### 2. Ejecutar Migración SQL
```
Dashboard > SQL Editor
Pegar contenido de: supabase/migrations/20250116001_fix_etl_rpc_permissions.sql
Ejecutar
```

O via CLI:
```bash
supabase db push
```

### 3. Redesplegar Edge Function
```bash
supabase functions deploy extraer-bases-curriculares
```

O via Dashboard:
```
Edge Functions > extraer-bases-curriculares > Deploy New Version
```

## Verificar que Funciona
1. Ir a `/admin/etl`
2. ✅ Debe cargar lista de procesos sin error 500
3. ✅ Debe cargar lista de documentos sin error 500
4. Click "Ejecutar Extracción"
5. ✅ No debe aparecer error CORS
6. ✅ Debe mostrar progreso o completarse exitosamente

## Si Algo Falla
- Ver `SOLUCION_ERRORES_ETL.md` para troubleshooting detallado
- Revisar logs en: Supabase Dashboard > Edge Functions > Logs
- Revisar console del navegador en `/admin/etl`

## Rollback (si es necesario)
Ver sección "Rollback" en `SOLUCION_ERRORES_ETL.md`
