-- v18: la "serata" non si sceglie più; il giorno si ricava dalla data.
-- La colonna evening resta (nessun dato perso): viene calcolata dal server dalla data
-- e il valore inviato dal client è ignorato. Le righe esistenti non vengono modificate.
create or replace function public.evening_from_date() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='UPDATE' and new.date is not distinct from old.date then new.evening:=old.evening; return new; end if;
  new.evening:=(array['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'])[extract(dow from new.date)::int+1];
  return new;
end $$;
revoke all on function public.evening_from_date() from public,anon,authenticated;
-- nome "zz_" così scatta dopo tables_host_guard (che confronta old/new)
drop trigger if exists zz_plays_evening on public.plays;
create trigger zz_plays_evening before insert or update on public.plays for each row execute function public.evening_from_date();
drop trigger if exists zz_tables_evening on public.tables;
create trigger zz_tables_evening before insert or update on public.tables for each row execute function public.evening_from_date();
-- badge giovedì/domenica dal giorno della settimana della data, non dal campo serata
do $$ declare d text; begin
  select pg_get_functiondef('public.member_xp()'::regprocedure) into d;
  d:=replace(d,'filter (where evening=''Giovedì'')','filter (where extract(dow from date)=4)');
  d:=replace(d,'filter (where evening=''Domenica'')','filter (where extract(dow from date)=0)');
  execute d;
end $$;
