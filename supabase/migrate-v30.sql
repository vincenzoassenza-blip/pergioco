-- v30 — Sfide: tabella sfide, plays.sfida_id validato da trigger, EXP e badge per le sfide (member_xp).
-- Idempotente. Per chi non ha sfide i valori di member_xp restano identici.
create table if not exists public.sfide(
  id uuid primary key default gen_random_uuid(),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  member_ids text[] not null,
  proposti text[] not null,
  scelto text,
  pronostico jsonb not null default '{}'::jsonb,
  nuovo_per_tutti boolean not null default false
);
create or replace function public.sf_valid_ids(a text[],lo int,hi int) returns boolean language sql immutable as $$
  select a is not null and coalesce(array_length(a,1),0) between lo and hi and array_position(a,null) is null
     and not exists(select 1 from unnest(a) x where x !~ '^[A-Za-z0-9_-]{1,60}$')
     and coalesce(array_length(a,1),0)=(select count(distinct x) from unnest(a) x)
$$;
alter table public.sfide drop constraint if exists sfide_members_chk;
alter table public.sfide add constraint sfide_members_chk check (public.sf_valid_ids(member_ids,2,20));
alter table public.sfide drop constraint if exists sfide_proposti_chk;
alter table public.sfide add constraint sfide_proposti_chk check (public.sf_valid_ids(proposti,1,3));
alter table public.sfide drop constraint if exists sfide_scelto_chk;
alter table public.sfide add constraint sfide_scelto_chk check (scelto is null or scelto = any(proposti));
alter table public.sfide drop constraint if exists sfide_pron_chk;
alter table public.sfide add constraint sfide_pron_chk check (jsonb_typeof(pronostico)='object');
create index if not exists sfide_creator_idx on public.sfide(created_by,created_at);

-- validazione alla creazione: autore partecipante (o staff), soci e giochi esistenti, pronostico congelato 0..2 per ogni socio, max 20 sfide/giorno
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

alter table public.sfide enable row level security;
revoke all on public.sfide from anon;
grant select,insert,delete on public.sfide to authenticated;
revoke update on public.sfide from authenticated;
drop policy if exists sfide_read on public.sfide;
create policy sfide_read on public.sfide for select to authenticated using (true);
drop policy if exists sfide_ins on public.sfide;
create policy sfide_ins on public.sfide for insert to authenticated with check (auth.uid() is not null);
drop policy if exists sfide_del on public.sfide;
create policy sfide_del on public.sfide for delete to authenticated using (public.is_staff());

-- collegamento partita → sfida (una sfida, una partita)
alter table public.plays add column if not exists sfida_id uuid references public.sfide(id) on delete set null;
create unique index if not exists plays_sfida_uq on public.plays(sfida_id) where sfida_id is not null;
-- se il collegamento non è valido viene tolto (la partita resta una partita normale)
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
    and not exists(select 1 from plays p where p.sfida_id=new.sfida_id and p.id<>new.id);
  if not ok then new.sfida_id:=null; end if;
  return new;
end $$;
drop trigger if exists aa_plays_sfida on public.plays;
create trigger aa_plays_sfida before insert or update on public.plays for each row execute function public.plays_sfida_check();

-- EXP: identica alla v13/v18 + sfide (+10 giocata, +5 vinta, +15 vinta da sfavorito) e 8 badge sfide (+30 ciascuno)
-- anti-abuso nel calcolo: 1 sfida/giorno per stesso gruppo, max 2/giorno e 10/settimana per socio
create or replace function public.member_xp()
 returns table(member_id text, xp integer, level integer, dettaglio jsonb)
 language sql stable security definer set search_path to 'public'
as $function$
with m as (select id,user_id from members where active),
pp as (select p.id play_id,p.game_id,p.date,p.evening,p.coop,p.created_at,x.value v,x.ordinality o
       from plays p cross join lateral jsonb_array_elements(coalesce(p.players,'[]'::jsonb)) with ordinality x),
mine as (select pp.*, pp.v->>'memberId' mid from pp where pp.v->>'memberId' is not null),
st as (select mid,count(distinct play_id) n,count(distinct play_id) filter (where (v->>'winner')::boolean) wins,
       count(distinct play_id) filter (where coop and (v->>'winner')::boolean) coopwins,count(distinct game_id) distinct_g,
       count(distinct date) filter (where extract(dow from date)=4) thu,count(distinct date) filter (where extract(dow from date)=0) sun
       from mine group by mid),
sc as (select pp.*, (pp.v->>'score')::numeric s from pp where not coalesce(pp.coop,false) and pp.v->>'score' ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$'),
best as (select distinct on (game_id) game_id,v->>'memberId' mid from sc order by game_id,s desc,date,created_at,play_id,o),
rec as (select mid,count(*) n from best where mid is not null group by mid),
expl as (select distinct mid from mine join games g on g.id=mine.game_id where g.added_at is not null and (g.added_at at time zone 'UTC')::date=mine.date),
tb as (select t.id,t.date,t.host_id,t.play_id,x->>'memberId' mid from tables t left join lateral jsonb_array_elements(coalesce(t.players,'[]'::jsonb)) x on true),
host as (select host_id mid,count(*) n,count(*) filter (where play_id is not null) played from tables where host_id is not null group by host_id),
ser as (select mid,count(distinct date) n from (select mid,date from mine union select mid,date from tb where mid is not null union select host_id,date from tb where host_id is not null) u group by mid),
ev as (select m.id mid,count(distinct e.evento_id) n from m join evento_pren e on e.presente and e.ospite is null and (e.member_id=m.id or (e.member_id is null and e.user_id=m.user_id)) group by m.id),
rt as (select member_id mid,count(*) n from game_ratings group by member_id),
-- sfide
sp as (select p.id play_id,p.date,p.created_at,p.players,s.member_ids,s.pronostico,s.nuovo_per_tutti,
        (select array_agg(x order by x) from unnest(s.member_ids) x) grp
       from plays p join sfide s on s.id=p.sfida_id where not coalesce(p.coop,false)),
g1 as (select * from (select sp.*,row_number() over (partition by date,grp order by created_at,play_id) r from sp) z where r=1),
sm as (select g1.play_id,g1.date,g1.created_at,g1.member_ids,g1.pronostico,g1.nuovo_per_tutti,u.mid,
        coalesce((select bool_or(coalesce((x->>'winner')::boolean,false)) from jsonb_array_elements(g1.players) x where x->>'memberId'=u.mid),false) won
       from g1 cross join lateral unnest(g1.member_ids) u(mid)),
d2 as (select * from (select sm.*,row_number() over (partition by mid,date order by created_at,play_id) rd from sm) z where rd<=2),
sfs as (select z.*, (won and (pronostico->>mid)::numeric=(select min((pronostico->>y)::numeric) from unnest(member_ids) y)
                         and (pronostico->>mid)::numeric<(select max((pronostico->>y)::numeric) from unnest(member_ids) y)) underdog
        from (select d2.*,row_number() over (partition by mid,date_trunc('week',date) order by date,created_at,play_id) rw from d2) z where rw<=10),
pr as (select a.mid,b.mid opp,a.date,a.created_at,a.play_id,a.won aw,b.won bw from sfs a join sm b on b.play_id=a.play_id and b.mid<>a.mid),
riv as (select mid,bool_or(aw and not bw and coalesce(pbw and not paw,false)) r,max(c) rivali from
        (select pr.*,lag(aw) over w paw,lag(bw) over w pbw,count(*) over (partition by mid,opp) c from pr window w as (partition by mid,opp order by date,created_at,play_id)) z group by mid),
sfa as (select mid,count(*) n,count(*) filter (where won) w,count(*) filter (where underdog) u,count(*) filter (where nuovo_per_tutti) nuovi,
        bool_or(cardinality(member_ids)>=5) big from sfs group by mid),
b as (select m.id mid,coalesce(st.n,0) n,coalesce(st.wins,0) wins,coalesce(st.coopwins,0) coopwins,coalesce(st.distinct_g,0) dg,
       coalesce(st.thu,0) thu,coalesce(st.sun,0) sun,coalesce(rec.n,0) recs,coalesce(host.n,0) hosted,coalesce(host.played,0) hplayed,
       (expl.mid is not null) explorer,coalesce(ser.n,0) serate,coalesce(ev.n,0) eventi,coalesce(rt.n,0) rated,
       coalesce(sfa.n,0) sf_n,coalesce(sfa.w,0) sf_w,coalesce(sfa.u,0) sf_u,coalesce(sfa.nuovi,0) sf_nuovi,coalesce(sfa.big,false) sf_big,
       coalesce(riv.r,false) sf_riv,coalesce(riv.rivali,0) sf_rivali
      from m left join st on st.mid=m.id left join rec on rec.mid=m.id left join host on host.mid=m.id left join expl on expl.mid=m.id
      left join ser on ser.mid=m.id left join ev on ev.mid=m.id left join rt on rt.mid=m.id left join sfa on sfa.mid=m.id left join riv on riv.mid=m.id),
c as (select b.*, ((n>=1)::int+(wins>=1)::int+(n>=10)::int+(n>=25)::int+(n>=50)::int+(dg>=5)::int+(dg>=10)::int+(dg>=20)::int
       +(thu>=5)::int+(sun>=5)::int+(recs>=1)::int+(coopwins>=5)::int+(hosted>=5)::int+explorer::int+(rated>=10)::int
       +(sf_n>=1)::int+(sf_n>=10)::int+(sf_w>=5)::int+(sf_u>=1)::int+sf_riv::int+(sf_rivali>=5)::int+(sf_nuovi>=3)::int+sf_big::int) badges from b),
x as (select c.*, (10*n+5*wins+15*serate+25*eventi+20*hplayed+10*dg+30*badges+10*sf_n+5*sf_w+15*sf_u)::int tot from c)
select mid,tot,public.level_for_xp(tot),jsonb_build_object(
 'partite',jsonb_build_array(n,10*n),'vittorie',jsonb_build_array(wins,5*wins),'serate',jsonb_build_array(serate,15*serate),
 'eventi',jsonb_build_array(eventi,25*eventi),'tavoli',jsonb_build_array(hplayed,20*hplayed),'giochi_nuovi',jsonb_build_array(dg,10*dg),
 'badge',jsonb_build_array(badges,30*badges),'sfide',jsonb_build_array(sf_n,10*sf_n),'sfide_vinte',jsonb_build_array(sf_w,5*sf_w),
 'sfavorito',jsonb_build_array(sf_u,15*sf_u)) from x $function$;
revoke all on function public.member_xp() from public,anon;
grant execute on function public.member_xp() to authenticated;
