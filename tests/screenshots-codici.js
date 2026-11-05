// node tests/screenshots-codici.js — v41.8.1 Gestione › Codici con ricerca
const pw=require('playwright-core');const{setup}=require('./screenshots-profilo.js');
const cod=async(b,h)=>{const p=await setup(b,'staff',h||900);await p.evaluate(()=>{const ms=[{id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1',tessera:'101'},{id:'m2',nome:'Giulia',cognome:'Rossi',active:true,userId:'u2',tessera:'102'},{id:'m3',nome:'Marco',cognome:'Bianchi',active:true,tessera:'103'},{id:'m4',nome:'Sara',cognome:'<b>Neri</b>',active:true,tessera:'104'}];
  for(let i=5;i<=40;i++)ms.push({id:'m'+i,nome:'Socio'+i,cognome:'Prova',active:true,userId:i%3?'u'+i:null,tessera:String(100+i)});
  DB.members=async()=>ms;window._NC=[];DB.remote.codes=async()=>[{member_id:'m3',code:'AB12CD',used_at:null}];DB.remote.newCode=async id=>{window._NC.push(id);return 'ZZ99'};DB.remote.isAdmin=async()=>true;DB.remote.modCached=false;drawModeBtn();go('altro')});
 await p.waitForTimeout(1500);await p.evaluate(()=>{const r=document.querySelector('[data-alt="account"]');r&&r.click()});await p.waitForTimeout(1500);return p};
module.exports={cod};
if(require.main===module)(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});const p=await cod(b);
 await p.evaluate(()=>{const q=document.getElementById('ccq');scrollTo(0,q.getBoundingClientRect().top+scrollY-200)});await p.waitForTimeout(300);
 await p.screenshot({path:'/workspace/pergioco-mockups/ux/v41.8.1-codici.png'});await p.fill('#ccq','socio1');await p.waitForTimeout(300);await p.screenshot({path:'/workspace/pergioco-mockups/ux/v41.8.1-codici-ricerca.png'});await b.close();console.log('ok')})();
