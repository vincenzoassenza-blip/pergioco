// SupabaseAdapter: stessa interfaccia di LocalAdapter (getAll/replaceAll).
// Lavora su una copia locale (cache) e invia le differenze a Supabase; se offline
// le mette in coda e le sincronizza al ritorno della connessione.
const MAP={
 games:{t:'games',to:g=>({id:g.id,added_at:g.addedAt||null,name:g.name,min_players:g.min,max_players:g.max,min_time:g.minT,max_time:g.maxT,age:g.age,coop:!!g.coop,bgg_id:g.bggId??null,thumb:g.thumb??null}),
  from:r=>({id:r.id,addedAt:r.added_at,name:r.name,min:r.min_players,max:r.max_players,minT:r.min_time,maxT:r.max_time,age:r.age,coop:r.coop,bggId:r.bgg_id,thumb:r.thumb})},
 members:{t:'members',cols:'id,nome,cognome,soprannome,active,created_at,user_id,avatar,color,fav_game_id',
  // tessera e user_id si inviano solo se noti (la tessera non e' leggibile dai non admin)
  to:m=>{const r={id:m.id,nome:m.nome,cognome:m.cognome||null,soprannome:m.soprannome||null,active:m.active!==false};if(m.tessera!==undefined)r.tessera=m.tessera||null;if(m.userId!==undefined)r.user_id=m.userId||null;if(m.avatar!==undefined)r.avatar=m.avatar||null;if(m.color!==undefined)r.color=m.color||null;if(m.favGameId!==undefined)r.fav_game_id=m.favGameId||null;return r},
  from:r=>({id:r.id,nome:r.nome,cognome:r.cognome||'',soprannome:r.soprannome||'',tessera:r.tessera===undefined?undefined:(r.tessera||''),active:r.active,userId:r.user_id===undefined?undefined:r.user_id,avatar:r.avatar||'',color:r.color||'',favGameId:r.fav_game_id||'',createdAt:r.created_at||undefined})},
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
  for(const k of Object.keys(MAP)){let {data,error}=await this.client.from(MAP[k].t).select(MAP[k].cols||'*');
   if(error&&MAP[k].cols&&(error.code==='42703'||/column/i.test(error.message||''))){DB.v6Missing=true;({data,error}=await this.client.from(MAP[k].t).select('*'))}else if(MAP[k].cols)DB.v6Missing=false;if(error&&k==='tables'&&isMissing(error)){DB.tablesMissing=true;d.tables=[];continue}if(error)throw error;d[k]=data.map(MAP[k].from)}
  if(DB.v6Missing===false&&this.adminCached){const {data}=await this.client.rpc('admin_member_tessere');if(data){const t=new Map(data.map(x=>[x.id,x.tessera||'']));d.members.forEach(m=>{if(t.has(m.id))m.tessera=t.get(m.id)})}}
  if(this.queue().length)return;await this.cache.replaceAll(d)},
 async init(){const c=window.PERGIOCO_CONFIG||{};if(!c.supabaseUrl||!c.supabaseAnonKey)return 'local';
  if(!window.supabase){return (await this.cache._load())?'offline':'local'}
  this.client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey);
  try{await Promise.race([this.refresh(),new Promise((_,r)=>setTimeout(()=>r({message:'Failed: timeout'}),6000))]);return 'online'}
  catch(e){if(isMissing(e))return 'missing';return this.cache._load()?'offline':'local'}},
 // --- autenticazione admin (Supabase Auth, email + password) ---
 async signIn(email,password){const {error}=await this.client.auth.signInWithPassword({email,password});if(error)throw error;return this.isAdmin()},
 async signOut(){await this.client.auth.signOut()},
 async isAdmin(){const {data:s}=await this.client.auth.getSession();if(!s.session)return this.adminCached=false;const {data,error}=await this.client.rpc('is_admin');const a=!error&&data===true;if(a&&!this.adminCached){this.adminCached=true;try{await this.refresh()}catch(e){}}this.adminCached=a;return a},
 // --- account dei soci ---
 redirect(){return location.origin+location.pathname},
 async user(){if(!this.client)return null;const {data}=await this.client.auth.getSession();return data.session?data.session.user:null},
 // registrazione: il database rifiuta qualsiasi iscrizione senza un codice valido (nessuna email inviata)
 async signUp(code,email,password){const {data,error}=await this.client.auth.signUp({email,password,options:{data:{code}}});if(error)throw error;if(!data.session){const r=await this.client.auth.signInWithPassword({email,password});if(r.error)throw r.error}await this.refresh();return data},
 async resetWithCode(code,email,password){const {error}=await this.client.rpc('reset_password_with_code',{p_code:code,p_email:email,p_password:password});if(error)throw error},
 async updateProfile(p){const {error}=await this.client.rpc('update_my_profile',{p_soprannome:p.soprannome,p_avatar:p.avatar,p_color:p.color,p_fav_game_id:p.favGameId});if(error)throw error;await this.refresh()},
 async codes(){const {data,error}=await this.client.rpc('admin_codes');if(error)throw error;return data||[]},
 async newCode(memberId){const {data,error}=await this.client.rpc('admin_new_code',{p_member_id:memberId});if(error)throw error;return data},
 async deleteCode(memberId){const {error}=await this.client.rpc('admin_delete_code',{p_member_id:memberId});if(error)throw error},
 async setLink(memberId,userId){const {error}=await this.client.from('members').update({user_id:userId}).eq('id',memberId);if(error)throw error;await this.refresh()},
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
