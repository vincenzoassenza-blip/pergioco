-- v41.10.2 — Verifica username BGG + recenti import (app_settings) + testi ibgg_* nuovi.
-- Idempotente. GRANT solo authenticated; anon revocato. RLS admin write già su app_settings.

create or replace function public.bgg_recent_users_valid(v jsonb)
returns boolean
language sql
immutable
as $$
  select
    v is not null
    and jsonb_typeof(v) = 'object'
    and jsonb_typeof(v->'users') = 'array'
    and jsonb_array_length(v->'users') <= 5
    and not exists (
      select 1
      from jsonb_array_elements_text(v->'users') as u(name)
      where length(name) < 1 or length(name) > 50
         or name !~ '^[A-Za-z0-9][A-Za-z0-9_ -]*$'
    );
$$;
revoke all on function public.bgg_recent_users_valid(jsonb) from public, anon;
grant execute on function public.bgg_recent_users_valid(jsonb) to authenticated;

alter table public.app_settings drop constraint if exists app_settings_bgg_recent_users_chk;
alter table public.app_settings add constraint app_settings_bgg_recent_users_chk
  check (key <> 'bgg_recent_users' or public.bgg_recent_users_valid(value));

insert into public.app_settings(key, value)
values ('bgg_recent_users', '{"users":[]}'::jsonb)
on conflict (key) do nothing;

do $m$
declare src text; neu text;
begin
  select pg_get_functiondef('public.testi_valid(jsonb)'::regprocedure) into src;
  if src is null then raise exception 'testi_valid assente'; end if;
  if src like '%ibgg_viaUserCheck%' then
    raise notice 'testi_valid già aggiornato v41.10.2';
    return;
  end if;
  if src not like '%"ibgg_esito":[2,40]%' then
    raise exception 'pattern ibgg_esito non trovato in testi_valid';
  end if;
  neu := replace(src,
    '"ibgg_esito":[2,40]',
    '"ibgg_esito":[2,40],"ibgg_viaUserCheck":[2,40],"ibgg_viaUserOk":[2,60],"ibgg_viaUserMissing":[2,80],"ibgg_viaUserRecent":[2,40],"ibgg_viaUserRemove":[2,40]');
  if neu = src then raise exception 'replace testi_valid fallito'; end if;
  execute neu;
end $m$;
revoke all on function public.testi_valid(jsonb) from public, anon;
grant execute on function public.testi_valid(jsonb) to authenticated;
