-- v13: livelli XP (calcolati sul server) e voti ai giochi
-- ========== VOTI AI GIOCHI ==========
create table if not exists public.game_ratings(
 member_id text not null references public.members(id) on delete cascade,
 game_id text not null references public.games(id) on delete cascade,
 voto int not null check (voto between 1 and 10),
 commento text check (char_length(commento)<=200),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(member_id,game_id));
create index if not exists game_ratings_game on public.game_ratings(game_id);
alter table public.game_ratings enable row level security;
drop policy if exists game_ratings_read on public.game_ratings;
create policy game_ratings_read on public.game_ratings for select to authenticated using (true);
-- nessuna scrittura diretta: solo tramite le funzioni qui sotto
revoke insert,update,delete on public.game_ratings from anon, authenticated;

-- il socio collegato all'utente vota (o modifica il voto di) un gioco che ha giocato; p_voto null = elimina il proprio voto
create or replace function public.rate_game(p_game text,p_voto int,p_commento text default null) returns void
language plpgsql security definer set search_path=public as $$
declare mid text;
begin
 select id into mid from members where user_id=auth.uid() and active order by created_at limit 1;
 if mid is null then raise exception 'Il tuo account non è collegato a un socio'; end if;
 if p_voto is null then delete from game_ratings where member_id=mid and game_id=p_game; return; end if;
 if p_voto<1 or p_voto>10 then raise exception 'Il voto va da 1 a 10'; end if;
 if not exists(select 1 from plays where game_id=p_game and players @> jsonb_build_array(jsonb_build_object('memberId',mid))) then
  raise exception 'Puoi votare solo i giochi che hai giocato'; end if;
 insert into game_ratings(member_id,game_id,voto,commento) values(mid,p_game,p_voto,nullif(left(btrim(coalesce(p_commento,'')),200),''))
 on conflict(member_id,game_id) do update set voto=excluded.voto,commento=excluded.commento,updated_at=now();
end $$;
-- staff: rimuove un commento inappropriato (o l'intero voto)
create or replace function public.rating_moderate(p_member text,p_game text,p_delete boolean default false) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not public.is_staff() then raise exception 'Solo staff'; end if;
 if p_delete then delete from game_ratings where member_id=p_member and game_id=p_game;
 else update game_ratings set commento=null,updated_at=now() where member_id=p_member and game_id=p_game; end if;
end $$;
revoke all on function public.rate_game(text,int,text) from public,anon;
revoke all on function public.rating_moderate(text,text,boolean) from public,anon;
grant execute on function public.rate_game(text,int,text) to authenticated;
grant execute on function public.rating_moderate(text,text,boolean) to authenticated;

-- ========== LIVELLI XP ==========
-- curva: XP per raggiungere il livello n = 15*(n-1)^2 + 35*(n-1)  -> L2=50, L5=380, L10=1530, L20=6080
create or replace function public.xp_for_level(n int) returns int language sql immutable as $$ select 15*(n-1)*(n-1)+35*(n-1) $$;
create or replace function public.level_for_xp(xp int) returns int language sql immutable as $$
 select k+1 + case when public.xp_for_level(k+2)<=xp then 1 else 0 end
 from (select greatest(0,floor((-35+sqrt(1225+60.0*greatest(xp,0)))/30))::int k) s $$;

create or replace function public.member_xp() returns table(member_id text,xp int,level int,dettaglio jsonb)
language sql stable security definer set search_path=public as $$
with m as (select id,user_id from members where active),
pp as (select p.id play_id,p.game_id,p.date,p.evening,p.coop,p.created_at,x.value v,x.ordinality o
       from plays p cross join lateral jsonb_array_elements(coalesce(p.players,'[]'::jsonb)) with ordinality x),
mine as (select pp.*, pp.v->>'memberId' mid from pp where pp.v->>'memberId' is not null),
st as (select mid,count(distinct play_id) n,count(distinct play_id) filter (where (v->>'winner')::boolean) wins,
       count(distinct play_id) filter (where coop and (v->>'winner')::boolean) coopwins,count(distinct game_id) distinct_g,
       count(distinct date) filter (where evening='Giovedì') thu,count(distinct date) filter (where evening='Domenica') sun
       from mine group by mid),
-- record: punteggio più alto per gioco (partite non cooperative), detenuto da chi l'ha fatto per primo
sc as (select pp.*, (pp.v->>'score')::numeric s from pp where not coalesce(pp.coop,false) and pp.v->>'score' ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$'),
best as (select distinct on (game_id) game_id,v->>'memberId' mid from sc order by game_id,s desc,date,created_at,play_id,o),
rec as (select mid,count(*) n from best where mid is not null group by mid),
expl as (select distinct mid from mine join games g on g.id=mine.game_id where g.added_at is not null and (g.added_at at time zone 'UTC')::date=mine.date),
tb as (select t.id,t.date,t.host_id,t.play_id,x->>'memberId' mid from tables t left join lateral jsonb_array_elements(coalesce(t.players,'[]'::jsonb)) x on true),
host as (select host_id mid,count(*) n,count(*) filter (where play_id is not null) played from tables where host_id is not null group by host_id),
ser as (select mid,count(distinct date) n from (select mid,date from mine union select mid,date from tb where mid is not null union select host_id,date from tb where host_id is not null) u group by mid),
ev as (select m.id mid,count(distinct e.evento_id) n from m join evento_pren e on e.presente and e.ospite is null and (e.member_id=m.id or (e.member_id is null and e.user_id=m.user_id)) group by m.id),
rt as (select member_id mid,count(*) n from game_ratings group by member_id),
b as (select m.id mid,coalesce(st.n,0) n,coalesce(st.wins,0) wins,coalesce(st.coopwins,0) coopwins,coalesce(st.distinct_g,0) dg,
       coalesce(st.thu,0) thu,coalesce(st.sun,0) sun,coalesce(rec.n,0) recs,coalesce(host.n,0) hosted,coalesce(host.played,0) hplayed,
       (expl.mid is not null) explorer,coalesce(ser.n,0) serate,coalesce(ev.n,0) eventi,coalesce(rt.n,0) rated
      from m left join st on st.mid=m.id left join rec on rec.mid=m.id left join host on host.mid=m.id left join expl on expl.mid=m.id
      left join ser on ser.mid=m.id left join ev on ev.mid=m.id left join rt on rt.mid=m.id),
c as (select b.*, ((n>=1)::int+(wins>=1)::int+(n>=10)::int+(n>=25)::int+(n>=50)::int+(dg>=5)::int+(dg>=10)::int+(dg>=20)::int
       +(thu>=5)::int+(sun>=5)::int+(recs>=1)::int+(coopwins>=5)::int+(hosted>=5)::int+explorer::int+(rated>=10)::int) badges from b),
x as (select c.*, (10*n+5*wins+15*serate+25*eventi+20*hplayed+10*dg+30*badges)::int tot from c)
select mid,tot,public.level_for_xp(tot),jsonb_build_object(
 'partite',jsonb_build_array(n,10*n),'vittorie',jsonb_build_array(wins,5*wins),'serate',jsonb_build_array(serate,15*serate),
 'eventi',jsonb_build_array(eventi,25*eventi),'tavoli',jsonb_build_array(hplayed,20*hplayed),'giochi_nuovi',jsonb_build_array(dg,10*dg),
 'badge',jsonb_build_array(badges,30*badges)) from x $$;
revoke all on function public.member_xp() from public,anon;
grant execute on function public.member_xp() to authenticated;
