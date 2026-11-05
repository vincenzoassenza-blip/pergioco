-- v41.1 (A3) — testi propri dell'associazione configurabili. ADDITIVA: nuova riga app_settings key='testi'
-- (v41.0/v41.1 la ignorano) + vincolo limitato a quella chiave. Nessuna tabella/dato modificato.
begin;
create or replace function public.testi_valid(v jsonb) returns boolean language plpgsql immutable set search_path=public as $f$
declare k text; s text; lim jsonb:='{"santo":[2,40],"festa":[0,5],"antero":[2,20],"anteri":[2,20],"coppa_breve":[2,30],"coppa_plur":[2,30],
 "coppa_intro":[0,400],"coppa_regole_tavoli":[0,600],"coppa_regole_1v1":[0,600],"ente_nome":[2,80],"ente_cf":[0,16]}';
begin
  if v is null or jsonb_typeof(v)<>'object' then return false; end if;
  for k in select jsonb_object_keys(v) loop
    if not lim ? k then return false; end if;
    if jsonb_typeof(v->k)<>'string' then return false; end if;
    s:=v->>k;
    if char_length(btrim(s)) not between (lim->k->>0)::int and (lim->k->>1)::int then return false; end if;
    if s ~ '[<>]' then return false; end if;
    if k not in ('coppa_intro','coppa_regole_tavoli','coppa_regole_1v1') and s ~ '["&]' then return false; end if;
    if k='ente_cf' and s !~ '^[A-Za-z0-9]*$' then return false; end if;
    if k='festa' and btrim(s) !~ '^((0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]))?$' then return false; end if;
  end loop;
  return true;
end $f$;
revoke all on function public.testi_valid(jsonb) from public, anon;
grant execute on function public.testi_valid(jsonb) to authenticated;
alter table public.app_settings drop constraint if exists app_settings_testi_chk;
alter table public.app_settings add constraint app_settings_testi_chk check (key<>'testi' or public.testi_valid(value));
-- nessun seed: senza riga l'app usa i default PerGioco (identici a v41.0)

create temp table r(n serial, k text, v text); grant all on r to public; grant usage on sequence r_n_seq to public;
create temp table ids as select (select user_id::text from members where id='demo-m05') a_uid,(select email from auth.users u join members m on m.user_id=u.id where m.id='demo-m05') a_em,
 (select user_id::text from members where id='mvszjjv2fa64b') s_uid,(select email from auth.users u join members m on m.user_id=u.id where m.id='mvszjjv2fa64b') s_em; grant select on ids to public;
select set_config('request.jwt.claims',json_build_object('sub',a_uid,'email',a_em,'role','authenticated')::text,true) from ids;
set local role authenticated;
do $$declare c int;begin insert into app_settings(key,value) values('testi','{"santo":"Hack"}');get diagnostics c=row_count;insert into r(k,v) values('socio insert righe',c);exception when others then insert into r(k,v) values('socio insert respinto',left(sqlerrm,50));end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',s_uid,'email',s_em,'role','authenticated')::text,true) from ids;
set local role authenticated;
do $$begin insert into app_settings(key,value) values('testi','{"santo":"San Prova","festa":""}');insert into r(k,v) values('admin insert ok','1');exception when others then insert into r(k,v) values('admin insert',sqlerrm);end$$;
do $$declare t text; bad text[]:=array['{"santo":"<i>"}','{"coppa_breve":"A\"B"}','{"festa":"1-3"}','{"ente_cf":"AB-1"}','{"coppa_intro":"'||repeat('a',401)||'"}','{"nuovo":"x"}'];
begin foreach t in array bad loop
  begin update app_settings set value=value||t::jsonb where key='testi'; insert into r(k,v) values('admin invalido ACCETTATO?!',left(t,30));
  exception when check_violation then insert into r(k,v) values('admin invalido respinto',left(t,30)); end; end loop; end$$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$declare c int;begin select count(*) into c from app_settings;insert into r(k,v) values('anon select',c);exception when others then insert into r(k,v) values('anon select',sqlerrm);end$$;
reset role;
insert into r(k,v) select 'xp totale', sum(xp)::text from public.member_xp();
insert into r(k,v) select 'wrapped', value->>'attivo' from app_settings where key='wrapped';
select k,v from r order by n;
rollback;
