// node tests/v41.17.test.js — accesso mobile 390x844: quota, disattivato, sospeso, staff, lucchetto admin
const pw=require('playwright-core');
const fs=require('fs');
const path=require('path');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const PORT=process.env.TEST_PORT||8799;
const SHOT=process.env.SHOT_DIR||'/workspace';

(async()=>{
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
  const ctx=await b.newContext({
    serviceWorkers:'block',
    viewport:{width:390,height:844},
    hasTouch:true,
    isMobile:true,
    locale:'it-IT',
    timezoneId:'Europe/Rome'
  });
  const p=await ctx.newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.route(/supabase|jsdelivr/,r=>r.abort());
  await p.goto('http://127.0.0.1:'+PORT+'/',{waitUntil:'domcontentloaded',timeout:20000});
  await W(1000);

  const boot=async(extra)=>{
    await p.evaluate((extra)=>{
      document.body.classList.remove('gate','acc-lock');
      document.querySelectorAll('.mdl,#acc-lock,#acc-avviso,#acc-ban').forEach(x=>x.remove());
      localStorage.clear();
      admin=true;localStorage.setItem('pergioco-mode','admin');
      const ms=[
        {id:'m1',nome:'Anna',cognome:'Verdi',active:true,userId:'u1'},
        {id:'m2',nome:'Bruno',cognome:'Neri',active:true}
      ];
      const gs=[{id:'catan',name:'Catan',min:3,max:4,minT:60,maxT:90,age:10,coop:false,kind:'gdt'}];
      const today=(typeof romeToday==='function'?romeToday():'2026-11-17');const ts=[{id:'t1',date:today,evening:'serata',gameId:'catan',hostId:'m2',seats:4,status:'open',players:[{memberId:'m2'}]}];
      DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>[];DB.allTables=async()=>ts;
      DB.hasPin=async()=>true;DB.legacyNames=async()=>[];DB.status='online';
      const R=DB.remote||{};R.user=async()=>({id:'u1'});R.isAdmin=async()=>true;R.modCached=false;R.client=null;DB.remote=R;
      if(typeof RC!=='undefined'){RC.data=RC.norm(RC.seed());RC.ready=true}
      if(typeof ACC!=='undefined'){ACC.avvisoFatto=false;ACC.apply(extra.stato||null)}
      if(extra.mod){DB.remote.modCached=true}
    },extra||{});
  };

  // 1) avviso non in regola + countdown
  await boot({stato:{autenticato:true,staff:false,stato:'non_in_regola',blocca_app:false,blocca_azioni:false,non_in_regola:true}});
  await p.evaluate(()=>{ACC.showAvviso()});
  await W(200);
  const av1=await p.evaluate(()=>{
    const m=document.getElementById('acc-avviso');
    const btn=document.getElementById('acc-ok');
    const cd=document.getElementById('acc-cd');
    return{ok:!!m,txt:m?m.innerText:'',btnHidden:btn?btn.hidden:true,cd:cd?cd.textContent:'',backdrop:!!m};
  });
  chk(av1.ok&&/tessera associativa/i.test(av1.txt)&&/contatta lo staff/i.test(av1.txt),'avviso quota: testo rinnovo tessera e staff');
  chk(av1.btnHidden&&String(av1.cd)!=='','nei primi secondi il pulsante è nascosto e il countdown è visibile');
  await p.screenshot({path:path.join(SHOT,'v41.17-avviso-quota.png'),fullPage:false});
  await W(5200);
  const av2=await p.evaluate(()=>{
    const btn=document.getElementById('acc-ok');
    const wrap=document.getElementById('acc-cd-wrap');
    return{shown:btn&&!btn.hidden&&!btn.disabled,label:btn?btn.textContent:'',wrapHidden:wrap?wrap.hidden:true};
  });
  chk(av2.shown&&/Ho capito/.test(av2.label),'dopo 5 secondi compare il pulsante Ho capito');
  await p.evaluate(()=>{const b=document.getElementById('acc-ok');if(b)b.click()});
  await W(200);
  const av3=await p.evaluate(()=>!document.getElementById('acc-avviso'));
  chk(av3,'Ho capito chiude l\'avviso');

  // 2) schermata disattivato
  await boot({stato:{autenticato:true,staff:false,stato:'disattivato',blocca_app:true,blocca_azioni:true,non_in_regola:false}});
  await p.evaluate(()=>ACC.showBlocco());
  await W(200);
  const bl=await p.evaluate(()=>{
    const s=document.getElementById('acc-lock');
    const btn=document.getElementById('acc-esci');
    return{ok:!!s,txt:s?s.innerText:'',esci:btn?btn.textContent:'',gate:document.body.classList.contains('gate')};
  });
  chk(bl.ok&&bl.gate&&/disattivato/i.test(bl.txt)&&/tessera associativa/i.test(bl.txt)&&/staff/i.test(bl.txt),'schermata disattivato: messaggio e invito a contattare lo staff');
  chk(/Esci/.test(bl.esci),'schermata disattivato: pulsante Esci');
  await p.screenshot({path:path.join(SHOT,'v41.17-disattivato.png'),fullPage:false});

  // 3) sospeso: tavolo senza azioni
  await boot({stato:{autenticato:true,staff:false,stato:'sospeso',blocca_app:false,blocca_azioni:true,non_in_regola:false}});
  await p.evaluate(async()=>{
    document.body.classList.remove('gate','acc-lock');admin=false;
    const V=document.getElementById('view');if(V)V.innerHTML='';
    await views.serata();
    if(typeof ACC!=='undefined')ACC.mountBanner();
  });
  await W(400);
  const sos=await p.evaluate(()=>{
    const ban=document.getElementById('acc-ban');
    const sit=document.querySelector('[data-sd]');
    const leave=document.querySelector('[data-lv]');
    const fab=document.getElementById('tfab');
    return{ban:ban?ban.textContent:'',sit:!!sit,leave:!!leave,fab:!!fab,txt:document.getElementById('view')?document.getElementById('view').innerText:'',hasTable:/Catan/.test(document.getElementById('view')?document.getElementById('view').innerText:'')};
  });
  chk(/sospeso/i.test(sos.ban)&&/non puoi fare questa azione/i.test(sos.ban),'sospeso: messaggio chiaro in pagina');
  chk(sos.hasTable,'sospeso: il tavolo è visibile');
  chk(!sos.sit&&!sos.leave&&!sos.fab,'sospeso: niente Siediti, Lascia il posto né pulsante +');
  await p.screenshot({path:path.join(SHOT,'v41.17-sospeso-tavolo.png'),fullPage:false});

  // 4) staff mai bloccato
  await boot({stato:{autenticato:true,staff:true,stato:'staff',blocca_app:false,blocca_azioni:false,non_in_regola:true}});
  const staffAv=await p.evaluate(async()=>{
    const r=await ACC.dopoAvvio();
    return{r,modal:!!document.getElementById('acc-avviso'),blocca:ACC.bloccaAzioni(),app:ACC.bloccaApp(),nir:ACC.nonInRegola()};
  });
  chk(staffAv.r!=='blocked'&&!staffAv.modal&&!staffAv.blocca&&!staffAv.app&&!staffAv.nir,'staff: nessun avviso quota, nessuna azione bloccata');
  await p.evaluate(async()=>{
    document.body.classList.remove('gate','acc-lock');
    await views.serata();
  });
  await W(400);
  const staffT=await p.evaluate(()=>!!document.querySelector('[data-sd]')||!!document.getElementById('tfab'));
  chk(staffT,'staff: può ancora aprire o unirsi a un tavolo');

  // 5) lucchetto Presidente: moderatore non può, admin sì
  await boot({stato:{autenticato:true,staff:true,stato:'staff',blocca_app:false,blocca_azioni:false,non_in_regola:false},mod:true});
  await p.evaluate(async()=>{
    document.body.classList.remove('gate','acc-lock');
    admin=true;DB.remote.modCached=true;
    await RC.draw('presidente');
  });
  await W(400);
  const modUi=await p.evaluate(()=>{
    const lock=document.getElementById('rc-lock');
    const sv=document.getElementById('rcsv');
    const cbs=[...document.querySelectorAll('[data-am]')];
    return{lock:lock?lock.textContent:'',sv:!!sv,disabled:cbs.length>0&&cbs.every(c=>c.disabled),icon:!!document.querySelector('.rclck, #rc-lock')};
  });
  chk(/Solo gli admin/i.test(modUi.lock)&&!modUi.sv&&modUi.disabled,'moderatore: Presidente bloccato, controlli disabilitati, niente Salva');

  await p.evaluate(async()=>{
    admin=true;DB.remote.modCached=false;
    await RC.draw('presidente');
  });
  await W(400);
  const admUi=await p.evaluate(()=>{
    const lock=document.getElementById('rc-lock');
    const sv=document.getElementById('rcsv');
    const cbs=[...document.querySelectorAll('[data-am]')];
    return{lock:!!lock,sv:!!sv,enabled:cbs.length>0&&cbs.every(c=>!c.disabled),past:RC.cat('past-president')&&RC.cat('past-president').priorita===105};
  });
  chk(!admUi.lock&&admUi.sv&&admUi.enabled&&admUi.past,'admin: può modificare e assegnare Presidente; Past President in catalogo (105)');

  await p.evaluate(async()=>{await RC.draw('past-president')});
  await W(300);
  const pastAdm=await p.evaluate(()=>!!document.getElementById('rcsv')&&!document.getElementById('rc-lock'));
  chk(pastAdm,'admin: anche Past President è modificabile');

  await p.evaluate(async()=>{
    admin=true;DB.remote.modCached=true;
    await RC.draw('past-president');
  });
  await W(300);
  const pastMod=await p.evaluate(()=>!!document.getElementById('rc-lock')&&!document.getElementById('rcsv'));
  chk(pastMod,'moderatore: anche Past President è bloccata');

  // 6) tab attivo evidenziato (mobile 390 e desktop)
  await p.evaluate(()=>{
    document.body.classList.remove('gate','acc-lock');
    document.querySelectorAll('.mdl,#acc-lock,#acc-avviso').forEach(x=>x.remove());
    const V=document.getElementById('view');if(V)V.innerHTML='<h2>Agenda</h2><p class="muted">Anteprima tab attivo</p>';
    document.querySelectorAll('nav button').forEach(b=>{const on=b.dataset.v==='serata';b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  });
  await W(200);
  const tabM=await p.evaluate(()=>{
    const on=document.querySelector('nav button.on');
    const others=[...document.querySelectorAll('nav button:not(.on)')];
    const cs=on?getComputedStyle(on):{};
    const before=on?getComputedStyle(on,'::before'):{};
    const nav=document.querySelector('nav#tabs')||document.querySelector('nav');
    const nr=nav?nav.getBoundingClientRect():{};
    const br=on?on.getBoundingClientRect():{};
    return{
      label:on?on.textContent.trim():'',
      aria:on?on.getAttribute('aria-current'):'',
      otherAria:others.every(b=>b.getAttribute('aria-current')!=='page'),
      color:cs.color,weight:cs.fontWeight,pad:cs.padding,
      minH:cs.minHeight,h:br.height,
      navH:nr.height,btnCount:document.querySelectorAll('nav button').length,
      beforeOp:before.opacity,beforeBg:before.backgroundColor,beforeR:before.borderRadius
    };
  });
  chk(tabM.label.indexOf('Agenda')>=0&&tabM.aria==='page'&&tabM.otherAria,'mobile: tab Agenda ha aria-current=page, gli altri no');
  chk(tabM.color==='rgb(20, 37, 74)'&&String(tabM.weight)==='700','mobile: etichetta attiva in blu pieno #14254a e grassetto');
  chk(tabM.beforeOp==='1'&&/227\s*,\s*233\s*,\s*247/.test(tabM.beforeBg||''),'mobile: pillola #e3e9f7 visibile dietro icona e etichetta');
  chk(tabM.pad==='8px 0px'&&tabM.minH==='52px'&&tabM.btnCount===7,'mobile: padding e min-height dei tab invariati, 7 tab');
  const nav=await p.$('nav#tabs')||await p.$('nav');
  await nav.screenshot({path:require('path').join(SHOT,'v41.17-tab-attivo-mobile.png')});

  await ctx.close();
  const desk=await b.newContext({
    serviceWorkers:'block',
    viewport:{width:1100,height:800},
    locale:'it-IT',
    timezoneId:'Europe/Rome'
  });
  const d=await desk.newPage();
  d.on('pageerror',e=>errs.push('desk '+e.message));
  await d.route(/supabase|jsdelivr/,r=>r.abort());
  await d.goto('http://127.0.0.1:'+PORT+'/',{waitUntil:'domcontentloaded',timeout:20000});
  await W(800);
  await d.evaluate(()=>{
    document.body.classList.remove('gate','acc-lock');
    const V=document.getElementById('view');if(V)V.innerHTML='<h2>Agenda</h2><p class="muted">Anteprima tab attivo (desktop)</p>';
    document.querySelectorAll('nav button').forEach(b=>{const on=b.dataset.v==='serata';b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  });
  await W(200);
  const tabD=await d.evaluate(()=>{
    const on=document.querySelector('nav button.on');
    const cs=on?getComputedStyle(on):{};
    const before=on?getComputedStyle(on,'::before'):{};
    const br=on?on.getBoundingClientRect():{};
    const nav=document.querySelector('nav');
    return{aria:on?on.getAttribute('aria-current'):'',color:cs.color,weight:cs.fontWeight,
      flex:cs.flex,w:Math.round(br.width),beforeOp:before.opacity,beforeBg:before.backgroundColor,
      navH:nav?nav.getBoundingClientRect().height:0,pad:cs.padding,minH:cs.minHeight};
  });
  chk(tabD.aria==='page'&&tabD.color==='rgb(20, 37, 74)'&&String(tabD.weight)==='700','desktop: tab attivo blu #14254a, aria-current=page');
  chk(tabD.beforeOp==='1'&&tabD.w<=92&&tabD.minH==='52px'&&tabD.pad==='8px 0px','desktop: pillola visibile, tab larghi al più 92px, altezza invariata');
  const navD=await d.$('nav#tabs')||await d.$('nav');
  await navD.screenshot({path:require('path').join(SHOT,'v41.17-tab-attivo-desktop.png')});
  await desk.close();

  chk(errs.length===0,'nessun errore di pagina: '+(errs[0]||'ok'));
  await b.close();
  console.log(`v41.17 pw: ${ok}/${n} ok`);
  if(ok!==n)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
