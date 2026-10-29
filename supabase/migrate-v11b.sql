-- v11b: collegamento Libro soci -> members (soci per le partite). Nessun collegamento automatico a soci esistenti:
-- se esiste un omonimo non collegato, non si crea nulla (l'admin collega a mano). Altrimenti si crea e collega un nuovo member.
create or replace function public.libro_norm(t text) returns text language sql stable as $$ select lower(trim(regexp_replace(extensions.unaccent(coalesce(t,'')),'\s+',' ','g'))) $$;
create or replace function public.libro_soci_link() returns trigger language plpgsql security definer set search_path=public as $$
declare mid text;
begin
 if tg_op='INSERT' then
  if new.member_id is null and not exists(select 1 from members m where libro_norm(m.nome)=libro_norm(new.nome) and libro_norm(m.cognome)=libro_norm(new.cognome)) then
   mid:=to_hex((extract(epoch from clock_timestamp())*1000)::bigint)||substr(md5(random()::text),1,6);
   insert into members(id,nome,cognome,active,tessera) values(mid,new.nome,new.cognome,new.data_uscita is null,new.numero_tessera);
   new.member_id:=mid;
   insert into libro_audit(user_id,email,action,tabella,record_id,dettaglio) values(auth.uid(),auth.jwt()->>'email','create','members',mid,'Creato socio partite da Libro soci: '||new.cognome||' '||new.nome);
  end if;
 elsif new.member_id is not null then
  if (new.nome,new.cognome) is distinct from (old.nome,old.cognome) and new.member_id is not distinct from old.member_id then
   update members set nome=new.nome,cognome=new.cognome where id=new.member_id;
   insert into libro_audit(user_id,email,action,tabella,record_id,dettaglio) values(auth.uid(),auth.jwt()->>'email','update','members',new.member_id,'Nome sincronizzato da Libro soci');
  end if;
  if (new.data_uscita is null) is distinct from (old.data_uscita is null) or new.member_id is distinct from old.member_id then
   update members set active=(new.data_uscita is null) where id=new.member_id and active is distinct from (new.data_uscita is null);
   if found then insert into libro_audit(user_id,email,action,tabella,record_id,dettaglio) values(auth.uid(),auth.jwt()->>'email','update','members',new.member_id,case when new.data_uscita is null then 'Socio partite riattivato' else 'Socio partite disattivato (uscita)' end); end if;
  end if;
 end if;
 return new;
end $$;
revoke all on function public.libro_soci_link() from public, anon, authenticated;
drop trigger if exists libro_soci_link on public.libro_soci;
create trigger libro_soci_link before insert or update on public.libro_soci for each row execute function public.libro_soci_link();
