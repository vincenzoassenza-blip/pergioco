// node tests/screenshots-altro.js [prefisso] — Altro (socio) / Gestione (staff), mobile
const pw=require('playwright-core');const{setup}=require('./screenshots-profilo.js');const pre=process.argv[2]||'v41.6-altro';const OUT=process.env.OUT||'/workspace/pergioco-mockups/ux/';
const altro=async(b,role,h)=>{const p=await setup(b,role,h);await p.evaluate(()=>{const R=DB.remote;R.user=async()=>({id:'u1',email:'vincenzo.assenza@example.org'});R.isMod=async()=>false;R.modCached=false;go('altro')});await p.waitForTimeout(1200);await p.evaluate(()=>document.activeElement&&document.activeElement.blur());return p};
module.exports={altro};
if(require.main===module)(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 for(const role of ['socio','staff']){const p=await altro(b,role,1100);await p.screenshot({path:OUT+`${pre}-${role}.png`,fullPage:true});
  if(role==='socio'){await p.click('.alacc>summary');await p.click('.alstaff>summary');await p.waitForTimeout(300);await p.screenshot({path:OUT+`${pre}-socio-aperto.png`,fullPage:true})}
  else{await p.fill('.alq','gi');await p.waitForTimeout(200);await p.click('.alsoc:not([hidden]) .alsr');await p.click('#alstr>summary');await p.waitForTimeout(300);await p.evaluate(()=>document.activeElement&&document.activeElement.blur());await p.screenshot({path:OUT+`${pre}-staff-ricerca.png`,fullPage:true});
   await p.evaluate(()=>{window._pv='m2';go('profilo')});await p.waitForTimeout(1500);await p.evaluate(()=>{const c=document.getElementById('aladm');c&&c.scrollIntoView()});await p.screenshot({path:OUT+`${pre}-staff-profilo.png`,fullPage:false})}
  await p.context().close()}
 await b.close();console.log('ok')})();
