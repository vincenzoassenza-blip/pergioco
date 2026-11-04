begin;
create temp table r(n serial, k text, v text); grant all on r to public; grant usage on sequence r_n_seq to public;
create temp table ids as select (select user_id::text from members where id='demo-m05') a_uid,(select email from auth.users u join members m on m.user_id=u.id where m.id='demo-m05') a_em,
 (select user_id::text from members where id='mvszjjv2fa64b') s_uid,(select email from auth.users u join members m on m.user_id=u.id where m.id='mvszjjv2fa64b') s_em,
 (select id from members where active and user_id is null limit 1) other; grant select on ids to public;
select set_config('request.jwt.claims',json_build_object('sub',s_uid,'email',s_em)::text,true) from ids;
insert into public.tables(id,date,game_id,host_id,seats,players,status) select 'zz-t1',(now() at time zone 'Europe/Rome')::date+1,(select id from games limit 1),other,3,jsonb_build_array(jsonb_build_object('memberId',other)),'open' from ids;
insert into public.tables(id,date,game_id,host_id,seats,players,status) select 'zz-t2',(now() at time zone 'Europe/Rome')::date+1,(select id from games limit 1),'demo-m05',4,'[{"memberId":"demo-m05"}]','open' from ids;
insert into r(k,v) select 'a_is_mod',(select count(*) from moderators mo where lower(mo.email)=lower(a_em))::text from ids;
-- socio A
select set_config('request.jwt.claims',json_build_object('sub',a_uid,'email',a_em,'role','authenticated')::text,true) from ids;
set local role authenticated;
do $$begin insert into r(k,v) values('A staff',public.is_staff()::text);end$$;
do $$declare c int;begin update public.tables set players='[]' where id='zz-t1';get diagnostics c=row_count;insert into r(k,v) values('A modifica giocatori tavolo altrui (righe)',c);exception when others then insert into r(k,v) values('A modifica giocatori altrui',sqlerrm);end$$;
do $$declare c int;begin update public.tables set note='x' where id='zz-t1';get diagnostics c=row_count;insert into r(k,v) values('A modifica nota tavolo altrui (righe)',c);exception when others then insert into r(k,v) values('A nota altrui',sqlerrm);end$$;
do $$begin insert into r(k,v) values('A join',public.table_seat('zz-t1','join')::text);exception when others then insert into r(k,v) values('A join ERR',sqlerrm);end$$;
do $$begin insert into r(k,v) values('A join di nuovo',public.table_seat('zz-t1','join')::text);exception when others then insert into r(k,v) values('A join2 ERR',sqlerrm);end$$;
do $$begin insert into r(k,v) values('A leave',public.table_seat('zz-t1','leave')::text);exception when others then insert into r(k,v) values('A leave ERR',sqlerrm);end$$;
do $$declare c int;begin update public.tables set players=players||'[{"guest":true,"name":"Ospite"}]' where id='zz-t2';get diagnostics c=row_count;insert into r(k,v) values('A host aggiunge ospite al suo (righe)',c);exception when others then insert into r(k,v) values('A host ospite ERR',sqlerrm);end$$;
do $$begin insert into public.tables(id,date,game_id,host_id,seats,players) values('zz-t3',(now() at time zone 'Europe/Rome')::date+1,(select id from public.games limit 1),'demo-m05',4,'[]');insert into r(k,v) values('A apre senza sedersi','OK?!');exception when others then insert into r(k,v) values('A apre senza sedersi',sqlerrm);end$$;
do $$begin delete from public.tables where id='zz-t2';insert into r(k,v) values('A elimina righe',(select count(*) from public.tables where id='zz-t2')::text||' rimaste');end$$;
reset role;
-- staff
select set_config('request.jwt.claims',json_build_object('sub',s_uid,'email',s_em,'role','authenticated')::text,true) from ids;
set local role authenticated;
do $$declare c int;begin update public.tables set players=players||'[{"guest":true,"name":"G"}]' where id='zz-t1';get diagnostics c=row_count;insert into r(k,v) values('staff gestisce tavolo altrui (righe)',c);exception when others then insert into r(k,v) values('staff ERR',sqlerrm);end$$;
reset role;
-- anon
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$begin perform public.table_seat('zz-t1','join');insert into r(k,v) values('anon rpc','OK?!');exception when others then insert into r(k,v) values('anon rpc',sqlerrm);end$$;
do $$declare c int;begin update public.tables set note='y' where id='zz-t1';get diagnostics c=row_count;insert into r(k,v) values('anon update righe',c);exception when others then insert into r(k,v) values('anon update',sqlerrm);end$$;
reset role;
select k,v from r order by n;
