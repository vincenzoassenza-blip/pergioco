const $=s=>document.querySelector(s),V=$('#view');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=d=>new Date(d+'T12:00').toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'});
const toast=t=>{const e=document.createElement('div');e.className='toast';e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),2200)};
const gname=(gs,id)=>(gs.find(g=>g.id===id)||{}).name||'?';
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
async nuova(){const gs=await DB.games(),known=Stats.players(await DB.plays()).map(p=>p.name);const today=new Date().toISOString().slice(0,10);
 V.innerHTML=`<h2>Registra una partita</h2><div class="card"><label>Gioco</label><select id="g">${gs.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`)}</select>
 <div class="row"><div><label>Data</label><input id="d" type="date" value="${today}"></div><div><label>Serata</label><select id="e"><option>Giovedì</option><option>Domenica</option><option>Evento</option></select></div></div>
 <label>Modalità</label><div class="seg" id="mode"><button data-m="0" class="on">Competitiva</button><button data-m="1">Cooperativa</button></div>
 <div id="coop" hidden><label>Scenario</label><input id="sc" placeholder="es. Scenario 3"><label>Esito del gruppo</label><div class="seg" id="res"><button data-r="1" class="on">Vittoria</button><button data-r="0">Sconfitta</button></div></div>
 <label>Giocatori <span id="sl">e punteggi</span></label><datalist id="kp">${known.map(n=>`<option value="${esc(n)}">`)}</datalist><div id="pl"></div><button class="s" id="add">+ Giocatore</button>
 <label>Nota (facoltativa)</label><textarea id="nt" rows="2"></textarea><button class="p" id="save">Salva partita</button></div>`;
 let coop=false,win=true;const row=()=>{const d=document.createElement('div');d.className='prow';d.innerHTML=`<input list="kp" placeholder="Nome" class="pn"><input type="number" inputmode="decimal" placeholder="Punti" class="ps"${coop?' hidden':''}><button class="s">✕</button>`;d.querySelector('button').onclick=()=>d.remove();$('#pl').append(d)};
 row();row();$('#add').onclick=row;
 const setMode=c=>{coop=c;$('#coop').hidden=!c;$('#sl').hidden=c;document.querySelectorAll('.ps').forEach(i=>i.hidden=c);document.querySelectorAll('#mode button').forEach(b=>b.classList.toggle('on',+b.dataset.m==c))};
 $('#mode').onclick=e=>e.target.dataset.m&&setMode(e.target.dataset.m==='1');
 $('#g').onchange=()=>setMode(!!gs.find(g=>g.id===$('#g').value).coop);setMode(!!gs[0]?.coop);
 $('#res').onclick=e=>{if(!e.target.dataset.r)return;win=e.target.dataset.r==='1';document.querySelectorAll('#res button').forEach(b=>b.classList.toggle('on',b===e.target))};
 $('#save').onclick=async()=>{const players=[...document.querySelectorAll('.prow')].map(r=>({name:r.querySelector('.pn').value.trim(),score:coop?null:r.querySelector('.ps').value})).filter(p=>p.name);
  if(!players.length)return toast('Aggiungi almeno un giocatore');
  const p=await DB.addPlay({gameId:$('#g').value,date:$('#d').value,evening:$('#e').value,coop,groupWin:coop?win:null,scenario:coop?$('#sc').value:'',players,note:$('#nt').value});
  const w=p.players.filter(x=>x.winner).map(x=>x.name);toast(coop?(win?'Vittoria del gruppo! 🎉':'Sconfitta… alla prossima!'):`Vince ${w.join(' e ')||'—'} 🏆`);go('record')}},
async record(){const gs=await DB.games(),ps=await DB.plays(),pl=Stats.players(ps);const rec=Stats.records(gs,ps),gc=Stats.gameCounts(gs,ps).filter(x=>x.n);
 const top=pl.slice().sort((a,b)=>b.presences-a.presences)[0],var_=pl.slice().sort((a,b)=>b.distinct-a.distinct)[0];
 V.innerHTML=`<h2>Record</h2><div class="row"><div class="card"><div class="muted">Partite</div><div class="big">${ps.length}</div></div><div class="card"><div class="muted">Giocatori</div><div class="big">${pl.length}</div></div></div>
 <div class="card"><b>⭐ Più presente</b><div class="rec"><span>${top?esc(top.name):'—'}</span><span class="win">${top?top.presences+(top.presences==1?' serata':' serate'):''}</span></div>
 <b>🧭 Più giochi diversi</b><div class="rec"><span>${var_?esc(var_.name):'—'}</span><span class="win">${var_?var_.distinct+' giochi':''}</span></div></div>
 <div class="card"><b>🏆 Punteggio più alto per gioco</b>${rec.length?rec.map(r=>`<div class="rec"><span>${esc(r.game.name)}<br><span class="muted">${esc(r.best.name)} · ${fmt(r.best.date)}</span></span><span class="big">${r.best.score}</span></div>`).join(''):'<p class="muted">Ancora nessun punteggio.</p>'}</div>
 <div class="card"><b>🎲 Giochi più giocati</b>${gc.length?gc.map(x=>`<div class="rec"><span>${esc(x.game.name)}</span><b>${x.n}</b></div>`).join(''):'<p class="muted">Ancora nessuna partita.</p>'}</div>
 <div class="card"><b>🕑 Ultime partite</b>${ps.slice(0,10).map(p=>`<div class="rec"><span>${esc(gname(gs,p.gameId))}<br><span class="muted">${fmt(p.date)} · ${p.evening}${p.scenario?' · '+esc(p.scenario):''}</span></span><span class="win">${p.coop?(p.groupWin?'Vittoria':'Sconfitta'):esc(p.players.filter(x=>x.winner).map(x=>x.name).join(', '))}</span></div>`).join('')||'<p class="muted">—</p>'}</div>`},
async giocatori(){const gs=await DB.games(),pl=Stats.players(await DB.plays()).sort((a,b)=>b.plays-a.plays);
 V.innerHTML=`<h2>Giocatori</h2>`+(pl.map(p=>`<div class="card"><div class="row"><b>${esc(p.name)}</b><span class="muted" style="text-align:right">${p.presences} serat${p.presences==1?'a':'e'}</span></div>
 <div class="chips"><span class="chip">🎲 ${p.plays} partite</span><span class="chip">🏆 ${p.wins} vittorie</span><span class="chip">${Math.round(p.wins/p.plays*100)}%</span></div>
 <div class="muted" style="margin-top:8px">Preferiti: ${p.fav.slice(0,3).map(([id,n])=>esc(gname(gs,id))+' ('+n+')').join(', ')}</div></div>`).join('')||'<p class="muted">I profili compaiono dopo la prima partita registrata.</p>')},
async altro(){V.innerHTML=`<h2>Backup dei dati</h2><div class="card"><p class="muted">I dati sono salvati solo su questo telefono. Esportate spesso un backup.</p>
 <button class="p" id="ex">⬇️ Esporta JSON</button><label>Importa un backup (sostituisce i dati attuali)</label><input type="file" id="im" accept="application/json"></div>
 <div class="card muted">Diario di PerGioco · v1 · Associazione PerGioco, Ragusa</div>`;
 $('#ex').onclick=async()=>{const b=new Blob([await DB.export()],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='pergioco-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click()};
 $('#im').onchange=async e=>{const f=e.target.files[0];if(!f||!confirm('Sostituire tutti i dati con il backup?'))return;try{await DB.import(await f.text());toast('Backup importato')}catch(err){toast('Errore: '+err.message)}}}};
function go(v){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));location.hash=v;views[v]();scrollTo(0,0)}
$('#tabs').onclick=e=>{const b=e.target.closest('button');b&&go(b.dataset.v)};
go(views[location.hash.slice(1)]?location.hash.slice(1):'ludoteca');
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
