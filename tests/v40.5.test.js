// node tests/v40.5.test.js — pagina Giochi «Proposta A»: ricerca + Filtri unico, titolo collezione, copertine, consigliere in lista
const fs=require('fs');const sw=fs.readFileSync(__dirname+'/../sw.js','utf8'),idx=fs.readFileSync(__dirname+'/../index.html','utf8');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
chk(/pergioco-v(40\.([5-9]|\d\d)|4[1-9]\.\d+)[.0-9]*'/.test(sw)&&/ux40\.js\?v=(40\.([5-9]|\d\d)|4[1-9])/.test(sw)&&/ux40\.js\?v=(40\.([5-9]|\d\d)|4[1-9])/.test(idx)&&/styles\.css\?v=(40\.([5-9]|\d\d)|4[1-9])/.test(idx),'versione 40.5');
(async()=>{const pw=require('playwright-core');const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});const errs=[];
 const c=await b.newContext({serviceWorkers:'block',viewport:{width:460,height:1000}});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
 const req=[];await p.route(/supabase|jsdelivr/,r=>r.abort());
 await p.route(/img\.test/,r=>{req.push(r.request().url());if(/bad/.test(r.request().url()))return r.abort();r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9"><rect width="9" height="9" fill="red"/></svg>'})});
 await p.goto('http://localhost:8799/',{waitUntil:'load'});await p.waitForTimeout(2500);
 await p.evaluate(()=>{document.body.classList.remove('gate');localStorage.clear();window.__x=0;
  const N=['Azul','Brass','Catan','Dixit','Everdell','Flamecraft','Gloomhaven','<img src=x onerror="window.__x=1">'];
  const gs=N.map((x,i)=>({id:'g'+i,name:x,min:2,max:4,minT:30,maxT:60,age:10,categories:['Card Game'],mechanics:['Set Collection'],thumb:i==1?null:i==2?'https://img.test/bad.svg':i==3?'javascript:alert(1)':'https://img.test/'+i+'.svg'}));
  DB.games=async()=>gs;DB.plays=async()=>[];DB.members=async()=>[];if(window.XP)XP.ensure=async()=>{};window.IG&&(IG.card=()=>'<div class="card igcard">IG</div>')});
 await p.evaluate(()=>go('ludoteca'));await p.waitForTimeout(1500);
 const r=await p.evaluate(()=>{const top=document.getElementById('uxtop'),d=document.getElementById('uxfil'),gl=document.getElementById('gl'),its=[...gl.querySelectorAll('.gitem')],k=document.getElementById('uxcons'),hd=document.querySelector('.uxcolh'),ig=document.querySelector('.igcard');
  const first=[...document.getElementById('view').querySelectorAll('*')].find(e=>e.offsetParent&&e.getBoundingClientRect().height>0&&!e.closest('.uxtop')&&e.id!=='view'&&!e.contains(top));
  return{top:!!top&&!!top.querySelector('#q')&&!!top.querySelector('#uxfb'),closed:d&&!d.open,fb:document.getElementById('uxfb').textContent,
   sub:(document.querySelector('#uxfil .uxsubt')||{}).textContent,clrHidden:document.getElementById('gclr').hidden,
   title:hd&&hd.querySelector('h3').textContent,sortInHd:!!(hd&&hd.querySelector('#so')),hdBeforeGl:hd&&hd.nextElementSibling===gl,
   oldCta:!!document.querySelector('.cwz-cta'),k:!!k,kPos:k&&k.previousElementSibling===its[3],kTxt:k&&k.textContent,kRole:k&&k.getAttribute('role'),
   igAfter:ig&&!!(gl.compareDocumentPosition(ig)&4),aboveSearch:[...document.getElementById('view').children].indexOf(document.querySelector('.gflt')),
   covs:its.map(it=>{const c=it.querySelector('.gcov'),im=c&&c.querySelector('img');return im?{src:im.getAttribute('src'),lazy:im.loading,alt:im.alt}:c&&c.textContent}),
   xss:window.__x,rawImg:gl.querySelectorAll('img:not(.gcov img)').length,name7:its[7]&&its[7].querySelector('b').textContent}});
 chk(r.top&&r.closed,'ricerca + Filtri in cima, pannello chiuso');chk(/⚙️ Filtri/.test(r.fb),'pulsante Filtri');chk(/Altro/i.test(r.sub||''),'sezione ALTRO');chk(r.clrHidden,'Azzera nascosto senza filtri');
 chk(/📚 La nostra collezione · 8 giochi/.test(r.title),'titolo con conteggio: '+r.title);chk(r.sortInHd&&r.hdBeforeGl,'Ordina sulla riga titolo');
 chk(!r.oldCta&&r.k&&r.kPos&&r.kRole==='button'&&/Non sai cosa scegliere\?/.test(r.kTxt)&&/Consigliami ›/.test(r.kTxt),'card consigliere dopo 4 giochi');
 chk(r.igAfter,'Instagram dopo la lista');chk(r.aboveSearch===1||r.aboveSearch===0,'niente blocchi sopra la ricerca ('+r.aboveSearch+')');
 chk(r.covs[0]&&r.covs[0].src==='https://img.test/0.svg'&&r.covs[0].lazy==='lazy'&&r.covs[0].alt==='','copertina lazy');chk(r.covs[1]==='🎲','fallback 🎲 senza copertina');chk(r.covs[3]==='🎲','url non https scartato');
 await p.waitForTimeout(600);chk(await p.evaluate(()=>document.querySelectorAll('.gitem')[2].querySelector('.gcov').textContent)==='🎲','fallback 🎲 se immagine non carica');
 chk(r.xss===0&&r.rawImg===0&&r.name7==='<img src=x onerror="window.__x=1">','nome gioco escapato');
 // badge conta tutti i filtri, Azzera compare
 await p.click('#uxfb');chk(await p.evaluate(()=>document.getElementById('uxfil').open),'Filtri si apre');
 await p.evaluate(()=>{const s=(id,v)=>{const e=document.getElementById(id);e.value=v||[...e.options].find(o=>o.value).value;e.dispatchEvent(new Event('change'))};s('t');s('c');s('m');s('k')});await p.waitForTimeout(300);
 const bd=await p.evaluate(()=>({b:(document.querySelector('#uxfb .uxbadge')||{}).textContent,clr:document.getElementById('gclr').hidden}));chk(bd.b==='4'&&!bd.clr,'badge conta 4 filtri e Azzera visibile ('+bd.b+')');
 await p.click('#gclr');await p.waitForTimeout(300);await p.fill('#q','az');await p.waitForTimeout(400);
 chk(/1 gioco$/.test(await p.$eval('.uxcolh h3',e=>e.textContent)),'conteggio filtrato nel titolo');chk(await p.$$eval('#uxcons',e=>e.length)===1,'card presente anche con pochi risultati');
 await p.fill('#q','');await p.waitForTimeout(400);await p.click('#uxcons');await p.waitForTimeout(500);chk(await p.$$eval('.cwz',e=>e.length)===1,'card apre il consigliere');
 chk(!errs.length,'nessun errore JS '+errs.join('|'));console.log(`v40.5: ${ok}/${n}`);await b.close();process.exit(ok===n?0:1)})();
