-- v15: limiti di lunghezza e formato su tutti i campi di testo (difesa lato DB).
-- Idempotente: ogni vincolo viene ricreato. Nessun dato esistente li viola (verificato prima dell'applicazione).
create or replace function public.txt_ok(t text, maxlen int) returns boolean language sql immutable set search_path = public as $$
  select t is null or (char_length(t) <= maxlen and t !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]')
$$;
do $$
declare r record;
begin
  for r in select * from (values
    ('games','name',100),('games','thumb',500),
    ('members','nome',60),('members','cognome',60),('members','soprannome',40),('members','tessera',30),('members','avatar',16),('members','fav_game_id',64),
    ('plays','note',1000),('plays','scenario',100),('plays','evening',20),
    ('tables','note',300),('tables','evening',20),('tables','start_time',5),
    ('eventi','titolo',120),('eventi','descrizione',3000),('eventi','luogo',150),('eventi','immagine',500),
    ('evento_pren','ospite',80),('evento_pren','caparra_da',254),
    ('game_ratings','commento',200),
    ('libro_soci','nome',60),('libro_soci','cognome',60),('libro_soci','luogo_nascita',100),('libro_soci','codice_fiscale',16),('libro_soci','indirizzo',200),('libro_soci','comune',100),('libro_soci','provincia',2),('libro_soci','numero_tessera',30),('libro_soci','motivo_uscita',300),
    ('libro_volontari','nome',60),('libro_volontari','cognome',60),('libro_volontari','codice_fiscale',16),('libro_volontari','attivita',300),('libro_volontari','assicurazione',200),
    ('libro_audit','dettaglio',2000),('admins','email',254),('moderators','email',254)
  ) v(t,c,n) loop
    execute format('alter table public.%I drop constraint if exists %I', r.t, r.t||'_'||r.c||'_len_chk');
    -- descrizione/note ammettono a capo (\n, \r): txt_ok li consente
    execute format('alter table public.%I add constraint %I check (public.txt_ok(%I, %s))', r.t, r.t||'_'||r.c||'_len_chk', r.c, r.n);
  end loop;
end $$;
-- id generati dall'app: solo caratteri sicuri
alter table public.games   drop constraint if exists games_id_fmt_chk;   alter table public.games   add constraint games_id_fmt_chk   check (id ~ '^[A-Za-z0-9_-]{1,64}$');
alter table public.members drop constraint if exists members_id_fmt_chk; alter table public.members add constraint members_id_fmt_chk check (id ~ '^[A-Za-z0-9_-]{1,64}$');
alter table public.plays   drop constraint if exists plays_id_fmt_chk;   alter table public.plays   add constraint plays_id_fmt_chk   check (id ~ '^[A-Za-z0-9_-]{1,64}$');
alter table public.tables  drop constraint if exists tables_id_fmt_chk;  alter table public.tables  add constraint tables_id_fmt_chk  check (id ~ '^[A-Za-z0-9_-]{1,64}$');
-- link: solo https (locandina) / http(s) (copertine giochi), niente javascript: o data:
alter table public.eventi drop constraint if exists eventi_immagine_https_chk; alter table public.eventi add constraint eventi_immagine_https_chk check (immagine is null or immagine ~* '^https://[^\s"''<>]+$');
alter table public.games  drop constraint if exists games_thumb_http_chk;     alter table public.games  add constraint games_thumb_http_chk check (thumb is null or thumb ~* '^https?://[^\s"''<>]+$');
alter table public.members drop constraint if exists members_color_chk;       alter table public.members add constraint members_color_chk check (color is null or color ~ '^#[0-9a-fA-F]{6}$');
-- campi obbligatori non vuoti
alter table public.games   drop constraint if exists games_name_nonempty_chk;   alter table public.games   add constraint games_name_nonempty_chk check (btrim(name) <> '');
alter table public.members drop constraint if exists members_nome_nonempty_chk; alter table public.members add constraint members_nome_nonempty_chk check (btrim(nome) <> '');
-- JSON: dimensione massima (evita righe enormi)
alter table public.plays  drop constraint if exists plays_players_size_chk;  alter table public.plays  add constraint plays_players_size_chk  check (players is null or (jsonb_typeof(players)='array' and length(players::text) <= 20000));
alter table public.tables drop constraint if exists tables_players_size_chk; alter table public.tables add constraint tables_players_size_chk check (players is null or (jsonb_typeof(players)='array' and length(players::text) <= 20000));
alter table public.libro_import_report drop constraint if exists libro_import_report_size_chk; alter table public.libro_import_report add constraint libro_import_report_size_chk check (length(report::text) <= 2000000);
-- funzioni non security definer: search_path fisso anche qui
alter function public.eventi_guard() set search_path = public;
alter function public.level_for_xp(integer) set search_path = public;
alter function public.xp_for_level(integer) set search_path = public;
alter function public.libro_norm(text) set search_path = public;
alter function public.norm_code(text) set search_path = public;
alter function public.plays_scores_ok(jsonb) set search_path = public;
-- funzioni trigger/interne: non eseguibili da anon
revoke execute on function public.ev_pren_trg() from public, anon;
revoke execute on function public.eventi_guard() from public, anon;
