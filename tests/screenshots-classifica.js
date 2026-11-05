// node tests/screenshots-classifica.js [prefisso] — Classifica (tab Record) mobile: socio/staff (dati finti + XP simulati)
const pw=require('playwright-core');const pre=process.argv[2]||'v41.5-classifica';const OUT=process.env.OUT||'/workspace/pergioco-mockups/ux/';
const base=require('./screenshots-profilo.js');
const setup=async(b,role,h)=>{const p=await base.setup(b,role,h);
 await p.evaluate(()=>{XP.p=Promise.resolve();XP.map={m1:{member_id:'m1',xp:820,level:4},m2:{member_id:'m2',xp:1240,level:5},m3:{member_id:'m3',xp:960,level:4},m4:{member_id:'m4',xp:410,level:2}};XP.me='m1';go('record')});
 await p.waitForTimeout(2200);return p};
module.exports={setup};
if(require.main===module)(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 for(const role of ['socio','staff']){const p=await setup(b,role,1500);await p.screenshot({path:`${OUT}${pre}-${role}.png`,fullPage:true});
  if(role==='socio'){await p.evaluate(()=>{document.querySelector('.clrec .clrow').click();document.querySelector('.clmore').click()});await p.waitForTimeout(300);await p.screenshot({path:`${OUT}${pre}-socio-aperti.png`,fullPage:true})}}
 await b.close()})();
