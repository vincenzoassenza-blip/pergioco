-- v41.13 — Sondaggi in Community.
-- Idempotente. Nessuna modifica a plays, games, game_meta, member_xp_base / member_xp_cp.
-- member_xp() resta la somma esistente più gli XP sondaggio già assegnati (0 in assenza di voti).
-- GRANT execute solo a authenticated (anon e public revocati). Nessuna scrittura diretta sulle tabelle.
-- Anonimato reale: in un sondaggio anonimo poll_ballots.member_id è sempre NULL.

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  help text,
  typ text not null,
  status text not null default 'bozza',
  closes_at timestamptz,
  results_vis text not null default 'dopo_voto',
  anonymous boolean not null default false,
  allow_add boolean not null default false,
  pinned boolean not null default false,
  notify_on boolean not null default true,
  remind_hours integer not null default 24,
  xp integer not null default 0,
  badge_icon text,
  badge_name text,
  max_choices integer not null default 2,
  created_by text,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint polls_typ_chk check (typ in ('singola','multipla','date','gioco','voto','classifica')),
  constraint polls_status_chk check (status in ('bozza','aperto','chiuso','archiviato')),
  constraint polls_vis_chk check (results_vis in ('subito','dopo_voto','chiusura')),
  constraint polls_title_chk check (char_length(btrim(title)) between 1 and 80),
  constraint polls_help_chk check (help is null or char_length(help) <= 280),
  constraint polls_xp_chk check (xp between 0 and 50),
  constraint polls_max_chk check (max_choices between 1 and 8),
  constraint polls_remind_chk check (remind_hours between 0 and 168),
  constraint polls_badge_icon_chk check (badge_icon is null or char_length(badge_icon) between 1 and 16),
  constraint polls_badge_name_chk check (badge_name is null or char_length(badge_name) between 1 and 40),
  constraint polls_created_by_fk foreign key (created_by) references public.members(id)
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  sort integer not null default 0,
  game_id text,
  bgg_id integer,
  thumb text,
  added_by text references public.members(id),
  created_at timestamptz not null default now(),
  constraint poll_options_label_chk check (char_length(btrim(label)) between 1 and 80),
  constraint poll_options_bgg_chk check (bgg_id is null or (bgg_id >= 1 and bgg_id <= 99999999)),
  constraint poll_options_thumb_chk check (
    thumb is null or (
      char_length(thumb) <= 400
      and thumb ~ '^https://cf\.geekdo-images\.com/[A-Za-z0-9_./%=:()-]+$'
    )
  )
);
create index if not exists poll_options_poll_idx on public.poll_options(poll_id, sort);

create table if not exists public.poll_participants (
  poll_id uuid not null references public.polls(id) on delete cascade,
  member_id text not null references public.members(id),
  voted_at timestamptz not null default now(),
  primary key (poll_id, member_id)
);

-- member_id è NULL se e solo se il sondaggio è anonimo (vincolo applicato in RPC; nessun default dal client).
create table if not exists public.poll_ballots (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  member_id text references public.members(id),
  choices jsonb not null,
  created_at timestamptz not null default date_trunc('day', now())
);
create index if not exists poll_ballots_poll_idx on public.poll_ballots(poll_id);

create table if not exists public.poll_xp_grant (
  poll_id uuid not null references public.polls(id) on delete cascade,
  member_id text not null references public.members(id),
  xp integer not null check (xp between 1 and 50),
  awarded_at timestamptz not null default now(),
  primary key (poll_id, member_id)
);

create table if not exists public.poll_badge_grant (
  poll_id uuid not null references public.polls(id) on delete cascade,
  member_id text not null references public.members(id),
  icon text not null check (char_length(icon) between 1 and 16),
  name text not null check (char_length(name) between 1 and 40),
  awarded_at timestamptz not null default now(),
  primary key (poll_id, member_id)
);

create table if not exists public.poll_notices (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  member_id text not null references public.members(id),
  kind text not null check (kind in ('uscita','promemoria')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (poll_id, member_id, kind)
);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_participants enable row level security;
alter table public.poll_ballots enable row level security;
alter table public.poll_xp_grant enable row level security;
alter table public.poll_badge_grant enable row level security;
alter table public.poll_notices enable row level security;

revoke all on table public.polls, public.poll_options, public.poll_participants, public.poll_ballots,
  public.poll_xp_grant, public.poll_badge_grant, public.poll_notices from public, anon, authenticated;

-- Nessuna policy di scrittura. Lettura tabelle non necessaria: tutto passa da RPC security definer.
drop policy if exists polls_no_direct on public.polls;
drop policy if exists poll_ballots_no_direct on public.poll_ballots;

create or replace function public.poll_me() returns text language sql stable security definer set search_path=public as $$
  select public.cp_me();
$$;

create or replace function public.poll_clean(t text, n int) returns text language sql immutable as $$
  select nullif(left(btrim(regexp_replace(coalesce(t,''),'[\u0000-\u001f<>]','','g')), n), '');
$$;

create or replace function public.poll_chiudi_scaduti() returns integer
language plpgsql security definer set search_path=public as $$
declare n int;
begin
  update public.polls
     set status='chiuso', closed_at=coalesce(closed_at, now()), updated_at=now()
   where status='aperto' and closes_at is not null and closes_at <= now();
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.poll_choices_ok(p_typ text, p_max int, p_opts uuid[], p_choices jsonb)
returns boolean language plpgsql immutable as $$
declare ids uuid[]; e uuid; k text; v text; n int; seen uuid[] := '{}';
begin
  if p_choices is null or jsonb_typeof(p_choices) <> 'object' then return false; end if;
  if p_typ = 'singola' or p_typ = 'gioco' then
    if jsonb_typeof(p_choices->'id') is null then return false; end if;
    begin e := (p_choices->>'id')::uuid; exception when others then return false; end;
    return e = any(p_opts) and (p_choices - 'id') = '{}'::jsonb;
  elsif p_typ = 'multipla' then
    if jsonb_typeof(p_choices->'ids') <> 'array' then return false; end if;
    n := jsonb_array_length(p_choices->'ids');
    if n < 1 or n > greatest(1, coalesce(p_max, 2)) then return false; end if;
    for e in select (x#>>'{}')::uuid from jsonb_array_elements(p_choices->'ids') x
    loop
      if e is null or not (e = any(p_opts)) or e = any(seen) then return false; end if;
      seen := seen || e;
    end loop;
    return (p_choices - 'ids') = '{}'::jsonb;
  elsif p_typ = 'date' then
    if jsonb_typeof(p_choices->'map') <> 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(p_choices->'map')) <> coalesce(array_length(p_opts,1),0) then return false; end if;
    for k, v in select key, value#>>'{}' from jsonb_each(p_choices->'map')
    loop
      begin e := k::uuid; exception when others then return false; end;
      if not (e = any(p_opts)) then return false; end if;
      if v not in ('si','forse','no') then return false; end if;
    end loop;
    return (p_choices - 'map') = '{}'::jsonb;
  elsif p_typ = 'voto' then
    n := case when jsonb_typeof(p_choices->'n')='number' then (p_choices->>'n')::int end;
    if n is null or n < 1 or n > 5 then return false; end if;
    if p_choices ? 'commento' then
      if jsonb_typeof(p_choices->'commento') <> 'string' then return false; end if;
      if char_length(p_choices->>'commento') > 200 then return false; end if;
    end if;
    return (p_choices - 'n' - 'commento') = '{}'::jsonb;
  elsif p_typ = 'classifica' then
    if jsonb_typeof(p_choices->'ord') <> 'array' then return false; end if;
    n := jsonb_array_length(p_choices->'ord');
    if n <> coalesce(array_length(p_opts,1),0) or n < 2 then return false; end if;
    for e in select (x#>>'{}')::uuid from jsonb_array_elements(p_choices->'ord') x
    loop
      if e is null or not (e = any(p_opts)) or e = any(seen) then return false; end if;
      seen := seen || e;
    end loop;
    return (p_choices - 'ord') = '{}'::jsonb;
  end if;
  return false;
end $$;

create or replace function public.poll_notify(p_id uuid, p_kind text) returns void
language plpgsql security definer set search_path=public as $$
begin
  insert into public.poll_notices(poll_id, member_id, kind)
  select p_id, m.id, p_kind
    from public.members m
   where m.active and m.user_id is not null
     and (p_kind <> 'promemoria' or not exists (
        select 1 from public.poll_participants t where t.poll_id=p_id and t.member_id=m.id))
  on conflict (poll_id, member_id, kind) do nothing;
end $$;

create or replace function public.poll_tick() returns void
language plpgsql security definer set search_path=public as $$
declare r record;
begin
  perform public.poll_chiudi_scaduti();
  for r in
    select id, remind_hours, closes_at from public.polls
     where status='aperto' and remind_hours > 0 and closes_at is not null
       and now() >= closes_at - make_interval(hours => remind_hours)
  loop
    perform public.poll_notify(r.id, 'promemoria');
  end loop;
end $$;

create or replace function public.poll_can_see(p public.polls, p_me text, p_staff boolean, p_voted boolean)
returns boolean language sql immutable as $$
  select p_staff
      or p.results_vis = 'subito'
      or (p.results_vis = 'dopo_voto' and (p_voted or p.status in ('chiuso','archiviato')))
      or (p.results_vis = 'chiusura' and p.status in ('chiuso','archiviato'));
$$;

create or replace function public.poll_lista() returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  me text := public.cp_me();
  st boolean := public.is_staff();
  has_act boolean := false;
  rows jsonb := '[]'::jsonb;
  r record;
  voted boolean;
  see boolean;
  opts jsonb;
  totals jsonb;
  names jsonb;
  n_ok int;
  n_all int;
begin
  if me is null and not st then raise exception 'Solo i soci possono vedere i sondaggi'; end if;
  perform public.poll_tick();
  has_act := exists(
    select 1 from public.polls p
     where p.status='aperto' and (p.closes_at is null or p.closes_at > now())
  );
  select count(*)::int into n_all from public.members m where m.active;
  for r in
    select * from public.polls p
     where (st)
        or (p.status='aperto' and (p.closes_at is null or p.closes_at > now()))
        or (p.status='chiuso' and has_act)
     order by (p.status='aperto' and p.pinned) desc, p.published_at desc nulls last, p.created_at desc
  loop
    voted := me is not null and exists(select 1 from public.poll_participants t where t.poll_id=r.id and t.member_id=me);
    see := public.poll_can_see(r, me, st, voted);
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',o.id,'label',o.label,'sort',o.sort,'game_id',o.game_id,'bgg_id',o.bgg_id,'thumb',o.thumb
    ) order by o.sort, o.created_at), '[]') into opts
    from public.poll_options o where o.poll_id=r.id;
    totals := null; names := null;
    if see then
      if r.typ in ('singola','gioco') then
        select coalesce(jsonb_object_agg(x.k, x.c), '{}') into totals from (
          select b.choices->>'id' k, count(*)::int c from public.poll_ballots b
           where b.poll_id=r.id group by 1) x;
        if not r.anonymous then
          select coalesce(jsonb_object_agg(x.k, x.ids), '{}') into names from (
            select b.choices->>'id' k, jsonb_agg(b.member_id order by b.member_id) ids
              from public.poll_ballots b where b.poll_id=r.id and b.member_id is not null group by 1) x;
        end if;
      elsif r.typ='multipla' then
        select coalesce(jsonb_object_agg(x.k, x.c), '{}') into totals from (
          select e#>>'{}' k, count(*)::int c from public.poll_ballots b,
            jsonb_array_elements(b.choices->'ids') e where b.poll_id=r.id group by 1) x;
      elsif r.typ='date' then
        select coalesce(jsonb_object_agg(x.k, jsonb_build_object('si',x.si,'forse',x.forse,'no',x.no)), '{}') into totals from (
          select key k,
            count(*) filter (where value#>>'{}'='si')::int si,
            count(*) filter (where value#>>'{}'='forse')::int forse,
            count(*) filter (where value#>>'{}'='no')::int no
          from public.poll_ballots b, jsonb_each(b.choices->'map')
          where b.poll_id=r.id group by 1) x;
      elsif r.typ='voto' then
        select jsonb_build_object(
          'media', (select round(avg((choices->>'n')::numeric),1) from public.poll_ballots where poll_id=r.id),
          'n', (select count(*)::int from public.poll_ballots where poll_id=r.id),
          'dist', coalesce((select jsonb_object_agg(v,c) from (
            select choices->>'n' v, count(*)::int c from public.poll_ballots where poll_id=r.id group by 1) s), '{}')
        ) into totals;
      elsif r.typ='classifica' then
        select coalesce(jsonb_object_agg(x.k, x.pts), '{}') into totals from (
          select e#>>'{}' k, sum(n - ord)::int pts
            from public.poll_ballots b,
              jsonb_array_elements(b.choices->'ord') with ordinality as e(val, ord),
              lateral (select jsonb_array_length(b.choices->'ord') n) z
           where b.poll_id=r.id group by 1) x;
      end if;
    end if;
    select count(*)::int into n_ok from public.poll_participants t where t.poll_id=r.id;
    rows := rows || jsonb_build_array(jsonb_build_object(
      'id', r.id, 'title', r.title, 'help', r.help, 'typ', r.typ, 'status', r.status,
      'closes_at', r.closes_at, 'results_vis', r.results_vis, 'anonymous', r.anonymous,
      'allow_add', r.allow_add, 'pinned', r.pinned, 'xp', r.xp,
      'badge_icon', r.badge_icon, 'badge_name', r.badge_name, 'max_choices', r.max_choices,
      'created_at', r.created_at, 'published_at', r.published_at, 'closed_at', r.closed_at,
      'options', opts, 'voted', voted, 'can_see', see,
      'totals', case when see then totals else null end,
      'names', case when see and not r.anonymous then names else null end,
      'n_voted', n_ok, 'n_members', n_all
    ));
  end loop;
  return jsonb_build_object(
    'me', me, 'staff', st, 'admin', public.is_admin(),
    'has_active', has_act,
    'notices', coalesce((select jsonb_agg(jsonb_build_object(
        'id', n.id, 'poll_id', n.poll_id, 'kind', n.kind, 'title', p.title, 'created_at', n.created_at
      ) order by n.created_at desc)
      from public.poll_notices n join public.polls p on p.id=n.poll_id
      where me is not null and n.member_id=me and n.read_at is null), '[]'),
    'badges', coalesce((select jsonb_agg(jsonb_build_object('icon', g.icon, 'name', g.name, 'poll_id', g.poll_id))
      from public.poll_badge_grant g where me is not null and g.member_id=me), '[]'),
    'polls', rows
  );
end $$;

create or replace function public.poll_salva(p jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  me text := public.cp_me();
  i uuid;
  t text; h text; typ text; vis text;
  opts jsonb; o jsonb; oid uuid;
  sort int := 0;
  st0 text;
begin
  if not public.is_staff() then raise exception 'Solo lo staff può creare o modificare un sondaggio'; end if;
  if me is null then raise exception 'Account non collegato a una scheda socio'; end if;
  if p is null or jsonb_typeof(p) <> 'object' or octet_length(p::text) > 20000 then raise exception 'Dati non validi'; end if;
  t := public.poll_clean(p->>'title', 80);
  if t is null then raise exception 'Scrivi un titolo (massimo 80 caratteri)'; end if;
  h := public.poll_clean(p->>'help', 280);
  typ := p->>'typ';
  if typ is null or typ not in ('singola','multipla','date','gioco','voto','classifica') then
    raise exception 'Tipo di sondaggio non valido'; end if;
  vis := coalesce(nullif(p->>'results_vis',''), 'dopo_voto');
  if vis not in ('subito','dopo_voto','chiusura') then raise exception 'Visibilità dei risultati non valida'; end if;
  if p ? 'id' and nullif(p->>'id','') is not null then
    begin i := (p->>'id')::uuid; exception when others then raise exception 'Sondaggio non valido'; end;
    select status into st0 from public.polls where id=i for update;
    if st0 is null then raise exception 'Sondaggio non trovato'; end if;
    if st0 in ('chiuso','archiviato') then raise exception 'Non si può modificare un sondaggio chiuso o archiviato'; end if;
    update public.polls set
      title=t, help=h, typ=typ, results_vis=vis,
      anonymous=coalesce((p->>'anonymous')::boolean, false),
      allow_add=coalesce((p->>'allow_add')::boolean, false),
      pinned=coalesce((p->>'pinned')::boolean, false),
      notify_on=coalesce((p->>'notify_on')::boolean, true),
      remind_hours=case when (p->>'remind_hours') ~ '^\d{1,3}$' and (p->>'remind_hours')::int between 0 and 168 then (p->>'remind_hours')::int else 24 end,
      xp=case when (p->>'xp') ~ '^\d{1,2}$' and (p->>'xp')::int between 0 and 50 then (p->>'xp')::int else 0 end,
      badge_icon=public.poll_clean(p->>'badge_icon', 16),
      badge_name=public.poll_clean(p->>'badge_name', 40),
      max_choices=case when typ='multipla' and (p->>'max_choices') ~ '^\d$' and (p->>'max_choices')::int between 1 and 8 then (p->>'max_choices')::int else 2 end,
      closes_at=case when nullif(p->>'closes_at','') is null then null else (p->>'closes_at')::timestamptz end,
      updated_at=now()
    where id=i;
    if typ <> 'voto' then
      delete from public.poll_options where poll_id=i
        and not exists (select 1 from public.poll_participants t where t.poll_id=i);
      if not exists(select 1 from public.poll_participants t where t.poll_id=i) then
        delete from public.poll_options where poll_id=i;
      end if;
    end if;
  else
    insert into public.polls(title, help, typ, status, results_vis, anonymous, allow_add, pinned, notify_on,
      remind_hours, xp, badge_icon, badge_name, max_choices, closes_at, created_by)
    values (t, h, typ, 'bozza', vis,
      coalesce((p->>'anonymous')::boolean, false),
      coalesce((p->>'allow_add')::boolean, false),
      coalesce((p->>'pinned')::boolean, false),
      coalesce((p->>'notify_on')::boolean, true),
      case when (p->>'remind_hours') ~ '^\d{1,3}$' and (p->>'remind_hours')::int between 0 and 168 then (p->>'remind_hours')::int else 24 end,
      case when (p->>'xp') ~ '^\d{1,2}$' and (p->>'xp')::int between 0 and 50 then (p->>'xp')::int else 0 end,
      public.poll_clean(p->>'badge_icon', 16),
      public.poll_clean(p->>'badge_name', 40),
      case when typ='multipla' and (p->>'max_choices') ~ '^\d$' and (p->>'max_choices')::int between 1 and 8 then (p->>'max_choices')::int else 2 end,
      case when nullif(p->>'closes_at','') is null then null else (p->>'closes_at')::timestamptz end,
      me)
    returning id into i;
  end if;
  if typ <> 'voto' then
    if exists(select 1 from public.poll_participants t where t.poll_id=i) then
      null; -- non si sostituiscono le opzioni dopo i primi voti
    else
      opts := case when jsonb_typeof(p->'options')='array' then p->'options' else '[]' end;
      if jsonb_array_length(opts) > 24 then raise exception 'Al massimo 24 opzioni'; end if;
      if typ <> 'voto' and jsonb_array_length(opts) < 2 then raise exception 'Aggiungi almeno due opzioni'; end if;
      sort := 0;
      for o in select value from jsonb_array_elements(opts)
      loop
        sort := sort + 1;
        insert into public.poll_options(poll_id, label, sort, game_id, bgg_id, thumb, added_by)
        values (
          i,
          public.poll_clean(o->>'label', 80),
          sort,
          nullif(left(coalesce(o->>'game_id',''), 40), ''),
          case when (o->>'bgg_id') ~ '^\d{1,8}$' then (o->>'bgg_id')::int end,
          case when coalesce(o->>'thumb','') ~ '^https://cf\.geekdo-images\.com/[A-Za-z0-9_./%=:()-]+$' then left(o->>'thumb',400) end,
          me
        );
        if public.poll_clean(o->>'label', 80) is null then raise exception 'Ogni opzione deve avere un testo'; end if;
      end loop;
    end if;
  end if;
  if typ in ('singola','multipla','date','gioco','classifica') and not exists(select 1 from public.poll_options where poll_id=i) then
    raise exception 'Aggiungi almeno due opzioni';
  end if;
  return i;
end $$;

create or replace function public.poll_azione(p_id uuid, p_azione text) returns void
language plpgsql security definer set search_path=public as $$
declare r public.polls;
begin
  if not public.is_staff() then raise exception 'Solo lo staff può gestire i sondaggi'; end if;
  select * into r from public.polls where id=p_id for update;
  if r.id is null then raise exception 'Sondaggio non trovato'; end if;
  if p_azione='apri' then
    if r.status not in ('bozza','chiuso') then raise exception 'Questo sondaggio non si può aprire'; end if;
    if r.typ <> 'voto' and (select count(*) from public.poll_options where poll_id=p_id) < 2 then
      raise exception 'Aggiungi almeno due opzioni prima di pubblicare'; end if;
    if r.closes_at is not null and r.closes_at <= now() then raise exception 'La scadenza deve essere nel futuro'; end if;
    update public.polls set status='aperto', published_at=coalesce(published_at, now()), closed_at=null, updated_at=now() where id=p_id;
    if r.notify_on then perform public.poll_notify(p_id, 'uscita'); end if;
  elsif p_azione='chiudi' then
    if r.status <> 'aperto' then raise exception 'Solo un sondaggio aperto si può chiudere'; end if;
    update public.polls set status='chiuso', closed_at=now(), updated_at=now() where id=p_id;
  elsif p_azione='archivia' then
    if r.status not in ('chiuso','aperto') then raise exception 'Si possono archiviare solo i sondaggi aperti o chiusi'; end if;
    update public.polls set status='archiviato', closed_at=coalesce(closed_at, now()), updated_at=now() where id=p_id;
  elsif p_azione='elimina' then
    delete from public.polls where id=p_id;
  else raise exception 'Azione non valida';
  end if;
end $$;

create or replace function public.poll_aggiungi_opzione(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  me text := public.cp_me();
  r public.polls;
  lab text;
  i uuid;
  n int;
begin
  if me is null then raise exception 'Solo i soci possono aggiungere un''opzione'; end if;
  perform public.poll_chiudi_scaduti();
  select * into r from public.polls where id=p_id for update;
  if r.id is null or r.status <> 'aperto' then raise exception 'Questo sondaggio non accetta nuove opzioni'; end if;
  if not r.allow_add and not public.is_staff() then raise exception 'In questo sondaggio solo lo staff può aggiungere opzioni'; end if;
  select count(*) into n from public.poll_options where poll_id=p_id;
  if n >= 24 then raise exception 'Al massimo 24 opzioni'; end if;
  lab := public.poll_clean(p->>'label', 80);
  if lab is null then raise exception 'Scrivi il testo dell''opzione'; end if;
  insert into public.poll_options(poll_id, label, sort, game_id, bgg_id, thumb, added_by)
  values (
    p_id, lab, n+1,
    nullif(left(coalesce(p->>'game_id',''), 40), ''),
    case when (p->>'bgg_id') ~ '^\d{1,8}$' then (p->>'bgg_id')::int end,
    case when coalesce(p->>'thumb','') ~ '^https://cf\.geekdo-images\.com/[A-Za-z0-9_./%=:()-]+$' then left(p->>'thumb',400) end,
    me
  ) returning id into i;
  return i;
end $$;

create or replace function public.poll_vota(p_id uuid, p_choices jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  me text := public.cp_me();
  r public.polls;
  opts uuid[];
  already boolean := false;
  ch jsonb;
begin
  if me is null then raise exception 'Solo i soci possono votare'; end if;
  if p_choices is null or jsonb_typeof(p_choices) <> 'object' or octet_length(p_choices::text) > 4000 then
    raise exception 'Voto non valido'; end if;
  perform public.poll_chiudi_scaduti();
  select * into r from public.polls where id=p_id for update;
  if r.id is null or r.status <> 'aperto' or (r.closes_at is not null and r.closes_at <= now()) then
    raise exception 'Questo sondaggio non è aperto'; end if;
  select coalesce(array_agg(id), '{}') into opts from public.poll_options where poll_id=p_id;
  -- pulizia commento voto
  if r.typ='voto' and p_choices ? 'commento' then
    p_choices := jsonb_set(p_choices, '{commento}', to_jsonb(left(regexp_replace(coalesce(p_choices->>'commento',''),'[\u0000-\u001f<>]','','g'), 200)));
    if btrim(p_choices->>'commento') = '' then p_choices := p_choices - 'commento'; end if;
  end if;
  if not public.poll_choices_ok(r.typ, r.max_choices, opts, p_choices) then
    raise exception 'Il voto non rispetta le regole di questo sondaggio'; end if;
  already := exists(select 1 from public.poll_participants t where t.poll_id=p_id and t.member_id=me);
  if already and r.anonymous then
    raise exception 'Nei sondaggi anonimi il voto non si può cambiare'; end if;
  if already and not r.anonymous then
    delete from public.poll_ballots where poll_id=p_id and member_id=me;
    insert into public.poll_ballots(poll_id, member_id, choices, created_at)
    values (p_id, me, p_choices, now());
    update public.poll_participants set voted_at=now() where poll_id=p_id and member_id=me;
  else
    insert into public.poll_participants(poll_id, member_id) values (p_id, me)
      on conflict do nothing;
    if r.anonymous then
      insert into public.poll_ballots(poll_id, member_id, choices, created_at)
      values (p_id, null, p_choices, date_trunc('day', now()));
    else
      insert into public.poll_ballots(poll_id, member_id, choices, created_at)
      values (p_id, me, p_choices, now());
    end if;
    if r.xp > 0 then
      insert into public.poll_xp_grant(poll_id, member_id, xp) values (p_id, me, r.xp)
        on conflict do nothing;
    end if;
    if r.badge_icon is not null and r.badge_name is not null then
      insert into public.poll_badge_grant(poll_id, member_id, icon, name)
      values (p_id, me, r.badge_icon, r.badge_name)
        on conflict do nothing;
    end if;
  end if;
  -- marca lette le notifiche di questo sondaggio
  update public.poll_notices set read_at=coalesce(read_at, now())
   where poll_id=p_id and member_id=me;
  return jsonb_build_object('ok', true, 'xp', case when already then 0 else r.xp end,
    'badge', case when already then null else r.badge_name end);
end $$;

create or replace function public.poll_notifiche_lette(p_id uuid default null) returns void
language plpgsql security definer set search_path=public as $$
declare me text := public.cp_me();
begin
  if me is null then return; end if;
  update public.poll_notices set read_at=now()
   where member_id=me and read_at is null
     and (p_id is null or poll_id=p_id);
end $$;

create or replace function public.poll_collega_desideri(p_id uuid, p_option uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  me text := public.cp_me();
  r public.polls;
  o public.poll_options;
  i uuid;
  payload jsonb;
begin
  if not public.is_staff() then raise exception 'Solo lo staff può collegare il risultato alla lista desideri'; end if;
  if me is null then raise exception 'Account non collegato a una scheda socio'; end if;
  select * into r from public.polls where id=p_id;
  if r.id is null or r.typ <> 'gioco' or r.status not in ('chiuso','archiviato') then
    raise exception 'Si può collegare solo un sondaggio «Scegli il gioco» già chiuso'; end if;
  select * into o from public.poll_options where id=p_option and poll_id=p_id;
  if o.id is null then raise exception 'Opzione non trovata'; end if;
  if o.bgg_id is null then raise exception 'Per proporlo nella lista desideri serve un gioco con identificativo BoardGameGeek'; end if;
  payload := jsonb_build_object(
    'bgg_id', o.bgg_id,
    'nome', o.label,
    'thumb', o.thumb,
    'perche', 'Primo o scelto dal sondaggio «' || r.title || '»'
  );
  -- des_proponi solleva eccezioni già chiare (già in collezione / già in lista)
  i := public.des_proponi(payload);
  return i;
end $$;

-- XP: stessa somma di prima, più gli XP sondaggio già assegnati (nessun grant in questa migrazione).
create or replace function public.member_xp() returns table(member_id text, xp integer, level integer, dettaglio jsonb)
 language sql stable security definer set search_path to 'public' as $$
with b as (select * from public.member_xp_cp()),
s as (select proposto_da mid,count(*)::int n from desideri where stato='arrivato' group by 1),
p as (select member_id mid, sum(xp)::int px from public.poll_xp_grant group by 1),
x as (
  select b.*,
         s.n,
         coalesce(p.px,0) as px,
         (b.xp + coalesce(40*s.n,0) + case when s.n is not null then 100 else 0 end + coalesce(p.px,0))::int tot
    from b
    left join s on s.mid=b.member_id
    left join p on p.mid=b.member_id
)
select member_id, tot,
  case when n is null and px=0 then level else public.level_for_xp(tot) end,
  case
    when n is null and px=0 then dettaglio
    else coalesce(dettaglio,'{}'::jsonb)
      || case when n is not null then jsonb_build_object(
           'scout', jsonb_build_array(n, 40*n),
           'badge', jsonb_build_array(
             coalesce((dettaglio->'badge'->>0)::int,0)+1,
             coalesce((dettaglio->'badge'->>1)::int,0)+100))
         else '{}'::jsonb end
      || case when px>0 then jsonb_build_object('sondaggi', jsonb_build_array(1, px)) else '{}'::jsonb end
  end
from x $$;

do $$
declare f record; fn text;
begin
  for f in
    select p.oid::regprocedure s
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname like 'poll\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.s);
  end loop;
  execute 'revoke all on function public.member_xp() from public, anon, authenticated';
  foreach fn in array array[
    'poll_lista()','poll_salva(jsonb)','poll_azione(uuid,text)','poll_aggiungi_opzione(uuid,jsonb)',
    'poll_vota(uuid,jsonb)','poll_notifiche_lette(uuid)','poll_collega_desideri(uuid,uuid)','member_xp()'
  ] loop
    execute 'grant execute on function public.'||fn||' to authenticated';
  end loop;
end $$;
