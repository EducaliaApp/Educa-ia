-- Script para eliminar documentos duplicados en documentos_oficiales
-- Mantiene solo la versión más reciente de cada documento

-- 1. Identificar duplicados por URL
WITH duplicados_url AS (
  SELECT 
    url_original,
    COUNT(*) as total,
    ARRAY_AGG(id ORDER BY created_at DESC) as ids
  FROM documentos_oficiales
  GROUP BY url_original
  HAVING COUNT(*) > 1
)
SELECT 
  'Duplicados por URL' as tipo,
  COUNT(*) as grupos_duplicados,
  SUM(total - 1) as documentos_a_eliminar
FROM duplicados_url;

-- 2. Identificar duplicados por título + año
WITH duplicados_titulo AS (
  SELECT 
    titulo,
    año_vigencia,
    COUNT(*) as total,
    ARRAY_AGG(id ORDER BY created_at DESC) as ids
  FROM documentos_oficiales
  GROUP BY titulo, año_vigencia
  HAVING COUNT(*) > 1
)
SELECT 
  'Duplicados por título+año' as tipo,
  COUNT(*) as grupos_duplicados,
  SUM(total - 1) as documentos_a_eliminar
FROM duplicados_titulo;

-- 3. Identificar duplicados por hash de contenido
WITH duplicados_hash AS (
  SELECT 
    hash_contenido,
    COUNT(*) as total,
    ARRAY_AGG(id ORDER BY created_at DESC) as ids
  FROM documentos_oficiales
  WHERE hash_contenido IS NOT NULL
  GROUP BY hash_contenido
  HAVING COUNT(*) > 1
)
SELECT 
  'Duplicados por hash' as tipo,
  COUNT(*) as grupos_duplicados,
  SUM(total - 1) as documentos_a_eliminar
FROM duplicados_hash;

-- 4. ELIMINAR duplicados por URL (mantener el más reciente)
-- DESCOMENTAR PARA EJECUTAR:
/*
WITH duplicados_url AS (
  SELECT 
    url_original,
    ARRAY_AGG(id ORDER BY created_at DESC) as ids
  FROM documentos_oficiales
  GROUP BY url_original
  HAVING COUNT(*) > 1
),
ids_a_eliminar AS (
  SELECT UNNEST(ids[2:]) as id_eliminar
  FROM duplicados_url
)
DELETE FROM documentos_oficiales
WHERE id IN (SELECT id_eliminar FROM ids_a_eliminar);
*/

-- 5. ELIMINAR duplicados por título + año (mantener el más reciente)
-- DESCOMENTAR PARA EJECUTAR:
/*
WITH duplicados_titulo AS (
  SELECT 
    titulo,
    año_vigencia,
    ARRAY_AGG(id ORDER BY created_at DESC) as ids
  FROM documentos_oficiales
  GROUP BY titulo, año_vigencia
  HAVING COUNT(*) > 1
),
ids_a_eliminar AS (
  SELECT UNNEST(ids[2:]) as id_eliminar
  FROM duplicados_titulo
)
DELETE FROM documentos_oficiales
WHERE id IN (SELECT id_eliminar FROM ids_a_eliminar);
*/

-- 6. ELIMINAR duplicados por hash (mantener el más reciente)
-- DESCOMENTAR PARA EJECUTAR:
/*
WITH duplicados_hash AS (
  SELECT 
    hash_contenido,
    ARRAY_AGG(id ORDER BY created_at DESC) as ids
  FROM documentos_oficiales
  WHERE hash_contenido IS NOT NULL
  GROUP BY hash_contenido
  HAVING COUNT(*) > 1
),
ids_a_eliminar AS (
  SELECT UNNEST(ids[2:]) as id_eliminar
  FROM duplicados_hash
)
DELETE FROM documentos_oficiales
WHERE id IN (SELECT id_eliminar FROM ids_a_eliminar);
*/

-- 7. Verificar resultado final
SELECT 
  COUNT(*) as total_documentos,
  COUNT(DISTINCT url_original) as urls_unicas,
  COUNT(DISTINCT hash_contenido) as hashes_unicos,
  COUNT(*) - COUNT(DISTINCT url_original) as posibles_duplicados_url
FROM documentos_oficiales;
