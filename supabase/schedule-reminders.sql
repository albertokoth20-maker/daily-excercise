create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Store the project URL and the same random CRON_SECRET used by the Edge Function in Supabase Vault.
-- Replace the placeholder values before running these statements.
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
select vault.create_secret('REPLACE_WITH_THE_CRON_SECRET', 'cron_secret');

select cron.schedule(
  'form-function-daily-workout-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'project_url'
    ) || '/functions/v1/send-workout-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'cron_secret'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
