// node tests/v40.5.1.test.js — Giochi: nessun frame con la vecchia schermata (prima del paint la pagina è già Proposta A)
const fs=require('fs');const sw=fs.readFileSync(__dirname+'/../sw.js','utf8'),gj=fs.readFileSync(__dirname+'/../giochi.js','utf8');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
chk(/pergioco-v40\.(5\.1|[6-9]|\d\d)[.0-9]*'/.test(sw)&&/ux40\.js\?v=40\.(5\.1|[6-9]|\d\d)/.test(sw),'versione 40.5.1');chk(/function gCov/.test(gj)&&!/onerror=/.test(gj),'copertine nel render di giochi.js, senza handler inline');
// sonda: a ogni frame (rAF = subito prima del paint) annota se si vede qualcosa della vecchia schermata
const PROBE=()=>{window.__bad=[];window.__frames=0;const vis=e=>e&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('.sr,[hidden]')&&e.getBoundingClientRect().width>2;
 const tick=()=>{const V=document.getElementById('view');if(V&&V.querySelector('.gflt')){window.__frames++;const b=[];
  const h=[...V.querySelectorAll('h2')].find(x=>/I nostri giochi/.test(x.textContent));if(vis(h))b.push('h2');
  if(vis(V.querySelector('.cwz-cta')))b.push('cta');const ig=V.querySelector('.igcard'),gl=V.querySelector('#gl');if(vis(ig)&&gl&&(ig.compareDocumentPosition(gl)&4))b.push('ig-sopra');
  if(vis(V.querySelector('details#adv>summary')))b.push('altri-filtri');if(!V.querySelector('#uxtop'))b.push('no-uxtop');if(!V.querySelector('.uxcolh'))b.push('no-titolo');
  if([...V.querySelectorAll('#gl .gitem')].some(x=>!x.querySelector('.gcov')))b.push('no-cover');if(V.querySelectorAll('#gl .gitem').length>=5&&!V.querySelector('#uxcons'))b.push('no-cons');
  if(b.length)window.__bad.push(b.join(','))}requestAnimationFrame(tick)};requestAnimationFrame(tick)};
(async()=>{const pw=require('playwright-core');const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});const errs=[];
 const run=async(name,ctx,how)=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(name+': '+e.message));await p.route(/supabase|jsdelivr/,r=>r.abort());
  await p.goto('http://localhost:8799/',{waitUntil:'load'});await p.waitForTimeout(2000);
  await p.evaluate(()=>{document.body.classList.remove('gate');const gs=['Azul','Brass','Catan','Dixit','Everdell','Flamecraft'].map((x,i)=>({id:'g'+i,name:x,min:2,max:4,minT:30,maxT:60,thumb:i?null:'https://img.test/0.svg'}));
   DB.games=async()=>gs;DB.plays=async()=>[];DB.members=async()=>[];if(window.XP)XP.ensure=async()=>{};
   // rete lenta: banner Wrapped e card Instagram arrivano dopo (è lì che prima si vedeva la vecchia pagina)
   if(window.WR){WR.banner=()=>new Promise(r=>setTimeout(()=>r(null),700))}if(window.IG)IG.card=()=>'<div class="card igcard">IG</div>'});
  await p.evaluate(PROBE);await how(p);await p.waitForTimeout(1500);const r=await p.evaluate(()=>({f:window.__frames,bad:[...new Set(window.__bad)]}));
  chk(r.f>5&&!r.bad.length,name+': nessun frame vecchio ('+r.f+' frame; '+r.bad.join('|')+')');await p.close()};
 const c1=await b.newContext({viewport:{width:460,height:900},serviceWorkers:'block'});
 await run('apertura tab Giochi',c1,p=>p.evaluate(()=>go('ludoteca')));
 await run('ridisegno da cache locale (pergioco-refreshed)',c1,async p=>{await p.evaluate(()=>{go('ludoteca')});await p.waitForTimeout(1000);await p.evaluate(()=>{window.__bad=[];scrollTo(0,0);document.dispatchEvent(new Event('pergioco-refreshed'))})});
 const c2=await b.newContext({viewport:{width:460,height:900}});const w=await c2.newPage();await w.goto('http://localhost:8799/');await w.waitForTimeout(3000);await w.reload();await w.waitForTimeout(1500);
 const ctl=await w.evaluate(()=>!!navigator.serviceWorker.controller);await w.close();chk(ctl,'SW attivo per la prova con cache');
 await run('con cache SW',c2,p=>p.evaluate(()=>go('ludoteca')));
 chk(!errs.length,'nessun errore JS '+errs.join('|'));console.log(`v40.5.1: ${ok}/${n}`);await b.close();process.exit(ok===n?0:1)})();
