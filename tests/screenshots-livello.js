// node tests/screenshots-livello.js — v41.8.1 Profilo: livello in evidenza
const pw=require('playwright-core');const{setup}=require('./screenshots-classifica.js');
const lvp=async(b,h)=>{const p=await setup(b,'socio',h||900);await p.evaluate(()=>{XP.map.m1={member_id:'m1',xp:300,level:4,dettaglio:{partite:[14,140],vittorie:[5,25],serate:[9,135]}};window._pv=null;go('profilo')});await p.waitForTimeout(1800);return p};
module.exports={lvp};
if(require.main===module)(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});const p=await lvp(b);
 await p.screenshot({path:'/workspace/pergioco-mockups/ux/v41.8.1-profilo-livello.png',clip:{x:0,y:0,width:430,height:900}});await p.click('.lvh');await p.waitForTimeout(300);
 await p.screenshot({path:'/workspace/pergioco-mockups/ux/v41.8.1-profilo-livello-aperto.png',clip:{x:0,y:0,width:430,height:900}});await b.close();console.log('ok')})();
