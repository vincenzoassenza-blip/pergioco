// v13 — livelli XP (calcolati dal server con member_xp) e voti ai giochi
const LV_T=[[25,'Leggenda','#b8860b'],[20,'Maestro','#d84315'],[15,'Esperto','#6a1b9a'],[10,'Veterano','#1565c0'],[5,'Giocatore','#2e7d32'],[1,'Novizio','#78909c']];
const lvInfo=n=>{const t=LV_T.find(x=>n>=x[0]);return{title:t[1],color:t[2]}};
const xpFor=n=>15*(n-1)**2+35*(n-1);
const XP={map:{},rt:[],me:null,p:null,
 ensure(){if(!this.p)this.p=this.load();return this.p},
 refresh(){this.p=this.load();return this.p},
 async load(){const c=DB.remote&&DB.remote.client;if(!c||DB.mode!=='online')return;
  try{const [a,b,u]=await Promise.all([c.rpc('member_xp'),c.from('game_ratings').select('*'),DB.remote.user()]);
   if(!a.error){const m={};(a.data||[]).forEach(r=>m[r.member_id]=r);this.map=m}
   if(!b.error)this.rt=b.data||[];
   if(u){const ms=await DB.members();const me=ms.find(m=>m.userId===u.id);this.me=me?me.id:null}}catch(e){console.warn('XP',e)}}};
const cpCamp=id=>!!id&&typeof CP!=='undefined'&&CP.camp===id;
const lv=id=>{const k=cpCamp(id)?' <span class="lv lvchamp" title="Campione in carica della Coppa Antero">👑</span>':'';const r=id&&XP.map[id];if(!r)return k;const i=lvInfo(r.level);return` <span class="lv" style="background:${i.color}" title="${i.title} · ${r.xp} XP">Lv ${r.level}</span>`+k};
const champH=(id,h)=>cpCamp(id)?`<span class="champ">${h}</span>`:h;
const nmH=m=>champH(m&&m.id,esc(memberName(m)))+(m?lv(m.id):'');
const lbH=(x,ms)=>champH(x&&x.memberId,esc(Stats.label(x,ms)))+(x&&x.memberId?lv(x.memberId):'');
const XP_SRC=[['partite','🎲 Partite',10],['vittorie','🏆 Vittorie',5],['serate','🌙 Serate',15],['eventi','🎟️ Eventi (presente)',25],['tavoli','🏠 Tavoli ospitati e giocati',20],['giochi_nuovi','🧩 Giochi diversi',10],['sfide','⚖️ Sfide',10],['sfide_vinte','🥇 Sfide vinte',5],['sfavorito','🐢 Vinte da sfavorito',15],['coppa','🏆 Coppa Antero',50],['coppa_campione','👑 Campione Coppa Antero',150],['badge','🏅 Badge',30]];
function xpCard(id){const r=XP.map[id];if(!r)return'';const i=lvInfo(r.level),a=xpFor(r.level),b=xpFor(r.level+1),pc=Math.round((r.xp-a)/(b-a)*100),d=r.dettaglio||{};
 return`<div class="card xpc"><div class="row" style="align-items:center;justify-content:space-between"><div><span class="lv lvb" style="background:${i.color}">Lv ${r.level}</span> <b style="color:${i.color}">${i.title}</b></div><b>${r.xp} XP</b></div>
 <div class="xpbar"><i style="width:${pc}%;background:${i.color}"></i></div><div class="muted" style="font-size:12px">${b-r.xp} XP al livello ${r.level+1}</div>
 <details><summary class="muted" style="font-size:13px">Da dove arrivano i punti</summary>${XP_SRC.map(([k,l,p])=>{const v=d[k]||[0,0];return`<div class="rec"><span>${l} <span class="muted">${v[0]} × ${p}</span></span><b>+${v[1]}</b></div>`}).join('')}</details></div>`}
const Rate={
 of(g){return XP.rt.filter(r=>r.game_id===g)},
 avg(g){const l=this.of(g);return{n:l.length,a:l.length?l.reduce((s,r)=>s+r.voto,0)/l.length:null}},
 star(g){const v=this.avg(g);return v.n?`⭐ ${v.a.toFixed(1).replace('.',',')} · `:''},
 mine(g){return XP.rt.find(r=>r.game_id===g&&r.member_id===XP.me)},
 async canRate(g){if(!XP.me)return false;const ps=await DB.plays();return ps.some(p=>p.gameId===g&&p.players.some(x=>x.memberId===XP.me))},
 async save(g,v,c){const{error}=await DB.remote.client.rpc('rate_game',{p_game:g,p_voto:v,p_commento:c||null});if(error)throw error;await XP.refresh()},
 async mod(m,g,del){const{error}=await DB.remote.client.rpc('rating_moderate',{p_member:m,p_game:g,p_delete:del});if(error)throw error;await XP.refresh()}};
function rateDialog(g){const cur=Rate.mine(g.id);return new Promise(res=>{const o=document.createElement('div');o.className='mdl';
 o.innerHTML=`<div class="mbox" role="dialog" aria-modal="true"><div class="mtt">⭐ Vota ${esc(g.name)}</div><div class="mtx"><div class="vgrid">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button class="vb${cur&&cur.voto===n?' on':''}" data-v="${n}">${n}</button>`).join('')}</div>
 <label>Commento (facoltativo)</label><textarea class="min" maxlength="200" rows="3" placeholder="Max 200 caratteri">${esc(cur&&cur.commento||'')}</textarea><div class="muted" style="font-size:12px;text-align:right"><span class="cc">0</span>/200</div></div>
 <div class="mbt">${cur?'<button class="danger" data-k="d">Rimuovi</button>':''}<button class="s" data-k="0">Annulla</button><button class="p" data-k="1">Salva</button></div></div>`;
 let v=cur?cur.voto:null;const ta=o.querySelector('textarea'),cc=o.querySelector('.cc'),up=()=>cc.textContent=ta.value.length;up();ta.oninput=up;
 o.querySelector('.vgrid').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;v=+b.dataset.v;o.querySelectorAll('.vb').forEach(x=>x.classList.toggle('on',x===b))};
 const rel=backClose(()=>{o.remove();res(false)});
 o.querySelector('.mbt').onclick=async e=>{const k=e.target.closest('[data-k]');if(!k)return;const kk=k.dataset.k;if(kk==='0'){rel();o.remove();return res(false)}
  if(kk==='1'&&!v)return toast('Scegli un voto da 1 a 10');
  try{await Rate.save(g.id,kk==='d'?null:v,ta.value.trim());rel();o.remove();toast(kk==='d'?'Voto rimosso':'Voto salvato ⭐');res(true)}catch(err){toast('Errore: '+err.message)}};
 document.body.appendChild(o)})}
async function rateSection(g,o){await XP.ensure();const box=document.createElement('div');box.className='card rsec';o.querySelector('.gpc').children[1].after(box);
 const draw=async()=>{const v=Rate.avg(g.id),me=Rate.mine(g.id),can=await Rate.canRate(g.id),ms=await DB.members(),st=adminMode(),l=Rate.of(g.id).filter(r=>r.commento).sort((a,b)=>b.updated_at.localeCompare(a.updated_at));
  box.innerHTML=`<div class="row" style="align-items:center"><div><b>⭐ Voto dei soci</b><div class="muted">${v.n?`${v.n} vot${v.n==1?'o':'i'}`:'Ancora nessun voto'}</div></div><div class="big" style="margin-left:auto;text-align:right">${v.n?v.a.toFixed(1).replace('.',','):'—'}<small class="muted">/10</small></div></div>
  ${me?`<div class="rec"><span>Il tuo voto: <b>${me.voto}/10</b>${me.commento?`<br><span class="muted">“${esc(me.commento)}”</span>`:''}</span><button class="s rv">Modifica</button></div>`:can?'<button class="p rv" style="width:100%">⭐ Vota questo gioco</button>':`<p class="muted" style="font-size:13px">${XP.me?'Potrai votarlo dopo averci giocato.':'Solo i soci che ci hanno giocato possono votarlo.'}</p>`}
  ${l.length?`<div style="margin-top:6px">${l.map(r=>{const m=ms.find(x=>x.id===r.member_id);return`<div class="rec"><span>${m?nmH(m):'Socio'} · <b>${r.voto}/10</b><br><span class="muted">“${esc(r.commento)}”</span></span>${st?`<button class="s rmc" data-m="${r.member_id}" title="Rimuovi commento">🗑️</button>`:''}</div>`}).join('')}</div>`:''}`;
  const b=box.querySelector('.rv');if(b)b.onclick=async()=>{if(await rateDialog(g))draw()};
  box.querySelectorAll('.rmc').forEach(b=>b.onclick=async()=>{const del=await modal('Rimuovere il commento inappropriato? (Il voto resta. Scrivi ELIMINA per cancellare anche il voto.)',{input:true});if(del===null||del===false)return;try{await Rate.mod(b.dataset.m,g.id,String(del).trim().toUpperCase()==='ELIMINA');toast('Fatto');draw()}catch(e){toast('Errore: '+e.message)}})};
 draw()}
async function ratePrompt(p){try{await XP.p;if(!XP.me||!p.players.some(x=>x.memberId===XP.me)||Rate.mine(p.gameId))return;const g=(await DB.games()).find(x=>x.id===p.gameId);if(!g)return;
 document.querySelectorAll('.rprompt').forEach(x=>x.remove());const e=document.createElement('div');e.className='rprompt';e.innerHTML=`<span>Ti è piaciuto <b>${esc(g.name)}</b>?</span><button class="p">⭐ Vota</button><button class="s" aria-label="Chiudi">✕</button>`;
 const bs=e.querySelectorAll('button');bs[0].onclick=async()=>{e.remove();await rateDialog(g)};bs[1].onclick=()=>e.remove();document.body.appendChild(e);setTimeout(()=>e.remove(),12000)}catch(err){console.warn(err)}}
// v37.4: classifica XP paginata (10 per pagina), apre sempre a pagina 1; posizione reale; "📍 La mia posizione" porta alla pagina del socio collegato
const XPPG=10;
function xpTop(pg,hl){const all=Object.values(XP.map).sort((a,b)=>b.xp-a.xp);if(!all.length)return'';const tot=Math.ceil(all.length/XPPG);pg=Math.min(Math.max(1,+pg||1),tot);const o=(pg-1)*XPPG,ms=all.slice(o,o+XPPG),mine=!!XP.me&&all.some(r=>r.member_id===XP.me);
 return`<div class="card"><b>⚡ Classifica XP</b>${ms.map((r,k)=>{const n=o+k;return`<div class="rec${hl&&r.member_id===hl?' xpme':''}"><span>${['🥇','🥈','🥉'][n]||(n+1)+'.'} <a class="pv" data-pv="${esc(r.member_id)}">${esc(XP._n[r.member_id]||'Socio')}${lv(r.member_id)}</a></span><b>${+r.xp||0} XP</b></div>`}).join('')}
 ${tot>1||mine?`<div class="xppg">${tot>1?`<button type="button" class="s" data-xpp="${pg-1}"${pg<=1?' disabled':''}>‹ Precedente</button><span class="muted" aria-live="polite">Pagina ${pg} di ${tot}</span><button type="button" class="s" data-xpp="${pg+1}"${pg>=tot?' disabled':''}>Successiva ›</button>`:''}</div>${mine?'<button type="button" class="s xpmy" data-xpme="1">📍 La mia posizione</button>':''}`:''}</div>`}
function xpTopBind(d){const draw=(pg,hl)=>{d.innerHTML=xpTop(pg,hl).replace('Classifica XP</b>','Classifica XP</b> <small class="muted">(totale, non filtrata)</small>')};
 d.addEventListener('click',e=>{const b=e.target.closest('[data-xpp],[data-xpme]');if(!b||b.disabled)return;if(b.dataset.xpme){const all=Object.values(XP.map).sort((a,b)=>b.xp-a.xp),i=all.findIndex(r=>r.member_id===XP.me);if(i<0)return;draw(Math.floor(i/XPPG)+1,XP.me);const r=d.querySelector('.xpme');if(r)r.scrollIntoView({block:'center',behavior:'smooth'})}else{draw(+b.dataset.xpp);d.scrollIntoView({block:'start',behavior:'smooth'})}});draw(1)}
XP._n={};
Object.keys(views).forEach(k=>{const f=views[k];views[k]=async(...a)=>{await XP.ensure();const r=await f.apply(views,a);
 if(k==='record'&&typeof V!=='undefined'){const ms=await DB.members();ms.forEach(m=>XP._n[m.id]=memberName(m));const h=V.querySelector('.pfbar')||V.querySelector('h2');if(h&&!V.querySelector('.xptop')){const d=document.createElement('div');d.className='xptop';xpTopBind(d);h.after(d)}RA.mount()}return r}});
// v37.4: nuovi record assoluti (pari merito gestiti; nomi sempre con esc; dati server solo aggregati per socio)
const RA={
 fd(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return m?`${+m[3]}/${+m[2]}/${m[1]}`:''},
 top(m){let b=null,w=[];for(const[id,v]of m){if(!(v>0))continue;if(b===null||v>b){b=v;w=[id]}else if(v===b)w.push(id)}return b===null?null:{v:b,ids:w}},
 cnt(arr){const m=new Map();arr.forEach(x=>{if(x!=null&&x!=='')m.set(x,(m.get(x)||0)+1)});return m},
 async server(){try{if(!DB.remote||!DB.remote.client)return[];const{data,error}=await DB.remote.client.rpc('record_assoluti');if(error)throw error;return data||[]}catch(e){console.warn('record_assoluti',e);return[]}},
 async html(){const ps0=await DB.plays(),ps=typeof pf==='function'?pf(ps0):ps0,gs=await DB.games(),ms=await DB.members(),act=new Set(ms.filter(m=>m.active!==false).map(m=>m.id)),gn=id=>{const g=gs.find(x=>x.id===id);return g?g.name:'Gioco'};
  const nm=id=>{const m=ms.find(x=>x.id===id);return m?memberName(m):'Socio'},P=[];ps.forEach(p=>(p.players||[]).forEach(x=>{if(x.memberId&&act.has(x.memberId))P.push({p,id:x.memberId,w:!!x.winner})}));
  const comp=P.filter(x=>!x.p.coop),out=[],who=t=>{const s=t.ids.slice(0,3).map(id=>`<a class="pv" data-pv="${esc(id)}">${esc(nm(id))}${lv(id)}</a>`).join(', ');return s+(t.ids.length>3?` <span class="muted">+${t.ids.length-3}</span>`:'')},
   txt=t=>t.ids.slice(0,2).map(esc).join(', ')+(t.ids.length>2?` <span class="muted">+${t.ids.length-2}</span>`:''),
   add=(ic,t,top,f,lab)=>{if(top)out.push([ic,t,lab?txt(top):who(top),f(top.v)]),0},pl=(v,a,b)=>v+' '+(v==1?a:b);
  // EXP
  add('⚡','Re degli EXP',RA.top(new Map(Object.values(XP.map).filter(r=>act.has(r.member_id)).map(r=>[r.member_id,+r.xp||0]))),v=>v+' XP');
  // % vittorie (min 10 competitive)
  {const n=RA.cnt(comp.map(x=>x.id)),w=RA.cnt(comp.filter(x=>x.w).map(x=>x.id)),m=new Map();n.forEach((c,id)=>{if(c>=10)m.set(id,Math.round(1000*(w.get(id)||0)/c))});const t=RA.top(m);add('🎯','Miglior % di vittorie',t,v=>String(Math.round(v)/10).replace('.',',')+'% (min. 10 partite)')}
  {const m=new Map();comp.filter(x=>x.w).forEach(x=>{if(!m.has(x.id))m.set(x.id,new Set());m.get(x.id).add(x.p.gameId)});add('🏅','Vincitore eclettico',RA.top(new Map([...m].map(([k,s])=>[k,s.size]))),v=>pl(v,'gioco diverso vinto','giochi diversi vinti'))}
  {const first=new Map();[...ps].sort((a,b)=>String(a.date).localeCompare(String(b.date))).forEach(p=>{if(first.has(p.gameId))return;const d=p.date;first.set(p.gameId,ps.filter(q=>q.gameId===p.gameId&&q.date===d).flatMap(q=>(q.players||[]).map(x=>x.memberId)).filter(id=>id&&act.has(id)))});
   const m=new Map();first.forEach(ids=>new Set(ids).forEach(id=>m.set(id,(m.get(id)||0)+1)));add('🧪','Pioniere: primo a giocare più giochi dell\'associazione',RA.top(m),v=>pl(v,'gioco','giochi'))}
  add('📝','Critico più attivo',RA.top(RA.cnt(XP.rt.filter(r=>act.has(r.member_id)).map(r=>r.member_id))),v=>pl(v,'voto','voti'));
  {const t=RA.top(RA.cnt(ps.map(p=>p.gameId)));if(t)t.ids=t.ids.map(gn);add('🎲','Gioco più giocato',t,v=>pl(v,'partita','partite'),1)}
  {const t=RA.top(new Map(ps.map(p=>[p.id,(p.players||[]).length])));if(t)t.ids=t.ids.map(id=>{const p=ps.find(x=>x.id===id);return gn(p.gameId)+' · '+RA.fd(p.date)});add('👥','Partita più affollata',t,v=>pl(v,'giocatore','giocatori'),1)}
  {const t=RA.top(new Map(ps.filter(p=>+p.duration>0).map(p=>[p.id,+p.duration])));if(t)t.ids=t.ids.map(id=>{const p=ps.find(x=>x.id===id);return gn(p.gameId)+' · '+RA.fd(p.date)});add('⏱️','Partita più lunga',t,v=>v+' min',1)}
  {let tb=[];try{tb=await DB.allTables()}catch(e){}add('🪑','Padrone di casa',RA.top(RA.cnt((tb||[]).map(t=>t.hostId).filter(id=>act.has(id)))),v=>pl(v,'tavolo organizzato','tavoli organizzati'))}
  {const sf=P.filter(x=>x.p.sfidaId);add('⚔️','Più Sfide giocate',RA.top(RA.cnt(sf.map(x=>x.id))),v=>pl(v,'sfida','sfide'));add('🗡️','Più Sfide vinte',RA.top(RA.cnt(sf.filter(x=>x.w).map(x=>x.id))),v=>pl(v,'sfida vinta','sfide vinte'))}
  const sv=await RA.server(),S=k=>RA.top(new Map(sv.filter(r=>r.k===k&&act.has(r.member_id)).map(r=>[r.member_id,+r.v])));
  add('🎪','Più presenze agli eventi',S('presenze'),v=>pl(v,'presenza','presenze'));
  add('🧞','Genio della lampada – Più desideri avverati',S('avverati'),v=>pl(v,'desiderio avverato','desideri avverati'));
  add('🗳️','Più voti ai desideri',S('voti'),v=>pl(v,'voto','voti'));
  add('🎓','Più giochi da spiegare',S('spiego'),v=>pl(v,'gioco','giochi'));
  add('👑','Più Coppe Antero vinte',S('coppe'),v=>pl(v,'coppa','coppe'));
  add('🥊','Più incontri vinti in Coppa',S('coppa_vinti'),v=>pl(v,'incontro','incontri'));
  return out.map(([ic,t,h,v])=>`<div class="roc"><span class="roi">${ic}</span><span class="rot">${esc(t)}</span><span class="roh roh2">${h}</span><span class="rov2">${esc(v)}</span></div>`).join('')},
 async mount(){const g=typeof V!=='undefined'&&V.querySelector('.rov');if(!g||g.dataset.ra)return;g.dataset.ra='1';try{g.insertAdjacentHTML('beforeend',await RA.html())}catch(e){console.warn('RA',e)}}};
