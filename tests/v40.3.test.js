// node tests/v40.3.test.js — Record: numeri/statistiche admin in fondo, freccia unica in tutta l'app
const fs=require('fs');const css=fs.readFileSync(__dirname+'/../styles.css','utf8');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
chk(/details>summary::-webkit-details-marker\{display:none\}/.test(css)&&/details>summary\{list-style:none/.test(css),'marker nativo nascosto ovunque');
(async()=>{const pw=require('playwright-core');const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});const errs=[];
 const c=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.route(/supabase|jsdelivr/,r=>r.abort());await p.goto('http://localhost:8799/',{waitUntil:'load'});await p.waitForTimeout(2500);
 const setup=adm=>p.evaluate(a=>{document.body.classList.remove('gate');admin=a;localStorage.removeItem('pergioco-acc');
  const gs=Array.from({length:8},(_,i)=>({id:'g'+i,name:['Catan','Azul','Carcassonne','Ticket to Ride','Wingspan','Dixit','7 Wonders','Splendor'][i],min:2,max:4,minT:30,maxT:60,age:10}));
  const N=['Vincenzo','Giulia','Marco','Sara','Luca','Anna','Paolo','Elena'];const ms=N.map((x,i)=>({id:'m'+i,nome:x,cognome:'',active:true}));
  const ps=Array.from({length:30},(_,i)=>({id:'p'+i,gameId:'g'+(i%8),date:'2026-10-'+String(1+i%28).padStart(2,'0'),players:[{memberId:'m'+(i%8),score:10+i%7},{memberId:'m'+((i+3)%8),score:8}],coop:false}));
  DB.games=async()=>gs;DB.plays=async()=>ps;DB.members=async()=>ms;XP.map={};ms.forEach((m,i)=>XP.map[m.id]={member_id:m.id,xp:900-i*55,level:5});XP.ensure=async()=>{}},adm);
 const rec=async adm=>{await setup(adm);await p.evaluate(()=>go('nuova'));await p.waitForTimeout(500);await p.evaluate(()=>go('record'));await p.waitForTimeout(1500);
  return p.evaluate(()=>{const v=document.getElementById('view'),kids=[...v.children],d=document.getElementById('uxnums');
   const loose=kids.filter(e=>e.matches('.row')||e.matches('button[data-act="go:stats"]')||e.matches('h3')).length;
   const arrows=[...v.querySelectorAll('details>summary')].every(s=>{const a=getComputedStyle(s,'::after');return a.content.includes(s.parentNode.open?'▾':'▸')&&a.fontSize==='18px'&&getComputedStyle(s).listStyleType==='none'});
   return{k:kids.map(e=>e.tagName+'.'+e.className+'#'+e.id).join(' | '),d:!!d,last:kids[kids.length-1]===d,closed:d&&!d.open,t:d&&d.querySelector('summary').textContent,bt:!!(d&&d.querySelector('[data-act="go:stats"]')),nums:!!(d&&/Partite/.test(d.textContent)),loose,arrows,n:v.querySelectorAll('details>summary').length}})};
 let r=await rec(true);chk(r.d&&r.last&&r.closed,'admin: blocco in fondo e chiuso '+r.k+' '+r.closed);chk(/Statistiche associazione \(admin\)/.test(r.t)&&r.bt&&r.nums,'admin: titolo, numeri e bottone dentro');chk(r.loose===0,'nessun titolo o riquadro sciolto');chk(r.arrows,'stessa freccia su tutti i '+r.n+' blocchi');
 await p.evaluate(()=>{document.querySelectorAll('#view details').forEach(d=>d.open=false)});await p.screenshot({path:process.env.SHOT||'/tmp/v403.png'});
 r=await rec(false);chk(r.d&&r.last&&!r.bt&&!/admin/.test(r.t),'non admin: niente bottone staff, numeri in fondo');chk(r.loose===0,'non admin: nessun riquadro sciolto');
 for(const [v,s] of [['nuova','#uxaltro>summary'],['ludoteca','#uxfil>summary'],['profilo','details>summary']]){await p.evaluate(x=>go(x),v);await p.waitForTimeout(900);
  chk(await p.evaluate(s=>{const e=document.querySelector('#view '+s);if(!e)return'none';const a=getComputedStyle(e,'::after');return a.content.includes('▸')||a.content.includes('▾')},s)!==false,'freccia uguale in '+v)}
 chk(!errs.length,'nessun errore JS '+errs.join('|'));await b.close();console.log(ok+'/'+n+' ok');process.exit(ok===n?0:1)})();
