// v41.3 — Profilo (mockup approvato, 7 punti): riordina la pagina «Il mio profilo» senza toccare dati, validazioni ed escaping.
// 1 scheda con chip + modifica integrata · 2 statistiche a tessere (ⓘ aiuto) · 3 «I miei giochi» + «Tutti i giochi (N) ▸»
// 4 badge ottenuti + più vicini · 5 compagni di gioco · 6 storico (ultime 3) · 7 Avversari/Abitudini come righe ▸/▾
// Tutto il testo che viene dai dati passa da textContent (mai innerHTML con dati).
(function(){
const T={giochi:'🎲 I miei giochi',giochiAltri:'🎲 Giochi',tuttiGiochi:'Tutti i giochi',badge:'🏅 Badge',tuttiBadge:'Tutti i badge',compagni:'👥 Compagni di gioco',tuttiCompagni:'Tutti i compagni',
 storico:'🕑 Storico partite',tutteP:'Tutte le partite',meno:'Mostra meno',vis:'Statistiche visibili agli altri soci',
 visH:'Gli altri vedono solo i numeri, mai avversari o bilanci con le persone.',info:'Informazioni sulle statistiche',
 tiles:[['partite',0],['vittorie',1],['giochi',2],['serate',3]],tavoli:'tavoli',org:'organizzati',vinta:'🏆 vinta'};
const PRE=4,PREB=3,PREC=3,PREP=3,Y=String(new Date().getFullYear());
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
const chip=(txt,k)=>el('span','pfc'+(k?' '+k:''),txt);
const short=s=>String(s||'').replace(' '+Y,'').trim();
const arrow=()=>{const a=el('span','ar','▸');a.setAttribute('aria-hidden','true');return a};
const keyAct=(r,f)=>{r.tabIndex=0;r.setAttribute('role','button');r.onclick=f;r.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}}};
// riga elenco: icona, testo (nome + chip), valore opzionale, ▸; tutta la riga è cliccabile
function row(ic,name,chips,val,act,data){const r=el('div','lr');if(data)for(const k in data)r.dataset[k]=data[k];r.append(el('span','ic',ic));const t=el('span','t');t.append(el('b',null,name));
 if(chips&&chips.length){const c=el('span','pfcs');c.append(...chips);t.append(c)}r.append(t);if(val!=null)r.append(el('b','v',val));r.append(arrow());
 if(act)keyAct(r,act);else if(data){r.tabIndex=0;r.setAttribute('role','button')}return r}
// «Tutti … (N) ▸» ↔ «Mostra meno ▾»: mostra/nasconde le righe oltre l'anteprima
function more(card,label,n,items){if(items.length<=0)return;const b=el('button','more');b.type='button';const l=el('span',null,`${label} (${n})`),a=arrow();b.append(l,a);b.setAttribute('aria-expanded','false');
 b.onclick=()=>{const op=b.getAttribute('aria-expanded')!=='true';items.forEach(x=>x.hidden=!op);b.setAttribute('aria-expanded',String(op));l.textContent=op?T.meno:`${label} (${n})`;a.textContent=op?'▾':'▸'};
 items.forEach(x=>x.hidden=true);card.append(b)}
const cardOf=(V,emo)=>[...V.querySelectorAll(':scope>.card')].find(c=>{const b=c.querySelector(':scope>b');return b&&b.textContent.trim().startsWith(emo)});
function head(card,txt){const h=el('div','pfsec',txt);card.prepend(h);return h}

function hero(V){const h=V.querySelector('.card.prof');if(!h||h.dataset.p413)return;h.dataset.p413='1';
 const mu=[...h.querySelectorAll('.muted')].find(x=>/❤️|✅/.test(x.textContent));
 if(mu){const cs=el('div','pfcs');mu.textContent.split(' · ').map(s=>s.trim()).filter(Boolean).forEach(s=>cs.append(chip(s,s.startsWith('✅')?'g':'')));mu.replaceWith(cs)}
 const ed=V.querySelector('#ed');if(ed){ed.classList.remove('card');ed.classList.add('pfed');h.append(ed)}}

function privacy(V){const lb=V.querySelector('label.stpub');const ed=V.querySelector('#ed');if(!lb)return;
 const cb=lb.querySelector('#stpub');if(!cb)return;const old=V.querySelector('.pftg');
 const w=el('div','pftg');const l=el('label','tg');l.append(el('span','ic','👁'),el('b',null,T.vis),cb);cb.classList.add('sw');cb.setAttribute('role','switch');
 w.append(l,el('div','hl','ⓘ '+T.visH));if(old)old.replaceWith(w);else if(ed&&ed.querySelector('#esv'))ed.querySelector('#esv').before(w);else lb.after(w);lb.remove()}

// tavoli / organizzati nel periodo scelto (stesse regole di Profile.stats e degli intervalli di stats.js)
function perFrom(per){const t=romeToday();if(per==='12m'){const d=new Date(t+'T12:00:00Z');d.setUTCFullYear(d.getUTCFullYear()-1);return d.toISOString().slice(0,10)}if(per==='m')return t.slice(0,8)+'01';return '0000'}
function tavPer(st,ctx){if(!ctx.mid||!Array.isArray(ctx.ts))return null;const on=st.querySelector('.stf [data-sp].on'),per=on?on.dataset.sp:'sempre',f=perFrom(per),today=romeToday(),id=ctx.mid;
 const tb=ctx.ts.filter(t=>((t.players||[]).some(x=>x.memberId===id)||t.hostId===id)&&/^\d{4}-\d{2}-\d{2}$/.test(t.date||'')&&t.date>=f&&t.date<=today);return{tav:tb.length,org:tb.filter(t=>t.hostId===id).length}}
function stats(V,ctx){const st=V.querySelector('#st33');if(!st||st.dataset.p413)return;st.dataset.p413='1';
 const h3=st.querySelector('h3');const note=[...st.querySelectorAll(':scope>p.muted.sm')][0];
 if(h3){h3.classList.add('pfsec');if(note){const i=el('button','pfi','ⓘ');i.type='button';i.setAttribute('aria-label',T.info);i.setAttribute('aria-expanded','false');note.hidden=true;note.classList.add('pfnote');
  i.onclick=()=>{note.hidden=!note.hidden;i.setAttribute('aria-expanded',String(!note.hidden))};h3.append(' ',i)}}
 const g=st.querySelector(':scope>.stg');const ab=[...st.querySelectorAll('details.std')].find(d=>/Abitudini/.test(d.querySelector('summary').textContent));
 if(g){const bx=[...g.children];const val=i=>bx[i]?bx[i].querySelector('b').textContent.split(' · ')[0]:'—';
  const ng=el('div','stg pftiles');const tile=(v,l)=>{const t=el('div','stn');t.append(el('b',null,v),el('span',null,l));return t};
  T.tiles.forEach(([l,i])=>ng.append(tile(val(i),l)));const tv=tavPer(st,ctx);if(tv){ng.append(tile(String(tv.tav),T.tavoli),tile(String(tv.org),T.org))}else{if(ctx.tav!=null)ng.append(tile(ctx.tav,T.tavoli));if(ctx.org!=null)ng.append(tile(ctx.org,T.org))}
  // h-index e ore stimate restano, spostati in «Abitudini»
  const rest=bx.slice(4);const ag=ab&&ab.querySelector('.stg');if(rest.length&&ag)ag.prepend(...rest);g.replaceWith(ng)}
 // 3 · I miei giochi
 const gd=[...st.querySelectorAll('details.std')].find(d=>/^🎲/.test(d.querySelector('summary').textContent.trim()));
 const host=V.querySelector('#st33h')||st;let card=V.querySelector('#pfgames');const nc=el('div','card pfl');nc.id='pfgames';head(nc,h3&&/Le mie/.test(h3.textContent)?T.giochi:T.giochiAltri);
 if(gd){const rs=[...gd.querySelectorAll('.str')];const lst=[];rs.forEach(r=>{const btn=r.querySelector('[data-g]');if(!btn)return;const nm=btn.querySelector('b').textContent,n=(r.querySelector('.strh>span')||{}).textContent||'';
   const tx=(r.querySelector('.muted.sm')||{}).textContent||'',w=(tx.match(/Vinte (\d+)/)||[])[1],mx=(tx.match(/max ([^,]+),/)||[])[1],la=(tx.match(/ultima ([^·]+)/)||[])[1];
   const cs=[];if(w!=null)cs.push(chip(`🏆 ${w}/${parseInt(n)||0}`,'g'));if(mx)cs.push(chip(`⭐ max ${mx.trim()}`,'y'));if(la)cs.push(chip('🕑 '+short(la)));
   const x=row('🎲',nm,cs,null,()=>btn.click());x.dataset.g=btn.dataset.g;nc.append(x);lst.push(x)});
  more(nc,T.tuttiGiochi,lst.length,lst.slice(PRE));
  const du=gd.querySelector(':scope>p.sm');if(du){du.classList.add('pfdusty');nc.append(du);if(lst.length>PRE)du.hidden=true;const b=nc.querySelector('.more');if(b){nc.append(b);b.addEventListener('click',()=>du.hidden=b.getAttribute('aria-expanded')!=='true')}}
  gd.remove()}else{const p=st.querySelector(':scope>p.muted:not(.sm)');if(p)nc.append(p.cloneNode(true))}
 if(card)card.replaceWith(nc);else host.after(nc);
 // 7 · Avversari / Abitudini: righe ▸/▾ in fondo (stato aperto mantenuto tra un periodo e l'altro)
 let mo=V.querySelector('#pfmore');const ds=[...st.querySelectorAll('details.std')];
 if(ds.length){const op=mo?[...mo.querySelectorAll('details')].map(d=>d.open):[];const m2=el('div','card pfl pfmore');m2.id='pfmore';ds.forEach((d,i)=>{d.classList.add('pfd');d.open=!!op[i];m2.append(d)});
  if(mo)mo.replaceWith(m2);else{const anc=V.querySelector('#pfhist')||V.querySelector('#pfmates')||nc;anc.after(m2)}}else if(mo)mo.remove();
 privacy(V)}

function badges(V){const c=cardOf(V,'🏅');if(!c||c.dataset.p413)return;c.dataset.p413='1';c.classList.add('pfl','pfbd');const b=c.querySelector(':scope>b');head(c,b.textContent);b.remove();
 const box=c.querySelector('.badges');if(!box)return;const all=[...box.querySelectorAll('.badge')];const prog=x=>{const i=x.querySelector('.pg i');return i?parseFloat(i.style.width)||0:-1};
 const on=all.filter(x=>!x.classList.contains('off')),off=all.filter(x=>x.classList.contains('off')).sort((a,b)=>prog(b)-prog(a));
 const near=off.filter(x=>prog(x)>0).slice(0,PREB);const rest=off.filter(x=>!near.includes(x));box.replaceChildren(...on,...near,...rest);
 all.forEach(x=>{const n=x.querySelector('.bdn');if(n&&!x.dataset.p413k){x.dataset.p413k='1';x.addEventListener('click',e=>{if(!e.target.closest('.bdn'))n.click()})}});
 more(c,T.tuttiBadge,all.length,rest)}

function mates(V){const c=cardOf(V,'👥');if(!c||c.dataset.p413)return;c.dataset.p413='1';c.id='pfmates';c.classList.add('pfl');c.querySelector(':scope>b').remove();head(c,T.compagni);
 const rs=[...c.querySelectorAll(':scope>.rec')],lst=[];rs.forEach(r=>{const a=r.querySelector('[data-pv]'),nm=(r.querySelector('span')||r).textContent.trim(),n=(r.querySelector(':scope>b')||{}).textContent||'';
  const x=row('👤',nm,null,n,null,a?{pv:a.dataset.pv}:null);if(!a)x.classList.add('nolink');r.replaceWith(x);lst.push(x)});more(c,T.tuttiCompagni,lst.length,lst.slice(PREC))}

function hist(V){const c=cardOf(V,'🕑');if(!c||c.dataset.p413)return;c.dataset.p413='1';c.id='pfhist';c.classList.add('pfl');c.querySelector(':scope>b').remove();head(c,T.storico);
 const rs=[...c.querySelectorAll(':scope>.rec')],lst=[];rs.forEach(r=>{const a=r.querySelector('[data-gid]'),nm=(a||r.querySelector('span')).textContent.trim(),pr=(r.querySelector('.prd')||{}).textContent||'';
  const [d,day,pt]=pr.split(' · ').map(s=>s.trim()),win=(r.querySelector('.win')||{}).textContent.trim();
  const cs=[chip(`📅 ${day?day.slice(0,3).toLowerCase()+' ':''}${short(d)}`)];if(pt)cs.push(chip(pt,'y'));if(/🏆/.test(win))cs.push(chip(T.vinta,'g'));else if(win)cs.push(chip(win.toLowerCase()));
  const x=row('🎲',nm,cs,null,null,a?{gid:a.dataset.gid}:null);r.replaceWith(x);lst.push(x)});more(c,T.tutteP,lst.length,lst.slice(PREP))}

function apply(V,ctx){if(!V.querySelector('.card.prof'))return;V.classList.add('pf');hero(V);badges(V);mates(V);hist(V);stats(V,ctx);
 // «Giochi più giocati» è un doppione di «I miei giochi» quando ci sono le statistiche complete
 const gg=cardOf(V,'🎲');if(gg&&V.querySelector('#pfgames')&&gg.id!=='pfgames')gg.remove();
 const gm=V.querySelector('#pfgames'),bd=V.querySelector('.pfbd');if(gm&&bd&&gm.nextElementSibling!==bd)gm.after(bd);
 const mo=V.querySelector('#pfmore'),hi=V.querySelector('#pfhist');if(mo&&hi&&hi.nextElementSibling!==mo)hi.after(mo)}

const _pf=views.profilo;views.profilo=async(...a)=>{await _pf(...a);try{const V=document.getElementById('view');if(!V||!V.querySelector('.card.prof'))return;
 // tavoli / organizzati: dalla riga di riquadri sotto le statistiche (poi tolta, i numeri stanno nelle tessere)
 const ctx={};const rw=[...V.querySelectorAll(':scope>.row')].find(r=>/Tavoli organizzati/.test(r.textContent)&&V.querySelector('#st33'));
 if(rw){rw.querySelectorAll('.card').forEach(c=>{const l=(c.querySelector('.muted')||{}).textContent,v=(c.querySelector('.big')||{}).textContent;if(l==='Tavoli')ctx.tav=v;if(l==='Tavoli organizzati')ctx.org=v});rw.remove()}
 try{const ms=await DB.members(),u=DB.remote&&DB.status==='online'?await DB.remote.user():null;const m=window._pv?ms.find(x=>x.id===window._pv):(u?ms.find(x=>x.userId===u.id):null);if(m){ctx.mid=m.id;ctx.ts=await DB.allTables()}}catch(e){}
 apply(V,ctx);if(typeof pwProfilo==='function')try{pwProfilo(V)}catch(e){console.warn('cambia-password',e)};const h=V.querySelector('#st33h');if(h&&!h._pfo){h._pfo=new MutationObserver(()=>{if(h.querySelector('#st33:not([data-p413])'))stats(V,ctx)});h._pfo.observe(h,{childList:true,subtree:true})}}catch(e){console.warn('profilo v41.3',e)}};
window.PF413={apply,T};
})();
