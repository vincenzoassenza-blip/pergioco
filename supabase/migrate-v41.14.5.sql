-- v41.14.5: poll_lista fallisce se esiste un sondaggio di tipo classifica
-- («operator does not exist: record #>> unknown»).
-- Nel ramo typ='classifica' jsonb_array_elements(...) WITH ORDINALITY AS e(val, ord)
-- typa e come record (val jsonb, ord bigint); l'operatore #>> vale solo per jsonb,
-- quindi va usato e.val#>>'{}', non e#>>'{}'. Il ramo multipla resta su e#>>
-- perché lì e è l'elemento jsonb, senza WITH ORDINALITY.
-- Le altre poll_* non hanno lo stesso schema. Non tocca i dati esistenti.

create or replace function public.poll_lista() returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  me text := public.cp_me();
  st boolean := public.is_staff();
  has_act boolean := false;
  rows jsonb := '[]'::jsonb;
  r public.polls;
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
          select e.val#>>'{}' k, sum(n - ord)::int pts
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

revoke all on function public.poll_lista() from public, anon;
grant execute on function public.poll_lista() to authenticated;
