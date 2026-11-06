// v41.6 — Altro (socio) / Gestione (staff), mockup approvati, 7 punti:
// 1 menu del socio: account, info, Instagram, «Accesso staff» in fondo · 2 «Strumenti avanzati» chiuso, rosato, in fondo
// 3 un unico elenco staff · 4 Soci: riepilogo + ricerca · 5 «Disattiva» dentro la scheda del socio
// 6 chip e titoli colorati, campi obbligatori con * · 7 versione = APP_VERSION.
// + «Statistiche complete (solo admin)» nel profilo degli altri soci con lo stile v41.3.
// Riordina il DOM di app.js: i pulsanti originali (con i loro controlli, validazioni ed escaping) restano quelli; il testo nuovo passa da textContent.
(function(){
const T={titSocio:'Altro',titStaff:'Gestione',account:'Il mio account',accCon:'Accesso con',accNo:'Non hai ancora fatto l\'accesso',accVai:'Accedi o registrati dal Profilo',
 esci:'Esci dall\'account',info:'Info sull\'associazione',ig:'Seguici su Instagram',staff:'Accesso staff',staffH:'Riservato ad admin e moderatori dell\'associazione.',
 strumenti:'Strumenti avanzati',strSub:'⚠️ Backup, importazione, dati del telefono',soci:'Soci',attivi:'attivi',cerca:'🔍 Cerca socio per nome o tessera',
 nuovo:'Nuovo socio',modifica:'Modifica socio',hint:'ⓘ L\'elenco dei soci compare dopo la ricerca.',nessuno:'Nessun socio trovato.',btnMod:'✏️ Modifica',
 tabs:{soci:['👥','Soci'],partite:['🎲','Partite'],account:['🔑','Codici'],mods:['🛡️','Moderatori']},
 btns:{ast:['📊','Statistiche associazione'],alib:['📚','Libri sociali','soci e volontari'],aant:['⚖️',null],acfg:['⚙️','Configurazione']},
 impTit:'Importa da BoardGameGeek',impSub:'File CSV/Excel o nome utente BGG',
 adm:'🔧 Statistiche complete',admChip:'solo admin',req:' *'};
let OPEN=null,Q='';window.AL416={T};
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
const arrow=o=>{const a=el('span','ar',o?'▾':'▸');a.setAttribute('aria-hidden','true');return a};
const act=(r,f)=>{r.tabIndex=0;r.setAttribute('role','button');r.onclick=e=>{if(e.target.closest('a,button,input,select,label')&&e.target.closest('.alr')!==e.target.closest('a,button,input,select,label'))return;f()};r.onkeydown=e=>{if(e.target===r&&(e.key==='Enter'||e.key===' ')){e.preventDefault();f()}}};
const kw=t=>el('span','alkw',t);
function row(ic,title,sub,o,cls){const r=el('div','alr'+(cls?' '+cls:''));r.append(el('span','ic',ic));const t=el('span','t');t.append(el('b',null,title));if(sub!=null){const s=el('span','sub');if(typeof sub==='string')s.textContent=sub;else s.append(sub);t.append(s)}r.append(t);if(o!==undefined)r.append(arrow(o));return r}
function sumRow(d,ic,title,sub){const s=el('summary','alr');s.append(el('span','ic',ic));const t=el('span','t');t.append(el('b',null,title));if(sub){const x=el('span','sub');if(typeof sub==='string')x.textContent=sub;else x.append(sub);t.append(x)}s.append(t);d.append(s);return s}
const req=(l)=>{if(l&&!l.querySelector('.req'))l.append(el('span','req',T.req))};
function infoCard(){const d=el('details','card alcard alinfo');const b=BRAND.v||BRAND_DEF;sumRow(d,'ℹ️',T.info,[b.nome?'Associazione '+b.nome:'',b.citta].filter(Boolean).join(' · '));
 const x=el('div','albox');x.append(el('div',null,`Associazione ${b.nome}${b.citta?', '+b.citta:''}`));
 if(b.email&&BRAND.MAIL.test(b.email)){const a=el('a','allink',b.email);a.href='mailto:'+encodeURIComponent(b.email).replace('%40','@');const r=el('div');r.append('✉️ ',a);x.append(r)}d.append(x);return d}
function foot(staff){const f=el('div','alfoot',`${(BRAND.v||BRAND_DEF).nome} · v${APP_VERSION}`);if(staff&&typeof IG!=='undefined'&&IG.url){f.append(' · ');const a=el('a','igx allink','📸 '+IG.tag);a.href=IG.url;a.target='_blank';a.rel='noopener noreferrer';f.append(a)}return f}
function clean(V){V.querySelectorAll(':scope>.card.muted,:scope>.igl').forEach(x=>x.remove());const h=V.querySelector(':scope>.hrow');if(h)h.hidden=true}
function title(V,t){let h=V.querySelector(':scope>h2.altit');if(!h){h=el('h2','altit');V.prepend(h)}h.textContent=t}
// 1 · «Il mio account» (con «Esci dall'account»: dalla v41.7 l'unico punto per uscire, anche per lo staff)
async function accRow(){let u=null;try{u=DB.remote&&DB.status==='online'?await DB.remote.user():null}catch(e){}
 if(u&&u.email){const d=el('details','alacc');const k=kw(String(u.email).split('@')[0].slice(0,18)+'@…');sumRow(d,'👤',T.account,(()=>{const s=document.createDocumentFragment();s.append(T.accCon+' ',k);return s})());
  const r=row('⎋',T.esci,null,false,'alsub');act(r,()=>confirmLogout());d.append(r);return d}
 const r=row('👤',T.account,T.accNo+' · '+T.accVai,false);act(r,()=>go('profilo'));return r}
// 1 · socio
async function socio(V){const A=V.querySelector('#adm');if(!A)return;clean(V);const bk=V.querySelector('#bkp');if(bk&&bk.hidden)bk.remove();title(V,T.titSocio);
 const m=el('div','card alcard almenu');m.append(await accRow());
 const inf=infoCard();inf.classList.remove('card','alcard');m.append(inf);
 if(typeof IG!=='undefined'&&IG.url){const a=el('a','alr igx');a.href=IG.url;a.target='_blank';a.rel='noopener noreferrer';a.append(el('span','ic','📸'));const t=el('span','t');t.append(el('b',null,T.ig));const s=el('span','sub');s.append(kw(IG.tag));t.append(s);a.append(t,arrow(false));m.append(a)}
 const st=el('details','card alcard alstaff');const s=sumRow(st,'🔒',T.staff);const i=el('span','ali','ⓘ');i.title=T.staffH;i.setAttribute('aria-label',T.staffH);s.querySelector('b').append(' ',i);
 st.append(el('p','alhint',T.staffH),A);A.classList.remove('card');A.querySelectorAll('label').forEach(l=>{if(/^(Email|Password|PIN admin|Nuovo PIN|Ripeti PIN)$/.test(l.textContent.trim()))req(l)});
 V.querySelector('.altit').after(m,st);st.after(foot(false))}
// 3 · staff: un unico elenco
function staff(V){const A=V.querySelector('#adm');if(!A)return;clean(V);title(V,T.titStaff);
 const L=el('div','card alcard allist');L.id='allist';V.querySelector('.altit').after(L);A.classList.remove('card');A.classList.add('alpanel');
 const bk=V.querySelector('#bkp');const str=el('details','card alpink');str.id='alstr';sumRow(str,'🧰',T.strumenti,T.strSub);const sb=el('div','albox');sb.id='alstrb';str.append(sb);
 if(bk&&!bk.hidden){const c=bk.querySelector('.card');if(c)sb.append(...c.childNodes)}if(bk)bk.remove();
 const wr=V.querySelector('#wrgest');const ac=el('div','card alcard alaccs');const tail=[str,ac,infoCard(),foot(true)];(wr||L).after(...tail);accRow().then(x=>{ac.append(x);ac.hidden=!x.matches('details')});str.hidden=!sb.children.length;
 const mo=new MutationObserver(()=>proc(V));mo.observe(A,{childList:true});proc(V)}
function proc(V){const A=V.querySelector('#adm'),L=V.querySelector('#allist');if(!A||!L||A.querySelector(':scope>.almk'))return;A.prepend(Object.assign(el('span','almk'),{hidden:true}));
 if(!(typeof adminMode==='function'&&adminMode()))return;
 const seg=A.querySelector('#atab'),tabs=seg?[...seg.querySelectorAll('[data-a]')]:[];if(seg)seg.parentElement.hidden=true;
 Object.keys(T.btns).forEach(id=>{const b=A.querySelector(':scope>#'+id);if(b)b.hidden=true});
 const cur=(tabs.find(b=>b.classList.contains('on'))||{}).dataset;const curK=cur?cur.a:null;if(OPEN===null)OPEN=curK;
 // contenuto del pannello
 if(curK==='soci')soci(A,L);markReq(A);
 // righe
 L.replaceChildren();
 tabs.forEach(b=>{const k=b.dataset.a,[ic,t]=T.tabs[k]||['•',b.textContent],o=OPEN===k&&curK===k;const r=row(ic,t,null,o,'altab');r.dataset.alt=k;r.setAttribute('aria-expanded',o);
  if(k==='soci'&&L._att!=null){r.querySelector('b').after(el('span','alchip',`${L._att} ${T.attivi}`))}
  act(r,()=>{const set=o=>{r.querySelector('.ar').textContent=o?'▾':'▸';r.setAttribute('aria-expanded',o)};if(OPEN===k&&!A.hidden){OPEN='';A.hidden=true;L.after(A);set(false)}else if(curK===k){OPEN=k;r.after(A);A.hidden=false;set(true)}else{OPEN=k;b.click()}});L.append(r);if(o)L.append(A)});
 // v41.9 — Import BGG solo admin (non i moderatori)
 if(typeof adminMode==='function'&&adminMode()&&typeof isMod==='function'&&!isMod()){const tit=(typeof TXT!=='undefined'&&TXT.g('ibgg_titolo'))||T.impTit,sub=(typeof TXT!=='undefined'&&TXT.g('ibgg_sub'))||T.impSub;
  const r=row('📥',tit.replace(/^📥\s*/,''),sub,false,'albtn');r.dataset.alb='ibgg';act(r,()=>go('importbgg'));L.append(r)}
 Object.keys(T.btns).forEach(id=>{const b=A.querySelector(':scope>#'+id);if(!b)return;if(id==='acfg'&&!(adminMode()&&!isMod()))return;const [ic,t,sub]=T.btns[id];
  const r=row(ic,t||b.textContent.replace(/^\S+\s/,''),null,false,'albtn');if(sub)r.querySelector('b').after(el('span','alsm',sub));if(/sola lettura/.test(b.textContent))r.querySelector('b').after(el('span','alsm','sola lettura'));r.dataset.alb=id;act(r,()=>{if(adminMode())b.click()});L.append(r)});
 if(!L.contains(A)){L.after(A);A.hidden=true}else A.hidden=false;}
function markReq(A){const n=A.querySelector('#mn');if(n&&!/\*$/.test(n.placeholder))n.placeholder+=' *';const e=A.querySelector('#me2');if(e){const l=e.previousElementSibling;if(l&&l.tagName==='LABEL')req(l)}}
// 4-5 · Soci: riepilogo + ricerca, Disattiva nella scheda
function soci(A,L){const mu=[...A.querySelectorAll(':scope>p.muted')];const c=mu.find(p=>/soci attivi$/.test(p.textContent.trim()));
 L._att=c?parseInt(c.textContent,10):null;if(c)c.remove();
 const msv=A.querySelector('#msv');if(!msv)return;const list=[...A.querySelectorAll(':scope>div')].find(d=>d.querySelector('.rec'))||null;
 // modulo nuovo socio (o modifica) dentro una riga ▸/▾
 const fl=[...A.querySelectorAll(':scope>label')].find(l=>/^(Nuovo socio|Modifica socio)$/.test(l.textContent.trim()));const ed=/Modifica/.test(fl?fl.textContent:'')||!!A.querySelector('#mx');
 const fm=el('div','alform');const nodes=[];let n=fl||A.querySelector('#mn').closest('.row');const modTxt=mu.find(p=>/moderatore/.test(p.textContent));if(modTxt)nodes.push(modTxt);
 while(n&&n!==list){nodes.push(n);if(n.id==='mx'||(n.id==='msv'&&!A.querySelector('#mx')))break;n=n.nextElementSibling}
 const pk=el('span');nodes[0].before(pk);const nr=row('➕',ed?T.modifica:T.nuovo,null,ed,'alnew');nr.setAttribute('aria-expanded',ed);fm.append(...nodes);fm.hidden=!ed;
 act(nr,()=>{fm.hidden=!fm.hidden;nr.querySelector('.ar').textContent=fm.hidden?'▸':'▾';nr.setAttribute('aria-expanded',!fm.hidden);if(!fm.hidden){const i=fm.querySelector('#mn');if(i)i.focus()}});
 const q=el('input','alq');q.type='search';q.placeholder=T.cerca;q.setAttribute('aria-label',T.cerca.replace(/^\S+\s/,''));q.value=Q;
 const hint=el('p','alhint',T.hint),none=el('p','alhint',T.nessuno);const res=el('div','alres');
 const recs=list?[...list.querySelectorAll('.rec')]:[];
 recs.forEach(r=>{const nm=r.querySelector(':scope>span:first-child'),ac=r.querySelector(':scope>span:nth-child(2)');const w=el('div','alsoc');r.replaceWith(w);
  const h=el('div','alr alsr');h.append(el('span','ic','👤'));const t=el('span','t');t.append(...nm.childNodes);h.append(t);w.append(h);res.append(w);
  if(ac&&ac.querySelector('button')){h.append(arrow(false));const sc=el('div','alsch');sc.hidden=true;const e=ac.querySelector('[data-e]');if(e)e.textContent=T.btnMod;const d=ac.querySelector('[data-t]');if(d)d.classList.add('aldis');sc.append(...ac.querySelectorAll('button'));w.append(sc);
   act(h,()=>{sc.hidden=!sc.hidden;h.querySelector('.ar').textContent=sc.hidden?'▸':'▾';h.setAttribute('aria-expanded',!sc.hidden)});h.setAttribute('aria-expanded','false')}});
 
 const nf=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const filt=()=>{Q=q.value;const v=nf(q.value.trim());let k=0;res.querySelectorAll('.alsoc').forEach(w=>{const ok=!!v&&nf(w.querySelector('.t').textContent).includes(v);w.hidden=!ok;if(ok)k++});hint.hidden=!!v;none.hidden=!v||k>0};
 q.oninput=filt;const top=el('div','alsoci');top.append(q,nr,fm,hint,none);pk.replaceWith(top);if(list)list.replaceWith(res);else top.after(res);filt();
 // dati del telefono / cambio PIN → Strumenti avanzati
 const sb=document.getElementById('alstrb');const ph=[...A.querySelectorAll(':scope>label')].find(l=>/Dati di questo telefono|Cambia PIN/.test(l.textContent));
 if(sb&&ph){const nx=ph.nextElementSibling;const box=el('div','alphone');box.id='alphone';box.append(ph);if(nx)box.append(nx);const o=sb.querySelector('#alphone');o?o.replaceWith(box):sb.append(box);const s=document.getElementById('alstr');if(s)s.hidden=false}}
// profilo di un altro socio: «Statistiche complete (solo admin)»
function admStats(V){const h=[...V.querySelectorAll(':scope>h2')].find(x=>/Statistiche complete/.test(x.textContent));if(!h||!adminMode())return;
 const c=el('div','card pfl pfmore aladm');c.id='aladm';const hd=el('div','pfsec',T.adm);hd.append(el('span','pfc',T.admChip));c.append(hd);
 let n=h.nextElementSibling,i=0;const cs=[];while(n&&n.matches('.card')){cs.push(n);n=n.nextElementSibling}
 cs.forEach(k=>{const b=k.querySelector(':scope>b');const d=el('details','pfd');d.open=i++===0;const s=el('summary');s.textContent=b?b.textContent:'';const ex=b&&b.nextElementSibling&&b.nextElementSibling.matches('span.muted')?b.nextElementSibling:null;if(ex)s.append(' ',el('span','muted',ex.textContent));if(b)b.remove();if(ex)ex.remove();d.append(s,...k.childNodes);if(k.classList.contains('adm-only'))d.classList.add('adm-only');d.append();c.append(d);k.remove()});
 h.replaceWith(c)}
const _a=views.altro;views.altro=async function(...a){const r=await _a.apply(this,a);try{if(typeof adminMode==='function'&&adminMode())staff(V);else await socio(V)}catch(e){console.warn('altro v41.6',e)}return r};
const _p=views.profilo;views.profilo=async function(...a){const r=await _p.apply(this,a);try{if(window._pv)admStats(V)}catch(e){console.warn('altro v41.6 profilo',e)}return r};
})();
