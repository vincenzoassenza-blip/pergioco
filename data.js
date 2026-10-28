// Data layer: tutta l'app passa da `DB`. Per condividere i dati tra i soci
// basta scrivere un adapter con la stessa interfaccia (es. SupabaseAdapter) e
// assegnarlo a DB.adapter. Tutti i metodi sono async.
const SEED_GAMES=[
 {id:'etherfields',name:'Etherfields',min:1,max:5,minT:60,maxT:120,age:14,coop:true},
 {id:'tmb',name:'Too Many Bones',min:1,max:4,minT:60,maxT:120,age:12,coop:true},
 {id:'racket',name:'Racket Dice',min:2,max:4,minT:20,maxT:30,age:8,coop:false},
 {id:'burncycle',name:'Burncycle',min:1,max:4,minT:45,maxT:90,age:14,coop:true},
 {id:'cloudspire',name:'Cloudspire',min:1,max:4,minT:60,maxT:180,age:14,coop:false},
 {id:'hoplo',name:'Hoplomachus: Victorum',min:1,max:4,minT:30,maxT:120,age:14,coop:false}];
const LocalAdapter={
 key:'pergioco-db-v1',
 _load(){try{return JSON.parse(localStorage.getItem(this.key))}catch(e){return null}},
 _save(d){localStorage.setItem(this.key,JSON.stringify(d))},
 async getAll(){let d=this._load();if(!d){d={version:1,games:SEED_GAMES,plays:[]};this._save(d)}return d},
 async replaceAll(d){this._save(d)},
};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const DB={adapter:LocalAdapter,
 async games(){return (await this.adapter.getAll()).games.slice().sort((a,b)=>a.name.localeCompare(b.name))},
 async plays(){return (await this.adapter.getAll()).plays.slice().sort((a,b)=>b.date.localeCompare(a.date))},
 async addGame(g){const d=await this.adapter.getAll();g.id=uid();d.games.push(g);await this.adapter.replaceAll(d);return g},
 async addPlay(p){const d=await this.adapter.getAll();p.id=uid();p.createdAt=new Date().toISOString();
  if(!p.coop){const s=p.players.filter(x=>x.score!==null&&x.score!=='');const top=Math.max(...s.map(x=>+x.score));
   p.players.forEach(x=>x.winner=s.length>0&&+x.score===top)}else p.players.forEach(x=>x.winner=!!p.groupWin);
  d.plays.push(p);await this.adapter.replaceAll(d);return p},
 async deletePlay(id){const d=await this.adapter.getAll();d.plays=d.plays.filter(p=>p.id!==id);await this.adapter.replaceAll(d)},
 async export(){return JSON.stringify(await this.adapter.getAll(),null,2)},
 async import(txt){const d=JSON.parse(txt);if(!Array.isArray(d.games)||!Array.isArray(d.plays))throw Error('File non valido');await this.adapter.replaceAll(d)},
};
// Statistiche pure (indipendenti dallo storage)
const Stats={
 records(games,plays){return games.map(g=>{let best=null;plays.filter(p=>p.gameId===g.id&&!p.coop).forEach(p=>p.players.forEach(x=>{if(x.score!==''&&x.score!=null&&(!best||+x.score>best.score))best={score:+x.score,name:x.name,date:p.date}}));return{game:g,best}}).filter(r=>r.best)},
 players(plays){const m={};plays.forEach(p=>p.players.forEach(x=>{const k=x.name.trim();if(!k)return;const o=m[k]||(m[k]={name:k,plays:0,wins:0,games:{},dates:new Set()});o.plays++;if(x.winner)o.wins++;o.games[p.gameId]=(o.games[p.gameId]||0)+1;o.dates.add(p.date)}));
  return Object.values(m).map(o=>({...o,presences:o.dates.size,distinct:Object.keys(o.games).length,fav:Object.entries(o.games).sort((a,b)=>b[1]-a[1])}))},
 gameCounts(games,plays){return games.map(g=>({game:g,n:plays.filter(p=>p.gameId===g.id).length})).sort((a,b)=>b.n-a.n)}
};
