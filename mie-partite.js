// Anteprima — «Le mie partite»: elenco completo dal Profilo, righe ▸/▾, filtri, caricamento progressivo.
(function(){
const T={titolo:'Le mie partite',tutto:'Tutto',periodo:'Periodo',tipo:'Tipo',
  vuoto:'Ancora nessuna partita.',vuotoFiltro:'Nessuna partita in questo filtro.',
  altre:'Carica altre',indietro:'← Indietro',xp:'EXP',note:'Note',giocatori:'Giocatori',
  punteggio:'Punteggio',esito:'Esito',durata:'Durata',data:'Data',gioco:'Gioco',
  personaggio:'Personaggio',master:'Master',avventura:'Avventura',sessione:'Sessione',
  tu:'tu',ospite:'Ospite',vittoria:'🏆 Vittoria',sconfitta:'Sconfitta',
  mese:'Ultimo mese',mesi3:'Ultimi 3 mesi',anno:'Anno corrente',sfida:'Sfida'};
const PAGE=20;
const PERIODS=[['all',T.tutto],['1m',T.mese],['3m',T.mesi3],['y',T.anno]];
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
const keyAct=(r,f)=>{r.tabIndex=0;r.setAttribute('role','button');r.onclick=f;r.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}}};

function periodRange(k,today){
  const t=today||((typeof romeToday==='function')?romeToday():new Date().toISOString().slice(0,10));
  if(k==='1m'||k==='3m'){const d=new Date(t+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()-(k==='1m'?1:3));return[d.toISOString().slice(0,10),t]}
  if(k==='y')return[t.slice(0,4)+'-01-01',t];
  return null;
}
function playTypeId(p){
  if(p&&(p.typeId||p.type_id))return p.typeId||p.type_id;
  if(typeof isGdrPlay==='function'&&isGdrPlay(p))return 'gdr';
  return (p&&(p.playKind||p.play_kind))||'board';
}
function playName(gs,p){
  if(typeof TT!=='undefined'&&TT.label){const lab=TT.label(p,gs||[]);if(lab&&lab.name)return lab.name}
  if(p&&p.gameName)return p.gameName;
  if(typeof gname==='function')return gname(gs||[],p&&p.gameId);
  return 'Partita';
}
function filterPlays(plays,meId,period,type,today){
  const mine=(plays||[]).filter(p=>(p.players||[]).some(x=>x.memberId===meId));
  const r=periodRange(period,today);
  return mine.filter(p=>{
    const d=String(p.date||'').slice(0,10);
    if(r&&(d<r[0]||d>r[1]))return false;
    if(type&&type!=='all'&&playTypeId(p)!==type)return false;
    return true;
  }).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.id||'').localeCompare(String(a.id||'')));
}
function playXp(p,meId,allAsc){
  const parts=[{l:'Partita',n:10}];
  const me=(p.players||[]).find(x=>x.memberId===meId)||{};
  if(!(typeof isGdrPlay==='function'&&isGdrPlay(p))&&me.winner)parts.push({l:'Vittoria',n:5});
  if(p.sfidaId||p.sfida_id){parts.push({l:'Sfida',n:10});if(me.winner)parts.push({l:'Sfida vinta',n:5})}
  if(p.gameId&&typeof isBoardGamePlay==='function'&&isBoardGamePlay(p)){
    const first=(allAsc||[]).find(x=>x.gameId===p.gameId&&(x.players||[]).some(z=>z.memberId===meId));
    if(first&&first.id===p.id)parts.push({l:'Gioco nuovo',n:10});
  }
  return{total:parts.reduce((s,x)=>s+x.n,0),parts};
}
function esitoMine(p,me){
  if(typeof isGdrPlay==='function'&&isGdrPlay(p)){
    const g=p.gdr||{};
    if(g.esito==='conclusa')return 'Avventura conclusa';
    if(g.esito==='in_corso')return 'In corso';
    return '';
  }
  if(p.coop)return p.groupWin?T.vittoria:T.sconfitta;
  return me.winner?T.vittoria:'';
}
function playerLabel(x,ms){
  if(x.memberId){const m=(ms||[]).find(y=>y.id===x.memberId);return m?(typeof memberName==='function'?memberName(m):(m.nome||'Socio')):'Socio'}
  return x.name||T.ospite;
}

function mineLink(V){
  if(!V||window._pv)return;
  if(V.querySelector('#pfmyp'))return;
  const hist=V.querySelector('#pfhist');if(!hist)return;
  const card=el('div','card pfl');card.id='pfmyp';
  const row=el('div','lr');row.id='pfmypgo';
  row.append(el('span','ic','🎲'),el('span','t'));
  row.querySelector('.t').append(el('b',null,T.titolo));
  const a=el('span','ar','▸');a.setAttribute('aria-hidden','true');row.append(a);
  keyAct(row,()=>go('miepartite'));
  card.append(row);
  hist.after(card);
}

function line(lab,val){
  if(val==null||val==='')return null;
  const r=el('div','mpdl');r.append(el('span','muted',lab),el('b',null,String(val)));return r;
}

function renderDetails(box,p,gs,ms,meId,allAsc){
  box.replaceChildren();
  const me=(p.players||[]).find(x=>x.memberId===meId)||{};
  const gdr=p.gdr||{};
  const add=(lab,val)=>{const r=line(lab,val);if(r)box.append(r)};
  add(T.gioco,playName(gs,p));
  const dt=(typeof fmt==='function'?fmt(p.date):p.date)+((typeof dayName==='function'&&p.date)?' · '+dayName(p.date):'');
  add(T.data,dt);
  if(typeof durOk==='function'&&durOk(p.duration))add(T.durata,durOk(p.duration)+' min');
  const typ=(typeof TT!=='undefined'&&TT.byId)?TT.byId(playTypeId(p)):null;
  if(typ&&typ.nome)add(T.tipo,((typ.icona||'')+' '+typ.nome).trim());
  if(p.versione)add((typeof TT!=='undefined'&&TT.t)?TT.t('versione'):'Versione',p.versione);
  const es=esitoMine(p,me);if(es)add(T.esito,es);
  if(me.score!=null&&me.score!=='')add(T.punteggio,String(me.score));
  const xp=playXp(p,meId,allAsc);
  add(T.xp,'+'+xp.total+(xp.parts.length?(' ('+xp.parts.map(x=>x.l+' +'+x.n).join(', ')+')'):''));
  if(p.sfidaId||p.sfida_id)add(T.sfida,T.sfida);
  if(typeof isGdrPlay==='function'&&isGdrPlay(p)){
    add((typeof TT!=='undefined'&&TT.t)?TT.t('sistema'):'Sistema',gdr.sistema||p.gameName||'');
    add(T.avventura,gdr.avventura||p.scenario||'');
    if(gdr.sessione==='campagna')add(T.sessione,'Campagna'+(gdr.sessione_n?(' · n° '+gdr.sessione_n):''));
    else if(gdr.sessione==='one-shot')add(T.sessione,'One-shot');
    if(gdr.esito_nota)add((typeof TT!=='undefined'&&TT.t)?TT.t('esito_nota'):"Nota sull'esito",gdr.esito_nota);
    if(me.character)add(T.personaggio,me.character);
    const mid=gdr.masterMemberId||gdr.master_member_id;
    const mname=mid?playerLabel({memberId:mid},ms):(gdr.masterName||'');
    if(mname)add(T.master,mname);
  }else if(p.scenario)add('Scenario',p.scenario);
  if(p.note)add(T.note,p.note);
  const plist=el('div','mpdl mppl');plist.append(el('span','muted',T.giocatori));
  const names=el('div','mpnames');
  (p.players||[]).forEach(x=>{
    const chip=el('span','mpn');
    const lab=playerLabel(x,ms)+(x.memberId===meId?(' ('+T.tu+')'):'');
    chip.append(el('span',null,lab));
    // Solo il proprio punteggio; gli altri soci restano nome (e personaggio GDR, che è della sessione)
    if(x.memberId===meId&&x.score!=null&&x.score!=='')chip.append(el('span','muted',' · '+String(x.score)));
    if(x.character&&x.memberId===meId)chip.append(el('span','muted',' · '+x.character));
    names.append(chip);
  });
  plist.append(names);box.append(plist);
}

function typeOptions(){
  const out=[{id:'all',nome:T.tutto}];
  if(typeof TT!=='undefined'&&TT.attivo){TT.attivo().forEach(x=>out.push({id:x.id,nome:((x.icona||'')+' '+x.nome).trim()}))}
  else{out.push({id:'board',nome:'🎲 Gioco da tavolo'},{id:'gdr',nome:'🐉 GDR'})}
  return out;
}

async function draw(){
  const V=document.getElementById('view');if(!V)return;
  const R=!!DB.remote&&DB.status==='online';
  if(!R){V.replaceChildren(el('h2',null,T.titolo),el('p','muted','Per vedere le tue partite serve la connessione.'));return}
  const u=await DB.remote.user();if(!u){if(typeof authForm==='function')return authForm();V.replaceChildren(el('h2',null,T.titolo),el('p','muted','Accedi per vedere le tue partite.'));return}
  const ms=await DB.members(),gs=await DB.games(),ps=await DB.plays();
  const me=ms.find(m=>m.userId===u.id);if(!me){V.replaceChildren(el('h2',null,T.titolo),el('p','muted','Account non collegato a un socio.'));return}
  const st=window._mp||{period:'all',type:'all',shown:PAGE};
  window._mp=st;
  const allAsc=filterPlays(ps,me.id,'all','all').slice().reverse();
  const list=filterPlays(ps,me.id,st.period,st.type);
  const shown=list.slice(0,st.shown);

  V.replaceChildren();
  const top=el('div','hrow');
  const bk=el('button','s','');bk.id='bk';bk.type='button';bk.textContent=T.indietro;bk.onclick=()=>{window._pv=null;go('profilo')};
  top.append(bk,el('h2',null,T.titolo));V.append(top);

  const filters=el('div','card mpfilters');
  const mkSel=(lab,id,opts,cur)=>{
    const w=el('label','mpsel');w.append(el('span',null,lab));
    const s=el('select');s.id=id;s.setAttribute('aria-label',lab);
    opts.forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;if(v===cur)o.selected=true;s.append(o)});
    w.append(s);return w;
  };
  filters.append(mkSel(T.periodo,'mpper',PERIODS,st.period));
  filters.append(mkSel(T.tipo,'mptipo',typeOptions().map(x=>[x.id,x.nome]),st.type));
  V.append(filters);
  $('#mpper').onchange=e=>{st.period=e.target.value;st.shown=PAGE;draw()};
  $('#mptipo').onchange=e=>{st.type=e.target.value;st.shown=PAGE;draw()};

  const box=el('div','card pfl mpbox');
  if(!list.length){box.append(el('p','muted',(ps||[]).some(p=>(p.players||[]).some(x=>x.memberId===me.id))?T.vuotoFiltro:T.vuoto));V.append(box);return}
  shown.forEach(p=>{
    const row=el('div','lr mprow');row.dataset.pid=p.id||'';
    const meP=(p.players||[]).find(x=>x.memberId===me.id)||{};
    const ic=el('span','ic','🎲');
    if(typeof isGdrPlay==='function'&&isGdrPlay(p))ic.textContent='🐉';
    else if(playTypeId(p)==='war'||playTypeId(p)==='warhammer')ic.textContent='⚔️';
    row.append(ic);
    const t=el('span','t');t.append(el('b',null,playName(gs,p)));
    const chips=el('span','pfcs');
    const dlab=(typeof fmt==='function'?fmt(p.date):p.date);
    chips.append(el('span','pfc','📅 '+dlab));
    const es=esitoMine(p,meP);if(es)chips.append(el('span','pfc'+(es===T.vittoria?' g':''),es));
    const xp=playXp(p,me.id,allAsc);chips.append(el('span','pfc y','+'+xp.total+' EXP'));
    t.append(chips);row.append(t);
    const ar=el('span','ar','▸');ar.setAttribute('aria-hidden','true');row.append(ar);
    const det=el('div','mpdet');det.hidden=true;
    row.setAttribute('aria-expanded','false');
    const tog=()=>{const op=det.hidden;if(op&&!det.dataset.ready){renderDetails(det,p,gs,ms,me.id,allAsc);det.dataset.ready='1'}det.hidden=!op;ar.textContent=op?'▾':'▸';row.setAttribute('aria-expanded',String(op))};
    keyAct(row,tog);
    box.append(row,det);
  });
  if(list.length>shown.length){
    const more=el('button','more','');more.type='button';
    const lab=el('span',null,T.altre+' ('+(list.length-shown.length)+')');
    const a=el('span','ar','▸');a.setAttribute('aria-hidden','true');
    more.append(lab,a);
    more.onclick=()=>{st.shown+=PAGE;draw()};
    box.append(more);
  }
  V.append(box);
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v==='profilo'));
}

views.miepartite=async()=>{try{await draw()}catch(e){console.warn('mie-partite',e);const V=document.getElementById('view');if(V){V.replaceChildren();const c=el('div','card');c.append(el('h3',null,'⚠️ Errore nel caricamento'),el('p','muted',e&&e.message||String(e)));V.append(c)}}};

const _pf=views.profilo;
views.profilo=async(...a)=>{await _pf(...a);try{const V=document.getElementById('view');if(V)mineLink(V)}catch(e){console.warn('mie-partite link',e)}};

window.MP={T,PAGE,periodRange,playTypeId,filterPlays,playXp,playName,esitoMine,mineLink};
})();
