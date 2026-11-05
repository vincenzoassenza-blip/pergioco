// node tests/screenshots-v41.js — screenshot v41: Configurazione (staff) e barra con nome di prova
const pw=require('playwright-core'),fs=require('fs'),OUT='/workspace/pergioco-mockups/ux/';const ROW=JSON.parse(fs.readFileSync(process.env.BRAND||'/tmp/brandv.json','utf8'));
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
const mk=async(role,row)=>{const p=await (await b.newContext({serviceWorkers:'block',viewport:{width:430,height:1500},locale:'it-IT',deviceScaleFactor:2})).newPage();
 await p.route(/supabase|jsdelivr/,r=>r.abort());await p.goto('http://localhost:8799/');await p.waitForTimeout(1500);
 await p.evaluate(([role,row])=>{document.body.classList.remove('gate');localStorage.clear();if(role==='staff'){admin=true;localStorage.setItem('pergioco-mode','admin')}
  window.CP_CLIENT={from:t=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{value:row},error:null})})}),upsert:async()=>({error:null})})};
  DB.games=async()=>[];DB.members=async()=>[];DB.plays=async()=>[];DB.legacyNames=async()=>[];DB.hasPin=async()=>true;DB.status='online';BRAND.loaded=false},[role,row]);return p};
let p=await mk('staff',ROW);await p.evaluate(()=>go('config'));await p.waitForTimeout(1200);await p.screenshot({path:OUT+'v41-configurazione-staff.png',fullPage:true});
p=await mk('socio',{...ROW,nome:'Associazione Prova',motto:'Nome di prova (test locale)',citta:'Modica',colori:{...ROW.colori,primario:'#00675f',accento:'#f2b134'}});
await p.evaluate(()=>BRAND.load(true));await p.setViewportSize({width:430,height:900});await p.evaluate(()=>go('altro'));await p.waitForTimeout(1200);await p.screenshot({path:OUT+'v41-brand-prova.png'});
console.log(await p.evaluate(()=>document.title));await b.close()})();
