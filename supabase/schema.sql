-- Diario di PerGioco: schema Supabase (idempotente: si può rieseguire senza danni)
-- Incollare in Supabase > SQL Editor > New query > Run

create table if not exists public.games (
  id text primary key, name text not null,
  min_players int, max_players int, min_time int, max_time int, age int,
  coop boolean not null default false, bgg_id int, thumb text,
  created_at timestamptz not null default now());
create table if not exists public.members (
  id text primary key, nome text not null, cognome text, soprannome text, tessera text,
  active boolean not null default true, created_at timestamptz not null default now());
create table if not exists public.plays (
  id text primary key, game_id text not null references public.games(id) on update cascade,
  date date not null, evening text, coop boolean not null default false, group_win boolean,
  scenario text, players jsonb not null default '[]'::jsonb, note text,
  created_at timestamptz not null default now(), updated_at timestamptz);
create table if not exists public.app_settings (key text primary key, value jsonb);
create table if not exists public.admins (email text primary key, user_id uuid);

-- è admin chi ha la propria email (o user id) nella tabella admins
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a
    where a.user_id = auth.uid() or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.games enable row level security;
alter table public.members enable row level security;
alter table public.plays enable row level security;
alter table public.app_settings enable row level security;
alter table public.admins enable row level security;

do $$
declare t text;
begin
  -- lettura pubblica
  foreach t in array array['games','members','plays','app_settings'] loop
    execute format('drop policy if exists "%1$s_read" on public.%1$I', t);
    execute format('create policy "%1$s_read" on public.%1$I for select to anon, authenticated using (true)', t);
  end loop;
  -- scrittura completa solo admin
  foreach t in array array['games','members','app_settings'] loop
    execute format('drop policy if exists "%1$s_admin_write" on public.%1$I', t);
    execute format('create policy "%1$s_admin_write" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- partite: tutti possono registrarne, solo admin modifica/cancella
drop policy if exists "plays_insert_all" on public.plays;
create policy "plays_insert_all" on public.plays for insert to anon, authenticated with check (true);
drop policy if exists "plays_admin_update" on public.plays;
create policy "plays_admin_update" on public.plays for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "plays_admin_delete" on public.plays;
create policy "plays_admin_delete" on public.plays for delete to authenticated using (public.is_admin());
-- admins: visibile solo agli admin, modificabile solo da SQL Editor
drop policy if exists "admins_read" on public.admins;
create policy "admins_read" on public.admins for select to authenticated using (public.is_admin());

grant select on public.games, public.members, public.plays, public.app_settings to anon, authenticated;
grant insert on public.plays to anon, authenticated;
grant insert, update, delete on public.games, public.members, public.plays, public.app_settings to authenticated;
grant select on public.admins to authenticated;

-- giochi iniziali
insert into public.games (id, name, min_players, max_players, min_time, max_time, age, coop) values
 ('etherfields','Etherfields',1,5,60,120,14,true),
 ('tmb','Too Many Bones',1,4,60,120,12,true),
 ('racket','Racket Dice',2,4,20,30,8,false),
 ('burncycle','Burncycle',1,4,45,90,14,true),
 ('cloudspire','Cloudspire',1,4,60,180,14,false),
 ('hoplo','Hoplomachus: Victorum',1,4,30,120,14,false)
on conflict (id) do nothing;

-- ===== v4: modalita' serata (tavoli) e data di arrivo dei giochi =====
alter table public.games add column if not exists added_at timestamptz;
create table if not exists public.tables (
  id text primary key, date date not null, evening text,
  game_id text references public.games(id) on update cascade,
  host_id text references public.members(id) on update cascade,
  seats int not null default 4, start_time text, note text,
  players jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open','closed')),
  play_id text, created_at timestamptz not null default now());
alter table public.tables enable row level security;
drop policy if exists "tables_read" on public.tables;
create policy "tables_read" on public.tables for select to anon, authenticated using (true);
-- chiunque apre un tavolo, si unisce o lo lascia (insert/update); solo admin cancella
drop policy if exists "tables_insert_all" on public.tables;
create policy "tables_insert_all" on public.tables for insert to anon, authenticated with check (true);
drop policy if exists "tables_update_all" on public.tables;
create policy "tables_update_all" on public.tables for update to anon, authenticated using (true) with check (true);
drop policy if exists "tables_admin_delete" on public.tables;
create policy "tables_admin_delete" on public.tables for delete to authenticated using (public.is_admin());
grant select, insert, update on public.tables to anon, authenticated;
grant delete on public.tables to authenticated;

-- PRIMO ADMIN: dopo aver creato l'utente in Authentication > Users, eseguire (con la sua email):
-- insert into public.admins (email) values ('nome@esempio.it') on conflict do nothing;
-- ===== v6: account dei soci, collegamento alla scheda socio, profilo personale =====
-- Idempotente: si può rieseguire senza danni. Supabase > SQL Editor > New query > Run

-- nuove colonne della scheda socio (tutte facoltative)
alter table public.members add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.members add column if not exists avatar text;
alter table public.members add column if not exists color text;
alter table public.members add column if not exists fav_game_id text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'members_user_id_key') then
    alter table public.members add constraint members_user_id_key unique (user_id);
  end if;
end $$;

-- il numero di tessera non deve essere leggibile da tutti (serve come "codice" per collegarsi):
-- lettura pubblica di tutte le colonne TRANNE tessera
revoke select on public.members from anon, authenticated;
grant select (id, nome, cognome, soprannome, active, created_at, user_id, avatar, color, fav_game_id)
  on public.members to anon, authenticated;
grant insert, update, delete on public.members to authenticated;

-- gli admin leggono le tessere tramite questa funzione
create or replace function public.admin_member_tessere()
returns table (id text, tessera text)
language sql stable security definer set search_path = public as $$
  select m.id, m.tessera from public.members m where public.is_admin();
$$;
revoke all on function public.admin_member_tessere() from public, anon;
grant execute on function public.admin_member_tessere() to authenticated;

-- richieste di collegamento (per chi non ha il numero di tessera: approva un admin)
create table if not exists public.link_requests (
  id bigint generated by default as identity primary key,
  member_id text not null references public.members(id) on delete cascade on update cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  email text, note text,
  created_at timestamptz not null default now(),
  unique (user_id));
alter table public.link_requests enable row level security;
drop policy if exists "lr_read" on public.link_requests;
create policy "lr_read" on public.link_requests for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "lr_insert" on public.link_requests;
create policy "lr_insert" on public.link_requests for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "lr_delete" on public.link_requests;
create policy "lr_delete" on public.link_requests for delete to authenticated using (user_id = auth.uid() or public.is_admin());
grant select, insert, delete on public.link_requests to authenticated;

-- tentativi falliti di collegamento (limite anti-indovinello: 5 l'ora)
create table if not exists public.claim_attempts (user_id uuid not null, at timestamptz not null default now());
alter table public.claim_attempts enable row level security;
revoke all on public.claim_attempts from anon, authenticated;

-- il socio collega il proprio account alla propria scheda con il numero di tessera
create or replace function public.claim_member(p_member_id text, p_tessera text)
returns text language plpgsql security definer set search_path = public as $$
declare m public.members; me uuid := auth.uid();
begin
  if me is null then raise exception 'Devi prima accedere'; end if;
  if exists (select 1 from public.members where user_id = me) then raise exception 'Il tuo account è già collegato a una scheda'; end if;
  if (select count(*) from public.claim_attempts where user_id = me and at > now() - interval '1 hour') >= 5 then
    raise exception 'Troppi tentativi: riprova tra un''ora o chiedi a un admin'; end if;
  select * into m from public.members where id = p_member_id;
  if not found then raise exception 'Scheda socio non trovata'; end if;
  if m.user_id is not null then raise exception 'Questa scheda è già collegata a un altro account'; end if;
  if coalesce(trim(m.tessera), '') = '' or lower(trim(m.tessera)) <> lower(trim(coalesce(p_tessera, ''))) then
    insert into public.claim_attempts (user_id) values (me);
    raise exception 'Numero di tessera non corrispondente'; end if;
  update public.members set user_id = me where id = p_member_id;
  delete from public.link_requests where user_id = me;
  return p_member_id;
end $$;
revoke all on function public.claim_member(text, text) from public, anon;
grant execute on function public.claim_member(text, text) to authenticated;

-- il socio modifica SOLO soprannome, avatar, colore e gioco preferito della propria scheda
create or replace function public.update_my_profile(p_soprannome text, p_avatar text, p_color text, p_fav_game_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Devi prima accedere'; end if;
  update public.members set
    soprannome = nullif(left(trim(coalesce(p_soprannome, '')), 40), ''),
    avatar = nullif(left(coalesce(p_avatar, ''), 16), ''),
    color = case when p_color ~ '^#[0-9a-fA-F]{6}$' then p_color else null end,
    fav_game_id = nullif(p_fav_game_id, '')
  where user_id = auth.uid();
  if not found then raise exception 'Account non collegato a nessuna scheda socio'; end if;
end $$;
revoke all on function public.update_my_profile(text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text) to authenticated;
-- ===== v7: registrazione solo con CODICE generato dagli admin (nessuna email inviata) =====
-- Idempotente. Supabase > SQL Editor > New query > Run
create extension if not exists pgcrypto with schema extensions;

-- un codice per socio, leggibile SOLO dagli admin (via funzioni), mai dal pubblico
create table if not exists public.member_codes (
  member_id text primary key references public.members(id) on delete cascade on update cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  used_at timestamptz, used_for text);
alter table public.member_codes enable row level security;
revoke all on public.member_codes from anon, authenticated;

-- il vecchio collegamento con numero di tessera/richieste non serve più
drop function if exists public.claim_member(text, text);
drop table if exists public.claim_attempts;
drop table if exists public.link_requests;

-- normalizza: maiuscolo, senza trattini/spazi
create or replace function public.norm_code(c text) returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(c, ''), '[^A-Za-z0-9]', '', 'g')) $$;

-- l'admin genera (o rigenera) il codice di un socio: 12 caratteri senza ambigui (0/O, 1/I/L)
create or replace function public.admin_new_code(p_member_id text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare al text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; b bytea; c text := ''; i int;
begin
  if not public.is_admin() then raise exception 'Solo gli admin'; end if;
  if not exists (select 1 from public.members where id = p_member_id) then raise exception 'Socio non trovato'; end if;
  b := gen_random_bytes(12);
  for i in 0..11 loop c := c || substr(al, (get_byte(b, i) % 31) + 1, 1); end loop;
  insert into public.member_codes (member_id, code) values (p_member_id, c)
    on conflict (member_id) do update set code = excluded.code, created_at = now(), used_at = null, used_for = null;
  return substr(c,1,4) || '-' || substr(c,5,4) || '-' || substr(c,9,4);
end $$;
create or replace function public.admin_codes() returns table (member_id text, code text, created_at timestamptz, used_at timestamptz, used_for text)
language sql stable security definer set search_path = public as $$
  select m.member_id, substr(m.code,1,4)||'-'||substr(m.code,5,4)||'-'||substr(m.code,9,4), m.created_at, m.used_at, m.used_for
  from public.member_codes m where public.is_admin() $$;
create or replace function public.admin_delete_code(p_member_id text) returns void
language plpgsql security definer set search_path = public as $$
begin if not public.is_admin() then raise exception 'Solo gli admin'; end if; delete from public.member_codes where member_id = p_member_id; end $$;

-- iscrizione: OGNI nuovo utente deve avere un codice valido nei metadati (o essere un admin pre-inserito in admins)
create or replace function public.signup_check_code() returns trigger
language plpgsql security definer set search_path = public as $$
declare mc public.member_codes;
begin
  select * into mc from public.member_codes where code = public.norm_code(new.raw_user_meta_data ->> 'code') and used_at is null;
  if not found then
    if exists (select 1 from public.admins where lower(email) = lower(new.email)) then return new; end if;
    raise exception 'Codice non valido o già usato';
  end if;
  if exists (select 1 from public.members where id = mc.member_id and user_id is not null) then
    raise exception 'Questo socio ha già un account: per cambiare password usa "Password dimenticata"'; end if;
  update public.member_codes set used_at = now(), used_for = 'registrazione' where member_id = mc.member_id;
  new.raw_user_meta_data := (coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'code') || jsonb_build_object('member_id', mc.member_id);
  return new;
end $$;
create or replace function public.signup_link_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.raw_user_meta_data ? 'member_id' then
    update public.members set user_id = new.id where id = new.raw_user_meta_data ->> 'member_id' and user_id is null;
  end if;
  return new;
end $$;
drop trigger if exists pergioco_signup_check on auth.users;
create trigger pergioco_signup_check before insert on auth.users for each row execute function public.signup_check_code();
drop trigger if exists pergioco_signup_link on auth.users;
create trigger pergioco_signup_link after insert on auth.users for each row execute function public.signup_link_member();

-- password dimenticata: l'admin rigenera il codice, il socio lo usa con la sua email per scegliere una nuova password
create or replace function public.reset_password_with_code(p_code text, p_email text, p_password text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
declare mc public.member_codes; uid uuid;
begin
  if length(coalesce(p_password, '')) < 8 then raise exception 'La password deve avere almeno 8 caratteri'; end if;
  select * into mc from public.member_codes where code = public.norm_code(p_code) and used_at is null;
  if not found then raise exception 'Codice non valido o già usato'; end if;
  select u.id into uid from public.members m join auth.users u on u.id = m.user_id
   where m.id = mc.member_id and lower(u.email) = lower(trim(p_email));
  if uid is null then raise exception 'Codice ed email non corrispondono'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = uid;
  update public.member_codes set used_at = now(), used_for = 'nuova password' where member_id = mc.member_id;
end $$;

revoke all on function public.admin_new_code(text), public.admin_codes(), public.admin_delete_code(text) from public, anon;
grant execute on function public.admin_new_code(text), public.admin_codes(), public.admin_delete_code(text) to authenticated;
revoke all on function public.signup_check_code(), public.signup_link_member() from public, anon, authenticated;
revoke all on function public.reset_password_with_code(text, text, text) from public;
grant execute on function public.reset_password_with_code(text, text, text) to anon, authenticated;

-- il codice non resta mai nei metadati dell'utente (anche dopo gli aggiornamenti di Supabase Auth)
create or replace function public.strip_signup_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.raw_user_meta_data ? 'code' then new.raw_user_meta_data := new.raw_user_meta_data - 'code'; end if;
  return new;
end $$;
revoke all on function public.strip_signup_code() from public, anon, authenticated;
drop trigger if exists pergioco_strip_code on auth.users;
create trigger pergioco_strip_code before update on auth.users for each row execute function public.strip_signup_code();
update auth.users set raw_user_meta_data = raw_user_meta_data - 'code' where raw_user_meta_data ? 'code';
-- v9: ruolo MODERATORE
create table if not exists public.moderators (email text primary key, added_at timestamptz default now());
alter table public.moderators enable row level security;
revoke all on public.moderators from anon, authenticated;

create or replace function public.is_moderator() returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.moderators m where lower(m.email)=lower(coalesce(auth.jwt()->>'email','')));
$$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$
  select public.is_admin() or public.is_moderator();
$$;
grant execute on function public.is_moderator(), public.is_staff() to anon, authenticated;

-- moderatori: solo inserimento di NUOVI soci (senza tessera e senza account)
drop policy if exists members_mod_insert on public.members;
create policy members_mod_insert on public.members for insert to authenticated
  with check (public.is_moderator() and tessera is null and user_id is null);

-- codici: admin o moderatore
create or replace function public.admin_new_code(p_member_id text) returns text language plpgsql security definer set search_path=public,extensions as $$
declare al text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; b bytea; c text := ''; i int;
begin
  if not public.is_staff() then raise exception 'Solo admin o moderatori'; end if;
  if not exists (select 1 from public.members where id = p_member_id) then raise exception 'Socio non trovato'; end if;
  b := gen_random_bytes(12);
  for i in 0..11 loop c := c || substr(al, (get_byte(b, i) % 31) + 1, 1); end loop;
  insert into public.member_codes (member_id, code) values (p_member_id, c)
    on conflict (member_id) do update set code = excluded.code, created_at = now(), used_at = null, used_for = null;
  return substr(c,1,4) || '-' || substr(c,5,4) || '-' || substr(c,9,4);
end $$;
create or replace function public.admin_codes() returns table(member_id text, code text, created_at timestamptz, used_at timestamptz, used_for text)
 language sql stable security definer set search_path=public as $$
  select m.member_id, substr(m.code,1,4)||'-'||substr(m.code,5,4)||'-'||substr(m.code,9,4), m.created_at, m.used_at,
    case when public.is_admin() then m.used_for else null end
  from public.member_codes m where public.is_staff() $$;

-- gestione moderatori (solo admin)
create or replace function public.admin_moderators() returns setof text language sql stable security definer set search_path=public as $$
  select email from public.moderators where public.is_admin() order by email $$;
create or replace function public.admin_set_moderator(p_email text, p_on boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Solo gli admin'; end if;
  if p_on then insert into public.moderators(email) values (lower(trim(p_email))) on conflict do nothing;
  else delete from public.moderators where email = lower(trim(p_email)); end if;
end $$;
revoke all on function public.admin_moderators(), public.admin_set_moderator(text,boolean) from anon;
grant execute on function public.admin_moderators(), public.admin_set_moderator(text,boolean) to authenticated;
-- v10: niente accesso anonimo. Tutto solo per utenti autenticati.
do $$ declare r record; begin
  for r in select tablename,policyname from pg_policies where schemaname='public' and 'anon'=any(roles) loop
    execute format('alter policy %I on public.%I to authenticated', r.policyname, r.tablename);
  end loop;
  for r in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('revoke all on public.%I from anon', r.tablename);
  end loop;
  for r in select p.oid::regprocedure sig from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f' loop
    execute format('revoke execute on function %s from anon, public', r.sig);
  end loop;
end $$;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon, public;
-- policy in sola lettura/scrittura per autenticati
do $$ declare r record; begin
  for r in select p.oid::regprocedure sig from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f'
           and p.proname not in ('reset_password_with_code') and p.prorettype<>'trigger'::regtype loop
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;
-- unica eccezione per anon: reimpostare la password con il codice (la registrazione passa dai trigger su auth.users)
grant execute on function public.reset_password_with_code(text,text,text) to anon, authenticated;
-- v10.1: ricerca soci lato server (accenti e maiuscole ignorati), max 20 risultati
create extension if not exists unaccent with schema extensions;
create or replace function public.search_members(p_q text) returns table(id text) language sql stable security definer set search_path=public,extensions as $$
  select m.id from public.members m
  where auth.uid() is not null and length(trim(coalesce(p_q,'')))>=2
    and extensions.unaccent(lower(concat_ws(' ',m.nome,m.cognome,m.soprannome,m.nome))) like '%'||extensions.unaccent(lower(trim(p_q)))||'%'
  order by m.active desc, m.nome, m.cognome limit 20 $$;
revoke execute on function public.search_members(text) from anon, public;
grant execute on function public.search_members(text) to authenticated;
-- v10.3: staff (admin o moderatore) possono aggiungere giochi; update/delete solo admin
drop policy if exists games_admin_write on public.games;
drop policy if exists games_staff_insert on public.games;
drop policy if exists games_admin_update on public.games;
drop policy if exists games_admin_delete on public.games;
create policy games_staff_insert on public.games for insert to authenticated with check (public.is_staff());
create policy games_admin_update on public.games for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy games_admin_delete on public.games for delete to authenticated using (public.is_admin());
-- v10.3: chi non è staff apre tavoli solo come padrone di casa (socio collegato al proprio account)
create or replace function public.tables_host_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare mine text;
begin
  if public.is_staff() then return new; end if;
  if tg_op='UPDATE' and new.host_id is not distinct from old.host_id then return new; end if;
  select id into mine from public.members where user_id=auth.uid() limit 1;
  if mine is null then raise exception 'Account non collegato a un socio' using errcode='42501'; end if;
  if new.host_id is distinct from mine then raise exception 'Puoi ospitare solo come te stesso' using errcode='42501'; end if;
  return new;
end $$;
revoke execute on function public.tables_host_guard() from public, anon, authenticated;
drop trigger if exists tables_host_guard on public.tables;
create trigger tables_host_guard before insert or update on public.tables for each row execute function public.tables_host_guard();
-- v10.3: niente tavoli in date passate (ora di Roma), per tutti
create or replace function public.tables_no_past() returns trigger language plpgsql set search_path=public as $$
begin
  if new.date < (now() at time zone 'Europe/Rome')::date then raise exception 'Non puoi aprire tavoli in una data passata' using errcode='22007'; end if;
  return new;
end $$;
revoke execute on function public.tables_no_past() from public, anon, authenticated;
drop trigger if exists tables_no_past on public.tables;
create trigger tables_no_past before insert on public.tables for each row execute function public.tables_no_past();
