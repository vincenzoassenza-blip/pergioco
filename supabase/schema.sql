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
