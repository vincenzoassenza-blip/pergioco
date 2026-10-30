-- v37 PerGioco Wrapped: interruttore staff (visibilità ai soci) salvato in app_settings['wrapped'].
-- Nessun nuovo dato esposto: il riepilogo è calcolato sul dispositivo dai dati già leggibili dal socio.
create table if not exists public.app_settings (key text primary key, value jsonb);
alter table public.app_settings enable row level security;

create or replace function public.wrapped_stato() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb; st boolean := public.is_staff(); me text := public.cp_me();
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  select value into v from public.app_settings where key = 'wrapped';
  return jsonb_build_object(
    'attivo', coalesce((v->>'attivo')::boolean, false),
    'anno', coalesce((v->>'anno')::int, extract(year from now())::int),
    'me', me, 'staff', st);
end $$;

create or replace function public.wrapped_set(p_attivo boolean, p_anno int) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Solo lo staff può attivare il Wrapped'; end if;
  if p_attivo is null or p_anno is null or p_anno < 2020 or p_anno > extract(year from now())::int then
    raise exception 'Anno non valido'; end if;
  insert into public.app_settings(key, value)
    values ('wrapped', jsonb_build_object('attivo', p_attivo, 'anno', p_anno))
    on conflict (key) do update set value = excluded.value;
  return public.wrapped_stato();
end $$;

revoke all on function public.wrapped_stato() from public, anon;
revoke all on function public.wrapped_set(boolean, int) from public, anon;
grant execute on function public.wrapped_stato() to authenticated;
grant execute on function public.wrapped_set(boolean, int) to authenticated;
