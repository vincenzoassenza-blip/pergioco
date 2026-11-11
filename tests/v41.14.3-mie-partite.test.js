// node tests/v41.14.3-mie-partite.test.js — elenco «Le mie partite» dal Profilo, 412×915
const pw=require('playwright-core'),fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
const OUT='/workspace/pergioco-mockups/ux/le-mie-partite';
const PORT=8847;
const BASE=`http://127.0.0.1:${PORT}/`;
fs.mkdirSync(OUT,{recursive:true});
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const MIME={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let pth=decodeURIComponent((q.url||'/').split('?')[0]);if(pth==='/')pth='/index.html';
  fs.readFile(path.join(ROOT,pth),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':MIME[path.extname(pth)]||'application/octet-stream'});r.end(b)})});

const TYPES=[
  {id:'board',nome:'Gioco da tavolo',icona:'🎲',sort:10,attivo:true,capacity_default:5,kind:'board'},
  {id:'gdr',nome:'GDR',icona:'🐉',sort:20,attivo:true,capacity_default:2,kind:'gdr'},
  {id:'war',nome:'Warhammer',icona:'⚔️',sort:30,attivo:true,capacity_default:2,kind:'war'}
];

function makePlays(){
  const out=[];
  // 22 partite da tavolo mie, più una GDR e una Warhammer, più una solo di Giulia
  for(let i=0;i<22;i++){
    const d=new Date(Date.UTC(2026,10,11,12));
    d.setUTCDate(d.getUTCDate()-i);
    const iso=d.toISOString().slice(0,10);
    out.push({id:'b'+i,date:iso,gameId:i%2?'g2':'g1',playKind:'board',typeId:'board',coop:false,note:i===0?'Serata bella':'',
      players:[{memberId:'m1',score:String(10+i),winner:i%3===0},{memberId:'m2',score:String(20+i),winner:i%3!==0}]});
  }
  out.push({id:'gdr1',date:'2026-11-08',playKind:'gdr',typeId:'gdr',gameName:'Dungeons & Dragons (5th Edition)',duration:180,
    gdr:{sistema:'Dungeons & Dragons (5th Edition)',avventura:'Rovine di Shadowfell',sessione:'campagna',sessione_n:3,esito:'in_corso',esito_nota:'Cliffhanger',masterMemberId:'m1'},
    players:[{memberId:'m1',character:'Dungeon Master'},{memberId:'m2',character:'Thorn',score:'999'}],note:'Lunga sessione'});
  out.push({id:'war1',date:'2026-11-06',playKind:'war',typeId:'war',gameName:'Warhammer 40.000',versione:'Warhammer 40.000 10ª edizione',
    players:[{memberId:'m1',score:'45',winner:true},{memberId:'m2',score:'32',winner:false}]});
  out.push({id:'other',date:'2026-11-09',gameId:'g1',playKind:'board',typeId:'board',players:[{memberId:'m2',winner:true,score:'99'}]});
  return out;
}

const seed=async(p,opt={})=>{
  await p.evaluate(({opt,TYPES,plays})=>{
    document.body.classList.remove('gate');
    localStorage.clear();
    admin=!!opt.staff;
    localStorage.setItem('pergioco-mode',opt.staff?'admin':'user');
    window._pv=opt.other||null;
    const ms=[
      {id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1',favGameId:'g1',statsPub:true,avatar:'🦊'},
      {id:'m2',nome:'Giulia',cognome:'Rossi',active:true,userId:'u2',statsPub:true}
    ];
    const gs=[{id:'g1',name:'Catan',min:3,max:4},{id:'g2',name:'Azul',min:2,max:4}];
    DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>plays;DB.allTables=async()=>[];
    DB.legacyNames=async()=>[];DB.hasPin=async()=>true;DB.status='online';
    const R=DB.remote||{};
    R.user=async()=>({id:opt.uid||'u1',email:'socio@example.com'});
    R.isAdmin=async()=>!!opt.staff;
    R.updateProfile=async o=>{window._upd=o};
    R.setStatsPub=async v=>{window._pub=v};
    R.client={from(table){if(table==='table_types')return{select:()=>({order:async()=>({data:TYPES,error:null})})};return{select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})}},rpc:async()=>({data:null,error:null})};
    DB.remote=R;
    if(window.TT){TT.loaded=false;TT.types=TYPES.slice();TT.cfg={ora_default:'21:00'}}
    if(typeof Profile!=='undefined'&&!window._st33){}
  },{opt,TYPES,plays:makePlays()});
  await p.evaluate(async()=>{
    if(window.TT&&TT.load)try{await TT.load()}catch(e){}
    if(window.HD417&&HD417.av)try{await HD417.av()}catch(e){}
    window._pv=window._pv||null;
  });
};

(async()=>{
  await new Promise((res,rej)=>srv.listen(PORT,'127.0.0.1',e=>e?rej(e):res()));
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--lang=it-IT']});
  const ctx=async()=>{
    const c=await b.newContext({serviceWorkers:'block',viewport:{width:412,height:915},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'});
    const p=await c.newPage();
    await p.route(/supabase\.co|jsdelivr/,r=>r.abort());
    await p.goto(BASE,{waitUntil:'load'});await W(800);
    return {c,p};
  };

  // 1) dal Profilo: riga «Le mie partite ▸», non nel profilo altrui
  {
    const{c,p}=await ctx();
    await seed(p,{});
    await p.evaluate(async()=>{window._pv=null;await views.profilo()});await W(600);
    chk(await p.$('#pfmyp #pfmypgo'),'riga Le mie partite nel proprio Profilo');
    chk(await p.evaluate(()=>document.querySelector('#pfmypgo b').textContent==='Le mie partite'&&document.querySelector('#pfmypgo .ar').textContent==='▸'),'etichetta e freccia ▸');
    await p.screenshot({path:path.join(OUT,'01-profilo-link.png')});
    await p.click('#pfmypgo');await W(700);
    chk(await p.evaluate(()=>window._cur==='miepartite'&&/Le mie partite/.test(document.querySelector('h2').textContent)),'apre la pagina Le mie partite');
    chk(await p.$('#mpper')&&await p.$('#mptipo'),'tendine Periodo e Tipo');
    chk(await p.evaluate(()=>document.querySelector('#mpper').options[0].textContent==='Tutto'&&document.querySelector('#mptipo').options[0].textContent==='Tutto'),'prima voce delle tendine: Tutto');
    const nRows=await p.evaluate(()=>document.querySelectorAll('.mpbox .mprow').length);
    chk(nRows===20,'prime 20 righe visibili');
    chk(await p.evaluate(()=>/Carica altre \(4\)/.test(document.querySelector('.mpbox .more')?.textContent||'')),'caricamento progressivo: 24 partite, 4 rimaste (22+GDR+WH, non quella di Giulia)');
    await p.screenshot({path:path.join(OUT,'02-elenco.png')});
    await c.close();
  }

  // 2) riga intera ▸/▾ con dettagli; punteggio degli altri non esposto
  {
    const{c,p}=await ctx();
    await seed(p,{});
    await p.evaluate(async()=>{window._pv=null;await views.miepartite()});await W(700);
    const first=p.locator('.mpbox .mprow').first();
    await first.click();await W(200);
    chk(await first.evaluate(el=>el.getAttribute('aria-expanded')==='true'&&el.querySelector('.ar').textContent==='▾'),'riga aperta ▾');
    const det=await p.locator('.mpdet').first().innerText();
    chk(/Catan|Azul/.test(det)&&/EXP/.test(det)&&/Giocatori/.test(det)&&/Punteggio|tu/.test(det),'dettagli: gioco, EXP, giocatori');
    chk(!/999/.test(det),'niente punteggio 999 di un altro socio nelle prime righe (è della sessione GDR più in basso)');
    // punteggio di Giulia sulla prima partita board (i=0, score 20)
    chk(!/ · 20\b/.test(det)&&/Vincenzo|tu/.test(det),'punteggio degli altri assente, c\'è il mio nome (tu)');
    await p.screenshot({path:path.join(OUT,'03-dettaglio-aperti.png')});
    await first.click();await W(150);
    chk(await first.evaluate(el=>el.getAttribute('aria-expanded')==='false'&&el.querySelector('.ar').textContent==='▸'),'richiude ▸');
    await c.close();
  }

  // 3) filtro tipo GDR + dettaglio campi GDR; filtro periodo
  {
    const{c,p}=await ctx();
    await seed(p,{});
    await p.evaluate(async()=>{window._pv=null;await views.miepartite()});await W(700);
    await p.selectOption('#mptipo','gdr');await W(400);
    chk(await p.evaluate(()=>document.querySelectorAll('.mpbox .mprow').length===1&&/Dungeons/.test(document.querySelector('.mprow').innerText)),'filtro Tipo: solo la sessione GDR');
    await p.locator('.mprow').click();await W(200);
    const g=await p.locator('.mpdet').innerText();
    chk(/Rovine di Shadowfell/.test(g)&&/Campagna/.test(g)&&/Dungeon Master/.test(g)&&/In corso/.test(g)&&/Lunga sessione/.test(g),'dettaglio GDR: avventura, sessione, personaggio, esito, note');
    chk(!/999/.test(g),'punteggio di Thorn (999) non esposto');
    await p.screenshot({path:path.join(OUT,'04-filtro-gdr-dettaglio.png')});
    await p.selectOption('#mptipo','all');await W(200);
    await p.selectOption('#mpper','y');await W(300);
    chk(await p.evaluate(()=>document.querySelector('#mpper').value==='y'&&document.querySelectorAll('.mprow').length>=1),'filtro Periodo: Anno corrente funziona');
    await p.screenshot({path:path.join(OUT,'05-filtro-periodo.png')});
    await p.click('#bk');await W(500);
    chk(await p.$('#pfmyp'),'Indietro torna al Profilo');
    await c.close();
  }

  // 4) profilo di un altro socio: niente «Le mie partite»
  {
    const{c,p}=await ctx();
    await seed(p,{other:'m2',staff:true});
    await p.evaluate(async()=>{window._pv='m2';await views.profilo()});await W(700);
    chk(await p.evaluate(()=>!document.getElementById('pfmyp')),'nel profilo altrui non c\'è Le mie partite');
    await p.screenshot({path:path.join(OUT,'06-profilo-altrui.png')});
    await c.close();
  }

  // 5) Carica altre
  {
    const{c,p}=await ctx();
    await seed(p,{});
    await p.evaluate(async()=>{window._pv=null;await views.miepartite()});await W(700);
    await p.click('.mpbox .more');await W(400);
    chk(await p.evaluate(()=>document.querySelectorAll('.mpbox .mprow').length===24&&!document.querySelector('.mpbox .more')),'Carica altre mostra tutte e 24, niente altro pulsante');
    await p.screenshot({path:path.join(OUT,'07-carica-altre.png')});
    await c.close();
  }

  srv.close();
  await b.close();
  console.log(`v41.14.3-mie-partite: ${ok}/${n}`);
  process.exit(ok===n?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
