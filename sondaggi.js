// v41.13 — Sondaggi in Community. Ogni testo utente passa da esc().
(function(){
const TAB='pergioco-community-tab';
const TIPI=[
  ['singola','Scelta singola','Una sola opzione'],
  ['multipla','Scelta multipla','Con un massimo di scelte'],
  ['date','Date / serate','Sì, forse o no'],
  ['gioco','Scegli il gioco','Catalogo app o BGG'],
  ['voto','Voto 1–5','Valutazione numerica'],
  ['classifica','Classifica','Ordine di preferenza']
];
const T={
  tit:'🗳️ Sondaggi', infoL:'Come funzionano i sondaggi',
  info:'I soci votano sui sondaggi aperti. Quelli fissati restano in cima finché sono aperti.',
  mostra:'Mostra', tutto:'Tutto', aperti:'Aperti', chiusi:'Chiusi',
  vuoto:'Ancora nessun sondaggio.', vuotoH:'Crea il primo: i soci lo vedranno in Community quando è aperto.', nessuno:'Nessun sondaggio con questo filtro.', creaBtn:'➕ Crea sondaggio',
  errLoad:'Non riesco a caricare i sondaggi.',
  indietro:'← Sondaggi', invia:'Invia il voto', salvaDisp:'Salva le disponibilità', salvaCl:'Salva la classifica',
  cambia:'Puoi cambiare idea fino alla chiusura.', noCambia:'Nei sondaggi anonimi il voto non si può cambiare.',
  max:(n,u)=>`${u} di ${n} scelte usate.`,
  chiusiLab:'🗄️ Chiusi e archiviati', nuovo:'➕ Nuovo sondaggio', pubblica:'Pubblica il sondaggio',
  gest:'Gestione sondaggi', gestH:'Crea, modifica, chiudi, archivia o elimina. Il riepilogo resta disponibile dopo la chiusura.',
  crea:'Nuovo sondaggio', creaH:'Tutto è configurabile. I soci vedranno solo ciò che attivi qui.',
  noAcc:'Collega il tuo account a una scheda socio per votare.',
  già:'Hai già votato',
  collega:'Collega alla Lista desideri',
  collegaH:'Il primo classificato può diventare una proposta in Community, già accompagnata dal risultato del sondaggio.',
  proponi:n=>'➕ Proponi '+n+' nella Lista desideri',
  uscita:t=>'Nuovo sondaggio: '+t, promo:t=>'Promemoria: «'+t+'» chiude a breve. Puoi ancora votare.'
};
const labTipo=k=>(TIPI.find(x=>x[0]===k)||[k,k])[1];
const arr=o=>`<span class="ar" aria-hidden="true">${o?'▾':'▸'}</span>`;
const dShort=t=>{try{const d=new Date(t);if(!+d)return'';return d.toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'})}catch(_){return''}};
const chip=(s,c='')=>s?`<span class="chip${c?' '+c:''}">${s}</span>`:'';
const covers={}; const initials=s=>esc(String(s||'?').replace(/[^A-Za-z0-9À-ÿ]/g,'').slice(0,2).toUpperCase()||'?');
function cover(o){
  const t=o&&o.thumb&&/^https:\/\/cf\.geekdo-images\.com\//.test(o.thumb)?esc(o.thumb):'';
  if(t)return`<span class="scover"><img src="${t}" alt=""></span>`;
  return`<span class="scover">${initials(o&&o.label)}</span>`;
}

const PS={d:null,fil:'tutto',open:new Set(),view:null,form:null,info:false,err:null};
PS.cl=()=>DB.remote&&DB.remote.client;
PS.rpc=async(n,a)=>{const c=PS.cl();if(!c)throw new Error('I sondaggi richiedono la connessione al database');const{data,error}=await c.rpc(n,a||{});if(error)throw error;return data};
PS.load=async()=>{try{if(PS.cl()){PS.d=await PS.rpc('poll_lista');PS.err=null}}catch(e){console.warn('PS',e);PS.d=null;PS.err=e&&e.message}};
PS.hasActive=()=>!!(PS.d&&PS.d.has_active);
PS.showTab=()=>!!((typeof adminMode==='function'&&adminMode())||(PS.d&&PS.d.has_active));
PS.staffUi=()=>!!(PS.d&&PS.d.staff&&typeof adminMode==='function'&&adminMode());

function meta(p){
  const bits=[];
  bits.push(chip(esc(labTipo(p.typ))));
  if(p.pinned&&p.status==='aperto')bits.push(chip('📌 Fissato','pinchip'));
  if(p.anonymous)bits.push(chip('Anonimo'));else bits.push(chip('Nominativo','ok'));
  if(p.status==='aperto')bits.push(chip('Aperto','ok'));
  if(p.status==='chiuso')bits.push(chip('Chiuso'));
  if(p.status==='bozza')bits.push(chip('Bozza','warn'));
  if(p.status==='archiviato')bits.push(chip('Archiviato'));
  if(p.closes_at&&p.status==='aperto')bits.push(chip('Chiude '+esc(dShort(p.closes_at)),'warn'));
  if(p.xp>0)bits.push(chip('+'+p.xp+' XP','warn'));
  if(p.typ==='multipla')bits.push(chip('Massimo '+p.max_choices));
  if(p.allow_add)bits.push(chip('I soci possono aggiungere opzioni'));
  return`<div class="psmeta chips">${bits.join('')}</div>`;
}
function byline(p){
  const a=[];
  if(p.status!=='bozza')a.push((p.n_voted||0)+' / '+(p.n_members||0)+' soci');
  if(p.closes_at&&p.status==='aperto')a.push('chiude '+dShort(p.closes_at));
  if(p.closed_at&&p.status!=='aperto')a.push('chiuso '+dShort(p.closed_at));
  if(p.voted)a.push(T.già);
  if(p.anonymous)a.push('anonimo');
  return a.filter(Boolean).join(' · ');
}

function listHtml(){
  const st=PS.staffUi(), all=PS.d&&PS.d.polls||[];
  const aperti=all.filter(p=>p.status==='aperto'), altri=all.filter(p=>p.status!=='aperto');
  const vis=PS.fil==='aperti'?aperti:PS.fil==='chiusi'?altri:all.filter(p=>p.status==='aperto'||PS.fil==='tutto');
  const apertiVis=vis.filter(p=>p.status==='aperto');
  const chiusiVis=vis.filter(p=>p.status!=='aperto');
  const notices=(PS.d&&PS.d.notices||[]).map(n=>`<div class="psnotice">${n.kind==='promemoria'?esc(T.promo(n.title)):esc(T.uscita(n.title))}</div>`).join('');
  const card=p=>{
    const o=PS.open.has(p.id);
    return`<div class="card${p.pinned&&p.status==='aperto'?' pin':''}" data-ps="${esc(p.id)}">
      <div class="sdrow" data-psx="${esc(p.id)}" role="button" tabindex="0" aria-expanded="${o}">
        <div class="t"><b>${esc(p.title)}</b><div class="chips">${p.pinned&&p.status==='aperto'?chip('📌 Fissato','pinchip'):''}${chip(esc(labTipo(p.typ)))}${p.anonymous?chip('Anonimo'):chip('Nominativo','ok')}${p.xp>0?chip('+'+p.xp+' XP','warn'):''}${p.status==='aperto'?chip('Aperto','ok'):p.status==='bozza'?chip('Bozza','warn'):chip(p.status==='archiviato'?'Archiviato':'Chiuso')}</div>
        <div class="cmby">${esc(byline(p))}</div></div>${arr(o)}</div>
      ${o?detailHtml(p):''}
    </div>`;
  };
  const sec=(k,lab,l)=>{if(!l.length)return'';const op=PS.open.has(k);return`<div class="card cmarr"><div class="lr sdrow" data-psx="${k}" role="button" tabindex="0" aria-expanded="${op}"><span class="t"><b>${lab} (${l.length})</b></span>${arr(op)}</div>${op?l.map(card).join(''):''}</div>`};
  return`<section id="sondaggi" class="cm">${notices}
    <div class="cmth"><h3>${T.tit} <button type="button" class="cmi" id="psinfo" aria-label="${T.infoL}" aria-expanded="${!!PS.info}">ⓘ</button></h3>
      <label class="cmdd"><span class="sr">${T.mostra}</span><select id="psfil" aria-label="${T.mostra}">
        <option value="tutto"${PS.fil==='tutto'?' selected':''}>${T.mostra}: ${T.tutto}</option>
        <option value="aperti"${PS.fil==='aperti'?' selected':''}>${T.mostra}: ${T.aperti}</option>
        <option value="chiusi"${PS.fil==='chiusi'?' selected':''}>${T.mostra}: ${T.chiusi}</option>
      </select></label>
      ${st&&all.length?`<button type="button" class="cmprop" id="psnew">${T.nuovo}</button>`:''}
    </div>
    ${PS.info?`<div class="cmhelp">${T.info}</div>`:''}
    ${st?`<p class="cmhelp">${T.gestH}</p>`:''}
    <div id="psl">${PS.err&&!PS.d?`<div class="card" id="pserr"><p><b>${T.errLoad}</b></p><p class="muted">${esc(PS.err)}</p></div>`:(apertiVis.length?apertiVis.map(card).join(''):((chiusiVis.length&&PS.fil!=='chiusi')?'':(st&&!all.length?`<div class="card" id="psempty"><p><b>${T.vuoto}</b></p><p class="muted">${T.vuotoH}</p><button type="button" class="p" id="pscrea">${T.creaBtn}</button></div>`:`<div class="card muted">${all.length?T.nessuno:T.vuoto}</div>`)))}</div>
    ${sec('chiusi',T.chiusiLab,chiusiVis)}
  </section>`;
}

function detailHtml(p){
  const st=PS.staffUi();
  if(p.status==='aperto'&&!p.voted)return`<div class="cmdet">${voteHtml(p,true)}</div>`;
  if(p.can_see)return resultsHtml(p,true)+ (st?staffBtns(p):'');
  return`<div class="cmdet"><p class="muted">${p.voted? (p.results_vis==='chiusura'?'Hai già votato. I risultati si vedono alla chiusura.':'Hai già votato.'):'I risultati si vedono dopo il voto o alla chiusura.'}</p>${st?staffBtns(p):''}</div>`;
}

function voteHtml(p,inner){
  const opts=p.options||[];
  let body='';
  if(p.typ==='singola'||p.typ==='gioco'){
    body=opts.map(o=>`<div class="sopt" data-pso="${esc(o.id)}" role="button" tabindex="0"><span class="${p.typ==='gioco'?'':''}">${p.typ==='gioco'?cover(o):'<span class="sdot"></span>'}</span><span class="lab">${esc(o.label)}${p.typ==='gioco'&&(o.game_id||o.bgg_id)?`<span class="cmby">${o.game_id?'Nel catalogo dell’app':'BoardGameGeek'}</span>`:''}</span>${p.typ==='gioco'?'<span class="sdot"></span>':''}</div>`).join('');
    if(p.typ==='gioco'&&(p.allow_add||PS.staffUi()))body+=`<div class="gadd"><input id="psq" placeholder="Cerca nel catalogo o su BGG" maxlength="60" autocomplete="off"><div id="psr"></div></div>`;
  }else if(p.typ==='multipla'){
    body=opts.map(o=>`<div class="sopt" data-pso="${esc(o.id)}" role="button" tabindex="0"><span class="sbox"></span><span class="lab">${esc(o.label)}</span></div>`).join('')+`<p class="muted" id="psmax">${esc(T.max(0,p.max_choices).replace('0 di', '0 di'))}</p>`;
  }else if(p.typ==='date'){
    body=opts.map(o=>`<div class="drow" data-pso="${esc(o.id)}"><div class="when">${esc(o.label)}</div><div class="dyn"><button type="button" data-dv="si" class="yes">Sì</button><button type="button" data-dv="forse" class="maybe">Forse</button><button type="button" data-dv="no" class="no">No</button></div></div>`).join('');
  }else if(p.typ==='voto'){
    body=`<p style="font-weight:800;color:var(--b);margin:8px 0 4px">Valutazione complessiva</p><div class="vgrid">${[1,2,3,4,5].map(i=>`<button type="button" class="vb" data-pvn="${i}">${i}</button>`).join('')}</div>
      <label>Un commento (facoltativo)</label><textarea id="pscom" rows="2" maxlength="200" placeholder="Cosa hai apprezzato o cosa miglioreresti"></textarea>`;
  }else if(p.typ==='classifica'){
    body=`<div id="psrk">${opts.map((o,i)=>rkRow(i+1,o,i===0,i===opts.length-1)).join('')}</div>`;
  }
  const btn=p.typ==='date'?T.salvaDisp:p.typ==='classifica'?T.salvaCl:T.invia;
  const help=p.help?`<p class="muted" style="margin-top:-6px">${esc(p.help)}</p>`:'';
  const wrap=`${inner?'':'<button type="button" class="psbk" id="psback">'+T.indietro+'</button>'}
    <div class="${inner?'':'card'}" data-psv="${esc(p.id)}">${inner?help:`<h2 style="margin-top:0">${esc(p.title)}</h2>${help}${meta(p)}`}
    <div class="optlist">${body}</div>
    ${p.anonymous?`<p class="muted">${T.noCambia}</p>`:`<p class="muted">${T.cambia}</p>`}
    <button type="button" class="p" id="psinvia">${btn}</button></div>`;
  return wrap;
}
function rkRow(n,o,first,last){
  return`<div class="rk" data-pso="${esc(o.id)}"><span class="handle" aria-hidden="true">☰</span><span class="n">${n}</span><span class="t">${esc(o.label)}</span><span class="mv"><button type="button" data-mv="-1" ${first?'disabled':''} aria-label="Su">▲</button><button type="button" data-mv="1" ${last?'disabled':''} aria-label="Giù">▼</button></span></div>`;
}

function resultsHtml(p,inner){
  const opts=p.options||[], tot=p.totals||{}, names=p.names||{};
  let bars='';
  if(p.typ==='singola'||p.typ==='gioco'||p.typ==='multipla'||p.typ==='classifica'){
    const scored=opts.map(o=>{
      const c=p.typ==='classifica'?(tot[o.id]||0):(tot[o.id]||tot[String(o.id)]||0);
      return{o,c};
    }).sort((a,b)=>b.c-a.c);
    const max=Math.max(1,...scored.map(x=>x.c));
    bars=scored.map((x,i)=>{
      const pct=Math.round(x.c/max*100);
      return`<div class="rbar"><div><div class="nm">${i===0&&x.c?'🏆 ':''}${esc(x.o.label)}</div><div class="rtrack"><i style="width:${pct}%"></i></div></div><div class="pct">${x.c}</div></div>`;
    }).join('');
  }else if(p.typ==='date'){
    bars=opts.map(o=>{
      const m=tot[o.id]||tot[String(o.id)]||{};
      return`<div class="drow"><div class="when">${esc(o.label)}</div><div class="muted">Sì ${m.si||0} · Forse ${m.forse||0} · No ${m.no||0}</div></div>`;
    }).join('');
  }else if(p.typ==='voto'){
    const dist=tot.dist||{};
    bars=`<p class="part">Media ${tot.media!=null?String(tot.media).replace('.',','):'—'} su 5 · ${tot.n||0} voti</p>`+
      [1,2,3,4,5].map(i=>{const c=+dist[i]||+dist[String(i)]||0;const max=Math.max(1,tot.n||1);return`<div class="rbar"><div><div class="nm">${i}</div><div class="rtrack"><i style="width:${Math.round(c/max*100)}%"></i></div></div><div class="pct">${c}</div></div>`}).join('');
  }
  const who=!p.anonymous&&names&&(p.typ==='singola'||p.typ==='gioco')?`<details class="acc"><summary><b>Chi ha votato cosa</b></summary>${
    opts.map(o=>{const ids=names[o.id]||names[String(o.id)]||[];const ms=ids.map(id=>nameOf(id)).filter(Boolean);return ms.length?`<div class="who">${esc(o.label)} — ${ms.map(esc).join(', ')}</div>`:''}).join('')
  }<p class="muted">Nei sondaggi anonimi questa sezione non esiste: si vede solo il totale.</p></details>`:'';
  let link='';
  if(PS.staffUi()&&p.typ==='gioco'&&p.status!=='aperto'&&opts.length){
    const top=(opts.slice().sort((a,b)=>(tot[b.id]||0)-(tot[a.id]||0))[0]);
    link=`<div class="card" style="box-shadow:none;border:1px solid #e7ecf7;margin:12px 0 0;padding:12px"><b>${T.collega}</b><p class="muted" style="margin:4px 0 8px">${T.collegaH}</p><button type="button" class="s" style="width:100%" data-pslink="${esc(p.id)}" data-psopt="${esc(top.id)}">${esc(T.proponi(top.label))}</button></div>`;
  }
  return`${inner?'':'<button type="button" class="psbk" id="psback">'+T.indietro+'</button>'}
    <div class="${inner?'cmdet':'card'}">${inner?(p.can_see?'':'<p class="part muted">Risultati non ancora visibili</p>'):`<h2 style="margin-top:0">${esc(p.title)}</h2>
    <p class="part muted">${esc(byline(p))}${p.can_see?'':' · risultati non ancora visibili'}</p>`}
    ${bars}${who}${link}</div>`;
}
function nameOf(id){
  try{const ms=PS._ms||[];const m=ms.find(x=>x.id===id);return m?memberName(m):'Socio'}catch(_){return'Socio'}
}
function staffBtns(p){
  if(!PS.staffUi())return'';
  const b=[];
  if(p.status==='bozza'||p.status==='aperto')b.push(`<button type="button" class="s" data-psed="${esc(p.id)}">✏️ Modifica</button>`);
  if(p.can_see)b.push(`<button type="button" class="s" data-psres="${esc(p.id)}">📊 Risultati</button>`);
  if(p.status==='bozza')b.push(`<button type="button" class="s" data-psact="apri" data-psid="${esc(p.id)}">🗳️ Apri</button>`);
  if(p.status==='aperto')b.push(`<button type="button" class="s" data-psact="chiudi" data-psid="${esc(p.id)}">🔒 Chiudi ora</button>`);
  if(p.status==='aperto'||p.status==='chiuso')b.push(`<button type="button" class="s" data-psact="archivia" data-psid="${esc(p.id)}">🗄️ Archivia</button>`);
  b.push(`<button type="button" class="s danger" data-psact="elimina" data-psid="${esc(p.id)}">🗑️ Elimina</button>`);
  return`<div class="staffbtns">${b.join('')}</div>`;
}

function formHtml(edit){
  const p=edit||{typ:'singola',results_vis:'dopo_voto',anonymous:false,allow_add:false,pinned:false,notify_on:true,remind_hours:24,xp:0,max_choices:2,options:[{label:''},{label:''}]};
  const typ=PS.formTyp||p.typ||'singola';
  const sw=(k,on,lab,hl)=>`<div class="tg"><b>${lab}${hl?`<span class="hl">${hl}</span>`:''}</b><button type="button" class="sw${on?' on':''}" data-psw="${k}" aria-pressed="${on}"></button></div>`;
  const opts=p.options&&p.options.length?p.options:[{label:''},{label:''}];
  return`<button type="button" class="psbk" id="psback">← Sondaggi</button>
  <div class="card" id="psform" data-psid="${esc(p.id||'')}">
    <h2 style="margin-top:0">${p.id?'Modifica sondaggio':T.crea}</h2>
    <p class="muted" style="margin-top:-6px">${T.creaH}</p>
    <label>Titolo</label><input id="pstitle" maxlength="80" value="${esc(p.title||'')}">
    <label>Testo di aiuto (facoltativo)</label><input id="pshelp" maxlength="280" value="${esc(p.help||'')}">
    <label>Tipo</label>
    <div class="types" id="pstypi">${TIPI.map(([k,n,s])=>`<button type="button" class="type${k===typ?' on':''}" data-pst="${k}"><b>${n}</b><small>${s}</small></button>`).join('')}</div>
    ${typ==='voto'?'':`<label>Opzioni</label><div id="psopts">${opts.map((o,i)=>`<input type="text" maxlength="80" placeholder="Opzione ${i+1}" value="${esc(o.label||'')}" data-gid="${esc(o.game_id||'')}" data-bgg="${o.bgg_id||''}" data-thumb="${esc(o.thumb||'')}">`).join('')}</div>
      <button type="button" class="s" id="psaddopt" style="width:100%">➕ Aggiungi un’opzione</button>`}
    ${typ==='multipla'?`<label>Massimo di scelte</label><input id="psmaxc" type="number" min="1" max="8" value="${+p.max_choices||2}">`:''}
    <label>Scadenza (facoltativa)</label><input id="pschiude" type="datetime-local" value="${p.closes_at?esc(toLocal(p.closes_at)):''}">
    <p class="muted" style="margin:4px 0 0">Alla scadenza il sondaggio si chiude da solo. Lascia vuoto se lo chiudi tu.</p>
    <label>Risultati visibili</label>
    <select id="psvis">
      <option value="subito"${p.results_vis==='subito'?' selected':''}>Subito, anche prima di votare</option>
      <option value="dopo_voto"${p.results_vis!=='subito'&&p.results_vis!=='chiusura'?' selected':''}>Dopo che ho votato</option>
      <option value="chiusura"${p.results_vis==='chiusura'?' selected':''}>Solo alla chiusura</option>
    </select>
    ${sw('anonymous',!p.anonymous,'Voto nominativo','Si vede chi ha scelto cosa. Disattiva per un voto davvero anonimo.')}
    ${sw('allow_add',!!p.allow_add,'I soci possono aggiungere opzioni','Utile per «Scegli il gioco» o elenchi aperti.')}
    ${sw('pinned',!!p.pinned,'Fissa in alto nella lista')}
    ${sw('notify_on',p.notify_on!==false,'Avvisa all’uscita e prima della chiusura','Notifica in app quando esce e un promemoria vicino alla scadenza.')}
    <label>Promemoria (ore prima della chiusura, 0 = nessuno)</label><input id="psrem" type="number" min="0" max="168" value="${p.remind_hours==null?24:p.remind_hours}">
    ${sw('xpOn',(+p.xp||0)>0||!!p.badge_name,'Riconoscimento per chi partecipa','Si assegna una sola volta, al primo voto valido.')}
    <label>XP (0 = nessuno)</label><input id="psxp" type="number" min="0" max="50" value="${+p.xp||0}">
    <label>Badge (facoltativo): icona e nome</label>
    <div class="row"><input id="psbico" maxlength="16" placeholder="Icona" value="${esc(p.badge_icon||'')}"><input id="psbname" maxlength="40" placeholder="Nessun badge" value="${esc(p.badge_name||'')}"></div>
    <div class="staffbtns" style="margin-top:16px">
      <button type="button" class="p" id="pssalva">${p.id&&p.status==='aperto'?'Salva le modifiche':T.pubblica}</button>
      ${!p.id||p.status==='bozza'?`<button type="button" class="s" id="psbozza">Salva come bozza</button>`:''}
    </div>
  </div>`;
}
function toLocal(iso){try{const d=new Date(iso);if(!+d)return'';const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())}catch(_){return''}}

function nominativoOn(el){const b=el.querySelector('[data-psw="anonymous"]');return!(b&&!b.classList.contains('on'))}
// «Voto nominativo» toggle ON means anonymous=false. sw.on = featured/enabled.
// For anonymous, the label is "Voto nominativo" and ON means nominativo (anonymous false). Good.

PS.html=function(){
  if(PS.view==='form')return formHtml(PS.form);
  if(PS.view&&PS.view.page==='voto')return voteHtml(PS.view.p);
  if(PS.view&&PS.view.page==='risultati')return resultsHtml(PS.view.p);
  return listHtml();
};
PS.draw=async function(){
  const w=$('#psw');if(!w)return;
  if(!PS._ms)try{PS._ms=await DB.members()}catch(_){PS._ms=[]}
  w.innerHTML=PS.html();
  bind(w);
};

function collectVote(p,root){
  if(p.typ==='singola'||p.typ==='gioco'){
    const s=root.querySelector('.sopt.on');if(!s)return null;return{id:s.dataset.pso};
  }
  if(p.typ==='multipla'){
    const ids=[...root.querySelectorAll('.sopt.on')].map(x=>x.dataset.pso);if(!ids.length)return null;return{ids};
  }
  if(p.typ==='date'){
    const map={};let ok=true;
    root.querySelectorAll('.drow').forEach(r=>{const v=r.dataset.val;if(!v)ok=false;else map[r.dataset.pso]=v});
    return ok?{map}:null;
  }
  if(p.typ==='voto'){
    const n=root.querySelector('.vb.on');if(!n)return null;
    const c=(root.querySelector('#pscom')||{}).value||'';
    const o={n:+n.dataset.pvn};if(c.trim())o.commento=c.trim().slice(0,200);return o;
  }
  if(p.typ==='classifica'){
    return{ord:[...root.querySelectorAll('#psrk .rk')].map(x=>x.dataset.pso)};
  }
  return null;
}

function bind(w){
  w.onclick=async ev=>{
    const t=ev.target;
    if(t.closest('#psinfo')){PS.info=!PS.info;return PS.draw()}
    if(t.closest('#psnew,#pscrea')){PS.form={typ:'singola',results_vis:'dopo_voto',notify_on:true,remind_hours:24,xp:0,max_choices:2,options:[{label:''},{label:''}]};PS.formTyp='singola';PS.view='form';return PS.draw()}
    if(t.closest('#psback')){PS.view=null;PS.form=null;return PS.draw()}
    const typb=t.closest('[data-pst]');
    if(typb&&$('#psform')){PS.formTyp=typb.dataset.pst;const cur=readForm();PS.form=Object.assign(PS.form||{},cur,{typ:PS.formTyp});return PS.draw()}
    if(t.closest('#psaddopt')){const box=$('#psopts');if(!box||box.children.length>=24)return;const i=document.createElement('input');i.type='text';i.maxLength=80;i.placeholder='Opzione '+(box.children.length+1);box.append(i);return}
    const sw=t.closest('[data-psw]');
    if(sw){sw.classList.toggle('on');sw.setAttribute('aria-pressed',sw.classList.contains('on'));return}
    if(t.closest('#pssalva'))return saveForm(t.closest('#pssalva'),false);
    if(t.closest('#psbozza'))return saveForm(t.closest('#psbozza'),true);
    const row=t.closest('[data-psx]');
    if(row&&!t.closest('button,select,input,textarea,a')){
      const k=row.dataset.psx;PS.open.has(k)?PS.open.delete(k):PS.open.add(k);return PS.draw();
    }
    const opt=t.closest('[data-pso]');
    const box=t.closest('[data-psv],.cmdet');
    const pollId=box&&(box.dataset.psv|| (t.closest('[data-ps]')||{}).dataset.ps);
    const p=findP(pollId)||(PS.view&&PS.view.p);
    if(opt&&p&&(p.typ==='singola'||p.typ==='gioco')){
      box.querySelectorAll('.sopt').forEach(x=>x.classList.toggle('on',x===opt));return;
    }
    if(opt&&p&&p.typ==='multipla'){
      const on=opt.classList.contains('on');
      if(!on&&box.querySelectorAll('.sopt.on').length>=(p.max_choices||2)){toast('Puoi indicare al massimo '+(p.max_choices||2)+' scelte.');return}
      opt.classList.toggle('on');
      const u=box.querySelectorAll('.sopt.on').length,m=box.querySelector('#psmax');if(m)m.textContent=u+' di '+(p.max_choices||2)+' scelte usate.';
      return;
    }
    const dv=t.closest('[data-dv]');
    if(dv){const r=dv.closest('.drow');r.dataset.val=dv.dataset.dv;r.querySelectorAll('[data-dv]').forEach(b=>b.classList.toggle('on',b===dv));return}
    const vn=t.closest('[data-pvn]');
    if(vn){w.querySelectorAll('.vb').forEach(b=>b.classList.toggle('on',b===vn));return}
    const mv=t.closest('[data-mv]');
    if(mv){const row=mv.closest('.rk'),dir=+mv.dataset.mv,sib=dir<0?row.previousElementSibling:row.nextElementSibling;if(!sib)return;if(dir<0)row.parentNode.insertBefore(row,sib);else row.parentNode.insertBefore(sib,row);renumber(row.parentNode);return}
    if(t.closest('#psinvia'))return sendVote(t.closest('#psinvia'),p);
    const act=t.closest('[data-psact]');
    if(act)return doAct(act);
    const ed=t.closest('[data-psed]');
    if(ed){const q=findP(ed.dataset.psed);if(!q)return;PS.form=JSON.parse(JSON.stringify(q));PS.formTyp=q.typ;PS.view='form';return PS.draw()}
    const rs=t.closest('[data-psres]');
    if(rs){const q=findP(rs.dataset.psres);if(!q)return;PS.view={page:'risultati',p:q};return PS.draw()}
    const lk=t.closest('[data-pslink]');
    if(lk)return linkDes(lk);
  };
  const fil=$('#psfil');if(fil)fil.onchange=()=>{PS.fil=fil.value||'tutto';PS.draw()};
  const q=$('#psq');
  if(q){let tm;q.oninput=()=>{clearTimeout(tm);const s=q.value.trim();const box=$('#psr');if(!box)return;if(s.length<2){box.innerHTML='';return}tm=setTimeout(()=>cercaGioco(s,box,q),250)}}
}
function renumber(box){const rows=[...box.querySelectorAll('.rk')];rows.forEach((r,i)=>{r.querySelector('.n').textContent=i+1;const btns=r.querySelectorAll('[data-mv]');if(btns[0])btns[0].disabled=i===0;if(btns[1])btns[1].disabled=i===rows.length-1})}
function findP(id){return(PS.d&&PS.d.polls||[]).find(x=>x.id===id)}

async function doAct(btn){
  const id=btn.dataset.psid,a=btn.dataset.psact;
  const msg={apri:'Pubblicare ora questo sondaggio?',chiudi:'Chiudere ora il sondaggio?',archivia:'Archiviare questo sondaggio?',elimina:'Eliminare definitivamente il sondaggio e i voti?'};
  if(!confirm(msg[a]||'Confermi?'))return;
  btn.disabled=true;
  try{await PS.rpc('poll_azione',{p_id:id,p_azione:a});toast(a==='elimina'?'Eliminato':a==='apri'?'Sondaggio aperto':a==='chiudi'?'Sondaggio chiuso':'Archiviato');await PS.load();PS.view=null;await PS.draw();if(window.CM413&&CM413.refreshTabs)CM413.refreshTabs()}
  catch(e){toastErr(e,'SOND')}finally{btn.disabled=false}
}
async function sendVote(btn,p){
  if(!p)return;const root=btn.closest('[data-psv],.cmdet,section')||document;
  const ch=collectVote(p,root);if(!ch)return toastVal('Completa il voto prima di inviare','E-SOND-V1');
  if(!PS.d||!PS.d.me)return toastVal(T.noAcc,'E-SOND-V2');
  btn.disabled=true;
  try{
    const r=await PS.rpc('poll_vota',{p_id:p.id,p_choices:ch});
    toast(r&&r.xp?`Grazie per aver partecipato · +${r.xp} XP`:'Grazie per aver partecipato');
    if(typeof XP!=='undefined'&&XP.refresh)try{await XP.refresh()}catch(_){}
    await PS.load();PS.view=null;PS.open.add(p.id);await PS.draw();
  }catch(e){toastErr(e,'SOND')}finally{btn.disabled=false}
}
async function linkDes(btn){
  if(!confirm('Creare una proposta nella Lista desideri da questa opzione?'))return;
  btn.disabled=true;
  try{await PS.rpc('poll_collega_desideri',{p_id:btn.dataset.pslink,p_option:btn.dataset.psopt});toast('Proposta creata nella Lista desideri');if(typeof DS!=='undefined'&&DS.load)await DS.load();await PS.load();await PS.draw()}
  catch(e){toastErr(e,'SOND')}finally{btn.disabled=false}
}
function readForm(){
  const f=$('#psform');if(!f)return{};
  const sw=k=>{const b=f.querySelector(`[data-psw="${k}"]`);return!!(b&&b.classList.contains('on'))};
  const opts=[...document.querySelectorAll('#psopts input')].map(i=>({label:i.value,game_id:i.dataset.gid||'',bgg_id:i.dataset.bgg||undefined,thumb:i.dataset.thumb||''})).filter(o=>o.label.trim());
  return{
    id:f.dataset.psid||undefined,title:$('#pstitle')&&$('#pstitle').value,help:$('#pshelp')&&$('#pshelp').value,
    typ:PS.formTyp||'singola',results_vis:$('#psvis')&&$('#psvis').value,
    anonymous:!sw('anonymous'),allow_add:sw('allow_add'),pinned:sw('pinned'),notify_on:sw('notify_on'),
    remind_hours:$('#psrem')&&$('#psrem').value,xp:$('#psxp')&&$('#psxp').value,max_choices:$('#psmaxc')&&$('#psmaxc').value,
    badge_icon:$('#psbico')&&$('#psbico').value,badge_name:$('#psbname')&&$('#psbname').value,
    closes_at:$('#pschiude')&&$('#pschiude').value?new Date($('#pschiude').value).toISOString():null,
    options:opts
  };
}
async function saveForm(btn,asDraft){
  const p=readForm();
  if(!p.title||!p.title.trim())return toastVal('Scrivi un titolo','E-SOND-V3');
  if(p.typ!=='voto'&&(!p.options||p.options.length<2))return toastVal('Aggiungi almeno due opzioni','E-SOND-V4');
  btn.disabled=true;
  try{
    const id=await PS.rpc('poll_salva',{p});
    const publish=!asDraft&&(!p.id||p.status==='bozza');
    if(publish){await PS.rpc('poll_azione',{p_id:id||p.id,p_azione:'apri'});toast('Sondaggio pubblicato')}
    else toast(asDraft||p.status==='bozza'?'Bozza salvata':'Modifiche salvate');
    await PS.load();PS.view=null;PS.form=null;await PS.draw();if(window.CM413&&CM413.refreshTabs)CM413.refreshTabs();
  }catch(e){toastErr(e,'SOND')}finally{btn.disabled=false}
}
async function cercaGioco(s,box,q){
  box.innerHTML='<p class="muted">Cerco…</p>';
  try{
    const gs=(typeof DB!=='undefined'&&DB.games)?await DB.games():[];
    const loc=gs.filter(g=>(g.name||'').toLowerCase().includes(s.toLowerCase())).slice(0,6);
    let html=loc.map(g=>`<div class="rec" data-psg="${esc(g.id)}" data-psn="${esc(g.name)}" data-psth="${esc(g.thumb||g.image||'')}" data-psb="${g.bggId||g.bgg_id||''}"><b>${esc(g.name)}</b> <span class="muted">catalogo dell’app</span></div>`).join('');
    if(typeof DS!=='undefined'&&DS.bgg&&s.length>=2){
      try{const r=await DS.bgg({mode:'cerca',q:s});const items=(r&&r.items)||r||[];
        html+= (Array.isArray(items)?items:[]).slice(0,6).map(g=>`<div class="rec" data-psbgg="${esc(g.bgg_id||g.id)}" data-psn="${esc(g.nome||g.name)}" data-psth="${esc(g.thumb||'')}"><b>${esc(g.nome||g.name)}</b> <span class="muted">BoardGameGeek</span></div>`).join('');
      }catch(_){}}
    if(q.value.trim()!==s)return;
    box.innerHTML=html||'<p class="muted">Nessun gioco trovato.</p>';
    box.onclick=ev=>{
      const r=ev.target.closest('[data-psg],[data-psbgg]');if(!r)return;
      const lab=r.dataset.psn,id=crypto.randomUUID?crypto.randomUUID():('o'+Math.random().toString(36).slice(2,10));
      const root=document.querySelector('[data-psv] .optlist, #psopts');
      // add as option on open poll
      const p=PS.view&&PS.view.p||findP((document.querySelector('[data-psv]')||{}).dataset.psv);
      if(p&&p.allow_add){
        PS.rpc('poll_aggiungi_opzione',{p_id:p.id,p:{label:lab,game_id:r.dataset.psg||'',bgg_id:r.dataset.psbgg||r.dataset.psb||undefined,thumb:r.dataset.psth||''}}).then(async()=>{await PS.load();const q2=findP(p.id);if(q2){if(PS.view)PS.view.p=q2;await PS.draw()}}).catch(e=>toastErr(e,'SOND'));
      }
    };
  }catch(e){box.innerHTML='<p class="muted">Ricerca non disponibile.</p>'}
}

// badge hook
if(typeof Badges!=='undefined'){const _l=Badges.list.bind(Badges);Badges.list=function(key,ctx){const base=_l(key,ctx);const id=String(key||'').startsWith('m:')?String(key).slice(2):'';const mine=(PS.d&&PS.d.me===id&&PS.d.badges)||[];mine.forEach(b=>{if(!base.some(x=>x.id==='ps:'+b.poll_id))base.push({id:'ps:'+b.poll_id,icon:b.icon,name:b.name,desc:'Hai partecipato a un sondaggio',on:true,goal:1,cur:1})});return base}}

window.PS=PS;
})();
