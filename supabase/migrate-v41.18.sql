-- v41.18: elenco moderatori e admin con socio collegato; riconoscimento moderatore anche per user_id.
-- Additiva: nessuna perdita di dati. Non applica automaticamente in produzione.

alter table public.moderators add column if not exists user_id uuid;

update public.moderators mo
   set user_id = u.id
  from auth.users u
 where mo.user_id is null
   and lower(u.email) = lower(mo.email);

create unique index if not exists moderators_user_id_uidx
  on public.moderators (user_id)
  where user_id is not null;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.moderators m
     where (m.user_id is not null and m.user_id = auth.uid())
        or lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_moderator();
$$;

revoke all on function public.is_moderator() from public, anon;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_moderator() to authenticated;
grant execute on function public.is_staff() to authenticated;

-- Firma nuova: drop obbligatorio (prima era setof text)
drop function if exists public.admin_moderators();

create function public.admin_moderators()
returns table(
  email text,
  user_id uuid,
  member_id text,
  nome text,
  cognome text,
  stato text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mo.email,
    coalesce(mo.user_id, u.id) as user_id,
    m.id as member_id,
    m.nome,
    m.cognome,
    case
      when m.id is not null then 'collegato'
      when coalesce(mo.user_id, u.id) is not null then 'account'
      else 'assente'
    end as stato
  from public.moderators mo
  left join auth.users u
    on u.id = mo.user_id
    or lower(u.email) = lower(mo.email)
  left join public.members m
    on m.user_id is not null
   and m.user_id = coalesce(mo.user_id, u.id)
  where public.is_admin()
  order by
    coalesce(m.cognome, mo.email),
    coalesce(m.nome, '');
$$;

drop function if exists public.admin_admins();

create function public.admin_admins()
returns table(
  email text,
  user_id uuid,
  member_id text,
  nome text,
  cognome text,
  stato text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.email,
    coalesce(a.user_id, u.id) as user_id,
    m.id as member_id,
    m.nome,
    m.cognome,
    case
      when m.id is not null then 'collegato'
      when coalesce(a.user_id, u.id) is not null then 'account'
      else 'assente'
    end as stato
  from public.admins a
  left join auth.users u
    on u.id = a.user_id
    or lower(u.email) = lower(a.email)
  left join public.members m
    on m.user_id is not null
   and m.user_id = coalesce(a.user_id, u.id)
  where public.is_admin()
  order by
    coalesce(m.cognome, a.email),
    coalesce(m.nome, '');
$$;

create or replace function public.admin_set_moderator(p_email text, p_on boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_uid uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo gli admin' using errcode = '42501';
  end if;
  v_email := lower(trim(coalesce(p_email, '')));
  if v_email = '' or length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email non valida';
  end if;
  select u.id into v_uid from auth.users u where lower(u.email) = v_email limit 1;
  if exists (
    select 1 from public.admins a
     where lower(a.email) = v_email
        or (v_uid is not null and a.user_id = v_uid)
  ) then
    raise exception 'Questa persona è già admin';
  end if;
  if coalesce(p_on, true) then
    insert into public.moderators(email, user_id)
    values (v_email, v_uid)
    on conflict (email) do update
      set user_id = coalesce(excluded.user_id, public.moderators.user_id);
  else
    delete from public.moderators where lower(email) = v_email;
  end if;
end;
$$;

create or replace function public.admin_set_moderator_member(p_member text, p_on boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'Solo gli admin' using errcode = '42501';
  end if;
  if p_member is null or p_member !~ '^[A-Za-z0-9_-]{1,64}$' then
    raise exception 'Socio non valido';
  end if;
  select m.user_id into v_uid from public.members m where m.id = p_member;
  if v_uid is null then
    raise exception 'Il socio non ha un account collegato';
  end if;
  select u.email into v_email from auth.users u where u.id = v_uid;
  if v_email is null or length(trim(v_email)) = 0 then
    raise exception 'Account non trovato';
  end if;
  perform public.admin_set_moderator(v_email, p_on);
end;
$$;

revoke all on function public.admin_moderators() from public, anon;
revoke all on function public.admin_admins() from public, anon;
revoke all on function public.admin_set_moderator(text, boolean) from public, anon;
revoke all on function public.admin_set_moderator_member(text, boolean) from public, anon;

grant execute on function public.admin_moderators() to authenticated;
grant execute on function public.admin_admins() to authenticated;
grant execute on function public.admin_set_moderator(text, boolean) to authenticated;
grant execute on function public.admin_set_moderator_member(text, boolean) to authenticated;
