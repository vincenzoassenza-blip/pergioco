-- v10.3: chi non è staff apre tavoli solo come padrone di casa (socio collegato al proprio account)
create or replace function public.tables_host_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare mine text;
begin
  if public.is_staff() then return new; end if;
  if tg_op='UPDATE' and new.host_id is not distinct from old.host_id then return new; end if;
  select id into mine from public.members where user_id=auth.uid() limit 1;
  if mine is null then raise exception 'Account non collegato a un socio' using errcode='42501'; end if;
  if new.host_id is distinct from mine then raise exception 'Puoi ospitare solo come te stesso' using errcode='42501'; end if;
  return new;
end $$;
revoke execute on function public.tables_host_guard() from public, anon, authenticated;
drop trigger if exists tables_host_guard on public.tables;
create trigger tables_host_guard before insert or update on public.tables for each row execute function public.tables_host_guard();
