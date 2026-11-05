// node tests/screenshots-partita-data.js <prima|dopo> — Partita: pillola della data toccata
const pw=require('playwright-core');const{setup}=require('./screenshots-partita.js');const w=process.argv[2]||'dopo';
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});const p=await setup(b,'socio');
 await p.evaluate(()=>{HTMLInputElement.prototype.showPicker=function(){window._pk=(window._pk||0)+1}});await p.click('#ptdate');await p.waitForTimeout(500);
 const r=await p.evaluate(()=>{const e=document.getElementById('uxaltro').getBoundingClientRect();return Math.max(0,e.top+scrollY-120)});
 await p.screenshot({path:`/workspace/pergioco-mockups/ux/v41.8.1-partita-data-${w}.png`,fullPage:true,clip:{x:0,y:r,width:430,height:560}});await b.close();console.log('ok')})();
