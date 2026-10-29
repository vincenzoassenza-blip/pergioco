const romeToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
const START=location.hash;
const $=s=>document.querySelector(s),V=$('#view');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=d=>new Date(d+'T12:00').toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'});
const toast=t=>{const e=document.createElement('div');e.className='toast';e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),2200)};
const gname=(gs,id)=>(gs.find(g=>g.id===id)||{}).name||'?';
let admin=false,adminTab='soci';
// modalita' admin/utente (solo per chi e' admin), scelta salvata sul telefono
const uiMode=()=>localStorage.getItem('pergioco-mode')||'admin';
const adminMode=()=>admin&&uiMode()!=='user';
function setMode(m){localStorage.setItem('pergioco-mode',m);drawModeBtn();toast(m==='user'?'Modalità utente':'Modalità admin');const v=location.hash.slice(1);go(views[v]?v:'ludoteca')}
function modal(msg,{input=false,def='',cancel=true}={}){return new Promise(res=>{const o=document.createElement('div');o.className='mdl';
 o.innerHTML=`<div class="mbox" role="dialog" aria-modal="true"><div class="mtt">🎲 PerGioco</div><div class="mtx"></div>${input?'<input class="min">':''}<div class="mbt">${cancel?'<button class="s" data-k="0">Annulla</button>':''}<button class="p" data-k="1">OK</button></div></div>`;
 o.querySelector('.mtx').textContent=msg;const i=o.querySelector('.min');if(i)i.value=def;document.body.appendChild(o);(i||o.querySelector('[data-k="1"]')).focus();if(i)i.select();
 const end=v=>{o.remove();document.removeEventListener('keydown',kd);res(v)};const kd=e=>{if(e.key==='Escape')end(input?null:false);if(e.key==='Enter')end(input?i.value:true)};document.addEventListener('keydown',kd);
 o.onclick=e=>{if(e.target===o)end(input?null:false);const k=e.target.dataset.k;if(k)end(k==='1'?(input?i.value:true):(input?null:false))}})}
const ask=m=>modal(m),askText=(m,d='')=>modal(m,{input:true,def:d});
function isMod(){return !!(admin&&DB.remote&&DB.remote.modCached)}
function drawModeBtn(){const b=document.getElementById('modebtn');if(!b)return;b.hidden=!admin;b.textContent=uiMode()==='user'?'👤 Modalità utente':isMod()?'🛡 Modalità moderatore':'🔧 Modalità admin';document.body.classList.toggle('adm',adminMode())}
const playRow=(p,gs,ms)=>`<div class="rec"><span>${esc(gname(gs,p.gameId))}<br><span class="muted">${fmt(p.date)} · ${p.evening}${p.scenario?' · '+esc(p.scenario):''}</span></span><span class="win">${p.coop?(p.groupWin?'Vittoria':'Sconfitta'):esc(p.players.filter(x=>x.winner).map(x=>Stats.label(x,ms)).join(', '))}</span></div>`;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
// Selettore soci: lista alfabetica con checkbox e ricerca (nome/cognome/soprannome, senza accenti)
function pickMembers(ms,selected,title,max){return new Promise(res=>{const sel=new Set(selected||[]);
 const list=ms.slice().sort((a,b)=>memberName(a).localeCompare(memberName(b),'it'));
 const w=document.createElement('div');w.className='modal';w.innerHTML=`<div class="sheet"><div class="row"><b>${esc(title||'Aggiungi giocatori')}</b><span class="muted" id="pkn" style="text-align:right"></span></div>
 <input id="pkq" placeholder="Cerca per nome, cognome o soprannome…"><div id="pkl" class="pkl"></div><div class="row"><button class="s" id="pkx">Annulla</button><button class="p" id="pko">Conferma</button></div></div>`;
 document.body.append(w);let q='';
 const draw=()=>{w.querySelector('#pkn').textContent=sel.size+(max?'/'+max:'')+' selezionati';
  const l=q?list.filter(m=>norm([m.nome,m.cognome,m.soprannome,m.nome].join(' ')).includes(q)||norm(memberName(m)).includes(q)).slice(0,20):list.filter(m=>sel.has(m.id)).concat(list.filter(m=>!sel.has(m.id)).slice(0,Math.max(0,20-sel.size)));
  w.querySelector('#pkl').innerHTML=(!q&&list.length>l.length?'<p class="muted">Scrivi per cercare tra tutti i '+list.length+' soci.</p>':'')+l.map(m=>`<div class="pki" data-id="${m.id}"><input type="checkbox" tabindex="-1"${sel.has(m.id)?' checked':''}> <span>${esc(memberName(m))}</span></div>`).join('')||'<p class="muted">Nessun socio trovato</p>'};
 w.querySelector('#pkq').oninput=e=>{q=norm(e.target.value.trim());draw()};
 w.querySelector('#pkl').onclick=e=>{const r=e.target.closest('.pki');if(!r)return;e.preventDefault();const id=r.dataset.id;if(sel.has(id))sel.delete(id);else{if(max&&sel.size>=max)return toast('Tavolo pieno');sel.add(id)}draw()};
 const close=v=>{w.remove();res(v)};w.querySelector('#pkx').onclick=()=>close(null);w.querySelector('#pko').onclick=()=>close([...sel]);w.onclick=e=>e.target===w&&close(null);draw()})}
const badgeCtx=async()=>({plays:await DB.plays(),games:await DB.games(),tables:await DB.allTables()});
const badgeSnap=async()=>{const c=await badgeCtx(),ms=await DB.members(),o={};ms.forEach(m=>o['m:'+m.id]=Badges.unlocked('m:'+m.id,c));return o};
const badgeNew=async(before,keys)=>{const c=await badgeCtx(),ms=await DB.members(),out=[];keys.forEach(k=>{const b=Badges.list(k,c).filter(b=>b.on&&!(before[k]||[]).includes(b.id));const m=ms.find(m=>'m:'+m.id===k);b.forEach(x=>out.push(`${x.icon} ${m?memberName(m):''}: ${x.name}`))});
 out.forEach((t,i)=>setTimeout(()=>{const e=document.createElement('div');e.className='toast badge-toast';e.textContent='Nuovo badge! '+t;document.body.append(e);setTimeout(()=>e.remove(),3200)},2300+i*3300))};
const nextEvening=()=>{const d=new Date(),wd=d.getDay();const add=wd===4||wd===0?0:(wd<4?4-wd:7-wd);d.setDate(d.getDate()+add);return{date:d.toLocaleDateString('sv-SE'),evening:d.getDay()===4?'Giovedì':'Domenica'}};
const views={
async ludoteca(){const gs=await DB.games(),ps=await DB.plays();const f={n:'',t:'',q:''};
 V.innerHTML=`<h2>I nostri giochi</h2><div class="card"><input id="q" placeholder="Cerca un gioco…"><div class="row" style="margin-top:8px">
 <select id="n"><option value="">Quanti siamo?</option>${[1,2,3,4,5,6,7,8].map(i=>`<option>${i}</option>`)}</select>
 <select id="t"><option value="">Quanto tempo?</option><option value="30">30 min</option><option value="60">1 ora</option><option value="90">1h 30</option><option value="120">2 ore</option><option value="999">Tutta la sera</option></select></div></div><div id="gl"></div>
${adminMode()?` <details class="card"><summary><b>Aggiungi un gioco</b></summary><label>Nome</label><input id="gn"><div class="row"><div><label>Giocatori min</label><input id="g1" type="number" value="1"></div><div><label>max</label><input id="g2" type="number" value="4"></div></div>
 <div class="row"><div><label>Minuti min</label><input id="g3" type="number" value="30"></div><div><label>max</label><input id="g4" type="number" value="60"></div><div><label>Età</label><input id="g5" type="number" value="10"></div></div>
 <label><input type="checkbox" id="gc" style="width:auto"> Cooperativo</label><button class="p" id="ga">Aggiungi</button></details>`:''}`;
 const draw=()=>{const l=gs.filter(g=>(!f.q||g.name.toLowerCase().includes(f.q))&&(!f.n||(g.min<=f.n&&g.max>=f.n))&&(!f.t||g.minT<=f.t));
  $('#gl').innerHTML=l.length?l.map(g=>{const n=ps.filter(p=>p.gameId===g.id).length;return`<div class="card"><div class="row"><b>${esc(g.name)}</b><span class="muted" style="text-align:right">${n} partit${n==1?'a':'e'}</span></div>
  <div class="chips"><span class="chip">👥 ${g.min}–${g.max}</span><span class="chip">⏱ ${g.minT}–${g.maxT} min</span><span class="chip">🎂 ${g.age}+</span>${g.coop?'<span class="chip coop">Cooperativo</span>':''}</div></div>`}).join(''):'<p class="muted">Nessun gioco adatto. Provate a cambiare i filtri.</p>'};
 $('#q').oninput=e=>{f.q=e.target.value.toLowerCase();draw()};$('#n').onchange=e=>{f.n=+e.target.value;draw()};$('#t').onchange=e=>{f.t=+e.target.value;draw()};
 if($('#ga'))$('#ga').onclick=async()=>{const n=$('#gn').value.trim();if(!n)return toast('Inserisci il nome');await DB.addGame({name:n,min:+$('#g1').value,max:+$('#g2').value,minT:+$('#g3').value,maxT:+$('#g4').value,age:+$('#g5').value,coop:$('#gc').checked});toast('Gioco aggiunto');go('ludoteca')};draw()},
async nuova(ed){const gs=await DB.games(),all=await DB.members(),ms=all.filter(m=>m.active||(ed&&ed.players.some(x=>x.memberId===m.id)));const today=new Date().toISOString().slice(0,10);
 V.innerHTML=`<h2>${ed&&ed.id?'Modifica partita':'Registra una partita'}</h2><div class="card"><label>Gioco</label><select id="g">${gs.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`)}</select>
 <div class="row"><div><label>Data</label><input id="d" type="date" value="${today}"></div><div><label>Serata</label><select id="e"><option>Giovedì</option><option>Domenica</option><option>Evento</option></select></div></div>
 <label>Modalità</label><div class="seg" id="mode"><button data-m="0" class="on">Competitiva</button><button data-m="1">Cooperativa</button></div>
 <div id="coop" hidden><label>Scenario</label><input id="sc" placeholder="es. Scenario 3"><label>Esito del gruppo</label><div class="seg" id="res"><button data-r="1" class="on">Vittoria</button><button data-r="0">Sconfitta</button></div></div>
 <label>Soci al tavolo</label>${ms.length?`<button class="s" id="pk" style="width:100%">👥 Aggiungi giocatori</button>`:'<p class="warn">Nessun socio in elenco: un admin deve aggiungerli da Altro → Pannello admin.</p>'}
 <label>Ospite (non socio)</label><div class="row"><input id="gn" placeholder="Nome ospite"><button class="s" id="ga" style="flex:0 0 auto">+ Ospite</button></div>
 <label>Giocatori <span id="sl">e punteggi</span></label><div id="pl"></div>
 <label>Nota (facoltativa)</label><textarea id="nt" rows="2"></textarea><button class="p" id="save">${ed&&ed.id?'Salva modifiche':'Salva partita'}</button>${ed?'<button class="s" id="cx" style="width:100%;margin-top:6px">Annulla</button>':''}</div>`;
 let coop=false,win=true,q='';const sel=[];
 const drawChips=()=>{};
 const drawSel=()=>{$('#pl').innerHTML=sel.length?'':'<p class="muted">Nessuno selezionato.</p>';sel.forEach((s,i)=>{const d=document.createElement('div');d.className='prow';d.innerHTML=`<input disabled value="${esc(s.memberId?memberName(all.find(m=>m.id===s.memberId)):s.name+(s.guest?' (ospite)':''))}"><input type="number" inputmode="decimal" placeholder="Punti" class="ps" value="${s.score??''}"${coop?' hidden':''}><button class="s">✕</button>`;
  d.querySelector('.ps').oninput=e=>s.score=e.target.value;d.querySelector('button').onclick=()=>{sel.splice(i,1);drawSel();drawChips()};$('#pl').append(d)})};
 if($('#pk'))$('#pk').onclick=async()=>{const ids=await pickMembers(ms,sel.filter(x=>x.memberId).map(x=>x.memberId),'Aggiungi giocatori');if(!ids)return;for(let i=sel.length-1;i>=0;i--)if(sel[i].memberId&&!ids.includes(sel[i].memberId))sel.splice(i,1);ids.forEach(id=>sel.some(x=>x.memberId===id)||sel.push({memberId:id,score:''}));drawSel()};
 $('#ga').onclick=()=>{const n=$('#gn').value.trim();if(!n)return toast('Scrivi il nome dell\'ospite');sel.push({guest:true,name:n,score:''});$('#gn').value='';drawSel()};
 const setMode=c=>{coop=c;$('#coop').hidden=!c;$('#sl').hidden=c;document.querySelectorAll('.ps').forEach(i=>i.hidden=c);document.querySelectorAll('#mode button').forEach(b=>b.classList.toggle('on',+b.dataset.m==c))};
 const setRes=w=>{win=w;document.querySelectorAll('#res button').forEach(b=>b.classList.toggle('on',(b.dataset.r==='1')===w))};
 $('#mode').onclick=e=>e.target.dataset.m&&setMode(e.target.dataset.m==='1');
 $('#g').onchange=()=>setMode(!!gs.find(g=>g.id===$('#g').value).coop);
 $('#res').onclick=e=>e.target.dataset.r&&setRes(e.target.dataset.r==='1');
 if(ed){$('#g').value=ed.gameId;$('#d').value=ed.date;$('#e').value=ed.evening;if(ed.fromTable)setMode(!!(gs.find(g=>g.id===ed.gameId)||{}).coop);$('#nt').value=ed.note||'';$('#sc').value=ed.scenario||'';ed.players.forEach(x=>sel.push({...x,score:x.score??''}));setMode(!!ed.coop);if(ed.coop)setRes(!!ed.groupWin);if($('#cx'))$('#cx').onclick=()=>go(ed.id?'altro':'serata')}else setMode(!!gs[0]?.coop);
 drawChips();drawSel();
 $('#save').onclick=async()=>{if(!sel.length)return toast('Seleziona almeno un giocatore');
  const players=sel.map(s=>s.memberId?{memberId:s.memberId,score:coop?null:s.score}:{guest:!!s.guest,name:s.name,score:coop?null:s.score});
  const p={gameId:$('#g').value,date:$('#d').value,evening:$('#e').value,coop,groupWin:coop?win:null,scenario:coop?$('#sc').value:'',players,note:$('#nt').value};
  const keys=players.filter(x=>x.memberId).map(x=>'m:'+x.memberId),before=await badgeSnap();
  if(ed&&ed.id){p.id=ed.id;await DB.updatePlay(p);badgeNew(before,keys);toast('Partita aggiornata');adminTab='partite';return go('altro')}
  const r=await DB.addPlay(p);if(ed&&ed.fromTable)await DB.saveTable({id:ed.fromTable,status:'closed',playId:r.id});badgeNew(before,keys);const w=r.players.filter(x=>x.winner).map(x=>Stats.label(x,all));toast(coop?(win?'Vittoria del gruppo! 🎉':'Sconfitta… alla prossima!'):`Vince ${w.join(' e ')||'—'} 🏆`);go('record')}},
async record(){const gs=await DB.games(),ps=await DB.plays(),ms=await DB.members(),all=Stats.players(ps,ms),pl=all.filter(p=>p.member);const rec=Stats.records(gs,ps),gc=Stats.gameCounts(gs,ps).filter(x=>x.n);
 const top=pl.slice().sort((a,b)=>b.presences-a.presences||b.plays-a.plays||a.tD-b.tD)[0],var_=pl.slice().sort((a,b)=>b.distinct-a.distinct||b.plays-a.plays||a.tG-b.tG)[0],ng=all.length-pl.length;
 V.innerHTML=`<h2>Record</h2>${adminMode()?'<button class="s" onclick="go(\'stats\')" style="width:100%;margin-bottom:10px">📊 Statistiche associazione (admin)</button>':''}<div class="row"><div class="card"><div class="muted">Partite</div><div class="big">${ps.length}</div></div><div class="card"><div class="muted">Soci</div><div class="big">${pl.length}</div></div><div class="card"><div class="muted">Ospiti</div><div class="big">${ng}</div></div></div>
 <div class="card"><b>⭐ Socio più presente</b><div class="rec"><span>${top?`<a class="pv" data-pv="${top.key.slice(2)}">${esc(top.name)}</a>`:'—'}</span><span class="win">${top?top.presences+(top.presences==1?' serata':' serate'):''}</span></div>
 <b>🧭 Più giochi diversi</b><div class="rec"><span>${var_?`<a class="pv" data-pv="${var_.key.slice(2)}">${esc(var_.name)}</a>`:'—'}</span><span class="win">${var_?var_.distinct+' giochi':''}</span></div></div>
 <div class="card"><b>🏆 Punteggio più alto per gioco</b>${rec.length?rec.map(r=>`<div class="rec"><span>${esc(r.game.name)}<br><span class="muted">${esc(Stats.label(r.best.p,ms))} · ${fmt(r.best.date)}</span></span><span class="big">${r.best.score}</span></div>`).join(''):'<p class="muted">Ancora nessun punteggio.</p>'}</div>
 <div class="card"><b>🎲 Giochi più giocati</b>${gc.length?gc.map(x=>`<div class="rec"><span>${esc(x.game.name)}</span><b>${x.n}</b></div>`).join(''):'<p class="muted">Ancora nessuna partita.</p>'}</div>
 <div class="card"><b>🕑 Ultime partite</b>${ps.slice(0,10).map(p=>playRow(p,gs,ms)).join('')||'<p class="muted">—</p>'}</div>`},
async giocatori(){const gs=await DB.games(),ms=await DB.members(),bc=await badgeCtx(),all=Stats.players(await DB.plays(),ms).sort((a,b)=>b.plays-a.plays||b.presences-a.presences||a.tP-b.tP);
 const card=p=>`<div class="card"><div class="row">${p.member?`<a class="pv" data-pv="${p.key.slice(2)}">${avatarHtml(ms.find(m=>'m:'+m.id===p.key),28)} ${esc(p.name)}</a>`:`<b>${esc(p.name)}</b>`}<span class="muted" style="text-align:right">${p.presences} serat${p.presences==1?'a':'e'}</span></div>
 <div class="chips"><span class="chip">🎲 ${p.plays} partite</span><span class="chip">🏆 ${p.wins} vittorie</span><span class="chip">${Math.round(p.wins/p.plays*100)}%</span></div>
 <div class="muted" style="margin-top:8px">Preferiti: ${p.fav.slice(0,3).map(([id,n])=>esc(gname(gs,id))+' ('+n+')').join(', ')}</div>${p.member?(()=>{const bl=Badges.list(p.key,bc);return`<details class="bd"><summary>🏅 Badge ${bl.filter(b=>b.on).length}/${bl.length} ${bl.filter(b=>b.on).map(b=>b.icon).join('')}</summary><div class="badges">${bl.map(b=>`<div class="badge${b.on?'':' off'}"><div class="bi">${b.on?b.icon:'🔒'}</div><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div></details>`})():''}</div>`;
 const myId=DB.remote?(await DB.remote.user())?.id:null,me=ms.find(m=>myId&&m.userId===myId),mine=me&&all.find(p=>p.key==='m:'+me.id);
 const mini=m=>`<div class="rec"><a class="pv" data-pv="${m.id}">${avatarHtml(m,28)} ${esc(`${m.nome} ${m.cognome||''}`.trim())}${m.soprannome?` <span class="muted">(${esc(m.soprannome)})</span>`:''}</a></div>`;
 V.innerHTML=`<h2>Io</h2>${mine?card(mine):me?`<div class="card">${mini(me)}<p class="muted">Ancora nessuna partita registrata.</p></div>`:'<div class="card muted">Il tuo account non è collegato a una scheda socio.</div>'}
 <h2>Cerca un socio</h2><input id="gq" placeholder="Nome, cognome o soprannome (almeno 2 lettere)" autocomplete="off"><div id="gr" class="card" style="margin-top:8px"><p class="muted">Scrivi almeno 2 lettere per cercare tra i soci.</p></div>`;
 let tk=0;$('#gq').oninput=e=>{const q=e.target.value.trim(),k=++tk,R=$('#gr');if(q.length<2){R.innerHTML='<p class="muted">Scrivi almeno 2 lettere per cercare tra i soci.</p>';return}
  setTimeout(async()=>{if(k!==tk)return;let ids;try{if(DB.remote&&DB.status==='online')ids=await DB.remote.searchMembers(q)}catch(err){}
   if(!ids){const n=norm(q);ids=ms.filter(m=>norm([m.nome,m.cognome,m.soprannome,m.nome].join(' ')).includes(n)).slice(0,20).map(m=>m.id)}
   if(k!==tk)return;const l=ids.map(id=>ms.find(m=>m.id===id)).filter(Boolean);R.innerHTML=l.map(mini).join('')+(l.length===20?'<p class="muted">Mostrati i primi 20: affina la ricerca.</p>':'')||'<p class="muted">Nessun socio trovato.</p>'},250)}},
async serata(){const gs=await DB.games(),all=await DB.members(),ms=all.filter(m=>m.active),ts=await DB.allTables();const _uid=DB.remote?(await DB.remote.user())?.id:null,meM=all.find(m=>_uid&&m.userId===_uid),pickH=adminMode();const ne=nextEvening();window._ser=window._ser||ne;const S=window._ser;
 const mn=id=>{const m=all.find(m=>m.id===id);return m?memberName(m):'?'};
 const open=ts.filter(t=>t.date===S.date&&t.evening===S.evening);const pres=new Set();open.forEach(t=>(t.players||[]).forEach(p=>pres.add(p.memberId?'m:'+p.memberId:'g:'+p.name)));
 V.innerHTML=`<h2>Serata</h2>${DB.tablesMissing?'<p class="warn">Tabella «tables» non ancora creata su Supabase: eseguire di nuovo supabase/schema.sql.</p>':''}<div class="card"><div class="row"><div><label>Data</label><input id="sd" type="date" min="${romeToday()}" value="${S.date}"></div><div><label>Serata</label><select id="se">${['Giovedì','Domenica','Evento'].map(e=>`<option${e===S.evening?' selected':''}>${e}</option>`)}</select></div></div>
 <div class="chips"><span class="chip">🪑 ${open.filter(t=>t.status==='open').length} tavoli aperti</span><span class="chip">🙋 ${pres.size} presenti</span></div></div>
 <div id="tl">${open.map(t=>{const n=(t.players||[]).length,full=n>=t.seats,g=gs.find(g=>g.id===t.gameId)||{};return`<div class="card tavolo${t.status!=='open'?' closed':''}"><div class="row"><b>${esc(g.name||'?')}</b><span class="muted" style="text-align:right">${t.time?'🕗 '+esc(t.time)+' · ':''}${t.status==='open'?(full?'<b>Pieno</b>':(t.seats-n)+' posti liberi'):'✅ Chiuso'}</span></div>
  <div class="muted">🏠 <a class="pv" data-pv="${t.hostId}">${esc(mn(t.hostId))}</a>${t.note?' · '+esc(t.note):''}</div><div class="chips">${(t.players||[]).map(p=>`<span class="chip">${esc(p.memberId?mn(p.memberId):p.name+' (ospite)')}</span>`).join('')}<span class="chip">${n}/${t.seats}</span></div>
  ${t.status==='open'?`<div class="row" style="margin-top:8px"><button class="s" data-j="${t.id}">👥 Unisciti / lascia</button><button class="s" data-o="${t.id}"${full?' disabled':''}>+ Ospite</button></div><button class="p" data-c="${t.id}">🏁 Chiudi e registra</button>`:''}${adminMode()&&!isMod()?`<button class="s" data-x="${t.id}" style="width:100%;margin-top:6px">🗑 Elimina tavolo</button>`:''}</div>`}).join('')||'<p class="muted">Nessun tavolo per questa serata. Aprine uno!</p>'}</div>
 <details class="card" id="nt"${open.length?'':' open'}><summary><b>➕ Apri un tavolo</b></summary>${(pickH?ms.length:meM)?`${pickH?`<label>Chi ospita</label><select id="th">${ms.slice().sort((a,b)=>memberName(a).localeCompare(memberName(b),'it')).map(m=>`<option value="${m.id}"${meM&&m.id===meM.id?' selected':''}>${esc(memberName(m))}</option>`)}</select>`:`<label>Chi ospita</label><div class="rec"><b>🏠 ${esc(memberName(meM))} (tu)</b></div><input type="hidden" id="th" value="${meM.id}">`}
  <label>Gioco</label><select id="tg">${gs.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`)}</select><div class="row"><div><label>Posti</label><input id="tp" type="number" min="1" value="${gs[0]?.max||4}"></div><div><label>Inizio (facolt.)</label><input id="tt" type="time"></div></div>
  <label>Nota (facoltativa)</label><input id="tn" placeholder="es. spiego io le regole"><button class="p" id="tsv">Apri il tavolo</button>`:pickH?'<p class="warn">Nessun socio in elenco: un admin deve aggiungerli.</p>':'<p class="warn">Il tuo account non è collegato a un socio: non puoi aprire tavoli. Chiedi a un admin.</p>'}</details>`;
 $('#sd').onchange=e=>{S.date=e.target.value;go('serata')};$('#se').onchange=e=>{S.evening=e.target.value;go('serata')};
 if($('#tg'))$('#tg').onchange=()=>$('#tp').value=(gs.find(g=>g.id===$('#tg').value)||{}).max||4;
 if($('#tsv'))$('#tsv').onclick=async()=>{if(S.date<romeToday())return toast('Non puoi aprire tavoli in una data passata');const h=$('#th').value;await DB.saveTable({date:S.date,evening:S.evening,gameId:$('#tg').value,hostId:h,seats:Math.max(1,+$('#tp').value||1),time:$('#tt').value,note:$('#tn').value.trim(),players:[{memberId:h}]});toast('Tavolo aperto');go('serata')};
 const T=id=>ts.find(t=>t.id===id);
 V.querySelectorAll('[data-j]').forEach(b=>b.onclick=async()=>{const t=T(b.dataset.j),guests=t.players.filter(p=>!p.memberId);const ids=await pickMembers(ms,t.players.filter(p=>p.memberId).map(p=>p.memberId),'Giocatori al tavolo',t.seats-guests.length);if(!ids)return;
  if(!ids.includes(t.hostId)&&!await ask('Il padrone di casa lascia il tavolo?'))return;await DB.saveTable({id:t.id,players:[...ids.map(memberId=>({memberId})),...guests]});go('serata')});
 V.querySelectorAll('[data-o]').forEach(b=>b.onclick=async()=>{const t=T(b.dataset.o);if(t.players.length>=t.seats)return toast('Tavolo pieno');const n=(await askText('Nome dell\'ospite')||'').trim();if(!n)return;await DB.saveTable({id:t.id,players:[...t.players,{guest:true,name:n}]});go('serata')});
 V.querySelectorAll('[data-c]').forEach(b=>b.onclick=async()=>{const t=T(b.dataset.c);if(!adminMode()&&!await ask('Sei '+mn(t.hostId)+' (padrone di casa)? Chiudi il tavolo e registra la partita.'))return;
  views.nuova({fromTable:t.id,gameId:t.gameId,date:t.date,evening:t.evening,players:t.players.map(p=>p.memberId?{memberId:p.memberId}:{guest:true,name:p.name})})});
 V.querySelectorAll('[data-x]').forEach(b=>b.onclick=async()=>{if(!await ask('Eliminare il tavolo?'))return;await DB.deleteTable(b.dataset.x);toast('Tavolo eliminato');go('serata')})},
async altro(){const hp=await DB.hasPin();
 V.innerHTML=`<div id="bkp" hidden><h2>Backup dei dati</h2><div class="card"><p class="muted">I dati sono salvati solo su questo telefono. Esportate spesso un backup.</p>
 <button class="p" id="ex">⬇️ Esporta JSON</button><label>Importa un backup (sostituisce i dati attuali)</label><input type="file" id="im" accept="application/json"></div></div>
 <h2 id="pt">🔒 Pannello admin</h2><div class="card" id="adm"></div><div class="card muted">Diario di PerGioco · v10.3 · Associazione PerGioco, Ragusa</div>`;
 $('#ex').onclick=async()=>{const b=new Blob([await DB.export()],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='pergioco-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click()};
 $('#im').onchange=async e=>{const f=e.target.files[0];if(!f||!await ask('Sostituire tutti i dati con il backup?'))return;try{await DB.import(await f.text());admin=false;toast('Backup importato');go('altro')}catch(err){toast('Errore: '+err.message)}};
 const A=$('#adm');const R=!!DB.remote&&DB.status==='online';
 if(R&&!admin){admin=await DB.remote.isAdmin();drawModeBtn()}
 $('#bkp').hidden=!(admin&&adminMode()&&!isMod());
 if(isMod())$('#pt').textContent='🛡 Pannello moderatore';
 if(admin&&uiMode()==='user'){A.innerHTML=`<p class="muted">Sei in <b>modalità utente</b>: vedi l'app come un socio qualsiasi.</p><button class="p" id="tm">${isMod()?'🛡 Passa a modalità moderatore':'🔧 Passa a modalità admin'}</button>`;$('#tm').onclick=()=>setMode('admin');return}
 if(R&&!admin){A.innerHTML=`<p class="muted">Accesso admin con l'account Supabase.</p><label>Email</label><input id="le" type="email" autocomplete="username"><label>Password</label><input id="lp" type="password" autocomplete="current-password"><button class="p" id="lg">Entra</button>`;
  $('#lg').onclick=async()=>{let ok;try{ok=await DB.remote.signIn($('#le').value.trim(),$('#lp').value)}catch(err){return toast('Accesso non riuscito: '+err.message)}
   if(!ok){await DB.remote.signOut();return toast('Questo utente non è tra gli admin')}admin=true;drawModeBtn();go('altro')};return}
 if(!R&&!admin){A.innerHTML='<p class="muted">Il pannello è disponibile solo con la connessione a internet.</p>';return}
 if(!R&&!hp){A.innerHTML=`<p class="muted">Primo accesso: scegliete un PIN admin (almeno 4 cifre).</p><label>Nuovo PIN</label><input id="p1" type="password" inputmode="numeric"><label>Ripeti PIN</label><input id="p2" type="password" inputmode="numeric"><button class="p" id="ps">Imposta PIN</button>`;
  $('#ps').onclick=async()=>{const a=$('#p1').value;if(!/^\d{4,}$/.test(a))return toast('Il PIN deve avere almeno 4 cifre');if(a!==$('#p2').value)return toast('I PIN non coincidono');await DB.setPin(a);admin=true;toast('PIN impostato');go('altro')};return}
 if(!admin){A.innerHTML=`<label>PIN admin</label><input id="pi" type="password" inputmode="numeric"><button class="p" id="pe">Entra</button>`;
  $('#pe').onclick=async()=>{if(await DB.checkPin($('#pi').value)){admin=true;drawModeBtn();go('altro')}else toast('PIN errato')};return}
 const ms=await DB.members(),leg=await DB.legacyNames(),gs=await DB.games(),ps=await DB.plays();let edit=null,gf='';
 const tabs=`<button class="s" id="ast" style="width:100%;margin-bottom:8px">📊 Statistiche associazione</button><div class="row"><div class="seg" id="atab"><button data-a="soci" class="${adminTab==='soci'?'on':''}">Soci</button>${isMod()?'':`<button data-a="partite" class="${adminTab==='partite'?'on':''}">Partite</button>`}${R?`<button data-a="account" class="${adminTab==='account'?'on':''}">Codici</button>`:''}${R&&!isMod()?`<button data-a="mods" class="${adminTab==='mods'?'on':''}">Moderatori</button>`:''}</div><button class="s" id="out" style="flex:0 0 auto">Esci</button></div>`;
 const bind=()=>{$('#ast').onclick=()=>go('stats');$('#out').onclick=()=>DB.logout();$('#atab').onclick=e=>{if(e.target.dataset.a){adminTab=e.target.dataset.a;draw()}}};
 const drawPlays=()=>{const l=ps.filter(p=>!gf||p.gameId===gf);A.innerHTML=tabs+`<label>Filtra per gioco</label><select id="gf"><option value="">Tutti i giochi (${ps.length})</option>${gs.map(g=>`<option value="${g.id}"${g.id===gf?' selected':''}>${esc(g.name)}</option>`)}</select>
 <div style="margin-top:8px">${l.map(p=>`<div class="rec"><span>${esc(gname(gs,p.gameId))}<br><span class="muted">${fmt(p.date)} · ${p.evening} · ${p.players.map(x=>esc(Stats.label(x,ms))+(x.score!=null&&x.score!==''?' '+x.score:'')).join(', ')}</span></span><span style="flex:0 0 auto"><button class="s" data-pe="${p.id}">✏️</button> <button class="s" data-pd="${p.id}">🗑</button></span></div>`).join('')||'<p class="muted">Nessuna partita.</p>'}</div>`;bind();
  $('#gf').onchange=e=>{gf=e.target.value;drawPlays()};
  A.querySelectorAll('[data-pe]').forEach(b=>b.onclick=()=>{location.hash='altro';views.nuova(ps.find(p=>p.id===b.dataset.pe));scrollTo(0,0)});
  A.querySelectorAll('[data-pd]').forEach(b=>b.onclick=async()=>{const p=ps.find(x=>x.id===b.dataset.pd);if(!await ask(`Eliminare la partita a ${gname(gs,p.gameId)} del ${fmt(p.date)}?`))return;await DB.deletePlay(p.id);toast('Partita eliminata');go('altro')})};
 const drawSoci=()=>{const e=edit||{};A.innerHTML=tabs+`<p class="muted">${ms.filter(m=>m.active).length} soci attivi</p>
 <label>${e.id?'Modifica socio':'Nuovo socio'}</label><div class="row"><input id="mn" placeholder="Nome" value="${esc(e.nome||'')}"><input id="mc2" placeholder="Cognome" value="${esc(e.cognome||'')}"></div>
 <div class="row" style="margin-top:6px"><input id="mso" placeholder="Soprannome (facoltativo)" value="${esc(e.soprannome||'')}"><input id="mt" placeholder="N. tessera" value="${esc(e.tessera||'')}"></div>
 <button class="p" id="msv">${e.id?'Salva modifiche':'Aggiungi socio'}</button>${e.id?'<button class="s" id="mx" style="width:100%;margin-top:6px">Annulla</button>':''}
 <div style="margin-top:12px">${ms.map(m=>`<div class="rec"><span>${esc(memberName(m))}${m.tessera?` <span class="chip">#${esc(m.tessera)}</span>`:''}${m.active?'':' <span class="chip off">disattivato</span>'}</span>
  <span style="flex:0 0 auto"><button class="s" data-e="${m.id}">✏️</button> <button class="s" data-t="${m.id}">${m.active?'Disattiva':'Riattiva'}</button></span></div>`).join('')||'<p class="muted">Nessun socio.</p>'}</div>
 ${leg.length?`<label style="margin-top:14px"><b>Collega a socio</b>: nomi delle partite registrate prima dell'elenco soci</label>${leg.map(([n,c],i)=>`<div class="prow"><input disabled value="${esc(n)} (${c})"><select id="lk${i}"><option value="">Scegli…</option>${ms.map(m=>`<option value="${m.id}">${esc(memberName(m))}</option>`)}<option value="guest">È un ospite</option></select><button class="s" data-l="${i}">✓</button></div>`).join('')}`:''}
 ${R?`<label style="margin-top:14px"><b>Dati di questo telefono</b></label>${localStorage.getItem('pergioco-migrated')?'<p class="muted">Già caricati su Supabase.</p>':'<button class="p" id="mig">Carica i dati di questo telefono su Supabase</button>'}`:`<label style="margin-top:14px"><b>Cambia PIN</b></label><div class="row"><input id="np" type="password" inputmode="numeric" placeholder="Nuovo PIN"><button class="s" id="cp" style="flex:0 0 auto">Cambia</button></div>`}`;bind();
 if($('#mx'))$('#mx').onclick=()=>{edit=null;drawSoci()};
 $('#msv').onclick=async()=>{const nome=$('#mn').value.trim();if(!nome)return toast('Il nome è obbligatorio');await DB.saveMember({...(edit||{}),nome,cognome:$('#mc2').value.trim(),soprannome:$('#mso').value.trim(),tessera:$('#mt').value.trim()});toast(edit?'Socio aggiornato':'Socio aggiunto');go('altro')};
 A.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{edit=ms.find(m=>m.id===b.dataset.e);drawSoci()});
 A.querySelectorAll('[data-t]').forEach(b=>b.onclick=async()=>{const m=ms.find(x=>x.id===b.dataset.t);await DB.saveMember({id:m.id,active:!m.active});go('altro')});
 A.querySelectorAll('[data-l]').forEach(b=>b.onclick=async()=>{const v=$('#lk'+b.dataset.l).value;if(!v)return toast('Scegli un socio');await DB.linkName(leg[b.dataset.l][0],v);toast('Collegato');go('altro')});
 if($('#mig'))$('#mig').onclick=async()=>{if(!await ask('Caricare su Supabase giochi, soci e partite salvati su questo telefono?'))return;try{const n=await DB.remote.uploadLocal();toast(n+' elementi caricati');go('altro')}catch(err){toast('Errore: '+err.message)}};
 if($('#cp'))$('#cp').onclick=async()=>{const a=$('#np').value;if(!/^\d{4,}$/.test(a))return toast('Il PIN deve avere almeno 4 cifre');await DB.setPin(a);toast('PIN cambiato');$('#np').value=''}};
 const drawAcc=async()=>{const myUid=(await DB.remote.user())?.id;let cs=[];try{cs=await DB.remote.codes()}catch(e){A.innerHTML=tabs+'<p class="warn">Codici non disponibili (serve l\'accesso admin; se persiste eseguire supabase/migrate-v7.sql). ('+esc(e.message)+')</p>';bind();return}
  const C=new Map(cs.map(c=>[c.member_id,c])),mn=id=>memberName(ms.find(m=>m.id===id));
  A.innerHTML=tabs+`<p class="muted">Ogni socio si registra con il suo <b>codice</b> personale (monouso). Generalo, copialo e mandaglielo tu (WhatsApp, a voce…). Per una password dimenticata rigenera il codice: il socio lo usa in Profilo → «Password dimenticata».</p>
  ${ms.filter(m=>m.active||m.userId).map(m=>{const c=C.get(m.id);const st=isMod()?'':m.userId?'✅ registrato':'⏳ non registrato';
   return`<div class="rec"><span>${avatarHtml(m,24)} ${esc(memberName(m))}<br><span class="muted">${st}${c?`${st?' · ':''}codice ${c.used_at?'usato'+(c.used_for?' ('+esc(c.used_for)+')':''):'<b class="code">'+esc(c.code)+'</b> da usare'}`:''}</span></span>
   <span style="flex:0 0 auto;text-align:right">${c&&!c.used_at?`<button class="s" data-cc="${m.id}">📋</button> `:''}<button class="s" data-cg="${m.id}">${c?'🔄':'🔑 Codice'}</button>${isMod()?'':m.userId?` <button class="s" data-ul="${m.id}">Scollega</button>`:(myUid&&!ms.some(x=>x.userId===myUid)?` <button class="s" data-me="${m.id}">🙋 Sono io</button>`:'')}</span></div>`}).join('')||'<p class="muted">Nessun socio.</p>'}`;bind();
  const copy=async(t,m)=>{const msg=`Ciao ${m.nome}! Il tuo codice per registrarti all'app PerGioco è ${t}\nApri https://vincenzoassenza-blip.github.io/pergioco/#profilo → Registrati`;try{await navigator.clipboard.writeText(msg);toast('Messaggio con il codice copiato')}catch(e){await askText('Copia il messaggio:',msg)}};
  A.querySelectorAll('[data-cc]').forEach(b=>b.onclick=()=>copy(C.get(b.dataset.cc).code,ms.find(m=>m.id===b.dataset.cc)));
  A.querySelectorAll('[data-cg]').forEach(b=>b.onclick=async()=>{const id=b.dataset.cg;if(C.get(id)&&!await ask('Generare un nuovo codice? Quello vecchio smette di funzionare.'))return;try{const c=await DB.remote.newCode(id);await copy(c,ms.find(m=>m.id===id));drawAcc()}catch(e){toast('Errore: '+e.message)}});
  A.querySelectorAll('[data-me]').forEach(b=>b.onclick=async()=>{if(!await ask('Collegare il tuo account a '+mn(b.dataset.me)+'?'))return;try{await DB.remote.setLink(b.dataset.me,myUid);toast('Account collegato');go('altro')}catch(e){toast('Errore: '+e.message)}});
  A.querySelectorAll('[data-ul]').forEach(b=>b.onclick=async()=>{if(!await ask('Scollegare l\'account da '+mn(b.dataset.ul)+'? Per rientrare servirà un nuovo codice.'))return;try{await DB.remote.setLink(b.dataset.ul,null);toast('Account scollegato');go('altro')}catch(e){toast('Errore: '+e.message)}})};
 const drawSociMod=()=>{A.innerHTML=tabs+`<p class="muted">Come moderatore puoi <b>aggiungere nuovi soci</b> (non modificarli né eliminarli). La tessera la assegna un admin.</p>
 <label>Nuovo socio</label><div class="row"><input id="mn" placeholder="Nome"><input id="mc2" placeholder="Cognome"></div><input id="mso" placeholder="Soprannome (facoltativo)" style="margin-top:6px"><button class="p" id="msv">Aggiungi socio</button>
 <div style="margin-top:12px">${ms.filter(m=>m.active).map(m=>`<div class="rec"><span>${avatarHtml(m,24)} ${esc(memberName(m))}</span></div>`).join('')}</div>`;bind();
  $('#msv').onclick=async()=>{const nome=$('#mn').value.trim(),cognome=$('#mc2').value.trim();if(!nome)return toast('Inserisci il nome');try{await DB.saveMember({nome,cognome,soprannome:$('#mso').value.trim()});toast('Socio aggiunto: ora generagli il codice');adminTab='account';go('altro')}catch(e){toast('Errore: '+e.message)}}};
 const drawMods=async()=>{let l=[];try{l=await DB.remote.moderators()}catch(e){A.innerHTML=tabs+'<p class="warn">Moderatori non disponibili (eseguire supabase/migrate-v9.sql). '+esc(e.message)+'</p>';bind();return}
  A.innerHTML=tabs+`<p class="muted">I moderatori possono: aggiungere nuovi soci, generare/rigenerare i codici, gestire i tavoli della Serata e registrare partite per gli altri. <b>Non</b> possono modificare o eliminare nulla né vedere tessere e stato account.</p>
  <label>Email del nuovo moderatore (quella con cui si registra/accede)</label><div class="row"><input id="me2" type="email" placeholder="nome@email.it"><button class="p" id="ma" style="flex:0 0 auto;margin:0">Nomina</button></div>
  <div style="margin-top:12px">${l.map(e=>`<div class="rec"><span>🛡 ${esc(e)}</span><button class="s" data-mr="${esc(e)}" style="flex:0 0 auto">Rimuovi</button></div>`).join('')||'<p class="muted">Nessun moderatore.</p>'}</div>`;bind();
  $('#ma').onclick=async()=>{const e=$('#me2').value.trim();if(!/^\S+@\S+\.\S+$/.test(e))return toast('Email non valida');try{await DB.remote.setModerator(e,true);toast('Moderatore nominato');drawMods()}catch(x){toast('Errore: '+x.message)}};
  A.querySelectorAll('[data-mr]').forEach(b=>b.onclick=async()=>{if(!await ask('Rimuovere il moderatore '+b.dataset.mr+'?'))return;try{await DB.remote.setModerator(b.dataset.mr,false);toast('Moderatore rimosso');drawMods()}catch(x){toast('Errore: '+x.message)}})};
 if(isMod()&&(adminTab==='partite'||adminTab==='mods'))adminTab='soci';
 const draw=()=>adminTab==='mods'&&R?drawMods():isMod()?(adminTab==='account'&&R?drawAcc():drawSociMod()):adminTab==='partite'?drawPlays():adminTab==='account'&&R?drawAcc():drawSoci();draw()},
async stats(){if(!adminMode()){V.innerHTML='<h2>Statistiche associazione</h2><p class="muted">Disponibili solo in modalità admin.</p>';return}
 const gs=await DB.games(),ps=await DB.plays(),ms=await DB.members(),ts=await DB.allTables(),ctx={plays:ps,games:gs,tables:ts};
 const ev=new Set(ps.map(p=>p.date+'|'+p.evening)),guests=new Set();ps.forEach(p=>p.players.forEach(x=>{if(!x.memberId&&x.name)guests.add(norm(x.name))}));
 const act=new Set();ps.forEach(p=>p.players.forEach(x=>x.memberId&&act.add(x.memberId)));
 const mo={};ps.forEach(p=>{const k=p.date.slice(0,7);mo[k]=mo[k]||{n:0,e:new Set()};mo[k].n++;mo[k].e.add(p.date+'|'+p.evening)});
 const nm={};ms.forEach(m=>{if(m.createdAt){const k=m.createdAt.slice(0,7);nm[k]=(nm[k]||0)+1}});
 const pl=Stats.players(ps,ms).filter(p=>p.member).sort((a,b)=>b.plays-a.plays||b.presences-a.presences||a.tP-b.tP),gc=Stats.gameCounts(gs,ps).filter(x=>x.n);
 const coop=ps.filter(p=>p.coop).length,avgP=ps.length?Math.round(ps.reduce((a,p)=>a+p.players.length,0)/ps.length*10)/10:0;
 const bdg=ms.reduce((a,m)=>a+Badges.unlocked('m:'+m.id,ctx).length,0),dur=ps.filter(p=>p.duration).map(p=>+p.duration);
 const box=(l,v)=>`<div class="card"><div class="muted">${l}</div><div class="big">${v}</div></div>`;
 V.innerHTML=`<button class="s" id="bk">← Indietro</button><h2 style="margin-top:10px">📊 Statistiche associazione</h2>
 <div class="row">${box('Partite',ps.length)}${box('Serate',ev.size)}${box('Giochi',gs.length)}</div>
 <div class="row">${box('Soci',ms.length)}${box('Soci attivi',ms.filter(m=>m.active).length)}${box('Ospiti',guests.size)}</div>
 <div class="row">${box('Hanno giocato',act.size)}${box('Media giocatori',avgP)}${box('Badge sbloccati',bdg)}</div>
 <div class="card"><b>📅 Partite e serate per mese</b>${bars(Object.keys(mo).sort().map(k=>[mlab(k),mo[k].n,mo[k].e.size]),' serate')}</div>
 <div class="card"><b>🤝 Cooperative vs competitive</b><div class="split"><i style="width:${ps.length?Math.round(coop/ps.length*100):0}%"></i></div><div class="rec"><span>🤝 Cooperative ${coop}</span><span>⚔️ Competitive ${ps.length-coop}</span></div></div>
 <div class="card"><b>🎲 Giochi più giocati</b>${bars(gc.slice(0,10).map(x=>[x.game.name,x.n]))}</div>
 <div class="card"><b>⭐ Soci più attivi</b>${bars(pl.slice(0,10).map(p=>[p.name,p.plays,p.wins]),' vitt.')}</div>
 <div class="card"><b>🆕 Nuovi soci per mese</b>${bars(Object.keys(nm).sort().map(k=>[mlab(k),nm[k]]))}</div>
 <div class="card"><b>🪑 Modalità Serata</b><div class="rec"><span>Tavoli aperti in totale</span><b>${ts.length}</b></div><div class="rec"><span>Ancora aperti</span><b>${ts.filter(t=>t.status==='open').length}</b></div><div class="rec"><span>Chiusi e registrati</span><b>${ts.filter(t=>t.status==='closed').length}</b></div></div>
 <div class="card"><b>⏱ Durata media partita</b><p class="muted">${dur.length?Math.round(dur.reduce((a,b)=>a+b,0)/dur.length)+' minuti':'Non disponibile: le partite non registrano ancora la durata.'}</p></div>`;
 $('#bk').onclick=()=>history.length>1?history.back():go('altro')},
async profilo(){const id=window._pv;const gs=await DB.games(),ms=await DB.members(),ctx=await badgeCtx();
 if(id){const m=ms.find(x=>x.id===id),myId=DB.remote?(await DB.remote.user())?.id:null,pub=!!m&&!adminMode()&&!(myId&&m.userId===myId);V.innerHTML=`<button class="s" id="bk">← Indietro</button>`+(m?profileHtml(m,ctx,ms,gs,pub)+(adminMode()?(await adminStatsHtml(m,ctx,ms,gs)).replace(isMod()?/<!--P-->[\s\S]*?<!--\/P-->/:/$^/,''):''):'<p class="muted">Socio non trovato.</p>');$('#bk').onclick=()=>history.length>1?history.back():go('giocatori');return}
 const R=!!DB.remote&&DB.status==='online';
 if(!R){V.innerHTML=`<h2>Profilo</h2><div class="card"><p class="muted">Per registrarti e avere la tua pagina personale serve la connessione al database. Riprova quando sei online.</p></div>`;return}
 const u=await DB.remote.user();
 if(!u)return authForm();
 const me=ms.find(m=>m.userId===u.id);
 const out=`<button class="s" id="lo" style="width:100%;margin-top:6px">Esci (${esc(u.email)})</button>`;
 if(u&&!admin&&DB.remote){admin=await DB.remote.isAdmin();drawModeBtn()}
 const bindOut=()=>$('#lo').onclick=()=>DB.logout();
 if(DB.v6Missing){V.innerHTML=`<h2>Profilo</h2><p class="warn">Il database non è ancora aggiornato: un admin deve eseguire supabase/migrate-v6.sql su Supabase.</p>${out}`;return bindOut()}
 if(!me){if(admin){const free=ms.filter(m=>!m.userId);V.innerHTML=`<h2>Profilo</h2><div class="card"><p class="muted">Il tuo account admin non è ancora collegato a una scheda socio.</p><label>Collega il mio account a questo socio</label><select id="sm"><option value="">Scegli…</option>${free.map(m=>`<option value="${m.id}">${esc(memberName(m))}</option>`).join('')}</select><button class="p" id="smg">Collega</button></div>${out}`;bindOut();
   $('#smg').onclick=async()=>{const id=$('#sm').value;if(!id)return toast('Scegli la tua scheda');try{await DB.remote.setLink(id,u.id);toast('Account collegato 🎉');go('profilo')}catch(e){toast('Errore: '+e.message)}};return}
  V.innerHTML=`<h2>Profilo</h2><div class="card"><p class="muted">Questo account non è collegato a nessuna scheda socio. Chiedi a un admin un codice e registrati con quello.</p></div>${out}`;return bindOut()}
 const AV=['🎲','🐉','🧙','🦊','🐺','🦁','🐙','🤖','👑','🧩','⚔️','🛡️','🚀','🌟','🍀','🎩'],CO=['#14254a','#2a4785','#1e7a43','#b3261e','#c46a00','#6a1b9a','#00796b','#455a64'];let av=me.avatar||'',co=me.color||'';
 V.innerHTML=`<h2>Il mio profilo</h2>`+profileHtml(me,ctx,ms,gs)+`<details class="card" id="ed"><summary><b>✏️ Modifica profilo</b></summary>
 <label>Soprannome</label><input id="es" maxlength="40" value="${esc(me.soprannome||'')}"><label>Avatar</label><div class="avs" id="eav"><button data-a="" class="${av?'':'on'}">Aa</button>${AV.map(a=>`<button data-a="${a}" class="${a===av?'on':''}">${a}</button>`).join('')}</div>
 <label>Colore</label><div class="avs" id="eco">${CO.map(c=>`<button data-c="${c}" class="${c===co?'on':''}" style="background:${c}"></button>`).join('')}</div>
 <label>Gioco preferito</label><select id="ef"><option value="">—</option>${gs.map(g=>`<option value="${g.id}"${g.id===me.favGameId?' selected':''}>${esc(g.name)}</option>`).join('')}</select>
 <p class="muted">Nome, cognome e tessera li modifica solo un admin.</p><button class="p" id="esv">Salva</button></details>${out}`;bindOut();
 $('#eav').onclick=e=>{const b=e.target.closest('button');if(!b)return;av=b.dataset.a;$('#eav').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b))};
 $('#eco').onclick=e=>{const b=e.target.closest('button');if(!b)return;co=b.dataset.c;$('#eco').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b))};
 $('#esv').onclick=async()=>{try{await DB.remote.updateProfile({soprannome:$('#es').value,avatar:av,color:co,favGameId:$('#ef').value});toast('Profilo aggiornato');go('profilo')}catch(e){toast('Errore: '+e.message)}}}
};
const avatarHtml=(m,sz=56)=>{if(!m)return'';const ini=((m.nome||'?')[0]+((m.cognome||'')[0]||'')).toUpperCase();return`<span class="av" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz*(m.avatar?.55:.4))}px;background:${m.color&&/^#[0-9a-f]{6}$/i.test(m.color)?m.color:'#2a4785'}">${esc(m.avatar||ini)}</span>`};
function profileHtml(m,ctx,ms,gs,pub){const s=Profile.stats(m.id,ctx),bl=Badges.list('m:'+m.id,ctx),on=bl.filter(b=>b.on).length,fav=gs.find(g=>g.id===m.favGameId);
 if(pub){const ul=bl.filter(b=>b.on),box=(l,v)=>`<div class="card"><div class="muted">${l}</div><div class="big">${v}</div></div>`;
  return`<div class="card prof"><div class="row" style="justify-content:flex-start">${avatarHtml(m,64)}<div style="flex:1"><div class="pname">${esc(`${m.nome} ${m.cognome||''}`.trim())}</div>${m.soprannome?`<div class="muted">(${esc(m.soprannome)})</div>`:''}</div></div></div>
  <div class="row">${box('Partite',s.n)}${box('Serate',s.evenings)}</div><div class="row">${box('Tavoli',s.tables)}${box('Tavoli organizzati',s.hosted)}</div>
  <div class="card"><b>🏅 Badge sbloccati: ${ul.length}</b>${ul.length?`<div class="badges">${ul.map(b=>`<div class="badge"><div class="bi">${b.icon}</div><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div>`:'<p class="muted">Ancora nessun badge.</p>'}</div>`}
 const pn=x=>x.memberId?`<a class="pv" data-pv="${x.memberId}">${esc(Stats.label(x,ms))}</a>`:esc(Stats.label(x,ms));
 return`<div class="card prof"><div class="row" style="justify-content:flex-start">${avatarHtml(m,64)}<div style="flex:1"><div class="pname">${esc(`${m.nome} ${m.cognome||''}`.trim())}</div>${m.soprannome?`<div class="muted">(${esc(m.soprannome)})</div>`:''}<div class="muted">${fav?'❤️ '+esc(fav.name):''}${m.userId?' · ✅ account collegato':''}</div></div></div></div>
 <div class="row"><div class="card"><div class="muted">Partite</div><div class="big">${s.n}</div></div><div class="card"><div class="muted">Vittorie</div><div class="big">${s.wins}</div></div><div class="card"><div class="muted">% vittorie</div><div class="big">${s.pct}%</div></div></div>
 <div class="row"><div class="card"><div class="muted">Serate</div><div class="big">${s.evenings}</div></div><div class="card"><div class="muted">Tavoli</div><div class="big">${s.tables}</div></div><div class="card"><div class="muted">Tavoli organizzati</div><div class="big">${s.hosted}</div></div></div>
 <div class="card"><b>🏅 Badge ${on}/${bl.length}</b><div class="badges">${bl.map(b=>`<div class="badge${b.on?'':' off'}"><div class="bi">${b.on?b.icon:'🔒'}</div><b>${esc(b.name)}</b><small>${esc(b.desc)}</small>${!b.on&&b.goal>1?`<div class="pg"><i style="width:${Math.round(b.cur/b.goal*100)}%"></i></div><small>${b.cur}/${b.goal}</small>`:''}</div>`).join('')}</div></div>
 <div class="card"><b>🎲 Giochi più giocati</b>${s.topGames.map(([g,n])=>`<div class="rec"><span>${esc(gname(gs,g))}</span><b>${n}</b></div>`).join('')||'<p class="muted">Ancora nessuna partita.</p>'}</div>
 <div class="card"><b>👥 Compagni di gioco più frequenti</b>${s.partners.map(p=>`<div class="rec"><span>${pn(p.x)}</span><b>${p.n}</b></div>`).join('')||'<p class="muted">—</p>'}</div>
 <div class="card"><b>🕑 Storico partite</b>${s.plays.map(p=>{const me=p.players.find(x=>x.memberId===m.id)||{};return`<div class="rec"><span>${esc(gname(gs,p.gameId))}<br><span class="muted">${fmt(p.date)} · ${p.evening}${me.score!=null&&me.score!==''?' · '+esc(me.score)+' punti':''}</span></span><span class="win">${me.winner?'🏆 Vittoria':(p.coop?'Sconfitta':'')}</span></div>`}).join('')||'<p class="muted">Ancora nessuna partita.</p>'}</div>`}
function authForm(){let mode=window._am||'login';const T={login:'Entra',signup:'Crea account',reset:'Imposta nuova password'};
 const G=document.body.classList.contains('gate');V.innerHTML=`${G?'<div class="login-hero"><img src="icons/icon-192.png" alt=""><h1>PerGioco</h1><p>Diario delle partite dell\'associazione<br>Accesso riservato ai soci</p></div>':'<h2>Profilo</h2>'}<div class="card"><p class="muted">${mode==='signup'?'Per registrarti ti serve il <b>codice</b> personale che ti ha dato un admin di PerGioco.':mode==='reset'?'Chiedi a un admin un nuovo codice e usalo qui con la tua email per scegliere una nuova password.':'Accedi con la tua email e password. Nuovo socio? Tocca «Registrati con codice».'}</p>
 <div class="seg" id="am"><button data-m="login" class="${mode==='login'?'on':''}">Accedi</button><button data-m="signup" class="${mode==='signup'?'on':''}">Registrati con codice</button></div>
 ${mode!=='login'?`<label>Codice</label><input id="ac" class="code" placeholder="XXXX-XXXX-XXXX" maxlength="14" autocomplete="off" autocapitalize="characters" spellcheck="false">`:''}
 <label>Email ${mode==='signup'?'(sarà il tuo nome utente)':''}</label><input id="ae" type="email" autocomplete="username">
 <label>${mode==='login'?'Password':'Nuova password (almeno 8 caratteri)'}</label><input id="ap" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}">
 ${mode!=='login'?`<label>Ripeti password</label><input id="ap2" type="password" autocomplete="new-password">`:''}
 <button class="p" id="ago">${T[mode]}</button>
 ${mode==='login'?'<button class="s" id="afp" style="width:100%;margin-top:6px">Password dimenticata? (con codice)</button>':mode==='reset'?'<button class="s" id="abk" style="width:100%;margin-top:6px">← Torna all\'accesso</button>':''}</div>`;
 const sw=m=>{window._am=m;authForm()};$('#am').onclick=e=>e.target.dataset.m&&sw(e.target.dataset.m);if($('#afp'))$('#afp').onclick=()=>sw('reset');if($('#abk'))$('#abk').onclick=()=>sw('login');
 if($('#ac'))$('#ac').oninput=e=>{const v=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);e.target.value=v.match(/.{1,4}/g)?.join('-')||''};
 $('#ago').onclick=async()=>{const em=$('#ae').value.trim(),pw=$('#ap').value;if(!/^\S+@\S+\.\S+$/.test(em))return toast('Email non valida');
  let code='';if(mode!=='login'){code=$('#ac').value.replace(/-/g,'');if(code.length!==12)return toast('Il codice ha 12 caratteri (XXXX-XXXX-XXXX)');if(pw.length<8)return toast('La password deve avere almeno 8 caratteri');if(pw!==$('#ap2').value)return toast('Le password non coincidono')}
  $('#ago').disabled=true;
  try{if(mode==='signup')await DB.remote.signUp(code,em,pw);else if(mode==='reset'){await DB.remote.resetWithCode(code,em,pw);await DB.remote.signIn(em,pw)}else await DB.remote.signIn(em,pw);
   window._am='login';toast(mode==='signup'?'Benvenuto in PerGioco! 🎉':mode==='reset'?'Password aggiornata':'Bentornato!');sessionStorage.setItem('pg-welcome',mode);setTimeout(()=>{location.replace(location.pathname+'#'+(mode==='signup'?'profilo':'ludoteca'));location.reload()},700)}
  catch(e){$('#ago').disabled=false;const m=e.message||'';toast(/Invalid login/i.test(m)?'Email o password errate':/already registered/i.test(m)?'Questa email è già registrata':/Database error|Codice non valido/i.test(m)?'Codice non valido o già usato':m)}}}
const bars=(rows,unit='')=>{const mx=Math.max(1,...rows.map(r=>r[1]));return`<div class="bars">${rows.map(([l,v,v2])=>`<div class="bar"><span>${esc(l)}</span><i style="width:${Math.round(v/mx*100)}%"></i><b>${v}${v2!=null?` <small class="muted">· ${v2}${unit}</small>`:''}</b></div>`).join('')||'<p class="muted">—</p>'}</div>`};
const MESI=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];const mlab=k=>{const [y,m]=k.split('-');return MESI[+m-1]+' '+y.slice(2)};
// date di sblocco dei badge: si rigiocano le partite in ordine cronologico
function badgeDates(memberId,ctx){const key='m:'+memberId,out={};const ds=[...new Set([...ctx.plays.filter(p=>p.players.some(x=>x.memberId===memberId)).map(p=>p.date),...(ctx.tables||[]).filter(t=>t.hostId===memberId).map(t=>t.date)])].sort();
 ds.forEach(d=>{const c={plays:ctx.plays.filter(p=>p.date<=d),games:ctx.games,tables:(ctx.tables||[]).filter(t=>t.date<=d)};Badges.list(key,c).forEach(b=>{if(b.on&&!out[b.id])out[b.id]=d})});return out}
async function adminStatsHtml(m,ctx,ms,gs){const s=Profile.stats(m.id,ctx),me=p=>p.players.find(x=>x.memberId===m.id)||{};
 const pg={};s.plays.forEach(p=>{const o=pg[p.gameId]=pg[p.gameId]||{n:0,w:0,sc:[]};o.n++;if(me(p).winner)o.w++;const v=me(p).score;if(v!=null&&v!==''&&!isNaN(+v))o.sc.push(+v)});
 const mo={};s.plays.forEach(p=>{const k=p.date.slice(0,7);mo[k]=mo[k]||[0,0];mo[k][0]++;if(me(p).winner)mo[k][1]++});
 const tb=(ctx.tables||[]).filter(t=>t.hostId===m.id||(t.players||[]).some(x=>x.memberId===m.id)),bd=badgeDates(m.id,ctx),bl=Badges.list('m:'+m.id,ctx);
 let cs=null;if(DB.remote&&DB.status==='online'){try{cs=(await DB.remote.codes()).find(c=>c.member_id===m.id)||false}catch(e){}}
 const last=s.plays[0];
 return`<h2 style="margin-top:16px">🔧 Statistiche complete (solo admin)</h2>
 <!--P--><div class="card adm-only"><b>🔒 Dati riservati</b><div class="rec"><span>N. tessera</span><b>${esc(m.tessera||'—')}</b></div><div class="rec"><span>Stato socio</span><b>${m.active?'attivo':'disattivato'}</b></div>
 <div class="rec"><span>Account app</span><b>${m.userId?'✅ registrato':'⏳ non registrato'}</b></div><div class="rec"><span>Codice</span><b>${cs===null?'—':cs===false?'non generato':cs.used_at?'usato ('+esc(cs.used_for||'')+', '+fmt(cs.used_at.slice(0,10))+')':'da usare (generato il '+fmt(cs.created_at.slice(0,10))+')'}</b></div>
 <div class="rec"><span>Ultima partita</span><b>${last?esc(gname(gs,last.gameId))+' · '+fmt(last.date):'—'}</b></div></div>
 <!--/P--><div class="card"><b>🎲 Per gioco</b><div class="tbl"><div class="th"><span>Gioco</span><span>Part.</span><span>Vitt.</span><span>Media</span><span>Max</span><span>Min</span></div>${Object.entries(pg).sort((a,b)=>b[1].n-a[1].n).map(([g,o])=>{const a=o.sc.length?o.sc.reduce((x,y)=>x+y,0)/o.sc.length:null;return`<div><span>${esc(gname(gs,g))}</span><span>${o.n}</span><span>${o.w}</span><span>${a==null?'—':Math.round(a*10)/10}</span><span>${o.sc.length?Math.max(...o.sc):'—'}</span><span>${o.sc.length?Math.min(...o.sc):'—'}</span></div>`}).join('')||'<p class="muted">—</p>'}</div></div>
 <div class="card"><b>📈 Andamento mensile</b> <span class="muted">(partite · vittorie)</span>${bars(Object.keys(mo).sort().map(k=>[mlab(k),mo[k][0],mo[k][1]]),' vitt.')}</div>
 <div class="card"><b>🪑 Serate e tavoli</b><div class="rec"><span>Serate frequentate</span><b>${s.evenings}</b></div><div class="rec"><span>Tavoli organizzati</span><b>${s.hosted}</b></div><div class="rec"><span>Tavoli a cui si è unito</span><b>${tb.filter(t=>t.hostId!==m.id).length}</b></div></div>
 <div class="card"><b>🏅 Badge e date di sblocco</b>${bl.map(b=>`<div class="rec"><span>${b.on?b.icon:'🔒'} ${esc(b.name)}</span><span class="muted">${b.on?(bd[b.id]?fmt(bd[b.id]):'✓'):(b.goal?b.cur+'/'+b.goal:'—')}</span></div>`).join('')}</div>`}
function openProfile(id){window._pv=id;go('profilo')}
document.addEventListener('click',e=>{const a=e.target.closest('[data-pv]');if(a){e.preventDefault();openProfile(a.dataset.pv)}});
function gate(){document.body.classList.add('gate');$('#modebtn').hidden=true;const m=DB.mode;
 if(m==='auth')return authForm();
 V.innerHTML=`<div class="card" style="margin-top:30px;text-align:center"><h2>🎲 PerGioco</h2><p class="muted">${m==='missing'?'Il database non è configurato correttamente.':'Serve una connessione a internet per accedere la prima volta.'}</p><button class="p" onclick="location.reload()">Riprova</button></div>`}
function go(v){if(document.body.classList.contains('gate'))return gate();document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));location.hash=v;views[v]();scrollTo(0,0)}
$('#tabs').onclick=e=>{const b=e.target.closest('button');if(b){window._pv=null;go(b.dataset.v)}};
addEventListener('hashchange',()=>{const v=location.hash.slice(1);if(document.body.classList.contains('gate'))return;if(v!=='profilo')window._pv=null;if(views[v]&&!document.querySelector(`nav button.on[data-v="${v}"]`))go(v)});
const cfg=!!((window.PERGIOCO_CONFIG||{}).supabaseUrl&&(window.PERGIOCO_CONFIG||{}).supabaseAnonKey);
DB.onStatus=()=>{const el=$('#status');if(!el)return;const q=DB.remote?DB.remote.queue().length:0;let t='';
 if(DB.status==='missing')t='⚠️ Database non ancora configurato: i dati restano su questo telefono.';
 else if(DB.status==='offline')t='📴 Offline'+(q?`: ${q} modifiche in attesa di sincronizzazione`:': dati salvati sul telefono');
 else if(DB.status==='local'&&cfg)t='⚠️ Database non raggiungibile: i dati restano su questo telefono.';
 else if(q)t=`🔄 ${q} modifiche in sincronizzazione…`;el.textContent=t;el.hidden=!t};
$('#modebtn').onclick=()=>setMode(uiMode()==='user'?'admin':'user');
(async()=>{try{await DB.init();if(DB.remote&&DB.status==='online'){admin=await DB.remote.isAdmin();drawModeBtn()}}catch(e){console.warn(e)}if(DB.mode!=='online'&&DB.mode!=='offline')return gate();go(START.includes('access_token')||START.includes('type=')?'profilo':views[START.slice(1)]?START.slice(1):'ludoteca')})();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
