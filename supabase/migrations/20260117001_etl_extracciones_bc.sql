-- Tabla de control para ejecuciones reanudables de la extracción de bases curriculares
create extension if not exists "pgcrypto";

create table if not exists etl_extracciones_bc (
  id uuid primary key default gen_random_uuid(),
  estado text not null default 'pending', -- pending | running | partial | completed | failed
  categorias_pendientes text[] not null default '{}',
  categorias_procesadas text[] not null default '{}',
  asignaturas_procesadas integer not null default 0,
  objetivos_extraidos integer not null default 0,
  proceso_etl_id uuid,
  ultimo_checkpoint jsonb,
  detalle jsonb,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists etl_extracciones_bc_estado_idx on etl_extracciones_bc (estado);
