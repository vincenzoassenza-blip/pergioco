// node tests/v41.18.test.js — scheda Moderatori: nome del socio, stati, Admin in sola lettura, XSS
const pw=require('playwright-core'),path=require('path'),fs=require('fs');
const SHOT='/workspace';
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m)}};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const boot=async(b,role='staff')=>{
  const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,locale:'it-IT',timezoneId:'Europe/Rome'});
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p._errs=errs;
  await p.route(/supabase|jsdelivr/,r=>r.abort());
  await p.goto('http://127.0.0.1:8799/',{waitUntil:'domcontentloaded',timeout:20000});
  await W(800);
  await p.evaluate(role=>{
    document.body.classList.remove('gate');localStorage.clear();
    admin=role!=='socio';localStorage.setItem('pergioco-mode',role==='staff'?'admin':role==='mod'?'admin':'socio');
    const ms=[
      {id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1'},
      {id:'m2',nome:'Chiara',cognome:'Tumino',active:true,userId:'u2'},
      {id:'m3',nome:'Giulia',cognome:'Rossi',active:true},
      {id:'m4',nome:'Sara',cognome:'Verdi',active:true,userId:'u4'}
    ];
    DB.games=async()=>[];DB.members=async()=>ms;DB.plays=async()=>[];DB.allTables=async()=>[];DB.legacyNames=async()=>[];DB.hasPin=async()=>true;
    DB.status='online';
    const R=DB.remote||{};
    window._mods=[
      {email:'chiara.tumino@example.com',user_id:'u2',member_id:'m2',nome:'Chiara',cognome:'Tumino',stato:'collegato'},
      {email:'account.solo@example.com',user_id:'u9',member_id:null,nome:null,cognome:null,stato:'account'},
      {email:'nuovo.mod@example.com',user_id:null,member_id:null,nome:null,cognome:null,stato:'assente'}
    ];
    window._adms=[{email:'vincenzo.assenza@example.com',user_id:'u1',member_id:'m1',nome:'Vincenzo',cognome:'Assenza',stato:'collegato'}];
    window._smm=null;window._sm=null;
    R.user=async()=>({id:'u1',email:'vincenzo.assenza@example.com'});
    R.isAdmin=async()=>role==='staff'||role==='mod';
    R.isMod=async()=>role==='mod';
    R.modCached=role==='mod';
    R.adminCached=role==='staff';
    R.moderators=async()=>window._mods.slice();
    R.admins=async()=>window._adms.slice();
    R.setModerator=async(email,on)=>{window._sm={email,on};if(on)window._mods.push({email,stato:'assente'})};
    R.setModeratorMember=async(id,on)=>{window._smm={id,on};const m=(await DB.members()).find(x=>x.id===id);if(m&&on)window._mods.push({email:id+'@example.com',user_id:m.userId,member_id:m.id,nome:m.nome,cognome:m.cognome,stato:'collegato'})};
    DB.remote=R;
  },role);
  return p;
};
const openMods=async p=>{
  await p.evaluate(()=>{adminTab='mods';go('altro')});
  await p.waitForFunction(()=>document.getElementById('me2')||document.getElementById('mmem')||!document.querySelector('[data-alt=mods]'),null,{timeout:8000});
  await W(400);
};

(async()=>{
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
  {const p=await boot(b,'staff');const q=f=>p.evaluate(f);
   await openMods(p);
   chk(await q(()=>document.querySelector('#view h2.altit')&&document.querySelector('#view h2.altit').textContent==='Gestione'),'titolo Gestione');
   chk(await q(()=>{const h=[...document.querySelectorAll('#adm h3.alsub')].map(x=>x.textContent);return h[0]==='Admin'&&h[1]==='Moderatori'}),'sezioni Admin e Moderatori');
   chk(await q(()=>{const a=document.querySelector('.aladmlist .alstaffp');return a&&a.querySelector('b').textContent.includes('Vincenzo Assenza')&&/vincenzo\.assenza@example\.com/.test(a.textContent)}),'admin: nome in evidenza, email sotto');
   chk(await q(()=>!document.querySelector('.aladmlist [data-mr]')&&document.querySelectorAll('.aladmlist .almod').length===1),'admin: sola lettura, niente Rimuovi');
   chk(await q(()=>{const rows=[...document.querySelectorAll('#adm .almod .alstaffp')].slice(1).map(x=>x.innerText);return rows.some(t=>/Chiara Tumino/.test(t)&&/chiara\.tumino@example\.com/.test(t))}),'moderatore collegato: nome + email');
   chk(await q(()=>[...document.querySelectorAll('#adm .alstaffp')].some(x=>/account\.solo@example\.com/.test(x.innerText)&&/Account registrato, nessun socio collegato/.test(x.innerText))),'stato account senza scheda');
   chk(await q(()=>[...document.querySelectorAll('#adm .alstaffp')].some(x=>/nuovo\.mod@example\.com/.test(x.innerText)&&/Non ancora registrato/.test(x.innerText))),'stato non ancora registrato');
   chk(await q(()=>{const opts=[...document.querySelectorAll('#mmem option')].map(o=>o.value+':'+o.textContent);return opts.includes('m4:Sara Verdi')&&!opts.some(o=>/m1:|m2:|m3:/.test(o))}),'select: solo soci registrati non già nominati (niente admin, già mod, o senza account)');
   chk(await q(()=>document.getElementById('me2')&&document.getElementById('ma')&&document.getElementById('mam')&&![...document.querySelectorAll('#adm label')].some(l=>/\*/.test(l.textContent))),'campo email facoltativo e entrambi i tasti di nomina');
   await p.evaluate(()=>document.activeElement&&document.activeElement.blur());
   await W(200);
   fs.mkdirSync(SHOT,{recursive:true});
   await p.screenshot({path:path.join(SHOT,'v41.18-moderatori-mobile.png'),fullPage:false});
   await p.evaluate(()=>{const el=document.getElementById('mmem');if(el)el.scrollIntoView({block:'center'})});
   await W(200);
   await p.screenshot({path:path.join(SHOT,'v41.18-moderatori-elenco-mobile.png'),fullPage:false});
   await p.evaluate(()=>{
     window._mods.push({email:'xss.mod@example.com',user_id:'u8',member_id:'mx',nome:'<img src=x onerror=alert(1)>',cognome:'Neri',stato:'collegato'});
     adminTab='mods';go('altro');
   });
   await W(600);
   chk(await q(()=>!document.querySelector('#adm img')&&!/<img\s/i.test(document.getElementById('adm').innerHTML)&&/&lt;img src=x/.test(document.getElementById('adm').innerHTML)&&[...document.querySelectorAll('#adm .alstaffp b')].some(b=>b.textContent.includes('<img src=x onerror=alert(1)>'))),'XSS: nome pericoloso mostrato come testo');
   await p.selectOption('#mmem','m4');await p.click('#mam');await W(600);
   chk(await q(()=>window._smm&&window._smm.id==='m4'&&window._smm.on===true&&[...document.querySelectorAll('#adm .alstaffp b')].some(b=>b.textContent==='Sara Verdi')),'nomina dal socio chiama setModeratorMember e aggiorna l\'elenco');
   await p.evaluate(()=>{adminTab='soci';go('altro')});await W(700);
   chk(await q(()=>!/chiara\.tumino@example\.com|account\.solo@example\.com|nuovo\.mod@example\.com|xss\.mod@example\.com/.test((document.getElementById('adm')||document.body).innerText)),'in Soci le email dei moderatori non compaiono');
   await p.evaluate(()=>{window._pv=null;go('profilo')});await W(1200);
   chk(await q(()=>!/chiara\.tumino@example\.com|account\.solo@example\.com|nuovo\.mod@example\.com/.test(document.body.innerText)),'nel Profilo le email dei moderatori non compaiono');
   chk(p._errs.length===0,'nessun errore JS '+p._errs.join('|'));
   await p.context().close()}
  {const p=await boot(b,'mod');
   await p.evaluate(()=>{go('altro')});await W(1000);
   chk(await p.evaluate(()=>{const t=[...document.querySelectorAll('#allist>.alr b')].map(b=>b.textContent);return !t.includes('Moderatori')&&!document.getElementById('me2')&&t.includes('Soci')}),'il moderatore non vede la scheda Moderatori');
   chk(p._errs.length===0,'mod: nessun errore JS '+p._errs.join('|'));
   await p.context().close()}
  await b.close();
  console.log(`v41.18: ${ok}/${n} ok`);
  process.exit(ok===n?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
