-- Script para eliminar portafolios duplicados
-- Mantiene solo el más reciente (por created_at) de cada grupo de duplicados

-- IMPORTANTE: Ejecuta esto en tu SQL Editor de Supabase

-- 1. Primero, revisa qué duplicados existen
-- (duplicados = mismo profesor_id, año_evaluacion, asignatura, nivel_educativo)

SELECT
  profesor_id,
  año_evaluacion,
  asignatura,
  nivel_educativo,
  COUNT(*) as cantidad,
  STRING_AGG(id::text, ', ') as ids,
  STRING_AGG(created_at::text, ', ') as fechas_creacion
FROM portafolios
GROUP BY profesor_id, año_evaluacion, asignatura, nivel_educativo
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 2. Elimina los duplicados, manteniendo solo el MÁS RECIENTE
-- (Descomenta las líneas siguientes cuando estés listo)

/*
WITH duplicados AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY profesor_id, año_evaluacion, asignatura, nivel_educativo
      ORDER BY created_at DESC
    ) as rn
  FROM portafolios
)
DELETE FROM portafolios
WHERE id IN (
  SELECT id FROM duplicados WHERE rn > 1
);
*/

-- 3. Verifica que los duplicados fueron eliminados
-- Ejecuta de nuevo el SELECT del paso 1 para confirmar
