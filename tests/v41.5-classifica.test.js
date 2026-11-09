// node tests/v41.5-classifica.test.js — v41.5: Classifica (tab Record) secondo il mockup approvato, punti 1-6
const pw=require('playwright-core'),fs=require('fs');const {setup}=require('./screenshots-classifica.js');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 for(const role of ['socio','staff']){const errs=[];let alerted=false;const R=s=>`[${role}] ${s}`;
  const p=await setup(b,role,1600);p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{alerted=true;d.dismiss()});const q=f=>p.evaluate(f);
  chk(await q(()=>document.querySelector('#view h2').textContent==='Record'),R('titolo invariato «Record» (punto 7 in sospeso)'));
  // 2 periodo
  chk(await q(()=>{const s=document.getElementById('clper');return s&&s.options[s.selectedIndex].textContent.includes('Tutto')&&s.options.length===Object.keys(PF_L).length&&!document.querySelector('.pfchips')&&document.querySelector('.pfbar').hidden}),R('un solo menu Periodo con «Tutto», chip nascosti'));
  chk(await q(async()=>{const s=document.getElementById('clper');s.value='1m';s.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,2500));const a=pfGet().k==='1m'&&document.getElementById('clper').value==='1m'&&document.querySelectorAll('.clhd').length===1&&document.querySelectorAll('.clrec').length===1;
   const t=document.getElementById('clper');t.value='c';t.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,2500));const c=!document.querySelector('.pfbar').hidden&&!!document.getElementById('pfda');
   const u=document.getElementById('clper');u.value='all';u.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,2500));return a&&c&&pfGet().k==='all'}),R('cambio periodo ri-disegna una volta; Personalizzato mostra le date'));
  // 1 podio
  chk(await q(()=>{const d=document.querySelector('details.accx');const c=[...document.querySelectorAll('.clp')];return d.open&&d.previousElementSibling.classList.contains('clhd')&&c.map(x=>x.querySelector('b').textContent).join('|')==='Marco B.|Giulia R.|Tu'&&c[1].classList.contains('p1')&&c[2].classList.contains('me')&&c.every(x=>x.dataset.pv)}),R('podio aperto in cima, ordine 2°/1°/3°, «Tu» evidenziato'));
  chk(await q(()=>document.querySelector('.clme').textContent.includes('Tu: 3°')&&document.querySelector('.clme').textContent.includes('820 XP')&&document.querySelector('.xptop').hidden),R('riga «Tu» con posizione, lista completa chiusa'));
  chk(await q(async()=>{const r=document.querySelector('.clall');r.click();const a=!document.querySelector('.xptop').hidden&&r.textContent.includes('▾')&&r.getAttribute('aria-expanded')==='true';r.click();const c=document.querySelector('.xptop').hidden&&r.textContent.includes('▸');document.querySelector('.clme').click();await new Promise(r=>setTimeout(r,100));return a&&c&&!document.querySelector('.xptop').hidden}),R('«Tutta la classifica» ▸/▾ e «Tu» apre la lista'));
  // 3 record
  chk(await q(()=>{const L=[...document.querySelectorAll('.clrec>.clrw .t small')].map(s=>s.textContent);return L.join('|')==='Più presente|Più vittorie|Più partite|Miglior % di vittorie|Più giochi diversi|Gioco più giocato'}),R('6 record principali in ordine'));
  chk(await q(()=>{const m=document.querySelector('.clmore');return m&&/Altri record\s*\(?\d+/.test(m.textContent)&&m.textContent.includes('▸')&&!document.querySelector('.clsub')&&document.querySelector('.rov').hidden}),R('«Altri record (N) ▸» chiuso'));
  // 4 pareggi + testi brevi
  chk(await q(()=>{const r=[...document.querySelectorAll('.clrow')].find(x=>x.textContent.includes('Gioco più giocato'));return /^\+\d+$/.test(r.querySelector('.tie').textContent)&&r.querySelectorAll('.who').length===1}),R('pareggi come +N con un solo nome'));
  chk(await q(()=>[...document.querySelectorAll('.clrow .pill')].every(p=>!p.textContent.includes('(')&&p.textContent.length<=24)),R('pill del valore brevi, senza parentesi'));
  // 6 righe cliccabili
  chk(await q(async()=>{const r=document.querySelector('.clrec .clrow');const a=r.textContent.includes('▸')&&!r.dataset.pv&&getComputedStyle(r).textDecorationLine==='none'&&r.getAttribute('role')==='button';r.click();await new Promise(r=>setTimeout(r,50));const r2=document.querySelector('.clrec .clrow');const d=r2.parentElement.querySelector('.cldet');const o=r2.textContent.includes('▾')&&d&&d.querySelector('[data-pv]');r2.click();return a&&o&&!document.querySelector('.clrec .cldet')}),R('riga ▸ apre ▾ dettaglio con link, si richiude'));
  chk(await q(async()=>{document.querySelector('.clmore').click();await new Promise(r=>setTimeout(r,50));const s=document.querySelector('.clsub');const t=[...s.querySelectorAll('small')].map(x=>x.textContent);const ok=t.includes('Pioniere')&&!t.some(x=>x.length>30)&&document.querySelector('.clmore').textContent.includes('▾');document.querySelector('.clmore').click();return ok}),R('Altri record si apre ▾ con etichette brevi'));
  chk(await q(()=>{const r=document.querySelector('.clrec .clrow');r.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}));const o=!!document.querySelector('.clrec .cldet');document.querySelector('.clrec .clrow').click();return o}),R('righe apribili da tastiera'));
  // 5 icone
  chk(await q(async()=>{document.querySelector('.clmore').click();await new Promise(r=>setTimeout(r,50));const i=[...document.querySelectorAll('.clrec .clrow:not(.clmore) .ic')].map(x=>x.textContent);document.querySelector('.clmore').click();return i.length>8&&new Set(i).size===i.length}),R('icone tutte diverse'));
  // sezioni + escaping
  chk(await q(()=>document.querySelector('#rgames>summary b').textContent.startsWith('📊 Statistiche per gioco')&&document.querySelector('#uxnums>summary b').textContent.startsWith('🏛️')&&document.getElementById('view').lastElementChild.id==='uxnums'),R('sezioni con icone, #uxnums in fondo'));
  chk(await q(async()=>{document.querySelector('.clmore').click();await new Promise(r=>setTimeout(r,50));const v=document.getElementById('view');const x=!v.querySelector('.clrec b b,.clrec img')&&v.querySelector('.clrec').textContent.includes('<b>Neri</b>');document.querySelector('.clmore').click();return x}),R('nomi con HTML mostrati come testo'));
  chk(await q(()=>(document.querySelector('[data-act="go:stats"]')!==null)===(document.body.dataset.r==='staff'||admin)),R('pulsante statistiche admin solo staff'));
  chk(!alerted&&!errs.length,R('nessun errore/alert: '+errs.join(';')));await p.close()}
 const s=fs.readFileSync(__dirname+'/../sw.js','utf8'),h=fs.readFileSync(__dirname+'/../index.html','utf8'),c=fs.readFileSync(__dirname+'/../classifica.js','utf8');
 chk(/pergioco-v41\.\d+/.test(s)&&s.includes('classifica.js?v=41.5')&&/community\.js\?v=41\.\d+(?:\.\d+)?"><\/script><script src="classifica\.js\?v=41\.5/.test(h)&&fs.readFileSync(__dirname+'/../brand.js','utf8').match(/APP_VERSION='41\.\d+(?:\.\d+)?'/),'versione 41.5+, classifica.js dopo community');
 const css=fs.readFileSync(__dirname+'/../styles.css','utf8').split('/* v41.5')[1]||'';chk(css&&!/#[0-9a-f]{3,6}\b|rgb\(/i.test(css)&&!/text-decoration:\s*underline/.test(css),'CSS v41.5 solo variabili, niente sottolineature');
 chk(!/innerHTML|insertAdjacentHTML/.test(c)&&!/\bclub\b|ludoteca/i.test(c),'classifica.js senza innerHTML e senza club/ludoteca');
 console.log(`${ok}/${n}`);await b.close();process.exit(ok===n?0:1)})();
