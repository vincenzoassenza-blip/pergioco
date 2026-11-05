-- v41.7 — Barra in alto: tre colori in più nella config 'brand' (barra1, barra2, filo).
-- Da applicare PRIMA di pubblicare la v41.7: senza, il salvataggio della Configurazione con i nuovi colori viene rifiutato dal CHECK.
-- Allarga solo l'elenco delle chiavi ammesse in colori; resto invariato. Idempotente.
do $$
declare d text;
begin
  select pg_get_functiondef('public.brand_valid(jsonb)'::regprocedure) into d;
  if position('''barra1''' in d)=0 then
    d:=replace(d,'(''primario'',''secondario'',''accento'',''sfondo'')','(''primario'',''secondario'',''accento'',''sfondo'',''barra1'',''barra2'',''filo'')');
    execute d;
  end if;
end $$;
revoke all on function public.brand_valid(jsonb) from public, anon;
grant execute on function public.brand_valid(jsonb) to authenticated;
