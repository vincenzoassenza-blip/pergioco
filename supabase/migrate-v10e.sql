-- v10.3: niente tavoli in date passate (ora di Roma), per tutti
create or replace function public.tables_no_past() returns trigger language plpgsql set search_path=public as $$
begin
  if new.date < (now() at time zone 'Europe/Rome')::date then raise exception 'Non puoi aprire tavoli in una data passata' using errcode='22007'; end if;
  return new;
end $$;
revoke execute on function public.tables_no_past() from public, anon, authenticated;
drop trigger if exists tables_no_past on public.tables;
create trigger tables_no_past before insert on public.tables for each row execute function public.tables_no_past();
