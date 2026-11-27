-- v41.21.1 — Corregge ricompense_sync_auto: «Aggiorna le automatiche»
-- falliva con E-SOCI-99-EACD perché SELECT DISTINCT rendeva il NULL di
-- assegnata_da di tipo text, mentre la colonna è uuid.
-- Si allinea anche al vincolo privacy delle altre RPC di scrittura.

create or replace function public.ricompense_sync_auto()
returns jsonb language plpgsql security definer set search_path=public as $f$
declare
  r record;
  v_entro date;
  v_escl text[];
  v_n int := 0;
  n int;
begin
  perform public.require_privacy_ok();
  if auth.uid() is null or not public.is_staff() then raise exception 'Solo admin o moderatori' using errcode='42501'; end if;
  for r in select * from public.ricompense where modo='tessera_entro' loop
    begin
      v_entro := (r.modo_param->>'entro')::date;
    exception when others then
      continue;
    end;
    if v_entro is null then continue; end if;
    v_escl := array(
      select jsonb_array_elements_text(coalesce(r.modo_param->'escludi','[]'::jsonb))
    );
    insert into public.socio_ricompense(member_id, ricompensa_id, assegnata_da, auto)
    select distinct ls.member_id, r.id, null::uuid, true
    from public.libro_soci ls
    join public.libro_quote q on q.socio_id=ls.id
    where ls.member_id is not null
      and ls.member_id ~ '^[A-Za-z0-9_-]{1,64}$'
      and exists (select 1 from public.members m where m.id=ls.member_id)
      and (
        (q.data_pagamento is not null and q.data_pagamento <= v_entro)
        or (q.data_pagamento is null and q.anno <= extract(year from v_entro)::int)
      )
      and not exists (
        select 1 from public.socio_ricompense x
        where x.member_id=ls.member_id and x.ricompensa_id = any(v_escl)
      )
    on conflict (member_id, ricompensa_id) do nothing;
    get diagnostics n = row_count;
    v_n := v_n + n;
  end loop;
  return jsonb_build_object('assegnate', v_n);
end
$f$;
revoke all on function public.ricompense_sync_auto() from public, anon;
grant execute on function public.ricompense_sync_auto() to authenticated;
