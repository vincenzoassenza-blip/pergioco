// node tests/v41.test.js — v41 A1: configurazione associazione (brand) da app_settings, fallback, XSS, solo staff, validazione, salvataggio
const pw=require('playwright-core'),fs=require('fs');let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
const XN='<img src=x onerror=window.XSS=1>Club';
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
const mk=async(role,row)=>{const errs=[];const p=await (await b.newContext({serviceWorkers:'block',viewport:{width:460,height:1000},locale:'it-IT'})).newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.route(/supabase|jsdelivr/,r=>r.abort());await p.goto('http://localhost:8799/');await p.waitForTimeout(1500);
 await p.evaluate(([role,row])=>{document.body.classList.remove('gate');localStorage.clear();if(role==='staff'){admin=true;localStorage.setItem('pergioco-mode','admin')}
  window.UPS=[];window.CP_CLIENT={from:t=>({select:()=>({eq:(k,v)=>({maybeSingle:async()=>({data:row?{value:row}:null,error:null})})}),upsert:async x=>{UPS.push({t,x});return{error:null}}})};
  DB.games=async()=>[];DB.members=async()=>[];DB.plays=async()=>[];DB.allTables=async()=>[];DB.legacyNames=async()=>[];DB.hasPin=async()=>true;DB.status='online';BRAND.loaded=false},[role,row]);
 return{p,errs}};
// 1) fallback: nessuna riga → valori PerGioco
let {p,errs}=await mk('socio',null);await p.evaluate(()=>BRAND.load(true));
let r=await p.evaluate(()=>({b:document.querySelector('header .brand').textContent,t:document.title,v:APP_VERSION,n:BRAND.v.nome,c:getComputedStyle(document.documentElement).getPropertyValue('--b').trim()}));
chk(r.b==='PerGioco'&&/^PerGioco/.test(r.t)&&r.n==='PerGioco'&&r.c==='#14254a','fallback PerGioco '+JSON.stringify(r));chk(/^41\.\d/.test(r.v),'APP_VERSION 41.x');
// 2) config applicata + XSS
({p,errs}=await mk('socio',{nome:XN,motto:'<b>m</b>',citta:'Modica',instagram:'prova_ig',colori:{primario:'#112233',secondario:'#223344',accento:'#ff0000',sfondo:'#eeeeee'}}));
await p.evaluate(()=>BRAND.load(true));await p.evaluate(()=>go('altro'));await p.waitForTimeout(800);
r=await p.evaluate(()=>({b:document.querySelector('header .brand').textContent,bh:document.querySelector('header .brand').innerHTML,t:document.title,c:getComputedStyle(document.documentElement).getPropertyValue('--b').trim(),
 a:getComputedStyle(document.documentElement).getPropertyValue('--a').trim(),foot:V.innerText,fh:V.innerHTML,xss:window.XSS,ig:IG.url,cache:localStorage.getItem('pergioco-brand')}));
chk(r.b===XN&&!/<img/.test(r.bh),'nome nella barra come testo');chk(r.t.startsWith(XN),'titolo pagina dal config');chk(r.c==='#112233'&&r.a==='#ff0000','colori come variabili CSS');
chk(/v41\.\d/.test(r.foot)&&/Modica/.test(r.foot)&&!/<img src=x/.test(r.fh.replace(/&lt;img src=x/g,'')),'piè di pagina Altro dal config, escapato');chk(!r.xss,'nessun XSS');
chk(r.ig==='https://www.instagram.com/prova_ig/','Instagram dal config');chk(r.cache&&JSON.parse(r.cache).citta==='Modica','cache locale salvata');
chk(!await p.evaluate(()=>!!document.getElementById('acfg')),'socio: niente pulsante Configurazione');
await p.evaluate(()=>go('config'));await p.waitForTimeout(500);chk(!await p.evaluate(()=>!!document.getElementById('cfsave')),'socio: vista config bloccata');
// 3) valori non validi dal DB scartati
await p.evaluate(()=>{BRAND.v=BRAND.norm({nome:'X',colori:{primario:'red;}body{display:none'},logo:'javascript:alert(1)'});});
r=await p.evaluate(()=>BRAND.v);chk(r.nome==='PerGioco'&&r.colori.primario==='#14254a'&&r.logo==='','norm scarta valori non validi');
// 4) staff
({p,errs}=await mk('staff',null));await p.evaluate(()=>BRAND.load(true));await p.evaluate(()=>go('altro'));await p.waitForTimeout(800);
chk(await p.evaluate(()=>!!document.getElementById('acfg')),'staff: pulsante ⚙️ Configurazione');
await p.click('[data-alb=acfg]') /* v41.6: riga «Configurazione» dell'elenco Gestione */;await p.waitForTimeout(800);
r=await p.evaluate(()=>({h:V.querySelector('h2').textContent,n:$('#cf-nome').value,c:$('#cfc-primario').value}));chk(r.h==='⚙️ Configurazione'&&r.n==='PerGioco'&&r.c==='#14254a','form precompilato');
await p.fill('#cf-nome','<script>x</script>Prova');await p.evaluate(()=>{const i=$('#cfc-accento');i.value='#00aa9e';i.dispatchEvent(new Event('input'))});
r=await p.evaluate(()=>({pn:$('#cfpn').textContent,ph:$('#cfpn').innerHTML,pa:$('#cfprev').style.getPropertyValue('--a'),root:getComputedStyle(document.documentElement).getPropertyValue('--a').trim()}));
chk(r.pn==='<script>x</script>Prova'&&!/<script/.test(r.ph),'anteprima nome escapata');chk(r.pa==='#00aa9e'&&r.root==='#f2b134','anteprima colori solo nel riquadro');
// validazione client: nome troppo corto
await p.fill('#cf-nome','X');await p.click('#cfsave');await p.waitForTimeout(400);chk(await p.evaluate(()=>UPS.length===0),'nome troppo corto: nessun salvataggio');
r=await p.evaluate(()=>BRAND.errors({...BRAND.v,colori:{...BRAND.v.colori,primario:'#12345'}}));chk(r.length>0,'colore non esadecimale rifiutato');
r=await p.evaluate(()=>BRAND.errors({...BRAND.v,logo:'data:image/svg+xml;base64,'+btoa('<svg onload="alert(1)"></svg>')}));chk(r.length>0,'SVG con script rifiutato');
await p.fill('#cf-nome','Associazione Prova');await p.fill('#cf-instagram','@prova.ig');await p.click('#cfsave');await p.waitForTimeout(600);
r=await p.evaluate(()=>({u:UPS[0],b:document.querySelector('header .brand').textContent}));
chk(r.u&&r.u.t==='app_settings'&&r.u.x.key==='brand'&&r.u.x.value.nome==='Associazione Prova'&&r.u.x.value.instagram==='prova.ig'&&r.u.x.value.colori.accento==='#00aa9e','upsert brand');chk(r.b==='Associazione Prova','barra aggiornata dopo il salvataggio');
// sorgenti
const idx=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),sql=fs.readFileSync('supabase/migrate-v41.sql','utf8');
chk(/const C='pergioco-v41\.\d+(\.\d+)?'/.test(sw)&&/brand\.js\?v=41\.\d+/.test(sw)&&/brand\.js\?v=41\.\d+[^]*app\.js\?v=41\.\d+/.test(idx)&&!/v=40\./.test(idx+sw),'versione 41.x ovunque, brand.js prima di app.js');
chk(!/· v37\.8|@pergiocoets'|Statistiche PerGioco/.test(fs.readFileSync('app.js','utf8')+fs.readFileSync('ig.js','utf8')+fs.readFileSync('stats.js','utf8')),'niente branding fisso residuo');
chk(/revoke all on public\.app_settings from anon/i.test(sql)&&/brand_valid/.test(sql),'SQL: anon revocato e vincolo');
chk(!errs.length,'nessun errore JS '+errs.join('|'));
console.log(`v41: ${ok}/${n}`);await b.close();process.exit(ok===n?0:1)})();
