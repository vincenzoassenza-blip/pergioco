// node tests/v41.11.1-tavoli.test.js — anteprima v41.11.1 (porta 8812)
const pw=require('playwright-core'),fs=require('fs'),path=require('path');
const OUT='/workspace/pergioco-mockups/ux/v41.11.1-tavoli';
const BASE='http://127.0.0.1:8812/';
const THUMB='https://cf.geekdo-images.com/last-sabbath/open/pic402323.jpg';
fs.mkdirSync(OUT,{recursive:true});
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const W=ms=>new Promise(r=>setTimeout(r,ms));

const seed=async(p,opt={})=>{
  await p.evaluate(({opt,THUMB})=>{
    document.documentElement.lang='it';
    document.body.classList.remove('gate');
    localStorage.clear();
    admin=true;
    localStorage.setItem('pergioco-mode','admin');
    const ms=[
      {id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1',soprannome:'Vince'},
      {id:'m2',nome:'Giulia',cognome:'Rossi',active:true},
      {id:'m3',nome:'Marco',cognome:'Bianchi',active:true}
    ];
    const gs=[{id:'g1',name:'Catan',min:3,max:4},{id:'g2',name:'Azul',min:2,max:4}];
    const td=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
    window._TS=[
      {id:'t1',date:td,evening:'Martedì',hostId:'m1',seats:4,time:'21:00',gameId:'g1',typeId:'board',players:[{memberId:'m1'}],status:'open',note:''},
      {id:'tg1',date:td,hostId:'m1',seats:7,time:'21:00',typeId:'gdr',gameName:'Last Sabbath',bggRpgId:402323,masterMemberId:'m1',players:[{memberId:'m1'}],status:'open',note:'Tutti brutti streghe'},
      {id:'tg2',date:td,hostId:'m1',seats:7,time:'21:00',typeId:'gdr',gameName:'Advanced Dungeons & Dragons (3rd Edition): Dungeon Masters Guide (2013)',bggRpgId:153208,masterMemberId:'m1',players:[{memberId:'m1'}],status:'open'},
      {id:'tw1',date:td,hostId:'m1',seats:2,time:'21:00',typeId:'war',versione:'Warhammer 40.000 10ª edizione',players:[{memberId:'m1'}],status:'open'}
    ];
    if(opt.fullGdr){/* already 2 gdr, cap 2 */}
    window._SAVED=[];window._PLAYS=[];
    DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>window._PLAYS;
    DB.allTables=async()=>window._TS;
    DB.saveTable=async t=>{t.id=t.id||('t'+Math.random().toString(36).slice(2,8));window._SAVED.push(t);const i=window._TS.findIndex(x=>x.id===t.id);if(i>=0)window._TS[i]={...window._TS[i],...t};else window._TS.push(t);return t};
    DB.addPlay=async p=>{p.id='p'+Math.random().toString(36).slice(2,8);if(typeof setWinners==='function')setWinners(p);window._PLAYS.push(p);return p};
    DB.status='online';
    const types=[
      {id:'board',nome:'Gioco da tavolo',icona:'🎲',sort:10,attivo:true,capacity_default:5,kind:'board'},
      {id:'gdr',nome:'GDR',icona:'🐉',sort:20,attivo:true,capacity_default:2,kind:'gdr'},
      {id:'war',nome:'Warhammer',icona:'⚔️',sort:30,attivo:true,capacity_default:2,kind:'war'}
    ];
    const store={tavoli_cfg:{ora_default:'21:00',pieno_msg:'I tavoli {tipo} per questa serata sono al completo. Per ulteriori prenotazioni contatta lo staff nel gruppo WhatsApp.',whatsapp_url:'https://chat.whatsapp.com/AbCdEfGhIjKlMnOp'}};
    const R=DB.remote||{};
    R.user=async()=>({id:'u1'});R.isAdmin=async()=>true;R.modCached=false;
    R.client={
      from(table){
        if(table==='table_types')return{select:()=>({order:async()=>({data:types,error:null})}),upsert:async()=>({error:null})};
        if(table==='app_settings')return{select:()=>({eq:(k,v)=>({maybeSingle:async()=>({data:store[v]?{value:store[v]}:null,error:null})})}),upsert:async()=>({error:null})};
        if(table==='table_type_caps')return{select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})}),upsert:async()=>({error:null})};
        return{select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})};
      },
      rpc:async(name,args)=>{
        if(name==='table_type_capacity'){const t=types.find(x=>x.id===args.p_type);return{data:t?t.capacity_default:0,error:null}}
        return{data:null,error:null};
      },
      functions:{invoke:async(name,opts)=>{
        const body=opts&&opts.body||{};
        if(name==='bgg-meta'&&body.mode==='rpg'){
          const q=String(body.q||'').toLowerCase();
          const all=[{bgg_id:402323,nome:'Last Sabbath',anno:2023},{bgg_id:450,nome:'Dungeons & Dragons (5th Edition)',anno:2014}];
          return{data:{items:all.filter(x=>x.nome.toLowerCase().includes(q)||q.length<3)},error:null};
        }
        if(name==='bgg-meta'&&body.mode==='info'){
          return{data:{bgg_id:body.bgg_id,nome:'Last Sabbath',thumb:THUMB},error:null};
        }
        return{data:{},error:null};
      }}
    };
    DB.remote=R;
    if(window.TT){TT.loaded=false;TT.types=types.slice();TT.cfg={...store.tavoli_cfg};TT._thumbs={402323:THUMB,153208:THUMB};TT.saveThumbs&&TT.saveThumbs()}
    drawModeBtn();
  },{opt,THUMB});
};

(async()=>{
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--lang=it-IT','--accept-lang=it-IT,it'],env:{...process.env,LANG:'it_IT.UTF-8',LC_ALL:'it_IT.UTF-8',LC_TIME:'it_IT.UTF-8',LANGUAGE:'it_IT:it'}});
  const ctx=async(h=1200)=>{
    const c=await b.newContext({serviceWorkers:'block',viewport:{width:430,height:h},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'});
    const p=await c.newPage();
    await p.route(/supabase\.co|jsdelivr/,r=>r.abort());
    await p.route(/cf\.geekdo-images\.com/,async r=>{
      const img=fs.readFileSync('/tmp/rpg-cover.png');
      await r.fulfill({status:200,contentType:'image/png',body:img});
    });
    await p.goto(BASE,{waitUntil:'load'});await W(1100);
    return {c,p};
  };

  // 1) cambio tipo istantaneo
  {
    const{c,p}=await ctx(1100);
    await seed(p);await W(200);
    await p.evaluate(()=>{window._TS=window._TS.filter(t=>t.id!=='tg2')});
    await p.evaluate(async()=>{
      const ms=await DB.members(),gs=await DB.games();
      const meM=ms.find(m=>m.id==='m1');
      const S={date:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date())};
      await window.agSheet({gs,ms,meM,staff:true,S,oggi:S.date});
    });
    await W(300);
    await p.evaluate(()=>{const b=[...document.querySelectorAll('.ttseg button')].find(x=>/GDR/.test(x.textContent));b&&b.click()});
    const inst=await p.evaluate(()=>({rpg:!!document.querySelector('#tt-rpgq'),tg:!!document.querySelector('#tg'),ver:!!document.querySelector('#tt-ver')}));
    chk(inst.rpg&&!inst.tg&&!inst.ver,'click GDR: form GDR immediato, niente lista giochi da tavolo');
    await W(400);chk(await p.evaluate(()=>!document.querySelector('#tsv').disabled),'GDR non pieno: Apri attivo');
    await p.screenshot({path:path.join(OUT,'01-cambio-tipo-istantaneo.png'),clip:{x:0,y:0,width:430,height:1100}});
    await c.close();
  }

  // 2) card GDR nome + copertina + filtro
  {
    const{c,p}=await ctx(1400);
    await seed(p);await W(200);
    await p.evaluate(async()=>{if(window.TT){TT.loaded=false;await TT.load()}go('serata')});
    await W(1200);
    const cards=await p.evaluate(()=>[...document.querySelectorAll('.card.agt')].map(el=>({
      t:el.dataset.t,title:(el.querySelector('.agl1 b')||{}).textContent||'',
      img:!!el.querySelector('.gcov img'),emoji:(el.querySelector('.gcov')||{}).textContent||'',
      tipo:el.dataset.tipo
    })));
    const gdr=cards.filter(x=>x.tipo==='gdr');
    chk(gdr.length>=2&&gdr.every(x=>!/^Gioco$/.test(x.title)),'card GDR: titolo = nome gioco, non «Gioco»');
    chk(gdr.some(x=>/Last Sabbath/.test(x.title))&&gdr.some(x=>/Dungeons/.test(x.title)),'card GDR mostrano Last Sabbath e D&D');
    chk(gdr.every(x=>x.img||x.emoji.includes('🐉')),'card GDR: copertina o fallback 🐉');
    chk(await p.evaluate(()=>!!document.querySelector('#agtf [data-tf=""]')&&/Tutto/.test(document.querySelector('#agtf')?.textContent||'')),'filtro Agenda con Tutto');
    await p.screenshot({path:path.join(OUT,'02-card-gdr-nome-copertina.png'),fullPage:true});
    await p.click('#agtf [data-tf="gdr"]');await W(800);
    const filt=await p.evaluate(()=>{
      const vis=[...document.querySelectorAll('#tl .agsec:not([hidden]) .card.agt')];
      return{n:vis.length,tipi:vis.map(x=>x.dataset.tipo),ls:localStorage.getItem('pergioco-ag-tipo'),head:(document.querySelector('#tl .agsec:not([hidden]) .agday')||{}).textContent||''};
    });
    chk(filt.n===2&&filt.tipi.every(t=>t==='gdr')&&filt.ls==='gdr','filtro GDR: solo card GDR, scelto in localStorage');
    chk(/2 tavoli/.test(filt.head),'conteggio giorno rispetta il filtro');
    await p.screenshot({path:path.join(OUT,'05-filtro-agenda.png'),fullPage:true});
    await c.close();
  }

  // 3) crea Warhammer con Versione
  {
    const{c,p}=await ctx(1000);
    await seed(p);await W(200);
    await p.evaluate(async()=>{
      const ms=await DB.members(),gs=await DB.games();
      const meM=ms.find(m=>m.id==='m1');
      const S={date:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date())};
      await window.agSheet({gs,ms,meM,staff:true,S,oggi:S.date});
    });
    await W(300);
    await p.evaluate(()=>{const b=[...document.querySelectorAll('.ttseg button')].find(x=>/Warhammer/.test(x.textContent));b&&b.click()});
    // immediate
    const war=await p.evaluate(()=>({ver:!!document.querySelector('#tt-ver'),tg:!!document.querySelector('#tg'),ph:document.querySelector('#tt-ver')?.placeholder||''}));
    chk(war.ver&&!war.tg&&/40/.test(war.ph),'Warhammer: campo Versione, niente gioco collezione');
    await p.fill('#tt-ver','Warhammer 40.000 10ª edizione');
    await p.screenshot({path:path.join(OUT,'03-crea-warhammer-versione.png'),clip:{x:0,y:0,width:430,height:900}});
    await p.click('#tsv');await W(500);
    const saved=await p.evaluate(()=>window._SAVED[window._SAVED.length-1]||null);
    chk(saved&&saved.typeId==='war'&&/40\.000/.test(saved.versione||''),'salvataggio Warhammer con versione');
    await c.close();
  }

  // 4) card Warhammer con versione
  {
    const{c,p}=await ctx(1100);
    await seed(p);await W(200);
    await p.evaluate(async()=>{if(window.TT){TT.loaded=false;await TT.load()}go('serata')});
    await W(1000);
    const war=await p.evaluate(()=>{
      const el=[...document.querySelectorAll('.card.agt')].find(x=>x.dataset.tipo==='war');
      return el?{title:el.querySelector('.agl1 b')?.textContent||'',cov:el.querySelector('.gcov')?.textContent||''}:null;
    });
    chk(war&&/40\.000/.test(war.title)&&!/^Gioco$/.test(war.title),'card Warhammer mostra la versione');
    await p.screenshot({path:path.join(OUT,'04-card-warhammer-versione.png'),fullPage:true});
    await c.close();
  }

  // 5) registra GDR
  {
    const{c,p}=await ctx(1400);
    await seed(p);await W(200);
    await p.evaluate(async()=>{await TT.load();go('serata')});await W(800);
    await p.evaluate(()=>views.nuova({fromTable:'tg1',date:window._TS[1].date,players:window._TS[1].players}));
    await W(700);
    const gdr=await p.evaluate(()=>({
      title:(document.querySelector('h2')||{}).textContent||'',
      master:!!document.querySelector('#tt-rmaster'),
      sist:(document.querySelector('#tt-rsist')||{}).value||'',
      avv:!!document.querySelector('#tt-ravv'),
      noPunti:!document.querySelector('.ps'),
      esito:/Avventura conclusa|In corso/.test(document.body.innerText),
      pg:!![...document.querySelectorAll('input')].find(i=>/Personaggio/.test(i.placeholder||''))
    }));
    chk(/Registra sessione GDR/.test(gdr.title)&&gdr.master&&/Last Sabbath/.test(gdr.sist),'registra GDR: titolo, master, sistema precompilato');
    chk(gdr.avv&&gdr.esito&&gdr.pg&&gdr.noPunti,'registra GDR: avventura, esito, personaggio, niente punteggi');
    await p.screenshot({path:path.join(OUT,'06-registra-gdr.png'),fullPage:true});
    await c.close();
  }

  // 6) registra Warhammer
  {
    const{c,p}=await ctx(1300);
    await seed(p);await W(200);
    await p.evaluate(async()=>{await TT.load();views.nuova({fromTable:'tw1',date:window._TS.find(t=>t.id==='tw1').date,players:[{memberId:'m1'}]})});
    await W(700);
    const w=await p.evaluate(()=>({
      title:(document.querySelector('h2')||{}).textContent||'',
      nome:(document.querySelector('#tt-pn')||{}).value||'',
      noGame:!document.querySelector('#g')&&!document.querySelector('.gpq'),
      mode:!!document.querySelector('#mode'),
      punti:!!document.querySelector('#pl')
    }));
    chk(/Registra una partita/.test(w.title)&&/40\.000/.test(w.nome)&&w.noGame,'registra Warhammer: nome dalla versione, niente scelta gioco');
    chk(w.mode&&w.punti,'registra Warhammer: stessa schermata (modalità e punteggi)');
    await p.screenshot({path:path.join(OUT,'07-registra-warhammer.png'),fullPage:true});
    await c.close();
  }

  const brand=fs.readFileSync(path.join(__dirname,'../brand.js'),'utf8');
  const {APP_VERSION,swCache}=require('./appver');chk(!!APP_VERSION&&swCache(),'APP_VERSION dal codice, cache SW allineata');
  await b.close();
  console.log(`\n${ok}/${n} controlli`);
  console.log('screenshot:',fs.readdirSync(OUT).filter(f=>f.endsWith('.png')).sort().join(', '));
  process.exit(ok===n?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
