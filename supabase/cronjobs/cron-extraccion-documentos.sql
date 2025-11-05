-- Crear extensión pg_cron si no existe
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job diario: Monitorear documentos oficiales
SELECT cron.schedule(
  'monitor-documentos-oficiales',
  '0 3 * * *', -- Todos los días a las 3 AM
  $$
  SELECT
    net.http_post(
      url := 'https://[TU-PROJECT].supabase.co/functions/v1/monitor-documentos-oficiales',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Job para procesamiento en lote
SELECT cron.schedule(
  'procesar-lote-documentos',
  '*/15 * * * *', -- Cada 15 minutos
  $$
  SELECT
    net.http_post(
      url := 'https://[TU-PROJECT].supabase.co/functions/v1/procesar-lote',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
      body := '{"limite": 5}'::jsonb
    ) as request_id;
  $$
);

-- Job para auto-healing
SELECT cron.schedule(
  'auto-healing-sistema',
  '0 */2 * * *', -- Cada 2 horas
  $$
  SELECT
    net.http_post(
      url := 'https://[TU-PROJECT].supabase.co/functions/v1/auto-healing',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Job para limpieza de datos antiguos
SELECT cron.schedule(
  'limpiar-datos-antiguos',
  '0 2 * * 0', -- Domingos a las 2 AM
  $$
  SELECT limpiar_datos_antiguos();
  $$
);