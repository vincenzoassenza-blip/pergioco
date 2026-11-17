-- v41.16.1 — icona dado-5, ricompensa Presidente (manuale, priorità 110); nessun assegnamento automatico.
create or replace function public.rc_icona_ok(p text)
returns boolean language sql immutable set search_path=public as $f$
  select p is null or p in (
    'socio-fondatore-b','pioniere','tester','dado-5','coppa','d20','pergamena','clessidra','lanterna'
  );
$f$;
revoke all on function public.rc_icona_ok(text) from public, anon;
grant execute on function public.rc_icona_ok(text) to authenticated;

insert into public.ricompense(id,nome,titolo,icona,colore_nome,cornice,sfondo,avatar_sbloccati,visibile,modo,modo_param,priorita)
values
  ('presidente','Presidente','Presidente','dado-5','#c4921a','oro','navy-gold',
    array[]::text[], true, 'manuale', '{}'::jsonb, 110)
on conflict (id) do nothing;
