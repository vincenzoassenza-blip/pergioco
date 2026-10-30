-- v35 · Coppa Antero a tavoli (3-4 giocatori) e misto (2-4). Le Coppe 1 contro 1 restano identiche. Idempotente.
alter table public.coppe drop constraint if exists coppe_formato_check;
alter table public.coppe add constraint coppe_formato_check check(formato in ('1v1','4p','tavoli','misto'));
alter table public.coppa_finale add column if not exists punti numeric(6,1), add column if not exists primi integer;

create or replace function public.cp_key(m text[]) returns text language sql immutable as $$ select array_to_string(array(select x from unnest(m) x order by x),'|') $$;
create table if not exists public.coppa_tavoli(
 id uuid primary key default gen_random_uuid(),
 coppa_id uuid not null references public.coppe(id) on delete cascade,
 turno integer not null check(turno between 1 and 5),
 membri text[] not null check(cardinality(membri) between 1 and 4 and array_position(membri,null) is null),
 game_id text references public.games(id), posizioni jsonb, play_id text,
 inserito_da uuid, aggiornato_at timestamptz,
 constraint ct_bye check((cardinality(membri)=1)=(game_id is null)),
 constraint ct_pos check(posizioni is null or (jsonb_typeof(posizioni)='object' and octet_length(posizioni::text)<=600)));
create unique index if not exists ct_no_tavolo_uguale on public.coppa_tavoli(coppa_id,public.cp_key(membri)) where cardinality(membri)>=2;
create unique index if not exists ct_un_bye on public.coppa_tavoli(coppa_id,(membri[1])) where cardinality(membri)=1;
create index if not exists ct_coppa on public.coppa_tavoli(coppa_id,turno);

create or replace function public.cp_tavolo_chk() returns trigger language plpgsql security definer set search_path=public as $$
declare c coppe; s int:=cardinality(new.membri); m text;
begin
 select * into c from coppe where id=new.coppa_id;
 if c.formato not in ('tavoli','misto','4p') then raise exception 'Questa Coppa è 1 contro 1'; end if;
 if (select count(distinct x) from unnest(new.membri) x)<>s then raise exception 'Giocatore ripetuto nel tavolo'; end if;
 if s=2 and c.formato<>'misto' then raise exception 'Tavoli da 2 solo nel formato misto'; end if;
 foreach m in array new.membri loop
  if not exists(select 1 from coppa_iscritti i where i.coppa_id=new.coppa_id and i.member_id=m) then raise exception 'Giocatore non iscritto'; end if;
  if exists(select 1 from coppa_tavoli t where t.coppa_id=new.coppa_id and t.turno=new.turno and t.id<>new.id and m=any(t.membri)) then raise exception 'Giocatore già in un tavolo di questo turno'; end if;
 end loop;
 if new.game_id is not null then
  if not new.game_id=any(c.pool) then raise exception 'Gioco fuori dal pool della Coppa'; end if;
  if not exists(select 1 from games g where g.id=new.game_id and coalesce(g.min_players,1)<=s and coalesce(g.max_players,99)>=s) then raise exception 'Gioco non adatto a % giocatori',s; end if;
  if exists(select 1 from coppa_tavoli t where t.coppa_id=new.coppa_id and t.id<>new.id and t.game_id=new.game_id and t.membri && new.membri) then raise exception 'Gioco già giocato da uno dei giocatori in questa Coppa'; end if;
 end if;
 return new; end $$;
drop trigger if exists cp_tavolo_chk on public.coppa_tavoli;
create trigger cp_tavolo_chk before insert or update of membri,game_id on public.coppa_tavoli for each row execute function public.cp_tavolo_chk();

alter table public.coppa_tavoli enable row level security;
revoke all on public.coppa_tavoli from anon,public;
revoke insert,update,delete,truncate on public.coppa_tavoli from authenticated;
grant select on public.coppa_tavoli to authenticated;
drop policy if exists cpt_read on public.coppa_tavoli; create policy cpt_read on public.coppa_tavoli for select to authenticated using(exists(select 1 from public.coppe c where c.id=coppa_id and (c.stato<>'bozza' or public.is_staff())));

-- punti per posizione (pari merito: media dei punti delle posizioni occupate); riposo = 1,5
create or replace function public.cp_pt(s int,q int,k int) returns numeric language sql immutable as $$
 select case when s<=1 then 1.5 else (select avg(v) from unnest(case s when 4 then array[3,2,1,0]::numeric[] when 3 then array[3,1.5,0]::numeric[] else array[3,0]::numeric[] end) with ordinality u(v,i) where i between q and q+k-1) end $$;
create or replace function public.cp_righe(p uuid) returns table(tid uuid,turno int,m text,s int,q int,k int,pt numeric)
language sql stable security definer set search_path=public as $$
 with r as (select t.id,t.turno,x m,cardinality(t.membri) s,case when cardinality(t.membri)=1 then 1 else (t.posizioni->>x)::int end q,t.posizioni
            from coppa_tavoli t cross join lateral unnest(t.membri) x where t.coppa_id=p and (cardinality(t.membri)=1 or t.posizioni is not null))
 select r.id,r.turno,r.m,r.s,r.q,(select count(*) from r r2 where r2.id=r.id and r2.q=r.q)::int,null::numeric from r $$;

create or replace function public.cp_stand_t(p uuid) returns table(member_id text,punti numeric,primi integer,tavoli integer,elo integer,buch numeric,xp integer)
language plpgsql stable security definer set search_path=public as $$
#variable_conflict use_column
declare t record; a record; b record; e jsonb:='{}'; d jsonb; ea float8; eb float8; sa float8; kk float8;
begin
 for t in select distinct tid,turno,s from public.cp_righe(p) where s>=2 order by turno,tid loop
  d:='{}'; kk:=32.0/(t.s-1);
  for a in select * from public.cp_righe(p) where tid=t.tid loop
   for b in select * from public.cp_righe(p) where tid=t.tid and m<>a.m loop
    ea:=coalesce((e->>a.m)::float8,1000); eb:=coalesce((e->>b.m)::float8,1000);
    sa:=case when a.q<b.q then 1 when a.q=b.q then .5 else 0 end;
    d:=d||jsonb_build_object(a.m,coalesce((d->>a.m)::float8,0)+kk*(sa-1/(1+power(10,(eb-ea)/400))));
   end loop; end loop;
  for a in select key k,value::float8 v from jsonb_each_text(d) loop e:=e||jsonb_build_object(a.k,coalesce((e->>a.k)::float8,1000)+a.v); end loop;
 end loop;
 return query
 with s as (select i.member_id mm from coppa_iscritti i where i.coppa_id=p),
 r as (select x.*,public.cp_pt(x.s,x.q,x.k) pp from public.cp_righe(p) x),
 v as (select s.mm,coalesce(sum(r.pp),0) pu,(count(r.tid) filter(where r.s>=2 and r.q=1))::int pr,(count(r.tid) filter(where r.s>=2))::int tv from s left join r on r.m=s.mm group by s.mm),
 bu as (select s.mm,coalesce(sum(v2.pu),0) bb from s left join r on r.m=s.mm and r.s>=2 left join r o on o.tid=r.tid and o.m<>s.mm left join v v2 on v2.mm=o.m group by s.mm)
 select v.mm,v.pu,v.pr,v.tv,round(coalesce((e->>v.mm)::numeric,1000))::int,bu.bb,coalesce(x.xp,0)::int
 from v join bu on bu.mm=v.mm left join public.member_xp_base() x on x.member_id=v.mm;
end $$;
create or replace function public.cp_ordine_t(p uuid) returns table(member_id text,pos integer,punti numeric,primi integer,tavoli integer,elo integer,buch numeric)
language sql stable security definer set search_path=public as $$
 select s.member_id,(row_number() over(order by s.punti desc,s.primi desc,s.elo desc,s.buch desc,s.xp desc,s.member_id))::int,s.punti,s.primi,s.tavoli,s.elo,s.buch
 from public.cp_stand_t(p) s order by 2 $$;

-- giochi liberi per un tavolo: nel pool, adatti al numero di giocatori, mai giocati da nessuno di loro in questa Coppa
create or replace function public.cp_liberi_t(p uuid,mm text[]) returns text[] language sql stable security definer set search_path=public as $$
 select coalesce(array_agg(q.g order by q.g),'{}') from (select unnest(c.pool) g from coppe c where c.id=p) q join games x on x.id=q.g
 where coalesce(x.min_players,1)<=cardinality(mm) and coalesce(x.max_players,99)>=cardinality(mm)
   and not exists(select 1 from coppa_tavoli t where t.coppa_id=p and t.game_id=q.g and t.membri && mm) $$;
-- scelta gioco: come la Sfida equilibrata, pesa di più chi ha meno punti nella Coppa; poi equilibrio; evita giochi "maledetti"
create or replace function public.cp_gioco_t(p uuid,mm text[],inf jsonb,t integer) returns text language sql stable security definer set search_path=public as $$
 with cand as (select unnest(public.cp_liberi_t(p,mm)) g),
 mx as (select max((inf->u->>'v')::numeric) mv from unnest(mm) u),
 st as (select pl.game_id g,e->>'memberId' m,count(*)::float8 n,(count(*) filter(where e->>'winner'='true'))::float8 w
   from plays pl cross join lateral jsonb_array_elements(pl.players) e
   where pl.game_id in (select g from cand) and not coalesce(pl.coop,false) and e->>'memberId'=any(mm) group by 1,2),
 r as (select cand.g,u m,(coalesce(st.w,0)+1)/(coalesce(st.n,0)+2) ra,coalesce(st.n-st.w,0) l,((select mv from mx)-(inf->u->>'v')::numeric)::float8 wt
   from cand cross join unnest(mm) u left join st on st.g=cand.g and st.m=u),
 sc as (select g,sum(wt*(ra-(select avg(r2.ra) from r r2 where r2.g=r.g))) fav,coalesce(stddev_pop(ra),0) sd,sum((l>=3 and ra<0.3)::int) cur from r group by g)
 select g from sc order by 3*fav-sd-0.5*cur desc,md5(p::text||t||array_to_string(mm,',')||g) limit 1 $$;

-- costo di un tavolo: identico a uno già giocato o senza giochi = vietato; coppie ripetute; distanza di classifica
create or replace function public.cp_tcost(p uuid,mm text[],inf jsonb) returns numeric language sql stable security definer set search_path=public as $$
 select case when cardinality(mm)>=2 and exists(select 1 from coppa_tavoli t where t.coppa_id=p and public.cp_key(t.membri)=public.cp_key(mm)) then 1e7
   when cardinality(mm)>=2 and cardinality(public.cp_liberi_t(p,mm))=0 then 1e7 else 0 end
  +100*(select count(*) from coppa_tavoli t,unnest(mm) a,unnest(mm) b where t.coppa_id=p and a<b and a=any(t.membri) and b=any(t.membri) and cardinality(t.membri)>=2)
  +coalesce((select 4*(max((inf->u->>'v')::numeric)-min((inf->u->>'v')::numeric))+(max((inf->u->>'i')::numeric)-min((inf->u->>'i')::numeric))/2.0 from unnest(mm) u),0) $$;
create or replace function public.cp_sizes(n int,f text) returns int[] language plpgsql immutable as $$
begin
 if f='misto' then if n=2 then return '{2}'; elsif n=5 then return '{3,2}'; end if; end if;
 if n<3 then return null; end if;
 case n%4 when 0 then return array_fill(4,array[n/4]); when 3 then return array_fill(4,array[(n-3)/4])||array[3];
  when 2 then return array_fill(4,array[(n-6)/4])||array[3,3]; else if n<9 then return null; end if; return array_fill(4,array[(n-9)/4])||array[3,3,3]; end case; end $$;

create or replace function public.cp_genera_t(p uuid,t integer) returns void language plpgsql volatile security definer set search_path=public as $$
declare c coppe; ord text[]; inf jsonb; n int; sz int[]; bye text; a text[]; off int[]; k int; i int; j int; ti int; tj int; x text; best numeric; cur numeric; nw numeric; improved boolean; pass int:=0; tot numeric:=0;
begin
 select * into c from coppe where id=p;
 select array_agg(member_id order by punti desc,elo desc,xp desc,member_id),
   jsonb_object_agg(member_id,jsonb_build_object('v',punti,'e',elo)) into ord,inf from public.cp_stand_t(p);
 n:=cardinality(ord);
 for i in 1..n loop inf:=jsonb_set(inf,array[ord[i],'i'],to_jsonb(i)); end loop;
 sz:=public.cp_sizes(n,c.formato);
 if sz is null and c.formato<>'misto' and n=5 then
  -- 5 giocatori a tavoli: uno riposa (chi è più in basso e non ha ancora riposato)
  select u into bye from unnest(ord) with ordinality q(u,r) where not exists(select 1 from coppa_tavoli b where b.coppa_id=p and cardinality(b.membri)=1 and b.membri[1]=q.u) order by r desc limit 1;
  if bye is null then raise exception 'Nessun riposo disponibile'; end if;
  ord:=array_remove(ord,bye); n:=4; sz:='{4}';
 end if;
 if sz is null then raise exception 'Servono almeno 3 giocatori (2 nel formato misto)'; end if;
 a:=ord; off:='{}'; k:=1; foreach i in array sz loop off:=off||k; k:=k+i; end loop; off:=off||k;
 -- ricerca locale: scambi tra tavoli finché il costo totale scende
 loop pass:=pass+1; improved:=false;
  for ti in 1..cardinality(sz) loop for tj in ti+1..cardinality(sz) loop
   for i in off[ti]..off[ti+1]-1 loop for j in off[tj]..off[tj+1]-1 loop
    cur:=public.cp_tcost(p,a[off[ti]:off[ti+1]-1],inf)+public.cp_tcost(p,a[off[tj]:off[tj+1]-1],inf);
    x:=a[i]; a[i]:=a[j]; a[j]:=x;
    nw:=public.cp_tcost(p,a[off[ti]:off[ti+1]-1],inf)+public.cp_tcost(p,a[off[tj]:off[tj+1]-1],inf);
    if nw+1e-9<cur then improved:=true; else x:=a[i]; a[i]:=a[j]; a[j]:=x; end if;
   end loop; end loop; end loop; end loop;
  exit when not improved or pass>=8;
 end loop;
 for ti in 1..cardinality(sz) loop tot:=tot+public.cp_tcost(p,a[off[ti]:off[ti+1]-1],inf); end loop;
 if tot>=1e7 then raise exception 'Nessuna composizione valida (tavoli già giocati o giochi esauriti): aggiungi giochi al pool'; end if;
 if bye is not null then insert into coppa_tavoli(coppa_id,turno,membri) values(p,t,array[bye]); end if;
 for ti in 1..cardinality(sz) loop
  insert into coppa_tavoli(coppa_id,turno,membri,game_id) values(p,t,a[off[ti]:off[ti+1]-1],public.cp_gioco_t(p,a[off[ti]:off[ti+1]-1],inf,t));
 end loop;
end $$;

create or replace function public.cp_pool_ok(p_pool text[],p_formato text) returns text[] language plpgsql stable security definer set search_path=public as $$
declare q text[]; lo int; hi int;
begin
 if p_formato is null or p_formato not in ('1v1','tavoli','misto') then raise exception 'Formato non valido'; end if;
 lo:=case p_formato when '1v1' then 2 when 'tavoli' then 3 else 2 end; hi:=case p_formato when '1v1' then 2 else 4 end;
 q:=array(select distinct g from unnest(coalesce(p_pool,'{}')) g where g is not null);
 if cardinality(q)>60 then raise exception 'Pool troppo grande (max 60)'; end if;
 -- 1v1: il gioco deve ammettere 2 giocatori (come prima); tavoli/misto: almeno un numero di giocatori ammesso nel formato
 if exists(select 1 from unnest(q) g where g!~'^[A-Za-z0-9_-]{1,40}$' or not exists(select 1 from games x where x.id=g and not coalesce(x.coop,false) and not coalesce(x.is_expansion,false)
    and coalesce(x.min_players,1)<=hi and coalesce(x.max_players,99)>=lo))
 then raise exception 'Pool: gioco non valido per questo formato'; end if;
 return q; end $$;

create or replace function public.coppa_apri(p uuid) returns void language plpgsql security definer set search_path=public as $$
declare c coppe;
begin
 if auth.uid() is null or not public.is_staff() then raise exception 'Solo staff'; end if;
 select * into c from coppe where id=p for update;
 if not found or c.stato<>'bozza' then raise exception 'La Coppa non è in bozza'; end if;
 if c.formato not in ('1v1','tavoli','misto') then raise exception 'Formato non valido'; end if;
 if cardinality(c.pool)<c.turni then raise exception 'Il pool (%) deve avere almeno tanti giochi quanti i turni (%)',cardinality(c.pool),c.turni; end if;
 update coppe set stato='iscrizioni' where id=p; end $$;

create or replace function public.coppa_avvia(p uuid) returns void language plpgsql security definer set search_path=public as $$
declare c coppe; n int;
begin
 if auth.uid() is null or not public.is_staff() then raise exception 'Solo staff'; end if;
 select * into c from coppe where id=p for update;
 if not found or c.stato<>'iscrizioni' then raise exception 'Iscrizioni non aperte'; end if;
 n:=(select count(*) from coppa_iscritti where coppa_id=p);
 if n<2 then raise exception 'Servono almeno 2 iscritti'; end if;
 if c.formato='tavoli' and n<3 then raise exception 'Servono almeno 3 iscritti per i tavoli'; end if;
 -- con 2-4 iscritti esiste un solo tavolo possibile: e i tavoli identici non si ripetono mai
 if c.formato<>'1v1' and n<=4 and c.turni>1 then raise exception 'Con % iscritti c''è un solo tavolo possibile: imposta 1 turno',n; end if;
 if cardinality(c.pool)<c.turni then raise exception 'Pool più piccolo dei turni'; end if;
 update coppe set stato='in_corso',turno=1 where id=p;
 if c.formato='1v1' then perform public.cp_genera(p,1); else perform public.cp_genera_t(p,1); end if; end $$;

create or replace function public.coppa_risultato_t(p_tavolo uuid,p_pos jsonb) returns void language plpgsql security definer set search_path=public as $$
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
   'Coppa Antero '||public.cp_roman(c.edizione)||' · turno '||t.turno); end if;
 update coppa_tavoli set posizioni=p_pos,play_id=pid,inserito_da=auth.uid(),aggiornato_at=now() where id=t.id; end $$;

create or replace function public.coppa_avanza(p uuid) returns void language plpgsql security definer set search_path=public as $$
declare c coppe;
begin
 if auth.uid() is null or not public.is_staff() then raise exception 'Solo staff'; end if;
 select * into c from coppe where id=p for update;
 if not found or c.stato<>'in_corso' then raise exception 'Coppa non in corso'; end if;
 if c.formato='1v1' then
  if exists(select 1 from coppa_incontri where coppa_id=p and turno=c.turno and vincitore is null) then raise exception 'Mancano risultati nel turno'; end if;
  if c.turno<c.turni then update coppe set turno=c.turno+1 where id=p; perform public.cp_genera(p,c.turno+1); return; end if;
  insert into coppa_finale(coppa_id,member_id,pos,vinte,perse,ranking,buchholz) select p,member_id,pos,vinte,perse,elo,buch from public.cp_ordine(p);
 else
  if exists(select 1 from coppa_tavoli where coppa_id=p and turno=c.turno and cardinality(membri)>=2 and posizioni is null) then raise exception 'Mancano risultati nel turno'; end if;
  if c.turno<c.turni then update coppe set turno=c.turno+1 where id=p; perform public.cp_genera_t(p,c.turno+1); return; end if;
  insert into coppa_finale(coppa_id,member_id,pos,vinte,perse,ranking,buchholz,punti,primi) select p,member_id,pos,primi,tavoli-primi,elo,round(buch)::int,punti,primi from public.cp_ordine_t(p);
 end if;
 update coppe set stato='concluso',concluso_at=now(),campione=(select member_id from coppa_finale where coppa_id=p and pos=1) where id=p; end $$;

create or replace function public.coppa_vista(p uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select case when auth.uid() is null or not exists(select 1 from coppe x where x.id=p and (x.stato<>'bozza' or public.is_staff())) then null else jsonb_build_object(
  'coppa',(select to_jsonb(c)-'created_by' from coppe c where c.id=p),
  'iscritti',coalesce((select jsonb_agg(member_id order by created_at) from coppa_iscritti where coppa_id=p),'[]'),
  'incontri',coalesce((select jsonb_agg(jsonb_build_object('id',id,'turno',turno,'a',a,'b',b,'game_id',game_id,'vincitore',vincitore,'play_id',play_id) order by turno,a) from coppa_incontri where coppa_id=p),'[]'),
  'tavoli',coalesce((select jsonb_agg(jsonb_build_object('id',id,'turno',turno,'membri',to_jsonb(membri),'game_id',game_id,'posizioni',posizioni) order by turno,cardinality(membri) desc,membri[1]) from coppa_tavoli where coppa_id=p),'[]'),
  'classifica',case when (select formato from coppe where id=p)='1v1' then
    coalesce((select jsonb_agg(jsonb_build_object('member_id',member_id,'pos',pos,'vinte',vinte,'perse',perse,'ranking',elo,'buchholz',buch) order by pos) from public.cp_ordine(p)),'[]')
   else coalesce((select jsonb_agg(jsonb_build_object('member_id',member_id,'pos',pos,'punti',punti,'primi',primi,'tavoli',tavoli,'ranking',elo,'buchholz',buch) order by pos) from public.cp_ordine_t(p)),'[]') end,
  'me',public.cp_me(),'staff',public.is_staff()) end $$;
create or replace function public.coppa_lista() returns jsonb language sql stable security definer set search_path=public as $$
 select case when auth.uid() is null then null else jsonb_build_object(
  'coppe',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'edizione',c.edizione,'stato',c.stato,'turni',c.turni,'turno',c.turno,'formato',c.formato,'campione',c.campione,'concluso_at',c.concluso_at,
     'data_inizio',c.data_inizio,'data_fine',c.data_fine,'iscritti',(select count(*) from coppa_iscritti i where i.coppa_id=c.id)) order by c.edizione desc) from coppe c where c.stato<>'bozza' or public.is_staff()),'[]'),
  'finali',coalesce((select jsonb_agg(jsonb_build_object('c',f.coppa_id,'m',f.member_id,'pos',f.pos,'v',f.vinte,'p',f.perse,'r',f.ranking,'b',f.buchholz,'pt',f.punti)) from coppa_finale f),'[]'),
  'incontri',coalesce((select jsonb_agg(jsonb_build_object('c',i.coppa_id,'t',i.turno,'a',i.a,'b',i.b,'w',i.vincitore)) from coppa_incontri i join coppe c on c.id=i.coppa_id and c.stato='concluso'),'[]'),
  'tavoli',coalesce((select jsonb_agg(jsonb_build_object('c',t.coppa_id,'t',t.turno,'pos',t.posizioni)) from coppa_tavoli t join coppe c on c.id=t.coppa_id and c.stato='concluso' where cardinality(t.membri)>=2),'[]'),
  'me',public.cp_me(),'staff',public.is_staff()) end $$;

-- EXP: formula invariata; per le Coppe a tavoli "persa" = non primo al tavolo, "ammazzagiganti" = davanti al campione a un tavolo
create or replace function public.member_xp()
 returns table(member_id text, xp integer, level integer, dettaglio jsonb)
 language sql stable security definer set search_path to 'public'
as $function$
with b as (select * from public.member_xp_base()),
f as (select f.member_id mid,f.pos,c.turni,
   (select count(*) from coppa_incontri i where i.coppa_id=f.coppa_id and i.b is not null and f.member_id in (i.a,i.b) and i.vincitore<>f.member_id)
   +(select count(*) from coppa_tavoli t where t.coppa_id=f.coppa_id and cardinality(t.membri)>=2 and f.member_id=any(t.membri) and (t.posizioni->>f.member_id)::int>1) perse,
   exists(select 1 from coppa_incontri i where i.coppa_id=f.coppa_id and i.turno=1 and i.b is not null and f.member_id in (i.a,i.b) and i.vincitore<>f.member_id)
   or exists(select 1 from coppa_tavoli t where t.coppa_id=f.coppa_id and t.turno=1 and cardinality(t.membri)>=2 and f.member_id=any(t.membri) and (t.posizioni->>f.member_id)::int>1) r1,
   exists(select 1 from coppa_incontri i join coppa_finale w on w.coppa_id=i.coppa_id and w.pos=1 where i.coppa_id=f.coppa_id and i.b is not null
          and i.vincitore=f.member_id and w.member_id in (i.a,i.b) and w.member_id<>f.member_id)
   or exists(select 1 from coppa_tavoli t join coppa_finale w on w.coppa_id=t.coppa_id and w.pos=1 where t.coppa_id=f.coppa_id and cardinality(t.membri)>=2
          and f.member_id=any(t.membri) and w.member_id=any(t.membri) and w.member_id<>f.member_id and (t.posizioni->>f.member_id)::int<(t.posizioni->>w.member_id)::int) giant
  from coppa_finale f join coppe c on c.id=f.coppa_id and c.stato='concluso'),
k as (select mid,count(*)::int n,(count(*) filter(where pos=1))::int camp,
   (1+bool_or(pos<=3)::int+bool_or(pos=1)::int+bool_or(perse=0 and turni>=3)::int+bool_or(giant)::int+bool_or(r1 and pos<=3)::int+(count(*)>=3)::int) bad
  from f group by mid),
x as (select b.*,k.mid,k.n,k.camp,k.bad,(b.xp+coalesce(50*k.n+150*k.camp+100*k.bad,0))::int tot from b left join k on k.mid=b.member_id)
select member_id,tot,case when mid is null then level else public.level_for_xp(tot) end,
 case when mid is null then dettaglio else dettaglio||jsonb_build_object('coppa',jsonb_build_array(n,50*n),'coppa_campione',jsonb_build_array(camp,150*camp),
   'badge',jsonb_build_array((dettaglio->'badge'->>0)::int+bad,(dettaglio->'badge'->>1)::int+100*bad)) end
from x $function$;

do $$ declare f text; begin
 foreach f in array array['cp_key(text[])','cp_tavolo_chk()','cp_pt(integer,integer,integer)','cp_righe(uuid)','cp_stand_t(uuid)','cp_ordine_t(uuid)','cp_liberi_t(uuid,text[])','cp_gioco_t(uuid,text[],jsonb,integer)',
   'cp_tcost(uuid,text[],jsonb)','cp_sizes(integer,text)','cp_genera_t(uuid,integer)','cp_pool_ok(text[],text)','coppa_apri(uuid)','coppa_avvia(uuid)','coppa_risultato_t(uuid,jsonb)','coppa_avanza(uuid)',
   'coppa_vista(uuid)','coppa_lista()','member_xp()'] loop
  execute 'revoke all on function public.'||f||' from public,anon'; end loop;
 foreach f in array array['coppa_apri(uuid)','coppa_avvia(uuid)','coppa_risultato_t(uuid,jsonb)','coppa_avanza(uuid)','coppa_vista(uuid)','coppa_lista()','member_xp()'] loop
  execute 'grant execute on function public.'||f||' to authenticated'; end loop; end $$;
-- cp_key è usata dall'indice: deve restare eseguibile (immutabile, nessun dato)
grant execute on function public.cp_key(text[]) to authenticated;

-- v35 (pubblicazione): le funzioni interne cp_* non sono eseguibili dai client (Supabase concede execute di default); resta solo cp_key (indice)
do $$declare f record; begin for f in select p.oid::regprocedure s from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'cp\_%' and p.proname not in ('cp_key') loop execute format('revoke execute on function %s from public,anon,authenticated',f.s); end loop; end$$;
