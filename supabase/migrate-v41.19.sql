-- v41.19 BP-1: superadmin, tessera unica/automatica, elimina socio, spiegazione partita.
-- Idempotente. Applicare solo all'ambiente di TEST prima del via in produzione.

-- ===== Superadmin =====
alter table public.admins add column if not exists super boolean not null default false;

update public.admins
   set super = true
 where lower(email) = 'vincenzo.assenza@pergioco.org'
   and not exists (select 1 from public.admins a2 where a2.super);

create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins a
     where a.super
       and (
         (a.user_id is not null and a.user_id = auth.uid())
         or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
       )
  );
$$;
revoke all on function public.is_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated;

create or replace function public.admins_guard_super() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if tg_op = 'DELETE' then
    if old.super and not exists (select 1 from public.admins a where a.super and a.email is distinct from old.email) then
      raise exception 'Deve restare almeno un superadmin' using errcode = '42501';
    end if;
    if old.super and public.is_superadmin()
       and (
         (old.user_id is not null and old.user_id = auth.uid())
         or lower(old.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
       ) then
      raise exception 'Non puoi toglierti da solo il ruolo di superadmin' using errcode = '42501';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    if old.super is distinct from new.super then
      if public.is_superadmin()
         and (
           (old.user_id is not null and old.user_id = auth.uid())
           or lower(old.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
         ) then
        raise exception 'Non puoi toglierti da solo il ruolo di superadmin' using errcode = '42501';
      end if;
      if old.super and not new.super
         and not exists (select 1 from public.admins a where a.super and a.email is distinct from old.email) then
        raise exception 'Deve restare almeno un superadmin' using errcode = '42501';
      end if;
    end if;
    return new;
  end if;
  return new;
end $$;
revoke all on function public.admins_guard_super() from public, anon, authenticated;
drop trigger if exists admins_guard_super on public.admins;
create trigger admins_guard_super before update or delete on public.admins
  for each row execute function public.admins_guard_super();

-- scrittura solo via RPC (defense in depth)
revoke insert, update, delete on public.admins from authenticated, anon, public;
grant select on public.admins to authenticated;

drop function if exists public.admin_admins();
create function public.admin_admins()
returns table(email text, user_id uuid, member_id text, nome text, cognome text, stato text, super boolean)
language sql stable security definer set search_path=public as $$
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
    end as stato,
    a.super
  from public.admins a
  left join auth.users u
    on u.id = a.user_id
    or lower(u.email) = lower(a.email)
  left join public.members m
    on m.user_id is not null
   and m.user_id = coalesce(a.user_id, u.id)
  where public.is_admin()
  order by a.super desc, coalesce(m.cognome, a.email), coalesce(m.nome, '');
$$;
revoke all on function public.admin_admins() from public, anon;
grant execute on function public.admin_admins() to authenticated;

create or replace function public.admin_set_admin(p_email text, p_on boolean) returns void
language plpgsql security definer set search_path=public as $$
declare
  v_email text;
  v_uid uuid;
begin
  if not public.is_superadmin() then
    raise exception 'Solo il superadmin può gestire gli admin' using errcode='42501';
  end if;
  v_email := lower(trim(coalesce(p_email, '')));
  if v_email = '' or length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email non valida';
  end if;
  select u.id into v_uid from auth.users u where lower(u.email) = v_email limit 1;
  if exists (
    select 1 from public.admins a
     where a.super
       and (lower(a.email) = v_email or (v_uid is not null and a.user_id = v_uid))
  ) then
    raise exception 'Non puoi modificare o togliere un superadmin' using errcode='42501';
  end if;
  if coalesce(p_on, true) then
    insert into public.admins(email, user_id, super) values (v_email, v_uid, false)
    on conflict (email) do update set user_id = coalesce(excluded.user_id, public.admins.user_id)
      where public.admins.super = false;
    delete from public.moderators
     where lower(email) = v_email
        or (v_uid is not null and user_id = v_uid);
  else
    delete from public.admins
     where (lower(email) = v_email or (v_uid is not null and user_id = v_uid))
       and super = false;
  end if;
end $$;

create or replace function public.admin_set_admin_member(p_member text, p_on boolean) returns void
language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid;
  v_email text;
begin
  if not public.is_superadmin() then
    raise exception 'Solo il superadmin può gestire gli admin' using errcode='42501';
  end if;
  if p_member is null or p_member !~ '^[A-Za-z0-9_-]{1,64}$' then
    raise exception 'Socio non valido';
  end if;
  select m.user_id into v_uid from public.members m where m.id = p_member;
  if v_uid is null then raise exception 'Il socio non ha un account collegato'; end if;
  select u.email into v_email from auth.users u where u.id = v_uid;
  if v_email is null or length(trim(v_email)) = 0 then raise exception 'Account non trovato'; end if;
  perform public.admin_set_admin(v_email, p_on);
end $$;
revoke all on function public.admin_set_admin(text,boolean), public.admin_set_admin_member(text,boolean) from public, anon;
grant execute on function public.admin_set_admin(text,boolean), public.admin_set_admin_member(text,boolean) to authenticated;

-- ===== Tessera unica e automatica =====
alter table public.members drop constraint if exists members_tessera_len_chk;
alter table public.members add constraint members_tessera_len_chk
  check (tessera is null or char_length(btrim(tessera)) between 1 and 30);

drop index if exists members_tessera_uidx;
create unique index if not exists members_tessera_uidx
  on public.members (lower(btrim(tessera)))
  where tessera is not null and btrim(tessera) <> '';

create or replace function public.next_tessera() returns text
language sql stable security definer set search_path=public as $$
  select coalesce((
    select s.n::text
    from generate_series(1, 100000) s(n)
    where not exists (
      select 1 from public.members m
       where m.tessera is not null
         and btrim(m.tessera) ~ '^[0-9]+$'
         and btrim(m.tessera)::int = s.n
    )
    limit 1
  ), '1');
$$;
revoke all on function public.next_tessera() from public, anon;
grant execute on function public.next_tessera() to authenticated;

create or replace function public.members_tessera_trg() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.tessera is not null then
    new.tessera := nullif(btrim(new.tessera), '');
  end if;
  if tg_op = 'INSERT' then
    if new.tessera is null then
      new.tessera := public.next_tessera();
    elsif not public.is_admin() then
      -- i moderatori non scelgono il numero: si assegna il primo libero
      new.tessera := public.next_tessera();
    end if;
  elsif tg_op = 'UPDATE' then
    if new.tessera is distinct from old.tessera and not public.is_admin() then
      raise exception 'Solo un admin può modificare il numero di tessera' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.members_tessera_trg() from public, anon, authenticated;
drop trigger if exists members_tessera_trg on public.members;
create trigger members_tessera_trg before insert or update on public.members
  for each row execute function public.members_tessera_trg();

-- i moderatori possono inserire soci: la tessera la assegna il trigger
drop policy if exists members_mod_insert on public.members;
create policy members_mod_insert on public.members for insert to authenticated
  with check (public.is_moderator() and user_id is null);

-- blocco doppioni nome+cognome (normalizzati, ordine invariante) in registrazione
create or replace function public.member_name_key(n text, c text) returns text
language sql immutable as $$
  select array_to_string(
    array(select x from unnest(string_to_array(
      lower(trim(regexp_replace(extensions.unaccent(coalesce(n,'')||' '||coalesce(c,'')), '\s+', ' ', 'g'))),
      ' '
    )) x where x <> '' order by 1),
    ' '
  );
$$;
revoke all on function public.member_name_key(text,text) from public, anon;
grant execute on function public.member_name_key(text,text) to authenticated;

create or replace function public.members_no_dup_trg() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if exists (
    select 1 from public.members m
     where m.id is distinct from new.id
       and public.member_name_key(m.nome, m.cognome) <> ''
       and public.member_name_key(m.nome, m.cognome) = public.member_name_key(new.nome, new.cognome)
  ) then
    raise exception 'Esiste già un socio con lo stesso nome e cognome' using errcode='23505';
  end if;
  return new;
end $$;
revoke all on function public.members_no_dup_trg() from public, anon, authenticated;
drop trigger if exists members_no_dup_trg on public.members;
create trigger members_no_dup_trg before insert or update of nome, cognome on public.members
  for each row execute function public.members_no_dup_trg();

-- ===== Elimina socio (solo admin) =====
create or replace function public.admin_member_remove_info(p_id text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
  m public.members%rowtype;
  plays_n int; tables_n int; libro_n int;
begin
  if not public.is_admin() then raise exception 'Solo gli admin' using errcode='42501'; end if;
  if p_id is null or p_id !~ '^[A-Za-z0-9_-]{1,64}$' then raise exception 'Socio non valido'; end if;
  select * into m from public.members where id = p_id;
  if not found then raise exception 'Socio non trovato'; end if;
  select count(*) into plays_n from public.plays p
    where exists (select 1 from jsonb_array_elements(coalesce(p.players,'[]'::jsonb)) x where x->>'memberId' = p_id);
  select count(*) into tables_n from public.tables t
    where t.host_id = p_id
       or exists (select 1 from jsonb_array_elements(coalesce(t.players,'[]'::jsonb)) x where x->>'memberId' = p_id);
  select count(*) into libro_n from public.libro_soci s where s.member_id = p_id;
  return jsonb_build_object(
    'id', m.id, 'nome', m.nome, 'cognome', m.cognome,
    'plays', plays_n, 'tables', tables_n, 'libro', libro_n,
    'action', case when plays_n + tables_n + libro_n > 0 then 'deactivate' else 'delete' end
  );
end $$;

create or replace function public.admin_member_remove(p_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare info jsonb;
begin
  if not public.is_admin() then raise exception 'Solo gli admin' using errcode='42501'; end if;
  info := public.admin_member_remove_info(p_id);
  if (info->>'action') = 'deactivate' then
    update public.members set active = false where id = p_id;
  else
    delete from public.member_codes where member_id = p_id;
    delete from public.members where id = p_id;
  end if;
  return info;
end $$;
revoke all on function public.admin_member_remove_info(text), public.admin_member_remove(text) from public, anon;
grant execute on function public.admin_member_remove_info(text), public.admin_member_remove(text) to authenticated;

-- ===== Unione col libro soci (abbinamento tollerante) =====
create or replace function public.libro_match_members(p_nome text, p_cognome text, p_tessera text)
returns table(id text, nome text, cognome text, motivo text)
language sql stable security definer set search_path=public as $$
  select m.id, m.nome, m.cognome,
    case
      when p_tessera is not null and btrim(p_tessera) <> '' and lower(btrim(coalesce(m.tessera,''))) = lower(btrim(p_tessera)) then 'tessera'
      else 'nome'
    end
  from public.members m
  where public.is_staff()
    and (
      (p_tessera is not null and btrim(p_tessera) <> '' and lower(btrim(coalesce(m.tessera,''))) = lower(btrim(p_tessera)))
      or public.member_name_key(m.nome, m.cognome) = public.member_name_key(p_nome, p_cognome)
    )
  order by 4 desc, m.cognome, m.nome;
$$;
revoke all on function public.libro_match_members(text,text,text) from public, anon;
grant execute on function public.libro_match_members(text,text,text) to authenticated;

create or replace function public.libro_soci_link() returns trigger
language plpgsql security definer set search_path=public as $$
declare mid text; n int;
begin
 if tg_op='INSERT' then
  if new.member_id is null then
    -- tessera uguale: un match unico si collega
    if new.numero_tessera is not null and btrim(new.numero_tessera) <> '' then
      select count(*) into n from public.members m
       where lower(btrim(coalesce(m.tessera,''))) = lower(btrim(new.numero_tessera));
      if n = 1 then
        select m.id into mid from public.members m
         where lower(btrim(coalesce(m.tessera,''))) = lower(btrim(new.numero_tessera));
        new.member_id := mid;
      end if;
    end if;
    if new.member_id is null then
      select count(*) into n from public.members m
       where public.member_name_key(m.nome, m.cognome) = public.member_name_key(new.nome, new.cognome);
      if n = 1 then
        select m.id into mid from public.members m
         where public.member_name_key(m.nome, m.cognome) = public.member_name_key(new.nome, new.cognome);
        new.member_id := mid;
      elsif n = 0 then
        mid:=to_hex((extract(epoch from clock_timestamp())*1000)::bigint)||substr(md5(random()::text),1,6);
        insert into public.members(id,nome,cognome,active,tessera)
          values(mid,new.nome,new.cognome,new.data_uscita is null,new.numero_tessera);
        new.member_id:=mid;
        insert into public.libro_audit(user_id,email,action,tabella,record_id,dettaglio)
          values(auth.uid(),auth.jwt()->>'email','create','members',mid,'Creato socio partite da Libro soci: '||new.cognome||' '||new.nome);
      end if;
      -- n>1: ambiguo, non si collega in automatico
    end if;
  end if;
 elsif new.member_id is not null then
  if (new.nome,new.cognome) is distinct from (old.nome,old.cognome) and new.member_id is not distinct from old.member_id then
   update public.members set nome=new.nome,cognome=new.cognome where id=new.member_id;
   insert into public.libro_audit(user_id,email,action,tabella,record_id,dettaglio)
     values(auth.uid(),auth.jwt()->>'email','update','members',new.member_id,'Nome sincronizzato da Libro soci');
  end if;
  if (new.data_uscita is null) is distinct from (old.data_uscita is null) or new.member_id is distinct from old.member_id then
   update public.members set active=(new.data_uscita is null) where id=new.member_id and active is distinct from (new.data_uscita is null);
   if found then insert into public.libro_audit(user_id,email,action,tabella,record_id,dettaglio)
     values(auth.uid(),auth.jwt()->>'email','update','members',new.member_id,case when new.data_uscita is null then 'Socio partite riattivato' else 'Socio partite disattivato (uscita)' end); end if;
  end if;
 end if;
 return new;
end $$;

-- ===== Spiegazione partita =====
alter table public.plays add column if not exists explained_member_id text;
alter table public.plays drop constraint if exists plays_explained_member_id_chk;
alter table public.plays add constraint plays_explained_member_id_chk
  check (explained_member_id is null or explained_member_id ~ '^[A-Za-z0-9_-]{1,64}$');

create or replace function public.plays_explained_trg() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op = 'UPDATE' and new.explained_member_id is not distinct from old.explained_member_id then
    return new;
  end if;
  if (tg_op = 'INSERT' and new.explained_member_id is not null)
     or (tg_op = 'UPDATE' and new.explained_member_id is distinct from old.explained_member_id) then
    if not public.is_staff() then
      if tg_op = 'INSERT' then new.explained_member_id := null;
      else raise exception 'Solo lo staff può indicare chi ha spiegato il gioco' using errcode='42501';
      end if;
    end if;
  end if;
  if new.explained_member_id is not null
     and not exists (
       select 1 from jsonb_array_elements(coalesce(new.players,'[]'::jsonb)) x
        where x->>'memberId' = new.explained_member_id
     ) then
    raise exception 'Chi ha spiegato il gioco deve essere uno dei giocatori';
  end if;
  return new;
end $$;
revoke all on function public.plays_explained_trg() from public, anon, authenticated;
drop trigger if exists plays_explained_trg on public.plays;
create trigger plays_explained_trg before insert or update on public.plays
  for each row execute function public.plays_explained_trg();

-- Residenza dal libro soci (solo staff): indirizzo completo, non solo il comune
create or replace function public.staff_member_residenza(p_member text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r record;
begin
  if p_member is null or p_member !~ '^[A-Za-z0-9_-]{1,64}$' then return null; end if;
  if not public.is_staff() and not exists (
       select 1 from public.members m where m.id = p_member and m.user_id is not null and m.user_id = auth.uid()
     ) then
    raise exception 'Solo lo staff o l''interessato' using errcode='42501';
  end if;
  select s.indirizzo, s.cap, s.comune, s.provincia
    into r
    from public.libro_soci s
   where s.member_id = p_member
   order by s.data_uscita nulls first
   limit 1;
  if not found then return null; end if;
  return jsonb_build_object(
    'indirizzo', r.indirizzo, 'cap', r.cap, 'comune', r.comune, 'provincia', r.provincia
  );
end $$;
revoke all on function public.staff_member_residenza(text) from public, anon;
grant execute on function public.staff_member_residenza(text) to authenticated;

-- XP: i nuovi badge spiegazione entrano nel conteggio badge (+30 ciascuno), con anti-abuso
-- (al massimo 2 spiegazioni al giorno, una per gioco e serata).
create or replace function public.member_xp_base()
 returns table(member_id text, xp integer, level integer, dettaglio jsonb)
 language sql stable security definer set search_path to 'public'
as $function$
with m as (select id,user_id from members where active),
pp as (select p.id play_id,p.game_id,p.date,p.evening,p.coop,p.created_at,p.explained_member_id,x.value v,x.ordinality o
       from plays p cross join lateral jsonb_array_elements(coalesce(p.players,'[]'::jsonb)) with ordinality x),
mine as (select pp.*, pp.v->>'memberId' mid from pp where pp.v->>'memberId' is not null),
st as (select mid,count(distinct play_id) n,count(distinct play_id) filter (where (v->>'winner')::boolean) wins,
       count(distinct play_id) filter (where coop and (v->>'winner')::boolean) coopwins,count(distinct game_id) distinct_g,
       count(distinct date) filter (where extract(dow from date)=4) thu,count(distinct date) filter (where extract(dow from date)=0) sun
       from mine group by mid),
sc as (select pp.*, (pp.v->>'score')::numeric s from pp where not coalesce(pp.coop,false) and pp.v->>'score' ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$'),
best as (select distinct on (game_id) game_id,v->>'memberId' mid from sc order by game_id,s desc,date,created_at,play_id,o),
rec as (select mid,count(*) n from best where mid is not null group by mid),
expl as (select distinct mid from mine join games g on g.id=mine.game_id where g.added_at is not null and (g.added_at at time zone 'UTC')::date=mine.date),
tb as (select t.id,t.date,t.host_id,t.play_id,x->>'memberId' mid from tables t left join lateral jsonb_array_elements(coalesce(t.players,'[]'::jsonb)) x on true),
host as (select host_id mid,count(*) n,count(*) filter (where play_id is not null) played from tables where host_id is not null group by host_id),
ser as (select mid,count(distinct date) n from (select mid,date from mine union select mid,date from tb where mid is not null union select host_id,date from tb where host_id is not null) u group by mid),
ev as (select m.id mid,count(distinct e.evento_id) n from m join evento_pren e on e.presente and e.ospite is null and (e.member_id=m.id or (e.member_id is null and e.user_id=m.user_id)) group by m.id),
rt as (select member_id mid,count(*) n from game_ratings group by member_id),
ex0 as (
  select p.explained_member_id mid, p.date, p.game_id
  from plays p
  where p.explained_member_id is not null
    and exists (select 1 from jsonb_array_elements(coalesce(p.players,'[]'::jsonb)) x where x->>'memberId'=p.explained_member_id)
),
ex1 as (select distinct mid, date, game_id from ex0),
ex2 as (select * from (select ex1.*, row_number() over (partition by mid, date order by game_id) r from ex1) z where r<=2),
exst as (select mid, count(*)::int n, count(distinct game_id)::int dg from ex2 group by mid),
sp as (select p.id play_id,p.date,p.created_at,p.players,s.member_ids,s.pronostico,s.nuovo_per_tutti,
        (select array_agg(x order by x) from unnest(s.member_ids) x) grp
       from plays p join sfide s on s.id=p.sfida_id where not coalesce(p.coop,false)),
g1 as (select * from (select sp.*,row_number() over (partition by date,grp order by created_at,play_id) r from sp) z where r=1),
sm as (select g1.play_id,g1.date,g1.created_at,g1.member_ids,g1.pronostico,g1.nuovo_per_tutti,u.mid,
        coalesce((select bool_or(coalesce((x->>'winner')::boolean,false)) from jsonb_array_elements(g1.players) x where x->>'memberId'=u.mid),false) won
       from g1 cross join lateral unnest(g1.member_ids) u(mid)),
d2 as (select * from (select sm.*,row_number() over (partition by mid,date order by created_at,play_id) rd from sm) z where rd<=2),
sfs as (select z.*, (won and (pronostico->>mid)::numeric=(select min((pronostico->>y)::numeric) from unnest(member_ids) y)
                         and (pronostico->>mid)::numeric<(select max((pronostico->>y)::numeric) from unnest(member_ids) y)) underdog
        from (select d2.*,row_number() over (partition by mid,date_trunc('week',date) order by date,created_at,play_id) rw from d2) z where rw<=10),
pr as (select a.mid,b.mid opp,a.date,a.created_at,a.play_id,a.won aw,b.won bw from sfs a join sm b on b.play_id=a.play_id and b.mid<>a.mid),
riv as (select mid,bool_or(aw and not bw and coalesce(pbw and not paw,false)) r,max(c) rivali from
        (select pr.*,lag(aw) over w paw,lag(bw) over w pbw,count(*) over (partition by mid,opp) c from pr window w as (partition by mid,opp order by date,created_at,play_id)) z group by mid),
sfa as (select mid,count(*) n,count(*) filter (where won) w,count(*) filter (where underdog) u,count(*) filter (where nuovo_per_tutti) nuovi,
        bool_or(cardinality(member_ids)>=5) big from sfs group by mid),
b as (select m.id mid,coalesce(st.n,0) n,coalesce(st.wins,0) wins,coalesce(st.coopwins,0) coopwins,coalesce(st.distinct_g,0) dg,
       coalesce(st.thu,0) thu,coalesce(st.sun,0) sun,coalesce(rec.n,0) recs,coalesce(host.n,0) hosted,coalesce(host.played,0) hplayed,
       (expl.mid is not null) explorer,coalesce(ser.n,0) serate,coalesce(ev.n,0) eventi,coalesce(rt.n,0) rated,
       coalesce(sfa.n,0) sf_n,coalesce(sfa.w,0) sf_w,coalesce(sfa.u,0) sf_u,coalesce(sfa.nuovi,0) sf_nuovi,coalesce(sfa.big,false) sf_big,
       coalesce(riv.r,false) sf_riv,coalesce(riv.rivali,0) sf_rivali,
       coalesce(exst.n,0) expn,coalesce(exst.dg,0) expdg
      from m left join st on st.mid=m.id left join rec on rec.mid=m.id left join host on host.mid=m.id left join expl on expl.mid=m.id
      left join ser on ser.mid=m.id left join ev on ev.mid=m.id left join rt on rt.mid=m.id left join sfa on sfa.mid=m.id left join riv on riv.mid=m.id
      left join exst on exst.mid=m.id),
c as (select b.*, ((n>=1)::int+(wins>=1)::int+(n>=10)::int+(n>=25)::int+(n>=50)::int+(dg>=5)::int+(dg>=10)::int+(dg>=20)::int
       +(thu>=5)::int+(sun>=5)::int+(recs>=1)::int+(coopwins>=5)::int+(hosted>=5)::int+explorer::int+(rated>=10)::int
       +(sf_n>=1)::int+(sf_n>=10)::int+(sf_w>=5)::int+(sf_u>=1)::int+sf_riv::int+(sf_rivali>=5)::int+(sf_nuovi>=3)::int+sf_big::int
       +(expn>=1)::int+(expn>=10)::int+(expn>=25)::int+(expdg>=10)::int) badges from b),
x as (select c.*, (10*n+5*wins+15*serate+25*eventi+20*hplayed+10*dg+30*badges+10*sf_n+5*sf_w+15*sf_u)::int tot from c)
select mid,tot,public.level_for_xp(tot),jsonb_build_object(
 'partite',jsonb_build_array(n,10*n),'vittorie',jsonb_build_array(wins,5*wins),'serate',jsonb_build_array(serate,15*serate),
 'eventi',jsonb_build_array(eventi,25*eventi),'tavoli',jsonb_build_array(hplayed,20*hplayed),'giochi_nuovi',jsonb_build_array(dg,10*dg),
 'badge',jsonb_build_array(badges,30*badges),'sfide',jsonb_build_array(sf_n,10*sf_n),'sfide_vinte',jsonb_build_array(sf_w,5*sf_w),
 'sfavorito',jsonb_build_array(sf_u,15*sf_u)) from x
$function$;
