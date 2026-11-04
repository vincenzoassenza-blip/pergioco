-- v40.6 — Tavoli: Siediti/Lascia il posto via RPC (solo se stessi); modifica tavolo solo host o staff
create or replace function public.table_seat(p_table text, p_action text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare mine text; t public.tables%rowtype; pl jsonb;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto' using errcode='42501'; end if;
  if p_action not in ('join','leave') then raise exception 'Azione non valida' using errcode='22023'; end if;
  select id into mine from public.members where user_id=auth.uid() and active limit 1;
  if mine is null then raise exception 'Account non collegato a un socio' using errcode='42501'; end if;
  select * into t from public.tables where id=p_table for update;
  if not found then raise exception 'Tavolo non trovato' using errcode='P0002'; end if;
  if coalesce(t.status,'open')<>'open' then raise exception 'Il tavolo è chiuso' using errcode='42501'; end if;
  pl:=coalesce(t.players,'[]'::jsonb);
  if p_action='join' then
    if t.date < (now() at time zone 'Europe/Rome')::date then raise exception 'Il tavolo è passato' using errcode='42501'; end if;
    if exists(select 1 from jsonb_array_elements(pl) x where x->>'memberId'=mine) then return pl; end if;
    if jsonb_array_length(pl) >= t.seats then raise exception 'Tavolo pieno' using errcode='42501'; end if;
    pl:=pl||jsonb_build_array(jsonb_build_object('memberId',mine));
  else
    pl:=coalesce((select jsonb_agg(x order by o) from jsonb_array_elements(pl) with ordinality a(x,o) where coalesce(x->>'memberId','')<>mine),'[]'::jsonb);
  end if;
  update public.tables set players=pl where id=p_table;
  return pl;
end $$;
revoke all on function public.table_seat(text,text) from public, anon;
grant execute on function public.table_seat(text,text) to authenticated;

drop policy if exists tables_update on public.tables;
create policy tables_update on public.tables for update to authenticated
  using (public.is_staff() or host_id in (select m.id from public.members m where m.user_id=auth.uid() and m.active))
  with check (public.is_staff() or host_id in (select m.id from public.members m where m.user_id=auth.uid() and m.active));

-- chi apre un tavolo (non staff) deve esserci seduto
create or replace function public.tables_host_guard()
 returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare mine text;
begin
  if public.is_staff() then return new; end if;
  select id into mine from public.members where user_id=auth.uid() and active limit 1;
  if mine is null then raise exception 'Account non collegato a un socio' using errcode='42501'; end if;
  if jsonb_array_length(coalesce(new.players,'[]'::jsonb)) > coalesce(new.seats,99) then raise exception 'Tavolo pieno' using errcode='42501'; end if;
  if tg_op='INSERT' then
    if new.host_id is distinct from mine then raise exception 'Puoi ospitare solo come te stesso' using errcode='42501'; end if;
    if not exists(select 1 from jsonb_array_elements(coalesce(new.players,'[]'::jsonb)) x where x->>'memberId'=mine) then raise exception 'Chi apre il tavolo deve giocarci' using errcode='42501'; end if;
    return new;
  end if;
  if new.host_id is distinct from old.host_id then raise exception 'Puoi ospitare solo come te stesso' using errcode='42501'; end if;
  if old.host_id is distinct from mine and (new.date,new.evening,new.game_id,new.seats,new.start_time,new.note,new.created_at,new.status,new.play_id)
     is distinct from (old.date,old.evening,old.game_id,old.seats,old.start_time,old.note,old.created_at,old.status,old.play_id) then
    raise exception 'Solo chi ha aperto il tavolo può modificarlo' using errcode='42501'; end if;
  if new.play_id is not null and new.play_id is distinct from old.play_id and not exists(select 1 from public.plays where id=new.play_id) then
    raise exception 'Partita collegata non valida' using errcode='42501'; end if;
  return new;
end $function$;
