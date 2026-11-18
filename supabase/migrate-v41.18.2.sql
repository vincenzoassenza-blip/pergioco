-- v41.18.2: gli admin possono eliminare o nascondere un gioco dalla scheda.
-- Additiva: nessuna perdita di dati. I giochi con partite, tavoli o riferimenti in Coppa
-- vengono nascosti (hidden), non cancellati, così storico ed EXP restano.

alter table public.games add column if not exists hidden boolean not null default false;

grant select (hidden) on public.games to authenticated;
grant insert (hidden) on public.games to authenticated;
grant update (hidden) on public.games to authenticated;

create or replace function public.admin_game_remove_info(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.games%rowtype;
  n_plays int := 0;
  n_tables int := 0;
  n_coppa int := 0;
begin
  if not public.is_admin() then
    raise exception 'Solo gli admin' using errcode = '42501';
  end if;
  if p_id is null or char_length(p_id) < 1 or char_length(p_id) > 80 or p_id !~ '^[A-Za-z0-9._-]+$' then
    raise exception 'Gioco non valido' using errcode = '22023';
  end if;
  select * into g from public.games where id = p_id;
  if not found then
    raise exception 'Gioco non trovato' using errcode = 'P0002';
  end if;
  select count(*)::int into n_plays from public.plays where game_id = p_id;
  select count(*)::int into n_tables from public.tables where game_id = p_id;
  select (
    (select count(*) from public.coppa_incontri where game_id = p_id) +
    (select count(*) from public.coppa_tavoli where game_id = p_id)
  )::int into n_coppa;
  return jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'hidden', coalesce(g.hidden, false),
    'plays', n_plays,
    'tables', n_tables,
    'coppa', n_coppa,
    'action', case when n_plays > 0 or n_tables > 0 or n_coppa > 0 then 'hide' else 'delete' end
  );
end;
$$;

create or replace function public.admin_game_remove(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  info jsonb;
  act text;
begin
  info := public.admin_game_remove_info(p_id);
  act := info->>'action';
  if act = 'hide' then
    update public.games set hidden = true where id = p_id;
    return info;
  end if;
  -- pulizia di riferimenti non storici che non hanno ON DELETE
  update public.members set fav_game_id = null where fav_game_id = p_id;
  update public.poll_options set game_id = null where game_id = p_id;
  begin
    delete from public.games where id = p_id;
  exception
    when foreign_key_violation then
      update public.games set hidden = true where id = p_id;
      return jsonb_set(info, '{action}', '"hide"');
  end;
  return info;
end;
$$;

revoke all on function public.admin_game_remove_info(text) from public, anon;
revoke all on function public.admin_game_remove(text) from public, anon;
grant execute on function public.admin_game_remove_info(text) to authenticated;
grant execute on function public.admin_game_remove(text) to authenticated;
