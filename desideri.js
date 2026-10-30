// v36 — "Lista desideri" (Community): i soci propongono giochi da BGG (una proposta attiva a testa) e li votano 👍.
// I dati arrivano dalle RPC des_* (SECURITY DEFINER): i soci vedono solo il numero dei voti, mai chi ha votato.
const DS={d:null,ord:'voti',
 STATI:{proposto:'💡 Proposto',valutazione:'🔍 In valutazione',ordinato:'📦 Ordinato',arrivato:'🎉 Arrivato',archiviato:'🗄️ Archiviato'},
 cl(){return window.CP_CLIENT||(DB.remote&&DB.remote.client)||null},
 async rpc(n,a){const c=this.cl();if(!c)throw new Error('La lista desideri richiede la connessione al database');const{data,error}=await c.rpc(n,a||{});if(error)throw error;return data},
 async bgg(body){const c=this.cl();if(!c||!c.functions)throw new Error('Ricerca BGG non disponibile');const{data,error}=await c.functions.invoke('bgg-meta',{body});if(error||!data||data.error)throw new Error((data&&data.error)||'BGG non raggiungibile, riprova');return data},
 async load(){try{if(this.cl())this.d=await this.rpc('des_lista')}catch(e){console.warn('DS',e);this.d=null}},
 scout(id){return((this.d&&this.d.scout)||[]).filter(x=>x===id).length}};
BADGES.push(['scout','🔭','Talent scout','Proponi un gioco che poi arriva in ludoteca',s=>s.dsScout>=1]);
XP_SRC.splice(XP_SRC.length-1,0,['scout','🔭 Talent scout',40]);
{const _bs=Badges.stats;Badges.stats=function(k,o){return Object.assign(_bs.call(this,k,o),{dsScout:String(k).startsWith('m:')?DS.scout(String(k).slice(2)):0})}}
{const _xl=XP.load.bind(XP);XP.load=async function(){await _xl();await DS.load()}}
const dsMsg=e=>String(e&&e.message||e||'Errore').replace(/^.*?ERROR:\s*/,'').slice(0,200);
const dsData=t=>{try{return new Date(t).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})}catch(_){return''}};
const dsThumb=u=>/^https:\/\/cf\.geekdo-images\.com\/[A-Za-z0-9_./%=:()-]+$/.test(String(u||''))?`<img class="dsimg" src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<div class="dsimg dsph">🎲</div>';
const dsInfo=g=>[g.min&&(g.max&&g.max!==g.min?`👥 ${+g.min}–${+g.max}`:`👥 ${+g.min}`),g.durata&&`⏱ ${+g.durata}′`,g.peso&&`⚖️ ${String(g.peso).replace('.',',')}`,g.anno&&`📅 ${+g.anno}`].filter(Boolean).map(x=>`<span class="chip">${esc(x)}</span>`).join('');
async function dsHtml(){if(!DS.cl())return'';await DS.load();const d=DS.d;if(!d)return'';const st=!!d.staff,me=d.me,ms=await DB.members(),nm=id=>{const m=ms.find(x=>x.id===id);return m?esc(memberName(m)):'Socio'};
 const p=d.periodo,u=d.ultimo,L=(d.desideri||[]).slice(),mia=L.find(x=>x.da===me&&['proposto','valutazione','ordinato'].includes(x.stato));
 const O={voti:(a,b)=>b.voti-a.voti||String(a.creato).localeCompare(String(b.creato)),nuovi:(a,b)=>String(b.creato).localeCompare(String(a.creato)),giocatori:(a,b)=>(b.max||0)-(a.max||0)||(a.min||0)-(b.min||0),durata:(a,b)=>(a.durata||9999)-(b.durata||9999)};
 L.sort((a,b)=>(a.stato==='archiviato')-(b.stato==='archiviato')||(O[DS.ord]||O.voti)(a,b));
 const ban=p?`<div class="dsban on">🗳️ <b>Votazione aperta</b> ${p.fine?`fino al ${esc(dsData(p.fine))}`:'<span class="muted">· senza scadenza: la chiude lo staff</span>'}</div>`:`<div class="dsban">🔒 Votazione chiusa${st?'':' · i voti riapriranno con la prossima votazione'}</div>`;
 const win=u&&u.nome?`<div class="dsban win">🏆 Ultima votazione (chiusa il ${esc(dsData(u.chiuso))}): <b>${esc(u.nome)}</b> con ${+u.voti} 👍</div>`:'';
 const stf=st?`<details class="card"><summary><b>🛠️ Gestione votazione (staff)</b></summary>${p?`<label>Scadenza (facoltativa)</label><input type="date" id="dsfine" value="${p.fine?esc(String(p.fine).slice(0,10)):''}"><div class="row"><button class="s" id="dsscad">💾 Salva scadenza</button><button class="p" id="dschiudi">🔒 Chiudi ora</button></div>`:`<label>Scadenza (facoltativa: vuota = senza scadenza, la chiudi tu)</label><input type="date" id="dsfine"><button class="p" id="dsapri" style="width:100%">🗳️ Apri votazione</button>`}</details>`:'';
 const card=g=>{const arch=g.stato==='archiviato',mio=g.da===me,cv=p&&['proposto','valutazione'].includes(g.stato);
  return`<div class="card dsc${arch?' off':''}" data-ds="${esc(g.id)}"><div class="dsrow">${dsThumb(g.thumb)}<div class="dsb"><div class="hrow"><b>${esc(g.nome)}</b><span class="evb t">${esc(DS.STATI[g.stato]||g.stato)}</span></div>
  <div class="chips">${dsInfo(g)}</div>${(g.cat||[]).length?`<div class="muted" style="font-size:12px">🏷 ${(g.cat||[]).slice(0,4).map(esc).join(' · ')}</div>`:''}
  ${g.perche?`<p class="dsper">“${esc(g.perche)}”</p>`:''}<div class="muted" style="font-size:12px">Proposto da ${nm(g.da)}${mio?' (tu)':''} · <a href="https://boardgamegeek.com/boardgame/${+g.bgg_id}" target="_blank" rel="noopener noreferrer">BGG</a></div></div></div>
  <div class="row dsact"><button class="s${g.mio?' on':''}" data-dsv="${esc(g.id)}" ${cv?'':'disabled'} aria-pressed="${g.mio?'true':'false'}">👍 ${+g.voti}</button><button class="s${g.mio_sp?' on':''}" data-dss="${esc(g.id)}" ${arch?'disabled':''} title="Conosco le regole e posso spiegarlo">🙋 lo spiego io · ${+g.spiego}</button>${mio&&g.stato==='proposto'?`<button class="s" data-dsr="${esc(g.id)}">↩️ Ritira</button>`:''}</div>
  ${st?`<div class="row dsact"><select data-dst="${esc(g.id)}">${Object.keys(DS.STATI).filter(k=>k!=='arrivato').map(k=>`<option value="${k}"${k===g.stato?' selected':''}>${DS.STATI[k]}</option>`).join('')}${g.stato==='arrivato'?'<option selected>🎉 Arrivato</option>':''}</select>${g.stato!=='arrivato'?`<button class="s" data-dsa="${esc(g.id)}">🎉 Arrivato</button>`:''}<button class="s" data-dsx="${esc(g.id)}">🗑️</button></div>`:''}</div>`};
 return`<h2 id="desideri">🎁 Lista desideri</h2><p class="muted" style="margin-top:-6px">Proponi un gioco che vorresti in ludoteca e vota 👍 quelli degli altri. Una proposta attiva a testa; si vede solo il numero dei voti.</p>${ban}${win}${stf}
 ${me?(mia?`<div class="card muted">💡 La tua proposta attiva: <b>${esc(mia.nome)}</b>. Potrai proporne un'altra quando arriva o viene archiviata.</div>`:`<div class="card"><b>➕ Proponi un gioco</b><input id="dsq" placeholder="Cerca su BGG oppure incolla il link/ID del gioco" maxlength="60" autocomplete="off"><div id="dsr"></div></div>`):'<div class="card muted">Collega il tuo account a una scheda socio per proporre e votare.</div>'}
 <div class="row dsord"><span class="muted">Ordina:</span>${[['voti','👍 Voti'],['nuovi','🆕 Nuovi'],['giocatori','👥 Giocatori'],['durata','⏱ Durata']].map(([k,l])=>`<button class="s${DS.ord===k?' on':''}" data-dso="${k}">${l}</button>`).join('')}</div>
 <div id="dsl">${L.length?L.map(card).join(''):'<div class="card muted">Ancora nessuna proposta: inizia tu!</div>'}</div>`}
async function dsDraw(){const w=$('#dsw');if(!w)return;w.innerHTML=await dsHtml();dsBind()}
const dsDo=async(f,ok)=>{try{await f();if(ok)toast(ok);await dsDraw()}catch(e){toast(dsMsg(e))}};
function dsBind(){const w=$('#dsw');if(!w)return;const q=$('#dsq');let tm;
 if(q)q.oninput=()=>{clearTimeout(tm);const s=q.value.trim();if(s.length<2){$('#dsr').innerHTML='';return}tm=setTimeout(async()=>{const lk=s.match(/^(?:https?:\/\/(?:www\.)?boardgamegeek\.com\/boardgame(?:expansion)?\/)?(\d{1,8})(?:[\/?#].*)?$/);if(lk){$('#dsr').innerHTML=`<div class="rec"><a data-dsb="${+lk[1]}">Gioco BGG n. ${+lk[1]} · apri scheda</a></div>`;return}$('#dsr').innerHTML='<p class="muted">Cerco su BGG…</p>';try{const r=await DS.bgg({mode:'cerca',q:s});if(q.value.trim()!==s)return;
  $('#dsr').innerHTML=(r.items||[]).length?r.items.map(x=>`<div class="rec"><a data-dsb="${+x.bgg_id}">${esc(x.nome)}${x.anno?` <span class="muted">(${+x.anno})</span>`:''}</a></div>`).join(''):'<p class="muted">Nessun gioco trovato.</p>'}catch(e){$('#dsr').innerHTML=`<p class="warn">${esc(dsMsg(e))}</p><p class="muted">Puoi anche incollare il link della pagina BGG del gioco.</p>`}},400)};
 w.onclick=async ev=>{const t=ev.target.closest('[data-dsb],[data-dsv],[data-dss],[data-dsr],[data-dsa],[data-dsx],[data-dso],#dsapri,#dsscad,#dschiudi,#dsok,#dsno');if(!t)return;const D=t.dataset;
  if(D.dsb){$('#dsr').innerHTML='<p class="muted">Recupero copertina e dati da BGG…</p>';try{const g=await DS.bgg({mode:'info',bgg_id:+D.dsb});DS.sel=g;
   $('#dsr').innerHTML=`<div class="dsrow" style="margin-top:8px">${dsThumb(g.thumb)}<div class="dsb"><b>${esc(g.nome)}</b><div class="chips">${dsInfo(g)}</div>${(g.cat||[]).length?`<div class="muted" style="font-size:12px">🏷 ${g.cat.slice(0,4).map(esc).join(' · ')}</div>`:''}</div></div>
   <label>Perché lo vorresti? (facoltativo)</label><textarea id="dsp" maxlength="200" rows="2" placeholder="Es. veloce da spiegare, perfetto per 5"></textarea><div class="muted" style="font-size:12px;text-align:right"><span id="dspn">0</span>/200</div><div class="row"><button class="s" id="dsno">Annulla</button><button class="p" id="dsok">💡 Proponi</button></div>`;
   $('#dsp').oninput=()=>{$('#dspn').textContent=$('#dsp').value.length}}catch(e){$('#dsr').innerHTML=`<p class="warn">${esc(dsMsg(e))}</p>`}return}
  if(t.id==='dsno'){DS.sel=null;$('#dsr').innerHTML='';return}
  if(t.id==='dsok'){const g=DS.sel;if(!g)return;const pr=$('#dsp').value.trim();if(pr.length>200)return toast('Massimo 200 caratteri');t.disabled=true;return dsDo(()=>DS.rpc('des_proponi',{p:{bgg_id:g.bgg_id,nome:g.nome,thumb:g.thumb,min:g.min,max:g.max,durata:g.durata,anno:g.anno,peso:g.peso,cat:g.cat||[],perche:pr}}),'💡 Proposta inviata')}
  if(D.dsv){const g=DS.d.desideri.find(x=>x.id===D.dsv);return dsDo(()=>DS.rpc('des_vota',{p:D.dsv,p_on:!(g&&g.mio)}))}
  if(D.dss){const g=DS.d.desideri.find(x=>x.id===D.dss);return dsDo(()=>DS.rpc('des_spiego',{p:D.dss,p_on:!(g&&g.mio_sp)}))}
  if(D.dsr){if(!confirm('Ritirare la tua proposta?'))return;return dsDo(()=>DS.rpc('des_ritira',{p:D.dsr}),'Proposta ritirata')}
  if(D.dsx){if(!confirm('Eliminare definitivamente la proposta e i suoi voti?'))return;return dsDo(()=>DS.rpc('des_elimina',{p:D.dsx}),'Eliminata')}
  if(D.dso){DS.ord=D.dso;return dsDraw()}
  if(D.dsa){const gs=(await DB.games()).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name))),g=DS.d.desideri.find(x=>x.id===D.dsa);const c=t.closest('.dsc');
   c.insertAdjacentHTML('beforeend',`<div class="dslink"><label>Collega al gioco in ludoteca (aggiungilo prima da Ludoteca → Aggiungi gioco, BGG ${+g.bgg_id})</label><select id="dsgs"><option value="">— scegli —</option>${gs.map(x=>`<option value="${esc(x.id)}"${+x.bggId===+g.bgg_id||String(x.name).toLowerCase()===String(g.nome).toLowerCase()?' selected':''}>${esc(x.name)}</option>`).join('')}</select><button class="p" id="dslk">🎉 Segna come arrivato</button></div>`);
   $('#dslk').onclick=()=>{const v=$('#dsgs').value;if(!v)return toast('Scegli il gioco');dsDo(()=>DS.rpc('des_collega',{p:D.dsa,p_game:v}),'🎉 Arrivato in ludoteca!')};return}
  if(t.id==='dsapri'||t.id==='dsscad'){const v=$('#dsfine').value,f=v?new Date(v+'T23:59:00').toISOString():null;return dsDo(()=>DS.rpc('des_periodo',{p_azione:t.id==='dsapri'?'apri':'scadenza',p_fine:f}),t.id==='dsapri'?'🗳️ Votazione aperta':'Scadenza salvata')}
  if(t.id==='dschiudi'){if(!confirm('Chiudere la votazione adesso? I voti verranno bloccati.'))return;return dsDo(()=>DS.rpc('des_periodo',{p_azione:'chiudi'}),'🔒 Votazione chiusa')}};
 w.onchange=ev=>{const s=ev.target.closest('[data-dst]');if(s&&DS.STATI[s.value])dsDo(()=>DS.rpc('des_stato',{p:s.dataset.dst,p_stato:s.value}),'Stato aggiornato')}}
{const _g=views.giocatori;views.giocatori=async function(...a){const r=await _g.apply(this,a);if(a[0]||!DS.cl())return r;V.insertAdjacentHTML('beforeend','<div id="dsw"></div>');await dsDraw();return r}}
