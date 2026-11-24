// node tests/v41.20-link.test.js — nomi cliccabili (gioco, socio, serata, evento) e rotte con Indietro
const fs=require('fs'),path=require('path'),pw=require('playwright-core');
const {APP_VERSION,swCache,hasAsset}=require('./appver');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0,ok=0;const chk=(c,m,x)=>{n++;if(c)ok++;else console.error('FAIL',m,x??'')}

chk(swCache()&&hasAsset('app.js')&&hasAsset('eventi.js')&&hasAsset('mie-partite.js'),'cache SW allineata alla versione corrente');

const app=read('app.js'),ev=read('eventi.js'),st=read('stats.js'),mp=read('mie-partite.js'),cp=read('coppa.js');
chk(/const gLink=/.test(app)&&/href="#gioco\/\$\{encodeURIComponent\(id\)\}"/.test(app),'gLink/linkGame con href #gioco/id');
chk(/const mLink=/.test(app)&&/href="#profilo\/\$\{encodeURIComponent\(id\)\}"/.test(app),'mLink/linkMember con href #profilo/id');
chk(/const linkEvening=/.test(app)&&/href="#serata\/\$\{d\}"/.test(app)&&/data-eve=/.test(app),'linkEvening con href #serata/data');
chk(/const linkEvent=/.test(app)&&/href="#eventi\/\$\{encodeURIComponent\(id\)\}"/.test(app)&&/data-evid=/.test(app),'linkEvent con href #eventi/id');
chk(/function applyRoute\(/.test(app)&&/function openGame\(/.test(app)&&/function openEvening\(/.test(app)&&/function openEvent\(/.test(app)&&/views\.gioco=/.test(app),'rotte applyRoute, openGame/Evening/Event, views.gioco');
chk(/linkEvening\(p\.date/.test(app)&&/mLink\(x\.memberId/.test(app),'storico e Gestione Partite: date e soci collegati');
chk(/window\._eve&&isoOk\(window\._eve\)/.test(app),'Agenda apre anche una serata passata dal link');
chk(/openEvent\(c\.dataset\.ev\)/.test(ev)&&/linkEvening\(evDay\(e\.inizio\)/.test(ev),'eventi: scheda da rotta e data cliccabile');
chk(/openGame\(b\.dataset\.g\)/.test(st)&&/linkEvening\(g\.first/.test(st),'statistiche: gioco e date cliccabili');
chk(/aGame\(/.test(mp)&&/aMember\(/.test(mp)&&/aEve\(/.test(mp),'Le mie partite: link gioco, socio, serata');
chk(/gLink\(g,/.test(cp)&&/mLink\(m\.id,nmH\(m\)\)/.test(cp),'Coppa Antero: giochi e soci cliccabili');
// escape XSS già coperto da v39; qui il regex pericoloso
chk(!/<img/.test((()=>{const esc=s=>String(s).replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const gLink=(id,name)=>id?`<a class="gl" href="#gioco/${encodeURIComponent(id)}" data-gid="${esc(id)}">${esc(name)}</a>`:esc(name);return gLink('a"b','<img src=x>')})()),'gLink non inietta HTML');
chk(!/\bclub\b/i.test(app.slice(app.indexOf('const linkEvening='),app.indexOf('function applyRoute')))&&!/\bludoteca\b/i.test(ev.slice(Math.max(0,ev.indexOf('const evDay=')),ev.indexOf('const evDay=')+400)),'nessun «club» o «ludoteca» nei testi nuovi');

(async()=>{
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
  const c=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8799/',{waitUntil:'networkidle'});await p.waitForTimeout(2500);
  await p.evaluate(()=>{
    document.body.classList.remove('gate');
    admin=true;
    const gs=[{id:'g0',name:'Azul',min:2,max:4,minT:30,maxT:45},{id:'g1',name:'Catan',min:3,max:4,minT:45,maxT:90}];
    const ms=[{id:'m0',nome:'Anna',cognome:'Rossi',active:true,statsPub:true},{id:'m1',nome:'Bruno',cognome:'Bianchi',active:true,statsPub:true}];
    const ps=[{id:'p0',gameId:'g0',date:'2026-10-20',players:[{memberId:'m0',score:12,winner:true},{memberId:'m1',score:8}],coop:false}];
    const ts=[{id:'t0',date:'2026-10-20',gameId:'g0',hostId:'m0',seats:4,status:'closed',players:[{memberId:'m0'},{memberId:'m1'}]}];
    DB.games=async()=>gs;DB.plays=async()=>ps;DB.members=async()=>ms;
    DB.legacyNames=async()=>[];
    DB.hasPin=async()=>true;
    DB.allTables=async()=>ts;DB.tables=async()=>ts;
    if(DB.remote){DB.remote.isAdmin=async()=>true;DB.remote.modCached=false}
    if(XP)XP.p=Promise.resolve();
  });
  await p.evaluate(()=>{localStorage.setItem('pergioco-mode','admin');admin=true;adminTab='partite';go('altro')});
  await p.waitForTimeout(2000);
  await p.evaluate(()=>{if(!document.getElementById('aplays')){const b=document.querySelector('[data-alt=partite]');if(b)b.click()}});
  await p.waitForTimeout(800);
  const hasPlay=await p.evaluate(()=>!!document.querySelector('#aplays a.gl, .gestionepartita a.gl, [data-gid]'));
  if(hasPlay){
    await p.evaluate(()=>{const a=document.querySelector('#aplays a.gl, .gestionepartita a.gl, [data-gid]');if(a)a.click()});
    await p.waitForTimeout(1800);
    chk(await p.evaluate(()=>location.hash==='#gioco/g0'&&!!document.querySelector('.gpg')&&document.body.innerText.includes('Azul')),'click nome gioco → #gioco/g0 e scheda',await p.evaluate(()=>location.hash+' '+!!document.querySelector('.gpg')));
    await p.goBack();await p.waitForTimeout(1800);
    chk(await p.evaluate(()=>location.hash!=='#gioco/g0'&&!document.querySelector('.gpg')),'Indietro chiude la scheda gioco e torna prima',await p.evaluate(()=>location.hash));
    // data → agenda
    const hasDate=await p.evaluate(()=>!!document.querySelector('a.el,[data-eve]'));
    if(hasDate){
      await p.evaluate(()=>{const a=document.querySelector('a.el,[data-eve]');if(a)a.click()});
      await p.waitForTimeout(1800);
      chk(await p.evaluate(()=>location.hash==='#serata/2026-10-20'&&(document.body.innerText.includes('Agenda')||document.body.innerText.includes('Azul')||document.body.innerText.includes('tavolo')||document.body.innerText.includes('Tavolo'))),'click data → #serata/2026-10-20',await p.evaluate(()=>location.hash));
      await p.goBack();await p.waitForTimeout(1500);
    }else chk(false,'data serata visibile in Gestione Partite');
    // socio
    const hasMem=await p.evaluate(()=>!!document.querySelector('#aplays a.pv, .gestionepartita a.pv, a.pv[data-pv]'));
    if(hasMem){
      await p.evaluate(()=>{const a=document.querySelector('#aplays a.pv, .gestionepartita a.pv, a.pv[data-pv]');if(a)a.click()});
      await p.waitForTimeout(1800);
      chk(await p.evaluate(()=>/^#profilo\/m[01]$/.test(location.hash)&&!!document.querySelector('.pname')),'click socio → #profilo/<id>',await p.evaluate(()=>location.hash));
    }else chk(false,'nome socio visibile in Gestione Partite');
  }else{
    chk(false,'Gestione Partite mostra i link','no #aplays');
  }
  chk(errs.length===0,'nessun errore JS',errs);
  console.log(`v41.20-link: ${ok}/${n} ok`);
  await b.close();
  process.exit(ok===n?0:1);
})();
