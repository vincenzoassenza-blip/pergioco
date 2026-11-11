-- v41.15 — GDR nella collezione (RPGGeek).
-- games.kind: 'gdt' (gioco da tavolo, default: tutti i giochi esistenti) o 'gdr'.
-- rpg_*: sistema, genere, editore, lingua da RPGGeek (XML API2 via Edge Function).
-- Le colonne di games hanno GRANT per colonna: si concedono anche le nuove.
alter table public.games add column if not exists kind text not null default 'gdt';
alter table public.games add column if not exists rpg_system text[] not null default '{}';
alter table public.games add column if not exists rpg_genre text[] not null default '{}';
alter table public.games add column if not exists rpg_publisher text[] not null default '{}';
alter table public.games add column if not exists rpg_lang text[] not null default '{}';
alter table public.games drop constraint if exists games_kind_chk;
alter table public.games add constraint games_kind_chk check (kind in ('gdt','gdr'));
alter table public.games drop constraint if exists games_rpg_chk;
alter table public.games add constraint games_rpg_chk check (
  txt_arr_ok(rpg_system,10,100) and txt_arr_ok(rpg_genre,20,60) and txt_arr_ok(rpg_publisher,10,100) and txt_arr_ok(rpg_lang,10,40)
  and (kind='gdr' or (cardinality(rpg_system)=0 and cardinality(rpg_genre)=0 and cardinality(rpg_publisher)=0 and cardinality(rpg_lang)=0)));
grant select (kind,rpg_system,rpg_genre,rpg_publisher,rpg_lang) on public.games to authenticated;
grant insert (kind,rpg_system,rpg_genre,rpg_publisher,rpg_lang) on public.games to authenticated;
grant update (kind,rpg_system,rpg_genre,rpg_publisher,rpg_lang) on public.games to authenticated;

-- Testi configurabili della macrocategoria (Tutto / GDT / GDR)
CREATE OR REPLACE FUNCTION public.testi_valid(v jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare k text; s text; lim jsonb:='{
 "gp_period":[1,40],"gp_all":[1,40],"gp_range":[1,40],"gp_member":[1,40],"gp_from":[1,40],"gp_to":[1,40],
 "santo":[2,40],"festa":[0,5],"antero":[2,20],"anteri":[2,20],"coppa_breve":[2,30],"coppa_plur":[2,30],
 "coppa_intro":[0,400],"coppa_regole_tavoli":[0,600],"coppa_regole_1v1":[0,600],"ente_nome":[2,80],
 "ente_cf":[0,16],"collezione":[2,40],"gm_tutto":[2,20],"gm_gdt":[2,20],"gm_gdr":[2,20],"g8_oggi":[2,30],
 "g8_prox":[2,30],"g8_tav1":[2,20],"g8_tavn":[2,20],"g8_lib1":[2,30],"g8_libn":[2,30],"g8_pieni":[2,40],
 "lv_invito":[5,60],"lv_come":[2,40],"lv_max":[2,40],"ibgg_titolo":[2,60],"ibgg_sub":[2,80],
 "ibgg_viaFile":[2,40],"ibgg_viaUser":[2,40],"ibgg_viaUserSoon":[2,40],"ibgg_viaUserHelp":[2,120],
 "ibgg_viaUserGo":[2,40],"ibgg_viaUserWait":[2,80],"ibgg_viaUserErr":[2,80],"ibgg_attrib":[2,60],
 "ibgg_anteprima":[2,40],"ibgg_mostra":[2,20],"ibgg_tutto":[2,20],"ibgg_importa":[2,60],"ibgg_esito":[2,40],
 "ibgg_viaUserCheck":[2,40],"ibgg_viaUserOk":[2,60],"ibgg_viaUserMissing":[2,80],"ibgg_viaUserRecent":[2,40],
 "ibgg_viaUserRemove":[2,40],"ibgg_src":[2,40],"irpg_src":[2,40],"irpg_titolo":[2,60],"irpg_sub":[2,80],
 "irpg_viaUser":[2,40],"irpg_viaUserHelp":[2,160],"irpg_viaUserWait":[2,80],"irpg_viaUserErr":[2,80],
 "irpg_viaUserMissing":[2,80],"irpg_attrib":[2,60],"irpg_fileHelp":[2,160],"irpg_viaFileSub":[2,80],
 "irpg_viaUserSub":[2,80],"tt_pieno":[10,280],"tt_wa":[0,200],"tt_ora":[5,5],"tt_ora_lab":[2,40],
 "tt_gest":[2,40],"tt_tipi":[2,40],"tt_cap":[2,40],"tt_master":[2,40],"tt_gioco":[2,40],"tt_nota":[2,40],
 "tt_posti":[2,40],"tt_versione":[2,40],"tt_versione_ph":[2,80],"tt_filtro":[2,40],"tt_tutto":[2,20],
 "tt_reg_gdr":[2,50],"tt_reg_altro":[2,50],"tt_sistema":[2,40],"tt_avventura":[2,40],"tt_sessione":[2,40],
 "tt_oneshot":[2,30],"tt_campagna":[2,30],"tt_sess_n":[2,30],"tt_esito":[2,30],"tt_conclusa":[2,40],
 "tt_incorso":[2,30],"tt_esito_nota":[2,40],"tt_pg":[2,30],"tt_nome_partita":[2,30]
}';
begin
  if v is null or jsonb_typeof(v)<>'object' then return false; end if;
  for k in select jsonb_object_keys(v) loop
    if not lim ? k then return false; end if;
    if jsonb_typeof(v->k)<>'string' then return false; end if;
    s:=v->>k;
    if char_length(btrim(s)) not between (lim->k->>0)::int and (lim->k->>1)::int then return false; end if;
    if s ~ '[<>]' then return false; end if;
    if k not in ('coppa_intro','coppa_regole_tavoli','coppa_regole_1v1','tt_pieno') and s ~ '["&]' then return false; end if;
    if k='ente_cf' and s !~ '^[A-Za-z0-9]*$' then return false; end if;
    if k='festa' and btrim(s) !~ '^((0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]))?$' then return false; end if;
  end loop;
  return true;
end $function$;
revoke all on function public.testi_valid(jsonb) from public, anon;
grant execute on function public.testi_valid(jsonb) to authenticated;

-- Import (BGG e RPGGeek): stessa RPC, ora con kind e campi GDR. Dedup su bgg_id (gli ID RPGGeek sono nello stesso spazio di BGG).
create or replace function public.games_import_bgg(p_games jsonb)
returns jsonb language plpgsql security definer set search_path=public as $f$
declare g jsonb; ok int:=0; err int:=0; sk int:=0; ids text[]:='{}'; nid text; bid int; nm text;
  mn int; mx int; t0 int; t1 int; ag int; yr int; pt int; th text; exp boolean; coop boolean; kd text;
  arr text[]; sys text[]; gen text[]; pub text[]; lng text[];
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'solo admin' using errcode='42501'; end if;
  if p_games is null or jsonb_typeof(p_games)<>'array' then raise exception 'payload non valido'; end if;
  if jsonb_array_length(p_games)>500 then raise exception 'massimo 500 giochi'; end if;
  for g in select * from jsonb_array_elements(p_games) loop
    begin
      bid:=nullif(g->>'bggId','')::int;
      if bid is null or bid<1 or bid>99999999 then err:=err+1; continue; end if;
      if exists(select 1 from public.games x where x.bgg_id=bid) then sk:=sk+1; continue; end if;
      nm:=left(btrim(coalesce(g->>'name','')),100);
      if nm='' or nm ~ '[<>]' then err:=err+1; continue; end if;
      kd:=case when g->>'kind'='gdr' then 'gdr' else 'gdt' end;
      mn:=coalesce(nullif(g->>'min','')::int,1); mx:=coalesce(nullif(g->>'max','')::int,mn);
      if mn<1 or mx>100 or mx<mn then err:=err+1; continue; end if;
      t0:=coalesce(nullif(g->>'minT','')::int,30); t1:=coalesce(nullif(g->>'maxT','')::int,t0);
      if t0<0 or t1>1440 or t1<t0 then err:=err+1; continue; end if;
      ag:=coalesce(nullif(g->>'age','')::int,0); if ag<0 or ag>99 then ag:=0; end if;
      yr:=nullif(g->>'year','')::int; if yr is not null and (yr<1800 or yr>2100) then yr:=null; end if;
      pt:=nullif(g->>'playTime','')::int; if pt is not null and (pt<0 or pt>1440) then pt:=null; end if;
      th:=nullif(btrim(coalesce(g->>'thumb','')),'');
      if th is not null and (char_length(th)>500 or th !~* '^https://cf\.geekdo-images\.com/[A-Za-z0-9_./%=:()-]+$') then th:=null; end if;
      exp:=kd='gdt' and coalesce((g->>'isExp')::boolean,false); coop:=coalesce((g->>'coop')::boolean,false);
      sys:='{}'; gen:='{}'; pub:='{}'; lng:='{}';
      if kd='gdr' then
        select coalesce(array_agg(left(btrim(v),100)) filter (where btrim(v)<>'' and v !~ '[<>]'),'{}') into sys from (select jsonb_array_elements_text(case when jsonb_typeof(g->'rpgSystem')='array' then g->'rpgSystem' else '[]' end) v limit 10) s;
        select coalesce(array_agg(left(btrim(v),60)) filter (where btrim(v)<>'' and v !~ '[<>]'),'{}') into gen from (select jsonb_array_elements_text(case when jsonb_typeof(g->'rpgGenre')='array' then g->'rpgGenre' else '[]' end) v limit 20) s;
        select coalesce(array_agg(left(btrim(v),100)) filter (where btrim(v)<>'' and v !~ '[<>]'),'{}') into pub from (select jsonb_array_elements_text(case when jsonb_typeof(g->'rpgPublisher')='array' then g->'rpgPublisher' else '[]' end) v limit 10) s;
        select coalesce(array_agg(left(btrim(v),40)) filter (where btrim(v)<>'' and v !~ '[<>]'),'{}') into lng from (select jsonb_array_elements_text(case when jsonb_typeof(g->'rpgLang')='array' then g->'rpgLang' else '[]' end) v limit 10) s;
      end if;
      nid:='bgg'||bid::text;
      if exists(select 1 from public.games x where x.id=nid) then nid:=nid||'_'||substr(md5(random()::text),1,6); end if;
      insert into public.games(id,name,min_players,max_players,min_time,max_time,age,coop,bgg_id,thumb,play_time,year,is_expansion,added_at,categories,mechanics,best_players,rec_players,kind,rpg_system,rpg_genre,rpg_publisher,rpg_lang)
      values(nid,nm,mn,mx,t0,t1,ag,coop,bid,th,pt,yr,exp,now(),'{}','{}','{}','{}',kd,sys,gen,pub,lng);
      ok:=ok+1; ids:=ids||nid;
    exception when others then err:=err+1;
    end;
  end loop;
  return jsonb_build_object('ok',ok,'err',err,'skipped',sk,'ids',to_jsonb(ids));
end $f$;
revoke all on function public.games_import_bgg(jsonb) from public, anon;
grant execute on function public.games_import_bgg(jsonb) to authenticated;
