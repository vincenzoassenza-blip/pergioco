-- v9: ruolo MODERATORE
create table if not exists public.moderators (email text primary key, added_at timestamptz default now());
alter table public.moderators enable row level security;
revoke all on public.moderators from anon, authenticated;

create or replace function public.is_moderator() returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.moderators m where lower(m.email)=lower(coalesce(auth.jwt()->>'email','')));
$$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$
  select public.is_admin() or public.is_moderator();
$$;
grant execute on function public.is_moderator(), public.is_staff() to anon, authenticated;

-- moderatori: solo inserimento di NUOVI soci (senza tessera e senza account)
drop policy if exists members_mod_insert on public.members;
create policy members_mod_insert on public.members for insert to authenticated
  with check (public.is_moderator() and tessera is null and user_id is null);

-- codici: admin o moderatore
create or replace function public.admin_new_code(p_member_id text) returns text language plpgsql security definer set search_path=public,extensions as $$
declare al text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; b bytea; c text := ''; i int;
begin
  if not public.is_staff() then raise exception 'Solo admin o moderatori'; end if;
  if not exists (select 1 from public.members where id = p_member_id) then raise exception 'Socio non trovato'; end if;
  b := gen_random_bytes(12);
  for i in 0..11 loop c := c || substr(al, (get_byte(b, i) % 31) + 1, 1); end loop;
  insert into public.member_codes (member_id, code) values (p_member_id, c)
    on conflict (member_id) do update set code = excluded.code, created_at = now(), used_at = null, used_for = null;
  return substr(c,1,4) || '-' || substr(c,5,4) || '-' || substr(c,9,4);
end $$;
create or replace function public.admin_codes() returns table(member_id text, code text, created_at timestamptz, used_at timestamptz, used_for text)
 language sql stable security definer set search_path=public as $$
  select m.member_id, substr(m.code,1,4)||'-'||substr(m.code,5,4)||'-'||substr(m.code,9,4), m.created_at, m.used_at,
    case when public.is_admin() then m.used_for else null end
  from public.member_codes m where public.is_staff() $$;

-- gestione moderatori (solo admin)
create or replace function public.admin_moderators() returns setof text language sql stable security definer set search_path=public as $$
  select email from public.moderators where public.is_admin() order by email $$;
create or replace function public.admin_set_moderator(p_email text, p_on boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Solo gli admin'; end if;
  if p_on then insert into public.moderators(email) values (lower(trim(p_email))) on conflict do nothing;
  else delete from public.moderators where email = lower(trim(p_email)); end if;
end $$;
revoke all on function public.admin_moderators(), public.admin_set_moderator(text,boolean) from anon;
grant execute on function public.admin_moderators(), public.admin_set_moderator(text,boolean) to authenticated;
