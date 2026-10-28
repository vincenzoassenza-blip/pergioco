const $=s=>document.querySelector(s),V=$('#view');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=d=>new Date(d+'T12:00').toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'});
const toast=t=>{const e=document.createElement('div');e.className='toast';e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),2200)};
const gname=(gs,id)=>(gs.find(g=>g.id===id)||{}).name||'?';
let admin=false,adminTab='soci';
const playRow=(p,gs,ms)=>`<div class="rec"><span>${esc(gname(gs,p.gameId))}<br><span class="muted">${fmt(p.date)} · ${p.evening}${p.scenario?' · '+esc(p.scenario):''}</span></span><span class="win">${p.coop?(p.groupWin?'Vittoria':'Sconfitta'):esc(p.players.filter(x=>x.winner).map(x=>Stats.label(x,ms)).join(', '))}</span></div>`;
const views={
async ludoteca(){const gs=await DB.games(),ps=await DB.plays();const f={n:'',t:'',q:''};
 V.innerHTML=`<h2>Ludoteca</h2><div class="card"><input id="q" placeholder="Cerca un gioco…"><div class="row" style="margin-top:8px">
 <select id="n"><option value="">Quanti siamo?</option>${[1,2,3,4,5,6,7,8].map(i=>`<option>${i}</option>`)}</select>
 <select id="t"><option value="">Quanto tempo?</option><option value="30">30 min</option><option value="60">1 ora</option><option value="90">1h 30</option><option value="120">2 ore</option><option value="999">Tutta la sera</option></select></div></div><div id="gl"></div>
 <details class="card"><summary><b>Aggiungi un gioco</b></summary><label>Nome</label><input id="gn"><div class="row"><div><label>Giocatori min</label><input id="g1" type="number" value="1"></div><div><label>max</label><input id="g2" type="number" value="4"></div></div>
 <div class="row"><div><label>Minuti min</label><input id="g3" type="number" value="30"></div><div><label>max</label><input id="g4" type="number" value="60"></div><div><label>Età</label><input id="g5" type="number" value="10"></div></div>
 <label><input type="checkbox" id="gc" style="width:auto"> Cooperativo</label><button class="p" id="ga">Aggiungi</button></details>`;
 const draw=()=>{const l=gs.filter(g=>(!f.q||g.name.toLowerCase().includes(f.q))&&(!f.n||(g.min<=f.n&&g.max>=f.n))&&(!f.t||g.minT<=f.t));
  $('#gl').innerHTML=l.length?l.map(g=>{const n=ps.filter(p=>p.gameId===g.id).length;return`<div class="card"><div class="row"><b>${esc(g.name)}</b><span class="muted" style="text-align:right">${n} partit${n==1?'a':'e'}</span></div>
  <div class="chips"><span class="chip">👥 ${g.min}–${g.max}</span><span class="chip">⏱ ${g.minT}–${g.maxT} min</span><span class="chip">🎂 ${g.age}+</span>${g.coop?'<span class="chip coop">Cooperativo</span>':''}</div></div>`}).join(''):'<p class="muted">Nessun gioco adatto. Provate a cambiare i filtri.</p>'};
 $('#q').oninput=e=>{f.q=e.target.value.toLowerCase();draw()};$('#n').onchange=e=>{f.n=+e.target.value;draw()};$('#t').onchange=e=>{f.t=+e.target.value;draw()};
 $('#ga').onclick=async()=>{const n=$('#gn').value.trim();if(!n)return toast('Inserisci il nome');await DB.addGame({name:n,min:+$('#g1').value,max:+$('#g2').value,minT:+$('#g3').value,maxT:+$('#g4').value,age:+$('#g5').value,coop:$('#gc').checked});toast('Gioco aggiunto');go('ludoteca')};draw()},
async nuova(ed){const gs=await DB.games(),all=await DB.members(),ms=all.filter(m=>m.active||(ed&&ed.players.some(x=>x.memberId===m.id)));const today=new Date().toISOString().slice(0,10);
 V.innerHTML=`<h2>${ed?'Modifica partita':'Registra una partita'}</h2><div class="card"><label>Gioco</label><select id="g">${gs.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`)}</select>
 <div class="row"><div><label>Data</label><input id="d" type="date" value="${today}"></div><div><label>Serata</label><select id="e"><option>Giovedì</option><option>Domenica</option><option>Evento</option></select></div></div>
 <label>Modalità</label><div class="seg" id="mode"><button data-m="0" class="on">Competitiva</button><button data-m="1">Cooperativa</button></div>
 <div id="coop" hidden><label>Scenario</label><input id="sc" placeholder="es. Scenario 3"><label>Esito del gruppo</label><div class="seg" id="res"><button data-r="1" class="on">Vittoria</button><button data-r="0">Sconfitta</button></div></div>
 <label>Soci al tavolo</label>${ms.length?`<input id="ms" placeholder="Cerca socio…"><div class="chips" id="mc"></div>`:'<p class="warn">Nessun socio in elenco: un admin deve aggiungerli da Altro → Pannello admin.</p>'}
 <label>Ospite (non socio)</label><div class="row"><input id="gn" placeholder="Nome ospite"><button class="s" id="ga" style="flex:0 0 auto">+ Ospite</button></div>
 <label>Giocatori <span id="sl">e punteggi</span></label><div id="pl"></div>
 <label>Nota (facoltativa)</label><textarea id="nt" rows="2"></textarea><button class="p" id="save">${ed?'Salva modifiche':'Salva partita'}</button>${ed?'<button class="s" id="cx" style="width:100%;margin-top:6px">Annulla</button>':''}</div>`;
 let coop=false,win=true,q='';const sel=[];
 const drawChips=()=>{if(!$('#mc'))return;$('#mc').innerHTML=ms.filter(m=>memberName(m).toLowerCase().includes(q)).map(m=>`<button class="chip pick${sel.some(s=>s.memberId===m.id)?' on':''}" data-id="${m.id}">${esc(memberName(m))}</button>`).join('')||'<span class="muted">Nessun socio trovato</span>'};
 const drawSel=()=>{$('#pl').innerHTML=sel.length?'':'<p class="muted">Nessuno selezionato.</p>';sel.forEach((s,i)=>{const d=document.createElement('div');d.className='prow';d.innerHTML=`<input disabled value="${esc(s.memberId?memberName(all.find(m=>m.id===s.memberId)):s.name+(s.guest?' (ospite)':''))}"><input type="number" inputmode="decimal" placeholder="Punti" class="ps" value="${s.score??''}"${coop?' hidden':''}><button class="s">✕</button>`;
  d.querySelector('.ps').oninput=e=>s.score=e.target.value;d.querySelector('button').onclick=()=>{sel.splice(i,1);drawSel();drawChips()};$('#pl').append(d)})};
 if($('#ms')){$('#ms').oninput=e=>{q=e.target.value.toLowerCase();drawChips()};$('#mc').onclick=e=>{const id=e.target.dataset.id;if(!id)return;const i=sel.findIndex(s=>s.memberId===id);i<0?sel.push({memberId:id,score:''}):sel.splice(i,1);drawChips();drawSel()}}
 $('#ga').onclick=()=>{const n=$('#gn').value.trim();if(!n)return toast('Scrivi il nome dell\'ospite');sel.push({guest:true,name:n,score:''});$('#gn').value='';drawSel()};
 const setMode=c=>{coop=c;$('#coop').hidden=!c;$('#sl').hidden=c;document.querySelectorAll('.ps').forEach(i=>i.hidden=c);document.querySelectorAll('#mode button').forEach(b=>b.classList.toggle('on',+b.dataset.m==c))};
 const setRes=w=>{win=w;document.querySelectorAll('#res button').forEach(b=>b.classList.toggle('on',(b.dataset.r==='1')===w))};
 $('#mode').onclick=e=>e.target.dataset.m&&setMode(e.target.dataset.m==='1');
 $('#g').onchange=()=>setMode(!!gs.find(g=>g.id===$('#g').value).coop);
 $('#res').onclick=e=>e.target.dataset.r&&setRes(e.target.dataset.r==='1');
 if(ed){$('#g').value=ed.gameId;$('#d').value=ed.date;$('#e').value=ed.evening;$('#nt').value=ed.note||'';$('#sc').value=ed.scenario||'';ed.players.forEach(x=>sel.push({...x,score:x.score??''}));setMode(!!ed.coop);if(ed.coop)setRes(!!ed.groupWin);$('#cx').onclick=()=>go('altro')}else setMode(!!gs[0]?.coop);
 drawChips();drawSel();
 $('#save').onclick=async()=>{if(!sel.length)return toast('Seleziona almeno un giocatore');
  const players=sel.map(s=>s.memberId?{memberId:s.memberId,score:coop?null:s.score}:{guest:!!s.guest,name:s.name,score:coop?null:s.score});
  const p={gameId:$('#g').value,date:$('#d').value,evening:$('#e').value,coop,groupWin:coop?win:null,scenario:coop?$('#sc').value:'',players,note:$('#nt').value};
  if(ed){p.id=ed.id;await DB.updatePlay(p);toast('Partita aggiornata');adminTab='partite';return go('altro')}
  const r=await DB.addPlay(p);const w=r.players.filter(x=>x.winner).map(x=>Stats.label(x,all));toast(coop?(win?'Vittoria del gruppo! 🎉':'Sconfitta… alla prossima!'):`Vince ${w.join(' e ')||'—'} 🏆`);go('record')}},
async record(){const gs=await DB.games(),ps=await DB.plays(),ms=await DB.members(),all=Stats.players(ps,ms),pl=all.filter(p=>p.member);const rec=Stats.records(gs,ps),gc=Stats.gameCounts(gs,ps).filter(x=>x.n);
 const top=pl.slice().sort((a,b)=>b.presences-a.presences)[0],var_=pl.slice().sort((a,b)=>b.distinct-a.distinct)[0],ng=all.length-pl.length;
 V.innerHTML=`<h2>Record</h2><div class="row"><div class="card"><div class="muted">Partite</div><div class="big">${ps.length}</div></div><div class="card"><div class="muted">Soci</div><div class="big">${pl.length}</div></div><div class="card"><div class="muted">Ospiti</div><div class="big">${ng}</div></div></div>
 <div class="card"><b>⭐ Socio più presente</b><div class="rec"><span>${top?esc(top.name):'—'}</span><span class="win">${top?top.presences+(top.presences==1?' serata':' serate'):''}</span></div>
 <b>🧭 Più giochi diversi</b><div class="rec"><span>${var_?esc(var_.name):'—'}</span><span class="win">${var_?var_.distinct+' giochi':''}</span></div></div>
 <div class="card"><b>🏆 Punteggio più alto per gioco</b>${rec.length?rec.map(r=>`<div class="rec"><span>${esc(r.game.name)}<br><span class="muted">${esc(Stats.label(r.best.p,ms))} · ${fmt(r.best.date)}</span></span><span class="big">${r.best.score}</span></div>`).join(''):'<p class="muted">Ancora nessun punteggio.</p>'}</div>
 <div class="card"><b>🎲 Giochi più giocati</b>${gc.length?gc.map(x=>`<div class="rec"><span>${esc(x.game.name)}</span><b>${x.n}</b></div>`).join(''):'<p class="muted">Ancora nessuna partita.</p>'}</div>
 <div class="card"><b>🕑 Ultime partite</b>${ps.slice(0,10).map(p=>playRow(p,gs,ms)).join('')||'<p class="muted">—</p>'}</div>`},
async giocatori(){const gs=await DB.games(),ms=await DB.members(),all=Stats.players(await DB.plays(),ms).sort((a,b)=>b.plays-a.plays);
 const card=p=>`<div class="card"><div class="row"><b>${esc(p.name)}</b><span class="muted" style="text-align:right">${p.presences} serat${p.presences==1?'a':'e'}</span></div>
 <div class="chips"><span class="chip">🎲 ${p.plays} partite</span><span class="chip">🏆 ${p.wins} vittorie</span><span class="chip">${Math.round(p.wins/p.plays*100)}%</span></div>
 <div class="muted" style="margin-top:8px">Preferiti: ${p.fav.slice(0,3).map(([id,n])=>esc(gname(gs,id))+' ('+n+')').join(', ')}</div></div>`;
 const m=all.filter(p=>p.member),g=all.filter(p=>!p.member);
 V.innerHTML=`<h2>Soci</h2>`+(m.map(card).join('')||'<p class="muted">I profili compaiono dopo la prima partita registrata.</p>')+(g.length?`<h2>Ospiti e nomi non collegati</h2>`+g.map(card).join(''):'')},
async altro(){const hp=await DB.hasPin();
 V.innerHTML=`<h2>Backup dei dati</h2><div class="card"><p class="muted">I dati sono salvati solo su questo telefono. Esportate spesso un backup.</p>
 <button class="p" id="ex">⬇️ Esporta JSON</button><label>Importa un backup (sostituisce i dati attuali)</label><input type="file" id="im" accept="application/json"></div>
 <h2>🔒 Pannello admin</h2><div class="card" id="adm"></div><div class="card muted">Diario di PerGioco · v2 · Associazione PerGioco, Ragusa</div>`;
 $('#ex').onclick=async()=>{const b=new Blob([await DB.export()],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='pergioco-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click()};
 $('#im').onchange=async e=>{const f=e.target.files[0];if(!f||!confirm('Sostituire tutti i dati con il backup?'))return;try{await DB.import(await f.text());admin=false;toast('Backup importato');go('altro')}catch(err){toast('Errore: '+err.message)}};
 const A=$('#adm');
 if(!hp){A.innerHTML=`<p class="muted">Primo accesso: scegliete un PIN admin (almeno 4 cifre).</p><label>Nuovo PIN</label><input id="p1" type="password" inputmode="numeric"><label>Ripeti PIN</label><input id="p2" type="password" inputmode="numeric"><button class="p" id="ps">Imposta PIN</button>`;
  $('#ps').onclick=async()=>{const a=$('#p1').value;if(!/^\d{4,}$/.test(a))return toast('Il PIN deve avere almeno 4 cifre');if(a!==$('#p2').value)return toast('I PIN non coincidono');await DB.setPin(a);admin=true;toast('PIN impostato');go('altro')};return}
 if(!admin){A.innerHTML=`<label>PIN admin</label><input id="pi" type="password" inputmode="numeric"><button class="p" id="pe">Entra</button>`;
  $('#pe').onclick=async()=>{if(await DB.checkPin($('#pi').value)){admin=true;go('altro')}else toast('PIN errato')};return}
 const ms=await DB.members(),leg=await DB.legacyNames(),gs=await DB.games(),ps=await DB.plays();let edit=null,gf='';
 const tabs=`<div class="row"><div class="seg" id="atab"><button data-a="soci" class="${adminTab==='soci'?'on':''}">Soci</button><button data-a="partite" class="${adminTab==='partite'?'on':''}">Partite</button></div><button class="s" id="out" style="flex:0 0 auto">Esci</button></div>`;
 const bind=()=>{$('#out').onclick=()=>{admin=false;go('altro')};$('#atab').onclick=e=>{if(e.target.dataset.a){adminTab=e.target.dataset.a;draw()}}};
 const drawPlays=()=>{const l=ps.filter(p=>!gf||p.gameId===gf);A.innerHTML=tabs+`<label>Filtra per gioco</label><select id="gf"><option value="">Tutti i giochi (${ps.length})</option>${gs.map(g=>`<option value="${g.id}"${g.id===gf?' selected':''}>${esc(g.name)}</option>`)}</select>
 <div style="margin-top:8px">${l.map(p=>`<div class="rec"><span>${esc(gname(gs,p.gameId))}<br><span class="muted">${fmt(p.date)} · ${p.evening} · ${p.players.map(x=>esc(Stats.label(x,ms))+(x.score!=null&&x.score!==''?' '+x.score:'')).join(', ')}</span></span><span style="flex:0 0 auto"><button class="s" data-pe="${p.id}">✏️</button> <button class="s" data-pd="${p.id}">🗑</button></span></div>`).join('')||'<p class="muted">Nessuna partita.</p>'}</div>`;bind();
  $('#gf').onchange=e=>{gf=e.target.value;drawPlays()};
  A.querySelectorAll('[data-pe]').forEach(b=>b.onclick=()=>{location.hash='altro';views.nuova(ps.find(p=>p.id===b.dataset.pe));scrollTo(0,0)});
  A.querySelectorAll('[data-pd]').forEach(b=>b.onclick=async()=>{const p=ps.find(x=>x.id===b.dataset.pd);if(!confirm(`Eliminare la partita a ${gname(gs,p.gameId)} del ${fmt(p.date)}?`))return;await DB.deletePlay(p.id);toast('Partita eliminata');go('altro')})};
 const drawSoci=()=>{const e=edit||{};A.innerHTML=tabs+`<p class="muted">${ms.filter(m=>m.active).length} soci attivi</p>
 <label>${e.id?'Modifica socio':'Nuovo socio'}</label><div class="row"><input id="mn" placeholder="Nome" value="${esc(e.nome||'')}"><input id="mc2" placeholder="Cognome" value="${esc(e.cognome||'')}"></div>
 <div class="row" style="margin-top:6px"><input id="mso" placeholder="Soprannome (facoltativo)" value="${esc(e.soprannome||'')}"><input id="mt" placeholder="N. tessera" value="${esc(e.tessera||'')}"></div>
 <button class="p" id="msv">${e.id?'Salva modifiche':'Aggiungi socio'}</button>${e.id?'<button class="s" id="mx" style="width:100%;margin-top:6px">Annulla</button>':''}
 <div style="margin-top:12px">${ms.map(m=>`<div class="rec"><span>${esc(memberName(m))}${m.soprannome?`<br><span class="muted">${esc(m.nome+' '+(m.cognome||''))}</span>`:''}${m.tessera?` <span class="chip">#${esc(m.tessera)}</span>`:''}${m.active?'':' <span class="chip off">disattivato</span>'}</span>
  <span style="flex:0 0 auto"><button class="s" data-e="${m.id}">✏️</button> <button class="s" data-t="${m.id}">${m.active?'Disattiva':'Riattiva'}</button></span></div>`).join('')||'<p class="muted">Nessun socio.</p>'}</div>
 ${leg.length?`<label style="margin-top:14px"><b>Collega a socio</b>: nomi delle partite registrate prima dell'elenco soci</label>${leg.map(([n,c],i)=>`<div class="prow"><input disabled value="${esc(n)} (${c})"><select id="lk${i}"><option value="">Scegli…</option>${ms.map(m=>`<option value="${m.id}">${esc(memberName(m))}</option>`)}<option value="guest">È un ospite</option></select><button class="s" data-l="${i}">✓</button></div>`).join('')}`:''}
 <label style="margin-top:14px"><b>Cambia PIN</b></label><div class="row"><input id="np" type="password" inputmode="numeric" placeholder="Nuovo PIN"><button class="s" id="cp" style="flex:0 0 auto">Cambia</button></div>`;bind();
 if($('#mx'))$('#mx').onclick=()=>{edit=null;drawSoci()};
 $('#msv').onclick=async()=>{const nome=$('#mn').value.trim();if(!nome)return toast('Il nome è obbligatorio');await DB.saveMember({...(edit||{}),nome,cognome:$('#mc2').value.trim(),soprannome:$('#mso').value.trim(),tessera:$('#mt').value.trim()});toast(edit?'Socio aggiornato':'Socio aggiunto');go('altro')};
 A.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{edit=ms.find(m=>m.id===b.dataset.e);drawSoci()});
 A.querySelectorAll('[data-t]').forEach(b=>b.onclick=async()=>{const m=ms.find(x=>x.id===b.dataset.t);await DB.saveMember({id:m.id,active:!m.active});go('altro')});
 A.querySelectorAll('[data-l]').forEach(b=>b.onclick=async()=>{const v=$('#lk'+b.dataset.l).value;if(!v)return toast('Scegli un socio');await DB.linkName(leg[b.dataset.l][0],v);toast('Collegato');go('altro')});
 $('#cp').onclick=async()=>{const a=$('#np').value;if(!/^\d{4,}$/.test(a))return toast('Il PIN deve avere almeno 4 cifre');await DB.setPin(a);toast('PIN cambiato');$('#np').value=''}};
 const draw=()=>adminTab==='partite'?drawPlays():drawSoci();draw()}
};
function go(v){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));location.hash=v;views[v]();scrollTo(0,0)}
$('#tabs').onclick=e=>{const b=e.target.closest('button');b&&go(b.dataset.v)};
go(views[location.hash.slice(1)]?location.hash.slice(1):'ludoteca');
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
