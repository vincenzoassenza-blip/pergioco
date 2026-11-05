// node tests/screenshots-profilo.js [prefisso] — Profilo mobile: socio/staff
const pw=require('playwright-core');const pre=process.argv[2]||'v41.3-profilo';const OUT=process.env.OUT||'/workspace/pergioco-mockups/ux/';
const setup=async(b,role,h)=>{const p=await (await b.newContext({serviceWorkers:'block',viewport:{width:430,height:h||1150},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'})).newPage();
 p.on('pageerror',e=>console.log('ERR',e.message));
 await p.route(/supabase|jsdelivr/,r=>r.abort());await p.goto('http://localhost:8799/');await p.waitForTimeout(1200);
 await p.evaluate(role=>{document.body.classList.remove('gate');localStorage.clear();admin=role==='staff';localStorage.setItem('pergioco-mode',role==='staff'?'admin':'socio');
  const ms=[{id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1',favGameId:'g1',soprannome:'Vince'},{id:'m2',nome:'Giulia',cognome:'Rossi',active:true},{id:'m3',nome:'Marco',cognome:'Bianchi',active:true},{id:'m4',nome:'Sara',cognome:'<b>Neri</b>',active:true}];
  const gs=[{id:'g1',name:'Catan',min:3,max:4},{id:'g2',name:'Azul',min:2,max:4},{id:'g3',name:'Brass: Birmingham',min:2,max:4},{id:'g4',name:'Dixit',min:3,max:6},{id:'g5',name:'Wingspan',min:1,max:5},{id:'g6',name:'<img src=x onerror=alert(1)>',min:2,max:4}];
  const G=['g2','g3','g1','g4','g2','g5','g3','g1','g6','g2','g4','g3','g5','g1'],O=['m2','m3','m4'];
  const ps=G.map((g,i)=>{const d=new Date(Date.UTC(2026,10,4-i*3));return{id:'p'+i,gameId:g,date:d.toISOString().slice(0,10),players:[{memberId:'m1',score:String(8+i%6),winner:i%3===0},{memberId:O[i%3],score:String(9+i%4),winner:i%3!==0},{memberId:O[(i+1)%3],score:'7'}]}});
  DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>ps;const dA=n=>{const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().slice(0,10)},td=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());window._TS=[{id:'t1',date:td,hostId:'m1',players:[{memberId:'m1'},{memberId:'m2'}]},{id:'t2',date:dA(150),hostId:'m2',players:[{memberId:'m1'}]},{id:'t3',date:dA(800),hostId:'m1',players:[]},{id:'t4',date:dA(30),hostId:'m3',players:[{memberId:'m3'}]},{id:'t5',date:dA(-20),hostId:'m1',players:[]}];DB.allTables=async()=>window._TS;DB.legacyNames=async()=>[];DB.hasPin=async()=>true;
  DB.status='online';const R=DB.remote||{};R.user=async()=>({id:'u1'});R.isAdmin=async()=>role==='staff';R.updateProfile=async o=>{window._upd=o};R.setStatsPub=async v=>{window._pub=v};DB.remote=R;},role);
 await p.evaluate(()=>{window._pv=null;go('profilo')});await p.waitForTimeout(1500);return p};
module.exports={setup};
if(require.main===module)(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 for(const role of ['socio','staff']){const p=await setup(b,role,2700);await p.evaluate(()=>document.activeElement&&document.activeElement.blur());await p.screenshot({path:OUT+`${pre}-${role}.png`,fullPage:true});
  await p.evaluate(()=>{const b=document.getElementById('pedit');b&&b.click()});await p.waitForTimeout(500);await p.evaluate(()=>document.activeElement&&document.activeElement.blur());await p.screenshot({path:OUT+`${pre}-${role}-modifica.png`,fullPage:false,clip:{x:0,y:0,width:430,height:1000}});await p.context().close()}
 await b.close();console.log('ok')})();
