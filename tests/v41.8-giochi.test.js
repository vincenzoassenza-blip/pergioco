// node tests/v41.8-giochi.test.js — v41.8 Giochi: striscia Oggi (solo numeri) e Ordina nel titolo
const pw=require('playwright-core'),fs=require('fs');const{gio}=require('./screenshots-giochi.js');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 for(const role of['socio','staff']){const p=await gio(b,role,'oggi',900);const errs=[];p.on('pageerror',e=>errs.push(e.message));const q=f=>p.evaluate(f);
  const s=await q(()=>{const e=document.getElementById('g8s');return e&&{t:e.textContent,first:e.nextElementSibling&&(e.nextElementSibling.id==='uxtop'||!!e.nextElementSibling.querySelector('#uxtop')),tag:e.tagName,td:getComputedStyle(e).textDecorationLine,soft:e.classList.contains('g8soft')}});
  chk(s&&s.t==='📅 Oggi · 2 tavoli · 4 posti liberi▸',role+': striscia Oggi '+(s&&s.t));
  chk(s&&s.first&&s.tag==='BUTTON'&&s.td==='none'&&!s.soft,role+': in cima, pulsante senza sottolineatura');
  chk(await q(()=>!/Vincenzo|Giulia|Marco|Sara|Neri|Catan|Dixit|<b>/.test(document.getElementById('g8s').textContent)),role+': nessun nome nella striscia');
  const h=await q(()=>{const h3=document.querySelector('.uxcolh h3'),s=h3&&h3.querySelector('select#so');return h3&&{t:h3.textContent.replace(/\s+/g,' ').trim(),sel:!!s,lbl:s&&s.getAttribute('aria-label'),one:h3.getBoundingClientRect().height<40,und:getComputedStyle(s).textDecorationLine}});
  chk(h&&h.sel&&/^📚 La nostra collezione · 6 giochi · Per nome/.test(h.t)&&!/Ordina:/.test(h.t),role+': Ordina sulla riga del titolo '+(h&&h.t));
  chk(h&&h.lbl==='Ordina'&&h.one&&h.und==='none',role+': una riga, accessibile');
  await q(()=>{const s=document.getElementById('so');s.value='p';s.dispatchEvent(new Event('change',{bubbles:true}))});await W(500);
  chk(await q(()=>document.querySelector('.uxcolh h3 #so').value==='p'&&document.querySelector('#gl .gitem')),role+': Ordina funziona');
  chk(await q(()=>{const c=document.getElementById('uxcons'),its=[...document.querySelectorAll('#gl .gitem')];return c&&its[3]&&its[3].nextElementSibling===c}),role+': consigliere dopo il 4° gioco');
  chk(await q(()=>{const ig=document.querySelector('#view>.igcard');return !ig||ig.previousElementSibling===document.getElementById('gl')}),role+': Instagram in fondo');
  await p.click('#g8s');await W(1500);chk(await q(()=>!!document.querySelector('.agdays [data-d].on')&&document.querySelector('.agdays [data-d].on').dataset.d===romeToday()&&document.querySelector('nav [data-v="serata"]').classList.contains('on')),role+': tocco → Agenda su Oggi');
  chk(errs.length===0,role+': nessun errore JS '+errs.join('|'));await p.context().close()}
 {const p=await gio(b,'socio','prossimo',900);const q=f=>p.evaluate(f);const s=await q(()=>{const e=document.getElementById('g8s');return e&&{t:e.textContent,soft:e.classList.contains('g8soft'),d:e.dataset.d}});
  chk(s&&s.soft&&/^📅 Prossimo tavolo · \S+ \d+ \S+ · 3 posti liberi▸$/.test(s.t),'senza tavoli oggi: striscia discreta col prossimo '+(s&&s.t));
  await p.click('#g8s');await W(1500);chk(await p.evaluate(d=>document.querySelector('.agdays [data-d].on').dataset.d===d,s.d),'prossimo → Agenda su quel giorno');await p.context().close()}
 {const p=await gio(b,'socio','nessuno',900);chk(await p.evaluate(()=>!document.getElementById('g8s')&&!!document.querySelector('.uxcolh h3 #so')),'nessun tavolo in vista: nessuna striscia');await p.context().close()}
 {const p=await gio(b,'socio','oggi',900);const q=f=>p.evaluate(f);await q(()=>{_TS.splice(1);_TS[0].players=[1,2,3,4].map(i=>({memberId:'m'+i}));go('agenda'==='x'?'':'serata')});await W(800);await q(()=>go('ludoteca'));await W(1200);
  chk(await q(()=>document.getElementById('g8s').textContent==='📅 Oggi · 1 tavolo · nessun posto libero▸'&&document.querySelectorAll('#g8s').length===1),'singolare e tavolo pieno, una sola striscia');
  await q(()=>{TXT.v=Object.assign({},TXT.v||{},{g8_oggi:'<i>Stasera</i>'});go('serata')});await W(600);await q(()=>go('ludoteca'));await W(1200);
  chk(await q(()=>document.querySelector('#g8s .g8h').textContent==='<i>Stasera</i>'&&!document.querySelector('#g8s i')),'testi dalla config, come testo');await p.context().close()}
 const css=fs.readFileSync(__dirname+'/../styles.css','utf8'),js=fs.readFileSync(__dirname+'/../giochi-oggi.js','utf8'),h=fs.readFileSync(__dirname+'/../index.html','utf8'),sw=fs.readFileSync(__dirname+'/../sw.js','utf8');
 const blk=css.slice(css.indexOf('/* v41.8'));chk(blk.length>100&&!/#[0-9a-f]{3,6}\b(?!f)/i.test(blk.replace(/#fff\b/g,'')),'CSS v41.8: colori da variabili');
 chk(!/innerHTML|insertAdjacentHTML|outerHTML/.test(js)&&!/club|ludoteca/i.test(js.replace(/'ludoteca'/g,'')),'giochi-oggi.js: solo textContent');
 chk(/header\.js\?v=41\.7"><\/script><script src="giochi-oggi\.js\?v=41\.8"><\/script><\/body>/.test(h)&&sw.includes('pergioco-v41.8')&&sw.includes('giochi-oggi.js?v=41.8')&&h.includes('styles.css?v=41.8')&&fs.readFileSync(__dirname+'/../brand.js','utf8').includes("APP_VERSION='41.8'"),'versione 41.8, giochi-oggi.js ultimo');
 await b.close();console.log(`${ok}/${n}`);process.exit(ok===n?0:1)})();
