-- v16: controllo accessi (tavoli e grant superflui)
-- 1) Nessun TRUNCATE/TRIGGER/REFERENCES per anon/authenticated (TRUNCATE ignora la RLS)
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='public' loop
  execute format('revoke truncate, trigger, references on public.%I from anon, authenticated, public', t);
 end loop; end $$;
alter default privileges in schema public revoke truncate, trigger, references on tables from anon, authenticated;
-- 2) Tavoli: modifica solo per account collegati a un socio; chi non è host o staff
--    può cambiare solo giocatori/stato/partita collegata, entro i posti disponibili
drop policy if exists tables_update on public.tables;
do $$ declare p text; begin for p in select policyname from pg_policies where schemaname='public' and tablename='tables' and cmd in ('UPDATE','INSERT') loop
 execute format('drop policy %I on public.tables',p); end loop; end $$;
create policy tables_insert on public.tables for insert to authenticated
 with check (public.is_staff() or exists(select 1 from public.members m where m.user_id=auth.uid() and m.active));
create policy tables_update on public.tables for update to authenticated
 using (public.is_staff() or exists(select 1 from public.members m where m.user_id=auth.uid() and m.active))
 with check (public.is_staff() or exists(select 1 from public.members m where m.user_id=auth.uid() and m.active));
create or replace function public.tables_host_guard() returns trigger language plpgsql security definer set search_path=public as $f$
declare mine text;
begin
  if public.is_staff() then return new; end if;
  select id into mine from public.members where user_id=auth.uid() and active limit 1;
  if mine is null then raise exception 'Account non collegato a un socio' using errcode='42501'; end if;
  if jsonb_array_length(coalesce(new.players,'[]'::jsonb)) > coalesce(new.seats,99) then raise exception 'Tavolo pieno' using errcode='42501'; end if;
  if tg_op='INSERT' then
    if new.host_id is distinct from mine then raise exception 'Puoi ospitare solo come te stesso' using errcode='42501'; end if;
    return new;
  end if;
  if new.host_id is distinct from old.host_id then raise exception 'Puoi ospitare solo come te stesso' using errcode='42501'; end if;
  if old.host_id is distinct from mine and (new.date,new.evening,new.game_id,new.seats,new.start_time,new.note,new.created_at)
     is distinct from (old.date,old.evening,old.game_id,old.seats,old.start_time,old.note,old.created_at) then
    raise exception 'Solo chi ha aperto il tavolo può modificarlo' using errcode='42501'; end if;
  if new.play_id is not null and new.play_id is distinct from old.play_id and not exists(select 1 from public.plays where id=new.play_id) then
    raise exception 'Partita collegata non valida' using errcode='42501'; end if;
  return new;
end $f$;
revoke execute on function public.tables_host_guard() from anon, authenticated, public;
-- 3) Durata partita (minuti, facoltativa). RLS di plays invariata (insert: staff o giocatore; update/delete: admin)
alter table public.plays add column if not exists duration integer;
alter table public.plays drop constraint if exists plays_duration_chk;
alter table public.plays add constraint plays_duration_chk check (duration is null or duration between 1 and 1440);
