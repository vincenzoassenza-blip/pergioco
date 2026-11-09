-- v41.10 — Cache server BGG XML API2 + nuove chiavi testi import username/attribuzione.
-- Idempotente. Nessun GRANT a anon; cache solo service_role (Edge Functions).
-- NON applicata in anteprima: richiede approvazione prima del deploy.

create table if not exists public.bgg_api_cache (
  key text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists bgg_api_cache_exp on public.bgg_api_cache (expires_at);
alter table public.bgg_api_cache enable row level security;
revoke all on table public.bgg_api_cache from public, anon, authenticated;
-- Nessuna policy: accesso solo via service_role nelle Edge Functions.

-- Estende testi_valid con chiavi ibgg username/attrib (sostituzione sorgente funzione).
do $m$
declare src text; neu text;
begin
  select pg_get_functiondef('public.testi_valid(jsonb)'::regprocedure) into src;
  if src is null then raise exception 'testi_valid assente'; end if;
  if src like '%ibgg_viaUserHelp%' then
    raise notice 'testi_valid già aggiornato';
    return;
  end if;
  if src not like '%"ibgg_viaUserSoon":[2,40]%' then
    raise exception 'pattern ibgg_viaUserSoon non trovato in testi_valid';
  end if;
  neu := replace(src,
    '"ibgg_viaUserSoon":[2,40]',
    '"ibgg_viaUserSoon":[2,40],"ibgg_viaUserHelp":[2,120],"ibgg_viaUserGo":[2,40],"ibgg_viaUserWait":[2,80],"ibgg_viaUserErr":[2,80],"ibgg_attrib":[2,60]');
  execute neu;
end $m$;
revoke all on function public.testi_valid(jsonb) from public, anon;
grant execute on function public.testi_valid(jsonb) to authenticated;
