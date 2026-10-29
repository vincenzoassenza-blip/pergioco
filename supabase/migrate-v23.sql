-- v23: dati BGG nei giochi (solo schema, nessun dato importato). Idempotente.
create or replace function public.txt_arr_ok(a text[], maxn int, maxlen int) returns boolean language sql immutable set search_path = public as $$
  select a is null or (cardinality(a) <= maxn and not exists(select 1 from unnest(a) x where x is null or btrim(x)='' or not public.txt_ok(x,maxlen))) $$;
create or replace function public.int_arr_ok(a int[], lo int, hi int, maxn int) returns boolean language sql immutable set search_path = public as $$
  select a is null or (cardinality(a) <= maxn and not exists(select 1 from unnest(a) x where x is null or x < lo or x > hi)) $$;
alter table public.games
  add column if not exists best_players int[],
  add column if not exists rec_players int[],
  add column if not exists play_time int,
  add column if not exists categories text[],
  add column if not exists mechanics text[],
  add column if not exists year int,
  add column if not exists is_expansion boolean not null default false;
-- min_players/max_players/min_time/max_time/bgg_id esistono già; min_age = colonna esistente "age"
alter table public.games drop constraint if exists games_bgg_chk;
alter table public.games add constraint games_bgg_chk check (
  public.int_arr_ok(best_players,1,100,20) and public.int_arr_ok(rec_players,1,100,20)
  and (play_time is null or play_time between 0 and 1440)
  and public.txt_arr_ok(categories,20,60) and public.txt_arr_ok(mechanics,40,60)
  and (year is null or year between 1800 and 2100)
  and (bgg_id is null or bgg_id between 1 and 99999999));
