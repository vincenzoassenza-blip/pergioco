-- v14: vincoli numerici lato database (rieseguibile)
create or replace function public.plays_scores_ok(p jsonb) returns boolean language sql immutable as $$
  select coalesce(bool_and(x->>'score' is null or x->>'score'='' or (x->>'score' ~ '^-?[0-9]+([.,][0-9]+)?$' and abs(replace(x->>'score',',','.')::numeric)<=99999)),true)
  from jsonb_array_elements(case when jsonb_typeof(p)='array' then p else '[]'::jsonb end) x $$;
alter table public.games drop constraint if exists games_num_chk;
alter table public.games add constraint games_num_chk check (min_players between 1 and 100 and max_players between min_players and 100 and min_time between 0 and 1440 and max_time between min_time and 1440 and age between 0 and 99);
alter table public.tables drop constraint if exists tables_seats_chk;
alter table public.tables add constraint tables_seats_chk check (seats between 1 and 100);
alter table public.plays drop constraint if exists plays_scores_chk;
alter table public.plays add constraint plays_scores_chk check (public.plays_scores_ok(players));
alter table public.eventi drop constraint if exists eventi_importi_max_chk;
alter table public.eventi add constraint eventi_importi_max_chk check (coalesce(quota,0)<=10000 and coalesce(caparra,0)<=10000);
alter table public.evento_pren drop constraint if exists evento_pren_caparra_chk;
alter table public.evento_pren add constraint evento_pren_caparra_chk check (caparra_importo is null or caparra_importo between 0 and 10000);
alter table public.libro_quote drop constraint if exists libro_quote_importo_max_chk;
alter table public.libro_quote add constraint libro_quote_importo_max_chk check (importo is null or importo<=100000);
