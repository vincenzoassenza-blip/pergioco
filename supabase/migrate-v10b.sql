-- v10.1: ricerca soci lato server (accenti e maiuscole ignorati), max 20 risultati
create extension if not exists unaccent with schema extensions;
create or replace function public.search_members(p_q text) returns table(id text) language sql stable security definer set search_path=public,extensions as $$
  select m.id from public.members m
  where auth.uid() is not null and length(trim(coalesce(p_q,'')))>=2
    and extensions.unaccent(lower(concat_ws(' ',m.nome,m.cognome,m.soprannome,m.nome))) like '%'||extensions.unaccent(lower(trim(p_q)))||'%'
  order by m.active desc, m.nome, m.cognome limit 20 $$;
revoke execute on function public.search_members(text) from anon, public;
grant execute on function public.search_members(text) to authenticated;
