-- ============================================================
-- El reporte diario se programa en la base
--
-- Lo disparaba un cron de Vercel que llamaba a un endpoint que llamaba a la
-- edge function. Tres piezas para una tarea, y la del medio devolvía 401 sin
-- decir nada cuando la verificación no coincidía: el reporte dejó de salir y
-- nadie se enteró hasta que se notó que faltaba.
--
-- Acá el que agenda y el que ejecuta viven en el mismo lugar. Si falla, queda
-- registrado en cron.job_run_details y se puede mirar.
--
-- ANTES DE CORRER: completar las dos líneas de abajo con los datos del proyecto
-- (Supabase → Project Settings → API). La anon key es la misma que ya viaja en
-- el navegador, así que no es un secreto que se esté exponiendo acá.
--
-- 02:00 UTC = 23:00 en Argentina. pg_cron agenda siempre en UTC.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  v_project_url text := 'https://TU-PROYECTO.supabase.co';  -- ← completar
  v_anon_key    text := 'TU-ANON-KEY';                      -- ← completar
  v_comando     text;
BEGIN
  IF v_project_url LIKE '%TU-PROYECTO%' OR v_anon_key LIKE 'TU-ANON-KEY%' THEN
    RAISE EXCEPTION 'Completá v_project_url y v_anon_key antes de correr esto';
  END IF;

  -- Que se pueda correr de nuevo sin quedar con dos tareas iguales
  PERFORM cron.unschedule('capy-daily-report')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'capy-daily-report');

  v_comando := format(
    $cmd$SELECT net.http_post(
      url := %L,
      headers := %L::jsonb,
      body := '{}'::jsonb
    );$cmd$,
    v_project_url || '/functions/v1/daily-report',
    jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_anon_key,
      'Authorization', 'Bearer ' || v_anon_key
    )::text
  );

  PERFORM cron.schedule('capy-daily-report', '0 2 * * *', v_comando);
END $$;
