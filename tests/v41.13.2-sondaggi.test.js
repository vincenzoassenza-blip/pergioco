// node tests/v41.13.2-sondaggi.test.js — tab solo in adminMode se non c'è un attivo (porta 8832)
const pw=require('playwright-core'),fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
const OUT='/workspace/pergioco-mockups/ux/sondaggi-fix';
const PORT=8832;
const BASE=`http://127.0.0.1:${PORT}/`;
fs.mkdirSync(OUT,{recursive:true});
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const T={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent((q.url||'/').split('?')[0]);if(p==='/')p='/index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(b)})});

const POLL={
  id:'p1',title:'Serata speciale di dicembre',help:'Scegli una sola data.',
  typ:'singola',status:'aperto',closes_at:'2026-11-23T23:59:00+01:00',results_vis:'dopo_voto',
  anonymous:false,allow_add:false,pinned:true,xp:2,options:[{id:'o1',label:'Sabato 6 dicembre, ore 21',sort:1}],
  voted:false,can_see:false,totals:null,names:null,n_voted:11,n_members:16
};

const seed=async(p,opt={})=>{
  await p.evaluate(({opt,POLL})=>{
    document.documentElement.lang='it';
    document.body.classList.remove('gate');
    localStorage.clear();
    const staff=!!opt.staff;
    admin=staff;
    localStorage.setItem('pergioco-mode',opt.mode||(staff?'admin':'user'));
    if(opt.tab)localStorage.setItem('pergioco-community-tab',opt.tab);
    const ms=[
      {id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1',avatar:'🦊',color:'#455a64'},
      {id:'m2',nome:'Giulia',cognome:'Rossi',active:true}
    ];
    const gs=[{id:'g1',name:'Cascadia',min:1,max:4}];
    DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>[];
    DB.allTables=async()=>[];DB.hasPin=async()=>true;DB.legacyNames=async()=>[];
    DB.status='online';
    const polls=opt.noPolls?[]:[Object.assign({},POLL,opt.poll||{})];
    const store={lista:{me:'m1',staff,admin:staff,has_active:polls.some(x=>x.status==='aperto'),notices:[],badges:[],polls}};
    const R=DB.remote||{};
    R.user=async()=>({id:'u1'});R.isAdmin=async()=>staff;R.modCached=false;R.adminCached=staff;
    R.client={rpc:async(n)=>{
      if(n==='poll_lista')return{data:JSON.parse(JSON.stringify(store.lista)),error:null};
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
  await new Promise((res,rej)=>srv.listen(PORT,'127.0.0.1',e=>e?rej(e):res()));
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--lang=it-IT']});
  const ctx=async()=>{
    const c=await b.newContext({serviceWorkers:'block',viewport:{width:412,height:915},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'});
    const p=await c.newPage();
    await p.route(/supabase\.co|jsdelivr/,r=>r.abort());
    await p.goto(BASE,{waitUntil:'load'});await W(700);
    return {c,p};
  };
  const goCm=async(p,opt)=>{await seed(p,opt);await p.evaluate(async()=>{if(window.HD417&&HD417.av)await HD417.av();if(typeof drawModeBtn==='function')drawModeBtn();go('giocatori')});await W(700);
    await p.evaluate(()=>document.querySelectorAll('.toast').forEach(t=>t.remove()));};

  // 1) admin, nessun sondaggio: tab + stato vuoto con Crea sondaggio
  {
    const{c,p}=await ctx();
    await goCm(p,{staff:true,mode:'admin',noPolls:true,tab:'sondaggi'});
    chk(await p.$('[data-cmt="sondaggi"]'),'admin senza sondaggi: tab visibile');
    chk(await p.$('#psempty')&&await p.$('#pscrea'),'admin: stato vuoto con Crea sondaggio');
    chk(await p.evaluate(()=>document.querySelector('#pscrea').textContent.includes('Crea sondaggio')),'etichetta ➕ Crea sondaggio');
    await p.screenshot({path:path.join(OUT,'01-admin-vuoto.png')});
    await p.click('#pscrea');await W(300);
    chk(await p.$('#psform')&&await p.$('#pssalva'),'Crea sondaggio apre il form');
    await p.screenshot({path:path.join(OUT,'03-admin-crea.png')});
    await c.close();
  }

  // 2) staff in modalità utente, nessun attivo: tab nascosto (come un socio)
  {
    const{c,p}=await ctx();
    await goCm(p,{staff:true,mode:'user',noPolls:true,tab:'sondaggi'});
    chk(!await p.$('[data-cmt="sondaggi"]'),'staff in modalità utente senza attivi: tab nascosto');
    chk(!await p.$('#pscrea'),'niente pulsante Crea in modalità utente');
    await p.screenshot({path:path.join(OUT,'02-utente-senza-tab.png')});
    await c.close();
  }

  // 3) staff in modalità utente CON sondaggio attivo: tab visibile, niente crea
  {
    const{c,p}=await ctx();
    await goCm(p,{staff:true,mode:'user',tab:'sondaggi'});
    chk(await p.$('[data-cmt="sondaggi"]'),'staff utente con sondaggio attivo: tab visibile');
    chk(!await p.$('#pscrea')&&!await p.$('#psnew'),'con tab aperto da socio: niente pulsanti di creazione');
    await c.close();
  }

  // 4) cambio modalità dal menu foto aggiorna subito Community
  {
    const{c,p}=await ctx();
    await goCm(p,{staff:true,mode:'admin',noPolls:true,tab:'sondaggi'});
    chk(await p.$('[data-cmt="sondaggi"]')&&await p.$('#pscrea'),'partenza: admin vede tab e Crea');
    await p.click('#avbtn');await W(250);
    chk(await p.$('#havmenu [data-hav="mode"]'),'menu foto: voce cambio modalità');
    await p.click('#havmenu [data-hav="mode"]');await W(800);
    await p.evaluate(()=>document.querySelectorAll('.toast').forEach(t=>t.remove()));
    chk(await p.evaluate(()=>uiMode()==='user'&&!adminMode()),'passato a modalità utente');
    chk(!await p.$('[data-cmt="sondaggi"]'),'dopo il cambio: tab scompare subito, senza ricaricare');
    await p.click('#avbtn');await W(250);
    await p.click('#havmenu [data-hav="mode"]');await W(800);
    await p.evaluate(()=>document.querySelectorAll('.toast').forEach(t=>t.remove()));
    chk(await p.evaluate(()=>uiMode()==='admin'&&adminMode()),'tornato in modalità admin');
    chk(await p.$('[data-cmt="sondaggi"]'),'dopo il ritorno: tab di nuovo visibile subito');
    await c.close();
  }

  console.log(ok+'/'+n+' controlli');
  await b.close();srv.close();
  if(ok!==n)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
