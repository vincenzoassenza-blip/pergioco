-- v41.11 — Tipi di tavolo configurabili (Gioco da tavolo / GDR / Warhammer),
-- capienza per serata (DB), orario obbligatorio, campi GDR/Warhammer.
-- Idempotente. GRANT solo authenticated; anon revocato sulle nuove tabelle.

-- Tipi di tavolo (configurabili da staff: admin + moderatori)
create table if not exists public.table_types (
  id text primary key check (id ~ '^[a-z0-9_]{2,32}$'),
  nome text not null check (char_length(btrim(nome)) between 2 and 40 and nome !~ '[<>]'),
  icona text not null default '🎲' check (char_length(icona) between 1 and 8),
  sort int not null default 0,
  attivo boolean not null default true,
  capacity_default int not null default 5 check (capacity_default between 0 and 100),
  -- campi: board = gioco da collezione; gdr = master+gioco RPG; war = solo posti+ora
  kind text not null default 'board' check (kind in ('board','gdr','war','custom')),
  created_at timestamptz not null default now()
);
alter table public.table_types enable row level security;
revoke all on table public.table_types from public, anon;
grant select on table public.table_types to authenticated;
grant insert, update, delete on table public.table_types to authenticated;
drop policy if exists tt_read on public.table_types;
create policy tt_read on public.table_types for select to authenticated using (true);
drop policy if exists tt_write on public.table_types;
create policy tt_write on public.table_types for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

insert into public.table_types(id,nome,icona,sort,attivo,capacity_default,kind) values
  ('board','Gioco da tavolo','🎲',10,true,5,'board'),
  ('gdr','GDR','🐉',20,true,2,'gdr'),
  ('war','Warhammer','⚔️',30,true,2,'war')
on conflict (id) do nothing;

-- Capienza per data (override del default del tipo)
create table if not exists public.table_type_caps (
  date date not null,
  type_id text not null references public.table_types(id) on update cascade on delete cascade,
  capacity int not null check (capacity between 0 and 100),
  primary key (date, type_id)
);
alter table public.table_type_caps enable row level security;
revoke all on table public.table_type_caps from public, anon;
grant select on table public.table_type_caps to authenticated;
grant insert, update, delete on table public.table_type_caps to authenticated;
drop policy if exists ttc_read on public.table_type_caps;
create policy ttc_read on public.table_type_caps for select to authenticated using (true);
drop policy if exists ttc_write on public.table_type_caps;
create policy ttc_write on public.table_type_caps for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Colonne aggiuntive sui tavoli
alter table public.tables add column if not exists type_id text;
alter table public.tables add column if not exists master_member_id text;
alter table public.tables add column if not exists master_name text;
alter table public.tables add column if not exists game_name text;
alter table public.tables add column if not exists bgg_rpg_id int;

-- Migrazione: tavoli esistenti → Gioco da tavolo
-- Disabilita trigger host (auth.uid assente in SQL admin) durante i backfill
alter table public.tables disable trigger tables_host_guard;
alter table public.tables disable trigger tables_no_past;
alter table public.tables disable trigger zz_tables_evening;
update public.tables set type_id='board' where type_id is null;

do $$ begin
  alter table public.tables
    add constraint tables_type_fk foreign key (type_id) references public.table_types(id) on update cascade;
exception when duplicate_object then null; end $$;

alter table public.tables alter column type_id set default 'board';
alter table public.tables alter column type_id set not null;

-- game_id può essere null per GDR/Warhammer (testo libero o senza gioco)
alter table public.tables alter column game_id drop not null;

do $$ begin
  alter table public.tables drop constraint if exists tables_master_name_len;
  alter table public.tables add constraint tables_master_name_len
    check (master_name is null or (char_length(master_name) between 1 and 60 and master_name !~ '[<>]'));
  alter table public.tables drop constraint if exists tables_game_name_len;
  alter table public.tables add constraint tables_game_name_len
    check (game_name is null or (char_length(game_name) between 1 and 100 and game_name !~ '[<>]'));
  alter table public.tables drop constraint if exists tables_start_time_req;
  -- orario obbligatorio sui nuovi: enforced in trigger/RPC; existing may be empty → backfill
exception when others then null; end $$;

-- Backfill orario mancante a 21:00 (orario serata di default)
update public.tables set start_time='21:00' where coalesce(btrim(start_time),'')='';
-- Riabilita trigger di protezione (il nuovo tables_type_guard arriva dopo)
alter table public.tables enable trigger tables_host_guard;
alter table public.tables enable trigger tables_no_past;
alter table public.tables enable trigger zz_tables_evening;

-- Config messaggi / orario serata in app_settings
create or replace function public.tavoli_cfg_valid(v jsonb) returns boolean
language sql immutable as $$
  select v is not null and jsonb_typeof(v)='object'
    and (v->>'ora_default') ~ '^[0-2][0-9]:[0-5][0-9]$'
    and jsonb_typeof(v->'pieno_msg')='string'
    and char_length(btrim(v->>'pieno_msg')) between 10 and 280
    and (v->>'pieno_msg') !~ '[<>]'
    and jsonb_typeof(coalesce(v->'whatsapp_url','""'::jsonb))='string'
    and char_length(coalesce(v->>'whatsapp_url','')) <= 200
    and (coalesce(v->>'whatsapp_url','') = '' or (v->>'whatsapp_url') ~ '^https://(chat\.whatsapp\.com|wa\.me)/');
$$;
revoke all on function public.tavoli_cfg_valid(jsonb) from public, anon;
grant execute on function public.tavoli_cfg_valid(jsonb) to authenticated;

alter table public.app_settings drop constraint if exists app_settings_tavoli_cfg_chk;
alter table public.app_settings add constraint app_settings_tavoli_cfg_chk
  check (key <> 'tavoli_cfg' or public.tavoli_cfg_valid(value));

insert into public.app_settings(key,value) values ('tavoli_cfg', jsonb_build_object(
  'ora_default','21:00',
  'pieno_msg','I tavoli {tipo} per questa serata sono al completo. Per ulteriori prenotazioni contatta lo staff nel gruppo WhatsApp.',
  'whatsapp_url',''
)) on conflict (key) do nothing;

-- Conta tavoli aperti di un tipo in una data
create or replace function public.table_type_count(p_date date, p_type text)
returns int language sql stable security definer set search_path=public as $$
  select count(*)::int from public.tables
  where date=p_date and type_id=p_type and coalesce(status,'open')='open';
$$;
revoke all on function public.table_type_count(date,text) from public, anon;
grant execute on function public.table_type_count(date,text) to authenticated;

create or replace function public.table_type_capacity(p_date date, p_type text)
returns int language sql stable security definer set search_path=public as $$
  select coalesce(
    (select capacity from public.table_type_caps where date=p_date and type_id=p_type),
    (select capacity_default from public.table_types where id=p_type and attivo),
    0);
$$;
revoke all on function public.table_type_capacity(date,text) from public, anon;
grant execute on function public.table_type_capacity(date,text) to authenticated;

-- Trigger: capienza + orario obbligatorio + vincoli per kind
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
  if k = 'board' then
    if new.game_id is null then raise exception 'Scegli un gioco' using errcode='22023'; end if;
  elsif k = 'gdr' then
    if coalesce(btrim(new.game_name),'') = '' and new.game_id is null then
      raise exception 'Indica il gioco GDR' using errcode='22023';
    end if;
    if new.master_member_id is null and coalesce(btrim(new.master_name),'') = '' then
      new.master_member_id := new.host_id;
    end if;
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
drop trigger if exists tables_type_guard on public.tables;
create trigger tables_type_guard before insert or update on public.tables
  for each row execute function public.tables_type_guard();

-- Aggiorna host_guard: includi nuove colonne nel confronto "solo host"
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
      new.type_id,new.master_member_id,new.master_name,new.game_name,new.bgg_rpg_id)
     is distinct from
     (old.date,old.evening,old.game_id,old.seats,old.start_time,old.note,old.created_at,old.status,old.play_id,
      old.type_id,old.master_member_id,old.master_name,old.game_name,old.bgg_rpg_id) then
    raise exception 'Solo chi ha aperto il tavolo può modificarlo' using errcode='42501';
  end if;
  if new.play_id is not null and new.play_id is distinct from old.play_id and not exists(select 1 from public.plays where id=new.play_id) then
    raise exception 'Partita collegata non valida' using errcode='42501';
  end if;
  return new;
end $function$;

-- Testi configurabili: estendi testi_valid con chiavi tt_*
do $m$
declare src text; neu text;
begin
  select pg_get_functiondef('public.testi_valid(jsonb)'::regprocedure) into src;
  if src is null then raise exception 'testi_valid assente'; end if;
  if src like '%tt_pieno%' then raise notice 'testi_valid già v41.11'; return; end if;
  if src not like '%"ibgg_esito":[2,40]%' then raise exception 'pattern ibgg_esito assente'; end if;
  neu := replace(src,
    '"ibgg_esito":[2,40]',
    '"ibgg_esito":[2,40],"tt_pieno":[10,280],"tt_wa":[0,200],"tt_ora":[5,5],"tt_gest":[2,40],"tt_tipi":[2,40],"tt_cap":[2,40],"tt_master":[2,40],"tt_gioco":[2,40],"tt_nota":[2,40],"tt_posti":[2,40]');
  if neu = src then raise exception 'replace testi_valid fallito'; end if;
  execute neu;
end $m$;
revoke all on function public.testi_valid(jsonb) from public, anon;
grant execute on function public.testi_valid(jsonb) to authenticated;
