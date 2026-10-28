// SupabaseAdapter: stessa interfaccia di LocalAdapter (getAll/replaceAll).
// Lavora su una copia locale (cache) e invia le differenze a Supabase; se offline
// le mette in coda e le sincronizza al ritorno della connessione.
const MAP={
 games:{t:'games',to:g=>({id:g.id,added_at:g.addedAt||null,name:g.name,min_players:g.min,max_players:g.max,min_time:g.minT,max_time:g.maxT,age:g.age,coop:!!g.coop,bgg_id:g.bggId??null,thumb:g.thumb??null}),
  from:r=>({id:r.id,addedAt:r.added_at,name:r.name,min:r.min_players,max:r.max_players,minT:r.min_time,maxT:r.max_time,age:r.age,coop:r.coop,bggId:r.bgg_id,thumb:r.thumb})},
 members:{t:'members',to:m=>({id:m.id,nome:m.nome,cognome:m.cognome||null,soprannome:m.soprannome||null,tessera:m.tessera||null,active:m.active!==false}),
  from:r=>({id:r.id,nome:r.nome,cognome:r.cognome||'',soprannome:r.soprannome||'',tessera:r.tessera||'',active:r.active})},
 tables:{t:'tables',to:t=>({id:t.id,date:t.date,evening:t.evening,game_id:t.gameId,host_id:t.hostId,seats:t.seats,start_time:t.time||null,note:t.note||null,players:t.players||[],status:t.status||'open',play_id:t.playId||null,created_at:t.createdAt||new Date().toISOString()}),
  from:r=>({id:r.id,date:r.date,evening:r.evening,gameId:r.game_id,hostId:r.host_id,seats:r.seats,time:r.start_time||'',note:r.note||'',players:r.players||[],status:r.status,playId:r.play_id,createdAt:r.created_at})},
 plays:{t:'plays',to:p=>({id:p.id,game_id:p.gameId,date:p.date,evening:p.evening,coop:!!p.coop,group_win:p.groupWin??null,scenario:p.scenario||null,players:p.players,note:p.note||null,created_at:p.createdAt||new Date().toISOString(),updated_at:p.updatedAt||null}),
  from:r=>({id:r.id,gameId:r.game_id,date:r.date,evening:r.evening,coop:r.coop,groupWin:r.group_win,scenario:r.scenario||'',players:r.players||[],note:r.note||'',createdAt:r.created_at,updatedAt:r.updated_at})}};
const isMissing=e=>e&&(e.code==='PGRST205'||e.code==='42P01'||/does not exist|Could not find the table/i.test(e.message||''));
const isNet=e=>e&&(!e.code||/fetch|network|Failed/i.test(e.message||''))&&!isMissing(e);
const SupabaseAdapter={
 cache:{...LocalAdapter,key:'pergioco-cache-supabase'},qkey:'pergioco-queue',client:null,
 queue(){try{return JSON.parse(localStorage.getItem(this.qkey))||[]}catch(e){return[]}},
 setQueue(q){localStorage.setItem(this.qkey,JSON.stringify(q));DB.onStatus()},
 async getAll(){const d=await this.cache.getAll();d.admin=(await LocalAdapter.getAll()).admin;return d},
 async replaceAll(d){const old=await this.cache.getAll();const ops=[];
  for(const k of Object.keys(MAP)){const o=new Map((old[k]||[]).map(x=>[x.id,x]));const n=new Map((d[k]||[]).map(x=>[x.id,x]));
   n.forEach((x,id)=>{if(!o.has(id))ops.push({k,op:'insert',row:MAP[k].to(x)});else if(JSON.stringify(o.get(id))!==JSON.stringify(x))ops.push({k,op:'update',row:MAP[k].to(x)})});
   o.forEach((x,id)=>{if(!n.has(id))ops.push({k,op:'delete',id})})}
  if(JSON.stringify(old.admin)!==JSON.stringify(d.admin)){const l=await LocalAdapter.getAll();l.admin=d.admin;await LocalAdapter.replaceAll(l)}
  await this.cache.replaceAll({...d,admin:null});this.setQueue(this.queue().concat(ops));await this.flush()},
 async run(o){const t=this.client.from(MAP[o.k].t);
  const r=o.op==='insert'?await t.insert(o.row):o.op==='update'?await t.update(o.row).eq('id',o.row.id):o.op==='upsert'?await t.upsert(o.row):await t.delete().eq('id',o.id);return r.error},
 async flush(){if(!this.client||this.flushing)return;this.flushing=true;let q=this.queue(),denied=0;
  try{while(q.length){const e=await this.run(q[0]);if(e&&isNet(e)){DB.setStatus('offline');break}if(e){denied++;console.warn('Supabase',e)}q.shift();this.setQueue(q)}
   if(!q.length){DB.setStatus('online');await this.refresh()}}finally{this.flushing=false}
  if(denied)toast&&toast('Alcune modifiche non sono state accettate dal database (servono i permessi admin)')},
 async refresh(){const d={version:2,games:[],members:[],plays:[],tables:[],admin:null};
  for(const k of Object.keys(MAP)){const {data,error}=await this.client.from(MAP[k].t).select('*');if(error&&k==='tables'&&isMissing(error)){DB.tablesMissing=true;d.tables=[];continue}if(error)throw error;d[k]=data.map(MAP[k].from)}
  if(this.queue().length)return;await this.cache.replaceAll(d)},
 async init(){const c=window.PERGIOCO_CONFIG||{};if(!c.supabaseUrl||!c.supabaseAnonKey)return 'local';
  if(!window.supabase){return (await this.cache._load())?'offline':'local'}
  this.client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey);
  try{await Promise.race([this.refresh(),new Promise((_,r)=>setTimeout(()=>r({message:'Failed: timeout'}),6000))]);return 'online'}
  catch(e){if(isMissing(e))return 'missing';return this.cache._load()?'offline':'local'}},
 // --- autenticazione admin (Supabase Auth, email + password) ---
 async signIn(email,password){const {error}=await this.client.auth.signInWithPassword({email,password});if(error)throw error;return this.isAdmin()},
 async signOut(){await this.client.auth.signOut()},
 async isAdmin(){const {data:s}=await this.client.auth.getSession();if(!s.session)return false;const {data,error}=await this.client.rpc('is_admin');return !error&&data===true},
 // migrazione una tantum dei dati locali del telefono
 async uploadLocal(){const l=JSON.parse(localStorage.getItem(LocalAdapter.key)||'null');if(!l)return 0;let n=0;
  for(const k of ['games','members','plays','tables'])for(const x of l[k]||[]){const e=await this.run({k,op:'upsert',row:MAP[k].to(x)});if(e)throw e;n++}
  localStorage.setItem('pergioco-migrated',new Date().toISOString());await this.refresh();return n}};
// Avvio: sceglie l'adapter. Senza configurazione o con tabelle mancanti resta tutto locale come prima.
DB.mode='local';DB.status='local';DB.onStatus=()=>{};
DB.setStatus=s=>{DB.status=s;DB.onStatus()};
DB.init=async()=>{const m=await SupabaseAdapter.init();DB.mode=m;
 if(m==='online'||m==='offline'){DB.adapter=SupabaseAdapter;DB.remote=SupabaseAdapter;addEventListener('online',()=>SupabaseAdapter.flush())}
 DB.setStatus(m);return m};
