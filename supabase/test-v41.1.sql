-- test v41.1: include la migrazione e la verifica in transazione; nulla resta salvato (rollback).
begin;
-- v41.1 (A2) — moduli configurabili: Coppa, Sfida, Libri sociali. ADDITIVA e retrocompatibile con v41.0:
-- nuova riga app_settings key='moduli' (v41.0 la ignora), nuovo vincolo limitato a quella chiave,
-- funzione mod_nome() e sostituzione dei SOLI testi visibili nelle funzioni coppa_* (stessa firma, stessa logica).
-- Tabelle/colonne interne (antero_*, coppe, ...) invariate. Nessun dato cancellato.
create or replace function public.moduli_valid(v jsonb) returns boolean language plpgsql immutable set search_path=public as $f$
declare k text; m jsonb;
begin
  if v is null or jsonb_typeof(v)<>'object' then return false; end if;
  for k in select jsonb_object_keys(v) loop
    if k not in ('coppa','sfida','libri') then return false; end if;
    m:=v->k; if jsonb_typeof(m)<>'object' then return false; end if;
    if exists(select 1 from jsonb_object_keys(m) x where x not in ('attivo','nome','desc')) then return false; end if;
    if jsonb_typeof(m->'attivo') is distinct from 'boolean' then return false; end if;
    if m ? 'nome' and (jsonb_typeof(m->'nome')<>'string' or char_length(btrim(m->>'nome')) not between 2 and 40 or (m->>'nome') ~ '[<>]') then return false; end if;
    if m ? 'desc' and (jsonb_typeof(m->'desc')<>'string' or char_length(m->>'desc')>120 or (m->>'desc') ~ '[<>]') then return false; end if;
  end loop;
  return true;
end $f$;
revoke all on function public.moduli_valid(jsonb) from public, anon;
grant execute on function public.moduli_valid(jsonb) to authenticated;
alter table public.app_settings drop constraint if exists app_settings_moduli_chk;
alter table public.app_settings add constraint app_settings_moduli_chk check (key<>'moduli' or public.moduli_valid(value));
insert into public.app_settings(key,value) values('moduli',jsonb_build_object(
  'coppa',jsonb_build_object('attivo',true,'nome','Coppa Antero','desc','Torneo svizzero dell''associazione'),
  'sfida',jsonb_build_object('attivo',true,'nome','Sfida di Antero','desc','Torneo tra meccaniche (staff)'),
  'libri',jsonb_build_object('attivo',true))) on conflict (key) do nothing;
create or replace function public.mod_nome(k text, def text) returns text language sql stable security definer set search_path=public as $f$
  select coalesce(nullif(btrim((select value->k->>'nome' from public.app_settings where key='moduli')),''),def) $f$;
revoke all on function public.mod_nome(text,text) from public, anon;
grant execute on function public.mod_nome(text,text) to authenticated;
CREATE OR REPLACE FUNCTION public.coppa_crea(p_turni integer, p_pool text[], p_formato text DEFAULT '1v1'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare q text[]; nid uuid;
begin
 if auth.uid() is null or not public.is_staff() then raise exception 'Solo lo staff può creare la Coppa'; end if;
 if p_turni is null or p_turni not between 1 and 5 then raise exception 'Turni: da 1 a 5'; end if;
 if exists(select 1 from coppe where stato<>'concluso') then raise exception 'C''è già una % non conclusa', public.mod_nome('coppa','Coppa Antero'); end if;
 q:=public.cp_pool_ok(p_pool,p_formato);
 insert into coppe(edizione,formato,turni,pool,created_by) values((select coalesce(max(edizione),0)+1 from coppe),p_formato,p_turni,q,auth.uid()) returning id into nid;
 return nid; end $function$;

CREATE OR REPLACE FUNCTION public.coppa_risultato(p_incontro uuid, p_vincitore text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare i coppa_incontri; c coppe; st boolean:=public.is_staff(); me text:=public.cp_me(); pid text; pj jsonb;
begin
 if auth.uid() is null then raise exception 'Accedi'; end if;
 select * into i from coppa_incontri where id=p_incontro for update; if not found then raise exception 'Incontro inesistente'; end if;
 select * into c from coppe where id=i.coppa_id for update;
 if c.stato<>'in_corso' or i.turno<>c.turno then raise exception 'Il turno è chiuso'; end if;
 if i.b is null then raise exception 'Turno di riposo: vittoria a tavolino'; end if;
 if p_vincitore is null or p_vincitore not in (i.a,i.b) then raise exception 'Vincitore non valido'; end if;
 if not st and (me is null or me not in (i.a,i.b)) then raise exception 'Solo i due giocatori o lo staff'; end if;
 if i.vincitore is not null and not st then raise exception 'Risultato già inserito: per correggerlo chiedi allo staff'; end if;
 pj:=jsonb_build_array(jsonb_build_object('memberId',i.a,'winner',i.a=p_vincitore,'score',null),jsonb_build_object('memberId',i.b,'winner',i.b=p_vincitore,'score',null));
 pid:=coalesce(i.play_id,'cpa'||substr(md5(i.id::text),1,10));
 if exists(select 1 from plays where id=pid) then update plays set players=pj,updated_at=now() where id=pid;
 else insert into plays(id,game_id,date,coop,players,note) values(pid,i.game_id,(now() at time zone 'Europe/Rome')::date,false,pj,
   public.mod_nome('coppa','Coppa Antero')||' '||public.cp_roman(c.edizione)||' · turno '||i.turno); end if;
 update coppa_incontri set vincitore=p_vincitore,play_id=pid,inserito_da=auth.uid(),aggiornato_at=now() where id=i.id; end $function$;

CREATE OR REPLACE FUNCTION public.coppa_risultato_t(p_tavolo uuid, p_pos jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t coppa_tavoli; c coppe; st boolean:=public.is_staff(); me text:=public.cp_me(); pid text; pj jsonb; m text; q int; s int;
begin
 if auth.uid() is null then raise exception 'Accedi'; end if;
 select * into t from coppa_tavoli where id=p_tavolo for update; if not found then raise exception 'Tavolo inesistente'; end if;
 select * into c from coppe where id=t.coppa_id for update;
 if c.stato<>'in_corso' or t.turno<>c.turno then raise exception 'Il turno è chiuso'; end if;
 s:=cardinality(t.membri); if s<2 then raise exception 'Turno di riposo'; end if;
 if not st and (me is null or not me=any(t.membri)) then raise exception 'Solo i giocatori del tavolo o lo staff'; end if;
 if t.posizioni is not null and not st then raise exception 'Risultato già inserito: per correggerlo chiedi allo staff'; end if;
 if p_pos is null or jsonb_typeof(p_pos)<>'object' or octet_length(p_pos::text)>600 then raise exception 'Posizioni non valide'; end if;
 if (select count(*) from jsonb_object_keys(p_pos))<>s or exists(select 1 from jsonb_object_keys(p_pos) k where not k=any(t.membri)) then raise exception 'Servono le posizioni di tutti e soli i giocatori del tavolo'; end if;
 foreach m in array t.membri loop
  if jsonb_typeof(p_pos->m)<>'number' or (p_pos->>m)!~'^[1-4]$' then raise exception 'Posizione non valida'; end if;
  q:=(p_pos->>m)::int; if q>s then raise exception 'Posizione oltre il numero di giocatori'; end if;
  if q<>1+(select count(*) from unnest(t.membri) o where (p_pos->>o)::int<q) then raise exception 'Posizioni incoerenti (pari merito: es. 1,1,3)'; end if;
 end loop;
 pj:=(select jsonb_agg(jsonb_build_object('memberId',x,'winner',(p_pos->>x)::int=1,'score',null) order by (p_pos->>x)::int,x) from unnest(t.membri) x);
 pid:=coalesce(t.play_id,'cpt'||substr(md5(t.id::text),1,10));
 if exists(select 1 from plays where id=pid) then update plays set players=pj,updated_at=now() where id=pid;
 else insert into plays(id,game_id,date,coop,players,note) values(pid,t.game_id,(now() at time zone 'Europe/Rome')::date,false,pj,
   public.mod_nome('coppa','Coppa Antero')||' '||public.cp_roman(c.edizione)||' · turno '||t.turno); end if;
 update coppa_tavoli set posizioni=p_pos,play_id=pid,inserito_da=auth.uid(),aggiornato_at=now() where id=t.id; end $function$;
create temp table r(n serial, k text, v text); grant all on r to public; grant usage on sequence r_n_seq to public;
create temp table ids as select (select user_id::text from members where id='demo-m05') a_uid,(select email from auth.users u join members m on m.user_id=u.id where m.id='demo-m05') a_em,
 (select user_id::text from members where id='mvszjjv2fa64b') s_uid,(select email from auth.users u join members m on m.user_id=u.id where m.id='mvszjjv2fa64b') s_em; grant select on ids to public;
insert into r(k,v) select 'seed nome', value->'coppa'->>'nome' from app_settings where key='moduli';
insert into r(k,v) select 'seed valido', public.moduli_valid(value)::text from app_settings where key='moduli';
insert into r(k,v) select 'wrapped invariato', value::text from app_settings where key='wrapped';
-- socio
select set_config('request.jwt.claims',json_build_object('sub',a_uid,'email',a_em,'role','authenticated')::text,true) from ids;
set local role authenticated;
insert into r(k,v) select 'socio legge', value->'coppa'->>'nome' from app_settings where key='moduli';
do $$declare c int;begin update app_settings set value=jsonb_set(value,'{coppa,nome}','"Hack"') where key='moduli';get diagnostics c=row_count;insert into r(k,v) values('socio update righe',c);exception when others then insert into r(k,v) values('socio update',sqlerrm);end$$;
reset role;
-- admin
select set_config('request.jwt.claims',json_build_object('sub',s_uid,'email',s_em,'role','authenticated')::text,true) from ids;
set local role authenticated;
do $$declare c int;begin update app_settings set value=jsonb_set(value,'{coppa,nome}','"Trofeo Prova"') where key='moduli';get diagnostics c=row_count;insert into r(k,v) values('admin update ok',c);exception when others then insert into r(k,v) values('admin update ok',sqlerrm);end$$;
do $$declare t text; bad text[]:=array['{"club":{"attivo":true}}','{"coppa":{"attivo":"si"}}','{"coppa":{"attivo":true,"nome":"X"}}','{"coppa":{"attivo":true,"nome":"<script>"}}','{"sfida":{"attivo":true,"desc":"'||repeat('a',130)||'"}}','{"libri":{"attivo":true,"extra":1}}'];
begin foreach t in array bad loop
  begin update app_settings set value=value||t::jsonb where key='moduli'; insert into r(k,v) values('admin invalido ACCETTATO?!',left(t,40));
  exception when check_violation then insert into r(k,v) values('admin invalido respinto',left(t,40)); end;
 end loop; end$$;
reset role;
-- anon
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$declare c int;begin select count(*) into c from app_settings;insert into r(k,v) values('anon select',c);exception when others then insert into r(k,v) values('anon select',sqlerrm);end$$;
reset role;
insert into r(k,v) select 'mod_nome dopo update admin', public.mod_nome('coppa','Coppa Antero');
insert into r(k,v) select 'xp totale', sum(xp)::text from public.member_xp();
select k,v from r order by n;
rollback;
