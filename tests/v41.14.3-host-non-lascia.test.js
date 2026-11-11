// node tests/v41.14.3-host-non-lascia.test.js — il socio creatore non lascia il tavolo; può annullarlo
const pw=require('playwright-core'),fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
const OUT='/workspace/pergioco-mockups/ux/socio-non-lascia-tavolo';
const PORT=8846;
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

const seed=async(p,opt={})=>{
  await p.evaluate(({opt,TYPES})=>{
    document.body.classList.remove('gate');
    localStorage.clear();
    const staff=!!opt.staff;
    admin=staff;
    localStorage.setItem('pergioco-mode',opt.mode||(staff?'admin':'user'));
    const ms=[
      {id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1'},
      {id:'m2',nome:'Giulia',cognome:'Rossi',active:true,userId:'u2'},
      {id:'m3',nome:'Marco',cognome:'Bianchi',active:true}
    ];
    const gs=[{id:'g1',name:'Catan',min:3,max:4}];
    const td=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
    window._TS=[
      {id:'tg1',date:td,hostId:'m1',seats:5,time:'21:00',typeId:'gdr',gameName:'Dungeons & Dragons (5th Edition)',bggRpgId:17181,masterMemberId:'m1',players:[{memberId:'m1'}],status:'open',note:''},
      {id:'t1',date:td,evening:'Mercoledì',hostId:'m3',seats:4,time:'21:00',gameId:'g1',typeId:'board',players:[{memberId:'m3'},{memberId:'m1'}],status:'open',note:''},
      {id:'tw1',date:td,hostId:'m3',seats:2,time:'21:30',typeId:'war',versione:'Warhammer 40.000 10ª edizione',players:[{memberId:'m3'}],status:'open'}
    ];
    DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>[];
    DB.allTables=async()=>window._TS;
    DB.hasPin=async()=>true;DB.legacyNames=async()=>[];
    DB.status='online';
    window._SEAT=[];window._CANCEL=[];
    DB.seat=async(id,action,me)=>{window._SEAT.push({id,action,me});const t=window._TS.find(x=>x.id===id);if(!t)throw new Error('Tavolo non trovato');
      if(action==='leave'&&t.hostId===me&&!(typeof adminMode==='function'&&adminMode()))throw new Error('Non puoi lasciare il tavolo che hai aperto: annullalo');
      if(action==='leave')t.players=(t.players||[]).filter(x=>x.memberId!==me);
      if(action==='join'&&!(t.players||[]).some(x=>x.memberId===me))t.players=[...t.players,{memberId:me}];
      return t.players};
    DB.cancelTable=async id=>{window._CANCEL.push(id);window._TS=window._TS.filter(t=>t.id!==id)};
    DB.deleteTable=async id=>{window._DEL=(window._DEL||[]).concat(id);window._TS=window._TS.filter(t=>t.id!==id)};
    const uid=opt.uid||(staff?'u1':'u1');
    const R=DB.remote||{};
    R.user=async()=>({id:uid});R.isAdmin=async()=>staff;R.modCached=false;R.adminCached=staff;
    R.client={from(table){if(table==='table_types')return{select:()=>({order:async()=>({data:TYPES,error:null})})};return{select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})}},rpc:async()=>({data:null,error:null})};
    DB.remote=R;
    if(window.TT){TT.loaded=false;TT.types=TYPES.slice();TT.cfg={ora_default:'21:00'}}
    if(typeof isMod==='function')window.isMod=()=>false;
  },{opt,TYPES});
};

(async()=>{
  await new Promise((res,rej)=>srv.listen(PORT,'127.0.0.1',e=>e?rej(e):res()));
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--lang=it-IT']});
  const ctx=async()=>{
    const c=await b.newContext({serviceWorkers:'block',viewport:{width:412,height:915},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'});
    const p=await c.newPage();
    await p.route(/supabase\.co|jsdelivr/,r=>r.abort());
    await p.goto(BASE,{waitUntil:'load'});await W(700);
    return {c,p};
  };
  const goAg=async(p,opt)=>{
    await seed(p,opt);
    await p.evaluate(async()=>{if(window.TT&&TT.load)try{await TT.load()}catch(e){}if(typeof drawModeBtn==='function')drawModeBtn();go('serata')});
    await W(800);
    await p.evaluate(()=>document.querySelectorAll('.toast').forEach(t=>t.remove()));
  };

  // 1) socio creatore del tavolo GDR: niente «Lascia il posto», Annulla nel ⋯
  {
    const{c,p}=await ctx();
    await goAg(p,{staff:false,mode:'user',uid:'u1'});
    const gdr=p.locator('.card.agt[data-t="tg1"]');
    chk(await gdr.count(),'scheda tavolo GDR del creatore');
    chk(!await gdr.locator('[data-lv]').count(),'creatore: niente Lascia il posto sul GDR (il master occupa un posto)');
    chk(await gdr.locator('.agmore').count(),'creatore: menu ⋯ presente');
    chk(await gdr.locator('[data-cancel]').count(),'Annulla tavolo nel menu nascosto');
    const joined=p.locator('.card.agt[data-t="t1"]');
    chk(await joined.locator('[data-lv]').count(),'sul tavolo altrui a cui è seduto, Lascia il posto resta');
    await p.screenshot({path:path.join(OUT,'01-socio-creatore-gdr.png')});
    await gdr.locator('.agmore').click();
    await p.waitForSelector('#agmenu');
    const menu=await p.locator('#agmenu').innerText();
    chk(menu.includes('Annulla tavolo')&&menu.includes('Ospite')&&!/Lascia/.test(menu),'menu: Annulla tavolo, niente Lascia');
    await p.screenshot({path:path.join(OUT,'02-menu-annulla-tavolo.png')});
    await p.locator('#agmenu button',{hasText:'Annulla tavolo'}).click();
    await p.waitForSelector('.mdl .mbt [data-k="1"]');
    await p.click('.mdl .mbt [data-k="1"]');
    await W(600);
    chk(await p.evaluate(()=>window._CANCEL&&window._CANCEL[0]==='tg1'),'conferma Annulla chiama cancelTable');
    chk(await p.evaluate(()=>!(window._SEAT||[]).some(x=>x.action==='leave'&&x.id==='tg1')),'nessuna leave sul proprio tavolo');
    await c.close();
  }

  // 2) staff sul proprio tavolo: Lascia resta disponibile (liberi come oggi)
  {
    const{c,p}=await ctx();
    await goAg(p,{staff:true,mode:'admin',uid:'u1'});
    const gdr=p.locator('.card.agt[data-t="tg1"]');
    chk(await gdr.locator('[data-lv]').count(),'staff: Lascia il posto ancora visibile sul tavolo che ha aperto');
    chk(!await gdr.locator('[data-cancel]').count(),'staff: niente Annulla (resta Elimina come oggi)');
    await p.screenshot({path:path.join(OUT,'03-staff-puo-lasciare.png')});
    await c.close();
  }

  // 3) leave via API locale/simulata: il creatore riceve l'errore
  {
    const{c,p}=await ctx();
    await goAg(p,{staff:false,mode:'user',uid:'u1'});
    const msg=await p.evaluate(async()=>{try{await DB.seat('tg1','leave','m1');return 'OK?!'}catch(e){return e.message}});
    chk(/annullalo/.test(msg),'DB.seat leave del creatore rifiutato');
    await c.close();
  }

  srv.close();
  await b.close();
  console.log(`v41.14.3-host-non-lascia: ${ok}/${n}`);
  process.exit(ok===n?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
