// node tests/v39.1.test.js — richiede: python3 -m http.server 8799 (dalla cartella dell'app)
// Ritorno all'app (bfcache/visibilità/vista bloccata), «indietro» tra profili, filtro Partite con ricerca, dialog avvisi, link uniformi, orologio
const pw=require('playwright-core'),fs=require('fs');const R=f=>fs.readFileSync(__dirname+'/../'+f,'utf8');
let ok=0,n=0;const chk=(c,m,x)=>{n++;if(c)ok++;else console.log('FAIL',m,x??'')};
const A=R('app.js'),S=R('supabase/migrate-v39.1.sql');
chk(/addEventListener\('pageshow'/.test(A)&&/visibilitychange/.test(A),'listener ritorno');chk(!/confirm\(w\.join/.test(A),'niente confirm() per avvisi');
chk(/security definer set search_path to 'public'/.test(S)&&/revoke all on function public\.des_proponi_voto\(jsonb\) from anon/.test(S)&&/grant execute on function public\.des_proponi_voto\(jsonb\) to authenticated/.test(S)&&/from public;/.test(S),'migration sicura');
chk(!/⏱/.test(R('app.js')+R('giochi.js')+R('desideri.js')+R('consigliere.js')+R('equilibrio.js')+R('xp.js')),'orologio uniforme');
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});const c=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8799/',{waitUntil:'networkidle'});await p.waitForTimeout(3000);
 await p.evaluate(()=>{document.body.classList.remove('gate');admin=true;const gs=['Azul','Catan','Root'].map((x,i)=>({id:'g'+i,name:x,min:2,max:4,minT:30,maxT:45}));const ms=['Anna','Bruno','Carla'].map((x,i)=>({id:'m'+i,nome:x,cognome:'',active:true}));
  const ps=[0,1,2,0].map((g,i)=>({id:'p'+i,gameId:'g'+g,date:'2026-10-2'+i,players:[{memberId:'m0',score:3,winner:true},{memberId:'m1',score:1}],coop:false}));DB.games=async()=>gs;DB.plays=async()=>ps;DB.members=async()=>ms;DB.tables=async()=>[];XP.p=Promise.resolve()});
 const txt=()=>p.evaluate(()=>document.querySelector('main, #v, #view')?null:null);
 // 1) vista svuotata + pageshow persisted -> ridisegno
 await p.evaluate(()=>go('record'));await p.waitForTimeout(1500);await p.evaluate(()=>{V.innerHTML='';dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))});await p.waitForTimeout(1500);
 chk(await p.evaluate(()=>V.textContent.includes('Record')),'pageshow ridisegna');
 // 2) vista vuota al ritorno visibile
 await p.evaluate(()=>{V.innerHTML='';document.dispatchEvent(new Event('visibilitychange'))});await p.waitForTimeout(1500);chk(await p.evaluate(()=>V.children.length>0),'visibilitychange ridisegna');
 // 3) caricamento bloccato (promessa mai risolta): la nav non resta vuota
 await p.evaluate(()=>{XP.p=new Promise(()=>{});const ol=XP.load;XP.load=async()=>{};V.innerHTML='';document.querySelector('#tabs button[data-v="ludoteca"]').click()});await p.waitForTimeout(14000);
 chk(await p.evaluate(()=>V.children.length>0&&!!V.textContent.trim()),'vista bloccata si sblocca',await p.evaluate(()=>V.innerHTML.slice(0,120)));
 // 4) profilo -> compagno -> indietro torna al primo profilo
 await p.evaluate(()=>go('giocatori'));await p.waitForTimeout(1500);await p.evaluate(()=>openProfile('m0'));await p.waitForTimeout(1500);await p.evaluate(()=>openProfile('m1'));await p.waitForTimeout(1500);
 chk(await p.evaluate(()=>location.hash==='#profilo/m1'),'hash profilo');await p.goBack();await p.waitForTimeout(2000);
 chk(await p.evaluate(()=>location.hash==='#profilo/m0'&&document.querySelector('.pname')?.textContent.includes('Anna')),'indietro torna al profilo',await p.evaluate(()=>location.hash));
 await p.goBack();await p.waitForTimeout(2000);chk(await p.evaluate(()=>location.hash==='#giocatori'),'poi Community',await p.evaluate(()=>location.hash));
 // 5) partite: link uniformi + filtro con ricerca
 await p.evaluate(()=>{localStorage.setItem('pergioco-mode','admin');admin=true;adminTab='partite';go('altro')});await p.waitForTimeout(2000);await p.waitForTimeout(1500);
 const hasGf=await p.$('#gf');if(hasGf){chk(await p.evaluate(()=>!!document.querySelector('#gf')?.nextElementSibling?.classList.contains('gp')),'picker su #gf');await p.fill('#gf + .gp .gpq','roo');await p.keyboard.press('Enter');await p.waitForTimeout(800);
  chk(await p.evaluate(()=>$('#gf').value==='g2'),'filtro scelto');chk(await p.evaluate(()=>document.querySelectorAll('[data-gid]').length>0&&document.querySelectorAll('.gpdate').length>0&&document.querySelectorAll('.gpnames').length>0),'link gioco + data/partecipanti in Partite');
  await p.click('.gpclr');await p.waitForTimeout(800);chk(await p.evaluate(()=>$('#gf').value===''),'mostra tutte')}else{const src=require('fs').readFileSync(__dirname+'/../app.js','utf8');chk(/gpMount\(\$\('#gf'\)/.test(src)&&/Mostra tutte le partite/.test(src),'picker su #gf (statico: pannello richiede login staff)');chk(/drawPlays[\s\S]{0,2500}gLink/.test(src)&&/gestionepartita/.test(src)&&/gpdate/.test(src)&&/gpnames/.test(src),'gioco+data+partecipanti in Partite (statico)')}
 // 6) dialog avvisi dell'app
 const res=await p.evaluate(async()=>{const pr=modal('⚠️ prova',{title:'⚠️ Controlla la partita',okL:'Salva lo stesso',noL:'Correggi',focusNo:true});const d=document.querySelector('.mbox');const r={role:d.getAttribute('role'),lab:!!document.getElementById(d.getAttribute('aria-labelledby')),foc:document.activeElement.textContent};document.querySelector('[data-k="0"]').click();r.v=await pr;return r});
 chk(res.role==='alertdialog'&&res.lab&&res.foc==='Correggi'&&res.v===false,'dialog accessibile',res);
 chk(errs.length===0,'nessun errore JS',errs);console.log(ok+'/'+n+' ok');await b.close();process.exit(ok===n?0:1)})();
