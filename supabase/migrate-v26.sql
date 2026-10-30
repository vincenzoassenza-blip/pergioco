-- v26: "La Sfida di Antero" — torneo tra meccaniche (solo admin).
-- Applicare con: SQL editor Supabase (SOLO dopo conferma di Vincenzo). Idempotente.
create table if not exists public.antero_meccaniche(
 id bigint generated always as identity primary key,
 nome text not null check (nome = btrim(nome) and char_length(nome) between 1 and 40 and nome !~ '[<>"`\\{}]' and nome !~ '[[:cntrl:]]' and upper(nome) <> 'ANTERO'),
 emoji text check (emoji is null or (char_length(emoji) between 1 and 8 and emoji !~ '[<>"`\\{}[:alnum:][:space:]]')),
 attiva boolean not null default true,
 ordine integer not null default 0 check (ordine between 0 and 100000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now());
create unique index if not exists antero_meccaniche_nome_uq on public.antero_meccaniche(lower(nome));

create table if not exists public.antero_albo(
 id bigint generated always as identity primary key,
 meccanica_id bigint references public.antero_meccaniche(id) on delete set null,
 nome text not null check (char_length(nome) between 1 and 40),
 emoji text check (emoji is null or char_length(emoji) <= 8),
 santificata boolean not null default false,
 scelte smallint not null default 0 check (scelte between 0 and 1000),
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now());
create index if not exists antero_albo_created_idx on public.antero_albo(created_at desc);

-- normalizza (trim, spazi multipli) prima dei CHECK; aggiorna updated_at
create or replace function public.antero_mecc_norm() returns trigger language plpgsql set search_path=public as $$
begin new.nome = regexp_replace(btrim(new.nome), '\s+', ' ', 'g'); if new.emoji is not null then new.emoji = nullif(btrim(new.emoji),''); end if; new.updated_at = now(); return new; end $$;
drop trigger if exists antero_mecc_norm on public.antero_meccaniche;
create trigger antero_mecc_norm before insert or update on public.antero_meccaniche for each row execute function public.antero_mecc_norm();
-- l'albo d'oro: il nome viene sempre copiato dalla meccanica (niente testo libero dal client); tenute al massimo 5 anteri (25) righe
create or replace function public.antero_albo_fill() returns trigger language plpgsql set search_path=public as $$
begin
 select m.nome, m.emoji into new.nome, new.emoji from public.antero_meccaniche m where m.id = new.meccanica_id;
 if new.nome is null then raise exception 'Errore antero: meccanica inesistente'; end if;
 new.created_by = auth.uid(); new.created_at = now(); return new; end $$;
drop trigger if exists antero_albo_fill on public.antero_albo;
create trigger antero_albo_fill before insert on public.antero_albo for each row execute function public.antero_albo_fill();
create or replace function public.antero_albo_trim() returns trigger language plpgsql security definer set search_path=public as $$
begin delete from public.antero_albo where id in (select id from public.antero_albo order by created_at desc, id desc offset 25); return null; end $$;
revoke all on function public.antero_albo_trim() from public, anon, authenticated;
drop trigger if exists antero_albo_trim on public.antero_albo;
create trigger antero_albo_trim after insert on public.antero_albo for each statement execute function public.antero_albo_trim();

-- RLS: lettura e scrittura solo admin
alter table public.antero_meccaniche enable row level security;
alter table public.antero_albo enable row level security;
revoke all on public.antero_meccaniche, public.antero_albo from anon, public;
grant select, insert, update, delete on public.antero_meccaniche to authenticated;
grant select, insert, delete on public.antero_albo to authenticated;
drop policy if exists antero_mecc_admin on public.antero_meccaniche;
create policy antero_mecc_admin on public.antero_meccaniche for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists antero_albo_admin on public.antero_albo;
create policy antero_albo_admin on public.antero_albo for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- seed iniziale
insert into public.antero_meccaniche(nome,emoji,ordine) values
 ('Deckbuilding','🃏',1),('Piazzamento Lavoratori','👷',2),('Piazzamento Tessere','🧩',3),('Wargame','⚔️',4),
 ('Piazzamento Dadi','🎲',5),('Azionario','📈',6),('Scacchistico','♟️',7),('Controllo Territorio','🗺️',8),
 ('Aste','🔨',9),('Line Battler','🛡️',10),('Carte','🂡',11),('Selezione Azioni','🎯',12)
on conflict do nothing;
