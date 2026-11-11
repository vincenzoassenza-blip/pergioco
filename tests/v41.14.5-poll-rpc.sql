-- Regressione v41.14.5: chiama le RPC dei sondaggi con un sondaggio
-- di ogni typ (singola, multipla, date, gioco, voto, classifica).
-- Crea solo righe con titolo zz-v41145-*, notify_on=false, xp=0,
-- vota, chiama poll_lista come staff e come socio, poi elimina
-- soltanto quei sondaggi di prova. Non toccare il sondaggio
-- 46a2cee0 (Sistema prossima sessione) né gli altri già in produzione.

create temp table if not exists v41145_rpc(k text, ok boolean, detail text);
truncate v41145_rpc;

do $rpc$
declare
  u_mod uuid; e_mod text;
  u_soc uuid; e_soc text;
  typ text;
  pid uuid;
  ids uuid[];
  payload jsonb;
  choices jsonb;
  d jsonb;
  err text; ctx text;
  typ_ok int;
  titles text[] := array[
    'zz-v41145-singola',
    'zz-v41145-multipla',
    'zz-v41145-date',
    'zz-v41145-gioco',
    'zz-v41145-voto',
    'zz-v41145-classifica'
  ];
  types text[] := array['singola','multipla','date','gioco','voto','classifica'];
  i int;
  keep_ok boolean;
begin
  select m.user_id, usr.email into u_mod, e_mod
    from public.members m join auth.users usr on usr.id=m.user_id where m.id='modtest01';
  select m.user_id, usr.email into u_soc, e_soc
    from public.members m join auth.users usr on usr.id=m.user_id where m.id='demo-m05';
  if u_mod is null or u_soc is null then
    insert into v41145_rpc values ('setup', false, 'manca modtest01 o demo-m05');
    return;
  end if;

  -- pulizia eventuale residuo di una corsa precedente (solo zz-v41145-*)
  perform set_config('request.jwt.claims',
    json_build_object('sub',u_mod::text,'email',e_mod,'role','authenticated')::text, true);
  for pid in select id from public.polls where title like 'zz-v41145-%' loop
    perform public.poll_azione(pid, 'elimina');
  end loop;

  for i in 1..array_length(types,1) loop
    typ := types[i];
    payload := jsonb_build_object(
      'title', titles[i],
      'help', 'prova v41.14.5',
      'typ', typ,
      'results_vis', 'subito',
      'notify_on', false,
      'xp', 0,
      'anonymous', false
    );
    if typ = 'multipla' then
      payload := payload || jsonb_build_object('max_choices', 2);
    end if;
    if typ <> 'voto' then
      payload := payload || jsonb_build_object('options', jsonb_build_array(
        jsonb_build_object('label', case typ when 'date' then '2026-12-01' else 'Opzione A' end),
        jsonb_build_object('label', case typ when 'date' then '2026-12-08' else 'Opzione B' end),
        jsonb_build_object('label', case typ when 'date' then '2026-12-15' else 'Opzione C' end)
      ));
    end if;
    begin
      pid := public.poll_salva(payload);
      perform public.poll_azione(pid, 'apri');
      insert into v41145_rpc values ('crea-'||typ, true, pid::text);
    exception when others then
      get stacked diagnostics err = message_text, ctx = pg_exception_context;
      insert into v41145_rpc values ('crea-'||typ, false, err||' || '||ctx);
      continue;
    end;

    select coalesce(array_agg(o.id order by o.sort), '{}') into ids
      from public.poll_options o where o.poll_id=pid;

    if typ in ('singola','gioco') then
      choices := jsonb_build_object('id', ids[1]);
    elsif typ = 'multipla' then
      choices := jsonb_build_object('ids', jsonb_build_array(ids[1], ids[2]));
    elsif typ = 'date' then
      choices := jsonb_build_object('map', jsonb_build_object(
        ids[1]::text, 'si', ids[2]::text, 'forse', ids[3]::text, 'no'
      ));
    elsif typ = 'voto' then
      choices := jsonb_build_object('n', 4);
    elsif typ = 'classifica' then
      choices := jsonb_build_object('ord', jsonb_build_array(ids[2], ids[1], ids[3]));
    end if;

    -- voto come socio
    perform set_config('request.jwt.claims',
      json_build_object('sub',u_soc::text,'email',e_soc,'role','authenticated')::text, true);
    begin
      perform public.poll_vota(pid, choices);
      insert into v41145_rpc values ('vota-'||typ, true, 'ok');
    exception when others then
      get stacked diagnostics err = message_text, ctx = pg_exception_context;
      insert into v41145_rpc values ('vota-'||typ, false, err||' || '||ctx);
    end;

    -- poll_lista come socio (dopo ogni typ, in particolare dopo classifica)
    begin
      d := public.poll_lista();
      typ_ok := (select count(*) from jsonb_array_elements(d->'polls') p where p->>'id'=pid::text);
      insert into v41145_rpc values ('lista-socio-'||typ, typ_ok=1,
        'n='||jsonb_array_length(d->'polls')||' found='||typ_ok);
    exception when others then
      get stacked diagnostics err = message_text, ctx = pg_exception_context;
      insert into v41145_rpc values ('lista-socio-'||typ, false, err||' || '||ctx);
    end;

    -- poll_lista come moderatore
    perform set_config('request.jwt.claims',
      json_build_object('sub',u_mod::text,'email',e_mod,'role','authenticated')::text, true);
    begin
      d := public.poll_lista();
      typ_ok := (select count(*) from jsonb_array_elements(d->'polls') p where p->>'id'=pid::text);
      insert into v41145_rpc values ('lista-mod-'||typ, typ_ok=1,
        'n='||jsonb_array_length(d->'polls')||' found='||typ_ok||
        ' totals='||coalesce((d->'polls')->0->>'typ',''));
    exception when others then
      get stacked diagnostics err = message_text, ctx = pg_exception_context;
      insert into v41145_rpc values ('lista-mod-'||typ, false, err||' || '||ctx);
    end;
  end loop;

  -- lista finale deve contenere tutti i typ di prova e il sondaggio 46a2cee0
  perform set_config('request.jwt.claims',
    json_build_object('sub',u_mod::text,'email',e_mod,'role','authenticated')::text, true);
  begin
    d := public.poll_lista();
    typ_ok := 0;
    for typ in select unnest(types) loop
      if exists (
        select 1 from jsonb_array_elements(d->'polls') p
         where p->>'typ'=typ and p->>'title' like 'zz-v41145-%'
      ) then typ_ok := typ_ok + 1; end if;
    end loop;
    keep_ok := exists (
      select 1 from jsonb_array_elements(d->'polls') p
       where p->>'id' like '46a2cee0%'
    );
    insert into v41145_rpc values ('lista-finale-tipi', typ_ok=6, 'tipi_ok='||typ_ok);
    insert into v41145_rpc values ('lista-finale-keep-46a2cee0', keep_ok, 'kept='||keep_ok);
  exception when others then
    get stacked diagnostics err = message_text, ctx = pg_exception_context;
    insert into v41145_rpc values ('lista-finale', false, err||' || '||ctx);
  end;

  -- pulizia solo zz-v41145-*
  for pid in select id from public.polls where title like 'zz-v41145-%' loop
    begin
      perform public.poll_azione(pid, 'elimina');
    exception when others then
      get stacked diagnostics err = message_text;
      insert into v41145_rpc values ('elimina', false, pid::text||' '||err);
    end;
  end loop;
  insert into v41145_rpc values (
    'pulizia',
    not exists(select 1 from public.polls where title like 'zz-v41145-%'),
    'rimasti='||(select count(*) from public.polls where title like 'zz-v41145-%')
  );
  insert into v41145_rpc values (
    'keep-46a2cee0-dopo-pulizia',
    exists(select 1 from public.polls where id='46a2cee0-888c-489a-940e-8591dbb30f0e'),
    'ok'
  );
end $rpc$;

select k, ok, detail from v41145_rpc order by k;
