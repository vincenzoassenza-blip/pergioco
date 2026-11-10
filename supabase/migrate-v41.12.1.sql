-- v41.12.1 — Foto profilo (bucket profile-photos + colonna members.photo_url).
-- Idempotente. Nessuna modifica a plays, games, game_meta, member_xp / member_xp_base / member_xp_cp.
-- GRANT select della nuova colonna come gli altri campi avatar; scrittura solo tramite RPC (security definer).
-- Path storage: {auth.uid()}/avatar.webp|jpg|jpeg|png. Lettura pubblica del file (come gli altri avatar visibili in app);
-- scrittura e cancellazione solo del proprio file. EXECUTE delle funzioni solo a authenticated.

-- Colonna e vincolo URL (solo storage di questa app, e solo il file del socio collegato)
alter table public.members add column if not exists photo_url text;

alter table public.members drop constraint if exists members_photo_url_chk;
alter table public.members add constraint members_photo_url_chk check (
  photo_url is null
  or (
    char_length(photo_url) between 80 and 300
    and photo_url ~ '^https://egmrtcezrjyoynlhknpz\.supabase\.co/storage/v1/object/public/profile-photos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar\.(webp|jpg|jpeg|png)$'
    and user_id is not null
    and photo_url like '%/profile-photos/' || user_id::text || '/avatar.%'
  )
);

grant select (photo_url) on public.members to anon, authenticated;
revoke insert (photo_url), update (photo_url) on public.members from authenticated;

create or replace function public.photo_url_valid(p_url text, p_uid uuid)
returns boolean
language sql immutable set search_path=public as $f$
  select
    p_url is not null
    and p_uid is not null
    and char_length(p_url) between 80 and 300
    and p_url ~ '^https://egmrtcezrjyoynlhknpz\.supabase\.co/storage/v1/object/public/profile-photos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar\.(webp|jpg|jpeg|png)$'
    and p_url like '%/profile-photos/' || p_uid::text || '/avatar.%';
$f$;
revoke all on function public.photo_url_valid(text, uuid) from public, anon;
grant execute on function public.photo_url_valid(text, uuid) to authenticated;

-- Nuova firma a 5 argomenti: imposta o rimuove la foto. La firma a 4 resta e non tocca photo_url.
create or replace function public.update_my_profile(p_soprannome text, p_avatar text, p_color text, p_fav_game_id text, p_photo_url text)
returns void language plpgsql security definer set search_path = public as $$
declare v_photo text;
begin
  if auth.uid() is null then raise exception 'Devi prima accedere'; end if;
  if p_photo_url is null or btrim(p_photo_url) = '' then
    v_photo := null;
  else
    if not public.photo_url_valid(p_photo_url, auth.uid()) then
      raise exception 'Foto non valida';
    end if;
    v_photo := p_photo_url;
  end if;
  update public.members set
    soprannome = nullif(left(trim(coalesce(p_soprannome, '')), 40), ''),
    avatar = nullif(left(coalesce(p_avatar, ''), 16), ''),
    color = case when p_color ~ '^#[0-9a-fA-F]{6}$' then p_color else null end,
    fav_game_id = nullif(p_fav_game_id, ''),
    photo_url = v_photo
  where user_id = auth.uid();
  if not found then raise exception 'Account non collegato a nessuna scheda socio'; end if;
end $$;
revoke all on function public.update_my_profile(text, text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text, text) to authenticated;

-- Bucket e policy Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 524288, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_photos_select on storage.objects;
create policy profile_photos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-photos');

drop policy if exists profile_photos_insert on storage.objects;
create policy profile_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and name ~ ('^' || auth.uid()::text || '/avatar\.(webp|jpg|jpeg|png)$')
  );

drop policy if exists profile_photos_update on storage.objects;
create policy profile_photos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-photos'
    and name ~ ('^' || auth.uid()::text || '/avatar\.(webp|jpg|jpeg|png)$')
  )
  with check (
    bucket_id = 'profile-photos'
    and name ~ ('^' || auth.uid()::text || '/avatar\.(webp|jpg|jpeg|png)$')
  );

drop policy if exists profile_photos_delete on storage.objects;
create policy profile_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and name ~ ('^' || auth.uid()::text || '/avatar\.(webp|jpg|jpeg|png)$')
  );
