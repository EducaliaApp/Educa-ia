# Actualizar columnas de metadatos del portafolio

Si Supabase muestra errores como `Could not find the 'curso_aplicacion' column of 'portafolios' in the schema cache`, ejecuta el siguiente script en la base de datos (CLI, SQL editor o `supabase db remote commit`).

```sql
ALTER TABLE portafolios
  ADD COLUMN IF NOT EXISTS nombre TEXT;

ALTER TABLE portafolios
  ADD COLUMN IF NOT EXISTS curso_aplicacion TEXT;

ALTER TABLE portafolios
  ADD COLUMN IF NOT EXISTS numero_estudiantes INTEGER;

ALTER TABLE portafolios
  ADD COLUMN IF NOT EXISTS fecha_limite DATE;

CREATE INDEX IF NOT EXISTS idx_portafolios_fecha_limite ON portafolios(fecha_limite);
CREATE INDEX IF NOT EXISTS idx_portafolios_nombre ON portafolios(nombre);
```

Después de aplicar el script, vuelve a intentar crear o actualizar el portafolio desde el dashboard.

## Sincronizar tabla `modulos_portafolio`

Para el error `Could not find the 'progreso_porcentaje' column of 'modulos_portafolio' in the schema cache`, aplica:

```sql
ALTER TABLE modulos_portafolio
  ADD COLUMN IF NOT EXISTS progreso_porcentaje INTEGER DEFAULT 0;

UPDATE modulos_portafolio
  SET progreso_porcentaje = 0
  WHERE progreso_porcentaje IS NULL;

ALTER TABLE modulos_portafolio
  ALTER COLUMN progreso_porcentaje SET DEFAULT 0;
```

Esto asegura que los módulos creados desde el formulario mantengan el porcentaje de avance sin errores.

## Asignar tipo a los módulos existentes

Si aparece `null value in column "tipo_modulo" of relation "modulos_portafolio" violates not-null constraint`, ejecuta:

```sql
UPDATE modulos_portafolio
SET tipo_modulo = CASE
  WHEN numero_modulo = 1 THEN 'planificacion'
  WHEN numero_modulo = 2 THEN 'clase_grabada'
  WHEN numero_modulo = 3 THEN 'trabajo_colaborativo'
  ELSE 'modulo_generico'
END
WHERE tipo_modulo IS NULL OR tipo_modulo = '';
```

Esto completa datos antiguos y permite que los nuevos registros funcionen con la asignación automática desde el formulario.
