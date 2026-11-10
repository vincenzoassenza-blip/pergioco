// node tests/v41.12-gdr.test.js — anteprima v41.12 (porta 8813)
const pw=require('playwright-core'),fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
const OUT='/workspace/pergioco-mockups/ux/v41.12-gdr-badge';
const BASE='http://127.0.0.1:8813/';
fs.mkdirSync(OUT,{recursive:true});
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const T={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent((q.url||'/').split('?')[0]);if(p==='/')p='/index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(b)})});

const gdrPlays=[
  {id:'g1',date:'2026-09-10',playKind:'gdr',typeId:'gdr',gameId:null,gameName:'Last Sabbath',bggRpgId:402323,coop:true,duration:180,gdr:{sistema:'Last Sabbath',bggRpgId:402323,masterMemberId:'m1',sessione:'one-shot',esito:'conclusa'},players:[{memberId:'m1',character:'Selene'},{memberId:'m2',character:'Ivy'}]},
  {id:'g2',date:'2026-09-24',playKind:'gdr',typeId:'gdr',gameId:null,gameName:'Last Sabbath',bggRpgId:402323,coop:true,duration:120,gdr:{sistema:'Last Sabbath',bggRpgId:402323,masterMemberId:'m1',avventura:'Il sabba eterno',sessione:'campagna',esito:'in_corso'},players:[{memberId:'m1',character:'Selene'},{memberId:'m2',character:'Ivy'},{memberId:'m3',character:'Luca'}]},
  {id:'g3',date:'2026-10-08',playKind:'gdr',typeId:'gdr',gameId:null,gameName:'Last Sabbath',bggRpgId:402323,coop:true,duration:150,gdr:{sistema:'Last Sabbath',bggRpgId:402323,masterMemberId:'m1',avventura:'Il sabba eterno',sessione:'campagna',esito:'conclusa'},players:[{memberId:'m1',character:'Selene'},{memberId:'m2',character:'Ivy'}]},
  {id:'g4',date:'2026-10-15',playKind:'gdr',typeId:'gdr',gameId:null,gameName:'Dungeons & Dragons (5th Edition)',bggRpgId:450,coop:true,duration:240,gdr:{sistema:'Dungeons & Dragons (5th Edition)',bggRpgId:450,masterMemberId:'m1',avventura:'Rovine di Shadowfell',sessione:'campagna',esito:'in_corso'},players:[{memberId:'m1',character:'Dungeon Master'},{memberId:'m3',character:'Thorn'}]},
  {id:'g5',date:'2026-10-29',playKind:'gdr',typeId:'gdr',gameId:null,gameName:'Dungeons & Dragons (5th Edition)',bggRpgId:450,coop:true,duration:180,gdr:{sistema:'Dungeons & Dragons (5th Edition)',bggRpgId:450,masterMemberId:'m1',avventura:'Rovine di Shadowfell',sessione:'campagna',esito:'conclusa'},players:[{memberId:'m1',character:'Dungeon Master'},{memberId:'m3',character:'Thorn'}]},
  {id:'g6',date:'2026-11-05',playKind:'gdr',typeId:'gdr',gameId:null,gameName:'Call of Cthulhu',bggRpgId:533,coop:true,duration:90,gdr:{sistema:'Call of Cthulhu',bggRpgId:533,masterMemberId:'m1',avventura:'Il richiamo',sessione:'one-shot',esito:'conclusa'},players:[{memberId:'m1',character:'Custode'},{memberId:'m2',character:'Elia'}]},
  {id:'b1',date:'2026-10-01',gameId:'g1',playKind:'board',coop:false,players:[{memberId:'m2',winner:true,score:'11'},{memberId:'m1',winner:false,score:'7'}]}
];

const seed=async(p,opt={})=>{
  await p.evaluate(({opt,gdrPlays})=>{
    document.documentElement.lang='it';
    document.body.classList.remove('gate');
    localStorage.clear();
    admin=true;
    localStorage.setItem('pergioco-mode','admin');
    localStorage.setItem('pergioco-periodo',JSON.stringify({k:'all'}));
    const ms=[
      {id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1',soprannome:'Vince'},
      {id:'m2',nome:'Giulia',cognome:'Rossi',active:true},
      {id:'m3',nome:'Marco',cognome:'Bianchi',active:true}
    ];
    const gs=[{id:'g1',name:'Catan',min:3,max:4,coop:false},{id:'g2',name:'Azul',min:2,max:4,coop:false}];
    window._PLAYS=opt.empty?gdrPlays.filter(x=>x.playKind!=='gdr'):gdrPlays.slice();
    window._SAVED=[];
    DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>window._PLAYS;
    DB.allTables=async()=>[];DB.hasPin=async()=>true;DB.legacyNames=async()=>[];
    DB.status='online';
    const types=[
      {id:'board',nome:'Gioco da tavolo',icona:'🎲',sort:10,attivo:true,capacity_default:5,kind:'board'},
      {id:'gdr',nome:'GDR',icona:'🐉',sort:20,attivo:opt.gdrOff?false:true,capacity_default:2,kind:'gdr'},
      {id:'war',nome:'Warhammer',icona:'⚔️',sort:30,attivo:true,capacity_default:2,kind:'war'}
    ];
    const store={};
    const R=DB.remote||{};
    R.user=async()=>({id:'u1'});R.isAdmin=async()=>true;R.modCached=false;R.isMod=async()=>false;
    R.client={
      from(table){
        if(table==='table_types')return{select:()=>({order:async()=>({data:types,error:null})})};
        if(table==='app_settings')return{select:()=>({eq:(k,v)=>({maybeSingle:async()=>({data:store[v]?{value:store[v]}:null,error:null})})}),upsert:async(row)=>{store[row.key]=row.value;return{error:null}}};
        return{select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})};
      },
      rpc:async()=>({data:null,error:null})
    };
    DB.remote=R;
    if(window.TT){TT.loaded=false;TT.types=types.slice()}
    if(window.GDRB){GDRB.v=GDRB.norm({attivo:opt.blockOff?false:true});GDRB.loaded=!!opt.blockOff}
    if(typeof isMod==='function'){const _=isMod; window.isMod=()=>false}
    drawModeBtn();
  },{opt,gdrPlays});
};

(async()=>{
  await new Promise((res,rej)=>srv.listen(8813,'127.0.0.1',e=>e?rej(e):res()));
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--lang=it-IT','--accept-lang=it-IT,it'],env:{...process.env,LANG:'it_IT.UTF-8',LC_ALL:'it_IT.UTF-8',LC_TIME:'it_IT.UTF-8',LANGUAGE:'it_IT:it'}});
  const ctx=async(h=1400)=>{
    const c=await b.newContext({serviceWorkers:'block',viewport:{width:430,height:h},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'});
    const p=await c.newPage();
    await p.route(/supabase\.co|jsdelivr/,r=>r.abort());
    await p.goto(BASE,{waitUntil:'load'});await W(900);
    return {c,p};
  };

  // 1) Record GDR
  {
    const{c,p}=await ctx(1600);
    await seed(p);await W(200);
    await p.evaluate(async()=>{if(window.TT){TT.loaded=false;await TT.load()}if(window.GDRB){GDRB.loaded=false;await GDRB.ensure()}go('record')});
    await W(1500);
    const info=await p.evaluate(()=>{
      const box=document.querySelector('#gdrrec');
      const rows=[...document.querySelectorAll('#gdrrec .gdrln')].map(r=>({
        lab:(r.querySelector('small')||{}).textContent||'',
        who:(r.querySelector('.who')||{}).textContent||'',
        pill:(r.querySelector('.pill')||{}).textContent||'',
        ar:(r.querySelector('.ar')||{}).textContent||'',
        dec:getComputedStyle(r.querySelector('.who')||r).textDecorationLine
      }));
      return{ok:!!box,vuoto:!!document.querySelector('#gdrrec .gdrvuoto'),rows,under:rows.some(x=>x.dec&&x.dec!=='none')};
    });
    chk(info.ok&&!info.vuoto&&info.rows.length===7,'Record: sezione GDR con 7 righe');
    chk(info.rows.every(r=>r.ar==='▸')&&!info.under,'Record: righe con ▸ e senza sottolineatura');
    chk(info.rows.some(r=>/Sessioni giocate/.test(r.lab)&&/Vincenzo/.test(r.who)&&/6 sessioni/.test(r.pill)),'Record: sessioni a Vincenzo (6)');
    chk(info.rows.some(r=>/Ore di gioco/.test(r.lab)&&/16 ore/.test(r.pill)),'Record: 16 ore');
    chk(info.rows.some(r=>/Sistemi diversi/.test(r.lab)&&/3 sistemi/.test(r.pill)),'Record: 3 sistemi');
    chk(info.rows.some(r=>/Master più attivo/.test(r.lab)&&/Vincenzo/.test(r.who)),'Record: master più attivo socio');
    chk(info.rows.some(r=>/Campagne concluse/.test(r.lab)&&/2 campagne/.test(r.pill)),'Record: 2 campagne (avventura+sistema)');
    chk(info.rows.some(r=>/Più sessioni in un mese/.test(r.lab)&&/ottobre 2026/.test(r.pill)),'Record: mese ottobre 2026');
    chk(info.rows.some(r=>/Più one-shot/.test(r.lab)),'Record: più one-shot');
    await p.evaluate(()=>{const h=document.querySelector('header');if(h)h.style.position='static';const n=document.querySelector('nav#tabs');if(n)n.style.display='none'});
    const bx=await p.evaluate(()=>{const r=document.querySelector('#gdrrec').getBoundingClientRect();return{y:r.top+scrollY,height:r.height}});
    await p.screenshot({path:path.join(OUT,'01-record-gdr.png'),fullPage:true,clip:{x:0,y:Math.max(0,bx.y-12),width:430,height:bx.height+24}});
    await c.close();
  }

  // 2) Profilo badge con progressi (Giulia)
  {
    const{c,p}=await ctx(1800);
    await seed(p);await W(200);
    await p.evaluate(async()=>{if(window.TT)await TT.load();if(window.GDRB)await GDRB.ensure();window._pv='m2';go('profilo')});
    await W(1400);
    const info=await p.evaluate(()=>{
      const cards=[...document.querySelectorAll('.badge')].map(b=>({
        name:(b.querySelector('.bdn')||{}).textContent||'',
        on:!b.classList.contains('off'),
        prog:(b.querySelector('small:last-child')||{}).textContent||''
      }));
      return{
        cant:cards.find(x=>x.name==='Cantastorie'),
        veglia:cards.find(x=>x.name==='Veglia notturna'),
        espl:cards.find(x=>x.name==='Esploratore di mondi'),
        prima:cards.find(x=>x.name==='Prima sessione'),
        n:cards.filter(x=>/Cantastorie|Veglia notturna|Esploratore di mondi|Prima sessione|Dietro lo schermo/.test(x.name)).length
      };
    });
    chk(info.prima&&info.prima.on,'Profilo: Prima sessione sbloccata');
    chk(await p.evaluate(()=>!/Gioco rimosso/.test(document.body.innerText)),'Profilo: sessioni GDR non appaiono come «Gioco rimosso»');
    chk(info.cant&&!info.cant.on&&info.cant.prog==='4/5','Profilo: Cantastorie 4/5');
    chk(info.veglia&&!info.veglia.on&&info.veglia.prog==='9/10','Profilo: Veglia notturna 9/10');
    chk(info.espl&&!info.espl.on&&info.espl.prog==='2/3','Profilo: Esploratore di mondi 2/3');
    const badgeCard=await p.$('.card:has(.badges)');
    if(badgeCard){await badgeCard.scrollIntoViewIfNeeded();await W(200);
      const box=await badgeCard.boundingBox();
      await p.screenshot({path:path.join(OUT,'02-profilo-badge-progressi.png'),clip:{x:0,y:Math.max(0,box.y-40),width:430,height:Math.min(1200,box.height+80)}});
    }else await p.screenshot({path:path.join(OUT,'02-profilo-badge-progressi.png'),fullPage:true});
    await c.close();
  }

  // 3) Toast nuovo badge
  {
    const{c,p}=await ctx(900);
    await seed(p);await W(200);
    await p.evaluate(async()=>{
      if(window.TT)await TT.load();if(window.GDRB)await GDRB.ensure();
      window._pv='m2';go('profilo');
    });
    await W(1000);
    await p.evaluate(async()=>{
      const fifth={id:'g7',date:'2026-11-08',playKind:'gdr',typeId:'gdr',gameId:null,gameName:'Last Sabbath',bggRpgId:402323,coop:true,duration:60,gdr:{sistema:'Last Sabbath',bggRpgId:402323,masterMemberId:'m1',sessione:'one-shot',esito:'conclusa'},players:[{memberId:'m1'},{memberId:'m2',character:'Ivy'}]};
      const before=await badgeSnap();
      window._PLAYS.push(fifth);
      await badgeNew(before,['m:m2']);
    });
    await W(2800);
    const toast=await p.evaluate(()=>{
      const t=document.querySelector('.badge-toast');
      return t?t.textContent:'';
    });
    chk(/Nuovo badge/.test(toast)&&/Cantastorie/.test(toast),'Toast: Nuovo badge Cantastorie');
    await p.screenshot({path:path.join(OUT,'03-toast-nuovo-badge.png')});
    await c.close();
  }

  // 4) Config in Gestione
  {
    const{c,p}=await ctx(1600);
    await seed(p);await W(200);
    await p.evaluate(async()=>{if(window.GDRB)await GDRB.ensure();go('config')});
    await W(1200);
    const info=await p.evaluate(()=>({
      card:!!document.querySelector('#cfgdr'),
      on:!!document.querySelector('#cm-gdrrec'),
      rec:!!document.querySelector('#gr-sessioni'),
      badge:!!document.querySelector('#gb-gs5-n'),
      soglia:(document.querySelector('#gb-gs5-s')||{}).value||'',
      titolo:(document.querySelector('#cfgdr h3')||{}).textContent||''
    }));
    chk(info.card&&/Record e badge GDR/.test(info.titolo),'Gestione: scheda Record e badge GDR');
    chk(info.on&&info.rec&&info.badge&&info.soglia==='5','Gestione: on/off, nomi record, badge e soglie');
    await p.evaluate(()=>{const h=document.querySelector('header');if(h)h.style.position='static';const n=document.querySelector('nav#tabs');if(n)n.style.display='none'});
    const card=await p.$('#cfgdr');
    const box=await p.evaluate(()=>{const r=document.querySelector('#cfgdr').getBoundingClientRect();return{y:r.top+scrollY,height:r.height}});
    await p.screenshot({path:path.join(OUT,'04-gestione-config.png'),fullPage:true,clip:{x:0,y:Math.max(0,box.y-8),width:430,height:Math.min(1500,box.height+16)}});
    await c.close();
  }

  // 5) Stato vuoto senza sessioni
  {
    const{c,p}=await ctx(1200);
    await seed(p,{empty:true});await W(200);
    await p.evaluate(async()=>{if(window.TT){TT.loaded=false;await TT.load()}if(window.GDRB)await GDRB.ensure();go('record')});
    await W(1400);
    const info=await p.evaluate(()=>({
      box:!!document.querySelector('#gdrrec'),
      vuoto:(document.querySelector('#gdrrec .gdrvuoto')||{}).textContent||'',
      dashes:[...document.querySelectorAll('#gdrrec .gdrln .muted')].filter(x=>x.textContent==='—').length
    }));
    chk(info.box&&/Ancora nessuna sessione GDR/.test(info.vuoto),'Vuoto: messaggio senza sessioni');
    chk(info.dashes===7,'Vuoto: sette righe con —');
    await p.evaluate(()=>{const h=document.querySelector('header');if(h)h.style.position='static';const n=document.querySelector('nav#tabs');if(n)n.style.display='none'});
    const bx=await p.evaluate(()=>{const r=document.querySelector('#gdrrec').getBoundingClientRect();return{y:r.top+scrollY,height:r.height}});
    await p.screenshot({path:path.join(OUT,'05-record-gdr-vuoto.png'),fullPage:true,clip:{x:0,y:Math.max(0,bx.y-12),width:430,height:bx.height+24}});
    await c.close();
  }

  // nascosto se tipo GDR non attivo / blocco spento
  {
    const{c,p}=await ctx(900);
    await seed(p,{gdrOff:true});await W(200);
    await p.evaluate(async()=>{if(window.TT){TT.loaded=false;await TT.load()}if(window.GDRB){GDRB.loaded=false;await GDRB.ensure()}go('record')});
    await W(1200);
    chk(await p.evaluate(()=>!document.querySelector('#gdrrec')),'Nascosto se tipo GDR non attivo');
    await c.close();
  }
  {
    const{c,p}=await ctx(900);
    await seed(p,{blockOff:true});await W(200);
    const hid=await p.evaluate(async()=>{
      if(window.TT){TT.loaded=false;await TT.load()}
      GDRB.v=GDRB.norm({attivo:false});GDRB.loaded=true;
      await go('record');
      return{vis:GDRB.visible(),box:!!document.querySelector('#gdrrec'),attivo:GDRB.v&&GDRB.v.attivo};
    });
    chk(!hid.box&&hid.vis===false,'Nascosto se blocco spento in Gestione');
    const hidb=await p.evaluate(async()=>{
      GDRB.v=GDRB.norm({attivo:false});GDRB.loaded=true;
      window._pv='m2';await go('profilo');
      return[...document.querySelectorAll('.bdn')].some(b=>/Cantastorie|Prima sessione/.test(b.textContent));
    });
    chk(!hidb,'Badge GDR assenti in Profilo se blocco spento');
    await c.close();
  }

  const brand=fs.readFileSync(path.join(ROOT,'brand.js'),'utf8');
  chk(/APP_VERSION='41\.12'/.test(brand),'versione brand 41.12');
  await b.close();
  srv.close();
  console.log(`\n${ok}/${n} controlli`);
  console.log('screenshot:',fs.readdirSync(OUT).filter(f=>f.endsWith('.png')).sort().join(', '));
  process.exit(ok===n?0:1);
})().catch(e=>{console.error(e);try{srv.close()}catch(x){}process.exit(1)});
