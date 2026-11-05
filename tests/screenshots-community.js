// node tests/screenshots-community.js [prefisso] — Community mobile: socio/staff (dati finti, RPC des_* simulate)
const pw=require('playwright-core');const pre=process.argv[2]||'v41.4-community';const OUT=process.env.OUT||'/workspace/pergioco-mockups/ux/';
const setup=async(b,role,h,opt)=>{const p=await (await b.newContext({serviceWorkers:'block',viewport:{width:430,height:h||1150},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'})).newPage();
 p.on('pageerror',e=>console.log('ERR',e.message));
 await p.route(/supabase|jsdelivr/,r=>r.abort());await p.goto('http://localhost:8799/');await p.waitForTimeout(1200);
 await p.evaluate(([role,opt])=>{document.body.classList.remove('gate');localStorage.clear();admin=role==='staff';localStorage.setItem('pergioco-mode',role==='staff'?'admin':'socio');
  const ms=[{id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1'},{id:'m2',nome:'Giulia',cognome:'Rossi',active:true},{id:'m3',nome:'Sara',cognome:'<b>Neri</b>',active:true},{id:'m4',nome:'Giorgio',cognome:'Marino',active:true,soprannome:'Gio'}];
  DB.games=async()=>[];DB.members=async()=>ms;DB.plays=async()=>[];DB.allTables=async()=>[];DB.legacyNames=async()=>[];DB.status='online';const R=DB.remote||{};R.user=async()=>({id:'u1'});R.isAdmin=async()=>role==='staff';R.searchMembers=async q=>ms.filter(m=>(m.nome+' '+m.cognome).toLowerCase().includes(q.toLowerCase())).map(m=>m.id);DB.remote=R;
  const L=[{id:'d1',nome:'Ark Nova',stato:'proposto',da:'m2',voti:7,spiego:1,min:1,max:4,durata:150,peso:3.7,anno:2021,cat:['Animals','Economic'],perche:'Profondo ma scorrevole',bgg_id:342942,creato:'2026-10-01'},
   {id:'d2',nome:'Heat',stato:'valutazione',da:'m1',voti:5,spiego:0,mio:true,min:1,max:6,durata:60,peso:2.2,anno:2022,cat:['Racing'],bgg_id:366013,creato:'2026-10-03'},
   {id:'d3',nome:'Cascadia <img src=x onerror=alert(1)>',stato:'proposto',da:'m3',voti:3,spiego:2,mio:true,mio_sp:true,min:1,max:6,durata:45,bgg_id:1,creato:'2026-10-05',perche:'<script>alert(1)</script>'},
   {id:'d4',nome:'Codenames',stato:'arrivato',da:'m3',voti:4,spiego:2,min:2,max:8,durata:15,bgg_id:178900,creato:'2026-09-01'},
   {id:'d5',nome:'Vecchio',stato:'archiviato',da:'m4',voti:1,spiego:0,min:2,max:4,durata:30,bgg_id:2,creato:'2026-08-01'}];
  if(opt&&opt.libero){L[1].da='m4'}
  const D={me:'m1',staff:role==='staff',periodo:{fine:'2026-12-01T22:59:00Z'},ultimo:{nome:'Cascadia',voti:9,chiuso:'2026-10-15T10:00:00Z'},desideri:L,scout:[]};window._rpc=[];
  window.CP_CLIENT={rpc:async(n,a)=>{window._rpc.push([n,a]);if(n==='des_lista')return{data:JSON.parse(JSON.stringify(D)),error:null};if(n==='des_vota'){const g=L.find(x=>x.id===a.p);g.mio=a.p_on;g.voti+=a.p_on?1:-1}if(n==='des_spiego'){const g=L.find(x=>x.id===a.p);g.mio_sp=a.p_on;g.spiego+=a.p_on?1:-1}return{data:null,error:null}},functions:{invoke:async()=>({data:{items:[{bgg_id:9,nome:'Azul <i>x</i>',anno:2017}]},error:null})}};},[role,opt]);
 await p.evaluate(()=>go('giocatori'));await p.waitForTimeout(1500);return p};
module.exports={setup};
if(require.main===module)(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 for(const role of ['socio','staff']){const p=await setup(b,role,1600);await p.screenshot({path:OUT+`${pre}-${role}.png`,fullPage:true});
  await p.evaluate(async()=>{document.querySelector('[data-cmx="d1"]').click();await new Promise(r=>setTimeout(r,300));document.querySelector('[data-cmx="arr"]').click();await new Promise(r=>setTimeout(r,300));document.getElementById('cmprop').click();await new Promise(r=>setTimeout(r,300))});
  await p.screenshot({path:OUT+`${pre}-${role}-aperto.png`,fullPage:true});
  await p.evaluate(()=>document.querySelector('[data-cmt="soci"]').click());await p.fill('#gq','gi');await p.waitForTimeout(600);await p.screenshot({path:OUT+`${pre}-${role}-soci.png`,fullPage:false});await p.context().close()}
 {const p=await setup(b,'socio',1600,{libero:true});await p.evaluate(async()=>{document.getElementById('cmprop').click();await new Promise(r=>setTimeout(r,300))});await p.screenshot({path:OUT+`${pre}-socio-proponi.png`,fullPage:false});await p.context().close()}
 await b.close();console.log('ok')})();
