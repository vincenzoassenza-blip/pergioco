-- ===== v7: registrazione solo con CODICE generato dagli admin (nessuna email inviata) =====
-- Idempotente. Supabase > SQL Editor > New query > Run
create extension if not exists pgcrypto with schema extensions;

-- un codice per socio, leggibile SOLO dagli admin (via funzioni), mai dal pubblico
create table if not exists public.member_codes (
  member_id text primary key references public.members(id) on delete cascade on update cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  used_at timestamptz, used_for text);
alter table public.member_codes enable row level security;
revoke all on public.member_codes from anon, authenticated;

-- il vecchio collegamento con numero di tessera/richieste non serve più
drop function if exists public.claim_member(text, text);
drop table if exists public.claim_attempts;
drop table if exists public.link_requests;

-- normalizza: maiuscolo, senza trattini/spazi
create or replace function public.norm_code(c text) returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(c, ''), '[^A-Za-z0-9]', '', 'g')) $$;

-- l'admin genera (o rigenera) il codice di un socio: 12 caratteri senza ambigui (0/O, 1/I/L)
create or replace function public.admin_new_code(p_member_id text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare al text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; b bytea; c text := ''; i int;
begin
  if not public.is_admin() then raise exception 'Solo gli admin'; end if;
  if not exists (select 1 from public.members where id = p_member_id) then raise exception 'Socio non trovato'; end if;
  b := gen_random_bytes(12);
  for i in 0..11 loop c := c || substr(al, (get_byte(b, i) % 31) + 1, 1); end loop;
  insert into public.member_codes (member_id, code) values (p_member_id, c)
    on conflict (member_id) do update set code = excluded.code, created_at = now(), used_at = null, used_for = null;
  return substr(c,1,4) || '-' || substr(c,5,4) || '-' || substr(c,9,4);
end $$;
create or replace function public.admin_codes() returns table (member_id text, code text, created_at timestamptz, used_at timestamptz, used_for text)
language sql stable security definer set search_path = public as $$
  select m.member_id, substr(m.code,1,4)||'-'||substr(m.code,5,4)||'-'||substr(m.code,9,4), m.created_at, m.used_at, m.used_for
  from public.member_codes m where public.is_admin() $$;
create or replace function public.admin_delete_code(p_member_id text) returns void
language plpgsql security definer set search_path = public as $$
begin if not public.is_admin() then raise exception 'Solo gli admin'; end if; delete from public.member_codes where member_id = p_member_id; end $$;

-- iscrizione: OGNI nuovo utente deve avere un codice valido nei metadati (o essere un admin pre-inserito in admins)
create or replace function public.signup_check_code() returns trigger
language plpgsql security definer set search_path = public as $$
declare mc public.member_codes;
begin
  select * into mc from public.member_codes where code = public.norm_code(new.raw_user_meta_data ->> 'code') and used_at is null;
  if not found then
    if exists (select 1 from public.admins where lower(email) = lower(new.email)) then return new; end if;
    raise exception 'Codice non valido o già usato';
  end if;
  if exists (select 1 from public.members where id = mc.member_id and user_id is not null) then
    raise exception 'Questo socio ha già un account: per cambiare password usa "Password dimenticata"'; end if;
  update public.member_codes set used_at = now(), used_for = 'registrazione' where member_id = mc.member_id;
  new.raw_user_meta_data := (coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'code') || jsonb_build_object('member_id', mc.member_id);
  return new;
end $$;
create or replace function public.signup_link_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.raw_user_meta_data ? 'member_id' then
    update public.members set user_id = new.id where id = new.raw_user_meta_data ->> 'member_id' and user_id is null;
  end if;
  return new;
end $$;
drop trigger if exists pergioco_signup_check on auth.users;
create trigger pergioco_signup_check before insert on auth.users for each row execute function public.signup_check_code();
drop trigger if exists pergioco_signup_link on auth.users;
create trigger pergioco_signup_link after insert on auth.users for each row execute function public.signup_link_member();

-- password dimenticata: l'admin rigenera il codice, il socio lo usa con la sua email per scegliere una nuova password
create or replace function public.reset_password_with_code(p_code text, p_email text, p_password text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
declare mc public.member_codes; uid uuid;
begin
  if length(coalesce(p_password, '')) < 8 then raise exception 'La password deve avere almeno 8 caratteri'; end if;
  select * into mc from public.member_codes where code = public.norm_code(p_code) and used_at is null;
  if not found then raise exception 'Codice non valido o già usato'; end if;
  select u.id into uid from public.members m join auth.users u on u.id = m.user_id
   where m.id = mc.member_id and lower(u.email) = lower(trim(p_email));
  if uid is null then raise exception 'Codice ed email non corrispondono'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = uid;
  update public.member_codes set used_at = now(), used_for = 'nuova password' where member_id = mc.member_id;
end $$;

revoke all on function public.admin_new_code(text), public.admin_codes(), public.admin_delete_code(text) from public, anon;
grant execute on function public.admin_new_code(text), public.admin_codes(), public.admin_delete_code(text) to authenticated;
revoke all on function public.signup_check_code(), public.signup_link_member() from public, anon, authenticated;
revoke all on function public.reset_password_with_code(text, text, text) from public;
grant execute on function public.reset_password_with_code(text, text, text) to anon, authenticated;

-- il codice non resta mai nei metadati dell'utente (anche dopo gli aggiornamenti di Supabase Auth)
create or replace function public.strip_signup_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.raw_user_meta_data ? 'code' then new.raw_user_meta_data := new.raw_user_meta_data - 'code'; end if;
  return new;
end $$;
revoke all on function public.strip_signup_code() from public, anon, authenticated;
drop trigger if exists pergioco_strip_code on auth.users;
create trigger pergioco_strip_code before update on auth.users for each row execute function public.strip_signup_code();
update auth.users set raw_user_meta_data = raw_user_meta_data - 'code' where raw_user_meta_data ? 'code';
