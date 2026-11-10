-- v41.12 — Record e badge GDR configurabili (app_settings key='gdr_rec').
-- Idempotente. Nessuna modifica a plays, games, game_meta, member_xp / member_xp_base / member_xp_cp.
-- GRANT solo authenticated. Scrittura già coperta da app_settings_admin_write (is_admin()).

create or replace function public.gdr_rec_valid(v jsonb) returns boolean
language plpgsql immutable set search_path=public as $f$
declare
  rec_ids constant text[] := array['sessioni','ore','sistemi','master','campagne','mese','oneshot'];
  badge_ids constant text[] := array['gs1','gs5','gs10','gs25','gh3','gh10','gh30','gy3','gy8','gm1','gm5','gm15','gc1','gc3','go5','gmo4','gpg5'];
  k text; r jsonb; b jsonb; n int; id text;
begin
  if v is null or jsonb_typeof(v)<>'object' then return false; end if;
  if exists(select 1 from jsonb_object_keys(v) x where x not in ('attivo','rec','badge')) then return false; end if;
  if jsonb_typeof(v->'attivo') is distinct from 'boolean' then return false; end if;
  if jsonb_typeof(v->'rec') is distinct from 'object' then return false; end if;
  if exists(select 1 from jsonb_object_keys(v->'rec') x where x <> all(rec_ids)) then return false; end if;
  foreach id in array rec_ids loop
    r := v->'rec'->id;
    if r is null or jsonb_typeof(r)<>'object' then return false; end if;
    if exists(select 1 from jsonb_object_keys(r) x where x not in ('nome')) then return false; end if;
    if jsonb_typeof(r->'nome')<>'string' or char_length(btrim(r->>'nome')) not between 2 and 40 or (r->>'nome') ~ '[<>]' then return false; end if;
  end loop;
  if jsonb_typeof(v->'badge') is distinct from 'object' then return false; end if;
  if exists(select 1 from jsonb_object_keys(v->'badge') x where x <> all(badge_ids)) then return false; end if;
  foreach id in array badge_ids loop
    b := v->'badge'->id;
    if b is null or jsonb_typeof(b)<>'object' then return false; end if;
    if exists(select 1 from jsonb_object_keys(b) x where x not in ('nome','desc','soglia')) then return false; end if;
    if jsonb_typeof(b->'nome')<>'string' or char_length(btrim(b->>'nome')) not between 2 and 40 or (b->>'nome') ~ '[<>]' then return false; end if;
    if jsonb_typeof(b->'desc')<>'string' or char_length(btrim(b->>'desc')) not between 2 and 120 or (b->>'desc') ~ '[<>]' then return false; end if;
    if jsonb_typeof(b->'soglia')<>'number' or (b->>'soglia') !~ '^[0-9]+$' then return false; end if;
    n := (b->>'soglia')::int;
    if id in ('gs1','gm1','gc1') and n not between 1 and 99 then return false; end if;
    if id in ('gs5','gs10','gs25','gm5','gm15','gc3','go5','gpg5','gy3','gy8') and n not between 1 and 99 then return false; end if;
    if id in ('gh3','gh10','gh30') and n not between 1 and 200 then return false; end if;
    if id = 'gmo4' and n not between 1 and 31 then return false; end if;
  end loop;
  return true;
end
$f$;
revoke all on function public.gdr_rec_valid(jsonb) from public, anon;
grant execute on function public.gdr_rec_valid(jsonb) to authenticated;

alter table public.app_settings drop constraint if exists app_settings_gdr_rec_chk;
alter table public.app_settings add constraint app_settings_gdr_rec_chk
  check (key <> 'gdr_rec' or public.gdr_rec_valid(value));

insert into public.app_settings(key, value) values (
  'gdr_rec',
  '{
    "attivo": true,
    "rec": {
      "sessioni": {"nome": "Sessioni giocate"},
      "ore": {"nome": "Ore di gioco"},
      "sistemi": {"nome": "Sistemi diversi"},
      "master": {"nome": "Master più attivo"},
      "campagne": {"nome": "Campagne concluse"},
      "mese": {"nome": "Più sessioni in un mese"},
      "oneshot": {"nome": "Più one-shot"}
    },
    "badge": {
      "gs1": {"nome": "Prima sessione", "desc": "Gioca la prima sessione GDR", "soglia": 1},
      "gs5": {"nome": "Cantastorie", "desc": "Gioca 5 sessioni GDR", "soglia": 5},
      "gs10": {"nome": "Lanterna accesa", "desc": "Gioca 10 sessioni GDR", "soglia": 10},
      "gs25": {"nome": "Veterano del dungeon", "desc": "Gioca 25 sessioni GDR", "soglia": 25},
      "gh3": {"nome": "Primo veglione", "desc": "Accumula 3 ore di gioco di ruolo", "soglia": 3},
      "gh10": {"nome": "Veglia notturna", "desc": "Accumula 10 ore di gioco di ruolo", "soglia": 10},
      "gh30": {"nome": "Maratona epica", "desc": "Accumula 30 ore di gioco di ruolo", "soglia": 30},
      "gy3": {"nome": "Esploratore di mondi", "desc": "Prova 3 sistemi di gioco diversi", "soglia": 3},
      "gy8": {"nome": "Atlante dei regni", "desc": "Prova 8 sistemi di gioco diversi", "soglia": 8},
      "gm1": {"nome": "Dietro lo schermo", "desc": "Conduci la prima sessione da master", "soglia": 1},
      "gm5": {"nome": "Narratore assiduo", "desc": "Conduci 5 sessioni da master", "soglia": 5},
      "gm15": {"nome": "Archimago della gilda", "desc": "Conduci 15 sessioni da master", "soglia": 15},
      "gc1": {"nome": "Prima campagna", "desc": "Concludi una campagna", "soglia": 1},
      "gc3": {"nome": "Saga completa", "desc": "Concludi 3 campagne", "soglia": 3},
      "go5": {"nome": "Storia in una sera", "desc": "Gioca 5 one-shot", "soglia": 5},
      "gmo4": {"nome": "Mese d''avventura", "desc": "Gioca 4 sessioni GDR nello stesso mese", "soglia": 4},
      "gpg5": {"nome": "Molteplici identità", "desc": "Interpreta 5 personaggi diversi", "soglia": 5}
    }
  }'::jsonb
) on conflict (key) do nothing;
