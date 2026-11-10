// node tests/v40.test.js — v40 UX più leggera (statico + browser con dati finti; serve http.server su :8799)
const fs=require('fs'),R=f=>fs.readFileSync(__dirname+'/../'+f,'utf8');
const app=R('app.js'),ux=R('ux40.js'),ev=R('eventi.js'),sb=R('sb.js'),css=R('styles.css'),idx=R('index.html'),sw=R('sw.js');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
chk(/const C='pergioco-v4\d(\.\d+)*'/.test(sw)&&!/v=39/.test(sw+idx),'versione 40 ovunque');
chk(/ux40\.js\?v=4\d/.test(idx)&&/ux40\.js\?v=4\d/.test(sw),'ux40.js caricato e in cache');
{const A=sw.match(/const A=\[([^\]]+)\]/)[1].split(',');chk(new Set(A).size===A.length,'nessun file doppio nella cache SW')}
chk(!/IG\.link[^\n]*igev'\):''\}<\/div>`\};/.test(ev)&&/IG\.link\('📸 Foto e aggiornamenti su Instagram','igev'\)/.test(ev),'Instagram solo nella scheda evento');
chk(/Giocatori: Tutto/.test(app)&&/Durata: Tutto/.test(app)&&/Tutto \(\$\{ps\.length\}\)/.test(app),'menu a tendina con «Tutto»');
chk(/loading="lazy"[^>]*decoding="async"/.test(app),'copertina scheda gioco lazy');
chk(/pergioco-cache-uid/.test(sb)&&/removeItem\('pergioco-cache-uid'\)/.test(sb),'cache locale legata all\'account e cancellata al logout');
chk(/esc\(t\.time\)/.test(ux)&&/esc\(UX\.dLbl/.test(ux)&&/gLink\(/.test(ux)&&/textContent='← '/.test(ux),'ux40: testi dinamici passati da esc() o textContent');
chk(!/club|ludoteca/i.test(ux.replace(/'ludoteca'/g,'')),'niente club/ludoteca nei testi');
chk(/\.evb\.st/.test(css)&&/\.evb\.t,\.chip\.coop/.test(css),'etichette: un colore stato, uno tipo');
chk(/min-height:44px/.test(css),'target tattili 44px');
(async()=>{let pw;try{pw=require('playwright-core')}catch(e){console.log('playwright non disponibile: salto i test browser');return fin()}
 const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});const errs=[];
 const c=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.route(/supabase|jsdelivr/,r=>r.abort());await p.goto('http://localhost:8799/',{waitUntil:'load'});await p.waitForTimeout(2500);
 await p.evaluate(()=>{document.body.classList.remove('gate');const T=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
  const gs=Array.from({length:90},(_,i)=>({id:'g'+i,name:'Gioco <b>'+i,min:2,max:4,minT:30,maxT:60,age:10,coop:i===1}));const ms=['Vincenzo','Giulia'].map((x,i)=>({id:'m'+i,nome:x,cognome:'',active:true}));
  const ps=[{id:'p1',gameId:'g0',date:'2026-10-01',players:[{memberId:'m0',score:5},{memberId:'m1',score:3}],coop:false}];
  DB.games=async()=>gs;DB.plays=async()=>ps;DB.members=async()=>ms;DB.allTables=async()=>[{id:'t1',date:T,status:'open',gameId:'g0',hostId:'m0',seats:4,players:[{memberId:'m0'}],time:'21:00'}]});
 const t=async(fn,ms=1200)=>{await p.evaluate(fn);await p.waitForTimeout(ms)};
 await t(()=>go('nuova'));
 const N=await p.evaluate(()=>({alt:!!document.querySelector('#uxaltro:not([open]) #du')&&!!document.querySelector('.ptdw #d'),nt:!!document.querySelector('#uxaltro #nt'),du:!!document.querySelector('#uxaltro #du'),pk:!document.querySelector('#uxaltro #pk')&&!!document.querySelector('#pk'),g:!document.querySelector('#uxaltro #g'),today:!!document.querySelector('.uxtoday .gl'),xss:!document.querySelector('.uxtoday b b')}));
 chk(N.alt&&N.nt&&N.du,'Partita: data, durata e nota dentro «Altro» chiuso');chk(N.pk&&N.g,'Partita: gioco e giocatori in alto');chk(N.today,'Partita: tavoli in Agenda oggi con nome cliccabile');chk(N.xss,'nomi dei giochi escapati');
 await p.evaluate(()=>{document.querySelector('#d').value='bad';document.querySelector('#uxaltro').open=false;document.querySelector('#save').click()});await p.waitForTimeout(300);
 chk(await p.evaluate(()=>document.querySelector('#uxaltro').open),'errore sulla data apre «Altro»');
 await t(()=>go('ludoteca'));
 const L=await p.evaluate(()=>({fil:!!document.querySelector('#uxfil:not([open]) #n'),vis:[...document.querySelectorAll('#gl>.card')].filter(x=>!x.hidden).length,tot:document.querySelectorAll('#gl>.card').length}));
 chk(L.fil,'Giochi: filtri chiusi in «Filtri»');chk(L.vis===40&&L.tot===90,'Giochi: lista a pezzi (40 su 90)');
 await p.evaluate(()=>{const s=document.querySelector('#n');s.value='2';s.dispatchEvent(new Event('change'))});await p.waitForTimeout(200);
 chk(await p.evaluate(()=>document.querySelector('#uxfil summary .uxbadge')?.textContent==='1'),'Filtri mostra quanti sono attivi');
 await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(600);
 chk(await p.evaluate(()=>[...document.querySelectorAll('#gl>.card')].filter(x=>!x.hidden).length>40),'scorrendo se ne caricano altri');
 await t(()=>go('record'));
 const A=await p.evaluate(()=>{const d=document.querySelector('#view details.acc');return{n:document.querySelectorAll('#view details.acc').length,o:d&&d.open}});chk(A.n>=1&&A.o,'Record: blocchi richiudibili');
 await p.evaluate(()=>{const d=document.querySelector('#view details.acc');d.open=false});await p.waitForTimeout(200);await t(()=>go('record'));
 chk(await p.evaluate(()=>!document.querySelector('#view details.acc').open),'il blocco ricorda di essere chiuso');
 await t(()=>openProfile('m1'),1500);
 chk(await p.evaluate(()=>{const b=document.getElementById('hback');return b&&!b.hidden&&/← Giulia/.test(b.textContent)&&document.body.classList.contains('insub')}),'scheda socio: «← Giulia» in alto');
 await t(()=>go('ludoteca'),800);chk(await p.evaluate(()=>getComputedStyle(document.getElementById('hback')).display==='none'&&!document.body.classList.contains('insub')),'pagine principali: intestazione normale');
 await p.evaluate(async()=>{const gs=await DB.games();await gamePage(gs[3],await DB.plays())});await p.waitForTimeout(800);
 chk(await p.evaluate(()=>document.querySelector('.gpg .gpb').textContent==='← Gioco <b>3'),'scheda gioco: «← nome» (testo, non HTML)');
 await p.evaluate(()=>document.querySelector('.gpg .gpb').click());await t(()=>{window._ser={date:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date())};go('serata')});
 chk(await p.evaluate(()=>/Oggi · 1/.test(document.querySelector('.agdays')?.textContent||'')),'Agenda: giorni con tavoli in alto');
 chk(errs.length===0,'nessun errore JS: '+errs.join(' | '));
 if(process.env.SHOT){await t(()=>{localStorage.removeItem('pergioco-acc');go('nuova')});await p.screenshot({path:process.env.SHOT})}
 await b.close();fin()})();
function fin(){console.log(`${ok}/${n} ok`);process.exit(ok===n?0:1)}
