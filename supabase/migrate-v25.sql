-- v25: dati extra BGG per il consigliere ("Aiutami a scegliere"). NON mostrati nella UI.
-- Applicare con: SQL editor Supabase (dopo conferma), poi seed-meta-v25.sql.
create table if not exists public.game_meta(
 game_id text primary key references public.games(id) on delete cascade,
 bgg_id integer check (bgg_id between 1 and 99999999),
 weight numeric(3,2) check (weight between 1 and 5),
 best_players integer[] check (cardinality(best_players)<=20 and 1<=all(best_players) and 100>=all(best_players)),
 rec_players integer[] check (cardinality(rec_players)<=20 and 1<=all(rec_players) and 100>=all(rec_players)),
 min_age smallint check (min_age between 0 and 99),
 lang_dep smallint check (lang_dep between 0 and 4),          -- 0 nessun testo … 4 ingiocabile in altra lingua
 bgg_rank integer check (bgg_rank between 1 and 1000000),
 bgg_avg numeric(4,2) check (bgg_avg between 0 and 10),
 mechanics text[] check (cardinality(mechanics)<=60),
 categories text[] check (cardinality(categories)<=40),
 subdomains text[] check (cardinality(subdomains)<=10),
 interaction smallint check (interaction between 0 and 2),     -- 0 cooperativo, 1 indiretta, 2 diretta
 luck smallint check (luck between 0 and 2),                   -- 0 controllo … 2 molta fortuna
 status text not null default 'pending' check (status in ('pending','ok','error','nobgg')),
 attempts smallint not null default 0 check (attempts between 0 and 100),
 last_error text check (char_length(last_error)<=300),
 fetched_at timestamptz,
 updated_at timestamptz not null default now());
create index if not exists game_meta_status_idx on public.game_meta(status);
-- lunghezza di ogni voce dei testi (array) <= 80
create or replace function public.game_meta_check() returns trigger language plpgsql set search_path=public as $$
begin
 if exists(select 1 from unnest(coalesce(new.mechanics,'{}')||coalesce(new.categories,'{}')||coalesce(new.subdomains,'{}')) t where char_length(t)>80 or t ~ '[<>"`]') then raise exception 'game_meta: voce non valida'; end if;
 new.updated_at=now(); return new; end $$;
drop trigger if exists game_meta_check on public.game_meta;
create trigger game_meta_check before insert or update on public.game_meta for each row execute function public.game_meta_check();

alter table public.game_meta enable row level security;
revoke all on public.game_meta from anon, public;
grant select on public.game_meta to authenticated;
grant insert, update, delete on public.game_meta to authenticated; -- filtrato dalle policy (solo admin)
drop policy if exists game_meta_read on public.game_meta;
create policy game_meta_read on public.game_meta for select to authenticated using (true);
drop policy if exists game_meta_admin on public.game_meta;
create policy game_meta_admin on public.game_meta for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Ogni gioco nuovo nasce con i dati "in arrivo"; la Edge Function li completa.
create or replace function public.game_meta_on_game() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.game_meta(game_id,bgg_id,status) values(new.id,new.bgg_id,case when new.bgg_id is null and new.is_expansion then 'nobgg' else 'pending' end)
 on conflict (game_id) do update set bgg_id=coalesce(excluded.bgg_id,game_meta.bgg_id), status=case when game_meta.bgg_id is distinct from excluded.bgg_id and excluded.bgg_id is not null then 'pending' else game_meta.status end;
 return new; end $$;
revoke all on function public.game_meta_on_game() from public, anon, authenticated;
drop trigger if exists game_meta_on_game on public.games;
create trigger game_meta_on_game after insert or update of bgg_id on public.games for each row execute function public.game_meta_on_game();

-- Lo staff vede quali giochi aspettano ancora i dati (solo id e stato).
create or replace function public.staff_meta_pending() returns table(game_id text,status text,attempts smallint)
language sql stable security definer set search_path=public as $$
 select m.game_id,m.status,m.attempts from public.game_meta m where public.is_staff() and m.status in ('pending','error') $$;
revoke all on function public.staff_meta_pending() from public, anon;
grant execute on function public.staff_meta_pending() to authenticated;

-- Righe "in arrivo" anche per i giochi già presenti senza dati.
insert into public.game_meta(game_id,bgg_id,status) select g.id,g.bgg_id,'pending' from public.games g on conflict do nothing;
