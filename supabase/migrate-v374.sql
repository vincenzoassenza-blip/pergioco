-- v37.4: record assoluti aggregati (solo totali per socio, nessun dettaglio su chi ha votato cosa / nemesi / bilanci)
-- Serve una RPC perché presenze, voti e "spiego" sono leggibili via RLS solo dal diretto interessato.
create or replace function public.record_assoluti()
returns table(k text, member_id text, v integer)
language sql stable security definer set search_path = public as $$
  select * from (
    select 'presenze'::text, p.member_id, count(*)::int from evento_pren p join eventi e on e.id=p.evento_id
      where p.presente and p.member_id is not null and not e.annullato group by p.member_id
    union all select 'voti', member_id, count(*)::int from desideri_voti group by member_id
    union all select 'spiego', member_id, count(*)::int from desideri_spiego group by member_id
    union all select 'desideri', proposto_da, count(*)::int from desideri where proposto_da is not null group by proposto_da
    union all select 'coppe', campione, count(*)::int from coppe where campione is not null and stato<>'bozza' group by campione
    union all select 'coppa_vinti', i.vincitore, count(*)::int from coppa_incontri i join coppe c on c.id=i.coppa_id
      where i.vincitore is not null and c.stato<>'bozza' group by i.vincitore
  ) x(k, member_id, v)
  where auth.uid() is not null and x.member_id in (select id from members where active);
$$;
revoke all on function public.record_assoluti() from public, anon;
grant execute on function public.record_assoluti() to authenticated;
