-- v41.14.1 — Testo libero sul proprio tavolo (Versione Warhammer, gioco GDR,
-- tipi personalizzati): anche un socio, non solo lo staff, può scriverlo.
-- Idempotente. Preparata in anteprima: NON applicare in produzione
-- finché Vincenzo non dice «vai».
--
-- Causa: le colonne aggiunte in v41.11 / v41.11.1 (versione, game_name, …)
-- potevano restare senza privilegio di colonna per il ruolo authenticated.
-- PostgREST rispondeva «permission denied» e l'app mostrava
-- «servono i permessi admin», anche a chi aveva appena aperto il tavolo.
-- Lo staff e i soci usano lo stesso ruolo Postgres: il controllo resta
-- sul trigger tables_host_guard (host o staff) e sulla RLS già in vigore.
-- Non si aprono altri permessi (niente scrittura su table_types, niente delete).

-- Privilegi di colonna sulle nuove colonne di public.tables
grant select, insert, update on table public.tables to authenticated;
grant select, insert, update (
  type_id, master_member_id, master_name, game_name, bgg_rpg_id, versione
) on public.tables to authenticated;

-- Stesse colonne sulle partite (registra GDR / Warhammer / personalizzato)
grant select, insert, update on table public.plays to authenticated;
grant select, insert, update (
  play_kind, game_name, versione, bgg_rpg_id, type_id, gdr
) on public.plays to authenticated;

-- Trigger kind: Warhammer e tipi personalizzati possono avere testo libero;
-- GDR ha game_name (o un gioco della collezione). Nessun requisito is_admin.
create or replace function public.tables_type_guard()
returns trigger language plpgsql security definer set search_path=public as $$
declare cap int; cnt int; k text;
begin
  if new.type_id is null then new.type_id := 'board'; end if;
  select kind into k from public.table_types where id=new.type_id and attivo;
  if k is null then raise exception 'Tipo di tavolo non valido o disattivo' using errcode='22023'; end if;
  if coalesce(btrim(new.start_time),'') = '' or new.start_time !~ '^[0-2][0-9]:[0-5][0-9]$' then
    raise exception 'Orario di inizio obbligatorio' using errcode='22023';
  end if;
  if new.versione is not null then
    new.versione := btrim(new.versione);
    if new.versione = '' then new.versione := null; end if;
  end if;
  if new.game_name is not null then
    new.game_name := btrim(new.game_name);
    if new.game_name = '' then new.game_name := null; end if;
  end if;
  if k = 'board' then
    if new.game_id is null then raise exception 'Scegli un gioco' using errcode='22023'; end if;
    new.versione := null;
  elsif k = 'gdr' then
    if coalesce(btrim(new.game_name),'') = '' and new.game_id is null then
      raise exception 'Indica il gioco GDR' using errcode='22023';
    end if;
    if new.master_member_id is null and coalesce(btrim(new.master_name),'') = '' then
      new.master_member_id := new.host_id;
    end if;
    new.versione := null;
  elsif k = 'war' then
    new.game_id := null; new.game_name := null; new.bgg_rpg_id := null;
    new.master_member_id := null; new.master_name := null;
  elsif k = 'custom' then
    new.game_id := null;
  end if;
  if tg_op = 'INSERT' or (tg_op='UPDATE' and (new.date,new.type_id,new.status) is distinct from (old.date,old.type_id,old.status)) then
    if coalesce(new.status,'open') = 'open' then
      cap := public.table_type_capacity(new.date, new.type_id);
      select count(*) into cnt from public.tables
        where date=new.date and type_id=new.type_id and coalesce(status,'open')='open'
          and (tg_op='INSERT' or id is distinct from old.id);
      if cnt >= cap then
        raise exception 'Tipo pieno per questa serata' using errcode='P0001';
      end if;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.tables_type_guard() from public, anon, authenticated;
drop trigger if exists tables_type_guard on public.tables;
create trigger tables_type_guard before insert or update on public.tables
  for each row execute function public.tables_type_guard();

-- host_guard: il creatore (o lo staff) può modificare anche versione e game_name;
-- chi non è host non può cambiare quei campi. Stessa regola già in v41.11.1,
-- riaffermata qui dopo il rinnovo dei privilegi di colonna.
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
  if old.host_id is distinct from mine and
     (new.date,new.evening,new.game_id,new.seats,new.start_time,new.note,new.created_at,new.status,new.play_id,
      new.type_id,new.master_member_id,new.master_name,new.game_name,new.bgg_rpg_id,new.versione)
     is distinct from
     (old.date,old.evening,old.game_id,old.seats,old.start_time,old.note,old.created_at,old.status,old.play_id,
      old.type_id,old.master_member_id,old.master_name,old.game_name,old.bgg_rpg_id,old.versione) then
    raise exception 'Solo chi ha aperto il tavolo può modificarlo' using errcode='42501';
  end if;
  if new.play_id is not null and new.play_id is distinct from old.play_id and not exists(select 1 from public.plays where id=new.play_id) then
    raise exception 'Partita collegata non valida' using errcode='42501';
  end if;
  return new;
end $function$;
revoke all on function public.tables_host_guard() from public, anon, authenticated;

-- Ricarica lo schema PostgREST così le colonne risultano visibili/scrivibili
notify pgrst, 'reload schema';
