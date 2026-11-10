// node tests/v41.13-sondaggi.test.js — anteprima locale (porta 8815)
const pw=require('playwright-core'),fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
const OUT='/workspace/pergioco-mockups/ux/v41.13-sondaggi';
const BASE='http://127.0.0.1:8815/';
fs.mkdirSync(OUT,{recursive:true});
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const T={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent((q.url||'/').split('?')[0]);if(p==='/')p='/index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(b)})});

const POLL={
  id:'p1',title:'Serata speciale di dicembre',help:'Scegli una sola data. Puoi cambiare idea fino alla chiusura.',
  typ:'singola',status:'aperto',closes_at:'2026-11-23T23:59:00+01:00',results_vis:'dopo_voto',
  anonymous:false,allow_add:false,pinned:true,xp:2,badge_icon:null,badge_name:null,max_choices:2,
  options:[
    {id:'o1',label:'Sabato 6 dicembre, ore 21',sort:1},
    {id:'o2',label:'Domenica 7 dicembre, pomeriggio',sort:2},
    {id:'o3',label:'Sabato 13 dicembre, ore 21',sort:3},
    {id:'o4',label:'Non posso in nessuna data',sort:4}
  ],
  voted:false,can_see:false,totals:null,names:null,n_voted:11,n_members:16
};

const seed=async(p,opt={})=>{
  await p.evaluate(({opt,POLL})=>{
    document.documentElement.lang='it';
    document.body.classList.remove('gate');
    localStorage.clear();
    const staff=!!opt.staff;
    admin=staff;
    localStorage.setItem('pergioco-mode',staff?'admin':'user');
    if(opt.tab)localStorage.setItem('pergioco-community-tab',opt.tab);
    const ms=[
      {id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1',avatar:'🦊',color:'#455a64'},
      {id:'m2',nome:'Giulia',cognome:'Rossi',active:true}
    ];
    const gs=[{id:'g1',name:'Cascadia',min:1,max:4},{id:'g2',name:'Ark Nova',min:1,max:4}];
    DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>[];
    DB.allTables=async()=>[];DB.hasPin=async()=>true;DB.legacyNames=async()=>[];
    DB.status='online';
    const polls=opt.noPolls?[]:[Object.assign({},POLL,opt.poll||{})];
    const store={lista:{me:'m1',staff,admin:staff,has_active:polls.some(x=>x.status==='aperto'),notices:[],badges:[],polls}};
    const R=DB.remote||{};
    R.user=async()=>({id:'u1'});R.isAdmin=async()=>staff;R.modCached=false;R.adminCached=staff;
    R.client={rpc:async(n,a)=>{
      if(n==='poll_lista')return{data:JSON.parse(JSON.stringify(store.lista)),error:null};
      if(n==='poll_vota'){const p=store.lista.polls[0];if(p){p.voted=true;p.can_see=p.results_vis!=='chiusura';p.n_voted=(p.n_voted||0)+1;
        p.totals=p.totals||{};const id=a&&a.p_choices&&a.p_choices.id;if(id){p.totals[id]=(p.totals[id]||0)+1;p.names=p.names||{};p.names[id]=(p.names[id]||[]).concat(['m1'])}}
        return{data:{ok:true,xp:p&&p.xp||0},error:null}}
      if(n==='poll_salva')return{data:'p-new',error:null};
      if(n==='poll_azione')return{data:null,error:null};
      if(n==='poll_notifiche_lette')return{data:null,error:null};
      if(n==='des_lista')return{data:{me:'m1',staff,desideri:[],periodo:null},error:null};
      return{data:null,error:null};
    }};
    DB.remote=R;
    if(window.DS){DS.cl=()=>R.client;DS.d={me:'m1',staff,desideri:[],periodo:null};DS.load=async()=>{DS.d={me:'m1',staff,desideri:[],periodo:null}}}
    if(window.PS){PS.d=null;PS.view=null;PS.form=null;PS.open=new Set();PS.fil='tutto'}
    if(typeof isMod==='function')window.isMod=()=>false;
    if(typeof drawModeBtn==='function')drawModeBtn();
  },{opt,POLL});
};

(async()=>{
  await new Promise((res,rej)=>srv.listen(8815,'127.0.0.1',e=>e?rej(e):res()));
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--lang=it-IT']});
  const ctx=async(h=1400)=>{
    const c=await b.newContext({serviceWorkers:'block',viewport:{width:400,height:h},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'});
    const p=await c.newPage();
    await p.route(/supabase\.co|jsdelivr/,r=>r.abort());
    await p.goto(BASE,{waitUntil:'load'});await W(800);
    return {c,p};
  };
  const goCm=async(p,opt)=>{await seed(p,opt);await p.evaluate(()=>go('giocatori'));await W(600)};

  // 1) socio, nessun sondaggio attivo: tab nascosto
  {
    const{c,p}=await ctx();
    await goCm(p,{noPolls:true,staff:false,tab:'soci'});
    const tab=await p.$('[data-cmt="sondaggi"]');
    chk(!tab,'socio senza sondaggi attivi: tab nascosto');
    await c.close();
  }

  // 2) socio, sondaggio attivo: tab visibile, lista con fissato
  {
    const{c,p}=await ctx(1100);
    await goCm(p,{staff:false,tab:'sondaggi'});
    const vis=await p.$('[data-cmt="sondaggi"]');
    chk(!!vis,'socio con sondaggio attivo: tab visibile');
    const on=await p.$eval('[data-cmt="sondaggi"]',e=>e.classList.contains('on'));
    chk(on,'tab Sondaggi selezionato');
    const title=await p.textContent('#sondaggi');
    chk(/Serata speciale di dicembre/.test(title||'')&&/Fissato/.test(title||''),'lista: sondaggio fissato in cima');
    await p.screenshot({path:path.join(OUT,'01-community-lista-fissato.png')});
    await c.close();
  }

  // 3) voto scelta singola
  {
    const{c,p}=await ctx(1100);
    await goCm(p,{staff:false,tab:'sondaggi'});
    await p.click('[data-psx="p1"]');await W(300);
    chk(await p.$('#psinvia'),'apertura voto: pulsante Invia');
    await p.click('.sopt:has-text("Sabato 6 dicembre")');await W(100);
    await p.screenshot({path:path.join(OUT,'02-voto-scelta-singola.png')});
    await p.click('#psinvia');await W(400);
    const after=await p.textContent('#sondaggi');
    chk(/Hai già votato|7|Sabato 6/.test(after||''),'dopo il voto si aggiorna la vista');
    await p.screenshot({path:path.join(OUT,'03-risultati.png')});
    await c.close();
  }

  // 4) staff, nessun sondaggio: tab sempre visibile + creazione
  {
    const{c,p}=await ctx(2200);
    await goCm(p,{noPolls:true,staff:true,tab:'sondaggi'});
    const vis=await p.$('[data-cmt="sondaggi"]');
    chk(!!vis,'staff senza sondaggi: tab sempre visibile');
    const nuovo=await p.$('#psnew');
    chk(!!nuovo,'staff: pulsante Nuovo sondaggio');
    await p.click('#psnew');await W(300);
    chk(await p.$('#psform') && await p.$('.type'),'form di creazione staff');
    chk(!!await p.$('#pssalva'),'pulsante Pubblica il sondaggio');
    await p.screenshot({path:path.join(OUT,'04-staff-crea.png')});
    await c.close();
  }

  // 5) sondaggio scaduto/chiuso non apre il tab al socio
  {
    const{c,p}=await ctx();
    await goCm(p,{staff:false,tab:'soci',poll:{status:'chiuso',pinned:false}});
    chk(!await p.$('[data-cmt="sondaggi"]'),'socio: sondaggio solo chiuso → tab nascosto');
    await c.close();
  }

  console.log(ok+'/'+n+' controlli');
  await b.close();srv.close();
  process.exit(ok===n?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
