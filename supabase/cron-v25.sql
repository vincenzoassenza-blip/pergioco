-- v25: retry settimanale dei dati BGG mancanti (applicare DOPO il deploy della Edge Function bgg-meta).
-- Prerequisiti: estensioni pg_cron e pg_net attive; segreto 'bgg_cron_secret' nel Vault
-- (select vault.create_secret('<stesso valore di CRON_SECRET della funzione>','bgg_cron_secret');) — non scriverlo qui.
create extension if not exists pg_cron; create extension if not exists pg_net;
select cron.unschedule('bgg-meta-retry') where exists(select 1 from cron.job where jobname='bgg-meta-retry');
select cron.schedule('bgg-meta-retry','0 4 * * 1',$$
 select net.http_post(url:='https://egmrtcezrjyoynlhknpz.supabase.co/functions/v1/bgg-meta',
  headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='bgg_cron_secret')),
  body:='{"mode":"retry"}'::jsonb, timeout_milliseconds:=120000) $$);
