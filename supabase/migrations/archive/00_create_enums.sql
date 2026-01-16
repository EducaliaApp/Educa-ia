-- ============================================
-- PASO 1: Crear ENUMs necesarios
-- Ejecuta esto PRIMERO en Supabase SQL Editor
-- ============================================

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Crear ENUMs solo si no existen
DO $$ BEGIN
    CREATE TYPE nivel_educativo AS ENUM (
      'parvularia',
      'basica_1_6',
      'basica_7_8_media',
      'media_tp',
      'epja',
      'especial_regular',
      'especial_neep',
      'hospitalaria',
      'encierro',
      'lengua_indigena'
    );
    RAISE NOTICE 'ENUM nivel_educativo creado';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'ENUM nivel_educativo ya existe';
END $$;

DO $$ BEGIN
    CREATE TYPE nivel_desempeño AS ENUM (
      'Destacado',
      'Competente',
      'Básico',
      'Insuficiente'
    );
    RAISE NOTICE 'ENUM nivel_desempeño creado';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'ENUM nivel_desempeño ya existe';
END $$;

DO $$ BEGIN
    CREATE TYPE categoria_logro AS ENUM ('A', 'B', 'C', 'D', 'E');
    RAISE NOTICE 'ENUM categoria_logro creado';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'ENUM categoria_logro ya existe';
END $$;

DO $$ BEGIN
    CREATE TYPE dominio_mbe AS ENUM ('A', 'B', 'C', 'D');
    RAISE NOTICE 'ENUM dominio_mbe creado';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'ENUM dominio_mbe ya existe';
END $$;

DO $$ BEGIN
    CREATE TYPE estado_portafolio AS ENUM (
      'borrador',
      'en_revision',
      'completado',
      'enviado'
    );
    RAISE NOTICE 'ENUM estado_portafolio creado';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'ENUM estado_portafolio ya existe';
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_analisis AS ENUM (
      'inicial',
      'revision',
      'final'
    );
    RAISE NOTICE 'ENUM tipo_analisis creado';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'ENUM tipo_analisis ya existe';
END $$;

-- Verificar que los ENUMs se crearon
SELECT
    typname as enum_name,
    array_agg(enumlabel ORDER BY enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('nivel_educativo', 'nivel_desempeño', 'categoria_logro', 'dominio_mbe', 'estado_portafolio', 'tipo_analisis')
GROUP BY typname
ORDER BY typname;
