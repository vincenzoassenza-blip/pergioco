-- v33: "Le mie statistiche" — preferenza privacy del socio (idempotente)
-- stats_pubbliche=false (default): gli altri soci non vedono le statistiche aggregate del socio.
-- Nemesi/vittima/bilanci con singole persone non sono MAI mostrati ad altri (solo socio + staff, lato client).
alter table public.members add column if not exists stats_pubbliche boolean not null default false;

create or replace function public.set_stats_pubbliche(p boolean) returns void
language plpgsql security definer set search_path=public as $$
declare n int;
begin
 if auth.uid() is null then raise exception 'Accedi'; end if;
 if p is null then raise exception 'Valore non valido'; end if;
 update members set stats_pubbliche=p where user_id=auth.uid() and user_id is not null;
 get diagnostics n=row_count;
 if n=0 then raise exception 'Il tuo account non è collegato a un socio'; end if; end $$;
revoke all on function public.set_stats_pubbliche(boolean) from public,anon;
grant execute on function public.set_stats_pubbliche(boolean) to authenticated;
-- v33.1 hotfix: members usa privilegi per colonna → la nuova colonna va resa leggibile (altrimenti la select del client fallisce e l'app va "offline")
grant select (stats_pubbliche) on public.members to authenticated;
revoke insert (stats_pubbliche), update (stats_pubbliche) on public.members from authenticated;
