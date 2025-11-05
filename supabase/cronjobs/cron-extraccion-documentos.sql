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

-- Job para procesar documentos pendientes
SELECT cron.schedule(
  'procesar-documentos-pendientes',
  '*/30 * * * *', -- Cada 30 minutos
  $$
  SELECT
    net.http_post(
      url := 'https://[TU-PROJECT].supabase.co/functions/v1/procesar-documento',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
      body := jsonb_build_object('documento_id', d.id)
    )
  FROM documentos_oficiales d
  WHERE d.procesado = FALSE
  LIMIT 5;
  $$
);