// node tests/v41.11-tavoli.test.js — anteprima tipi tavolo (porta 8811)
const pw=require('playwright-core'),fs=require('fs'),path=require('path');
const OUT='/workspace/pergioco-mockups/ux/v41.11-tavoli';
const BASE='http://127.0.0.1:8811/';
fs.mkdirSync(OUT,{recursive:true});
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const W=ms=>new Promise(r=>setTimeout(r,ms));

const seed=async(p,{fullGdr=false}={})=>{
  await p.evaluate(({fullGdr})=>{
    document.body.classList.remove('gate');
    localStorage.clear();
    admin=true;
    localStorage.setItem('pergioco-mode','admin');
    const ms=[
      {id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1',soprannome:'Vince'},
      {id:'m2',nome:'Giulia',cognome:'Rossi',active:true},
      {id:'m3',nome:'Marco',cognome:'Bianchi',active:true}
    ];
    const gs=[
      {id:'g1',name:'Catan',min:3,max:4},
      {id:'g2',name:'Azul',min:2,max:4}
    ];
    const td=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
    window._TS=[
      {id:'t1',date:td,evening:'Lunedì',hostId:'m1',seats:4,time:'21:00',gameId:'g1',typeId:'board',players:[{memberId:'m1'}],status:'open',note:''}
    ];
    if(fullGdr){
      window._TS.push(
        {id:'tg1',date:td,hostId:'m2',seats:5,time:'21:00',typeId:'gdr',gameName:'D&D',masterMemberId:'m2',players:[{memberId:'m2'}],status:'open'},
        {id:'tg2',date:td,hostId:'m3',seats:5,time:'21:30',typeId:'gdr',gameName:'Pathfinder',masterMemberId:'m3',players:[{memberId:'m3'}],status:'open'}
      );
    }
    window._SAVED=[];
    DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>[];
    DB.allTables=async()=>window._TS;
    DB.saveTable=async t=>{t.id=t.id||('t'+Math.random().toString(36).slice(2,8));window._SAVED.push(t);window._TS.push(t);return t};
    DB.deleteTable=async id=>{window._TS=window._TS.filter(x=>x.id!==id)};
    DB.status='online';
    const R=DB.remote||{};
    R.user=async()=>({id:'u1'});
    R.isAdmin=async()=>true;
    R.modCached=false;
    const store={tavoli_cfg:{ora_default:'21:00',pieno_msg:'I tavoli {tipo} per questa serata sono al completo. Per ulteriori prenotazioni contatta lo staff nel gruppo WhatsApp.',whatsapp_url:'https://chat.whatsapp.com/AbCdEfGhIjKlMnOp'}};
    const types=[
      {id:'board',nome:'Gioco da tavolo',icona:'🎲',sort:10,attivo:true,capacity_default:5,kind:'board'},
      {id:'gdr',nome:'GDR',icona:'🐉',sort:20,attivo:true,capacity_default:2,kind:'gdr'},
      {id:'war',nome:'Warhammer',icona:'⚔️',sort:30,attivo:true,capacity_default:2,kind:'war'}
    ];
    R.client={
      from(table){
        if(table==='table_types')return{select:()=>({order:async()=>({data:types,error:null})}),upsert:async row=>{const i=types.findIndex(t=>t.id===row.id);if(i>=0)types[i]={...types[i],...row};else types.push(row);return{error:null}}};
        if(table==='app_settings')return{
          select:()=>({eq:(k,v)=>({maybeSingle:async()=>({data:store[v]?{value:store[v]}:null,error:null})})}),
          upsert:async row=>{store[row.key]=row.value;return{error:null}}
        };
        if(table==='table_type_caps')return{select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})}),upsert:async()=>({error:null})};
        return{select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})};
      },
      rpc:async(name,args)=>{
        if(name==='table_type_capacity'){
          const t=types.find(x=>x.id===args.p_type);return{data:t?t.capacity_default:0,error:null};
        }
        return{data:null,error:null};
      },
      functions:{
        invoke:async(name,opts)=>{
          if(name==='bgg-meta'&&opts&&opts.body&&opts.body.mode==='rpg'){
            const q=String(opts.body.q||'').toLowerCase();
            const all=[
              {bgg_id:450,nome:'Dungeons & Dragons (5th Edition)',anno:2014},
              {bgg_id:123,nome:'Pathfinder Roleplaying Game',anno:2009},
              {bgg_id:999,nome:'Blades in the Dark',anno:2017}
            ];
            return{data:{items:all.filter(x=>x.nome.toLowerCase().includes(q)||q.length<3)},error:null};
          }
          return{data:{},error:null};
        }
      }
    };
    DB.remote=R;
    if(window.TT){TT.loaded=false;TT.types=types.slice();TT.cfg={...store.tavoli_cfg};}
    drawModeBtn();
  },{fullGdr});
};

(async()=>{
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});

  // 1) Gestione → Tipi di tavolo
  {
    const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:430,height:1100},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'});
    const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.route(/supabase\.co|jsdelivr/,r=>r.abort());
    await p.goto(BASE,{waitUntil:'load'});await W(1200);
    await seed(p);await W(200);
    await p.evaluate(()=>go('altro'));await W(1200);
    const hasRow=await p.evaluate(()=>!!document.querySelector('[data-alb="tavoli"]'));
    chk(hasRow,'riga Gestione → Tipi di tavolo');
    await p.evaluate(()=>{const r=document.querySelector('[data-alb="tavoli"]');r&&r.click()});await W(900);
    const gest=await p.evaluate(()=>({
      h2:(document.querySelector('#view h2, #V h2, h2')||{}).textContent||'',
      tipi:[...document.querySelectorAll('.alr b')].map(x=>x.textContent),
      msg:(document.querySelector('#tt-msg')||{}).value||'',
      ora:(document.querySelector('#tt-ora')||{}).value||''
    }));
    chk(/Tipi di tavolo/.test(gest.h2),'titolo Gestione Tipi di tavolo');
    chk(gest.tipi.some(t=>/Gioco da tavolo/.test(t))&&gest.tipi.some(t=>/GDR/.test(t))&&gest.tipi.some(t=>/Warhammer/.test(t)),'tipi default in lista');
    chk(/al completo/.test(gest.msg)&&gest.ora==='21:00','cfg messaggio + orario default');
    chk(!/club|ludoteca/i.test(gest.msg),'niente club/ludoteca nel messaggio');
    await p.screenshot({path:path.join(OUT,'01-gestione-tipi.png'),fullPage:true});
    chk(errs.length===0,'gestione: no JS errors '+errs.join('|'));
    await ctx.close();
  }

  // 2) Creazione tavolo GDR con suggerimento RPG
  {
    const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:430,height:1200},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'});
    const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.route(/supabase\.co|jsdelivr/,r=>r.abort());
    await p.goto(BASE,{waitUntil:'load'});await W(1200);
    await seed(p);await W(200);
    await p.evaluate(async()=>{
      const ms=await DB.members(),gs=await DB.games();
      const meM=ms.find(m=>m.id==='m1');
      const S={date:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date())};
      await window.agSheet({gs,ms,meM,staff:true,S,oggi:S.date});
    });
    await W(700);
    chk(await p.evaluate(()=>!!document.querySelector('.agsheet .ttseg')),'selettore tipi nel foglio');
    await p.evaluate(()=>{const b=[...document.querySelectorAll('.ttseg button')].find(x=>/GDR/.test(x.textContent));b&&b.click()});
    await W(500);
    const gdrUi=await p.evaluate(()=>({
      master:!!document.querySelector('#tt-master'),
      rpg:!!document.querySelector('#tt-rpgq'),
      logo:!!document.querySelector('#tt-bgglogo .ibggpwr img, #tt-bgglogo img'),
      posti:(document.querySelector('label[for="tp"]')||{}).textContent||'',
      ora:(document.querySelector('#tt')||{}).value||''
    }));
    chk(gdrUi.master&&gdrUi.rpg,'campi Master + gioco GDR');
    chk(gdrUi.logo,'logo Powered by BGG su GDR');
    chk(/master compreso/i.test(gdrUi.posti),'etichetta posti master compreso');
    chk(gdrUi.ora==='21:00','orario precompilato');
    await p.fill('#tt-rpgq','Dungeons');await W(900);
    const sug=await p.evaluate(()=>[...document.querySelectorAll('#tt-rpgr button')].map(b=>b.textContent));
    chk(sug.some(t=>/Dungeons/.test(t)),'suggerimenti RPGGeek');
    await p.evaluate(()=>{const b=[...document.querySelectorAll('#tt-rpgr button')].find(x=>/Dungeons/.test(x.textContent));b&&b.click()});
    await W(200);
    await p.fill('#tp','5');
    await p.screenshot({path:path.join(OUT,'02-crea-gdr-rpg.png'),fullPage:false,clip:{x:0,y:0,width:430,height:1100}});
    await p.click('#tsv');await W(600);
    const saved=await p.evaluate(()=>window._SAVED[window._SAVED.length-1]||null);
    chk(saved&&saved.typeId==='gdr'&&/Dungeons/.test(saved.gameName||'')&&saved.bggRpgId===450,'salvataggio GDR con bggRpgId');
    chk(saved&&saved.masterMemberId==='m1'&&(saved.players||[]).some(x=>x.memberId==='m1'),'master = proponente e posto occupato');
    chk(errs.length===0,'gdr: no JS errors '+errs.join('|'));
    await ctx.close();
  }

  // 3) Creazione Warhammer
  {
    const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:430,height:1000},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'});
    const p=await ctx.newPage();
    await p.route(/supabase\.co|jsdelivr/,r=>r.abort());
    await p.goto(BASE,{waitUntil:'load'});await W(1200);
    await seed(p);await W(200);
    await p.evaluate(async()=>{
      const ms=await DB.members(),gs=await DB.games();
      const meM=ms.find(m=>m.id==='m1');
      const S={date:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date())};
      await window.agSheet({gs,ms,meM,staff:true,S,oggi:S.date});
    });
    await W(600);
    await p.evaluate(()=>{const b=[...document.querySelectorAll('.ttseg button')].find(x=>/Warhammer/.test(x.textContent));b&&b.click()});
    await W(400);
    const war=await p.evaluate(()=>({
      noGame:!document.querySelector('#tg')&&!document.querySelector('#tt-rpgq'),
      posti:(document.querySelector('#tp')||{}).value||'',
      ora:(document.querySelector('#tt')||{}).value||'',
      master:!document.querySelector('#tt-master')
    }));
    chk(war.noGame&&war.master,'Warhammer: solo posti+orario');
    chk(war.posti==='2'&&war.ora==='21:00','Warhammer default posti 2 + ora');
    await p.screenshot({path:path.join(OUT,'03-crea-warhammer.png'),fullPage:false,clip:{x:0,y:0,width:430,height:900}});
    await p.click('#tsv');await W(500);
    const saved=await p.evaluate(()=>window._SAVED[window._SAVED.length-1]||null);
    chk(saved&&saved.typeId==='war'&&!saved.gameId&&!saved.gameName,'salvataggio Warhammer senza gioco');
    await ctx.close();
  }

  // 4) Tipo esaurito + messaggio + WA
  {
    const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:430,height:1000},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'});
    const p=await ctx.newPage();
    await p.route(/supabase\.co|jsdelivr/,r=>r.abort());
    await p.goto(BASE,{waitUntil:'load'});await W(1200);
    await seed(p,{fullGdr:true});await W(200);
    await p.evaluate(async()=>{
      if(window.TT){TT.loaded=false;await TT.load()}
      const ms=await DB.members(),gs=await DB.games();
      const meM=ms.find(m=>m.id==='m1');
      const S={date:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date())};
      await window.agSheet({gs,ms,meM,staff:true,S,oggi:S.date});
    });
    await W(600);
    await p.evaluate(()=>{const b=[...document.querySelectorAll('.ttseg button')].find(x=>/GDR/.test(x.textContent));b&&b.click()});
    await W(500);
    const full=await p.evaluate(()=>({
      msg:(document.querySelector('.ttfull p')||{}).textContent||'',
      wa:(document.querySelector('.ttfull a')||{}).href||'',
      dis:!!document.querySelector('#tsv')?.disabled,
      grey:document.querySelector('#tsv')?.classList.contains('off')
    }));
    chk(/GDR/.test(full.msg)&&/al completo/.test(full.msg)&&/WhatsApp/.test(full.msg),'messaggio tipo pieno');
    chk(/chat\.whatsapp\.com/.test(full.wa),'link WhatsApp configurabile');
    chk(full.dis&&full.grey,'pulsante grigio/disabilitato');
    await p.screenshot({path:path.join(OUT,'04-tipo-esaurito.png'),fullPage:false,clip:{x:0,y:0,width:430,height:900}});
    await ctx.close();
  }

  // static / version
  const brand=fs.readFileSync(path.join(__dirname,'../brand.js'),'utf8');
  const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
  const ix=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  chk(/APP_VERSION='41\.11'/.test(brand)&&/pergioco-v41\.11/.test(sw),'versione 41.11');
  chk(/tavoli-tipi\.js\?v=41\.11/.test(ix)&&/tavoli-tipi\.js\?v=41\.11/.test(sw),'asset in index+sw');
  chk(fs.existsSync(path.join(__dirname,'../supabase/migrate-v41.11.sql')),'migrazione presente');

  await b.close();
  console.log(`\n${ok}/${n} controlli`);
  console.log('screenshot:',fs.readdirSync(OUT).filter(f=>f.endsWith('.png')).join(', '));
  process.exit(ok===n?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
