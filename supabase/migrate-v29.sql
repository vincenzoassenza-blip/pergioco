-- v29 — Sfida equilibrata: profilo di gioco per socio (risposte alle domande "pochi dati").
-- Idempotente. Lettura: autenticati. Insert/update: autenticati (chi organizza la sfida compila per i soci presenti) e staff. Delete: solo staff.
create or replace function public.pg_valid_game_ids(a text[]) returns boolean language sql immutable as $$
  select a is not null and coalesce(array_length(a,1),0)<=50 and array_position(a,null) is null
     and not exists(select 1 from unnest(a) x where x !~ '^[A-Za-z0-9_-]{1,40}$')
     and coalesce(array_length(a,1),0)=(select count(distinct x) from unnest(a) x)
$$;
create table if not exists public.member_profile_gioco(
  member_id text primary key references public.members(id) on delete cascade,
  frequenza text not null,
  preferenza text not null,
  giochi_conosciuti text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
alter table public.member_profile_gioco drop constraint if exists mpg_frequenza_chk;
alter table public.member_profile_gioco add constraint mpg_frequenza_chk check (frequenza in ('raro','spesso','vet'));
alter table public.member_profile_gioco drop constraint if exists mpg_preferenza_chk;
alter table public.member_profile_gioco add constraint mpg_preferenza_chk check (preferenza in ('strat','mix','luck'));
alter table public.member_profile_gioco drop constraint if exists mpg_giochi_chk;
alter table public.member_profile_gioco add constraint mpg_giochi_chk check (public.pg_valid_game_ids(giochi_conosciuti));
-- updated_at/updated_by impostati dal server, non dal client
create or replace function public.mpg_stamp() returns trigger language plpgsql set search_path=public as $$
begin new.updated_at:=now(); new.updated_by:=auth.uid(); return new; end $$;
drop trigger if exists mpg_stamp on public.member_profile_gioco;
create trigger mpg_stamp before insert or update on public.member_profile_gioco for each row execute function public.mpg_stamp();
alter table public.member_profile_gioco enable row level security;
revoke all on public.member_profile_gioco from anon;
grant select,insert,update on public.member_profile_gioco to authenticated;
grant delete on public.member_profile_gioco to authenticated;
drop policy if exists mpg_read on public.member_profile_gioco;
create policy mpg_read on public.member_profile_gioco for select to authenticated using (true);
drop policy if exists mpg_ins on public.member_profile_gioco;
create policy mpg_ins on public.member_profile_gioco for insert to authenticated with check (auth.uid() is not null);
drop policy if exists mpg_upd on public.member_profile_gioco;
create policy mpg_upd on public.member_profile_gioco for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
drop policy if exists mpg_del on public.member_profile_gioco;
create policy mpg_del on public.member_profile_gioco for delete to authenticated using (public.is_staff());
