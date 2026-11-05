// node tests/screenshots-partita.js [prefisso] — Partita mobile: socio/staff × vuota/compilata
const pw=require('playwright-core');const pre=process.argv[2]||'v41.2-partita';const OUT='/workspace/pergioco-mockups/ux/';
const setup=async(b,role)=>{const p=await (await b.newContext({serviceWorkers:'block',viewport:{width:430,height:1150},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'})).newPage();
 await p.route(/supabase|jsdelivr/,r=>r.abort());await p.goto('http://localhost:8799/');await p.waitForTimeout(1200);
 await p.evaluate(role=>{document.body.classList.remove('gate');localStorage.clear();admin=role==='staff';localStorage.setItem('pergioco-mode',role==='staff'?'admin':'socio');
  const ms=[{id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1'},{id:'m2',nome:'Giulia',cognome:'Rossi',active:true},{id:'m3',nome:'Marco',cognome:'Bianchi',active:true}];
  const gs=[{id:'g1',name:'Catan',min:3,max:4},{id:'g2',name:'Azul',min:2,max:4},{id:'g3',name:'Wingspan',min:1,max:5},{id:'g4',name:'Pandemic',min:2,max:4,coop:true}];
  const ps=[1,2,3,4,5].map(i=>({id:'p'+i,gameId:['g1','g2','g3','g1','g2'][i-1],date:'2026-10-0'+i,players:[{memberId:'m1'},{memberId:'m2'}]}));
  DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>ps;DB.allTables=async()=>[];DB.legacyNames=async()=>[];DB.hasPin=async()=>true;
  if(DB.remote)DB.remote.user=async()=>role==='staff'?null:{id:'u1'};else DB.remote={user:async()=>role==='staff'?null:{id:'u1'}};
  window.pickMembers=async(m,cur)=>['m1','m2','m3']},role);
 await p.evaluate(()=>go('nuova'));await p.waitForTimeout(900);return p};
const fill=async p=>{await p.evaluate(async()=>{const c=document.querySelector('.gpchip[data-id="g1"]')||document.querySelector('[data-id="g1"]');c&&c.click();document.getElementById('pk')?.click();await new Promise(r=>setTimeout(r,300));
 const gn=document.getElementById('gn');gn.value='Chiara';document.getElementById('ga').click();await new Promise(r=>setTimeout(r,200));
 const ps=[...document.querySelectorAll('.ps')];[10,12,'',7].forEach((v,i)=>{if(ps[i]){ps[i].value=v;ps[i].dispatchEvent(new Event('input',{bubbles:true}))}})});await p.waitForTimeout(300)};
module.exports={setup,fill};
if(require.main===module)(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 for(const role of ['socio','staff']){const p=await setup(b,role);await p.evaluate(()=>document.activeElement&&document.activeElement.blur());await p.screenshot({path:OUT+`${pre}-${role}-vuota.png`,fullPage:true});await fill(p);await p.evaluate(()=>document.activeElement&&document.activeElement.blur());await p.screenshot({path:OUT+`${pre}-${role}-compilata.png`,fullPage:true});await p.context().close()}
 await b.close();console.log('ok')})();
