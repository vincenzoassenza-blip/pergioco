-- v36 — "Lista desideri": i soci propongono giochi da BGG (una proposta attiva a testa) e votano 👍 entro un periodo di votazione (scadenza facoltativa).
-- Tutte le scritture passano da RPC SECURITY DEFINER; i voti altrui non sono leggibili (solo conteggi).
create table if not exists public.desideri_periodi(
 id uuid primary key default gen_random_uuid(), inizio timestamptz not null default now(), fine timestamptz,
 chiuso_at timestamptz, vincitore uuid, voti_vincitore integer, aperto_da uuid,
 constraint dp_fine check(fine is null or fine>inizio));
create unique index if not exists dp_uno_aperto on public.desideri_periodi((true)) where chiuso_at is null;
create table if not exists public.desideri(
 id uuid primary key default gen_random_uuid(),
 bgg_id integer not null check(bgg_id between 1 and 99999999),
 nome text not null check(char_length(btrim(nome)) between 1 and 120 and nome !~ '[<>]'),
 thumb text check(thumb is null or (char_length(thumb)<=400 and thumb ~ '^https://cf\.geekdo-images\.com/[A-Za-z0-9_./%=:-]+$')),
 min_p smallint check(min_p between 1 and 20), max_p smallint check(max_p between 1 and 30), durata smallint check(durata between 1 and 1440),
 anno smallint check(anno between 1800 and 2100), peso numeric(3,2) check(peso between 1 and 5),
 categorie text[] not null default '{}' check(cardinality(categorie)<=10 and array_position(categorie,null) is null),
 perche text check(perche is null or char_length(perche)<=200),
 proposto_da text not null references public.members(id) on delete cascade,
 stato text not null default 'proposto' check(stato in ('proposto','valutazione','ordinato','arrivato','archiviato')),
 game_id text references public.games(id) on delete set null,
 created_at timestamptz not null default now(), aggiornato_at timestamptz not null default now(),
 constraint des_minmax check(min_p is null or max_p is null or min_p<=max_p));
-- una sola proposta attiva per socio; nessun doppione attivo dello stesso gioco BGG
create unique index if not exists des_una_attiva on public.desideri(proposto_da) where stato in ('proposto','valutazione','ordinato');
create unique index if not exists des_bgg_unico on public.desideri(bgg_id) where stato<>'archiviato';
create table if not exists public.desideri_voti(
 periodo_id uuid not null references public.desideri_periodi(id) on delete cascade,
 desiderio_id uuid not null references public.desideri(id) on delete cascade,
 member_id text not null references public.members(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(periodo_id,desiderio_id,member_id));
create table if not exists public.desideri_spiego(
 desiderio_id uuid not null references public.desideri(id) on delete cascade,
 member_id text not null references public.members(id) on delete cascade, primary key(desiderio_id,member_id));
alter table public.desideri_periodi drop constraint if exists dp_vinc;
alter table public.desideri_periodi add constraint dp_vinc foreign key(vincitore) references public.desideri(id) on delete set null;

alter table public.desideri enable row level security; alter table public.desideri_voti enable row level security;
alter table public.desideri_spiego enable row level security; alter table public.desideri_periodi enable row level security;
revoke all on public.desideri,public.desideri_voti,public.desideri_spiego,public.desideri_periodi from public,anon,authenticated;
-- lettura diretta: proposte e periodi per i soci; i voti/“lo spiego io” SOLO i propri
grant select on public.desideri,public.desideri_periodi,public.desideri_voti,public.desideri_spiego to authenticated;
drop policy if exists des_read on public.desideri; create policy des_read on public.desideri for select to authenticated using (exists(select m.id from public.members m where m.user_id=auth.uid() and m.user_id is not null and m.active) or public.is_staff());
drop policy if exists dp_read on public.desideri_periodi; create policy dp_read on public.desideri_periodi for select to authenticated using (exists(select m.id from public.members m where m.user_id=auth.uid() and m.user_id is not null and m.active) or public.is_staff());
drop policy if exists dv_read on public.desideri_voti; create policy dv_read on public.desideri_voti for select to authenticated using (member_id in (select m.id from public.members m where m.user_id=auth.uid() and m.user_id is not null and m.active));
drop policy if exists ds_read on public.desideri_spiego; create policy ds_read on public.desideri_spiego for select to authenticated using (member_id in (select m.id from public.members m where m.user_id=auth.uid() and m.user_id is not null and m.active));

-- chiude i periodi scaduti calcolando il vincitore (più voti; a parità la proposta più vecchia)
create or replace function public.des_chiudi_scaduti(p_forza boolean default false) returns void language plpgsql security definer set search_path=public as $$
declare r desideri_periodi; w record; begin
 for r in select * from desideri_periodi where chiuso_at is null and (p_forza or (fine is not null and fine<=now())) for update loop
  select d.id,count(*)::int n into w from desideri_voti v join desideri d on d.id=v.desiderio_id where v.periodo_id=r.id group by d.id,d.created_at order by count(*) desc,d.created_at limit 1;
  update desideri_periodi set chiuso_at=least(now(),coalesce(fine,now())),vincitore=w.id,voti_vincitore=coalesce(w.n,0) where id=r.id;
 end loop; end $$;

create or replace function public.des_lista() returns jsonb language plpgsql security definer set search_path=public as $$
declare me text:=public.cp_me(); st boolean:=public.is_staff(); pa desideri_periodi; pc desideri_periodi; pv uuid; begin
 if me is null and not st then raise exception 'Solo per i soci'; end if;
 perform public.des_chiudi_scaduti(false);
 select * into pa from desideri_periodi where chiuso_at is null limit 1;
 select * into pc from desideri_periodi where chiuso_at is not null order by chiuso_at desc limit 1;
 pv:=coalesce(pa.id,pc.id);
 return jsonb_build_object('me',me,'staff',st,
  'periodo',case when pa.id is null then null else jsonb_build_object('id',pa.id,'inizio',pa.inizio,'fine',pa.fine) end,
  'ultimo',case when pc.id is null then null else jsonb_build_object('id',pc.id,'inizio',pc.inizio,'chiuso',pc.chiuso_at,'vincitore',pc.vincitore,'voti',pc.voti_vincitore,
     'nome',(select nome from desideri where id=pc.vincitore)) end,
  'desideri',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'bgg_id',d.bgg_id,'nome',d.nome,'thumb',d.thumb,'min',d.min_p,'max',d.max_p,'durata',d.durata,'anno',d.anno,'peso',d.peso,
     'cat',to_jsonb(d.categorie),'perche',d.perche,'da',d.proposto_da,'stato',d.stato,'game_id',d.game_id,'creato',d.created_at,
     'voti',(select count(*) from desideri_voti v where v.desiderio_id=d.id and v.periodo_id=pv),
     'spiego',(select count(*) from desideri_spiego s where s.desiderio_id=d.id),
     'mio',exists(select 1 from desideri_voti v where v.desiderio_id=d.id and v.periodo_id=pa.id and v.member_id=me),
     'mio_sp',exists(select 1 from desideri_spiego s where s.desiderio_id=d.id and s.member_id=me)) order by d.created_at desc)
    from desideri d where d.stato<>'archiviato' or st),'[]'),
  'scout',coalesce((select jsonb_agg(proposto_da) from desideri where stato='arrivato'),'[]')); end $$;

create or replace function public.des_proponi(p jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare me text:=public.cp_me(); b int; n text; th text; c text[]; i uuid; pr text; begin
 if me is null then raise exception 'Per proporre un gioco il tuo account deve essere collegato a un socio'; end if;
 if p is null or jsonb_typeof(p)<>'object' or octet_length(p::text)>3000 then raise exception 'Dati non validi'; end if;
 b:=case when jsonb_typeof(p->'bgg_id')='number' then (p->>'bgg_id')::numeric::int end;
 if b is null or b<1 or b>99999999 then raise exception 'Gioco BGG non valido'; end if;
 n:=btrim(regexp_replace(coalesce(p->>'nome',''),'[\u0000-\u001f<>]','','g'));
 if char_length(n) not between 1 and 120 then raise exception 'Nome non valido'; end if;
 th:=nullif(p->>'thumb',''); if th is not null and (char_length(th)>400 or th !~ '^https://cf\.geekdo-images\.com/[A-Za-z0-9_./%=:-]+$') then th:=null; end if;
 select coalesce(array_agg(x),'{}') into c from (select left(btrim(regexp_replace(e,'[\u0000-\u001f<>]','','g')),40) x from jsonb_array_elements_text(case when jsonb_typeof(p->'cat')='array' then p->'cat' else '[]' end) e limit 10) s where x<>'';
 pr:=nullif(btrim(regexp_replace(coalesce(p->>'perche',''),'[\u0000-\u0009\u000b-\u001f]','','g')),'');
 if char_length(pr)>200 then raise exception 'Il "perché" può avere al massimo 200 caratteri'; end if;
 if exists(select 1 from desideri where proposto_da=me and stato in ('proposto','valutazione','ordinato')) then raise exception 'Hai già una proposta attiva: puoi proporne un''altra quando la tua arriva o viene archiviata'; end if;
 if exists(select 1 from games where bgg_id=b or lower(btrim(name))=lower(n)) then raise exception 'Questo gioco è già in ludoteca'; end if;
 if exists(select 1 from desideri where bgg_id=b and stato<>'archiviato') then raise exception 'Questo gioco è già nella lista desideri'; end if;
 insert into desideri(bgg_id,nome,thumb,min_p,max_p,durata,anno,peso,categorie,perche,proposto_da) values(b,n,th,
  case when (p->>'min') ~ '^\d{1,2}$' and (p->>'min')::int between 1 and 20 then (p->>'min')::int end,
  case when (p->>'max') ~ '^\d{1,2}$' and (p->>'max')::int between 1 and 30 then (p->>'max')::int end,
  case when (p->>'durata') ~ '^\d{1,4}$' and (p->>'durata')::int between 1 and 1440 then (p->>'durata')::int end,
  case when (p->>'anno') ~ '^\d{4}$' and (p->>'anno')::int between 1800 and 2100 then (p->>'anno')::int end,
  case when (p->>'peso') ~ '^\d(\.\d+)?$' and (p->>'peso')::numeric between 1 and 5 then round((p->>'peso')::numeric,2) end,c,pr,me) returning id into i;
 if (select min_p>max_p from desideri where id=i) then update desideri set max_p=min_p where id=i; end if;
 return i; end $$;

create or replace function public.des_ritira(p uuid) returns void language plpgsql security definer set search_path=public as $$
begin if not exists(select 1 from desideri where id=p and proposto_da=public.cp_me() and stato='proposto') then raise exception 'Puoi ritirare solo la tua proposta finché è in stato Proposto'; end if;
 delete from desideri where id=p; end $$;

create or replace function public.des_vota(p uuid,p_on boolean) returns void language plpgsql security definer set search_path=public as $$
declare me text:=public.cp_me(); pa uuid; begin
 if me is null then raise exception 'Solo i soci possono votare'; end if;
 perform public.des_chiudi_scaduti(false);
 select id into pa from desideri_periodi where chiuso_at is null; if pa is null then raise exception 'La votazione è chiusa'; end if;
 if not exists(select 1 from desideri where id=p and stato in ('proposto','valutazione')) then raise exception 'Questa proposta non si può votare'; end if;
 if p_on then insert into desideri_voti(periodo_id,desiderio_id,member_id) values(pa,p,me) on conflict do nothing;
 else delete from desideri_voti where periodo_id=pa and desiderio_id=p and member_id=me; end if; end $$;

create or replace function public.des_spiego(p uuid,p_on boolean) returns void language plpgsql security definer set search_path=public as $$
declare me text:=public.cp_me(); begin if me is null then raise exception 'Solo i soci'; end if;
 if not exists(select 1 from desideri where id=p and stato<>'archiviato') then raise exception 'Proposta non trovata'; end if;
 if p_on then insert into desideri_spiego values(p,me) on conflict do nothing; else delete from desideri_spiego where desiderio_id=p and member_id=me; end if; end $$;

create or replace function public.des_stato(p uuid,p_stato text) returns void language plpgsql security definer set search_path=public as $$
begin if not public.is_staff() then raise exception 'Solo staff'; end if;
 if p_stato is null or p_stato not in ('proposto','valutazione','ordinato','arrivato','archiviato') then raise exception 'Stato non valido'; end if;
 update desideri set stato=p_stato,aggiornato_at=now() where id=p; if not found then raise exception 'Proposta non trovata'; end if; end $$;

create or replace function public.des_elimina(p uuid) returns void language plpgsql security definer set search_path=public as $$
begin if not public.is_staff() then raise exception 'Solo staff'; end if; delete from desideri where id=p; end $$;

-- collega la proposta arrivata al gioco aggiunto in ludoteca
create or replace function public.des_collega(p uuid,p_game text) returns void language plpgsql security definer set search_path=public as $$
begin if not public.is_staff() then raise exception 'Solo staff'; end if;
 if not exists(select 1 from games where id=p_game) then raise exception 'Gioco non trovato'; end if;
 update desideri set game_id=p_game,stato='arrivato',aggiornato_at=now() where id=p; if not found then raise exception 'Proposta non trovata'; end if; end $$;

-- periodo di votazione: p_fine null = senza scadenza (si chiude a mano)
create or replace function public.des_periodo(p_azione text,p_fine timestamptz default null) returns void language plpgsql security definer set search_path=public as $$
begin if not public.is_staff() then raise exception 'Solo staff'; end if;
 perform public.des_chiudi_scaduti(false);
 if p_azione='apri' then
  if exists(select 1 from desideri_periodi where chiuso_at is null) then raise exception 'C''è già una votazione aperta'; end if;
  if p_fine is not null and (p_fine<=now() or p_fine>now()+interval '366 days') then raise exception 'Scadenza non valida (futura, entro un anno)'; end if;
  insert into desideri_periodi(fine,aperto_da) values(p_fine,auth.uid());
 elsif p_azione='scadenza' then
  if p_fine is not null and (p_fine<=now() or p_fine>now()+interval '366 days') then raise exception 'Scadenza non valida (futura, entro un anno)'; end if;
  update desideri_periodi set fine=p_fine where chiuso_at is null; if not found then raise exception 'Nessuna votazione aperta'; end if;
 elsif p_azione='chiudi' then
  if not exists(select 1 from desideri_periodi where chiuso_at is null) then raise exception 'Nessuna votazione aperta'; end if;
  perform public.des_chiudi_scaduti(true);
 else raise exception 'Azione non valida'; end if; end $$;

-- EXP: +40 a chi propone un gioco poi Arrivato, badge "Talent scout" (+100, una volta)
do $$ begin if to_regprocedure('public.member_xp_cp()') is null then alter function public.member_xp() rename to member_xp_cp; end if; end $$;
create or replace function public.member_xp() returns table(member_id text, xp integer, level integer, dettaglio jsonb)
 language sql stable security definer set search_path to 'public' as $$
with b as (select * from public.member_xp_cp()),
s as (select proposto_da mid,count(*)::int n from desideri where stato='arrivato' group by 1),
x as (select b.*,s.n,(b.xp+coalesce(40*s.n+100,0))::int tot from b left join s on s.mid=b.member_id)
select member_id,tot,case when n is null then level else public.level_for_xp(tot) end,
 case when n is null then dettaglio else dettaglio||jsonb_build_object('scout',jsonb_build_array(n,40*n),
  'badge',jsonb_build_array(coalesce((dettaglio->'badge'->>0)::int,0)+1,coalesce((dettaglio->'badge'->>1)::int,0)+100)) end
from x $$;

do $$declare f record; t text; begin
 for f in select p.oid::regprocedure s from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
   and (p.proname like 'des\_%' or p.proname in ('member_xp','member_xp_cp')) loop
  execute format('revoke all on function %s from public,anon,authenticated',f.s); end loop;
 foreach t in array array['des_lista()','des_proponi(jsonb)','des_ritira(uuid)','des_vota(uuid,boolean)','des_spiego(uuid,boolean)','des_stato(uuid,text)','des_elimina(uuid)','des_collega(uuid,text)','des_periodo(text,timestamptz)','member_xp()'] loop
  execute 'grant execute on function public.'||t||' to authenticated'; end loop; end$$;
