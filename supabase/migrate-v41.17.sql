-- v41.17 — regole di accesso per stato socio; Past President; Presidente/Past President solo admin.

-- ========== Helper di accesso ==========
create or replace function public.member_can_act(p_id text)
returns boolean
language sql
stable
security definer
set search_path=public
as $f$
  select exists(
    select 1 from public.members m
    where m.id = p_id
      and m.active is true
      and coalesce(m.sospeso, false) is not true
  );
$f$;
revoke all on function public.member_can_act(text) from public, anon;
grant execute on function public.member_can_act(text) to authenticated;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path=public
as $f$
  select public.is_staff()
      or exists(
        select 1 from public.members m
        where m.user_id = auth.uid()
          and m.user_id is not null
          and m.active is true
          and coalesce(m.sospeso, false) is not true
      );
$f$;
revoke all on function public.is_active_member() from public, anon;
grant execute on function public.is_active_member() to authenticated;

create or replace function public.is_deactivated_user()
returns boolean
language sql
stable
security definer
set search_path=public
as $f$
  select exists(
    select 1 from public.members m
    where m.user_id = auth.uid()
      and m.user_id is not null
      and m.active is not true
  ) and not public.is_staff();
$f$;
revoke all on function public.is_deactivated_user() from public, anon;
grant execute on function public.is_deactivated_user() to authenticated;

create or replace function public.can_read_app()
returns boolean
language sql
stable
security definer
set search_path=public
as $f$
  select not public.is_deactivated_user();
$f$;
revoke all on function public.can_read_app() from public, anon;
grant execute on function public.can_read_app() to authenticated;

create or replace function public.require_active_member()
returns text
language plpgsql
stable
security definer
set search_path=public
as $f$
declare mid text;
begin
  if public.is_staff() then
    select id into mid from public.members
     where user_id = auth.uid() and user_id is not null
     order by id limit 1;
    return mid;
  end if;
  if public.is_deactivated_user() then
    raise exception 'Account disattivato. Per rinnovare la tessera associativa, contatta lo staff.'
      using errcode='42501';
  end if;
  select id into mid from public.members
   where user_id = auth.uid() and user_id is not null
     and active is true
     and coalesce(sospeso, false) is not true
   order by id limit 1;
  if mid is null then
    if exists (
      select 1 from public.members
      where user_id = auth.uid() and user_id is not null and coalesce(sospeso, false)
    ) then
      raise exception 'Il tuo account è sospeso: puoi consultare l''app, ma in questo periodo non puoi fare questa azione.'
        using errcode='42501';
    end if;
    raise exception 'Account non collegato a un socio' using errcode='42501';
  end if;
  return mid;
end
$f$;
revoke all on function public.require_active_member() from public, anon;
grant execute on function public.require_active_member() to authenticated;

-- Stato del solo chiamante: nessun dato di altri soci.
create or replace function public.accesso_stato()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $f$
declare
  st boolean := public.is_staff();
  m public.members%rowtype;
  nir boolean := false;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'autenticato', false,
      'staff', false,
      'stato', 'anonimo',
      'blocca_app', false,
      'blocca_azioni', false,
      'non_in_regola', false
    );
  end if;
  select * into m from public.members
   where user_id = auth.uid() and user_id is not null
   order by id limit 1;
  if m.id is null then
    return jsonb_build_object(
      'autenticato', true,
      'staff', st,
      'stato', case when st then 'staff' else 'nessun_socio' end,
      'blocca_app', false,
      'blocca_azioni', false,
      'non_in_regola', false
    );
  end if;
  if st then
    return jsonb_build_object(
      'autenticato', true,
      'staff', true,
      'stato', 'staff',
      'blocca_app', false,
      'blocca_azioni', false,
      'non_in_regola', false
    );
  end if;
  if m.active is not true then
    return jsonb_build_object(
      'autenticato', true,
      'staff', false,
      'stato', 'disattivato',
      'blocca_app', true,
      'blocca_azioni', true,
      'non_in_regola', false
    );
  end if;
  if coalesce(m.sospeso, false) then
    return jsonb_build_object(
      'autenticato', true,
      'staff', false,
      'stato', 'sospeso',
      'blocca_app', false,
      'blocca_azioni', true,
      'non_in_regola', false
    );
  end if;
  select exists(
    select 1 from public.libro_soci s
    where s.member_id = m.id
      and s.data_uscita is null
      and s.stato_quote = 'non_in_regola'
  ) into nir;
  return jsonb_build_object(
    'autenticato', true,
    'staff', false,
    'stato', case when nir then 'non_in_regola' else 'ok' end,
    'blocca_app', false,
    'blocca_azioni', false,
    'non_in_regola', nir
  );
end
$f$;
revoke all on function public.accesso_stato() from public, anon;
grant execute on function public.accesso_stato() to authenticated;

-- Policy restrittiva: un utente autenticato collegato a un socio disattivato
-- (non staff) non legge né scrive dati. Le policy permissive e quelle anon restano.
do $pol$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity
  loop
    execute format('drop policy if exists accesso_non_disattivato on public.%I', r.relname);
    execute format(
      'create policy accesso_non_disattivato on public.%I as restrictive for all to authenticated using (public.can_read_app()) with check (public.can_read_app())',
      r.relname
    );
  end loop;
end
$pol$;

-- Policy di scrittura tavoli/partite: anche i sospesi sono esclusi (lo staff no).
drop policy if exists tables_insert on public.tables;
create policy tables_insert on public.tables for insert to authenticated
  with check (public.is_staff() or public.is_active_member());

drop policy if exists tables_update on public.tables;
create policy tables_update on public.tables for update to authenticated
  using (public.is_staff() or host_id in (
    select m.id from public.members m
    where m.user_id = auth.uid() and public.member_can_act(m.id)
  ))
  with check (public.is_staff() or host_id in (
    select m.id from public.members m
    where m.user_id = auth.uid() and public.member_can_act(m.id)
  ));

drop policy if exists tables_host_delete on public.tables;
create policy tables_host_delete on public.tables for delete to authenticated
  using (
    coalesce(status, 'open') = 'open'
    and host_id in (
      select m.id from public.members m
      where m.user_id = auth.uid() and public.member_can_act(m.id)
    )
  );

drop policy if exists plays_insert_self on public.plays;
create policy plays_insert_self on public.plays for insert to authenticated
  with check (
    public.is_staff()
    or (
      public.is_active_member()
      and exists (
        select 1 from public.members m
        where m.user_id = auth.uid()
          and public.member_can_act(m.id)
          and players @> jsonb_build_array(jsonb_build_object('memberId', m.id))
      )
    )
  );

-- Inietta require_active_member() nelle RPC di azione (idempotente).
do $patch$
declare
  r record;
  def text;
  low text;
  start_body int;
  b int;
  names text[] := array[
    'coppa_iscrivi','des_proponi','des_ritira','des_vota','des_spiego','des_proponi_voto',
    'poll_vota','rate_game','table_cancel','table_seat','tables_host_guard',
    'evento_prenota','ricompensa_scegli','set_stats_pubbliche','update_my_profile'
  ];
begin
  for r in
    select p.oid, pg_get_functiondef(p.oid) as def
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(names)
      and p.prokind = 'f'
      and p.prolang = (select oid from pg_language where lanname = 'plpgsql')
  loop
    def := r.def;
    if def ilike '%require_active_member%' then
      continue;
    end if;
    low := lower(def);
    start_body := position(' as $' in low);
    if start_body = 0 then continue; end if;
    b := position('begin' in substring(low from start_body));
    if b = 0 then continue; end if;
    b := start_body + b - 1;
    def := left(def, b + 4) || E'\n  perform public.require_active_member();\n' || substr(def, b + 5);
    execute def;
  end loop;
end
$patch$;

-- ========== Past President + lucchetto admin ==========
create or replace function public.rc_icona_ok(p text)
returns boolean language sql immutable set search_path=public as $f$
  select p is null or p in (
    'socio-fondatore-b','pioniere','tester','dado-5','dado-5-past',
    'coppa','d20','pergamena','clessidra','lanterna'
  );
$f$;
revoke all on function public.rc_icona_ok(text) from public, anon;
grant execute on function public.rc_icona_ok(text) to authenticated;

create or replace function public.rc_solo_admin(p_id text)
returns boolean
language sql
immutable
set search_path=public
as $f$
  select p_id in ('presidente','past-president');
$f$;
revoke all on function public.rc_solo_admin(text) from public, anon;
grant execute on function public.rc_solo_admin(text) to authenticated;

insert into public.ricompense(id,nome,titolo,icona,colore_nome,cornice,sfondo,avatar_sbloccati,visibile,modo,modo_param,priorita)
values
  ('past-president','Past President','Past President','dado-5-past','#c4921a','alloro','gold',
    array[]::text[], true, 'manuale', '{}'::jsonb, 105)
on conflict (id) do nothing;

-- All'assegnazione di Presidente, Past President è permanente (resta anche se Presidente viene tolta).
create or replace function public.rc_past_president_trg()
returns trigger
language plpgsql
security definer
set search_path=public
as $f$
begin
  if tg_op = 'INSERT' and new.ricompensa_id = 'presidente' then
    insert into public.socio_ricompense(member_id, ricompensa_id, assegnata_da, auto)
    values (new.member_id, 'past-president', new.assegnata_da, true)
    on conflict (member_id, ricompensa_id) do nothing;
  end if;
  return new;
end
$f$;
revoke all on function public.rc_past_president_trg() from public, anon;

drop trigger if exists trg_rc_past_president on public.socio_ricompense;
create trigger trg_rc_past_president
  after insert on public.socio_ricompense
  for each row execute function public.rc_past_president_trg();

insert into public.socio_ricompense(member_id, ricompensa_id, assegnata_da, auto)
select a.member_id, 'past-president', a.assegnata_da, true
from public.socio_ricompense a
where a.ricompensa_id = 'presidente'
on conflict (member_id, ricompensa_id) do nothing;

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
  if public.rc_solo_admin(lower(btrim(coalesce(p->>'id','')))) and not public.is_admin() then
    raise exception 'Solo gli admin possono modificare questa ricompensa' using errcode='42501';
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
  if public.rc_solo_admin(p_id) and not public.is_admin() then
    raise exception 'Solo gli admin possono modificare questa ricompensa' using errcode='42501';
  end if;
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
  if public.rc_solo_admin(p_ricompensa) and not public.is_admin() then
    raise exception 'Solo gli admin possono assegnare o revocare questa ricompensa' using errcode='42501';
  end if;
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
