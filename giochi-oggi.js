// v41.8 — pagina Giochi: striscia «📅 Oggi · N tavoli · posti liberi ▸» in cima e «Ordina» sulla riga del titolo.
// Solo numeri, nessun nome di socio. Testi in G8.T (sovrascrivibili da TXT se presenti), colori da variabili CSS. Solo textContent.
(()=>{const T={oggi:'📅 Oggi',tav1:'tavolo',tavN:'tavoli',lib1:'posto libero',libN:'posti liberi',pieni:'nessun posto libero',prox:'📅 Prossimo tavolo',ordina:'Ordina'};
 const t=k=>(typeof TXT!=='undefined'&&TXT.v&&typeof TXT.v['g8_'+k]==='string'&&TXT.v['g8_'+k])||T[k];
 const stats=(ts,d)=>{const x=ts.filter(z=>z.date===d&&z.status==='open');return{n:x.length,lib:x.reduce((s,z)=>s+Math.max(0,(+z.seats||0)-(z.players||[]).length),0)}};
 const sp=(c,s)=>{const e=document.createElement('span');e.className=c;e.textContent=s;return e};
 async function strip(){const top=document.getElementById('uxtop');if(!top||V.querySelector('#g8s'))return;const tok={};V._g8=tok;
  let ts=[];try{ts=(await DB.allTables()).filter(z=>typeof isoOk!=='function'||isoOk(z.date))}catch(e){return}
  if(V._g8!==tok||!document.getElementById('uxtop')||V.querySelector('#g8s'))return;
  const oggi=romeToday(),o=stats(ts,oggi);let d=oggi,parts;
  if(o.n){parts=[t('oggi'),o.n+' '+(o.n===1?t('tav1'):t('tavN')),o.lib?o.lib+' '+(o.lib===1?t('lib1'):t('libN')):t('pieni')]}
  else{const nx=ts.filter(z=>z.date>oggi&&z.status==='open').map(z=>z.date).sort()[0];if(!nx)return;d=nx;const s=stats(ts,nx);
   parts=[t('prox'),UX_d(nx),s.lib?s.lib+' '+(s.lib===1?t('lib1'):t('libN')):t('pieni')]}
  const b=document.createElement('button');b.type='button';b.id='g8s';b.className='g8s'+(o.n?'':' g8soft');b.dataset.d=d;
  parts.forEach((p,i)=>{if(i)b.append(sp('g8sep',' · '));b.append(sp(i?'':'g8h',p))});b.append(sp('g8go','▸'));b.setAttribute('aria-label',parts.join(', ')+'. Apri l\'Agenda');
  b.onclick=()=>{window._ser={date:d};const n=document.querySelector('nav [data-v="serata"]');if(n)n.click();else go('serata')};
  const fl=document.getElementById('uxfil');(top.parentNode===V?top:top.closest('.card')||top).before(b)}
 function sort(){const h=V.querySelector('.uxcolh');if(!h||h.classList.contains('g8'))return;const lb=h.querySelector('.uxsort'),h3=h.querySelector('h3');if(!lb||!h3)return;
  h.classList.add('g8');lb.firstChild&&lb.firstChild.nodeType===3&&lb.firstChild.remove();const s=lb.querySelector('select');if(s)s.setAttribute('aria-label',t('ordina'));
  h3.append(sp('muted g8sep',' · '));h3.append(lb)}
 const run=()=>{if(!V.querySelector('.gflt'))return;try{sort();strip()}catch(e){console.warn('v41.8 giochi',e)}};
 new MutationObserver(run).observe(V,{childList:true});window.G8={T,run}})();
