// node tests/v40.6.test.js — Agenda «elenco per giorno» (anteprima): giorni, gruppi, Siediti, foglio +, extra host/staff, eventi
// SHOTS=1 salva anche gli screenshot in /workspace/pergioco-mockups/ux/ (dati di esempio)
const pw=require('playwright-core');let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
const SH=process.env.SHOTS,OUT='/workspace/pergioco-mockups/ux/';
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
const mk=async role=>{const errs=[];const p=await (await b.newContext({serviceWorkers:'block',viewport:{width:460,height:1000},locale:'it-IT'})).newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.route(/supabase|jsdelivr/,r=>r.abort());await p.goto('http://localhost:8799/');await p.waitForTimeout(2000);
 await p.evaluate(([role,SHN])=>{document.body.classList.remove('gate');localStorage.clear();if(role==='staff')admin=true;window._ser=null;
  const G=[['g1','Catan',3,4],['g2','Azul',2,4],['g3','Wingspan',1,5],['g4','7 Wonders',2,7],['g5',SHN||'<img src=x onerror=window.XSS=1>',2,4]].map(([id,name,min,max])=>({id,name,min,max}));
  const M=['Vincenzo Assenza','Giulia Rossi','Marco Bianchi','Sara Neri','Luca Greco','Anna Russo','Paolo Gallo'].map((x,i)=>({id:'m'+i,nome:x.split(' ')[0],cognome:x.split(' ')[1],active:true,userId:i?'x'+i:'u1'}));
  const d=k=>{const x=new Date(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date())+'T12:00');x.setDate(x.getDate()+k);return x.toLocaleDateString('sv-SE')};
  window.T=[{id:'t0',date:d(0),gameId:'g2',hostId:'m6',seats:2,time:'20:30',status:'open',players:[{memberId:'m6'}]},
   {id:'t1',date:d(1),gameId:'g1',hostId:'m1',seats:4,time:'21:00',note:'Spiego io le regole',status:'open',players:[{memberId:'m1'},{memberId:'m2'}]},
   {id:'t2',date:d(1),gameId:'g3',hostId:'m3',seats:4,time:'21:30',status:'open',players:[{memberId:'m3'},{memberId:'m4'},{memberId:'m5'},{guest:true,name:'Chiara'}]},
   {id:'t3',date:d(3),gameId:'g4',hostId:'m0',seats:6,status:'open',note:SHN?'Si gioca alle 21 circa':'<b>x</b>',players:[{memberId:'m0'},{memberId:'m1'}]},
   {id:'t4',date:d(3),gameId:'g5',hostId:'m2',seats:4,time:'21:00',status:'open',players:[{memberId:'m2'}]}];
  window.SAVED=[];DB.games=async()=>G;DB.members=async()=>M;DB.allTables=async()=>JSON.parse(JSON.stringify(T));DB.plays=async()=>[];DB.saveTable=async t=>{SAVED.push(t)};DB.seat=async(id,a,me)=>{SAVED.push({seat:id,a,me})};DB.status='online';
  DB.remote=Object.assign(DB.remote||{},{user:async()=>({id:'u1'})});
  const iso=(k,h)=>{const x=new Date();x.setDate(x.getDate()+k);x.setHours(h,0,0,0);return x.toISOString()};
  EV.list=async()=>[{id:'e2',titolo:'Torneo di Carcassonne',inizio:iso(10,16),chiusura:iso(8,20),posti:16,torneo:true,luogo:'Sede PerGioco'},{id:'e1',titolo:'Serata Giochi di Natale',inizio:iso(20,20),chiusura:iso(18,20),posti:40,quota:5,caparra:5,luogo:'Sala parrocchiale, Ragusa'}];
  EV.mine=async()=>[{evento_id:'e1',stato:'in_attesa_conferma'}];EV.info=async id=>id==='e1'?{occupati:23,attesa:0,presenti:0}:{occupati:16,attesa:3,presenti:0}},[role,SH?'Dixit':'']);
 await p.evaluate(()=>go('serata'));await p.waitForTimeout(1200);return{p,errs}};
// socio
let {p,errs}=await mk('socio');
let r=await p.evaluate(()=>({h2:V.querySelector('h2').textContent,on:document.querySelector('.agdays .on')?.textContent,first:document.querySelector('.agdays .chip')?.textContent,
 dday:!!V.querySelector('.dday'),sdVis:!!document.querySelector('#sd')&&document.querySelector('#sd').getBoundingClientRect().width>2,heads:[...V.querySelectorAll('.agday')].map(h=>h.textContent),
 lv:V.querySelectorAll('#tl .lv').length,nm:/\d\/\d/.test(document.getElementById('tl').innerText),hostOnce:[...V.querySelectorAll('[data-t="t1"] a.pv')].filter(a=>a.textContent==='Giulia Rossi').length,
 sd:!!V.querySelector('[data-sd="t1"]'),full:!!V.querySelector('[data-sd="t2"]'),j:V.querySelectorAll('[data-j]').length,o1:!!V.querySelector('[data-o="t1"],[data-c="t1"]'),o3:!!V.querySelector('[data-o="t3"]')&&!!V.querySelector('[data-c="t3"]'),
 lvBtn:!!V.querySelector('[data-lv="t3"]'),cancel:!!V.querySelector('[data-cancel="t3"]'),nt:!!document.getElementById('nt'),fab:!!document.getElementById('tfab'),seg:!!V.querySelector('.evseg'),cov:V.querySelectorAll('#tl .gcov').length,xss:window.XSS,
 noteEsc:/&lt;b&gt;x/.test(V.querySelector('[data-t="t3"]').innerHTML)}));
chk(r.h2==='📅 Agenda','titolo «📅 Agenda»');chk(/^Oggi/.test(r.first)&&/^Oggi/.test(r.on),'si apre su Oggi, primo giorno');chk(!r.dday&&!r.sdVis,'niente campo data né data ripetuta');
chk(r.heads.length===3&&/^Oggi, \S+ \d+ novembre · 1 tavolo/.test(r.heads[0])&&/ospiti inclusi/.test(r.heads[1]),'gruppi per giorno con intestazione italiana: '+r.heads.join(' | '));
chk(r.lv===0&&!r.nm,'niente livelli né N/M');chk(r.hostOnce===1,'host una sola volta');chk(r.sd&&!r.full,'Siediti solo se c’è posto');chk(r.j===0,'socio: nessun picker di tutti i soci');
chk(!r.o1&&r.o3,'+ Ospite / Chiudi e registra solo all’host');chk(!r.lvBtn&&r.cancel,'il creatore non lascia il posto, può annullare il tavolo');chk(!r.nt&&r.fab,'il + è l’unico modo');chk(r.seg,'tab Tavoli/Eventi');chk(r.cov===5,'copertine');chk(!r.xss&&(SH||r.noteEsc),'XSS escape');
if(SH)await p.screenshot({path:OUT+'agenda-a-socio.png'});
await p.evaluate(()=>{const x=document.querySelector('[data-t="t1"]').closest('.agsec');document.querySelector('.agdays [data-d="'+x.dataset.day+'"]').click()});await p.click('[data-sd="t1"]');await p.waitForTimeout(500);r=await p.evaluate(()=>SAVED[0]);
chk(r&&r.seat==='t1'&&r.a==='join'&&r.me==='m0','Siediti usa la RPC solo per me');
const SRC=require('fs').readFileSync('app.js','utf8'),DSRC=require('fs').readFileSync('data.js','utf8');chk(/DB\.seat\(t\.id,'join'/.test(SRC)&&/DB\.seat\(t\.id,'leave'/.test(SRC)&&!/players:\[\.\.\.pl,\{memberId:meM\.id\}\]/.test(SRC),'Siediti/Lascia usano DB.seat');chk(/rpc\('table_seat'/.test(DSRC),'DB.seat chiama la RPC table_seat');
await p.evaluate(()=>{T[1].players=[{memberId:'m1'},{memberId:'m2'},{memberId:'m4'},{memberId:'m5'}];SAVED.length=0;window._ser={date:romeToday()};go('serata')});await p.waitForTimeout(800);
await p.evaluate(()=>{T[1].players=[{memberId:'m1'},{memberId:'m2'},{memberId:'m4'},{memberId:'m5'}]});
await p.click('#tfab');await p.waitForTimeout(500);
r=await p.evaluate(()=>({sh:!!document.querySelector('.agov .agsheet'),th:document.querySelector('#th')?.value,thType:document.querySelector('#th')?.type,db:document.querySelector('#agdb')?.textContent,tn:document.querySelector('#tn')?.maxLength}));
chk(r.sh&&r.th==='m0'&&r.thType==='hidden','foglio dal basso, chi apre è l’host');chk(/^📅 Oggi, .* novembre/.test(r.db),'data in italiano: '+r.db);chk(r.tn===120,'nota max 120');
if(SH)await p.screenshot({path:OUT+'agenda-a-foglio.png'});
await p.click('#tsv');await p.waitForTimeout(500);r=await p.evaluate(()=>SAVED[0]);chk(r&&r.hostId==='m0'&&r.players.length===1&&r.players[0].memberId==='m0','nuovo tavolo: il creatore è seduto');
chk(!(await p.evaluate(()=>!!document.querySelector('.agov'))),'foglio chiuso dopo il salvataggio');
await p.evaluate(()=>go('eventi'));await p.waitForTimeout(3500);await p.mouse.move(5,300);
r=await p.evaluate(()=>V.innerText);chk(/Sala parrocchiale/.test(r)&&/€ 5,00/.test(r)&&/Gratuito/.test(r),'eventi: luogo e costo sulla scheda');
if(SH)await p.screenshot({path:OUT+'agenda-a-eventi.png'});
await p.evaluate(()=>{DB.remote=null;go('serata')});await p.waitForTimeout(800);chk(await p.evaluate(()=>!!V.querySelector('.evseg')),'tab visibili anche senza connessione');
chk(errs.length===0,'nessun errore JS socio: '+errs.join(' | '));
// staff
({p,errs}=await mk('staff'));
r=await p.evaluate(()=>({j:V.querySelectorAll('[data-j]').length,o:V.querySelectorAll('[data-o]').length,x:V.querySelectorAll('[data-x]').length}));chk(r.j===5&&r.o===5&&r.x===5,'staff: gestione giocatori, ospite, elimina');
await p.evaluate(()=>document.querySelector('[data-t="t1"]').scrollIntoView({block:'start'}));await p.evaluate(()=>scrollBy(0,-150));
if(SH)await p.screenshot({path:OUT+'agenda-a-staff.png'});
await p.click('#tfab');await p.waitForTimeout(400);chk(await p.evaluate(()=>document.querySelector('#th')?.tagName==='SELECT'),'staff: sceglie chi ospita');
chk(errs.length===0,'nessun errore JS staff: '+errs.join(' | '));
await b.close();console.log(`v40.6: ${ok}/${n}`);process.exit(ok===n?0:1)})()
