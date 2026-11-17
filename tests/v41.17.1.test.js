// node tests/v41.17.1.test.js — riquadro «Le tue ricompense» del profilo chiudibile come gli altri
const pw=require('playwright-core');
const fs=require('fs');
const path=require('path');
const {APP_VERSION,swCache,hasAsset,read}=require('./appver');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const PORT=process.env.TEST_PORT||8799;
const SHOT=process.env.SHOT_DIR||'/workspace';

const rc=read('ricompense.js');
const css=read('styles.css');
chk(swCache()&&hasAsset('styles.css')&&hasAsset('app.js'),'versione in brand.js allineata a cache SW e pin degli asset');
chk(hasAsset('ricompense.js')&&hasAsset('styles.css')&&hasAsset('brand.js'),'asset modificati pinnati in index e SW');
chk(/return`<details class="card rcsel"/.test(rc)&&/<summary><b>Le tue ricompense<\/b><\/summary>/.test(rc),'selHtml usa details e summary come gli altri riquadri');
chk(/_selOpen/.test(rc)&&/addEventListener\('toggle'/.test(rc),'ricorda aperto/chiuso quando il profilo si ridisegna');
chk(/details>summary::after\{content:'▸'/.test(css)&&/details\[open\]>summary::after\{content:'▾'/.test(css),'stessa freccia globale ▸/▾ del profilo');
chk(/v41\.17\.1/.test(css)&&/\.rcsel>summary/.test(css),'stile v41.17.1 sul riquadro ricompense');

(async()=>{
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
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
  await W(800);

  await p.evaluate(()=>{
    document.body.classList.remove('gate','acc-lock');
    document.querySelectorAll('.mdl,#acc-lock,#acc-avviso,#acc-ban').forEach(x=>x.remove());
    localStorage.clear();
    admin=false;localStorage.setItem('pergioco-mode','user');
    const ms=[{id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1',favGameId:'catan',statsPub:true}];
    const gs=[{id:'catan',name:'Catan',min:3,max:4,minT:60,maxT:90,age:10,coop:false,kind:'gdt'}];
    const plays=[{id:'p1',date:'2026-11-10',gameId:'catan',playKind:'board',players:[{memberId:'m1',winner:true,score:'10'}]}];
    DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>plays;DB.allTables=async()=>[];
    DB.hasPin=async()=>true;DB.legacyNames=async()=>[];DB.status='online';
    const R=DB.remote||{};
    R.user=async()=>({id:'u1'});R.isAdmin=async()=>false;R.modCached=false;
    R.client={from(){return{select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})}),order:async()=>({data:[],error:null})})}},rpc:async()=>({data:null,error:{message:'offline'}})};
    R.updateProfile=async o=>{window._upd=o};
    DB.remote=R;
    if(typeof ACC!=='undefined'){ACC.avvisoFatto=true;ACC.apply({autenticato:true,staff:false,stato:'in_regola',blocca_app:false,blocca_azioni:false,non_in_regola:false})}
    if(typeof RC!=='undefined'){
      RC._p=null;RC._selOpen=false;
      const d=RC.seed();
      d.assegnate=[
        {member_id:'m1',ricompensa_id:'presidente'},
        {member_id:'m1',ricompensa_id:'past-president'},
        {member_id:'m1',ricompensa_id:'tester'}
      ];
      RC.data=RC.norm(d);RC.ready=true;
      RC.load=async()=>RC.data;
    }
    window._pv=null;
  });
  await p.evaluate(async()=>{if(typeof go==='function')await go('profilo')});
  await W(900);

  const closed=await p.evaluate(()=>{
    const d=document.querySelector('#view details.card.rcsel');
    if(!d)return {ok:false,why:'manca details.card.rcsel'};
    const s=d.querySelector('summary');
    const arrow=s?getComputedStyle(s,'::after').content:'';
    const list=d.querySelectorAll('.rec').length;
    return {ok:true,tag:d.tagName,open:d.open,title:(s&&s.textContent||'').trim(),arrow,list,
      sel:d.querySelectorAll('[data-rcsc]').length,av:!!d.querySelector('.rcavsel')};
  });
  chk(closed.ok&&closed.tag==='DETAILS'&&closed.open===false&&closed.title==='Le tue ricompense',
    'riquadro è un details chiuso di partenza con titolo «Le tue ricompense»'+(closed.why?(' '+closed.why):''));
  chk(closed.arrow==='"▸"','chiuso mostra la stessa freccia ▸ degli altri riquadri');
  chk(closed.list>=3&&closed.sel>=4&&closed.av,'elenco, selettori e avatar sono nel riquadro (nascosti da chiuso)');

  await p.locator('#view details.card.rcsel').screenshot({path:path.join(SHOT,'v41.17.1-ricompense-chiuso.png')});
  await p.screenshot({path:path.join(SHOT,'v41.17.1-profilo-ricompense-chiuso.png'),fullPage:false});

  await p.evaluate(()=>{const d=document.querySelector('#view details.card.rcsel');d.open=true});
  await W(200);
  const opened=await p.evaluate(()=>{
    const d=document.querySelector('#view details.card.rcsel');
    const s=d.querySelector('summary');
    const arrow=getComputedStyle(s,'::after').content;
    const recs=[...d.querySelectorAll('.rec')].map(x=>x.innerText);
    const labs=[...d.querySelectorAll('label')].map(x=>x.textContent);
    const visible=d.querySelector('.rec')&&d.querySelector('.rec').offsetParent!==null;
    return {open:d.open,arrow,recs,labs,visible,selOpen:RC._selOpen};
  });
  chk(opened.open===true&&opened.arrow==='"▾"','aperto mostra la freccia ▾');
  chk(opened.visible&&opened.recs.some(t=>/Presidente/.test(t))&&opened.recs.some(t=>/Past President/.test(t))&&opened.recs.some(t=>/Tester/.test(t)),
    'aperto: elenco ricompense visibile');
  chk(opened.labs.includes('Titolo')&&opened.labs.includes('Icona')&&opened.labs.includes('Cornice')&&opened.labs.includes('Sfondo del profilo')&&opened.labs.includes('Avatar a tema'),
    'aperto: selettori Titolo/Icona/Cornice/Sfondo e griglia Avatar a tema');
  chk(opened.selOpen===true,'toggle aggiorna lo stato ricordato');

  await p.locator('#view details.card.rcsel').screenshot({path:path.join(SHOT,'v41.17.1-ricompense-aperto.png')});
  await p.evaluate(()=>{const d=document.querySelector('#view details.card.rcsel');d.scrollIntoView({block:'start'})});
  await W(100);
  await p.screenshot({path:path.join(SHOT,'v41.17.1-profilo-ricompense-aperto.png'),fullPage:false});

  // ridisegno del profilo (come dopo una scelta): resta aperto
  await p.evaluate(async()=>{if(typeof go==='function')await go('profilo')});
  await W(800);
  const remembered=await p.evaluate(()=>{
    const d=document.querySelector('#view details.card.rcsel');
    return {exists:!!d,open:!!(d&&d.open),selOpen:RC._selOpen};
  });
  chk(remembered.exists&&remembered.open&&remembered.selOpen,'dopo go(profilo) resta aperto, come lasciato');

  // se lo si chiude, al ridisegno resta chiuso
  await p.evaluate(()=>{const d=document.querySelector('#view details.card.rcsel');d.open=false});
  await W(100);
  await p.evaluate(async()=>{if(typeof go==='function')await go('profilo')});
  await W(800);
  const recClosed=await p.evaluate(()=>{
    const d=document.querySelector('#view details.card.rcsel');
    return {exists:!!d,open:!!(d&&d.open)};
  });
  chk(recClosed.exists&&recClosed.open===false,'dopo averlo chiuso, al ridisegno resta chiuso');

  // profilo di un altro socio: niente riquadro
  await p.evaluate(async()=>{
    const ms=await DB.members();
    if(!ms.find(x=>x.id==='m2'))ms.push({id:'m2',nome:'Giulia',cognome:'Rossi',active:true,userId:'u2',statsPub:true});
    window._pv='m2';
    await go('profilo');
  });
  await W(800);
  chk(await p.evaluate(()=>!document.querySelector('#view .rcsel')),'nel profilo di un altro socio il riquadro non c\'è');

  chk(!errs.length,'nessun errore JS '+(errs.join('|')||''));
  console.log(`v41.17.1: ${ok}/${n} ok`);
  await b.close();
  process.exit(ok===n?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
