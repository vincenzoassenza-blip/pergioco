const pw=require('playwright-core');const D='/workspace/pergioco-app/screenshots/v38-errori/';
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});const errs=[];
const mk=async(name,fn,w=420,h=860)=>{const c=await b.newContext({serviceWorkers:'block',viewport:{width:w,height:h}});const p=await c.newPage();p.on('pageerror',e=>errs.push(name+': '+e.message));
 await p.goto('http://localhost:8799/');await p.waitForSelector('#ae');await fn(p);await p.waitForSelector('.toast,#tw .warn',{timeout:8000}).catch(()=>{});await p.waitForTimeout(500);
 const t=await p.evaluate(()=>[...document.querySelectorAll('.toast')].map(x=>x.textContent).join(' || '));console.log(name,'=>',t);await p.screenshot({path:D+name+'.png'});await c.close()};
// simulazione: pulsante "Salva partita" (id save) nella schermata Nuova partita, gestore che fallisce con errore sconosciuto e non gestito
const fake=async(p,tab,id,label,errExpr)=>p.evaluate(([tab,id,label,errExpr])=>{window._cur=tab;const bt=document.createElement('button');bt.id=id;bt.className='p';bt.textContent=label;document.querySelector('.card').append(bt);
 bt.onclick=async()=>{await new Promise(r=>setTimeout(r,50));const [k,m]=errExpr.split("|");throw new ({TypeError,ReferenceError,Error})[k](m)}},[tab,id,label,errExpr]).then(()=>p.click('#'+id));
await mk('1-contesto-salva-partita-errore-sconosciuto',p=>fake(p,'nuova','save','Salva partita','Error|PGRST999 unexpected state xyz'));
await mk('2-contesto-prenotazione-offline',p=>fake(p,'serata','evbook','🎟 Prenota','TypeError|Failed to fetch'));
await mk('3-contesto-js-dato-mancante-eventi',p=>p.evaluate(()=>{window._cur='eventi';setTimeout(()=>{null.titolo},0)}));
await mk('4-browser-non-supporta',p=>fake(p,'profilo','smg','Collega','ReferenceError|structuredClone is not defined'));
await mk('5-login-password-errata',async p=>{await p.route(/auth\/v1\/token/,r=>r.fulfill({status:400,contentType:'application/json',body:'{"code":"invalid_credentials","message":"Invalid login credentials"}'}));await p.fill('#ae','test.fake@example.com');await p.fill('#ap','Sbagliata1');await p.click('#ago')});
await mk('6-bgg-non-risponde',p=>p.evaluate(()=>{window._cur='ludoteca';toast((r=>`⚠️ ${r.msg} [${r.code}]`)(errSpiega({message:'BGG upstream 202 queued, retry'},'BGG')),true)}));
await mk('7-testo-troppo-lungo',p=>p.evaluate(()=>{window._cur='nuova';toastVal('«Note» è troppo lungo: 1240 caratteri, massimo 1000. Accorcia il testo o correggi il campo e salva di nuovo.','E-PARTITA-V9')}));
await mk('8-desktop-coppa',p=>fake(p,'coppa','cpsave','💾 Salva configurazione','Error|new row violates row-level security policy for table coppe'),1440,900);
console.log('pageerrors (attesi, provocati apposta):',errs.length);await b.close()})();
