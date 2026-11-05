// node tests/screenshots-header.js [prefisso] — Barra in alto (variante A): socio, staff, non collegato
const pw=require('playwright-core');const{setup}=require('./screenshots-profilo.js');const pre=process.argv[2]||'v41.7-header';const OUT=process.env.OUT||'/workspace/pergioco-mockups/ux/';
const hdr=async(b,role,h)=>{const p=await setup(b,role==='anon'?'socio':role,h);await p.evaluate(role=>{const R=DB.remote;R.user=async()=>role==='anon'?null:({id:'u1',email:'vincenzo.assenza@example.org'});R.modCached=false;drawModeBtn();go(role==='anon'?'ludoteca':'altro')},role);await p.waitForTimeout(1300);await p.evaluate(()=>document.activeElement&&document.activeElement.blur());return p};
module.exports={hdr};
if(require.main===module)(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 for(const role of ['socio','staff','anon']){const p=await hdr(b,role,900);await p.screenshot({path:OUT+`${pre}-${role==='anon'?'noncollegato':role}.png`,clip:{x:0,y:0,width:430,height:900}});await p.context().close()}
 await b.close();console.log('ok')})();
