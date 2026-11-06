// node tests/v41.3-profilo.test.js — v41.3: pagina Profilo secondo il mockup approvato (7 punti)
const pw=require('playwright-core'),fs=require('fs');const {setup}=require('./screenshots-profilo.js');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 for(const role of ['socio','staff']){const errs=[];let alerted=false;
  const p=await setup(b,role,2700);p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{alerted=true;d.dismiss()});
  const txt=()=>p.evaluate(()=>{const v=document.getElementById('view').cloneNode(true);v.querySelectorAll('.sr,[hidden]').forEach(x=>x.remove());document.body.append(v);const t=v.innerText;v.remove();return t});
  const R=s=>`[${role}] ${s}`;let t=await txt();
  // 1 · scheda
  chk(await p.evaluate(()=>{const h=document.querySelector('.card.prof');return !!h.querySelector('#ed.pfed')&&!!h.querySelector('#pedit')&&[...h.querySelectorAll('.pfc')].map(x=>x.textContent).join('|')==='❤️ Catan|✅ account collegato'}),R('scheda con chip e modifica integrata'));
  chk(await p.evaluate(async()=>{const e=document.getElementById('ed'),b=document.getElementById('pedit');b.click();await new Promise(r=>setTimeout(r,250));const o=e.open&&e.isConnected&&/Chiudi/.test(b.textContent);b.click();await new Promise(r=>setTimeout(r,100));return o&&!e.open}),R('Modifica apre/chiude il modulo senza ridisegnare la pagina'));
  chk(await p.evaluate(()=>{const s=document.querySelector('#ed .pftg #stpub.sw');return !!s&&s.closest('#ed').querySelector('.pftg').nextElementSibling===document.getElementById('esv')}),R('interruttore privacy dentro il modulo, prima di Salva'));
  chk(await p.evaluate(async()=>{const s=document.getElementById('stpub');s.click();await new Promise(r=>setTimeout(r,200));return window._pub===true}),R('interruttore privacy salva come prima'));
  chk(await p.evaluate(async()=>{const e=document.getElementById('ed');e.open=true;document.getElementById('es').value='<b>x</b>';document.getElementById('esv').click();await new Promise(r=>setTimeout(r,300));return window._upd&&window._upd.soprannome==='<b>x</b>'&&window._upd.favGameId==='g1'}),R('Salva invariato'));
  await p.evaluate(()=>{window._pv=null;go('profilo')});await p.waitForTimeout(1500);t=await txt();
  // 2 · statistiche
  chk(await p.evaluate(()=>[...document.querySelectorAll('#st33 .pftiles .stn span')].map(x=>x.textContent).join(',')==='partite,vittorie,giochi,serate,tavoli,organizzati'),R('6 tessere come nel mockup'));
  chk(await p.evaluate(()=>{const v=document.querySelector('#st33 .pftiles .stn:nth-child(2) b').textContent;return /^\d+$/.test(v)}),R('vittorie senza percentuale nella tessera'));
  chk(await p.evaluate(()=>!document.querySelector('#view>.row')),R('riquadri Serate/Tavoli doppi tolti'));
  chk(await p.evaluate(()=>{const i=document.querySelector('#st33 .pfi'),nt=document.querySelector('#st33 .pfnote');const a=nt.hidden;i.click();return a&&!nt.hidden&&i.getAttribute('aria-expanded')==='true'}),R('ⓘ apre la nota'));
  chk(await p.evaluate(()=>/h-index/.test(document.querySelector('#pfmore').textContent)),R('h-index e ore in Abitudini'));
  // 3 · I miei giochi
  chk(await p.evaluate(()=>document.querySelector('#pfgames .pfsec').textContent==='🎲 I miei giochi'),R('titolo «I miei giochi» senza (N)'));
  chk(/Tutti i giochi \(6\)/.test(t)&&await p.evaluate(()=>document.querySelector('#pfgames .more .ar').textContent==='▸'),R('«Tutti i giochi (6) ▸»'));
  chk(await p.evaluate(()=>[...document.querySelectorAll('#pfgames .lr')].filter(x=>!x.hidden).length===4),R('anteprima 4 giochi'));
  chk(await p.evaluate(()=>{const b=document.querySelector('#pfgames .more');b.click();const o=[...document.querySelectorAll('#pfgames .lr')].every(x=>!x.hidden)&&b.querySelector('.ar').textContent==='▾'&&b.getAttribute('aria-expanded')==='true';b.click();return o&&b.querySelector('.ar').textContent==='▸'}),R('Tutti i giochi ▸ apre ▾ / richiude ▸'));
  chk(await p.evaluate(()=>[...document.querySelectorAll('#pfgames .lr')].every(r=>r.getAttribute('role')==='button'&&r.tabIndex===0&&r.lastElementChild.textContent==='▸'&&!r.querySelector('a,button'))),R('righe gioco: tutta la riga cliccabile con ▸'));
  chk(await p.evaluate(()=>{const r=document.querySelector('#pfgames .lr');return /🏆 \d+\/\d+/.test(r.textContent)&&/⭐ max/.test(r.textContent)&&/🕑/.test(r.textContent)}),R('chip vittorie / max / ultima'));
  chk(await p.evaluate(()=>[...document.querySelectorAll('#view .lr b, #view .pfsec, #view .more')].every(x=>!/underline/.test(getComputedStyle(x).textDecorationLine))),R('nessun nome sottolineato'));
  chk(await p.evaluate(()=>{const c=[...document.querySelectorAll('#view>.card')].filter(x=>/Giochi più giocati/.test(x.textContent));return !c.length}),R('niente doppione «Giochi più giocati»'));
  chk(await p.evaluate(async()=>{document.querySelector('#pfgames .lr').click();await new Promise(r=>setTimeout(r,600));return !!document.querySelector('.gpg')}),R('tocco riga gioco apre la scheda del gioco'));
  await p.evaluate(()=>{window._pv=null;go('profilo')});await p.waitForTimeout(1500);
  chk(await p.evaluate(async()=>{const bs=[...document.querySelectorAll('#st33 [data-sp]')];bs[2].click();await new Promise(r=>setTimeout(r,400));const a=document.querySelectorAll('#pfgames').length===1&&document.querySelectorAll('#pfmore').length===1&&document.querySelectorAll('#stpub').length===1&&!!document.querySelector('#st33 .pftiles');bs[0]&&document.querySelector('#st33 [data-sp="sempre"]').click();await new Promise(r=>setTimeout(r,400));return a&&document.querySelectorAll('#pfgames .lr').length===6}),R('cambio periodo ridisegna senza doppioni'));
  chk(await p.evaluate(async()=>{const tv=()=>{const s=[...document.querySelectorAll('#st33 .pftiles .stn')];return s.slice(4).map(x=>x.querySelector('b').textContent).join('/')};const r={};
   for(const k of ['sempre','12m','m','sempre']){document.querySelector(`#st33 [data-sp="${k}"]`).click();await new Promise(r=>setTimeout(r,350));r[k]=r[k]?r[k]+'|'+tv():tv()}
   const mOk=new Date().getDate()>0;return JSON.stringify(r)}).then(j=>{const r=JSON.parse(j);return r.sempre==='3/2|3/2'&&r['12m']==='2/1'&&r.m==='1/1'}),R('tessere tavoli/organizzati seguono il periodo (Sempre 3/2 · 12 mesi 2/1 · mese 1/1; futuri esclusi)'));
  // 4 · badge
  chk(await p.evaluate(()=>{const c=document.querySelector('.pfbd');const v=[...c.querySelectorAll('.badge')].filter(x=>!x.hidden);return /^🏅 Badge \d+\/\d+$/.test(c.querySelector('.pfsec').textContent)&&v.filter(x=>x.classList.contains('off')).length<=3&&/Tutti i badge \(\d+\)/.test(c.querySelector('.more').textContent)}),R('badge ottenuti + i 3 più vicini, «Tutti i badge (N) ▸»'));
  // 5 · compagni
  chk(await p.evaluate(()=>{const c=document.getElementById('pfmates');const r=c.querySelectorAll('.lr');return c.querySelector('.pfsec').textContent==='👥 Compagni di gioco'&&[...r].every(x=>x.dataset.pv&&x.lastElementChild.textContent==='▸')}),R('compagni: righe con ▸ verso il profilo'));
  chk(await p.evaluate(()=>/Sara <b>Neri<\/b>/.test(document.getElementById('pfmates').textContent)&&!document.querySelector('#pfmates b b')),R('nomi soci escapati'));
  // 6 · storico
  chk(await p.evaluate(()=>{const c=document.getElementById('pfhist');return [...c.querySelectorAll('.lr')].filter(x=>!x.hidden).length===3&&/Tutte le partite \(14\)/.test(c.querySelector('.more').textContent)&&/📅 \w{3} \d+ \w{3}/.test(c.querySelector('.lr').textContent)}),R('storico: ultime 3 + «Tutte le partite (14) ▸»'));
  // 7 · Avversari / Abitudini
  chk(await p.evaluate(()=>{const ds=[...document.querySelectorAll('#pfmore details')];return ds.length===2&&ds.every(d=>!d.open)&&/Avversari/.test(ds[0].textContent)&&getComputedStyle(ds[0].querySelector('summary'),'::after').content==='"▸"'}),R('Avversari/Abitudini chiusi con ▸'));
  chk(await p.evaluate(()=>{const d=document.querySelector('#pfmore details');d.open=true;return getComputedStyle(d.querySelector('summary'),'::after').content==='"▾"'}),R('aperto ▾'));
  chk(await p.evaluate(()=>{const ids=[...document.querySelectorAll('#view>*')].map(x=>x.id||x.className);const i=k=>ids.findIndex(x=>x===k||String(x).includes(k));return i('prof')<i('st33h')&&i('st33h')<i('pfgames')&&i('pfgames')<i('pfbd')&&i('pfbd')<i('pfmates')&&i('pfmates')<i('pfhist')&&i('pfhist')<i('pfmore')}),R('ordine sezioni come nel mockup'));
  // freccia uguale
  chk(await p.evaluate(()=>{const a=document.querySelector('#pfgames .lr .ar'),s=getComputedStyle(document.querySelector('#pfmore summary'),'::after'),c=getComputedStyle(a);return c.fontSize===s.fontSize&&c.color===s.color&&c.fontWeight===s.fontWeight}),R('freccia righe = freccia dei riepiloghi'));
  // XSS
  chk(!alerted&&await p.evaluate(()=>!document.querySelector('#view img[src="x"]')&&/<img src=x onerror=alert\(1\)>/.test(document.getElementById('view').textContent)),R('nome gioco malevolo mostrato come testo'));
  chk(!errs.length,R('nessun errore JS '+errs.join('|')));
  await p.context().close()}
 // pagina di un altro socio (staff): niente errori e niente doppioni
 {const p=await setup(b,'staff',2700);const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.evaluate(()=>openProfile('m2'));await p.waitForTimeout(1500);
  chk(!errs.length&&await p.evaluate(()=>document.querySelectorAll('#pfgames').length<=1&&!/undefined|NaN/.test(document.getElementById('view').innerText)),'profilo di un altro socio visto dallo staff');await p.context().close()}
 // sorgenti
 const src=fs.readFileSync('profilo.js','utf8'),css=fs.readFileSync('styles.css','utf8').split('/* v41.3 — Profilo')[1].split('/* v41.4')[0]||'';
 chk(!/innerHTML|insertAdjacentHTML|outerHTML/.test(src.replace(/^\/\/.*$/gm,'')),'profilo.js non usa innerHTML: dati solo via textContent');
 chk(!/#[0-9a-f]{3,6}\b/i.test(src.replace(/^\/\/.*$/gm,''))&&!/#[0-9a-f]{6}\b/i.test(css.replace(/#1e7a43/g,'')),'niente colori fissi (solo variabili; verde «ok» come nel resto dell\'app)');
 chk(!/PerGioco|Antero|\bclub\b|ludoteca/i.test(src),'nessun nome fisso, niente club/ludoteca');
 const app=fs.readFileSync('app.js','utf8')+fs.readFileSync('stats.js','utf8')+fs.readFileSync('giochi.js','utf8');chk(!/ ›</.test(app),'frecce › delle righe sostituite da ▸ in tutte le pagine');
 const idx=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');chk(/profilo\.js\?v=41\.3/.test(idx)&&/profilo\.js\?v=41\.3/.test(sw)&&/pergioco-v41\.[3-9]/.test(sw),'versione 41.3 e cache aggiornate');
 console.log(`v41.3-profilo: ${ok}/${n}`);await b.close();process.exit(ok===n?0:1)})();
