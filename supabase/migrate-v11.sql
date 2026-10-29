-- v11: Libro soci, Libro volontari (CTS art. 15), quote, audit log. Solo is_admin() (non moderatori).
create table if not exists public.libro_soci(
 id uuid primary key default gen_random_uuid(),
 nome text not null, cognome text not null,
 data_nascita date, luogo_nascita text,
 codice_fiscale text unique check (codice_fiscale is null or codice_fiscale ~ '^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPR-T][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$'),
 indirizzo text, comune text, cap text check (cap is null or cap ~ '^[0-9]{5}$'), provincia text check (provincia is null or provincia ~ '^[A-Z]{2}$'),
 data_ammissione date, numero_tessera text unique,
 data_uscita date, motivo_uscita text,
 member_id text references public.members(id) on delete set null,
 created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists public.libro_quote(
 id uuid primary key default gen_random_uuid(),
 socio_id uuid not null references public.libro_soci(id) on delete cascade,
 anno int not null check (anno between 2000 and 2100), data_pagamento date, importo numeric(8,2) check (importo>=0),
 created_at timestamptz default now(), unique(socio_id,anno));
create table if not exists public.libro_volontari(
 id uuid primary key default gen_random_uuid(),
 nome text not null, cognome text not null,
 codice_fiscale text unique check (codice_fiscale is null or codice_fiscale ~ '^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPR-T][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$'),
 data_inizio date, data_fine date, attivita text, assicurazione text,
 socio_id uuid references public.libro_soci(id) on delete set null,
 created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists public.libro_audit(
 id bigserial primary key, at timestamptz not null default now(),
 user_id uuid, email text, action text not null check (action in ('create','update','delete','export','import')),
 tabella text not null, record_id text, dettaglio text);

do $$ declare t text; begin
 foreach t in array array['libro_soci','libro_quote','libro_volontari','libro_audit'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('alter table public.%I force row level security',t);
  execute format('revoke all on public.%I from anon, public',t);
  execute format('drop policy if exists %I on public.%I',t||'_admin',t);
 end loop;
 foreach t in array array['libro_soci','libro_quote','libro_volontari'] loop
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',t||'_admin',t);
 end loop;
end $$;
revoke all on public.libro_audit from authenticated;
grant select on public.libro_audit to authenticated;
create policy libro_audit_admin on public.libro_audit for select to authenticated using (public.is_admin());

create or replace function public.libro_audit_trg() returns trigger language plpgsql security definer set search_path=public as $$
declare r record; d text;
begin
 if tg_op='DELETE' then r:=old; else r:=new; end if;
 if tg_table_name='libro_quote' then d:='socio '||r.socio_id||' anno '||r.anno; else d:=r.cognome||' '||r.nome; end if;
 if tg_op='UPDATE' and tg_table_name<>'libro_quote' then new.updated_at:=now(); end if;
 insert into public.libro_audit(user_id,email,action,tabella,record_id,dettaglio)
 values(auth.uid(),auth.jwt()->>'email',case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'update' else 'delete' end,tg_table_name,r.id::text,d);
 if tg_op='DELETE' then return old; end if; return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['libro_soci','libro_quote','libro_volontari'] loop
  execute format('drop trigger if exists %I on public.%I',t||'_audit',t);
  execute format('create trigger %I before insert or update or delete on public.%I for each row execute function public.libro_audit_trg()',t||'_audit',t);
 end loop; end $$;

-- log esplicito per export/import (solo admin)
create or replace function public.libro_log(p_action text,p_tabella text,p_dettaglio text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Solo admin'; end if;
 if p_action not in ('export','import') or p_tabella not in ('libro_soci','libro_volontari') then raise exception 'Azione non valida'; end if;
 insert into public.libro_audit(user_id,email,action,tabella,dettaglio) values(auth.uid(),auth.jwt()->>'email',p_action,p_tabella,left(p_dettaglio,500));
end $$;
revoke all on function public.libro_log(text,text,text) from public, anon;
grant execute on function public.libro_log(text,text,text) to authenticated;
revoke all on function public.libro_audit_trg() from public, anon, authenticated;

-- stato quote (import Excel)
alter table public.libro_soci add column if not exists stato_quote text not null default 'in_regola' check (stato_quote in ('in_regola','non_in_regola'));

-- report discrepanze ultimo import (solo admin)
create table if not exists public.libro_import_report(id bigserial primary key, at timestamptz default now(), email text default (auth.jwt()->>'email'), tabella text not null, report jsonb not null);
alter table public.libro_import_report enable row level security; alter table public.libro_import_report force row level security;
revoke all on public.libro_import_report from anon, public; grant select,insert,delete on public.libro_import_report to authenticated; grant usage on sequence public.libro_import_report_id_seq to authenticated;
drop policy if exists libro_import_report_admin on public.libro_import_report;
create policy libro_import_report_admin on public.libro_import_report for all to authenticated using (public.is_admin()) with check (public.is_admin());
