-- Script para generar embeddings de rúbricas existentes
-- Ejecutar en Supabase SQL Editor o con psql

-- 1. Ver qué rúbricas existen sin embeddings
SELECT
  id,
  indicador_id,
  nombre_indicador,
  asignatura,
  nivel_educativo,
  año_vigencia,
  LENGTH(contenido_texto) as longitud_contenido,
  CASE WHEN embedding IS NULL THEN '❌ Sin embedding' ELSE '✅ Con embedding' END as estado_embedding
FROM rubricas_mbe
ORDER BY indicador_id;

-- 2. Generar texto para embeddings (combinar todos los campos relevantes)
-- Este query muestra el texto que se debería usar para generar embeddings
SELECT
  id,
  indicador_id,
  CONCAT(
    'Indicador: ', nombre_indicador, '\n',
    'Descripción: ', descripcion_estandar, '\n',
    'Asignatura: ', COALESCE(asignatura, 'General'), '\n',
    'Nivel: ', nivel_educativo::text, '\n',
    'Dominio MBE: ', dominio::text, '\n',
    'Estándar: ', estandar_numero::text, '\n',
    'Contenido: ', COALESCE(contenido_texto, '')
  ) as texto_para_embedding
FROM rubricas_mbe
WHERE embedding IS NULL
LIMIT 5;

-- 3. Estadísticas de rúbricas
SELECT
  COUNT(*) as total_rubricas,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as con_embedding,
  COUNT(*) FILTER (WHERE embedding IS NULL) as sin_embedding,
  COUNT(DISTINCT dominio) as dominios_unicos,
  COUNT(DISTINCT nivel_educativo) as niveles_unicos
FROM rubricas_mbe;

-- 4. Verificar estructura JSONB de niveles_desempeño
SELECT
  indicador_id,
  jsonb_object_keys(niveles_desempeno) as niveles_disponibles
FROM rubricas_mbe
LIMIT 10;
