-- v41.19.1: tessera nel libro soci (write-back/sync), explainer anche fuori dal tavolo.
-- Idempotente. Solo ambiente di TEST finché non arriva il via per la produzione.

-- next_tessera considera anche i numeri già nel libro soci
create or replace function public.next_tessera() returns text
language sql stable security definer set search_path=public as $$
  select coalesce((
    select s.n::text
    from generate_series(1, 100000) s(n)
    where not exists (
      select 1 from public.members m
       where m.tessera is not null
         and btrim(m.tessera) ~ '^[0-9]+$'
         and btrim(m.tessera)::int = s.n
    )
    and not exists (
      select 1 from public.libro_soci l
       where l.numero_tessera is not null
         and btrim(l.numero_tessera) ~ '^[0-9]+$'
         and btrim(l.numero_tessera)::int = s.n
    )
    limit 1
  ), '1');
$$;
revoke all on function public.next_tessera() from public, anon;
grant execute on function public.next_tessera() to authenticated;

-- manutenzione senza JWT (API di gestione) può allineare la tessera
create or replace function public.members_tessera_trg() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.tessera is not null then
    new.tessera := nullif(btrim(new.tessera), '');
  end if;
  if tg_op = 'INSERT' then
    if new.tessera is null then
      new.tessera := public.next_tessera();
    elsif not public.is_admin() and auth.uid() is not null then
      new.tessera := public.next_tessera();
    end if;
  elsif tg_op = 'UPDATE' then
    if new.tessera is distinct from old.tessera
       and not public.is_admin()
       and auth.uid() is not null then
      raise exception 'Solo un admin può modificare il numero di tessera' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.members_tessera_trg() from public, anon, authenticated;

-- Prima di libro_soci_link (il nome "assign" precede "link"): riempie e allinea la tessera
create or replace function public.libro_soci_assign_tessera() returns trigger
language plpgsql security definer set search_path=public as $$
declare mt text;
begin
  if new.numero_tessera is not null then
    new.numero_tessera := nullif(btrim(new.numero_tessera), '');
  end if;
  if (new.numero_tessera is null or new.numero_tessera = '') and new.member_id is not null then
    select nullif(btrim(m.tessera),'') into mt from public.members m where m.id = new.member_id;
    if mt is not null then new.numero_tessera := mt; end if;
  end if;
  if new.numero_tessera is null or new.numero_tessera = '' then
    new.numero_tessera := public.next_tessera();
  end if;
  if new.member_id is not null then
    update public.members m
       set tessera = new.numero_tessera
     where m.id = new.member_id
       and m.tessera is distinct from new.numero_tessera;
  end if;
  return new;
end $$;
revoke all on function public.libro_soci_assign_tessera() from public, anon, authenticated;
drop trigger if exists libro_soci_assign_tessera on public.libro_soci;
create trigger libro_soci_assign_tessera before insert or update on public.libro_soci
  for each row execute function public.libro_soci_assign_tessera();

-- Se il trigger crea un socio nuovo, la tessera assegnata torna sulla riga del libro
create or replace function public.libro_soci_link() returns trigger
language plpgsql security definer set search_path=public as $$
declare mid text; n int; tes text;
begin
 if tg_op='INSERT' then
  if new.member_id is null then
    if new.numero_tessera is not null and btrim(new.numero_tessera) <> '' then
      select count(*) into n from public.members m
       where lower(btrim(coalesce(m.tessera,''))) = lower(btrim(new.numero_tessera));
      if n = 1 then
        select m.id into mid from public.members m
         where lower(btrim(coalesce(m.tessera,''))) = lower(btrim(new.numero_tessera));
        new.member_id := mid;
      end if;
    end if;
    if new.member_id is null then
      select count(*) into n from public.members m
       where public.member_name_key(m.nome, m.cognome) = public.member_name_key(new.nome, new.cognome);
      if n = 1 then
        select m.id into mid from public.members m
         where public.member_name_key(m.nome, m.cognome) = public.member_name_key(new.nome, new.cognome);
        new.member_id := mid;
      elsif n = 0 then
        mid:=to_hex((extract(epoch from clock_timestamp())*1000)::bigint)||substr(md5(random()::text),1,6);
        insert into public.members(id,nome,cognome,active,tessera)
          values(mid,new.nome,new.cognome,new.data_uscita is null,new.numero_tessera)
          returning tessera into tes;
        new.member_id:=mid;
        if tes is not null then new.numero_tessera := tes; end if;
        insert into public.libro_audit(user_id,email,action,tabella,record_id,dettaglio)
          values(auth.uid(),auth.jwt()->>'email','create','members',mid,'Creato socio partite da Libro soci: '||new.cognome||' '||new.nome);
      end if;
    end if;
  end if;
 elsif new.member_id is not null then
  if (new.nome,new.cognome) is distinct from (old.nome,old.cognome) and new.member_id is not distinct from old.member_id then
   update public.members set nome=new.nome,cognome=new.cognome where id=new.member_id;
   insert into public.libro_audit(user_id,email,action,tabella,record_id,dettaglio)
     values(auth.uid(),auth.jwt()->>'email','update','members',new.member_id,'Nome sincronizzato da Libro soci');
  end if;
  if (new.data_uscita is null) is distinct from (old.data_uscita is null) or new.member_id is distinct from old.member_id then
   update public.members set active=(new.data_uscita is null) where id=new.member_id and active is distinct from (new.data_uscita is null);
   if found then insert into public.libro_audit(user_id,email,action,tabella,record_id,dettaglio)
     values(auth.uid(),auth.jwt()->>'email','update','members',new.member_id,case when new.data_uscita is null then 'Socio partite riattivato' else 'Socio partite disattivato (uscita)' end); end if;
  end if;
 end if;
 return new;
end $$;

-- Allinea le righe già presenti: se il socio collegato ha la tessera e il libro no, copiala
update public.libro_soci s
   set numero_tessera = btrim(m.tessera)
  from public.members m
 where s.member_id = m.id
   and (s.numero_tessera is null or btrim(s.numero_tessera) = '')
   and m.tessera is not null and btrim(m.tessera) <> '';

update public.members m
   set tessera = btrim(s.numero_tessera)
  from public.libro_soci s
 where s.member_id = m.id
   and (m.tessera is null or btrim(m.tessera) = '')
   and s.numero_tessera is not null and btrim(s.numero_tessera) <> '';

-- Explainer: può non essere un giocatore al tavolo. Resta solo staff a indicarlo.
create or replace function public.plays_explained_trg() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op = 'UPDATE' and new.explained_member_id is not distinct from old.explained_member_id then
    return new;
  end if;
  if (tg_op = 'INSERT' and new.explained_member_id is not null)
     or (tg_op = 'UPDATE' and new.explained_member_id is distinct from old.explained_member_id) then
    if not public.is_staff() then
      if tg_op = 'INSERT' then new.explained_member_id := null;
      else raise exception 'Solo lo staff può indicare chi ha spiegato il gioco' using errcode='42501';
      end if;
    end if;
  end if;
  if new.explained_member_id is not null
     and not exists (select 1 from public.members m where m.id = new.explained_member_id) then
    raise exception 'Socio non trovato';
  end if;
  return new;
end $$;
revoke all on function public.plays_explained_trg() from public, anon, authenticated;

-- XP: le spiegazioni valgono anche se chi ha spiegato non era al tavolo
create or replace function public.member_xp_base()
 returns table(member_id text, xp integer, level integer, dettaglio jsonb)
 language sql stable security definer set search_path to 'public'
as $function$
with m as (select id,user_id from members where active),
pp as (select p.id play_id,p.game_id,p.date,p.evening,p.coop,p.created_at,p.explained_member_id,x.value v,x.ordinality o
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
ex0 as (
  select p.explained_member_id mid, p.date, p.game_id
  from plays p
  where p.explained_member_id is not null
),
ex1 as (select distinct mid, date, game_id from ex0),
ex2 as (select * from (select ex1.*, row_number() over (partition by mid, date order by game_id) r from ex1) z where r<=2),
exst as (select mid, count(*)::int n, count(distinct game_id)::int dg from ex2 group by mid),
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
       coalesce(riv.r,false) sf_riv,coalesce(riv.rivali,0) sf_rivali,
       coalesce(exst.n,0) expn,coalesce(exst.dg,0) expdg
      from m left join st on st.mid=m.id left join rec on rec.mid=m.id left join host on host.mid=m.id left join expl on expl.mid=m.id
      left join ser on ser.mid=m.id left join ev on ev.mid=m.id left join rt on rt.mid=m.id left join sfa on sfa.mid=m.id left join riv on riv.mid=m.id
      left join exst on exst.mid=m.id),
c as (select b.*, ((n>=1)::int+(wins>=1)::int+(n>=10)::int+(n>=25)::int+(n>=50)::int+(dg>=5)::int+(dg>=10)::int+(dg>=20)::int
       +(thu>=5)::int+(sun>=5)::int+(recs>=1)::int+(coopwins>=5)::int+(hosted>=5)::int+explorer::int+(rated>=10)::int
       +(sf_n>=1)::int+(sf_n>=10)::int+(sf_w>=5)::int+(sf_u>=1)::int+sf_riv::int+(sf_rivali>=5)::int+(sf_nuovi>=3)::int+sf_big::int
       +(expn>=1)::int+(expn>=10)::int+(expn>=25)::int+(expdg>=10)::int) badges from b),
x as (select c.*, (10*n+5*wins+15*serate+25*eventi+20*hplayed+10*dg+30*badges+10*sf_n+5*sf_w+15*sf_u)::int tot from c)
select mid,tot,public.level_for_xp(tot),jsonb_build_object(
 'partite',jsonb_build_array(n,10*n),'vittorie',jsonb_build_array(wins,5*wins),'serate',jsonb_build_array(serate,15*serate),
 'eventi',jsonb_build_array(eventi,25*eventi),'tavoli',jsonb_build_array(hplayed,20*hplayed),'giochi_nuovi',jsonb_build_array(dg,10*dg),
 'badge',jsonb_build_array(badges,30*badges),'sfide',jsonb_build_array(sf_n,10*sf_n),'sfide_vinte',jsonb_build_array(sf_w,5*sf_w),
 'sfavorito',jsonb_build_array(sf_u,15*sf_u)) from x
$function$;
