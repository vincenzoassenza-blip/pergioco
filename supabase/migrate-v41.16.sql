-- v41.16 — Ricompense in app, stato socio «Sospeso», record «Più vittorie» (solo client).
-- Idempotente. Nessuna modifica a plays, games, game_meta, member_xp / member_xp_base / member_xp_cp.
-- GRANT delle nuove funzioni solo a authenticated; anon e public revocati.
-- Colonne riservate (nota/date sospensione): niente SELECT/UPDATE diretti, solo RPC staff.

-- ========== Sospeso ==========
alter table public.members add column if not exists sospeso boolean not null default false;

alter table public.members add column if not exists sospeso_nota text;
alter table public.members add column if not exists sospeso_dal timestamptz;
alter table public.members add column if not exists sospeso_rientro date;

alter table public.members drop constraint if exists members_sospeso_nota_chk;
alter table public.members add constraint members_sospeso_nota_chk check (
  sospeso_nota is null or char_length(sospeso_nota) between 1 and 300
);

grant select (sospeso) on public.members to anon, authenticated;
revoke insert (sospeso, sospeso_nota, sospeso_dal, sospeso_rientro),
       update (sospeso, sospeso_nota, sospeso_dal, sospeso_rientro)
  on public.members from authenticated;

-- ========== Catalogo ricompense ==========
create table if not exists public.ricompense (
  id text primary key,
  nome text not null,
  titolo text,
  icona text,
  colore_nome text,
  cornice text,
  sfondo text,
  avatar_sbloccati text[] not null default '{}',
  visibile boolean not null default true,
  modo text not null default 'manuale',
  modo_param jsonb not null default '{}'::jsonb,
  priorita integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ricompense drop constraint if exists ricompense_id_chk;
alter table public.ricompense add constraint ricompense_id_chk check (id ~ '^[a-z0-9-]{2,40}$');
alter table public.ricompense drop constraint if exists ricompense_nome_chk;
alter table public.ricompense add constraint ricompense_nome_chk check (char_length(btrim(nome)) between 2 and 60);
alter table public.ricompense drop constraint if exists ricompense_titolo_chk;
alter table public.ricompense add constraint ricompense_titolo_chk check (titolo is null or char_length(btrim(titolo)) between 1 and 60);
alter table public.ricompense drop constraint if exists ricompense_icona_chk;
alter table public.ricompense add constraint ricompense_icona_chk check (icona is null or icona ~ '^[a-z0-9-]{2,40}$');
alter table public.ricompense drop constraint if exists ricompense_colore_chk;
alter table public.ricompense add constraint ricompense_colore_chk check (colore_nome is null or colore_nome ~ '^#[0-9a-fA-F]{6}$');
alter table public.ricompense drop constraint if exists ricompense_cornice_chk;
alter table public.ricompense add constraint ricompense_cornice_chk check (cornice is null or cornice in ('oro','navy','doppio','alloro'));
alter table public.ricompense drop constraint if exists ricompense_sfondo_chk;
alter table public.ricompense add constraint ricompense_sfondo_chk check (sfondo is null or sfondo in ('navy-gold','navy','gold','teal','verde','bordeaux','viola'));
alter table public.ricompense drop constraint if exists ricompense_modo_chk;
alter table public.ricompense add constraint ricompense_modo_chk check (modo in ('manuale','tessera_entro','ruolo'));
alter table public.ricompense drop constraint if exists ricompense_priorita_chk;
alter table public.ricompense add constraint ricompense_priorita_chk check (priorita between 0 and 1000);
alter table public.ricompense drop constraint if exists ricompense_avatar_chk;
alter table public.ricompense add constraint ricompense_avatar_chk check (
  cardinality(avatar_sbloccati) <= 8
  and (cardinality(avatar_sbloccati) = 0 or avatar_sbloccati <@ array[
    'custode-arco','esploratore-e','re-dei-meeple','inventore','golem-dadi',
    'cartografa','cavaliere','maga','ladra','drago','pirata','alchimista',
    'base-meeple-navy','base-meeple-oro','base-meeple-teal'
  ]::text[])
);

create table if not exists public.socio_ricompense (
  member_id text not null references public.members(id) on delete cascade,
  ricompensa_id text not null references public.ricompense(id) on delete cascade,
  assegnata_il timestamptz not null default now(),
  assegnata_da uuid,
  auto boolean not null default false,
  primary key (member_id, ricompensa_id)
);

create table if not exists public.socio_ricompensa_scelte (
  member_id text not null references public.members(id) on delete cascade,
  tipo text not null,
  ricompensa_id text not null references public.ricompense(id) on delete cascade,
  primary key (member_id, tipo)
);
alter table public.socio_ricompensa_scelte drop constraint if exists socio_rc_scelte_tipo_chk;
alter table public.socio_ricompensa_scelte add constraint socio_rc_scelte_tipo_chk check (
  tipo in ('titolo','colore','icona','cornice','sfondo','avatar')
);

alter table public.ricompense enable row level security;
alter table public.socio_ricompense enable row level security;
alter table public.socio_ricompensa_scelte enable row level security;

revoke all on table public.ricompense from public, anon, authenticated;
revoke all on table public.socio_ricompense from public, anon, authenticated;
revoke all on table public.socio_ricompensa_scelte from public, anon, authenticated;

-- Nessuna policy di lettura/scrittura diretta: tutto passa da RPC security definer.

create or replace function public.rc_icona_ok(p text)
returns boolean language sql immutable set search_path=public as $f$
  select p is null or p in (
    'socio-fondatore-b','pioniere','tester','coppa','d20','pergamena','clessidra','lanterna'
  );
$f$;
revoke all on function public.rc_icona_ok(text) from public, anon;
grant execute on function public.rc_icona_ok(text) to authenticated;

create or replace function public.rc_avatar_ok(p text)
returns boolean language sql immutable set search_path=public as $f$
  select p is null or p in (
    'custode-arco','esploratore-e','re-dei-meeple','inventore','golem-dadi',
    'cartografa','cavaliere','maga','ladra','drago','pirata','alchimista',
    'base-meeple-navy','base-meeple-oro','base-meeple-teal'
  );
$f$;
revoke all on function public.rc_avatar_ok(text) from public, anon;
grant execute on function public.rc_avatar_ok(text) to authenticated;

create or replace function public.rc_colore_ok(p text)
returns boolean language sql immutable set search_path=public as $f$
  select p is null or p in (
    '#14254a','#c4921a','#2a4785','#1e7a43','#8b1e3f','#0e6b8a','#3d2c8a','#a34b12'
  );
$f$;
revoke all on function public.rc_colore_ok(text) from public, anon;
grant execute on function public.rc_colore_ok(text) to authenticated;

create or replace function public.rc_base_avatar(p text)
returns boolean language sql immutable set search_path=public as $f$
  select p in ('base-meeple-navy','base-meeple-oro','base-meeple-teal');
$f$;
revoke all on function public.rc_base_avatar(text) from public, anon;
grant execute on function public.rc_base_avatar(text) to authenticated;

-- Lettura pubblica (autenticati): catalogo visibile, assegnazioni, scelte (solo effetti visibili).
create or replace function public.ricompense_stato()
returns jsonb language plpgsql stable security definer set search_path=public as $f$
begin
  if auth.uid() is null then raise exception 'Devi prima accedere' using errcode='42501'; end if;
  return jsonb_build_object(
    'catalogo', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'nome', r.nome, 'titolo', r.titolo, 'icona', r.icona,
        'colore', r.colore_nome, 'cornice', r.cornice, 'sfondo', r.sfondo,
        'avatar', to_jsonb(r.avatar_sbloccati), 'visibile', r.visibile,
        'modo', r.modo, 'modo_param', r.modo_param, 'priorita', r.priorita
      ) order by r.priorita desc, r.nome)
      from public.ricompense r
      where r.visibile or public.is_staff()), '[]'::jsonb),
    'assegnate', coalesce((select jsonb_agg(jsonb_build_object(
        'member_id', a.member_id, 'ricompensa_id', a.ricompensa_id
      ))
      from public.socio_ricompense a
      join public.ricompense r on r.id=a.ricompensa_id
      where r.visibile or public.is_staff()), '[]'::jsonb),
    'scelte', coalesce((select jsonb_agg(jsonb_build_object(
        'member_id', s.member_id, 'tipo', s.tipo, 'ricompensa_id', s.ricompensa_id
      ))
      from public.socio_ricompensa_scelte s
      join public.ricompense r on r.id=s.ricompensa_id
      where r.visibile or public.is_staff()), '[]'::jsonb)
  );
end
$f$;
revoke all on function public.ricompense_stato() from public, anon;
grant execute on function public.ricompense_stato() to authenticated;

-- Staff: crea o aggiorna una ricompensa.
create or replace function public.ricompensa_salva(p jsonb)
returns text language plpgsql security definer set search_path=public as $f$
declare
  v_id text;
  v_nome text;
  v_titolo text;
  v_icona text;
  v_colore text;
  v_cornice text;
  v_sfondo text;
  v_avatar text[];
  v_vis boolean;
  v_modo text;
  v_param jsonb;
  v_pri integer;
  v_av text;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Solo admin o moderatori' using errcode='42501';
  end if;
  if p is null or jsonb_typeof(p)<>'object' then
    raise exception 'Dati non validi';
  end if;
  v_id := lower(btrim(coalesce(p->>'id','')));
  if v_id is null or v_id !~ '^[a-z0-9-]{2,40}$' then
    raise exception 'Identificativo non valido';
  end if;
  v_nome := left(btrim(coalesce(p->>'nome','')), 60);
  if char_length(v_nome) not between 2 and 60 then
    raise exception 'Nome non valido';
  end if;
  v_titolo := nullif(left(btrim(coalesce(p->>'titolo','')), 60), '');
  v_icona := nullif(btrim(coalesce(p->>'icona','')), '');
  if not public.rc_icona_ok(v_icona) then raise exception 'Icona non valida'; end if;
  v_colore := nullif(lower(btrim(coalesce(p->>'colore',''))), '');
  if not public.rc_colore_ok(v_colore) then raise exception 'Colore non valido'; end if;
  v_cornice := nullif(btrim(coalesce(p->>'cornice','')), '');
  if v_cornice is not null and v_cornice not in ('oro','navy','doppio','alloro') then
    raise exception 'Cornice non valida';
  end if;
  v_sfondo := nullif(btrim(coalesce(p->>'sfondo','')), '');
  if v_sfondo is not null and v_sfondo not in ('navy-gold','navy','gold','teal','verde','bordeaux','viola') then
    raise exception 'Sfondo non valido';
  end if;
  v_avatar := array[]::text[];
  if p ? 'avatar' and jsonb_typeof(p->'avatar')='array' then
    if jsonb_array_length(p->'avatar')>8 then raise exception 'Troppi avatar'; end if;
    for v_av in select jsonb_array_elements_text(p->'avatar') loop
      v_av := btrim(v_av);
      if not public.rc_avatar_ok(v_av) then raise exception 'Avatar non valido'; end if;
      if not (v_av = any(v_avatar)) then v_avatar := v_avatar || v_av; end if;
    end loop;
  end if;
  v_vis := coalesce((p->>'visibile')::boolean, true);
  v_modo := coalesce(nullif(btrim(p->>'modo'),''), 'manuale');
  if v_modo not in ('manuale','tessera_entro','ruolo') then raise exception 'Modo non valido'; end if;
  v_param := coalesce(p->'modo_param', '{}'::jsonb);
  if jsonb_typeof(v_param)<>'object' then raise exception 'Parametri non validi'; end if;
  if v_modo='tessera_entro' then
    if coalesce(v_param->>'entro','') !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Data di scadenza non valida';
    end if;
  end if;
  v_pri := coalesce(nullif(p->>'priorita','')::int, 0);
  if v_pri not between 0 and 1000 then raise exception 'Priorità non valida'; end if;

  insert into public.ricompense(id,nome,titolo,icona,colore_nome,cornice,sfondo,avatar_sbloccati,visibile,modo,modo_param,priorita)
  values (v_id,v_nome,v_titolo,v_icona,v_colore,v_cornice,v_sfondo,v_avatar,v_vis,v_modo,v_param,v_pri)
  on conflict (id) do update set
    nome=excluded.nome, titolo=excluded.titolo, icona=excluded.icona,
    colore_nome=excluded.colore_nome, cornice=excluded.cornice, sfondo=excluded.sfondo,
    avatar_sbloccati=excluded.avatar_sbloccati, visibile=excluded.visibile,
    modo=excluded.modo, modo_param=excluded.modo_param, priorita=excluded.priorita;
  return v_id;
end
$f$;
revoke all on function public.ricompensa_salva(jsonb) from public, anon;
grant execute on function public.ricompensa_salva(jsonb) to authenticated;

create or replace function public.ricompensa_elimina(p_id text)
returns void language plpgsql security definer set search_path=public as $f$
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Solo admin o moderatori' using errcode='42501';
  end if;
  if p_id is null or p_id !~ '^[a-z0-9-]{2,40}$' then raise exception 'Identificativo non valido'; end if;
  delete from public.ricompense where id=p_id;
  if not found then raise exception 'Ricompensa non trovata'; end if;
end
$f$;
revoke all on function public.ricompensa_elimina(text) from public, anon;
grant execute on function public.ricompensa_elimina(text) to authenticated;

create or replace function public.ricompensa_assegna(p_member text, p_ricompensa text, p_on boolean)
returns void language plpgsql security definer set search_path=public as $f$
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Solo admin o moderatori' using errcode='42501';
  end if;
  if p_member is null or p_member !~ '^[A-Za-z0-9_-]{1,64}$' then raise exception 'Socio non valido'; end if;
  if p_ricompensa is null or p_ricompensa !~ '^[a-z0-9-]{2,40}$' then raise exception 'Ricompensa non valida'; end if;
  if not exists (select 1 from public.members where id=p_member) then raise exception 'Socio non trovato'; end if;
  if not exists (select 1 from public.ricompense where id=p_ricompensa) then raise exception 'Ricompensa non trovata'; end if;
  if coalesce(p_on, true) then
    insert into public.socio_ricompense(member_id, ricompensa_id, assegnata_da, auto)
    values (p_member, p_ricompensa, auth.uid(), false)
    on conflict (member_id, ricompensa_id) do nothing;
  else
    delete from public.socio_ricompense where member_id=p_member and ricompensa_id=p_ricompensa;
    delete from public.socio_ricompensa_scelte where member_id=p_member and ricompensa_id=p_ricompensa;
  end if;
end
$f$;
revoke all on function public.ricompensa_assegna(text, text, boolean) from public, anon;
grant execute on function public.ricompensa_assegna(text, text, boolean) to authenticated;

-- Il socio sceglie quale effetto usare in caso di doppioni dello stesso tipo.
create or replace function public.ricompensa_scegli(p_tipo text, p_ricompensa text)
returns void language plpgsql security definer set search_path=public as $f$
declare mid text;
begin
  if auth.uid() is null then raise exception 'Devi prima accedere' using errcode='42501'; end if;
  select id into mid from public.members where user_id=auth.uid();
  if mid is null then raise exception 'Account non collegato a nessuna scheda socio'; end if;
  if p_tipo is null or p_tipo not in ('titolo','colore','icona','cornice','sfondo','avatar') then
    raise exception 'Tipo non valido';
  end if;
  if p_ricompensa is null or btrim(p_ricompensa)='' then
    delete from public.socio_ricompensa_scelte where member_id=mid and tipo=p_tipo;
    return;
  end if;
  if p_ricompensa !~ '^[a-z0-9-]{2,40}$' then raise exception 'Ricompensa non valida'; end if;
  if not exists (
    select 1 from public.socio_ricompense a
    join public.ricompense r on r.id=a.ricompensa_id
    where a.member_id=mid and a.ricompensa_id=p_ricompensa and r.visibile
  ) then
    raise exception 'Non hai questa ricompensa';
  end if;
  insert into public.socio_ricompensa_scelte(member_id, tipo, ricompensa_id)
  values (mid, p_tipo, p_ricompensa)
  on conflict (member_id, tipo) do update set ricompensa_id=excluded.ricompensa_id;
end
$f$;
revoke all on function public.ricompensa_scegli(text, text) from public, anon;
grant execute on function public.ricompensa_scegli(text, text) to authenticated;

-- Assegnazione automatica (tessera pagata entro una data; esclusioni, es. fondatori).
create or replace function public.ricompense_sync_auto()
returns jsonb language plpgsql security definer set search_path=public as $f$
declare
  r record;
  v_entro date;
  v_escl text[];
  v_n int := 0;
  n int;
begin
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
    select distinct ls.member_id, r.id, null, true
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

-- ========== Sospeso: RPC staff ==========
create or replace function public.staff_socio_sospeso(p_id text, p_sospeso boolean, p_nota text, p_rientro date)
returns void language plpgsql security definer set search_path=public as $f$
declare v_nota text;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Solo admin o moderatori' using errcode='42501';
  end if;
  if p_id is null or p_id !~ '^[A-Za-z0-9_-]{1,64}$' then raise exception 'Socio non valido'; end if;
  if not exists (select 1 from public.members where id=p_id) then raise exception 'Socio non trovato'; end if;
  v_nota := nullif(left(btrim(coalesce(p_nota,'')), 300), '');
  if coalesce(p_sospeso, false) then
    update public.members set
      sospeso=true,
      sospeso_nota=v_nota,
      sospeso_dal=coalesce(sospeso_dal, now()),
      sospeso_rientro=p_rientro
    where id=p_id;
  else
    update public.members set
      sospeso=false,
      sospeso_nota=null,
      sospeso_dal=null,
      sospeso_rientro=null
    where id=p_id;
  end if;
end
$f$;
revoke all on function public.staff_socio_sospeso(text, boolean, text, date) from public, anon;
grant execute on function public.staff_socio_sospeso(text, boolean, text, date) to authenticated;

create or replace function public.staff_soci_sospesi()
returns jsonb language plpgsql stable security definer set search_path=public as $f$
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Solo admin o moderatori' using errcode='42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', m.id,
      'nota', m.sospeso_nota,
      'dal', m.sospeso_dal,
      'rientro', m.sospeso_rientro
    ))
    from public.members m
    where m.sospeso), '[]'::jsonb);
end
$f$;
revoke all on function public.staff_soci_sospesi() from public, anon;
grant execute on function public.staff_soci_sospesi() to authenticated;

-- Avatar a tema: lo slug è accettato solo se sbloccato (o è un meeple base).
create or replace function public.update_my_profile(p_soprannome text, p_avatar text, p_color text, p_fav_game_id text, p_photo_url text)
returns void language plpgsql security definer set search_path = public as $$
declare v_photo text; v_av text; mid text;
begin
  if auth.uid() is null then raise exception 'Devi prima accedere'; end if;
  select id into mid from public.members where user_id=auth.uid();
  if mid is null then raise exception 'Account non collegato a nessuna scheda socio'; end if;
  v_av := nullif(left(coalesce(p_avatar, ''), 16), '');
  if v_av is not null and public.rc_avatar_ok(v_av) and not public.rc_base_avatar(v_av) then
    if not exists (
      select 1 from public.socio_ricompense a
      join public.ricompense r on r.id=a.ricompensa_id
      where a.member_id=mid and r.visibile and v_av = any(r.avatar_sbloccati)
    ) then
      raise exception 'Avatar non sbloccato';
    end if;
  end if;
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
    avatar = v_av,
    color = case when p_color ~ '^#[0-9a-fA-F]{6}$' then p_color else null end,
    fav_game_id = nullif(p_fav_game_id, ''),
    photo_url = v_photo
  where id = mid;
end $$;
revoke all on function public.update_my_profile(text, text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text, text) to authenticated;

-- Seed: tre ricompense iniziali, nessuna assegnazione automatica ai soci (Pioniere si assegna con sync).
insert into public.ricompense(id,nome,titolo,icona,colore_nome,cornice,sfondo,avatar_sbloccati,visibile,modo,modo_param,priorita)
values
  ('socio-fondatore','Socio fondatore','Socio fondatore','socio-fondatore-b','#c4921a','oro','navy-gold',
    array['custode-arco','re-dei-meeple']::text[], true, 'manuale', '{}'::jsonb, 100),
  ('pioniere-2026','Pioniere 2026','Pioniere 2026','pioniere','#0e6b8a','navy','teal',
    array['esploratore-e','cartografa']::text[], true, 'tessera_entro',
    '{"entro":"2026-12-31","escludi":["socio-fondatore"]}'::jsonb, 80),
  ('tester','Tester','Tester','tester','#3d2c8a','doppio','viola',
    array['inventore','golem-dadi']::text[], true, 'manuale', '{}'::jsonb, 60)
on conflict (id) do nothing;
