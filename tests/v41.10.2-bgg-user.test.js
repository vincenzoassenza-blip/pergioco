// node tests/v41.10.2-bgg-user.test.js — verifica username + chip + logo
const pw=require('playwright-core'),fs=require('fs');const{setup}=require('./screenshots-profilo.js');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};const W=ms=>new Promise(r=>setTimeout(r,ms));
const OUT='/workspace/pergioco-mockups/ux';
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 const mockInvoke=async(p)=>{
  await p.evaluate(()=>{
   const c=DB.remote.client||(DB.remote.client={});
   c.functions=c.functions||{};
   c.functions.invoke=async(name,opts)=>{
    const body=opts&&opts.body||{};
    if(name==='bgg-collection'&&body.mode==='user'){
     const u=String(body.username||'');
     if(/^no[a-z0-9]*$/i.test(u)||u==='utenteinesistente99xyz')return{data:{found:false,username:u},error:null};
     return{data:{found:true,id:'13',username:u,firstname:'Ada',lastname:'Lovelace',avatar:'https://cf.geekdo-static.com/avatars/avatar_test.png'},error:null};
    }
    if(name==='bgg-collection')return{data:{items:[{bgg_id:13,nome:'Catan',anno:1995,min:3,max:4,minT:60,maxT:120,durata:90,eta:10,thumb:null,exp:false}],cached:false},error:null};
    return{data:{},error:null};
   };
   // app_settings recenti in memoria
   const store={bgg_recent_users:{users:['CatanFan','OldUser']}};
   const from=()=>({select:()=>({eq:(k,v)=>({maybeSingle:async()=>({data:store[v]?{value:store[v]}:null,error:null})})}),
    upsert:async(row)=>{store[row.key]=row.value;return{error:null}}});
   c.from=(t)=>t==='app_settings'?from():{select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})};
  });
 };
 // 1) trovato
 {const p=await setup(b,'staff',900);const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.evaluate(()=>{DB.remote.isAdmin=async()=>true;DB.remote.modCached=false;admin=true;localStorage.setItem('pergioco-bgg-recent-users',JSON.stringify(['CatanFan','OldUser']))});
  await mockInvoke(p);
  await p.evaluate(()=>go('importbgg'));await W(600);
  await p.evaluate(()=>{const r=[...document.querySelectorAll('.alr')].find(x=>/Nome utente BGG/.test(x.textContent));r&&r.click()});await W(700);
  chk(await p.evaluate(()=>!!document.querySelector('input[aria-label]')&&!!document.querySelector('button.p[disabled]')),'campo username + Importa disabilitato');
  chk(await p.evaluate(()=>!!document.querySelector('.ibggpwr img')),'logo Powered by BGG in username step');
  chk(await p.evaluate(()=>document.querySelectorAll('.ibggchip').length>=2),'chip recenti presenti');
  // Forza stato Verifico intercettando una promise lenta
  await p.evaluate(()=>{
    const orig=DB.remote.client.functions.invoke;
    DB.remote.client.functions.invoke=async(name,opts)=>{
      if(name==='bgg-collection'&&opts&&opts.body&&opts.body.mode==='user'){
        await new Promise(r=>setTimeout(r,500));
      }
      return orig(name,opts);
    };
  });
  await p.fill('input[aria-label]','AdaPlayer');
  await W(650);
  chk(await p.evaluate(()=>/Verifico/.test(document.querySelector('.ibggverify')?.textContent||'')),'stato Verifico…');
  await W(1200);
  const found=await p.evaluate(()=>({t:document.querySelector('.ibgguserok')?.innerText||'',dis:document.querySelector('button.p')?.disabled,av:!!document.querySelector('.ibggav img')}));
  chk(/AdaPlayer/.test(found.t)&&/Ada/.test(found.t)&&found.dis===false,'trovato: nome+cognome, pulsante attivo');
  await p.screenshot({path:OUT+'/v41.10.2-bgg-user-found.png',fullPage:true});
  chk(errs.length===0,'found: no JS errors '+errs.join('|'));
  await p.context().close()}
 // 2) not found
 {const p=await setup(b,'staff',900);
  await p.evaluate(()=>{DB.remote.isAdmin=async()=>true;DB.remote.modCached=false;admin=true});
  await mockInvoke(p);
  await p.evaluate(()=>go('importbgg'));await W(500);
  await p.evaluate(()=>{const r=[...document.querySelectorAll('.alr')].find(x=>/Nome utente BGG/.test(x.textContent));r&&r.click()});await W(300);
  await p.fill('input[aria-label]','utenteinesistente99xyz');await W(1000);
  const miss=await p.evaluate(()=>({t:document.querySelector('.ibggverify')?.textContent||'',dis:document.querySelector('button.p')?.disabled}));
  chk(/non trovato/i.test(miss.t)&&miss.dis===true,'non trovato: messaggio + Importa disabilitato');
  await p.screenshot({path:OUT+'/v41.10.2-bgg-user-missing.png',fullPage:true});
  await p.context().close()}
 // 3) Aggiungi gioco ha logo
 {const p=await setup(b,'staff',900);
  await p.evaluate(()=>{DB.remote.isAdmin=async()=>true;admin=true;go('ludoteca')});await W(1000);
  const has=await p.evaluate(()=>{const d=document.getElementById('gadd');if(d)d.open=true;return!!document.querySelector('#gadd .ibggpwr img')});
  chk(has,'logo in Aggiungi un gioco');
  await p.context().close()}
 // static checks
 const h=fs.readFileSync(__dirname+'/../index.html','utf8'),sw=fs.readFileSync(__dirname+'/../sw.js','utf8');
 const {APP_VERSION,swCache,hasAsset}=require('./appver');
 chk(!!APP_VERSION&&swCache(),'APP_VERSION dal codice, cache SW allineata');
 chk(hasAsset('import-bgg.js')&&hasAsset('giochi.js'),'cache bust import+giochi');
 await b.close();console.log(`${ok}/${n}`);process.exit(ok===n?0:1)})();
