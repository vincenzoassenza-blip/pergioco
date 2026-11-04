// v40 — UX più leggera: azione principale in alto, filtri chiusi, blocchi richiudibili con memoria,
// titolo scheda in alto, liste a pezzi, avvio dalla copia locale. Nessun nuovo dato, nessuna chiamata nuova al DB.
const UX={
 // 4 — blocchi richiudibili che ricordano aperto/chiuso (solo preferenza grafica, nessun dato personale)
 AK:'pergioco-acc',
 accGet(){try{return JSON.parse(localStorage.getItem(this.AK))||{}}catch(e){return{}}},
 accKey(d){const v=window._cur||'';const t=(d.dataset.acc||(d.querySelector('summary')||{}).textContent||'').replace(/\(.*?\)|\d+|[^\p{L}\s]/gu,'').trim().slice(0,40);let h=0;for(const c of v+'|'+t)h=(h*31+c.charCodeAt(0))|0;return'k'+(h>>>0).toString(36)},
 accApply(root){const s=this.accGet();(root||document).querySelectorAll('details:not([data-accok])').forEach(d=>{if(d.id==='nt'||d.closest('.mdl,.modal'))return;d.dataset.accok='1';const k=this.accKey(d);if(k in s)d.open=!!s[k]})},
 accSave(d){if(!d.dataset.accok)return;const s=this.accGet();s[this.accKey(d)]=d.open;const ks=Object.keys(s);if(ks.length>200)delete s[ks[0]];try{localStorage.setItem(this.AK,JSON.stringify(s))}catch(e){}},
 // converte titolo h3.rsec + contenuto in un blocco richiudibile
 wrapSections(root){root.querySelectorAll('h3.rsec').forEach((h,i)=>{const d=document.createElement('details');d.className='card acc';d.open=i===0;const sm=document.createElement('summary');sm.innerHTML=`<b>${h.innerHTML}</b>`;d.append(sm);let n=h.nextElementSibling;while(n&&!n.matches('h3.rsec,details,h2')){const x=n.nextElementSibling;d.append(n);n=x}h.replaceWith(d)})},
 // v40.1 — Record: anche Classifica XP (e sezioni aggiunte dopo) diventano blocchi richiudibili
 recFix(V){const x=V.querySelector('.xptop');if(x&&!x.closest('details')){const d=document.createElement('details');d.className='card acc accx';d.dataset.acc='Classifica XP';d.open=true;const sm=document.createElement('summary');sm.innerHTML='<b>⚡ Classifica XP</b>';x.replaceWith(d);d.append(sm,x)}if(V.querySelector('h3.rsec'))this.wrapSections(V);this.recNums(V);this.accApply(V)},
 // v40.3 — numeri (Partite/Soci/Ospiti) e accesso alle statistiche staff in un blocco chiuso in fondo
 recNums(V){const o=V.querySelector('#uxnums');if(o){if(V.lastElementChild!==o)V.append(o);return}const r=[...V.children].find(e=>e.matches('.row')&&/Partite/.test(e.textContent));const bt=V.querySelector('[data-act="go:stats"]');if(!r&&!bt)return;
  const d=document.createElement('details');d.id='uxnums';d.className='card acc';d.dataset.acc=bt?'Statistiche associazione admin':'Numeri associazione';d.open=false;const sm=document.createElement('summary');
  sm.innerHTML=bt&&adminMode()?'<b>📊 Statistiche associazione (admin)</b>':'<b>📊 Numeri dell\'associazione</b>';d.append(sm);if(r)d.append(r);if(bt){if(adminMode()){bt.textContent='Apri statistiche associazione';d.append(bt)}else bt.remove()}V.append(d)},
 // 8 — liste lunghe: mostra un pezzo alla volta mentre scorri
 chunk(box,size=40){if(!box)return;const it=[...box.children].filter(x=>!x.classList.contains('uxmore'));if(it.length<=size)return;let shown=size;it.forEach((x,i)=>{if(i>=size)x.hidden=true});
  const s=document.createElement('div');s.className='uxmore muted';s.textContent='Carico altri…';box.append(s);
  const more=()=>{it.slice(shown,shown+size).forEach(x=>x.hidden=false);shown+=size;if(shown>=it.length){s.remove();io&&io.disconnect()}};
  const io='IntersectionObserver'in window?new IntersectionObserver(e=>{if(e.some(x=>x.isIntersecting))more()},{rootMargin:'400px'}):null;if(io)io.observe(s);else{s.textContent='Mostra altri';s.onclick=more}},
 // 7 — barra in alto con «← nome» dentro una scheda
 hdr(){const H=document.querySelector('header');if(!H)return;let b=document.getElementById('hback');if(!b){b=document.createElement('button');b.id='hback';b.type='button';b.hidden=true;H.insertBefore(b,H.firstChild);b.onclick=()=>{const bk=document.getElementById('bk');if(bk)bk.click();else history.back()}}
  const sub=window._cur==='profilo'&&window._pv,pn=sub&&document.querySelector('#view .pname');const n=pn?(pn.childNodes[0]&&pn.childNodes[0].textContent||pn.textContent).trim().slice(0,40):'';
  const on=!!sub;b.hidden=!on;b.textContent='← '+(n||'Indietro');b.setAttribute('aria-label','Indietro');document.body.classList.toggle('insub',on);const bk=document.getElementById('bk');if(bk)bk.hidden=on},
 dLbl(iso){try{return new Date(iso+'T12:00').toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'})}catch(e){return iso}}
};
document.addEventListener('toggle',e=>{if(e.target.tagName==='DETAILS')UX.accSave(e.target)},true);

// 7 — scheda gioco: la barra in alto mostra «← Nome del gioco»
{const _g=gamePage;gamePage=async function(g,ps){await _g(g,ps);const o=[...document.querySelectorAll('.gpg')].pop();if(o&&g){const b=o.querySelector('.gpb');if(b){b.textContent='← '+String(g.name||'Indietro').slice(0,60);b.setAttribute('aria-label','Indietro');o.querySelector('.gph').classList.add('uxbar')}UX.accApply(o)}}}

const _uxWrap=(k,fn)=>{const f=views[k];if(!f)return;views[k]=async(...a)=>{const r=await f.apply(views,a);try{await fn(...a)}catch(e){console.warn('ux40 '+k,e)}return r}};

// 1 — Partita: in alto solo gioco + giocatori; data, modalità, ospite, durata e nota in «Altro»
_uxWrap('nuova',async ed=>{const card=V.querySelector('.card');const save=$('#save');if(!card||!save||V.querySelector('#uxaltro'))return;
 const d=document.createElement('details');d.id='uxaltro';d.className='uxaltro';d.dataset.acc='partita-altro';
 const sm=document.createElement('summary');d.append(sm);const lab=t=>[...card.querySelectorAll(':scope>label')].find(l=>l.textContent.trim().startsWith(t));
 const take=(start,stopEl)=>{let n=start;while(n&&n!==stopEl){const x=n.nextSibling;d.append(n);n=x}};
 // data → fino a «Soci al tavolo» (lascia fuori il blocco cooperativo, che resta visibile se serve)
 const lD=lab('Data'),lS=lab('Soci al tavolo'),coop=$('#coop');if(lD&&lS)take(lD,coop||lS);
 const lO=lab('Ospite'),lG=lab('Giocatori');if(lO&&lG)take(lO,lG);
 const lDu=lab('Durata');if(lDu)take(lDu,save);
 save.before(d);
 const today=$('#d')?$('#d').defaultValue:'';const upd=()=>{const v=$('#d')&&$('#d').value;sm.innerHTML=`Altro: data${v&&v!==today?' <b>('+esc(UX.dLbl(v))+')</b>':''}, modalità, ospite, durata, nota`};upd();if($('#d'))$('#d').addEventListener('change',upd);
 if(ed&&(ed.id||(ed.date&&ed.date!==today)))d.open=true;else UX.accApply(V);
 save.addEventListener('click',()=>{if(!isoOk($('#d').value)||($('#du')&&$('#du').classList.contains('bad')))d.open=true},true);
 // sotto: i tavoli in Agenda di oggi
 const ts=(await DB.allTables()).filter(t=>t.date===romeToday()&&t.status==='open');if(!ts.length||ed&&ed.id)return;const gs=await DB.games();
 const box=document.createElement('div');box.className='card uxtoday';box.innerHTML=`<b>📅 In Agenda oggi</b>${ts.slice(0,5).map(t=>{const g=gs.find(x=>x.id===t.gameId)||{},n=(t.players||[]).length,lib=Math.max(0,(+t.seats||0)-n);return`<div class="rec"><span>${g.id?gLink(g.id,g.name):esc(g.name||'?')}${t.time?' <span class="muted">· '+esc(t.time)+'</span>':''}</span>${lib?`<span class="evb st">${lib} post${lib==1?'o':'i'} liber${lib==1?'o':'i'}</span>`:'<span class="evb off">Pieno</span>'}</div>`}).join('')}<button type="button" class="s" id="uxag" style="width:100%;margin-top:6px">Vai all'Agenda</button>`;
 card.after(box);$('#uxag').onclick=()=>{window._ser={...(window._ser||{}),date:romeToday()};go('serata')}});

// 1 — Agenda: in alto i tavoli di oggi e dei prossimi giorni
_uxWrap('serata',async()=>{if(!$('#sd')||V.querySelector('.uxdays'))return;const ts=(await DB.allTables()).filter(t=>t.status==='open'&&t.date>=romeToday());const S=window._ser||{};
 const c={};ts.forEach(t=>c[t.date]=(c[t.date]||0)+1);const ds=Object.keys(c).sort().slice(0,6);if(!ds.length)return;
 const w=document.createElement('div');w.className='uxdays';w.setAttribute('aria-label','Prossimi giorni con tavoli');
 w.innerHTML=ds.map(d=>`<button type="button" class="chip pick${d===S.date?' on':''}" data-uxd="${esc(d)}">${d===romeToday()?'Oggi':esc(UX.dLbl(d))} · ${c[d]} tavol${c[d]==1?'o':'i'}</button>`).join('');
 const card=$('#sd').closest('.card');card.after(w);w.onclick=e=>{const b=e.target.closest('[data-uxd]');if(!b||!isoOk(b.dataset.uxd))return;window._ser.date=b.dataset.uxd;go('serata')}});

// 2 + 8 — Giochi: filtri chiusi in un solo pulsante «Filtri (n)» e lista caricata a pezzi
_uxWrap('ludoteca',()=>{const n=$('#n');if(!n||V.querySelector('#uxfil'))return;const so=$('#so'),soRow=so&&so.closest('.row'),adv=$('#adv'),r1=n.closest('.row'),r2=$('#c')&&$('#c').closest('.row');
 const d=document.createElement('details');d.id='uxfil';d.className='uxfil';const sm=document.createElement('summary');d.append(sm);r1.before(d);d.append(r1);if(r2)d.append(r2);
 // v40.5 — un solo pannello: i secondari sotto un sottotitolo «Altro» non richiudibile
 if(adv){const sub=document.createElement('div');sub.id='adv';sub.className='uxsub';sub.innerHTML='<div class="uxsubt">Altro</div>';[...adv.childNodes].filter(x=>x.nodeName!=='SUMMARY').forEach(x=>sub.append(x));adv.replaceWith(sub);d.append(sub)}
 // Ordina esce dai filtri: piccolo selettore accanto al conteggio
 if(so){const f=$('#gcnt').parentNode,w=document.createElement('label');w.className='uxsort';w.htmlFor='so';w.append('Ordina: ');f.insertBefore(w,$('#gcnt').nextSibling);w.append(so);soRow.remove();$('#gcnt').after(document.createTextNode(''))}
 const clr=$('#gclr');if(clr){clr.classList.add('uxclr');d.append(clr)}
 const ids=['#n','#t','#c','#k','#m','#a'];const cnt=()=>{const k=ids.filter(x=>$(x)&&$(x).value).length+($('#x')&&$('#x').checked?1:0);sm.innerHTML=`⚙️ Filtri${k?` <span class="uxbadge" aria-label="${k} attivi">${k}</span>`:''}`;ids.forEach(x=>$(x)&&$(x).classList.toggle('uxon',!!$(x).value))};cnt();
 [...ids,'#x'].forEach(s=>$(s)&&$(s).addEventListener('change',cnt));if(clr)clr.addEventListener('click',()=>setTimeout(cnt,0));
 const gl=$('#gl');const ch=()=>UX.chunk(gl);ch();new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(y=>y.classList&&!y.classList.contains('uxmore'))))ch()}).observe(gl,{childList:true})});

// Anteprima Proposta A — pagina Giochi: ricerca + Filtri in cima, titolo collezione, copertine, consigliere dentro la lista
_uxWrap('ludoteca',async()=>{const d=$('#uxfil'),q=$('#q'),gl=$('#gl');if(!d||!q||!gl||V.querySelector('#uxtop'))return;
 const h2=V.querySelector('h2');if(h2)h2.classList.add('sr');
 // barra: ricerca + pulsante Filtri (il pannello resta il <details>, chiuso all'apertura)
 d.open=false;const top=document.createElement('div');top.id='uxtop';top.className='uxtop';q.before(top);top.append(q);
 const fb=document.createElement('button');fb.type='button';fb.id='uxfb';fb.className='uxfb';fb.setAttribute('aria-controls','uxfil');top.append(fb);
 const sm=d.querySelector('summary');const syncB=()=>{fb.innerHTML=sm.innerHTML;fb.setAttribute('aria-expanded',d.open?'true':'false');fb.classList.toggle('on',d.open)};syncB();
 new MutationObserver(syncB).observe(sm,{childList:true,subtree:true});d.addEventListener('toggle',syncB);fb.onclick=()=>{d.open=!d.open;syncB()};
 // titolo collezione + Ordina, fuori dalla card, subito sopra la lista
 const cnt=$('#gcnt'),srt=V.querySelector('.uxsort'),foot=cnt&&cnt.parentNode;const hd=document.createElement('div');hd.className='uxcolh';
 hd.innerHTML='<h3>📚 La nostra collezione <span class="muted">·</span> <span id="uxn"></span></h3>';if(srt)hd.append(srt);gl.before(hd);
 const num=()=>{$('#uxn').textContent=cnt?cnt.textContent:''};if(cnt){num();new MutationObserver(num).observe(cnt,{childList:true,characterData:true,subtree:true})}const gf=cnt&&cnt.closest('.gfoot');if(gf)gf.hidden=true;else if(cnt)cnt.hidden=true;
 // altri blocchi che stavano sopra la ricerca
 const cta=V.querySelector('.cwz-cta');if(cta)cta.remove();const ig=V.querySelector('.igcard');if(ig)gl.after(ig);
 // copertine + consigliere dopo i primi 4 giochi
 const gs=await DB.games(),th={};gs.forEach(g=>th[g.id]=typeof safeUrl==='function'?safeUrl(g.thumb,true):null);
 const deco=()=>{gl.querySelectorAll('.gitem[data-gp]:not(.uxth)').forEach(it=>{it.classList.add('uxth');const u=th[it.dataset.gp];const w=document.createElement('div');w.className='gtx';while(it.firstChild)w.append(it.firstChild);
   const c=document.createElement('div');c.className='gcov';c.setAttribute('aria-hidden','true');if(u){const im=document.createElement('img');im.src=u;im.alt='';im.loading='lazy';im.decoding='async';im.width=48;im.height=48;im.referrerPolicy='no-referrer';im.onerror=()=>{im.remove();c.textContent='🎲'};c.append(im)}else c.textContent='🎲';it.append(c,w)});
  if(!gl.querySelector('#uxcons')){const its=gl.querySelectorAll('.gitem');if(its.length){const k=document.createElement('div');k.id='uxcons';k.className='eqc uxcons';k.setAttribute('role','button');k.tabIndex=0;k.setAttribute('aria-label','Non sai cosa scegliere? Consigliami un gioco');
   k.innerHTML='<span class="eqi" aria-hidden="true">✨</span><span class="eqt"><b>Non sai cosa scegliere?</b><small>Poche domande e ti proponiamo 3 giochi</small></span><span class="eqgo" aria-hidden="true">Consigliami ›</span>';
   k.onclick=()=>cChoose();k.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();cChoose()}};(its[3]||its[its.length-1]).after(k)}}};
 deco();new MutationObserver(()=>deco()).observe(gl,{childList:true})});

// 4 — Record: sezioni a blocchi richiudibili
_uxWrap('record',()=>UX.recFix(V));
_uxWrap('stats',()=>UX.accApply(V));
_uxWrap('profilo',()=>{UX.accApply(V);UX.hdr()});

// 8 — Altro > Partite (staff): lista a pezzi
new MutationObserver(()=>{const a=document.getElementById('aplays');if(a&&!a.dataset.uxc){a.dataset.uxc='1';UX.chunk(a)}
 const v=document.getElementById('view');if(v){if(window._cur==='record'&&v.querySelector('.xptop:not(details .xptop),h3.rsec')||(v.querySelector('#uxnums')||{}).nextElementSibling||!v.querySelector('#uxnums'))UX.recFix(v);UX.accApply(v)}}).observe(document.getElementById('view'),{childList:true,subtree:true});
addEventListener('hashchange',()=>setTimeout(()=>UX.hdr(),0));
document.getElementById('tabs').addEventListener('click',()=>setTimeout(()=>UX.hdr(),0));

// 10 — avvio dalla copia locale: quando arrivano i dati aggiornati ridisegno la pagina, ma solo se non stai scrivendo
document.addEventListener('pergioco-refreshed',()=>{const busy=document.querySelector('.gpg,.mdl,.modal,.sheet')||/INPUT|SELECT|TEXTAREA/.test((document.activeElement||{}).tagName||'')||['nuova','altro'].includes(window._cur);
 if(busy||scrollY>200||!window._cur||document.body.classList.contains('gate'))return;go(window._cur)});
