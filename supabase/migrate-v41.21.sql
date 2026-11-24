-- v41.21: informativa privacy (accettazione solo lato server) + testi gm_gdt.
-- Idempotente. Solo ambiente di TEST finché non arriva il via per la produzione.

-- Testo predefinito «Giochi da tavolo» al posto della sigla GDT, se ancora quella
update public.app_settings
   set value = jsonb_set(value, '{gm_gdt}', '"Giochi da tavolo"')
 where key = 'testi'
   and coalesce(value->>'gm_gdt','') in ('GDT','Gdt','gdt');

-- ---------------------------------------------------------------------------
-- Tabella accettazioni: niente update/delete da parte del socio
-- ---------------------------------------------------------------------------
create table if not exists public.privacy_consents (
  user_id uuid not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  constraint privacy_consents_pkey primary key (user_id, version),
  constraint privacy_consents_version_ok check (version ~ '^[A-Za-z0-9._-]{1,20}$')
);

comment on table public.privacy_consents is
  'Accettazione informativa privacy: scritta solo da privacy_accept (auth.uid + now). Il socio non modifica né cancella.';

alter table public.privacy_consents enable row level security;
alter table public.privacy_consents force row level security;

drop policy if exists privacy_consents_select on public.privacy_consents;
create policy privacy_consents_select on public.privacy_consents
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- Nessuna policy INSERT/UPDATE/DELETE per authenticated o anon: scrittura solo via SECURITY DEFINER.

revoke all on table public.privacy_consents from public, anon;
grant select on table public.privacy_consents to authenticated;

-- ---------------------------------------------------------------------------
-- Validazione del JSON in app_settings.key = 'privacy'
-- ---------------------------------------------------------------------------
create or replace function public.privacy_valid(v jsonb)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
begin
  if v is null or jsonb_typeof(v) <> 'object' then return false; end if;
  if jsonb_typeof(v->'version') is distinct from 'string' then return false; end if;
  if jsonb_typeof(v->'text') is distinct from 'string' then return false; end if;
  if not (v->>'version') ~ '^[A-Za-z0-9._-]{1,20}$' then return false; end if;
  if length(v->>'text') < 1 or length(v->>'text') > 20000 then return false; end if;
  if v ? 'titolare' and jsonb_typeof(v->'titolare') is distinct from 'string' then return false; end if;
  if length(coalesce(v->>'titolare','')) > 200 then return false; end if;
  return true;
end;
$$;
revoke all on function public.privacy_valid(jsonb) from public, anon, authenticated;

alter table public.app_settings drop constraint if exists app_settings_privacy_valid;
alter table public.app_settings
  add constraint app_settings_privacy_valid
  check (key <> 'privacy' or public.privacy_valid(value));

create or replace function public.privacy_settings_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.key = 'privacy' then
      raise exception 'L''informativa privacy non si elimina da qui' using errcode = '42501';
    end if;
    return old;
  end if;
  if new.key = 'privacy' then
    if current_setting('pergioco.privacy_write', true) is distinct from 'on' then
      raise exception 'L''informativa si modifica solo da Configurazione' using errcode = '42501';
    end if;
    if not public.privacy_valid(new.value) then
      raise exception 'Informativa privacy non valida';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.privacy_settings_guard() from public, anon, authenticated;

drop trigger if exists privacy_settings_guard on public.app_settings;
create trigger privacy_settings_guard
  before insert or update or delete on public.app_settings
  for each row execute function public.privacy_settings_guard();

-- ---------------------------------------------------------------------------
-- Lettura stato / testo, senza dati personali in più
-- ---------------------------------------------------------------------------
create or replace function public.privacy_current_version()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(btrim(value->>'version'), '')
    from public.app_settings
   where key = 'privacy'
   limit 1;
$$;
revoke all on function public.privacy_current_version() from public, anon;
grant execute on function public.privacy_current_version() to authenticated;

create or replace function public.privacy_is_ok()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare ver text;
begin
  if auth.uid() is null then
    return false;
  end if;
  ver := public.privacy_current_version();
  if ver is null then
    return true; -- nessuna informativa in vigore
  end if;
  return exists (
    select 1 from public.privacy_consents c
     where c.user_id = auth.uid() and c.version = ver
  );
end;
$$;
revoke all on function public.privacy_is_ok() from public, anon;
grant execute on function public.privacy_is_ok() to authenticated;

create or replace function public.require_privacy_ok()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Accesso richiesto' using errcode = '42501';
  end if;
  if not public.privacy_is_ok() then
    raise exception 'Per continuare devi accettare l''informativa privacy' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.require_privacy_ok() from public, anon;
grant execute on function public.require_privacy_ok() to authenticated;

-- Testo pubblico (nessun dato personale). Anon può leggerlo alla registrazione.
create or replace function public.privacy_testo()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v jsonb;
begin
  select value into v from public.app_settings where key = 'privacy' limit 1;
  if v is null then
    return jsonb_build_object('in_vigore', false, 'version', null, 'text', '', 'titolare', '');
  end if;
  return jsonb_build_object(
    'in_vigore', true,
    'version', v->>'version',
    'text', v->>'text',
    'titolare', coalesce(v->>'titolare','')
  );
end;
$$;
revoke all on function public.privacy_testo() from public;
grant execute on function public.privacy_testo() to anon, authenticated;

create or replace function public.privacy_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare ver text;
        acc timestamptz;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'autenticato', false, 'in_vigore', false, 'version', null, 'accepted_at', null);
  end if;
  ver := public.privacy_current_version();
  if ver is null then
    return jsonb_build_object('ok', true, 'autenticato', true, 'in_vigore', false, 'version', null, 'accepted_at', null);
  end if;
  select c.accepted_at into acc
    from public.privacy_consents c
   where c.user_id = auth.uid() and c.version = ver;
  return jsonb_build_object(
    'ok', acc is not null,
    'autenticato', true,
    'in_vigore', true,
    'version', ver,
    'accepted_at', acc
  );
end;
$$;
revoke all on function public.privacy_status() from public, anon;
grant execute on function public.privacy_status() to authenticated;

-- Accettazione: solo auth.uid() e now() del server. Idempotente sulla stessa versione (non cambia la data).
create or replace function public.privacy_accept()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare ver text;
        acc timestamptz;
        uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Accesso richiesto' using errcode = '42501';
  end if;
  ver := public.privacy_current_version();
  if ver is null then
    raise exception 'Nessuna informativa in vigore';
  end if;
  select c.accepted_at into acc
    from public.privacy_consents c
   where c.user_id = uid and c.version = ver;
  if acc is not null then
    return jsonb_build_object('ok', true, 'version', ver, 'accepted_at', acc);
  end if;
  insert into public.privacy_consents(user_id, version, accepted_at)
  values (uid, ver, now())
  on conflict (user_id, version) do nothing;
  select c.accepted_at into acc
    from public.privacy_consents c
   where c.user_id = uid and c.version = ver;
  return jsonb_build_object('ok', true, 'version', ver, 'accepted_at', acc);
end;
$$;
revoke all on function public.privacy_accept() from public, anon;
grant execute on function public.privacy_accept() to authenticated;

-- Solo admin: pubblica una nuova versione. Data e autore li mette il server.
create or replace function public.admin_privacy_set(p_text text, p_titolare text, p_version text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare cur text;
        ver text;
        tit text := left(btrim(coalesce(p_titolare,'')), 200);
        txt text := coalesce(p_text,'');
        now_it timestamptz := now();
begin
  if not public.is_admin() then
    raise exception 'Solo un admin può modificare l''informativa' using errcode = '42501';
  end if;
  if length(txt) < 1 or length(txt) > 20000 then
    raise exception 'Il testo deve avere tra 1 e 20.000 caratteri';
  end if;
  -- niente markup: si mostra sempre con escape lato client; qui si tolgono i tag più evidenti
  txt := regexp_replace(txt, '<[^>]*>', '', 'g');
  cur := public.privacy_current_version();
  -- La versione la assegna solo il server. p_version resta nella firma per
  -- compatibilità, ma viene ignorato: un client non deve poter ripubblicare
  -- una versione già accettata e così saltare il nuovo consenso.
  if cur ~ '^[0-9]+$' then
    ver := (cur::int + 1)::text;
  else
    ver := to_char(now_it at time zone 'Europe/Rome', 'YYYYMMDD-HH24MI');
  end if;
  perform set_config('pergioco.privacy_write', 'on', true);
  insert into public.app_settings(key, value)
  values (
    'privacy',
    jsonb_build_object(
      'version', ver,
      'text', txt,
      'titolare', tit,
      'updated_at', now_it
    )
  )
  on conflict (key) do update set value = excluded.value;
  return jsonb_build_object('ok', true, 'version', ver, 'updated_at', now_it, 'text_len', length(txt));
end;
$$;
revoke all on function public.admin_privacy_set(text, text, text) from public, anon;
grant execute on function public.admin_privacy_set(text, text, text) to authenticated;

-- Elenco accettazioni per lo staff: niente email, solo nome della scheda socio se collegata
create or replace function public.admin_privacy_consensi()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare ver text;
        out jsonb;
begin
  if not public.is_staff() then
    raise exception 'Riservato allo staff' using errcode = '42501';
  end if;
  ver := public.privacy_current_version();
  select coalesce(jsonb_agg(x.row order by x.accepted_at desc), '[]'::jsonb) into out
  from (
    select jsonb_build_object(
             'version', c.version,
             'accepted_at', c.accepted_at,
             'corrente', c.version is not distinct from ver,
             'socio', case
               when m.id is null then 'account non collegato'
               else nullif(btrim(concat_ws(' ', m.nome, m.cognome)), '')
             end
           ) as row,
           c.accepted_at
      from public.privacy_consents c
      left join public.members m on m.user_id = c.user_id
  ) x;
  return jsonb_build_object('version', ver, 'consensi', out);
end;
$$;
revoke all on function public.admin_privacy_consensi() from public, anon;
grant execute on function public.admin_privacy_consensi() to authenticated;

-- ---------------------------------------------------------------------------
-- Scritture dirette (REST): il socio deve aver accettato la versione in vigore.
-- Le funzioni SECURITY DEFINER bypassano la RLS: per quelle si inietta require_privacy_ok.
-- ---------------------------------------------------------------------------
do $pol$
declare t text;
begin
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and c.relrowsecurity
       and c.relname <> 'privacy_consents'
  loop
    execute format('drop policy if exists privacy_consenso_ins on public.%I', t);
    execute format('drop policy if exists privacy_consenso_upd on public.%I', t);
    execute format('drop policy if exists privacy_consenso_del on public.%I', t);
    execute format(
      'create policy privacy_consenso_ins on public.%I as restrictive for insert to authenticated with check (public.privacy_is_ok())',
      t
    );
    execute format(
      'create policy privacy_consenso_upd on public.%I as restrictive for update to authenticated using (public.privacy_is_ok()) with check (public.privacy_is_ok())',
      t
    );
    execute format(
      'create policy privacy_consenso_del on public.%I as restrictive for delete to authenticated using (public.privacy_is_ok())',
      t
    );
  end loop;
end
$pol$;

-- RPC di scrittura usate dall'app (non trigger, non lettura, non privacy_accept / admin_privacy_set)
do $inj$
declare
  r record;
  def text;
  low text;
  marker int;
  i int;
  found int;
  b int;
  a int;
  before_ch text;
  after_ch text;
begin
  for r in
    select p.oid, p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_language l on l.oid = p.prolang
     where n.nspname = 'public'
       and p.prosecdef
       and l.lanname = 'plpgsql'
       and p.proname in (
         'table_seat','table_cancel','update_my_profile','rate_game','rating_moderate',
         'evento_prenota','evento_annulla','evento_staff','ev_promuovi',
         'des_proponi','des_proponi_voto','des_vota','des_ritira','des_spiego',
         'des_arrivato','des_elimina','des_collega','des_periodo',
         'poll_vota','poll_salva','poll_aggiungi_opzione','poll_azione',
         'poll_notifiche_lette','poll_collega_desideri',
         'coppa_iscrivi','coppa_apri','coppa_avanza','coppa_avvia','coppa_config',
         'coppa_crea','coppa_date','coppa_elimina','coppa_risultato','coppa_risultato_t',
         'ricompensa_assegna','ricompensa_elimina','ricompensa_salva','ricompensa_scegli',
         'set_stats_pubbliche','wrapped_set',
         'admin_delete_code','admin_game_remove','admin_member_remove',
         'admin_new_code','admin_set_admin','admin_set_admin_member','admin_set_moderator','admin_set_moderator_member','staff_socio_sospeso',
         'games_import_bgg'
       )
  loop
    def := pg_get_functiondef(r.oid);
    if position('require_privacy_ok' in def) > 0 then
      continue;
    end if;
    low := lower(def);
    marker := position('as $function$' in low);
    if marker = 0 then
      raise notice 'v41.21: nessun $function$ in %', r.proname;
      continue;
    end if;
    found := 0;
    i := marker;
    while i <= length(low) - 4 loop
      if substr(low, i, 5) = 'begin' then
        before_ch := case when i = 1 then ' ' else substr(low, i - 1, 1) end;
        after_ch := case when i + 5 > length(low) then ' ' else substr(low, i + 5, 1) end;
        if before_ch !~ '[[:alnum:]_]' and after_ch !~ '[[:alnum:]_]' then
          found := i;
          exit;
        end if;
      end if;
      i := i + 1;
    end loop;
    if found = 0 then
      raise notice 'v41.21: impossibile iniettare require_privacy_ok in %', r.proname;
      continue;
    end if;
    def := substr(def, 1, found - 1)
        || E'begin\n  perform public.require_privacy_ok();'
        || substr(def, found + 5);
    execute def;
  end loop;
end
$inj$;

-- I privilegi di default di Supabase riassegnano ALL a authenticated dopo CREATE TABLE:
-- si ripetono REVOKE/GRANT alla fine, così resta solo SELECT.
revoke all on table public.privacy_consents from public, anon, authenticated;
grant select on table public.privacy_consents to authenticated;
