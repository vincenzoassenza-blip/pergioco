-- v32 · Coppa Antero (torneo svizzero 1v1). Idempotente.
create table if not exists public.coppe(
 id uuid primary key default gen_random_uuid(),
 edizione integer not null unique check(edizione between 1 and 999),
 formato text not null default '1v1' check(formato in ('1v1','4p')),
 turni integer not null default 3 check(turni between 1 and 5),
 pool text[] not null default '{}' check(cardinality(pool)<=60),
 stato text not null default 'bozza' check(stato in ('bozza','iscrizioni','in_corso','concluso')),
 turno integer not null default 0 check(turno between 0 and 5),
 campione text references public.members(id),
 created_by uuid, created_at timestamptz not null default now(), concluso_at timestamptz,
 constraint coppe_turno_max check(turno<=turni),
 constraint coppe_campione_chk check((stato='concluso')=(concluso_at is not null)));
-- durata: la Coppa può durare giorni o settimane (date opzionali, scadenza opzionale per ogni turno)
alter table public.coppe add column if not exists data_inizio date, add column if not exists data_fine date, add column if not exists scadenze date[] not null default '{}';
alter table public.coppe drop constraint if exists coppe_date_chk;
alter table public.coppe add constraint coppe_date_chk check(
 (data_inizio is null or data_inizio between date '2024-01-01' and date '2100-12-31') and (data_fine is null or data_fine between date '2024-01-01' and date '2100-12-31')
 and (data_inizio is null or data_fine is null or (data_fine>=data_inizio and data_fine<=data_inizio+366)) and cardinality(scadenze)<=5);
create table if not exists public.coppa_iscritti(
 coppa_id uuid not null references public.coppe(id) on delete cascade,
 member_id text not null references public.members(id),
 created_at timestamptz not null default now(), primary key(coppa_id,member_id));
create table if not exists public.coppa_incontri(
 id uuid primary key default gen_random_uuid(),
 coppa_id uuid not null references public.coppe(id) on delete cascade,
 turno integer not null check(turno between 1 and 5),
 a text not null references public.members(id), b text references public.members(id),
 game_id text references public.games(id), vincitore text, play_id text,
 inserito_da uuid, aggiornato_at timestamptz,
 constraint ci_ab check(a<>b),
 constraint ci_vinc check(vincitore is null or vincitore=a or vincitore=b),
 constraint ci_bye check((b is null)=(game_id is null)),
 constraint ci_bye_win check(b is not null or vincitore=a));
create unique index if not exists ci_turno_a on public.coppa_incontri(coppa_id,turno,a);
create unique index if not exists ci_turno_b on public.coppa_incontri(coppa_id,turno,b) where b is not null;
create unique index if not exists ci_no_rivincita on public.coppa_incontri(coppa_id,least(a,b),greatest(a,b)) where b is not null;
create unique index if not exists ci_un_bye on public.coppa_incontri(coppa_id,a) where b is null;
create table if not exists public.coppa_finale(
 coppa_id uuid not null references public.coppe(id) on delete cascade,
 member_id text not null references public.members(id),
 pos integer not null check(pos>=1), vinte integer not null, perse integer not null, ranking integer not null, buchholz integer not null,
 primary key(coppa_id,member_id), unique(coppa_id,pos));

-- vincolo rigido: un gioco non si ripete mai per lo stesso giocatore nella stessa Coppa; giochi solo dal pool
create or replace function public.cp_incontro_chk() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.game_id is not null then
  if not exists(select 1 from coppe c where c.id=new.coppa_id and new.game_id=any(c.pool)) then raise exception 'Gioco fuori dal pool della Coppa'; end if;
  if exists(select 1 from coppa_incontri i where i.coppa_id=new.coppa_id and i.id<>new.id and i.game_id=new.game_id
            and (i.a in (new.a,new.b) or i.b in (new.a,new.b))) then raise exception 'Gioco già giocato da uno dei due in questa Coppa'; end if;
 end if;
 if not exists(select 1 from coppa_iscritti s where s.coppa_id=new.coppa_id and s.member_id=new.a)
  or (new.b is not null and not exists(select 1 from coppa_iscritti s where s.coppa_id=new.coppa_id and s.member_id=new.b)) then raise exception 'Giocatore non iscritto'; end if;
 return new; end $$;
drop trigger if exists cp_incontro_chk on public.coppa_incontri;
create trigger cp_incontro_chk before insert or update of a,b,game_id on public.coppa_incontri for each row execute function public.cp_incontro_chk();

alter table public.coppe enable row level security;
alter table public.coppa_iscritti enable row level security;
alter table public.coppa_incontri enable row level security;
alter table public.coppa_finale enable row level security;
revoke all on public.coppe,public.coppa_iscritti,public.coppa_incontri,public.coppa_finale from anon,public;
revoke insert,update,delete,truncate on public.coppe,public.coppa_iscritti,public.coppa_incontri,public.coppa_finale from authenticated;
grant select on public.coppe,public.coppa_iscritti,public.coppa_incontri,public.coppa_finale to authenticated;
drop policy if exists coppe_read on public.coppe; create policy coppe_read on public.coppe for select to authenticated using(stato<>'bozza' or public.is_staff());
drop policy if exists cpi_read on public.coppa_iscritti; create policy cpi_read on public.coppa_iscritti for select to authenticated using(exists(select 1 from public.coppe c where c.id=coppa_id and (c.stato<>'bozza' or public.is_staff())));
drop policy if exists cpm_read on public.coppa_incontri; create policy cpm_read on public.coppa_incontri for select to authenticated using(exists(select 1 from public.coppe c where c.id=coppa_id and (c.stato<>'bozza' or public.is_staff())));
drop policy if exists cpf_read on public.coppa_finale; create policy cpf_read on public.coppa_finale for select to authenticated using(exists(select 1 from public.coppe c where c.id=coppa_id and (c.stato<>'bozza' or public.is_staff())));
-- nessuna policy di scrittura: tutte le modifiche passano dalle RPC SECURITY DEFINER sotto

create or replace function public.cp_me() returns text language sql stable security definer set search_path=public as
$$ select id from members where user_id=auth.uid() and user_id is not null and active order by id limit 1 $$;
create or replace function public.cp_roman(n integer) returns text language plpgsql immutable as $$
declare v int[]:=array[1000,900,500,400,100,90,50,40,10,9,5,4,1]; r text[]:=array['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I']; o text:=''; i int;
begin for i in 1..13 loop while n>=v[i] loop o:=o||r[i]; n:=n-v[i]; end loop; end loop; return o; end $$;
create or replace function public.member_xp_base()
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
 'sfavorito',jsonb_build_array(sf_u,15*sf_u)) from x $function$;-- classifica: vinte, perse, ranking Elo-like (parte 1000, K=32; vincere dà sempre punti), Buchholz; xp = spareggio NASCOSTO (mai restituito ai client)
create or replace function public.cp_stand(p uuid) returns table(member_id text,vinte integer,perse integer,elo integer,buch integer,xp integer)
language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
declare r record; e jsonb:='{}'; ea float8; eb float8; d float8; w text; l text;
begin
 for r in select c.vincitore,c.a,c.b from coppa_incontri c where c.coppa_id=p and c.b is not null and c.vincitore is not null order by c.turno loop
  w:=r.vincitore; l:=case when r.vincitore=r.a then r.b else r.a end;
  ea:=coalesce((e->>w)::float8,1000); eb:=coalesce((e->>l)::float8,1000);
  d:=greatest(1,32*(1-1/(1+power(10,(eb-ea)/400))));
  e:=e||jsonb_build_object(w,ea+d,l,eb-d);
 end loop;
 return query
 with s as (select i.member_id m from coppa_iscritti i where i.coppa_id=p),
 v as (select s.m, (count(c.id) filter(where c.vincitore=s.m))::int vin, (count(c.id) filter(where c.vincitore is not null and c.vincitore<>s.m))::int per
       from s left join coppa_incontri c on c.coppa_id=p and (c.a=s.m or c.b=s.m) group by s.m),
 bu as (select s.m, coalesce(sum(v2.vin),0)::int bb from s left join coppa_incontri c on c.coppa_id=p and c.b is not null and (c.a=s.m or c.b=s.m)
       left join v v2 on v2.m=case when c.a=s.m then c.b else c.a end group by s.m)
 select v.m, v.vin, v.per, round(coalesce((e->>v.m)::numeric,1000))::int, bu.bb, coalesce(x.xp,0)::int
 from v join bu on bu.m=v.m left join public.member_xp_base() x on x.member_id=v.m;
end $$;

-- ordine: vittorie, poi scontro diretto (mini-classifica tra i pari vittorie), ranking, Buchholz, (EXP nascosto), id
create or replace function public.cp_ordine(p uuid) returns table(member_id text,pos integer,vinte integer,perse integer,elo integer,buch integer,h2h integer)
language sql stable security definer set search_path=public as $$
 with s as (select * from public.cp_stand(p)),
 h as (select s.member_id, (count(c.id) filter(where c.vincitore=s.member_id and o.member_id is not null))::int h from s
   left join coppa_incontri c on c.coppa_id=p and c.b is not null and (c.a=s.member_id or c.b=s.member_id)
   left join s o on o.member_id=case when c.a=s.member_id then c.b else c.a end and o.vinte=s.vinte group by s.member_id)
 select s.member_id,(row_number() over(order by s.vinte desc,h.h desc,s.elo desc,s.buch desc,s.xp desc,s.member_id))::int,s.vinte,s.perse,s.elo,s.buch,h.h
 from s join h on h.member_id=s.member_id order by 2 $$;

-- giochi ancora disponibili per entrambi (pool − giochi già fatti da A o da B in questa Coppa)
create or replace function public.cp_liberi(p uuid,pa text,pb text) returns text[] language sql stable security definer set search_path=public as $$
 select coalesce(array_agg(g),'{}') from (select unnest(c.pool) g from coppe c where c.id=p) q
 where exists(select 1 from games where id=q.g) and not exists(select 1 from coppa_incontri i where i.coppa_id=p and i.game_id=q.g and (i.a in (pa,pb) or i.b in (pa,pb))) $$;

-- scelta gioco: favorisce nettamente chi ha meno vittorie; a pari vittorie il più equilibrato; evita giochi con tante sconfitte
create or replace function public.cp_gioco(p uuid,pa text,pb text,va integer,vb integer,t integer) returns text language sql stable security definer set search_path=public as $$
 with cand as (select unnest(public.cp_liberi(p,pa,pb)) g),
 st as (select pl.game_id g,e->>'memberId' m,count(*)::float8 n,(count(*) filter(where e->>'winner'='true'))::float8 w
   from plays pl cross join lateral jsonb_array_elements(pl.players) e
   where pl.game_id in (select g from cand) and not coalesce(pl.coop,false) and e->>'memberId' in (pa,pb) group by 1,2),
 sc as (select cand.g,(coalesce(sa.w,0)+1)/(coalesce(sa.n,0)+2) ra,(coalesce(sb.w,0)+1)/(coalesce(sb.n,0)+2) rb,
   coalesce(sa.n-sa.w,0) la,coalesce(sb.n-sb.w,0) lb from cand left join st sa on sa.g=cand.g and sa.m=pa left join st sb on sb.g=cand.g and sb.m=pb)
 select g from sc order by
   3*sign(vb-va)*(ra-rb)            -- favorito chi ha meno vittorie
   -abs(ra-rb)                       -- equilibrio
   -0.5*((la>=3 and ra<0.3)::int+(lb>=3 and rb<0.3)::int) desc,   -- evita giochi "maledetti"
   md5(p::text||t||pa||pb||g) limit 1 $$;

-- backtracking: abbina tutti senza rivincite e con almeno un gioco libero comune
create or replace function public.cp_bt(p uuid,rem text[],inf jsonb) returns text[] language plpgsql volatile security definer set search_path=public as $$
declare x text; y text; r text[]; rest text[]; n int;
begin
 if coalesce(cardinality(rem),0)=0 then return '{}'; end if;
 n:=coalesce(nullif(current_setting('cp.n',true),''),'0')::int+1; perform set_config('cp.n',n::text,true);
 if n>50000 then return null; end if;
 x:=rem[1];
 for y in select u from unnest(rem[2:]) u
   where not exists(select 1 from coppa_incontri i where i.coppa_id=p and i.b is not null and least(i.a,i.b)=least(x,u) and greatest(i.a,i.b)=greatest(x,u))
     and cardinality(public.cp_liberi(p,x,u))>0
   order by abs((inf->x->>'v')::int-(inf->u->>'v')::int),abs((inf->x->>'e')::int-(inf->u->>'e')::int)+abs((inf->x->>'x')::int-(inf->u->>'x')::int)/10.0,array_position(rem,u) loop
  rest:=array(select u from unnest(rem[2:]) u where u<>y);
  r:=public.cp_bt(p,rest,inf);
  if r is not null then return array[x,y]||r; end if;
 end loop;
 return null; end $$;

create or replace function public.cp_genera(p uuid,t integer) returns void language plpgsql volatile security definer set search_path=public as $$
declare ord text[]; inf jsonb; r text[]; bye text; c text; i int;
begin
 select array_agg(member_id order by vinte desc,elo desc,xp desc,member_id),
        jsonb_object_agg(member_id,jsonb_build_object('v',vinte,'e',elo,'x',xp)) into ord,inf from public.cp_stand(p);
 perform set_config('cp.n','0',true);
 if cardinality(ord)%2=1 then
  for c in select u from unnest(ord) with ordinality q(u,k) where not exists(select 1 from coppa_incontri b where b.coppa_id=p and b.a=q.u and b.b is null) order by k desc loop
   r:=public.cp_bt(p,array_remove(ord,c),inf);
   if r is not null then bye:=c; exit; end if;
  end loop;
 else r:=public.cp_bt(p,ord,inf); end if;
 if r is null then raise exception 'Nessun abbinamento valido (rivincite o giochi esauriti): aggiungi giochi al pool'; end if;
 if bye is not null then insert into coppa_incontri(coppa_id,turno,a,vincitore) values(p,t,bye,bye); end if;
 i:=1; while i<cardinality(r) loop
  insert into coppa_incontri(coppa_id,turno,a,b,game_id) values(p,t,r[i],r[i+1],
    public.cp_gioco(p,r[i],r[i+1],(inf->r[i]->>'v')::int,(inf->r[i+1]->>'v')::int,t));
  i:=i+2; end loop;
end $$;
create or replace function public.cp_pool_ok(p_pool text[],p_formato text) returns text[] language plpgsql stable security definer set search_path=public as $$
declare q text[];
begin
 if p_formato is null or p_formato not in ('1v1','4p') then raise exception 'Formato non valido'; end if;
 q:=array(select distinct g from unnest(coalesce(p_pool,'{}')) g where g is not null);
 if cardinality(q)>60 then raise exception 'Pool troppo grande (max 60)'; end if;
 if exists(select 1 from unnest(q) g where g!~'^[A-Za-z0-9_-]{1,40}$' or not exists(select 1 from games x where x.id=g and not coalesce(x.coop,false) and not coalesce(x.is_expansion,false)
    and coalesce(x.min_players,1)<=case when p_formato='1v1' then 2 else 4 end and coalesce(x.max_players,99)>=case when p_formato='1v1' then 2 else 4 end))
 then raise exception 'Pool: gioco non valido per questo formato'; end if;
 return q; end $$;

create or replace function public.coppa_crea(p_turni integer,p_pool text[],p_formato text default '1v1') returns uuid
language plpgsql security definer set search_path=public as $$
declare q text[]; nid uuid;
begin
 if auth.uid() is null or not public.is_staff() then raise exception 'Solo lo staff può creare la Coppa'; end if;
 if p_turni is null or p_turni not between 1 and 5 then raise exception 'Turni: da 1 a 5'; end if;
 if exists(select 1 from coppe where stato<>'concluso') then raise exception 'C''è già una Coppa Antero non conclusa'; end if;
 q:=public.cp_pool_ok(p_pool,p_formato);
 insert into coppe(edizione,formato,turni,pool,created_by) values((select coalesce(max(edizione),0)+1 from coppe),p_formato,p_turni,q,auth.uid()) returning id into nid;
 return nid; end $$;

create or replace function public.coppa_config(p uuid,p_turni integer,p_pool text[],p_formato text) returns void
language plpgsql security definer set search_path=public as $$
declare c coppe; q text[];
begin
 if auth.uid() is null or not public.is_staff() then raise exception 'Solo staff'; end if;
 select * into c from coppe where id=p for update; if not found then raise exception 'Coppa inesistente'; end if;
 if p_turni is null or p_turni not between 1 and 5 then raise exception 'Turni: da 1 a 5'; end if;
 q:=public.cp_pool_ok(p_pool,p_formato);
 if c.stato='concluso' then raise exception 'Coppa conclusa'; end if;
 if c.stato='in_corso' then
  if p_formato<>c.formato then raise exception 'Formato non modificabile a torneo iniziato'; end if;
  if not (c.pool <@ q) then raise exception 'A torneo iniziato si possono solo aggiungere giochi'; end if;
  if p_turni<c.turno then raise exception 'Turni già giocati: %',c.turno; end if;
 end if;
 update coppe set turni=p_turni,pool=q,formato=p_formato where id=p; end $$;

create or replace function public.coppa_apri(p uuid) returns void language plpgsql security definer set search_path=public as $$
declare c coppe;
begin
 if auth.uid() is null or not public.is_staff() then raise exception 'Solo staff'; end if;
 select * into c from coppe where id=p for update;
 if not found or c.stato<>'bozza' then raise exception 'La Coppa non è in bozza'; end if;
 if c.formato<>'1v1' then raise exception 'Formato a 4 giocatori in arrivo: per ora solo 1 contro 1'; end if;
 if cardinality(c.pool)<c.turni then raise exception 'Il pool (%) deve avere almeno tanti giochi quanti i turni (%)',cardinality(c.pool),c.turni; end if;
 update coppe set stato='iscrizioni' where id=p; end $$;

create or replace function public.coppa_iscrivi(p uuid,p_member text default null,p_esci boolean default false) returns void
language plpgsql security definer set search_path=public as $$
declare m text:=public.cp_me(); c coppe;
begin
 if auth.uid() is null then raise exception 'Accedi per iscriverti'; end if;
 if p_member is not null and p_member is distinct from m then
  if not public.is_staff() then raise exception 'Puoi iscrivere solo te stesso'; end if; m:=p_member; end if;
 if m is null then raise exception 'Il tuo account non è collegato a un socio'; end if;
 select * into c from coppe where id=p for update;
 if not found or c.stato<>'iscrizioni' then raise exception 'Iscrizioni chiuse'; end if;
 if p_esci then delete from coppa_iscritti where coppa_id=p and member_id=m; return; end if;
 if not exists(select 1 from members where id=m and active) then raise exception 'Socio non attivo'; end if;
 if (select count(*) from coppa_iscritti where coppa_id=p)>=64 then raise exception 'Coppa piena'; end if;
 insert into coppa_iscritti(coppa_id,member_id) values(p,m) on conflict do nothing; end $$;

create or replace function public.coppa_avvia(p uuid) returns void language plpgsql security definer set search_path=public as $$
declare c coppe;
begin
 if auth.uid() is null or not public.is_staff() then raise exception 'Solo staff'; end if;
 select * into c from coppe where id=p for update;
 if not found or c.stato<>'iscrizioni' then raise exception 'Iscrizioni non aperte'; end if;
 if (select count(*) from coppa_iscritti where coppa_id=p)<2 then raise exception 'Servono almeno 2 iscritti'; end if;
 if cardinality(c.pool)<c.turni then raise exception 'Pool più piccolo dei turni'; end if;
 update coppe set stato='in_corso',turno=1 where id=p;
 perform public.cp_genera(p,1); end $$;

create or replace function public.coppa_risultato(p_incontro uuid,p_vincitore text) returns void language plpgsql security definer set search_path=public as $$
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
   'Coppa Antero '||public.cp_roman(c.edizione)||' · turno '||i.turno); end if;
 update coppa_incontri set vincitore=p_vincitore,play_id=pid,inserito_da=auth.uid(),aggiornato_at=now() where id=i.id; end $$;

create or replace function public.coppa_avanza(p uuid) returns void language plpgsql security definer set search_path=public as $$
declare c coppe;
begin
 if auth.uid() is null or not public.is_staff() then raise exception 'Solo staff'; end if;
 select * into c from coppe where id=p for update;
 if not found or c.stato<>'in_corso' then raise exception 'Coppa non in corso'; end if;
 if exists(select 1 from coppa_incontri where coppa_id=p and turno=c.turno and vincitore is null) then raise exception 'Mancano risultati nel turno'; end if;
 if c.turno<c.turni then update coppe set turno=c.turno+1 where id=p; perform public.cp_genera(p,c.turno+1); return; end if;
 insert into coppa_finale(coppa_id,member_id,pos,vinte,perse,ranking,buchholz) select p,member_id,pos,vinte,perse,elo,buch from public.cp_ordine(p);
 update coppe set stato='concluso',concluso_at=now(),campione=(select member_id from coppa_finale where coppa_id=p and pos=1) where id=p; end $$;

create or replace function public.coppa_elimina(p uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.is_staff() then raise exception 'Solo staff'; end if;
 if not exists(select 1 from coppe where id=p and stato in ('bozza','iscrizioni')) then raise exception 'Si elimina solo prima dell''inizio'; end if;
 delete from coppe where id=p; end $$;

-- lettura per i client (nessun dato EXP esposto)
create or replace function public.coppa_vista(p uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select case when auth.uid() is null or not exists(select 1 from coppe x where x.id=p and (x.stato<>'bozza' or public.is_staff())) then null else jsonb_build_object(
  'coppa',(select to_jsonb(c)-'created_by' from coppe c where c.id=p),
  'iscritti',coalesce((select jsonb_agg(member_id order by created_at) from coppa_iscritti where coppa_id=p),'[]'),
  'incontri',coalesce((select jsonb_agg(jsonb_build_object('id',id,'turno',turno,'a',a,'b',b,'game_id',game_id,'vincitore',vincitore,'play_id',play_id) order by turno,a) from coppa_incontri where coppa_id=p),'[]'),
  'classifica',coalesce((select jsonb_agg(jsonb_build_object('member_id',member_id,'pos',pos,'vinte',vinte,'perse',perse,'ranking',elo,'buchholz',buch) order by pos) from public.cp_ordine(p)),'[]'),
  'me',public.cp_me(),'staff',public.is_staff()) end $$;
create or replace function public.coppa_lista() returns jsonb language sql stable security definer set search_path=public as $$
 select case when auth.uid() is null then null else jsonb_build_object(
  'coppe',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'edizione',c.edizione,'stato',c.stato,'turni',c.turni,'turno',c.turno,'formato',c.formato,'campione',c.campione,'concluso_at',c.concluso_at,
     'data_inizio',c.data_inizio,'data_fine',c.data_fine,'iscritti',(select count(*) from coppa_iscritti i where i.coppa_id=c.id)) order by c.edizione desc) from coppe c where c.stato<>'bozza' or public.is_staff()),'[]'),
  'finali',coalesce((select jsonb_agg(jsonb_build_object('c',f.coppa_id,'m',f.member_id,'pos',f.pos,'v',f.vinte,'p',f.perse,'r',f.ranking,'b',f.buchholz)) from coppa_finale f),'[]'),
  'incontri',coalesce((select jsonb_agg(jsonb_build_object('c',i.coppa_id,'t',i.turno,'a',i.a,'b',i.b,'w',i.vincitore)) from coppa_incontri i join coppe c on c.id=i.coppa_id and c.stato='concluso'),'[]'),
  'me',public.cp_me(),'staff',public.is_staff()) end $$;

do $$ declare f text; begin
 foreach f in array array['cp_me()','cp_roman(integer)','cp_stand(uuid)','cp_ordine(uuid)','cp_liberi(uuid,text,text)','cp_gioco(uuid,text,text,integer,integer,integer)','cp_bt(uuid,text[],jsonb)','cp_genera(uuid,integer)','cp_pool_ok(text[],text)','cp_incontro_chk()','member_xp_base()',
   'coppa_crea(integer,text[],text)','coppa_config(uuid,integer,text[],text)','coppa_apri(uuid)','coppa_iscrivi(uuid,text,boolean)','coppa_avvia(uuid)','coppa_risultato(uuid,text)','coppa_avanza(uuid)','coppa_elimina(uuid)','coppa_vista(uuid)','coppa_lista()'] loop
  execute 'revoke all on function public.'||f||' from public,anon'; end loop;
 foreach f in array array['coppa_crea(integer,text[],text)','coppa_config(uuid,integer,text[],text)','coppa_apri(uuid)','coppa_iscrivi(uuid,text,boolean)','coppa_avvia(uuid)','coppa_risultato(uuid,text)','coppa_avanza(uuid)','coppa_elimina(uuid)','coppa_vista(uuid)','coppa_lista()'] loop
  execute 'grant execute on function public.'||f||' to authenticated'; end loop; end $$;
-- EXP Coppa: si aggiunge SOLO a chi ha partecipato a una Coppa conclusa (per tutti gli altri member_xp = member_xp_base, invariato)
-- +50 per Coppa giocata, +150 campione, +100 per ogni badge della Coppa
create or replace function public.member_xp()
 returns table(member_id text, xp integer, level integer, dettaglio jsonb)
 language sql stable security definer set search_path to 'public'
as $function$
with b as (select * from public.member_xp_base()),
f as (select f.member_id mid,f.pos,c.turni,
   (select count(*) from coppa_incontri i where i.coppa_id=f.coppa_id and i.b is not null and f.member_id in (i.a,i.b) and i.vincitore<>f.member_id) perse,
   exists(select 1 from coppa_incontri i where i.coppa_id=f.coppa_id and i.turno=1 and i.b is not null and f.member_id in (i.a,i.b) and i.vincitore<>f.member_id) r1,
   exists(select 1 from coppa_incontri i join coppa_finale w on w.coppa_id=i.coppa_id and w.pos=1 where i.coppa_id=f.coppa_id and i.b is not null
          and i.vincitore=f.member_id and w.member_id in (i.a,i.b) and w.member_id<>f.member_id) giant
  from coppa_finale f join coppe c on c.id=f.coppa_id and c.stato='concluso'),
k as (select mid,count(*)::int n,(count(*) filter(where pos=1))::int camp,
   (1+bool_or(pos<=3)::int+bool_or(pos=1)::int+bool_or(perse=0 and turni>=3)::int+bool_or(giant)::int+bool_or(r1 and pos<=3)::int+(count(*)>=3)::int) bad
  from f group by mid),
x as (select b.*,k.mid,k.n,k.camp,k.bad,(b.xp+coalesce(50*k.n+150*k.camp+100*k.bad,0))::int tot from b left join k on k.mid=b.member_id)
select member_id,tot,case when mid is null then level else public.level_for_xp(tot) end,
 case when mid is null then dettaglio else dettaglio||jsonb_build_object('coppa',jsonb_build_array(n,50*n),'coppa_campione',jsonb_build_array(camp,150*camp),
   'badge',jsonb_build_array((dettaglio->'badge'->>0)::int+bad,(dettaglio->'badge'->>1)::int+100*bad)) end
from x $function$;
revoke all on function public.member_xp() from public,anon;
grant execute on function public.member_xp() to authenticated;

create or replace function public.coppa_date(p uuid,p_inizio date,p_fine date,p_scadenze date[] default '{}') returns void
language plpgsql security definer set search_path=public as $$
declare c coppe; d date; k int:=0; prev date;
begin
 if auth.uid() is null or not public.is_staff() then raise exception 'Solo staff'; end if;
 select * into c from coppe where id=p for update; if not found then raise exception 'Coppa inesistente'; end if;
 if c.stato='concluso' then raise exception 'Coppa conclusa'; end if;
 if p_inizio is not null and p_fine is not null and p_fine<p_inizio then raise exception 'La data di fine deve essere uguale o successiva all''inizio'; end if;
 if p_inizio is not null and p_fine is not null and p_fine>p_inizio+366 then raise exception 'Durata massima: un anno'; end if;
 p_scadenze:=coalesce(p_scadenze,'{}');
 if cardinality(p_scadenze)>c.turni then raise exception 'Più scadenze che turni'; end if;
 foreach d in array p_scadenze loop k:=k+1;
  if d is null then continue; end if;
  if (p_inizio is not null and d<p_inizio) or (p_fine is not null and d>p_fine) then raise exception 'Scadenza del turno % fuori dalle date della Coppa',k; end if;
  if prev is not null and d<prev then raise exception 'Le scadenze dei turni devono essere in ordine'; end if; prev:=d; end loop;
 update coppe set data_inizio=p_inizio,data_fine=p_fine,scadenze=p_scadenze where id=p; end $$;
revoke all on function public.coppa_date(uuid,date,date,date[]) from public,anon;
grant execute on function public.coppa_date(uuid,date,date,date[]) to authenticated;
