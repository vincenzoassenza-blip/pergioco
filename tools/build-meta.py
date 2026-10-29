# Genera supabase/game-meta-ufficiale.json e supabase/seed-meta-v25.sql dai dati grezzi api.geekdo.com
import json,sys,re
raw=json.load(open(sys.argv[1]))
LANG={'No necessary in-game text':0,'Some necessary text - easily memorized or small crib sheet':1,'Moderate in-game text - needs crib sheet or paste ups':2,'Extensive use of text - massive conversion needed to be playable':3,'Unplayable in another language':4}
HI={'Take That','Player Elimination','Area Majority / Influence','Negotiation','Trading','Card Play Conflict Resolution','Betting and Bluffing','Bribery','Dice Combat? ','Hidden Roles','Traitor Game','Team-Based Game','Auction / Bidding','Force Commitment','Alliances','Grid Movement','Area Movement'}
LUCK={'Dice Rolling':2,'Push Your Luck':2,'Die Icon Resolution':1,'Betting and Bluffing':1,'Critical Hits and Failures':1,'Random Production':1,'Roll / Spin and Move':2}
def rng(l,lo,hi):
    s=set()
    for r in l or []:
        a=int(r['min']);b=int(r['max']) if r.get('max') is not None else a
        if b>=a: s.update(range(max(a,1),min(b,hi)+1))
    return sorted(s)
out=[]
for x in raw:
    p=x['polls'] or {};m=[s[:80] for s in x['mech']][:60]
    w=(p.get('boardgameweight') or {}).get('averageweight') or None
    inter=0 if 'Cooperative Game' in m else (2 if len(HI&set(m))>=1 and ('Take That' in m or 'Player Elimination' in m or len(HI&set(m))>=2) else 1)
    luck=min(2,sum(LUCK.get(k,0) for k in m))
    try: rank=int(x['rank']) or None
    except: rank=None
    out.append({'bgg_id':x['id_bgg'],'game_id':f"bgg-{x['id_bgg']}",'nome':x['nome'],'espansione':x['tipo']=='espansione',
     'weight':round(w,2) if w else None,'best_players':rng((p.get('userplayers') or {}).get('best'),1,20),'rec_players':rng((p.get('userplayers') or {}).get('recommended'),1,20),
     'min_age':int(x['minage']) if str(x.get('minage') or '').isdigit() and int(x['minage'])>0 else None,'lang_dep':LANG.get(p.get('languagedependence')),
     'rank':rank,'bgg_avg':round(float(x['avg']),2) if x.get('avg') else None,'mechanics':m,'categories':x['cat'][:40],'subdomains':x['sub'][:10],'interaction':inter,'luck':luck})
json.dump(out,open('supabase/game-meta-ufficiale.json','w'),ensure_ascii=False,indent=1)
q=lambda s:"'"+s.replace("'","''")+"'"
arr=lambda a,t:'array['+','.join(q(v) if t=='text' else str(v) for v in a)+f']::{t}[]'
n=lambda v:'null' if v is None else str(v)
L=['-- Dati extra BGG (non mostrati in UI) per la collezione ufficiale. Rigenerare con tools/build-meta.py','-- il game_id si ricava dal bgg_id del gioco presente nel DB (gli id dei giochi possono differire tra ambienti)','insert into public.game_meta (game_id,bgg_id,weight,best_players,rec_players,min_age,lang_dep,bgg_rank,bgg_avg,mechanics,categories,subdomains,interaction,luck,status,fetched_at)\nselect g.id,v.bgg_id,v.weight,v.best_players,v.rec_players,v.min_age,v.lang_dep,v.bgg_rank,v.bgg_avg,v.mechanics,v.categories,v.subdomains,v.interaction,v.luck,v.status,v.fetched_at from (values']
L.append(',\n'.join(f"({q(o['game_id'])},{o['bgg_id']},{n(o['weight'])},{arr(o['best_players'],'int')},{arr(o['rec_players'],'int')},{n(o['min_age'])},{n(o['lang_dep'])},{n(o['rank'])},{n(o['bgg_avg'])},{arr(o['mechanics'],'text')},{arr(o['categories'],'text')},{arr(o['subdomains'],'text')},{o['interaction']},{o['luck']},'ok',now())" for o in out))
L.append(") v("+'game_id,bgg_id,weight,best_players,rec_players,min_age,lang_dep,bgg_rank,bgg_avg,mechanics,categories,subdomains,interaction,luck,status,fetched_at'+") join public.games g on g.bgg_id=v.bgg_id")
L.append("on conflict (game_id) do update set bgg_id=excluded.bgg_id,weight=excluded.weight,best_players=excluded.best_players,rec_players=excluded.rec_players,min_age=excluded.min_age,lang_dep=excluded.lang_dep,bgg_rank=excluded.bgg_rank,bgg_avg=excluded.bgg_avg,mechanics=excluded.mechanics,categories=excluded.categories,subdomains=excluded.subdomains,interaction=excluded.interaction,luck=excluded.luck,status='ok',fetched_at=now(),attempts=0,last_error=null;")
open('supabase/seed-meta-v25.sql','w').write('\n'.join(L)+'\n')
print(len(out))
