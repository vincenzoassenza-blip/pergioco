-- v31: nella Sfida equilibrata un socio non staff non può togliersi dalla partita (idempotente)
-- sfide: il controllo 'il socio di created_by è in member_ids per i non staff' è già in sfide_check (v30), lo ribadiamo
create or replace function public.sfide_check() returns trigger language plpgsql security definer set search_path=public as $$
declare k text; v jsonb; n int;
begin
  if tg_op='UPDATE' then raise exception 'Le sfide non si modificano'; end if;
  new.created_by:=auth.uid(); new.created_at:=now();
  if new.created_by is null then raise exception 'Accesso richiesto'; end if;
  if not public.is_staff() and not exists(select 1 from members m where m.user_id=auth.uid() and m.id=any(new.member_ids)) then
    raise exception 'Puoi creare solo sfide a cui partecipi'; end if;
  if (select count(*) from members where id=any(new.member_ids))<>cardinality(new.member_ids) then raise exception 'Socio inesistente'; end if;
  if (select count(*) from games where id=any(new.proposti) and not coop)<>cardinality(new.proposti) then raise exception 'Gioco non valido'; end if;
  if (select count(*) from jsonb_object_keys(new.pronostico))<>cardinality(new.member_ids) then raise exception 'Pronostico non valido'; end if;
  for k,v in select * from jsonb_each(new.pronostico) loop
    if not (k=any(new.member_ids)) or jsonb_typeof(v)<>'number' or v::numeric<0 or v::numeric>2 then raise exception 'Pronostico non valido'; end if;
  end loop;
  select count(*) into n from sfide where created_by=new.created_by and (created_at at time zone 'Europe/Rome')::date=(now() at time zone 'Europe/Rome')::date;
  if n>=20 then raise exception 'Limite di 20 sfide al giorno raggiunto'; end if;
  return new;
end $$;
drop trigger if exists sfide_check on public.sfide;
create trigger sfide_check before insert or update on public.sfide for each row execute function public.sfide_check();
create or replace function public.plays_sfida_check() returns trigger language plpgsql security definer set search_path=public as $$
declare s sfide; ok boolean;
begin
  if new.sfida_id is null then return new; end if;
  if tg_op='UPDATE' and new.sfida_id is distinct from old.sfida_id and not public.is_staff() then new.sfida_id:=null; return new; end if;
  select * into s from sfide where id=new.sfida_id;
  ok := found
    and new.game_id = any(s.proposti)
    and not coalesce(new.coop,false)
    and s.member_ids <@ array(select x->>'memberId' from jsonb_array_elements(coalesce(new.players,'[]'::jsonb)) x where x->>'memberId' is not null)
    and new.date between (s.created_at at time zone 'Europe/Rome')::date and (s.created_at at time zone 'Europe/Rome')::date+7
    and (tg_op='UPDATE' or s.created_by=auth.uid() or public.is_staff())
    and (public.is_staff() or exists(select 1 from members m where m.user_id=auth.uid() and m.id=any(s.member_ids)))
    and not exists(select 1 from plays p where p.sfida_id=new.sfida_id and p.id<>new.id);
  if not ok then new.sfida_id:=null; end if;
  return new;
end $$;
drop trigger if exists aa_plays_sfida on public.plays;
create trigger aa_plays_sfida before insert or update on public.plays for each row execute function public.plays_sfida_check();
