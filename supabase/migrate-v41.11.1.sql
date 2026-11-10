-- v41.11.1 — Versione Warhammer (facoltativa), testi tt_versione/filtro.
-- Idempotente. GRANT invariati sulle tabelle esistenti (solo authenticated).

alter table public.tables add column if not exists versione text;

do $$ begin
  alter table public.tables drop constraint if exists tables_versione_len;
  alter table public.tables add constraint tables_versione_len
    check (versione is null or (char_length(versione) between 1 and 60 and versione !~ '[<>]'));
exception when others then null; end $$;

-- Trigger kind: Warhammer può avere versione; non azzerarla
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

do $m$
declare src text; neu text;
begin
  select pg_get_functiondef('public.testi_valid(jsonb)'::regprocedure) into src;
  if src is null then raise exception 'testi_valid assente'; end if;
  if src like '%tt_versione%' then raise notice 'testi_valid già v41.11.1'; return; end if;
  if src not like '%"tt_posti":[2,40]%' then raise exception 'pattern tt_posti assente'; end if;
  neu := replace(src,
    '"tt_posti":[2,40]',
    '"tt_posti":[2,40],"tt_versione":[2,40],"tt_versione_ph":[2,80],"tt_filtro":[2,40],"tt_tutto":[2,20]');
  if neu = src then raise exception 'replace testi_valid fallito'; end if;
  execute neu;
end $m$;
revoke all on function public.testi_valid(jsonb) from public, anon;
grant execute on function public.testi_valid(jsonb) to authenticated;

-- Partite non-collezione (GDR / Warhammer / tipi personalizzati): retrocompatibile
alter table public.plays add column if not exists play_kind text;
alter table public.plays add column if not exists game_name text;
alter table public.plays add column if not exists versione text;
alter table public.plays add column if not exists bgg_rpg_id int;
alter table public.plays add column if not exists type_id text;
alter table public.plays add column if not exists gdr jsonb;

alter table public.plays alter column game_id drop not null;

do $$ begin
  alter table public.plays drop constraint if exists plays_play_kind_chk;
  alter table public.plays add constraint plays_play_kind_chk
    check (play_kind is null or play_kind in ('board','gdr','war','custom'));
  alter table public.plays drop constraint if exists plays_game_name_len;
  alter table public.plays add constraint plays_game_name_len
    check (game_name is null or (char_length(game_name) between 1 and 100 and game_name !~ '[<>]'));
  alter table public.plays drop constraint if exists plays_versione_len;
  alter table public.plays add constraint plays_versione_len
    check (versione is null or (char_length(versione) between 1 and 60 and versione !~ '[<>]'));
exception when others then null; end $$;

create or replace function public.plays_gdr_ok(v jsonb) returns boolean
language sql immutable set search_path=public as $$
  select v is null or (
    jsonb_typeof(v)='object'
    and char_length(coalesce(v->>'sistema','')) <= 100
    and coalesce(v->>'sistema','') !~ '[<>]'
    and char_length(coalesce(v->>'avventura','')) <= 120
    and coalesce(v->>'avventura','') !~ '[<>]'
    and (coalesce(v->>'sessione','') = '' or (v->>'sessione') in ('one-shot','campagna'))
    and (v->>'sessione_n' is null or (jsonb_typeof(v->'sessione_n')='number' and (v->>'sessione_n')::int between 1 and 999)
         or (v->>'sessione_n') ~ '^[0-9]{1,3}$')
    and (coalesce(v->>'esito','') = '' or (v->>'esito') in ('conclusa','in_corso'))
    and char_length(coalesce(v->>'esito_nota','')) <= 200
    and coalesce(v->>'esito_nota','') !~ '[<>]'
    and char_length(coalesce(v->>'master_name','')) <= 60
    and coalesce(v->>'master_name','') !~ '[<>]'
  );
$$;
revoke all on function public.plays_gdr_ok(jsonb) from public, anon;
grant execute on function public.plays_gdr_ok(jsonb) to authenticated;

alter table public.plays drop constraint if exists plays_gdr_chk;
alter table public.plays add constraint plays_gdr_chk check (public.plays_gdr_ok(gdr));

-- titolo obbligatorio se non c'è un gioco della collezione
alter table public.plays drop constraint if exists plays_title_chk;
alter table public.plays add constraint plays_title_chk check (
  (coalesce(play_kind,'board') = 'board' and game_id is not null)
  or
  (coalesce(play_kind,'board') <> 'board' and (
     char_length(btrim(coalesce(game_name,''))) between 1 and 100
     or char_length(btrim(coalesce(versione,''))) between 1 and 60
  ))
);

-- personaggio opzionale nei giocatori (non rompe i punteggi esistenti)
create or replace function public.plays_players_ok(p jsonb) returns boolean
language sql immutable set search_path=public as $$
  select public.plays_scores_ok(p) and coalesce(bool_and(
    char_length(coalesce(x->>'character','')) <= 40
    and coalesce(x->>'character','') !~ '[<>]'
  ), true)
  from jsonb_array_elements(case when jsonb_typeof(p)='array' then p else '[]'::jsonb end) x;
$$;
revoke all on function public.plays_players_ok(jsonb) from public, anon;
grant execute on function public.plays_players_ok(jsonb) to authenticated;

alter table public.plays drop constraint if exists plays_players_extra_chk;
alter table public.plays add constraint plays_players_extra_chk check (public.plays_players_ok(players));

do $$ begin
  alter table public.plays
    add constraint plays_type_fk foreign key (type_id) references public.table_types(id) on update cascade;
exception when duplicate_object then null; end $$;
