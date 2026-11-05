-- v41.8 — Pagina Giochi: testi della striscia e titolo della collezione modificabili (riga app_settings 'testi').
-- Allarga solo l'elenco delle chiavi ammesse da testi_valid; stesse regole (niente < > " &). Idempotente.
create or replace function public.testi_valid(v jsonb) returns boolean language plpgsql immutable set search_path=public as $f$
declare k text; s text; lim jsonb:='{"santo":[2,40],"festa":[0,5],"antero":[2,20],"anteri":[2,20],"coppa_breve":[2,30],"coppa_plur":[2,30],
 "coppa_intro":[0,400],"coppa_regole_tavoli":[0,600],"coppa_regole_1v1":[0,600],"ente_nome":[2,80],"ente_cf":[0,16],
 "collezione":[2,40],"g8_oggi":[2,30],"g8_prox":[2,30],"g8_tav1":[2,20],"g8_tavn":[2,20],"g8_lib1":[2,30],"g8_libn":[2,30],"g8_pieni":[2,40]}';
begin
  if v is null or jsonb_typeof(v)<>'object' then return false; end if;
  for k in select jsonb_object_keys(v) loop
    if not lim ? k then return false; end if;
    if jsonb_typeof(v->k)<>'string' then return false; end if;
    s:=v->>k;
    if char_length(btrim(s)) not between (lim->k->>0)::int and (lim->k->>1)::int then return false; end if;
    if s ~ '[<>]' then return false; end if;
    if k not in ('coppa_intro','coppa_regole_tavoli','coppa_regole_1v1') and s ~ '["&]' then return false; end if;
    if k='ente_cf' and s !~ '^[A-Za-z0-9]*$' then return false; end if;
    if k='festa' and btrim(s) !~ '^((0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]))?$' then return false; end if;
  end loop;
  return true;
end $f$;
revoke all on function public.testi_valid(jsonb) from public, anon;
grant execute on function public.testi_valid(jsonb) to authenticated;
