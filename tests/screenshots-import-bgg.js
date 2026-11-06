// node tests/screenshots-import-bgg.js — v41.9 Import BGG
const pw=require('playwright-core'),fs=require('fs');const{setup}=require('./screenshots-profilo.js');
const OUT=process.env.OUT||'/workspace/pergioco-mockups/ux/';
const csv=fs.readFileSync(__dirname+'/fixtures/bgg-collection-sample.csv','utf8');
const openImp=async(b)=>{const p=await setup(b,'staff',900);await p.evaluate(()=>{DB.remote.isAdmin=async()=>true;DB.remote.modCached=false;admin=true;drawModeBtn();go('altro')});await p.waitForTimeout(1500);
 await p.evaluate(()=>{const r=document.querySelector('[data-alb="ibgg"]');if(r)r.click();else go('importbgg')});await p.waitForTimeout(800);return p};
module.exports={openImp,csv};
if(require.main===module)(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 {const p=await openImp(b);await p.screenshot({path:OUT+'v41.9-import-bgg-scelta.png',clip:{x:0,y:0,width:430,height:900}});
  await p.click('text=Carica un file');await p.waitForTimeout(400);await p.screenshot({path:OUT+'v41.9-import-bgg-file.png',clip:{x:0,y:0,width:430,height:900}});
  await p.evaluate(async csv=>{const f=new File([csv],'bgg-collection-sample.csv',{type:'text/csv'});const dt=new DataTransfer();dt.items.add(f);const inp=document.querySelector('.ibggfile');inp.files=dt.files;inp.dispatchEvent(new Event('change',{bubbles:true}))},csv);
  await p.waitForTimeout(1200);await p.screenshot({path:OUT+'v41.9-import-bgg-anteprima.png',clip:{x:0,y:0,width:430,height:900}});
  await p.click('.ibggrow >> nth=0');await p.waitForTimeout(400);await p.screenshot({path:OUT+'v41.9-import-bgg-dettaglio.png',clip:{x:0,y:0,width:430,height:900}});
  await p.click('text=Torna all’anteprima').catch(()=>p.click('text=Torna all\'anteprima'));await p.waitForTimeout(400);
  await p.click('button.p');await p.waitForTimeout(1500);await p.screenshot({path:OUT+'v41.9-import-bgg-esito.png',clip:{x:0,y:0,width:430,height:900}});await p.context().close()}
 {const p=await setup(b,'staff',900);await p.evaluate(()=>{DB.remote.isAdmin=async()=>true;DB.remote.modCached=false;admin=true;drawModeBtn();go('altro')});await p.waitForTimeout(1500);
  await p.screenshot({path:OUT+'v41.9-import-bgg-gestione.png',clip:{x:0,y:0,width:430,height:900}});await p.context().close()}
 await b.close();console.log('ok')})();
