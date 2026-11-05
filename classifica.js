// v41.5 — Classifica (tab Record), mockup approvato punti 1-6 (il 7, titolo + ⓘ privacy, è in sospeso: titolo invariato).
// 1 podio XP aperto in cima con «Tu» · 2 un unico menu Periodo («Tutto») · 3 6 record principali + «Altri record ▸» chiuso
// 4 pareggi come +N e testi brevi · 5 icone diverse per record · 6 righe cliccabili ▸/▾ senza sottolineatura.
// Riordina il DOM già prodotto (dati, calcoli ed escaping restano quelli di app.js / xp.js); il testo nuovo passa da textContent.
(function(){
const T={periodo:'Periodo',tutto:'Tutto',tu:'Tu',tutta:'Tutta la classifica',altri:'Altri record',xpNota:'Gli XP sono totali: non cambiano con il periodo.',vuoto:'Nessun record ancora.',partite1:'partita',partiteN:'partite',
 main:['Più presente','Più vittorie','Più partite','Miglior % di vittorie','Più giochi diversi','Gioco più giocato'],
 brevi:{'Pioniere: primo a giocare più giochi dell\'associazione':'Pioniere','Genio della lampada – Più desideri avverati':'Desideri avverati','Più partite in una serata':'Più partite in una sera','Più presenze agli eventi':'Più presenze a eventi'},
 icone:{'Più presente':'⭐','Più vittorie':'🏆','Più partite':'🎲','Miglior % di vittorie':'📈','Più giochi diversi':'🧭','Gioco più giocato':'🧩','Partita più lunga':'⏱️','Serie di vittorie':'🔥'},
 sez:{rgames:'📊',uxnums:'🏛️'},nums:{Partite:'🎲',Soci:'👥',Ospiti:'🙋'}};
const OPEN=new Set();window.CL415={T,OPEN};
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
const arrow=o=>{const a=el('span','ar',o?'▾':'▸');a.setAttribute('aria-hidden','true');return a};
const act=(r,f)=>{r.tabIndex=0;r.setAttribute('role','button');r.onclick=e=>{if(e.target.closest('a,[data-pv]:not(.clrow)'))return;f()};r.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}}};
const nameOf=x=>{const c=x.cloneNode(true);c.querySelectorAll('.lv').forEach(l=>l.remove());return c.textContent.trim()};
const short=m=>m?`${m.nome} ${m.cognome?String(m.cognome).trim().charAt(0)+'.':''}`.trim():'Socio';
// 2 · menu Periodo unico
function periodo(V){const h=V.querySelector(':scope>h2');if(!h||V.querySelector('.clhd'))return;const f=pfGet(),hd=el('div','clhd');h.replaceWith(hd);hd.append(h);
 const lb=el('label','cldd');const s=el('select');s.id='clper';s.setAttribute('aria-label',T.periodo);
 Object.keys(PF_L).forEach(k=>{const o=el('option',null,`📅 ${T.periodo}: ${k==='all'?T.tutto:PF_L[k]}`);o.value=k;if(f.k===k)o.selected=true;s.append(o)});
 s.onchange=()=>{if(PF_L[s.value])pfSet({k:s.value})};lb.append(s);hd.append(lb);
 const b=V.querySelector('.pfbar');if(b){const c=b.querySelector('.pfchips');if(c)c.remove();b.hidden=f.k!=='c';b.classList.add('clpf')}}
// 1 · podio XP
function podio(V){const d=V.querySelector('details.accx');if(!d||d.dataset.cl)return;d.dataset.cl='1';V.querySelector('.clhd').after(d);
 const all=Object.values(XP.map||{}).sort((a,b)=>b.xp-a.xp),x=d.querySelector('.xptop');if(!all.length||!x)return;
 DB.members().then(ms=>{const M=id=>ms.find(m=>m.id===id),box=el('div','clpod');
  [1,0,2].forEach(i=>{const r=all[i];if(!r)return;const c=el('div','clp p'+(i+1)+(r.member_id===XP.me?' me':''));c.dataset.pv=r.member_id;c.setAttribute('role','button');c.tabIndex=0;
   c.append(el('span','md',['🥇','🥈','🥉'][i]),el('b',null,r.member_id===XP.me?T.tu:short(M(r.member_id))),el('span','xp',`${(+r.xp||0).toLocaleString('it-IT')} XP`));box.append(c)});
  const rows=el('div','cllist');const i=all.findIndex(r=>r.member_id===XP.me);
  if(i>=0){const r=el('div','clln clme');r.append(el('span','ic','🙂'));const t=el('span','t');t.append(el('b',null,`${T.tu}: ${i+1}° · `),el('span','pill',`${(+all[i].xp||0).toLocaleString('it-IT')} XP`));r.append(t,arrow(false));
   act(r,()=>{OPEN.add('xpall');show();const b=x.querySelector('[data-xpme]');if(b)b.click()});rows.append(r)}
  const ta=el('div','clln clall');ta.dataset.clx='xpall';const st=()=>{ta.replaceChildren(el('span','ic','📋'),el('b','t',T.tutta),arrow(OPEN.has('xpall')));ta.setAttribute('aria-expanded',OPEN.has('xpall'))};
  const show=()=>{x.hidden=!OPEN.has('xpall');st()};act(ta,()=>{OPEN.has('xpall')?OPEN.delete('xpall'):OPEN.add('xpall');show()});rows.append(ta);
  x.before(box,el('p','clnota',T.xpNota),rows);x.classList.add('clx');show()}).catch(e=>console.warn('podio',e))}
// 3-6 · record
function record(V){const g=V.querySelector('.rov');if(!g||g.dataset.cl)return;g.dataset.cl='1';const used=new Set();
 const items=[...g.querySelectorAll('.roc')].map(c=>{const lab=(c.querySelector('.rot')||{}).textContent||'',h=c.querySelector('.roh'),v=((c.querySelector('.rov2')||{}).textContent||'').trim();
  let ic=T.icone[lab]||(c.querySelector('.roi')||{}).textContent||'🏅';
  const pv=[...h.querySelectorAll('.pv')],mu=h.querySelector(':scope>.muted:last-child'),ex=mu&&/^\+\d+$/.test(mu.textContent.trim())?+mu.textContent.trim().slice(1):0;
  let names;if(pv.length)names=pv.map(nameOf);else{const c2=h.cloneNode(true);c2.querySelectorAll('.muted').forEach(m=>m.remove());const s=c2.textContent.trim();names=s&&s!=='—'?s.split(', '):[]}
  return{lab,ic,h,v,names,pid:c.dataset.pv,tie:Math.max(0,names.length-1)+ex}});
 items.forEach(it=>{if(used.has(it.ic)){const alt=['🎖️','🥇','🌟','💫','🎉','🧠','🛡️','🎈','🪄','🧿'].find(a=>!used.has(a));if(alt)it.ic=alt}used.add(it.ic)});
 const row=it=>{const k='r:'+it.lab,o=OPEN.has(k),w=el('div','clrw'),r=el('div','clln clrow');r.dataset.clx=k;r.append(el('span','ic',it.ic));
  const t=el('span','t');t.append(el('small',null,T.brevi[it.lab]||it.lab));const n=el('span','nm');
  if(it.names.length){n.append(el('b','who',it.names[0]));if(it.tie)n.append(el('span','tie',`+${it.tie}`))}else n.append(el('span','muted','—'));t.append(n);r.append(t);
  if(it.v){r.append(el('span','pill',it.v.replace(/\s*\(.*\)\s*$/,'')));}
  r.append(arrow(o));r.setAttribute('aria-expanded',o);w.append(r);
  if(o&&!it.names.length){const d=el('div','cldet muted',T.vuoto);w.append(d)}
  else if(o){const d=el('div','cldet');const hc=it.h.cloneNode(true);hc.className='cldh';if(it.pid)hc.querySelectorAll('.pv:not([data-pv])').forEach(x=>{x.dataset.pv=it.pid;x.classList.add('cllink')});d.append(hc);if(it.v)d.append(el('div','muted',it.v));w.append(d)}
  act(r,()=>{OPEN.has(k)?OPEN.delete(k):OPEN.add(k);draw()});return w};
 const box=el('div','clrec');g.after(box);g.hidden=true;
 const draw=()=>{const M=T.main.map(l=>items.find(i=>i.lab===l)).filter(Boolean),A=items.filter(i=>!T.main.includes(i.lab));box.replaceChildren(...M.map(row));
  if(A.length){const o=OPEN.has('altri'),r=el('div','clln clrow clmore');r.dataset.clx='altri';r.append(el('span','ic','🗂️'),el('b','t',T.altri),el('span','pill',String(A.length)),arrow(o));r.setAttribute('aria-expanded',o);act(r,()=>{OPEN.has('altri')?OPEN.delete('altri'):OPEN.add('altri');draw()});box.append(r);
   if(o){const s=el('div','clsub');s.append(...A.map(row));box.append(s)}}};
 draw()}

// v41.8.1 · Statistiche per gioco e Numeri dell'associazione come righe uguali ai record (niente riquadri)
function stats(V){V.querySelectorAll('#rgames button.rgl:not(.clln)').forEach(b=>{const nm=b.querySelector('span:not(.muted)'),mu=b.querySelector('.muted'),n=parseInt((mu&&mu.textContent)||'0',10)||0;
  const t=el('span','t');t.append(el('b','who',nm?nm.textContent:b.textContent));b.replaceChildren(el('span','ic','🎲'),t,el('span','pill',`${n} ${n===1?T.partite1:T.partiteN}`),arrow(false));b.classList.add('clln','clrow')})}
function nums(V){const r=V.querySelector('#uxnums>div.row');if(!r||r.dataset.cl)return;r.dataset.cl='1';const box=el('div','clnums');
 [...r.querySelectorAll(':scope>.card')].forEach(c=>{const l=((c.querySelector('.muted')||{}).textContent||'').trim(),v=((c.querySelector('.big')||{}).textContent||'').trim(),w=el('div','clrw'),x=el('div','clln clstat');
  const t=el('span','t');t.append(el('b','who',l));x.append(el('span','ic',T.nums[l]||'📌'),t,el('span','pill',v));w.append(x);box.append(w)});r.replaceWith(box)}
function sezioni(V){for(const id in T.sez){const s=V.querySelector(`#${id}>summary>b`);if(s){const t=s.textContent.replace(/^\S+\s/,'');if(!s.textContent.startsWith(T.sez[id]))s.textContent=T.sez[id]+' '+t}}}
const _r=views.record;views.record=async function(...a){const r=await _r.apply(this,a);try{if(RA._p)await RA._p;await new Promise(z=>setTimeout(z,0));periodo(V);podio(V);record(V);stats(V);nums(V);sezioni(V)}catch(e){console.warn('classifica',e)}return r};
{const m=RA.mount;RA.mount=function(...a){RA._p=m.apply(this,a);return RA._p}}
})();
