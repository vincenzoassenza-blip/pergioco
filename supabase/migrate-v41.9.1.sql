-- v41.9.1 — Etichette filtri Gestione Partite (gp_*).
-- Conserva la validazione esistente, estendendo solo la allowlist.
do $$ declare d text; begin
 select pg_get_functiondef('public.testi_valid(jsonb)'::regprocedure) into d;
 if position('"gp_period"' in d)=0 then
  if position('"ibgg_esito":[2,40]' in d)=0 then raise exception 'Formato testi_valid inatteso: verificare prima della migrazione'; end if;
  d:=replace(d,'"ibgg_esito":[2,40]','"ibgg_esito":[2,40],"gp_period":[1,40],"gp_member":[1,40],"gp_all":[1,40],"gp_range":[1,40],"gp_from":[1,40],"gp_to":[1,40]');
  execute d;
 end if;
end $$;
revoke all on function public.testi_valid(jsonb) from public, anon;
grant execute on function public.testi_valid(jsonb) to authenticated;
