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
 async getAll(){let d=this._load();if(!d){d={version:2,games:SEED_GAMES,plays:[],members:[],admin:null};this._save(d)}if(!d.members){d.members=[];d.admin=null;d.version=2;this._save(d)}return d},
 async replaceAll(d){this._save(d)},
};
async function sha256(t){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const memberName=m=>m?(m.soprannome||`${m.nome} ${m.cognome||''}`.trim()):'?';
function setWinners(p){if(!p.coop){const s=p.players.filter(x=>x.score!==null&&x.score!=='');const top=Math.max(...s.map(x=>+x.score));p.players.forEach(x=>x.winner=s.length>0&&+x.score===top)}else p.players.forEach(x=>x.winner=!!p.groupWin)}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const DB={adapter:LocalAdapter,
 async games(){return (await this.adapter.getAll()).games.slice().sort((a,b)=>a.name.localeCompare(b.name))},
 async plays(){return (await this.adapter.getAll()).plays.slice().sort((a,b)=>b.date.localeCompare(a.date))},
 async addGame(g){const d=await this.adapter.getAll();g.id=uid();d.games.push(g);await this.adapter.replaceAll(d);return g},
 async addPlay(p){const d=await this.adapter.getAll();p.id=uid();p.createdAt=new Date().toISOString();setWinners(p);
  d.plays.push(p);await this.adapter.replaceAll(d);return p},
 async deletePlay(id){const d=await this.adapter.getAll();d.plays=d.plays.filter(p=>p.id!==id);await this.adapter.replaceAll(d)},
 // --- Soci (modificabili solo dal pannello admin) ---
 async members(){return (await this.adapter.getAll()).members.slice().sort((a,b)=>memberName(a).localeCompare(memberName(b)))},
 async saveMember(m){const d=await this.adapter.getAll();if(m.id){const i=d.members.findIndex(x=>x.id===m.id);d.members[i]={...d.members[i],...m}}else{m.id=uid();m.active=m.active!==false;d.members.push(m)}await this.adapter.replaceAll(d);return m},
 // nomi liberi delle partite v1 non ancora collegati a un socio
 async legacyNames(){const c={};(await this.adapter.getAll()).plays.forEach(p=>p.players.forEach(x=>{if(!x.memberId&&!x.guest&&x.name)c[x.name]=(c[x.name]||0)+1}));return Object.entries(c)},
 async linkName(name,target){const d=await this.adapter.getAll();d.plays.forEach(p=>p.players.forEach(x=>{if(!x.memberId&&!x.guest&&x.name===name){if(target==='guest')x.guest=true;else{x.memberId=target;delete x.name}}}));await this.adapter.replaceAll(d)},
 // Codice admin: si salva solo hash SHA-256 con salt. Protezione LOCALE, la sicurezza vera arrivera' con l'auth Supabase
 async hasPin(){return !!(await this.adapter.getAll()).admin},
 async setPin(pin){const d=await this.adapter.getAll();const salt=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');d.admin={salt,hash:await sha256(salt+pin)};await this.adapter.replaceAll(d)},
 async checkPin(pin){const a=(await this.adapter.getAll()).admin;return !!a&&a.hash===await sha256(a.salt+pin)},
 async updatePlay(p){const d=await this.adapter.getAll();setWinners(p);const i=d.plays.findIndex(x=>x.id===p.id);d.plays[i]={...d.plays[i],...p,updatedAt:new Date().toISOString()};await this.adapter.replaceAll(d)},
 async export(){return JSON.stringify(await this.adapter.getAll(),null,2)},
 async import(txt){const d=JSON.parse(txt);if(!Array.isArray(d.games)||!Array.isArray(d.plays))throw Error('File non valido');await this.adapter.replaceAll(d)},
};
// Statistiche pure (indipendenti dallo storage)
const Stats={
 records(games,plays){return games.map(g=>{let best=null;plays.filter(p=>p.gameId===g.id&&!p.coop).forEach(p=>p.players.forEach(x=>{if(x.score!==''&&x.score!=null&&(!best||+x.score>best.score))best={score:+x.score,p:x,date:p.date}}));return{game:g,best}}).filter(r=>r.best)},
 // chiave giocatore: socio -> 'm:id'; ospite o nome non collegato -> 'g:nome'
 key(x){return x.memberId?'m:'+x.memberId:'g:'+(x.name||'').trim()},
 label(x,members){return x.memberId?memberName(members.find(m=>m.id===x.memberId)):(x.name||'?')+(x.guest?' (ospite)':'')},
 players(plays,members=[]){const m={};plays.forEach(p=>p.players.forEach(x=>{const k=this.key(x);if(k==='g:')return;const o=m[k]||(m[k]={key:k,member:!!x.memberId,name:this.label(x,members),plays:0,wins:0,games:{},dates:new Set()});o.plays++;if(x.winner)o.wins++;o.games[p.gameId]=(o.games[p.gameId]||0)+1;o.dates.add(p.date)}));
  return Object.values(m).map(o=>({...o,presences:o.dates.size,distinct:Object.keys(o.games).length,fav:Object.entries(o.games).sort((a,b)=>b[1]-a[1])}))},
 gameCounts(games,plays){return games.map(g=>({game:g,n:plays.filter(p=>p.gameId===g.id).length})).sort((a,b)=>b.n-a.n)}
};
