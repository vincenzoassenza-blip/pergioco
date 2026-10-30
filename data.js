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
 async getAll(){let d=this._load();if(!d){d={version:2,games:SEED_GAMES,plays:[],members:[],admin:null};this._save(d)}if(!d.members){d.members=[];d.admin=null;d.version=2;this._save(d)}if(!d.tables){d.tables=[];this._save(d)}return d},
 async replaceAll(d){this._save(d)},
};
async function sha256(t){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const memberName=m=>m?(`${m.nome} ${m.cognome||''}`.trim()+(m.soprannome?` (${m.soprannome})`:'')):'?';
function setWinners(p){if(!p.coop){const s=p.players.filter(x=>x.score!==null&&x.score!=='');const top=Math.max(...s.map(x=>+x.score));p.players.forEach(x=>x.winner=s.length>0&&+x.score===top)}else p.players.forEach(x=>x.winner=!!p.groupWin)}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const DB={adapter:LocalAdapter,
 async games(){return (await this.adapter.getAll()).games.slice().sort((a,b)=>a.name.localeCompare(b.name))},
 async plays(){return (await this.adapter.getAll()).plays.slice().sort((a,b)=>b.date.localeCompare(a.date))},
 async addGame(g){const d=await this.adapter.getAll();g.id=uid();g.addedAt=new Date().toISOString();d.games.push(g);await this.adapter.replaceAll(d);return g},
 async addPlay(p){const d=await this.adapter.getAll();p.id=uid();p.createdAt=new Date().toISOString();setWinners(p);
  d.plays.push(p);await this.adapter.replaceAll(d);return p},
 // --- Tavoli della modalita' serata ---
 async allTables(){return (await this.adapter.getAll()).tables||[]},
 async saveTable(t){const d=await this.adapter.getAll();d.tables=d.tables||[];if(t.id){const i=d.tables.findIndex(x=>x.id===t.id);d.tables[i]={...d.tables[i],...t}}else{t.id=uid();t.status='open';t.createdAt=new Date().toISOString();d.tables.push(t)}await this.adapter.replaceAll(d);return t},
 async deleteTable(id){const d=await this.adapter.getAll();d.tables=(d.tables||[]).filter(t=>t.id!==id);await this.adapter.replaceAll(d)},
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
 async import(txt){let d;try{d=JSON.parse(txt)}catch(e){throw Error('il file non è un backup valido')}if(!d||!Array.isArray(d.games)||!Array.isArray(d.plays)||[d.games,d.plays,d.members||[],d.tables||[]].some(a=>!Array.isArray(a)||a.some(x=>!x||typeof x!=='object'||typeof x.id!=='string')))throw Error('File non valido');await this.adapter.replaceAll(d)},
};
// Statistiche pure (indipendenti dallo storage)
const Stats={
 chrono(ps){return ps.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.createdAt||'').localeCompare(b.createdAt||'')||String(a.id).localeCompare(String(b.id)))},
 overall(plays,members=[]){const c=Stats.chrono(plays),m={},evs=[...new Set(c.map(p=>p.date))];const ei={};evs.forEach((d,i)=>ei[d]=i);
  c.forEach((p,i)=>p.players.forEach(x=>{if(!x.memberId)return;const o=m[x.memberId]||(m[x.memberId]={id:x.memberId,name:Stats.label(x,members),plays:0,wins:0,comp:0,coopP:0,coopW:0,games:{},dates:new Set(),cur:0,streak:0,tS:1e9,day:{},daily:0,tDay:1e9,ev:0,evLast:-9,evBest:0,tEv:1e9,tP:0,tW:1e9,tD:1e9,tG:1e9,tC:1e9});
   o.plays++;o.tP=i;if(x.winner&&!p.coop){o.wins++;o.tW=i}
   if(!p.coop){o.comp++;if(x.winner){o.cur++;if(o.cur>o.streak){o.streak=o.cur;o.tS=i}}else o.cur=0}
   else{o.coopP++;if(x.winner){o.coopW++;o.tC=i}}
   if(!o.games[p.gameId])o.tG=i;o.games[p.gameId]=1;
   o.day[p.date]=(o.day[p.date]||0)+1;if(o.day[p.date]>o.daily){o.daily=o.day[p.date];o.tDay=i}
   if(!o.dates.has(p.date)){o.dates.add(p.date);o.tD=i;const k=ei[p.date];o.ev=k===o.evLast+1?o.ev+1:1;o.evLast=k;if(o.ev>o.evBest){o.evBest=o.ev;o.tEv=i}}}));
  const L=Object.values(m).map(o=>({...o,presences:o.dates.size,distinct:Object.keys(o.games).length}));
  const best=(v,cmp)=>{const l=L.filter(o=>v(o)>0).sort((a,b)=>v(b)-v(a)||cmp(a,b));return l[0]?{who:l[0],value:v(l[0])}:null};
  return{
   presences:best(o=>o.presences,(a,b)=>b.plays-a.plays||a.tD-b.tD),
   wins:best(o=>o.wins,(a,b)=>a.comp-b.comp||a.tW-b.tW),
   plays:best(o=>o.plays,(a,b)=>b.presences-a.presences||a.tP-b.tP),
   streak:best(o=>o.streak,(a,b)=>a.comp-b.comp||a.tS-b.tS),
   distinct:best(o=>o.distinct,(a,b)=>b.plays-a.plays||a.tG-b.tG),
   daily:best(o=>o.daily,(a,b)=>b.presences-a.presences||a.tDay-b.tDay),
   evStreak:best(o=>o.evBest,(a,b)=>b.presences-a.presences||a.tEv-b.tEv),
   coop:best(o=>o.coopW,(a,b)=>a.coopP-b.coopP||a.tC-b.tC)}},
 topScores(gameId,plays,n=5){const out=[];Stats.chrono(plays.filter(p=>p.gameId===gameId&&!p.coop)).forEach((p,i)=>p.players.forEach(x=>{if(x.score!==''&&x.score!=null)out.push({score:+x.score,p:x,date:p.date,i})}));return out.sort((a,b)=>b.score-a.score||a.i-b.i).slice(0,n)},
 records(games,plays){return games.map(g=>{let best=null;Stats.chrono(plays.filter(p=>p.gameId===g.id&&!p.coop)).forEach(p=>p.players.forEach(x=>{if(x.score!==''&&x.score!=null&&(!best||+x.score>best.score))best={score:+x.score,p:x,date:p.date}}));return{game:g,best}}).filter(r=>r.best)},
 // chiave giocatore: socio -> 'm:id'; ospite o nome non collegato -> 'g:nome'
 key(x){return x.memberId?'m:'+x.memberId:'g:'+(x.name||'').trim()},
 label(x,members){return x.memberId?memberName(members.find(m=>m.id===x.memberId)):(x.name||'?')+(x.guest?' (ospite)':'')},
 players(plays,members=[]){const m={};Stats.chrono(plays).forEach((p,i)=>p.players.forEach(x=>{const k=this.key(x);if(k==='g:')return;const o=m[k]||(m[k]={key:k,member:!!x.memberId,name:this.label(x,members),plays:0,wins:0,games:{},dates:new Set()});o.plays++;o.tP=i;if(x.winner){o.wins++;o.tW=i}if(!o.games[p.gameId])o.tG=i;o.games[p.gameId]=(o.games[p.gameId]||0)+1;if(!o.dates.has(p.date))o.tD=i;o.dates.add(p.date)}));
  return Object.values(m).map(o=>({...o,presences:o.dates.size,distinct:Object.keys(o.games).length,fav:Object.entries(o.games).sort((a,b)=>b[1]-a[1])}))},
 gameCounts(games,plays){const c=Stats.chrono(plays);return games.map(g=>{const l=c.map((p,i)=>p.gameId===g.id?i:-1).filter(i=>i>=0);return{game:g,n:l.length,t:l.length?l[l.length-1]:1e9}}).sort((a,b)=>b.n-a.n||a.t-b.t)}
};

// Badge: calcolati dai dati, mai salvati
const BADGES=[
 ['prima','🎲','Prima partita','Gioca la prima partita',s=>s.plays>=1],
 ['vittoria','🥇','Prima vittoria','Vinci una partita',s=>s.wins>=1],
 ['p10','🔟','10 partite','Gioca 10 partite',s=>s.plays>=10],
 ['p25','🎯','25 partite','Gioca 25 partite',s=>s.plays>=25],
 ['p50','💯','50 partite','Gioca 50 partite',s=>s.plays>=50],
 ['g5','🧭','Curioso','Prova 5 giochi diversi',s=>s.distinct>=5],
 ['g10','🗺️','Viaggiatore','Prova 10 giochi diversi',s=>s.distinct>=10],
 ['g20','🌍','Enciclopedia','Prova 20 giochi diversi',s=>s.distinct>=20],
 ['gio','🌙','Fedelissimo','Gioca 5 serate di giovedì',s=>s.thu>=5],
 ['dom','☀️','Domenicale','Gioca 5 domeniche',s=>s.sun>=5],
 ['rec','🏆','Recordman','Detieni un record di punteggio',s=>s.records>=1],
 ['coop','🤝','Cooperativo','Vinci 5 partite cooperative',s=>s.coopWins>=5],
 ['host','🏠','Padrone di casa','Ospita 5 tavoli in serata',s=>s.hosted>=5],
 ['expl','🚀','Esploratore','Gioca un gioco il giorno in cui arriva',s=>s.explorer],
 ['critico','✍️','Critico','Vota 10 giochi',s=>s.rated>=10],
 ['sf1','⚖️',"Bilancia d'esordio",'Gioca la prima sfida equilibrata',s=>s.sfN>=1],
 ['sf10','🗡️','Sfidante seriale','Gioca 10 sfide equilibrate',s=>s.sfN>=10],
 ['sfw5','🥇','Pari e patta? No, vinta!','Vinci 5 sfide equilibrate',s=>s.sfW>=5],
 ['sfund','🐢','Sfavorito di lusso','Vinci una sfida col pronostico più basso del gruppo',s=>s.sfU>=1],
 ['sfriv','🔁','Rivincita servita','Batti in sfida chi ti aveva battuto nella sfida precedente',s=>s.sfRiv],
 ['sfrivali','🤜🤛','Rivali storici','5 sfide con lo stesso socio',s=>s.sfRivali>=5],
 ['sfnuovo','🧪','Terreno neutro','3 sfide su un gioco nuovo per tutti',s=>s.sfNuovi>=3],
 ['sfbig','🎪','Tavolata alla pari','Una sfida con almeno 5 soci',s=>s.sfBig]];
// --- Sfide equilibrate (v30): cache + calcolo con le stesse regole anti-abuso di member_xp() ---
const SF_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,SF_ID=/^[A-Za-z0-9_-]{1,60}$/;
const SF={map:{},lkey:'pergioco-sfide',
 clean(r){if(!r||!SF_UUID.test(r.id||''))return null;const ids=(r.member_ids||[]).filter(x=>SF_ID.test(x)),pr={};
  for(const m of ids){const v=Number(r.pronostico&&r.pronostico[m]);pr[m]=isFinite(v)?Math.max(0,Math.min(2,v)):1}
  return{id:r.id,memberIds:ids,proposti:(r.proposti||[]).filter(x=>SF_ID.test(x)),scelto:r.scelto,pron:pr,nuovo:!!r.nuovo_per_tutti,createdAt:r.created_at||''}},
 local(){try{return JSON.parse(localStorage.getItem(this.lkey)||'[]')}catch(e){return[]}},
 async load(){let rows=null;const c=DB.remote&&DB.remote.client;
  if(c){try{const {data,error}=await c.from('sfide').select('id,member_ids,proposti,scelto,pronostico,nuovo_per_tutti,created_at').limit(5000);if(!error)rows=data}catch(e){}}
  if(!rows)rows=this.local();const m={};rows.forEach(r=>{const x=this.clean(r);if(x)m[x.id]=x});this.map=m;return m},
 async create(d){const ids=[...new Set(d.memberIds)].filter(x=>SF_ID.test(x)),prop=[...new Set(d.proposti)].filter(x=>SF_ID.test(x)).slice(0,3);
  if(ids.length<2||ids.length>20)throw new Error('Servono da 2 a 20 soci');if(!prop.includes(d.scelto))throw new Error('Gioco non valido');
  const pr={};ids.forEach(m=>{const v=Number(d.pron[m]);pr[m]=Math.round(Math.max(0,Math.min(2,isFinite(v)?v:1))*1000)/1000});
  const row={member_ids:ids,proposti:prop,scelto:d.scelto,pronostico:pr,nuovo_per_tutti:!!d.nuovo};const c=DB.remote&&DB.remote.client;
  if(c){const {data,error}=await c.from('sfide').insert(row).select('id,member_ids,proposti,scelto,pronostico,nuovo_per_tutti,created_at').single();
   if(error)throw new Error(/limite|20/.test(error.message||'')?'Limite di sfide giornaliere raggiunto':'Impossibile creare la sfida');const x=this.clean(data);this.map[x.id]=x;return x}
  const r={...row,id:crypto.randomUUID(),created_at:new Date().toISOString()},l=this.local();l.push(r);localStorage.setItem(this.lkey,JSON.stringify(l.slice(-500)));const x=this.clean(r);this.map[x.id]=x;return x},
 week(d){const t=new Date(String(d).slice(0,10)+'T12:00Z'),w=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-w);return t.toISOString().slice(0,10)},
 // righe (socio, sfida) contate: dedup gruppo/giorno, max 2/giorno, max 10/settimana
 rows(plays){const ord=(a,b)=>(a.date<b.date?-1:a.date>b.date?1:0)||String(a.createdAt||'').localeCompare(String(b.createdAt||''))||String(a.id).localeCompare(String(b.id));
  const seen=new Set(),sm=[];
  [...plays].filter(p=>p.sfidaId&&!p.coop&&this.map[p.sfidaId]).sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||''))||String(a.id).localeCompare(String(b.id))).forEach(p=>{const s=this.map[p.sfidaId],g=p.date+'|'+[...s.memberIds].sort().join(',');if(seen.has(g))return;seen.add(g);
   s.memberIds.forEach(mid=>sm.push({p,s,mid,won:p.players.some(x=>x.memberId===mid&&x.winner)}))});
  const dc={},wc={},out=[];
  sm.sort((a,b)=>ord(a.p,b.p)).forEach(r=>{const dk=r.mid+'|'+r.p.date;dc[dk]=(dc[dk]||0)+1;if(dc[dk]>2)return;const wk=r.mid+'|'+this.week(r.p.date);wc[wk]=(wc[wk]||0)+1;if(wc[wk]>10)return;
   const v=r.s.memberIds.map(m=>r.s.pron[m]),me=r.s.pron[r.mid];r.under=r.won&&me===Math.min(...v)&&me<Math.max(...v);out.push(r)});return{all:sm,ok:out}},
 stats(memberId,plays){const z={sfN:0,sfW:0,sfU:0,sfNuovi:0,sfBig:false,sfRiv:false,sfRivali:0};if(!memberId)return z;const{all,ok}=this.rows(plays),mine=ok.filter(r=>r.mid===memberId);
  mine.forEach(r=>{z.sfN++;if(r.won)z.sfW++;if(r.under)z.sfU++;if(r.s.nuovo)z.sfNuovi++;if(r.s.memberIds.length>=5)z.sfBig=true});
  const opp={};mine.forEach(r=>all.filter(o=>o.p===r.p&&o.mid!==memberId).forEach(o=>{(opp[o.mid]=opp[o.mid]||[]).push([r.won,o.won])}));
  Object.values(opp).forEach(l=>{z.sfRivali=Math.max(z.sfRivali,l.length);for(let i=1;i<l.length;i++)if(l[i][0]&&!l[i][1]&&l[i-1][1]&&!l[i-1][0])z.sfRiv=true});return z}};
const Badges={
 stats(key,{plays,games,tables,ratings}){const mine=plays.filter(p=>p.players.some(x=>Stats.key(x)===key));const me=p=>p.players.find(x=>Stats.key(x)===key);
  const dates=wd=>new Set(mine.filter(p=>new Date(String(p.date).slice(0,10)+'T12:00').getDay()===wd).map(p=>p.date)).size;
  return{plays:mine.length,wins:mine.filter(p=>me(p).winner).length,distinct:new Set(mine.map(p=>p.gameId)).size,thu:dates(4),sun:dates(0),
   coopWins:mine.filter(p=>p.coop&&me(p).winner).length,records:Stats.records(games,plays).filter(r=>Stats.key(r.best.p)===key).length,
   hosted:(tables||[]).filter(t=>'m:'+t.hostId===key).length,explorer:mine.some(p=>{const g=games.find(g=>g.id===p.gameId);return g&&g.addedAt&&g.addedAt.slice(0,10)===p.date}),rated:(ratings||[]).filter(x=>'m:'+x.member_id===key).length,...SF.stats(key.startsWith('m:')?key.slice(2):null,plays)}},
 // progresso verso il badge: [valore attuale, obiettivo]
 prog:{prima:s=>[s.plays,1],vittoria:s=>[s.wins,1],p10:s=>[s.plays,10],p25:s=>[s.plays,25],p50:s=>[s.plays,50],g5:s=>[s.distinct,5],g10:s=>[s.distinct,10],g20:s=>[s.distinct,20],
  gio:s=>[s.thu,5],dom:s=>[s.sun,5],rec:s=>[s.records,1],coop:s=>[s.coopWins,5],host:s=>[s.hosted,5],critico:s=>[s.rated,10],sf1:s=>[s.sfN,1],sf10:s=>[s.sfN,10],sfw5:s=>[s.sfW,5],sfund:s=>[s.sfU,1],sfriv:s=>[+s.sfRiv,1],sfrivali:s=>[s.sfRivali,5],sfnuovo:s=>[s.sfNuovi,3],sfbig:s=>[+s.sfBig,1]},
 list(key,ctx){const s=this.stats(key,ctx);return BADGES.map(([id,icon,name,desc,f])=>{const p=this.prog[id]&&this.prog[id](s);return{id,icon,name,desc,on:!!f(s),cur:p?Math.min(p[0],p[1]):null,goal:p?p[1]:null}})},
 unlocked(key,ctx){return this.list(key,ctx).filter(b=>b.on).map(b=>b.id)}};

// Profilo personale di un socio (calcolato dai dati, sola lettura)
const Profile={
 stats(memberId,{plays,games,tables}){const key='m:'+memberId,mine=plays.filter(p=>p.players.some(x=>x.memberId===memberId));
  const wins=mine.filter(p=>(p.players.find(x=>x.memberId===memberId)||{}).winner).length,gc={},pc={};
  const gt={};Stats.chrono(mine).forEach((p,i)=>{gc[p.gameId]=(gc[p.gameId]||0)+1;gt[p.gameId]=i;p.players.forEach(x=>{if(x.memberId===memberId)return;const k=Stats.key(x);if(k==='g:')return;pc[k]=pc[k]||{n:0,x};pc[k].n++;pc[k].t=i})});
  const tb=(tables||[]).filter(t=>(t.players||[]).some(x=>x.memberId===memberId)||t.hostId===memberId);
  return{key,plays:mine,n:mine.length,wins,pct:mine.length?Math.round(wins/mine.length*100):0,
   topGames:Object.entries(gc).sort((a,b)=>b[1]-a[1]||gt[a[0]]-gt[b[0]]).slice(0,5),partners:Object.values(pc).sort((a,b)=>b.n-a.n||a.t-b.t).slice(0,5),
   tables:tb.length,evenings:new Set([...mine.map(p=>p.date),...tb.map(t=>t.date)]).size,hosted:tb.filter(t=>t.hostId===memberId).length}}};
