-- v12: Eventi. Staff (admin+moderatori) gestisce; i soci prenotano solo tramite funzioni (RLS ovunque).
create table if not exists public.eventi(
 id uuid primary key default gen_random_uuid(),
 titolo text not null check (length(titolo) between 1 and 120),
 descrizione text, luogo text,
 inizio timestamptz not null, chiusura timestamptz not null,
 immagine text check (immagine is null or immagine ~ '^https://'),
 posti int not null check (posti between 1 and 1000),
 solo_soci boolean not null default false,
 ospiti boolean not null default false,
 quota numeric(8,2) check (quota is null or quota>=0),
 caparra numeric(8,2) check (caparra is null or caparra>=0),
 torneo boolean not null default false,
 annullato boolean not null default false,
 created_by uuid default auth.uid(), created_at timestamptz default now(),
 check (chiusura<=inizio));
create table if not exists public.evento_pren(
 id uuid primary key default gen_random_uuid(),
 evento_id uuid not null references public.eventi(id) on delete cascade,
 user_id uuid not null, member_id text references public.members(id) on delete set null,
 ospite text check (ospite is null or length(ospite) between 1 and 80),
 stato text not null check (stato in ('confermata','in_attesa_conferma','attesa','annullata','rifiutata')),
 presente boolean not null default false,
 caparra_importo numeric(8,2), caparra_da text, caparra_at timestamptz,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz default now());
create unique index if not exists evento_pren_uno on public.evento_pren(evento_id,user_id) where stato in ('confermata','in_attesa_conferma','attesa');
create table if not exists public.evento_audit(
 id bigserial primary key, at timestamptz default now(), chi text, azione text not null,
 evento_id uuid, pren_id uuid, dettagli jsonb);

alter table public.eventi enable row level security;
alter table public.evento_pren enable row level security;
alter table public.evento_audit enable row level security;
drop policy if exists eventi_read on public.eventi; drop policy if exists eventi_staff on public.eventi;
-- archivio (eventi passati) solo per lo staff; gli altri vedono eventi futuri o in corso (fino a 12 ore dall'inizio)
create policy eventi_read on public.eventi for select to authenticated using (public.is_staff() or inizio>now()-interval '12 hours');
create policy eventi_staff on public.eventi for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists pren_read on public.evento_pren;
create policy pren_read on public.evento_pren for select to authenticated using (public.is_staff() or user_id=auth.uid());
drop policy if exists audit_read on public.evento_audit;
create policy audit_read on public.evento_audit for select to authenticated using (public.is_staff());
revoke insert,update,delete on public.evento_pren, public.evento_audit from anon, authenticated;
revoke all on public.eventi from anon; revoke all on public.evento_pren from anon;

-- data nel passato non ammessa (nuovo evento o data cambiata)
create or replace function public.eventi_guard() returns trigger language plpgsql as $$
begin
 if (tg_op='INSERT' or new.inizio is distinct from old.inizio) and new.inizio<now() then
  raise exception 'La data dell''evento non può essere nel passato' using errcode='22023'; end if;
 if tg_op='INSERT' then new.created_by:=auth.uid(); end if;
 return new; end $$;
drop trigger if exists eventi_guard on public.eventi;
create trigger eventi_guard before insert or update on public.eventi for each row execute function public.eventi_guard();

create or replace function public.ev_log(a text,e uuid,p uuid,d jsonb) returns void language sql security definer set search_path=public as $$
 insert into public.evento_audit(chi,azione,evento_id,pren_id,dettagli) values(coalesce(auth.jwt()->>'email','sistema'),a,e,p,d) $$;
revoke all on function public.ev_log(text,uuid,uuid,jsonb) from public, anon, authenticated;

-- posti occupati: confermate + in attesa di conferma (ospite = 1 posto in più)
create or replace function public.ev_occupati(e uuid) returns int language sql stable security definer set search_path=public as $$
 select coalesce(sum(1+(ospite is not null)::int),0)::int from public.evento_pren where evento_id=e and stato in ('confermata','in_attesa_conferma') $$;

create or replace function public.socio_in_regola(m text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.libro_soci where member_id=m and data_uscita is null and stato_quote='in_regola') $$;
revoke all on function public.socio_in_regola(text) from public, anon, authenticated;

-- promozione dalla lista d'attesa, nell'ordine di prenotazione
create or replace function public.ev_promuovi(e uuid) returns void language plpgsql security definer set search_path=public as $$
declare ev public.eventi; r record;
begin
 select * into ev from public.eventi where id=e for update; if ev.annullato then return; end if;
 for r in select * from public.evento_pren where evento_id=e and stato='attesa' order by created_at loop
  exit when public.ev_occupati(e)+1+(r.ospite is not null)::int>ev.posti;
  update public.evento_pren set stato=case when coalesce(ev.quota,0)>0 or coalesce(ev.caparra,0)>0 then 'in_attesa_conferma' else 'confermata' end, updated_at=now() where id=r.id;
  perform public.ev_log('promossa_da_attesa',e,r.id,null);
 end loop; end $$;
revoke all on function public.ev_promuovi(uuid) from public, anon, authenticated;

create or replace function public.ev_pren_trg() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.stato in ('confermata','in_attesa_conferma','attesa') and new.stato in ('annullata','rifiutata') then perform public.ev_promuovi(new.evento_id); end if;
 return null; end $$;
drop trigger if exists ev_pren_trg on public.evento_pren;
create trigger ev_pren_trg after update of stato on public.evento_pren for each row execute function public.ev_pren_trg();

-- prenotazione (un tocco). Ritorna lo stato ottenuto.
create or replace function public.evento_prenota(p_evento uuid,p_ospite text default null) returns text language plpgsql security definer set search_path=public as $$
declare ev public.eventi; m text; st text; pid uuid; g text:=nullif(trim(p_ospite),'');
begin
 if auth.uid() is null then raise exception 'Accesso richiesto' using errcode='42501'; end if;
 select * into ev from public.eventi where id=p_evento for update;
 if not found or ev.annullato then raise exception 'Evento non disponibile' using errcode='22023'; end if;
 if now()>ev.chiusura then raise exception 'Prenotazioni chiuse' using errcode='22023'; end if;
 select id into m from public.members where user_id=auth.uid() limit 1;
 if ev.solo_soci and (m is null or not public.socio_in_regola(m)) then raise exception 'Evento riservato ai soci in regola con la quota' using errcode='42501'; end if;
 if g is not null and not ev.ospiti then raise exception 'Ospiti non ammessi' using errcode='22023'; end if;
 if exists(select 1 from public.evento_pren where evento_id=p_evento and user_id=auth.uid() and stato in ('confermata','in_attesa_conferma','attesa')) then raise exception 'Sei già prenotato' using errcode='23505'; end if;
 if exists(select 1 from public.evento_pren where evento_id=p_evento and stato='attesa') or public.ev_occupati(p_evento)+1+(g is not null)::int>ev.posti then st:='attesa';
 elsif coalesce(ev.quota,0)>0 or coalesce(ev.caparra,0)>0 then st:='in_attesa_conferma'; else st:='confermata'; end if;
 insert into public.evento_pren(evento_id,user_id,member_id,ospite,stato) values(p_evento,auth.uid(),m,g,st) returning id into pid;
 return st; end $$;

create or replace function public.evento_annulla(p_evento uuid) returns void language plpgsql security definer set search_path=public as $$
declare ev public.eventi;
begin
 select * into ev from public.eventi where id=p_evento;
 if not found then raise exception 'Evento non trovato'; end if;
 if now()>ev.chiusura then raise exception 'Prenotazioni chiuse: non è più possibile annullare' using errcode='22023'; end if;
 update public.evento_pren set stato='annullata',updated_at=now() where evento_id=p_evento and user_id=auth.uid() and stato in ('confermata','in_attesa_conferma','attesa');
 if not found then raise exception 'Nessuna prenotazione da annullare'; end if; end $$;

-- azioni staff (tutte nel registro)
create or replace function public.evento_staff(p_pren uuid,p_azione text,p_importo numeric default null,p_presente boolean default null) returns void language plpgsql security definer set search_path=public as $$
declare r public.evento_pren;
begin
 if not public.is_staff() then raise exception 'Solo admin e moderatori' using errcode='42501'; end if;
 select * into r from public.evento_pren where id=p_pren for update; if not found then raise exception 'Prenotazione non trovata'; end if;
 if p_azione='conferma_caparra' then
  if r.stato<>'in_attesa_conferma' then raise exception 'La prenotazione non è in attesa di conferma'; end if;
  if p_importo is null or p_importo<0 then raise exception 'Importo non valido'; end if;
  update public.evento_pren set stato='confermata',caparra_importo=p_importo,caparra_da=coalesce(auth.jwt()->>'email','staff'),caparra_at=now(),updated_at=now() where id=p_pren;
  perform public.ev_log('caparra_confermata',r.evento_id,p_pren,jsonb_build_object('importo',p_importo));
 elsif p_azione='rifiuta' then
  if r.stato not in ('confermata','in_attesa_conferma','attesa') then raise exception 'Prenotazione già chiusa'; end if;
  update public.evento_pren set stato='rifiutata',updated_at=now() where id=p_pren;
  perform public.ev_log('prenotazione_annullata_staff',r.evento_id,p_pren,jsonb_build_object('stato_prima',r.stato));
 elsif p_azione='presente' then
  update public.evento_pren set presente=coalesce(p_presente,true),updated_at=now() where id=p_pren;
  perform public.ev_log(case when coalesce(p_presente,true) then 'presente' else 'assente' end,r.evento_id,p_pren,null);
 else raise exception 'Azione sconosciuta'; end if; end $$;

-- conteggi pubblici e nomi dei partecipanti (stessi dati già visibili nei profili: nome, cognome, soprannome)
create or replace function public.evento_info(p_evento uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select case when exists(select 1 from public.eventi where id=p_evento and (public.is_staff() or inizio>now()-interval '12 hours')) then jsonb_build_object(
  'occupati',public.ev_occupati(p_evento),
  'attesa',(select count(*) from public.evento_pren where evento_id=p_evento and stato='attesa'),
  'presenti',(select count(*)+count(ospite) from public.evento_pren where evento_id=p_evento and presente),
  'nomi',coalesce((select jsonb_agg(jsonb_build_object('member_id',p.member_id,'ospite',p.ospite is not null) order by p.created_at) from public.evento_pren p where p.evento_id=p_evento and p.stato in ('confermata','in_attesa_conferma')),'[]'::jsonb)) end $$;

-- I miei eventi: badge "Presente a 5 eventi" / "Torneista" contano solo le presenze segnate dallo staff
create or replace function public.evento_presenze(p_member text) returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('eventi',count(*),'tornei',count(*) filter (where e.torneo)) from public.evento_pren p join public.eventi e on e.id=p.evento_id where p.member_id=p_member and p.presente $$;

revoke all on function public.evento_prenota(uuid,text), public.evento_annulla(uuid), public.evento_staff(uuid,text,numeric,boolean), public.evento_info(uuid), public.evento_presenze(text), public.ev_occupati(uuid) from public, anon;
grant execute on function public.evento_prenota(uuid,text), public.evento_annulla(uuid), public.evento_staff(uuid,text,numeric,boolean), public.evento_info(uuid), public.evento_presenze(text), public.ev_occupati(uuid) to authenticated;
grant select on public.eventi, public.evento_pren, public.evento_audit to authenticated;
grant insert,update,delete on public.eventi to authenticated;
