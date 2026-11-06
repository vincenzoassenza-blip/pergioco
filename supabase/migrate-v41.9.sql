-- v41.9 — Import BGG: testi ibgg_* in testi_valid + RPC games_import_bgg (solo is_admin).
-- Idempotente. GRANT solo authenticated; anon revocato.
create or replace function public.testi_valid(v jsonb) returns boolean language plpgsql immutable set search_path=public as $f$
declare k text; s text; lim jsonb:='{"santo":[2,40],"festa":[0,5],"antero":[2,20],"anteri":[2,20],"coppa_breve":[2,30],"coppa_plur":[2,30],
 "coppa_intro":[0,400],"coppa_regole_tavoli":[0,600],"coppa_regole_1v1":[0,600],"ente_nome":[2,80],"ente_cf":[0,16],
 "collezione":[2,40],"g8_oggi":[2,30],"g8_prox":[2,30],"g8_tav1":[2,20],"g8_tavn":[2,20],"g8_lib1":[2,30],"g8_libn":[2,30],"g8_pieni":[2,40],
 "lv_invito":[5,60],"lv_come":[2,40],"lv_max":[2,40],
 "ibgg_titolo":[2,60],"ibgg_sub":[2,80],"ibgg_viaFile":[2,40],"ibgg_viaUser":[2,40],"ibgg_viaUserSoon":[2,40],
 "ibgg_anteprima":[2,40],"ibgg_mostra":[2,20],"ibgg_tutto":[2,20],"ibgg_importa":[2,60],"ibgg_esito":[2,40]}';
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

-- Import massivo: solo admin. Dedup su bgg_id già presenti. Max 500.
create or replace function public.games_import_bgg(p_games jsonb)
returns jsonb language plpgsql security definer set search_path=public as $f$
declare g jsonb; i int:=0; ok int:=0; err int:=0; sk int:=0; ids text[]:='{}'; id text; bid int; nm text;
  mn int; mx int; t0 int; t1 int; ag int; yr int; pt int; th text; exp boolean; coop boolean;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'solo admin' using errcode='42501'; end if;
  if p_games is null or jsonb_typeof(p_games)<>'array' then raise exception 'payload non valido'; end if;
  if jsonb_array_length(p_games)>500 then raise exception 'massimo 500 giochi'; end if;
  for g in select * from jsonb_array_elements(p_games) loop
    i:=i+1;
    begin
      bid:=nullif(g->>'bggId','')::int;
      if bid is null or bid<1 or bid>99999999 then err:=err+1; continue; end if;
      if exists(select 1 from public.games where bgg_id=bid) then sk:=sk+1; continue; end if;
      nm:=left(btrim(coalesce(g->>'name','')),100);
      if nm='' or nm ~ '[<>]' then err:=err+1; continue; end if;
      mn:=coalesce(nullif(g->>'min','')::int,1); mx:=coalesce(nullif(g->>'max','')::int,mn);
      if mn<1 or mx>100 or mx<mn then err:=err+1; continue; end if;
      t0:=coalesce(nullif(g->>'minT','')::int,30); t1:=coalesce(nullif(g->>'maxT','')::int,t0);
      if t0<0 or t1>1440 or t1<t0 then err:=err+1; continue; end if;
      ag:=coalesce(nullif(g->>'age','')::int,0); if ag<0 or ag>99 then ag:=0; end if;
      yr:=nullif(g->>'year','')::int; if yr is not null and (yr<1800 or yr>2100) then yr:=null; end if;
      pt:=nullif(g->>'playTime','')::int; if pt is not null and (pt<0 or pt>1440) then pt:=null; end if;
      th:=nullif(btrim(coalesce(g->>'thumb','')),'');
      if th is not null and (char_length(th)>500 or th !~* '^https://cf\.geekdo-images\.com/[A-Za-z0-9_./%=:()-]+$') then th:=null; end if;
      exp:=coalesce((g->>'isExp')::boolean,false); coop:=coalesce((g->>'coop')::boolean,false);
      id:='bgg'||bid::text;
      if exists(select 1 from public.games where id=id) then id:=id||'_'||substr(md5(random()::text),1,6); end if;
      insert into public.games(id,name,min_players,max_players,min_time,max_time,age,coop,bgg_id,thumb,play_time,year,is_expansion,added_at,categories,mechanics,best_players,rec_players)
      values(id,nm,mn,mx,t0,t1,ag,coop,bid,th,pt,yr,exp,now(),'{}','{}','{}','{}');
      ok:=ok+1; ids:=ids||id;
    exception when others then err:=err+1;
    end;
  end loop;
  return jsonb_build_object('ok',ok,'err',err,'skipped',sk,'ids',to_jsonb(ids));
end $f$;
revoke all on function public.games_import_bgg(jsonb) from public, anon;
grant execute on function public.games_import_bgg(jsonb) to authenticated;
