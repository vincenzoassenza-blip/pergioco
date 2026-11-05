-- test v41: configurazione 'brand' — eseguire DOPO migrate-v41.sql; tutto in transazione, nulla resta salvato.
begin;
create temp table r(n serial, k text, v text); grant all on r to public; grant usage on sequence r_n_seq to public;
create temp table ids as select (select user_id::text from members where id='demo-m05') a_uid,(select email from auth.users u join members m on m.user_id=u.id where m.id='demo-m05') a_em,
 (select user_id::text from members where id='mvszjjv2fa64b') s_uid,(select email from auth.users u join members m on m.user_id=u.id where m.id='mvszjjv2fa64b') s_em; grant select on ids to public;
insert into r(k,v) select 'seed nome', value->>'nome' from app_settings where key='brand';
insert into r(k,v) select 'seed valido', public.brand_valid(value)::text from app_settings where key='brand';
insert into r(k,v) select 'wrapped invariato', value::text from app_settings where key='wrapped';
-- socio
select set_config('request.jwt.claims',json_build_object('sub',a_uid,'email',a_em,'role','authenticated')::text,true) from ids;
set local role authenticated;
insert into r(k,v) select 'socio legge', value->>'nome' from app_settings where key='brand';
do $$declare c int;begin update app_settings set value=value||'{"nome":"Hack"}' where key='brand';get diagnostics c=row_count;insert into r(k,v) values('socio update righe',c);exception when others then insert into r(k,v) values('socio update',sqlerrm);end$$;
reset role;
-- admin
select set_config('request.jwt.claims',json_build_object('sub',s_uid,'email',s_em,'role','authenticated')::text,true) from ids;
set local role authenticated;
do $$declare c int;begin update app_settings set value=value||'{"nome":"Prova Assoc"}' where key='brand';get diagnostics c=row_count;insert into r(k,v) values('admin update ok',c);exception when others then insert into r(k,v) values('admin update ok',sqlerrm);end$$;
do $$declare t text; bad text[]:=array['{"nome":"X"}','{"colori":{"primario":"red"}}','{"instagram":"a b<"}','{"email":"no"}','{"logo":"http://x.it/a.png"}','{"logo":"javascript:alert(1)"}','{"motto":"'||repeat('m',81)||'"}','{"campo_strano":1}','{"logo":"data:image/svg+xml;base64,'||encode(convert_to('<svg onload="alert(1)"></svg>','UTF8'),'base64')||'"}'];
begin foreach t in array bad loop
  begin update app_settings set value=value||t::jsonb where key='brand'; insert into r(k,v) values('admin invalido ACCETTATO?!',left(t,40));
  exception when check_violation then insert into r(k,v) values('admin invalido respinto',left(t,40)); end;
 end loop; end$$;
reset role;
-- anon
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$declare c int;begin select count(*) into c from app_settings;insert into r(k,v) values('anon select',c);exception when others then insert into r(k,v) values('anon select',sqlerrm);end$$;
reset role;
insert into r(k,v) select 'xp totale', sum(xp)::text from public.member_xp();
select k,v from r order by n;
