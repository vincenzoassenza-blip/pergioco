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
