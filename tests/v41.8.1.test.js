// node tests/v41.8.1.test.js — v41.8.1: Agenda per giorno, data Partita una volta, Record uniforme, livello nel Profilo
const pw=require('playwright-core'),fs=require('fs');const{gio}=require('./screenshots-giochi.js');const P=require('./screenshots-partita.js');const C=require('./screenshots-classifica.js');const{lvp}=require('./screenshots-livello.js');const{cod}=require('./screenshots-codici.js');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 // 1 · Agenda: un altro giorno mostra i suoi tavoli
 for(const role of['socio','staff']){const p=await gio(b,role,'prossimo',900);const errs=[];p.on('pageerror',e=>errs.push(e.message));const q=(f,a)=>p.evaluate(f,a);
  await q(()=>{_TS.push({id:'o1',date:romeToday(),status:'open',seats:4,gameId:'g4',hostId:'m3',players:[{memberId:'m3'}]})});
  const d=await q(()=>{window._ser=null;return document.getElementById('g8s')&&document.getElementById('g8s').dataset.d});
  await q(()=>go('serata'));await W(1200);
  const vis=()=>q(()=>[...document.querySelectorAll('#tl .agt')].filter(e=>e.offsetParent).map(e=>e.dataset.t).join(','));
  chk(await vis()==='o1',role+': Agenda si apre su Oggi coi tavoli di oggi');
  const days=await q(()=>[...document.querySelectorAll('.agdays [data-d]')].map(b=>b.dataset.d));
  await p.click(`.agdays [data-d="${days[1]}"]`);await W(400);
  chk(await vis()==='d'&&await q(d=>document.querySelector('.agdays [data-d].on').dataset.d===d&&document.querySelector(`#agd-${d}`).offsetParent!==null&&document.querySelector(`#agd-${romeToday()}`).offsetParent===null,days[1]),role+': altro giorno → solo i suoi tavoli');
  await p.click(`.agdays [data-d="${days[2]}"]`);await W(400);chk(await vis()==='e',role+': terzo giorno');
  await p.click(`.agdays [data-d="${days[0]}"]`);await W(400);chk(await vis()==='o1',role+': di nuovo Oggi');
  await q(()=>go('ludoteca'));await W(1200);chk(await q(()=>document.getElementById('g8s')&&document.getElementById('g8s').dataset.d===romeToday()),role+': con tavoli oggi la striscia punta a Oggi');
  await q(()=>{_TS.splice(_TS.findIndex(t=>t.id==='o1'),1);go('serata');});await W(600);await q(()=>go('ludoteca'));await W(1200);
  await p.click('#g8s');await W(1300);chk(await vis()==='d'&&await q(d=>document.querySelector('.agdays [data-d].on').dataset.d===d,d),role+': la striscia apre il giorno giusto');
  chk(errs.length===0,role+' agenda: nessun errore JS '+errs.join('|'));await p.context().close()}
 // 2 · Partita: la data compare una volta sola
 {const p=await P.setup(b,'socio');const q=f=>p.evaluate(f);await q(()=>{HTMLInputElement.prototype.showPicker=function(){window._pk=(window._pk||0)+1;window._pkId=this.id}});
  await p.click('#ptdate');await W(300);
  const r=await q(()=>{const vis=e=>e&&e.offsetParent!==null&&getComputedStyle(e).opacity!=='0';const txt=[...document.querySelectorAll('#view *')].filter(e=>vis(e)&&e.children.length===0&&/novembre|\d\/\d|giovedì|Giovedì/i.test(e.textContent)).length;
   return{pk:window._pk,id:window._pkId,dvis:vis(document.getElementById('d')),dday:vis(document.getElementById('dday')),lbl:[...document.querySelectorAll('#uxaltro label')].some(l=>/^Data$/.test(l.textContent.trim())),sum:document.querySelector('#uxaltro>summary').textContent,txt,altro:document.getElementById('uxaltro').open}});
  chk(r.pk===1&&r.id==='d'&&!r.altro,'pillola → selettore nativo, Altro resta chiuso');chk(!r.dvis&&!r.dday&&!r.lbl&&r.txt===1,'data mostrata una sola volta ('+r.txt+')');chk(r.sum==='Altro (durata, nota)','Altro senza «data»');
  await q(()=>{const d=document.getElementById('d');d.value='2026-11-01';d.dispatchEvent(new Event('change'))});chk(await q(()=>/domenica 1 novembre/.test(document.getElementById('ptdate').textContent)),'la pillola segue la data scelta');
  await q(()=>{HTMLInputElement.prototype.showPicker=function(){throw new Error('no')}});await p.click('#ptdate');await W(200);
  chk(await q(()=>{const d=document.getElementById('d');return d.offsetParent!==null&&!d.classList.contains('agdi')&&document.activeElement===d&&document.getElementById('ptdate').hidden}),'senza showPicker: un solo campo al posto della pillola');
  await q(()=>document.getElementById('d').blur());chk(await q(()=>!document.getElementById('ptdate').hidden),'poi torna la pillola');await p.context().close()}
 // 3 · Record uniforme
 {const p=await C.setup(b,'socio',1500);const q=f=>p.evaluate(f);await q(()=>{document.querySelector('.clmore').click();['rgames','uxnums'].forEach(i=>document.getElementById(i).open=true)});await W(400);
  const r=await q(()=>{const rows=[...document.querySelectorAll('.clrec .clln:not(.clstat), #rgames .clln')];const shape=e=>!!e.querySelector(':scope>.ic')&&!!e.querySelector(':scope>.t')&&!!e.querySelector(':scope>.ar');
   return{n:rows.length,bad:rows.filter(e=>!shape(e)).map(e=>e.textContent.slice(0,30)),plus:/➕/.test(document.querySelector('.clmore').textContent),sub:[...document.querySelectorAll('.clsub .clln')].every(shape)&&document.querySelectorAll('.clsub .clln').length>3,
    sq:[...document.querySelectorAll('#view .card .card, #view .row>.card')].filter(e=>e.offsetParent).length,rg:[...document.querySelectorAll('#rgames button.rgl')].every(e=>e.classList.contains('clln')&&e.querySelector('.pill')),nums:document.querySelectorAll('#uxnums .clln.clstat .pill').length,
    rad:[...document.querySelectorAll('#rgames .clln,#uxnums .clln,.clrec .clln')].every(e=>getComputedStyle(e).borderRadius==='0px'&&getComputedStyle(e).textDecorationLine==='none')}});
  chk(r.n>15&&r.bad.length===0,'ogni record è icona + testo + ▸ '+r.bad.join('|'));chk(!r.plus&&r.sub,'Altri record senza ➕ e con righe uguali');chk(r.rg&&r.nums===3,'Statistiche per gioco e Numeri come righe con pillola');chk(r.sq===0&&r.rad,'nessun riquadro quadrato residuo ('+r.sq+')');
  await q(()=>{const e=[...document.querySelectorAll('.clsub .clrow')].find(x=>/—/.test(x.textContent));e&&e.click()});await W(200);chk(await q(()=>[...document.querySelectorAll('.clsub .cldet')].some(d=>/Nessun record ancora/.test(d.textContent))),'record vuoto si apre con ▾');
  await q(()=>document.querySelector('#rgames .clln').click());await W(800);chk(await q(()=>!document.querySelector('#rgames')||location.hash.length>1),'riga gioco apre le statistiche');await p.context().close()}
 // 4 · Profilo: livello in evidenza
 {const p=await lvp(b,900);const q=f=>p.evaluate(f);
  const r=await q(()=>{const h=document.querySelector('.card.prof .lvh');return h&&{t:h.textContent,pc:h.querySelector('.lvbar i').style.width,mid:!!document.querySelector('#view>.card.xpc'),nmlv:!!document.querySelector('.pname .lv'),fs:parseFloat(getComputedStyle(h.querySelector('.lvn')).fontSize),bg:getComputedStyle(h.querySelector('.lvbar i')).backgroundColor}});
  chk(r&&/^Lv 4Novizio300 XP/.test(r.t)&&/Ancora 80 XP per il livello 5▸$/.test(r.t)&&r.fs>=24,'livello grande nella scheda in alto '+(r&&r.t));chk(r&&r.pc==='43%','barra dai numeri già esistenti');chk(r&&!r.mid&&!r.nmlv,'livello tolto dal mezzo');chk(r&&r.bg==='rgb(242, 177, 52)','colore da variabile --a');
  await p.click('.lvh');await W(200);chk(await q(()=>{const pn=document.querySelector('.lvpan');return !pn.hidden&&/Come guadagnare XP/.test(pn.textContent)&&/Partite/.test(pn.textContent)&&document.querySelector('.lvh .ar').textContent==='▾'}),'tocco → come guadagnare XP');
  await q(()=>{TXT.v=TXT.norm(Object.assign({},TXT.v,{lv_invito:'Mancano {n} XP: livello {l}'}));window._pv=null;go('profilo')});await W(1500);chk(await q(()=>/Mancano 80 XP: livello 5/.test(document.querySelector('.lvh').textContent)),'testo configurabile');
  chk(await q(()=>!TXT.ok('lv_invito','<b>')&&TXT.ok('lv_invito',TXT_DEF.lv_invito)),'validazione');await p.context().close()}

 // 5 · Gestione › Codici: ricerca invece della lista infinita
 {const p=await cod(b,900);const q=f=>p.evaluate(f);const vis=()=>q(()=>[...document.querySelectorAll('.ccr')].filter(r=>!r.hidden).map(r=>r.dataset.q.split(' ')[0]+(r.dataset.new==='1'?'*':'')));
  let v=await vis();chk(await q(()=>!!document.getElementById('ccq')&&document.querySelectorAll('.ccr').length===40)&&v.length===6&&v.every(x=>x.endsWith('*'))&&v[0]==='marco*','vuoto: pochi risultati, prima chi non ha collegato (con codice in sospeso in cima) '+v.join(','));
  await p.fill('#ccq','giulia');await p.waitForTimeout(150);v=await vis();chk(v.length===1&&v[0]==='giulia','ricerca per nome');
  await p.fill('#ccq','104');await p.waitForTimeout(150);v=await vis();chk(v.length===1&&/^sara/.test(v[0]),'ricerca per tessera');
  chk(await q(()=>{const r=[...document.querySelectorAll('.ccr')].find(r=>!r.hidden);return !r.querySelector('b b')&&r.textContent.includes('<b>Neri</b>')}),'escaping del nome');
  await p.fill('#ccq','socio');await p.waitForTimeout(150);chk((await vis()).length===6&&/ne mostro 6/.test(await q(()=>document.getElementById('ccn').textContent)),'massimo 6 risultati con avviso');
  await p.fill('#ccq','zzzz');await p.waitForTimeout(150);chk((await vis()).length===0&&/Nessun socio trovato/.test(await q(()=>document.getElementById('ccn').textContent)),'nessun risultato');
  await p.fill('#ccq','socio6 ');await p.waitForTimeout(150);await q(()=>{navigator.clipboard.writeText=async()=>{}});await p.click('.ccr:not([hidden]) [data-cg]');await p.waitForTimeout(600);chk(await q(()=>window._NC[0]==='m6'),'tocco → genera il codice del socio');
  chk(await q(()=>{admin=false;localStorage.setItem('pergioco-mode','socio');return !adminMode()}),'adminMode invariato');await p.context().close()}
 const js=['profilo-livello.js','noflash.js'].map(f=>fs.readFileSync(__dirname+'/../'+f,'utf8')).join('\n'),h=fs.readFileSync(__dirname+'/../index.html','utf8'),sw=fs.readFileSync(__dirname+'/../sw.js','utf8');
 chk(!/innerHTML|insertAdjacentHTML/.test(js),'nuovi file: solo textContent');chk(/pergioco-v41\.8(\.\d)?|pergioco-v41\.9/.test(sw)&&/APP_VERSION='41\.(8(\.\d)?|9)'/.test(fs.readFileSync(__dirname+'/../brand.js','utf8'))&&/styles\.css\?v=41\.(8(\.\d)?|9)/.test(h),'versione 41.8.1');
 chk(fs.readFileSync(__dirname+'/../supabase/migrate-v41.8.1.sql','utf8').includes('"lv_max":[2,40]'),'migrazione lv_* pronta');
 await b.close();console.log(`${ok}/${n}`);process.exit(ok===n?0:1)})();
