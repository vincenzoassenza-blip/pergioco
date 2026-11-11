// v41.4 — Community (mockup approvato): titolo con selettore Soci | Lista desideri, striscia unica di stato,
// ⓘ leggera, proposte compatte cliccabili (▸/▾), «Proposto da» solo allo staff, voto pieno/chiaro,
// Ordina a tendina (+ filtro con «Tutto»), Arrivati chiuso, «➕ Proponi» sulla riga Proposte.
// Dati, RPC, validazioni ed escaping restano quelli di desideri.js: ogni dato passa da esc().
(function(){
const T={titolo:'👥 Community',soci:'Soci',lista:'🎁 Lista desideri',proposte:'Proposte',ordina:'Ordina',mostra:'Mostra',tutto:'Tutto',
 info:'Proponi un gioco che vorresti nella collezione dell\'associazione e vota 👍 quelli degli altri. Una proposta attiva a testa; si vede solo il numero dei voti.',
 infoL:'Come funziona la lista desideri',aperti:'Voti aperti',fino:'fino al',sempre:'senza scadenza',tua:'tua proposta',vinta:'Ultima vinta',chiusa:'Votazione chiusa il',
 proponi:'➕ Proponi',proponiH:n=>`Hai già una proposta attiva (${n}): potrai proporne un'altra quando arriva o viene archiviata.`,noAcc:'Collega il tuo account a una scheda socio per proporre e votare.',
 vota:'Vota',votato:'Votato',spiego:'Lo spiego io',spiegoT:'Conosco le regole e posso spiegarlo',daStaff:'Proposto da',tuaChip:'Proposta tua',arrivati:'🎉 Arrivati',archiviati:'🗄️ Archiviati',vuoto:'Ancora nessuna proposta: inizia tu!',
 nessuno:'Nessuna proposta con questo filtro.',ritira:'↩️ Ritira',
 ord:[['voti','👍 Voti'],['nuovi','🆕 Nuovi'],['giocatori','👥 Giocatori'],['durata','🕒 Durata']]};
const TAB='pergioco-community-tab',ATT=['proposto','valutazione','ordinato'];
DS.open=DS.open||new Set();DS.fil=DS.fil||'tutto';
const arr=o=>`<span class="ar" aria-hidden="true">${o?'▾':'▸'}</span>`;
const dShort=t=>{try{return new Date(t).toLocaleDateString('it-IT',{day:'numeric',month:'short'})}catch(_){return''}};
const info=g=>[g.min&&(g.max&&g.max!==g.min?`👥 ${+g.min}–${+g.max}`:`👥 ${+g.min}`),g.durata&&`\u0001 ${+g.durata}′`].filter(Boolean).map(x=>`<span class="chip">${esc(x).replace('\u0001',CLK)}</span>`).join('');
const more=g=>[g.peso&&`⚖️ ${String(g.peso).replace('.',',')}`,g.anno&&`📅 ${+g.anno}`].filter(Boolean).map(x=>`<span class="chip">${esc(x)}</span>`).join('');
window.CM414={T};
dsHtml=async function(){if(!DS.cl())return'';await DS.load();const d=DS.d;if(!d)return'';
 const am=typeof adminMode==='function'&&adminMode(),st=!!d.staff&&am,me=d.me,ms=await DB.members(),nm=id=>{const m=ms.find(x=>x.id===id);return m?esc(memberName(m)):'Socio'};
 const p=d.periodo,u=d.ultimo,all=(d.desideri||[]).slice(),mia=all.find(x=>x.da===me&&ATT.includes(x.stato));
 const O={voti:(a,b)=>b.voti-a.voti||String(a.creato).localeCompare(String(b.creato)),nuovi:(a,b)=>String(b.creato).localeCompare(String(a.creato)),giocatori:(a,b)=>(b.max||0)-(a.max||0)||(a.min||0)-(b.min||0),durata:(a,b)=>(a.durata||9999)-(b.durata||9999)};
 const srt=(a,b)=>(a.stato==='archiviato')-(b.stato==='archiviato')||(O[DS.ord]||O.voti)(a,b);
 const arrv=all.filter(x=>x.stato==='arrivato').sort(srt),act=all.filter(x=>x.stato!=='arrivato'&&x.stato!=='archiviato').sort(srt),arch=all.filter(x=>x.stato==='archiviato').sort(srt);
 const stati=[...new Set(act.map(x=>x.stato))].filter(k=>DS.STATI[k]);if(!stati.includes(DS.fil))DS.fil='tutto';
 const L=DS.fil==='tutto'?act:act.filter(x=>x.stato===DS.fil);
 const strip=`<div class="cmstrip">🗳️ <b>${T.aperti}${p&&p.fine?` ${T.fino} ${esc(dShort(p.fine))}`:''}</b>${p&&p.fine?'':` <span>· ${T.sempre}</span>`}${mia?` · 💡 ${T.tua}: <b>${esc(mia.nome)}</b>`:''}</div>`;
 const win=u&&u.nome?`<div class="cmwin lr" data-cmx="win" role="button" tabindex="0" aria-expanded="${DS.open.has('win')}"><span class="t">🏆 ${T.vinta}: <b>${esc(u.nome)}</b> (${+u.voti} 👍)${DS.open.has('win')?`<span class="cmsub">${T.chiusa} ${esc(dsData(u.chiuso))}</span>`:''}</span>${arr(DS.open.has('win'))}</div>`:'';
 const stf=st?`<details class="card"><summary><b>🛠️ Gestione votazione (staff)</b></summary>${p?`<label>Scadenza (facoltativa)</label><input type="date" id="dsfine" value="${p.fine?esc(String(p.fine).slice(0,10)):''}"><div class="row dsbtns"><button class="s" id="dsscad">💾 Salva scadenza</button><button class="p" id="dschiudi">🔒 Chiudi ora</button></div>`:`<label>Scadenza (facoltativa: vuota = senza scadenza, la chiudi tu)</label><input type="date" id="dsfine"><button class="p" id="dsapri" style="width:100%">🗳️ Apri votazione</button>`}</details>`:'';
 const pbtn=me&&!mia?`<button type="button" class="cmprop${DS.prop?' on':''}" id="cmprop" aria-expanded="${!!DS.prop}">${T.proponi}</button>`:`<button type="button" class="cmprop off" id="cmprop" aria-disabled="true" aria-expanded="${!!DS.propH}">${T.proponi} <span class="cmi">ⓘ</span></button>`;
 const pH=DS.propH&&(!me||mia)?`<div class="cmhelp" id="cmproph">${mia?esc(T.proponiH(mia.nome)):T.noAcc}</div>`:'';
 const form=DS.prop&&me&&!mia?`<div class="card" id="cmform"><b>${T.proponi} un gioco</b><input id="dsq" placeholder="Cerca su BGG oppure incolla il link/ID del gioco" maxlength="60" autocomplete="off"><div id="dsr"></div></div>`:'';
 const sel=`<label class="cmdd"><span class="sr">${T.ordina}</span><select id="cmord" aria-label="${T.ordina}">${T.ord.map(([k,l])=>`<option value="${k}"${DS.ord===k?' selected':''}>${T.ordina}: ${l}</option>`).join('')}</select></label>`;
 const fil=stati.length>1?`<label class="cmdd cmfil"><span class="sr">${T.mostra}</span><select id="cmfil" aria-label="${T.mostra}"><option value="tutto"${DS.fil==='tutto'?' selected':''}>${T.mostra}: ${T.tutto}</option>${stati.map(k=>`<option value="${esc(k)}"${DS.fil===k?' selected':''}>${esc(DS.STATI[k])}</option>`).join('')}</select></label>`:'';
 const card=g=>{const arch=g.stato==='archiviato',mio=g.da===me,cv=['proposto','valutazione'].includes(g.stato),o=DS.open.has(g.id);
  return`<div class="card dsc cmc${arch?' off':''}" data-ds="${esc(g.id)}"><div class="cmrow lr" data-cmx="${esc(g.id)}" role="button" tabindex="0" aria-expanded="${o}">${dsThumb(g.thumb)}<div class="dsb"><div class="cmh"><b>${esc(g.nome)}</b> <span class="evb t">${esc(DS.STATI[g.stato]||g.stato)}</span></div>
  <div class="chips">${info(g)}${mio?`<span class="chip cmtua">${T.tuaChip}</span>`:''}</div>${st?`<div class="cmby">${T.daStaff} ${nm(g.da)}${mio?' (tu)':''}</div>`:''}</div>${arr(o)}</div>
  ${o?`<div class="cmdet">${more(g)?`<div class="chips">${more(g)}</div>`:''}${(g.cat||[]).length?`<div class="muted" style="font-size:12px">🏷 ${(g.cat||[]).slice(0,4).map(esc).join(' · ')}</div>`:''}${g.perche?`<p class="dsper">“${esc(g.perche)}”</p>`:''}<div class="muted" style="font-size:12px"><a class="cmbgg" href="https://boardgamegeek.com/boardgame/${+g.bgg_id}" target="_blank" rel="noopener noreferrer">BoardGameGeek ▸</a></div></div>`:''}
  ${g.stato==='arrivato'?'':`<div class="cmva"><button class="${g.mio?'on':''}" data-dsv="${esc(g.id)}" ${cv?'':'disabled'} aria-pressed="${g.mio?'true':'false'}">👍 ${g.mio?T.votato:T.vota} · ${+g.voti}</button><button class="${g.mio_sp?'on':''}" data-dss="${esc(g.id)}" ${arch?'disabled':''} aria-pressed="${g.mio_sp?'true':'false'}" title="${T.spiegoT}">🙋 ${T.spiego} · ${+g.spiego}</button></div>`}
  ${mio&&g.stato==='proposto'?`<div class="row dsact"><button class="s" data-dsr="${esc(g.id)}">${T.ritira}</button></div>`:''}
  ${st&&o?`<div class="row dsact"><select data-dst="${esc(g.id)}">${Object.keys(DS.STATI).filter(k=>k!=='arrivato').map(k=>`<option value="${k}"${k===g.stato?' selected':''}>${DS.STATI[k]}</option>`).join('')}${g.stato==='arrivato'?'<option selected>🎉 Arrivato</option>':''}</select>${g.stato!=='arrivato'?`<button class="s" data-dsa="${esc(g.id)}">🎉 Arrivato</button>`:''}<button class="s" data-dsx="${esc(g.id)}">🗑️</button></div>`:''}</div>`};
 const ao=DS.open.has('arr'),sec=(k,lab,l)=>{const op=DS.open.has(k);return l.length?`<div class="card cmarr" data-cms="${k}"><div class="lr" data-cmx="${k}" role="button" tabindex="0" aria-expanded="${op}"><span class="t"><b>${lab} (${l.length})</b></span>${arr(op)}</div>${op?`<div class="cmarrl">${l.map(card).join('')}</div>`:''}</div>`:''};
 return`<section id="desideri" class="cm">${strip}${win}${stf}
 <div class="cmth"><h3>${T.proposte} <button type="button" class="cmi" id="cminfo" aria-label="${T.infoL}" aria-expanded="${!!DS.info}">ⓘ</button></h3>${sel}${pbtn}</div>
 ${DS.info?`<div class="cmhelp" id="cminfot">${T.info}</div>`:''}${pH}${fil}${form}
 <div id="dsl">${L.length?L.map(card).join(''):`<div class="card muted">${act.length?T.nessuno:(arrv.length||arch.length?T.nessuno:T.vuoto)}</div>`}</div>
 ${typeof bggPwrHtml==='function'?bggPwrHtml():''}${sec('arr',T.arrivati,arrv)}${sec('arch',T.archiviati,arch)}</section>`};
// interazioni aggiuntive (una sola volta per contenitore; dsBind continua a gestire voti, proposte e staff)
function bindCm(w){if(w._cm)return;w._cm=1;
 const tog=k=>{DS.open.has(k)?DS.open.delete(k):DS.open.add(k);dsDraw()};
 w.addEventListener('click',ev=>{if(ev.target.closest('a,button:not(#cmprop):not(#cminfo),select,input,textarea'))return;
  const x=ev.target.closest('[data-cmx]');if(x){ev.stopPropagation();return tog(x.dataset.cmx)}
  if(ev.target.closest('#cminfo')){ev.stopPropagation();DS.info=!DS.info;return dsDraw()}
  if(ev.target.closest('#cmprop')){ev.stopPropagation();const b=ev.target.closest('#cmprop');if(b.getAttribute('aria-disabled')==='true'){DS.propH=!DS.propH}else{DS.prop=!DS.prop}dsDraw().then(()=>{const q=$('#dsq');if(q)q.focus()});return}},true);
 w.addEventListener('keydown',ev=>{const x=ev.target.closest&&ev.target.closest('[data-cmx]');if(x&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();tog(x.dataset.cmx)}});
 w.addEventListener('change',ev=>{if(ev.target.id==='cmord'&&O_OK(ev.target.value)){DS.ord=ev.target.value;dsDraw()}else if(ev.target.id==='cmfil'){DS.fil=ev.target.value==='tutto'||DS.STATI[ev.target.value]?ev.target.value:'tutto';dsDraw()}})}
const O_OK=v=>T.ord.some(([k])=>k===v);
const _g=views.giocatori;views.giocatori=async function(...a){const r=await _g.apply(this,a);if(a[0])return r;
 if(window.PS&&typeof PS.load==='function')await PS.load();
 const w=$('#dsw');
 let pw=$('#psw');if(!pw&&window.PS){pw=document.createElement('div');pw.id='psw'}
 const showSon=!!(window.PS&&PS.showTab());
 const showDes=!!w;
 let tab=localStorage.getItem(TAB);if(!tab)tab=showDes?'desideri':'soci';
 if(tab==='sondaggi'&&!showSon)tab=showDes?'desideri':'soci';
 if(tab==='desideri'&&!showDes)tab='soci';
 const so=document.createElement('div');so.id='cmsoci';[...V.childNodes].filter(n=>n!==w&&n!==pw).forEach(n=>so.append(n));
 const so2=so.querySelector('h2');if(so2)so2.classList.add('sr');
 const tabs=(showDes||showSon)?`<div class="cmseg" role="tablist"><button type="button" role="tab" data-cmt="soci">${T.soci}</button>${showDes?`<button type="button" role="tab" data-cmt="desideri">${T.lista}</button>`:''}${showSon?`<button type="button" role="tab" data-cmt="sondaggi">🗳️ Sondaggi</button>`:''}</div>`:'';
 const hd=document.createElement('div');hd.className='cmtop';hd.innerHTML=`<h2>${T.titolo}</h2>${tabs}`;
 V.prepend(hd,so);if(w)V.append(w);if(pw)V.append(pw);
 const show=t=>{so.hidden=t!=='soci';if(w)w.hidden=t!=='desideri';if(pw)pw.hidden=t!=='sondaggi';hd.querySelectorAll('[data-cmt]').forEach(b=>{const on=b.dataset.cmt===t;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)})};
 hd.onclick=e=>{const b=e.target.closest('[data-cmt]');if(!b)return;localStorage.setItem(TAB,b.dataset.cmt);show(b.dataset.cmt);if(b.dataset.cmt==='sondaggi'&&window.PS&&PS.draw)PS.draw();if(b.dataset.cmt==='sondaggi'&&window.PS&&PS.rpc)PS.rpc('poll_notifiche_lette',{p_id:null}).catch(()=>{})};
 show(tab);if(w)bindCm(w);if(showSon&&tab==='sondaggi'&&window.PS&&PS.draw)await PS.draw();
 window.CM413={refreshTabs:()=>{const on=!!(window.PS&&PS.showTab());const b=hd.querySelector('[data-cmt="sondaggi"]');
  if(on&&!b){const seg=hd.querySelector('.cmseg');if(seg)seg.insertAdjacentHTML('beforeend','<button type="button" role="tab" data-cmt="sondaggi">🗳️ Sondaggi</button>')}
  else if(!on&&b){if((localStorage.getItem(TAB)||'')==='sondaggi'){localStorage.setItem(TAB,'soci');show('soci')}b.remove()}}};
 return r};
})();
