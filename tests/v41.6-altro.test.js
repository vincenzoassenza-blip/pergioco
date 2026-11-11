// node tests/v41.6-altro.test.js — v41.6: Altro (socio) / Gestione (staff) secondo i mockup approvati, punti 1-7 + statistiche admin nel profilo
const pw=require('playwright-core'),fs=require('fs');const {altro}=require('./screenshots-altro.js');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 // --- socio
 {const p=await altro(b,'socio',1100);const errs=[];p.on('pageerror',e=>errs.push(e.message));const q=f=>p.evaluate(f);
  chk(await q(()=>document.querySelector('#view h2.altit').textContent==='Altro'&&document.querySelector('#view>.hrow').hidden),'socio: titolo «Altro»');
  chk(await q(()=>{const m=document.querySelector('.almenu');const t=[...m.querySelectorAll('.alr b')].map(x=>x.textContent);return t[0]==='Il mio account'&&t.includes("Esci dall'account")&&t.includes("Info sull'associazione")&&t.includes('Seguici su Instagram')}),'1: menu account / info / Instagram');
  chk(await q(()=>{const k=document.querySelector('.alacc .alkw');return k&&k.textContent==='vincenzo.assenza@…'&&!document.querySelector('.alacc').open}),'1: chip email ridotta, account chiuso');
  chk(await q(()=>/Associazione PerGioco · Ragusa/.test(document.querySelector('.alinfo .sub').textContent)),'1: info «Associazione X · Città»');
  chk(await q(()=>{const a=document.querySelector('.almenu a.igx');return a&&a.href===IG.url&&a.rel.includes('noopener')&&a.querySelector('.alkw').textContent===IG.tag}),'1: Instagram con chip @tag');
  chk(await q(()=>{const s=document.querySelector('.alstaff');const cs=[...document.querySelectorAll('#view>.card,#view>details')];return s&&!s.open&&s.contains(document.getElementById('adm'))&&cs.indexOf(s)===cs.length-1&&s.querySelector('summary .ali')}),'1: «🔒 Accesso staff ⓘ» in fondo, chiuso, contiene il login');
  chk(await q(()=>[...document.querySelectorAll('#adm label')].filter(l=>/^(Email|Password)/.test(l.textContent)).every(l=>l.querySelector('.req'))),'6: Email * Password *');
  chk(await q(()=>!document.getElementById('allist')&&!document.getElementById('alstr')&&!document.getElementById('bkp')),'socio: niente elenco staff né strumenti');
  chk(await q(()=>document.querySelector('.alfoot').textContent==='PerGioco · v'+APP_VERSION&&/^41\.\d+(\.\d+)?$/.test(APP_VERSION)&&+String(APP_VERSION).split('.')[1]>=6&&!/40\.6/.test(document.getElementById('view').textContent)),'7: versione = APP_VERSION');
  chk(await q(()=>!document.querySelector('#view>.igl')&&![...document.querySelectorAll('#view>.card.muted')].length),'vecchio piè di pagina e riga IG tolti');
  let lo=0;await q(()=>{window.confirmLogout=async()=>{window._lo=1}});await p.click('.alacc>summary');await p.click('.alacc .alsub');chk(await q(()=>window._lo===1),'1: «Esci dall\'account» chiama confirmLogout');
  chk(await q(()=>[...document.querySelectorAll('.alr')].every(r=>getComputedStyle(r).textDecorationLine==='none'&&getComputedStyle(r).cursor==='pointer')),'righe senza sottolineatura, cliccabili');
  // admin in modalità utente: vista socio, accesso staff con il cambio modalità
  await q(()=>{admin=true;localStorage.setItem('pergioco-mode','user');go('altro')});await W(1000);
  chk(await q(()=>!adminMode()&&document.querySelector('.alstaff #tm')&&!document.getElementById('allist')),'admin in modalità utente: solo menu socio');
  chk(errs.length===0,'socio: nessun errore JS '+errs.join('|'));await p.context().close()}
 // --- staff
 {const p=await altro(b,'staff',1100);const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.dismiss());const q=f=>p.evaluate(f);
  chk(await q(()=>document.querySelector('#view h2.altit').textContent==='Gestione'),'staff: titolo «Gestione»');
  const rows=await q(()=>[...document.querySelectorAll('#allist>.alr b')].map(b=>b.textContent));
  chk(JSON.stringify(rows.slice(0,4))==='["Soci","Partite","Codici","Moderatori"]'&&rows.includes('Statistiche associazione')&&rows.includes('Libri sociali')&&rows.includes('Configurazione')&&rows.some(t=>/Antero/.test(t)),'3: elenco unico '+rows.join(','));
  chk(await q(()=>document.querySelectorAll('#view>.card:not(#allist):not(.alinfo):not(.alpink)').length===0||[...document.querySelectorAll('#view>.card')].filter(c=>c.offsetParent&&!/allist|alstr/.test(c.id)&&!c.classList.contains('alinfo')&&!c.classList.contains('alaccs')).length===0),'3: nessun altro pannello visibile');
  chk(await q(()=>{const r=document.querySelector('[data-alt=soci]');return r.querySelector('.alchip').textContent==='4 attivi'&&r.querySelector('.ar').textContent==='▾'&&r.nextElementSibling.id==='adm'}),'4: Soci aperto con chip «4 attivi»');
  chk(await q(()=>{const A=document.getElementById('adm');return A.querySelector('.alq').placeholder==='🔍 Cerca socio per nome o tessera'&&[...A.querySelectorAll('.alsoc')].every(w=>w.hidden)&&/L'elenco dei soci compare dopo la ricerca/.test(A.textContent)&&A.querySelector('.alform').hidden&&A.querySelector('.alnew b').textContent==='Nuovo socio'}),'4: solo riepilogo + ricerca, elenco nascosto, form chiuso');
  chk(await q(()=>document.getElementById('mn').placeholder.endsWith(' *')),'6: Nome *');
  await p.fill('.alq','neri');chk(await q(()=>{const v=[...document.querySelectorAll('.alsoc')].filter(w=>!w.hidden);return v.length===1&&v[0].textContent.includes('<b>Neri</b>')&&!document.querySelector('.alsoc b b')}),'4: ricerca, nome con XSS mostrato come testo');
  await p.fill('.alq','zzz');chk(await q(()=>[...document.querySelectorAll('.alhint')].some(h=>!h.hidden&&h.textContent==='Nessun socio trovato.')),'4: nessun risultato');
  await p.fill('.alq','giu');chk(await q(()=>{const w=[...document.querySelectorAll('.alsoc')].find(w=>!w.hidden);const s=w.querySelector('.alsch');return s.hidden&&s.querySelector('[data-t]')&&!w.querySelector('.alsr [data-t]')}),'5: «Disattiva» dentro la scheda, chiusa');
  await p.click('.alsoc:not([hidden]) .alsr');chk(await q(()=>{const w=[...document.querySelectorAll('.alsoc')].find(w=>!w.hidden);return !w.querySelector('.alsch').hidden&&w.querySelector('.alsr .ar').textContent==='▾'&&/Disattiva/.test(w.querySelector('[data-t]').textContent)}),'5: scheda aperta ▾ con Disattiva');
  await p.click('.alsoc:not([hidden]) [data-e]');await W(500);chk(await q(()=>{const f=document.querySelector('.alform');return !f.hidden&&document.getElementById('mn').value==='Giulia'&&document.querySelector('.alnew b').textContent==='Modifica socio'&&document.querySelector('.alq').value==='giu'}),'modifica: form aperto, ricerca conservata');
  await q(()=>{document.getElementById('mx').click()});await W(400);
  await p.click('.alnew');await q(()=>{document.getElementById('mn').value='';document.getElementById('msv').click()});await W(400);chk(await q(()=>/Il nome è obbligatorio/.test(document.body.textContent)||document.querySelectorAll('.alsoc').length===4),'validazione nome invariata');
  // Strumenti avanzati
  chk(await q(()=>{const s=document.getElementById('alstr');const cs=[...document.querySelectorAll('#view>*')].filter(x=>x.offsetParent);return s&&!s.open&&s.querySelector('#ex')&&s.querySelector('#im')&&s.querySelector('#alphone')&&/Backup, importazione, dati del telefono/.test(s.querySelector('summary').textContent)&&cs.indexOf(s)>cs.indexOf(document.getElementById('allist'))}),'2: Strumenti avanzati chiuso, in fondo, con backup e dati del telefono');
  chk(await q(()=>{const c=getComputedStyle(document.getElementById('alstr')).backgroundColor;const m=c.match(/[\d.]+/g).map(Number);return m[0]>m[2]}),'2: sfondo rosato');
  // accordion: Partite
  await p.click('[data-alt=partite]');await W(700);chk(await q(()=>{const r=document.querySelector('[data-alt=partite]');return adminTab==='partite'&&r.nextElementSibling.id==='adm'&&r.querySelector('.ar').textContent==='▾'&&document.querySelector('[data-alt=soci] .ar').textContent==='▸'&&document.getElementById('aplays')}),'3: Partite si apre sotto la riga');
  await p.click('[data-alt=partite]');await W(200);chk(await q(()=>document.getElementById('adm').hidden&&document.querySelector('[data-alt=partite] .ar').textContent==='▸'),'3: richiusura ▸');
  await q(()=>{window._g=null;const o=go;window.go=v=>{window._g=v};document.querySelector('[data-alb=acfg]').click();window.go=o});chk(await q(()=>window._g==='config'),'3: Configurazione raggiungibile');
  await q(()=>{window._g=null;const o=go;window.go=v=>{window._g=v};document.querySelector('[data-alb=ast]').click();window.go=o});chk(await q(()=>window._g==='stats'),'3: Statistiche associazione');
  chk(await q(()=>new RegExp('^PerGioco · v'+APP_VERSION.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+' · 📸 @').test(document.querySelector('.alfoot').textContent)),'7: «PerGioco · v{APP_VERSION} · 📸 @tag»');
  // moderatore: niente Configurazione, Partite, Moderatori, Strumenti
  await q(()=>{DB.remote.modCached=true;go('altro')});await W(1000);
  chk(await q(()=>{const t=[...document.querySelectorAll('#allist>.alr b')].map(b=>b.textContent);return !t.includes('Configurazione')&&!t.includes('Partite')&&!t.includes('Moderatori')&&t.includes('Soci')&&document.getElementById('alstr').hidden}),'mod: niente Configurazione / Strumenti');
  await q(()=>{DB.remote.modCached=false});
  // profilo di un altro socio
  await q(()=>{window._pv='m2';go('profilo')});await W(1500);
  chk(await q(()=>{const c=document.getElementById('aladm');return c&&c.querySelector('.pfsec').textContent.includes('Statistiche complete')&&c.querySelector('.pfc').textContent==='solo admin'&&c.querySelectorAll('details.pfd').length>=4&&c.querySelector('details.pfd').open&&![...c.querySelectorAll('details.pfd')].slice(1).some(d=>d.open)&&![...document.querySelectorAll('#view>h2')].some(h=>/Statistiche complete/.test(h.textContent))}),'profilo: statistiche admin nello stile nuovo ▸/▾');
  await q(()=>{localStorage.setItem('pergioco-mode','user');go('profilo')});await W(1500);chk(await q(()=>!document.getElementById('aladm')&&!/Statistiche complete/.test(document.getElementById('view').textContent)),'profilo in modalità utente: niente statistiche admin');
  chk(errs.length===0,'staff: nessun errore JS '+errs.join('|'));await p.context().close()}
 // statico
 const s=fs.readFileSync(__dirname+'/../altro.js','utf8'),h=fs.readFileSync(__dirname+'/../index.html','utf8'),sw=fs.readFileSync(__dirname+'/../sw.js','utf8'),css=fs.readFileSync(__dirname+'/../styles.css','utf8');
 chk(!/innerHTML|insertAdjacentHTML|outerHTML/.test(s),'altro.js senza innerHTML');chk(!/club|ludoteca/i.test(s),'niente «club»/«ludoteca»');
 chk(/classifica\.js\?v=41\.5"><\/script><script src="altro\.js\?v=41\.\d+(\.\d+)?"><\/script>/.test(h)&&/pergioco-v41\.\d+/.test(sw)&&/altro\.js\?v=41\.\d+/.test(sw)&&/styles\.css\?v=41\.\d+/.test(h)&&/APP_VERSION='41\.\d+(\.\d+)?'/.test(fs.readFileSync(__dirname+'/../brand.js','utf8')),'versione 41.6+, altro.js dopo classifica');
 const {cssBlock}=require('./appver');const blk=cssBlock('v41.6');chk(blk.length>100&&!/#[0-9a-f]{3,6}\b/i.test(blk.replace(/#(adm|alstr|allist|alphone|aladm)\b/g,'')),'CSS v41.6 solo variabili');
 chk(/adminMode\(\)\)staff\(V\)/.test(s)&&/if\(!h\|\|!adminMode\(\)\)return/.test(s),'staff controlla adminMode()');
 await b.close();console.log(`${ok}/${n}`);process.exit(ok===n?0:1)})();
