-- Rimuove SOLO i dati demo (id 'demo-…' o 'de000000-…'). I dati reali non vengono toccati.
begin;
delete from public.evento_audit where evento_id::text like 'de000000-%' or pren_id::text like 'de000000-%';
delete from public.evento_pren where id::text like 'de000000-%' or evento_id::text like 'de000000-%' or member_id like 'demo-%';
delete from public.eventi where id::text like 'de000000-%';
delete from public.libro_quote where id::text like 'de000000-%' or socio_id::text like 'de000000-%';
delete from public.libro_volontari where id::text like 'de000000-%';
delete from public.libro_soci where id::text like 'de000000-%';
delete from public.libro_audit where record_id::text like 'de000000-%' or record_id::text like 'demo-%';
delete from public.tables where id like 'demo-%' or host_id like 'demo-%';
delete from public.plays where id like 'demo-%';
-- le partite reali eventualmente registrate con soci demo: tolgo solo i giocatori demo
update public.plays set players=(select coalesce(jsonb_agg(x),'[]'::jsonb) from jsonb_array_elements(players) x where coalesce(x->>'memberId','') not like 'demo-%') where players::text like '%"demo-%';
update public.tables set players=(select coalesce(jsonb_agg(x),'[]'::jsonb) from jsonb_array_elements(players) x where coalesce(x->>'memberId','') not like 'demo-%') where players::text like '%"demo-%';
update public.members set fav_game_id=null where fav_game_id like 'demo-%' and id not like 'demo-%';
delete from public.member_codes where member_id like 'demo-%';
delete from public.members where id like 'demo-%';
delete from public.games g where g.id like 'demo-%' and not exists(select 1 from public.plays p where p.game_id=g.id) and not exists(select 1 from public.tables t where t.game_id=g.id);
commit;
