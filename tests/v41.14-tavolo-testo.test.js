// node tests/v41.14-tavolo-testo.test.js — socio in modalità utente, testo libero tavolo
const pw=require('playwright-core'),http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const PORT=8845;
const BASE=`http://127.0.0.1:${PORT}/`;
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const MIME={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let pth=decodeURIComponent((q.url||'/').split('?')[0]);if(pth==='/')pth='/index.html';
  fs.readFile(path.join(ROOT,pth),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':MIME[path.extname(pth)]||'application/octet-stream'});r.end(b)})});

const seed=async p=>{
  await p.evaluate(()=>{
    document.body.classList.remove('gate');
    localStorage.clear();
    admin=false;
    localStorage.setItem('pergioco-mode','user');
    const ms=[
      {id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1'},
      {id:'m2',nome:'Giulia',cognome:'Rossi',active:true,userId:'u2'}
    ];
    const gs=[{id:'g1',name:'Catan',min:3,max:4}];
    const td=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
    window._TS=[];window._SAVED=[];window._DENIED=[];window._TOASTS=[];
    const _toast=window.toast;window.toast=msg=>{window._TOASTS.push(String(msg));if(typeof _toast==='function')_toast(msg)};
    const types=[
      {id:'board',nome:'Gioco da tavolo',icona:'🎲',sort:10,attivo:true,capacity_default:5,kind:'board'},
      {id:'gdr',nome:'GDR',icona:'🐉',sort:20,attivo:true,capacity_default:2,kind:'gdr'},
      {id:'war',nome:'Warhammer',icona:'⚔️',sort:30,attivo:true,capacity_default:2,kind:'war'},
      {id:'magic',nome:'Magic',icona:'✨',sort:40,attivo:true,capacity_default:4,kind:'custom'}
    ];
    // Simula il server DOPO il fix (GRANT presente): il socio host può scrivere
    // versione/game_name; un altro socio no; <> e troppa lunghezza no.
    const gate=(t,old)=>{
      const ver=t.versione,name=t.gameName;
      const bad=s=>s&&(/[<>]/.test(s)||(t.versione&&String(t.versione).length>60)||(t.gameName&&String(t.gameName).length>100));
      if(bad(ver)||bad(name)){const e=new Error('Alcuni dati non sono accettati.');e.code='23514';throw e}
      const me='m1';
      if(old){if(old.hostId!==me){const e=new Error('Solo chi ha aperto il tavolo può modificarlo');e.code='42501';throw e}}
      else if(t.hostId!==me){const e=new Error('Puoi ospitare solo come te stesso');e.code='42501';throw e}
      return t;
    };
    DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>[];
    DB.allTables=async()=>window._TS;
    DB.saveTable=async t=>{
      try{
        const i=t.id?window._TS.findIndex(x=>x.id===t.id):-1;
        const old=i>=0?window._TS[i]:null;
        const row=gate({...(old||{}),...t},old);
        if(!row.id)row.id='t'+Math.random().toString(36).slice(2,8);
        row.status=row.status||'open';
        if(i>=0)window._TS[i]={...window._TS[i],...row};else window._TS.push(row);
        window._SAVED.push(row);
        return row;
      }catch(e){window._DENIED.push(e.message);throw e}
    };
    DB.status='online';
    const R=DB.remote||{};
    R.user=async()=>({id:'u1'});R.isAdmin=async()=>false;R.modCached=false;
    R.client={
      from(table){
        if(table==='table_types')return{select:()=>({order:async()=>({data:types,error:null})})};
        if(table==='app_settings')return{select:()=>({eq:()=>({maybeSingle:async()=>({data:{value:{ora_default:'21:00',pieno_msg:'I tavoli {tipo} per questa serata sono al completo. Per ulteriori prenotazioni contatta lo staff nel gruppo WhatsApp.',whatsapp_url:''}},error:null})})})};
        if(table==='table_type_caps')return{select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})})};
        return{select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})};
      },
      rpc:async(name,args)=>{
        if(name==='table_type_capacity'){const t=types.find(x=>x.id===args.p_type);return{data:t?t.capacity_default:0,error:null}}
        return{data:null,error:null};
      },
      functions:{invoke:async()=>({data:{items:[]},error:null})}
    };
    DB.remote=R;
    if(window.TT){TT.loaded=false;TT.types=types.slice();TT.cfg={ora_default:'21:00',pieno_msg:'I tavoli {tipo} per questa serata sono al completo. Per ulteriori prenotazioni contatta lo staff nel gruppo WhatsApp.',whatsapp_url:''};}
    if(typeof drawModeBtn==='function')drawModeBtn();
  });
};

const openSheet=async(p,tipo)=>{
  await p.evaluate(async tipo=>{
    const ms=await DB.members(),gs=await DB.games();
    const meM=ms.find(m=>m.id==='m1');
    const S={date:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date())};
    await window.agSheet({gs,ms,meM,staff:false,S,oggi:S.date});
    const b=[...document.querySelectorAll('.ttseg button')].find(x=>x.dataset.tid===tipo);
    if(b)b.click();
  },tipo);
  await W(250);
};

(async()=>{
  await new Promise((res,rej)=>srv.listen(PORT,'127.0.0.1',e=>e?rej(e):res()));
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--lang=it-IT']});
  const ctx=async()=>{
    const c=await b.newContext({serviceWorkers:'block',viewport:{width:412,height:915},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'});
    const p=await c.newPage();
    await p.route(/supabase\.co|jsdelivr/,r=>r.abort());
    await p.goto(BASE,{waitUntil:'load'});await W(700);
    await seed(p);await W(200);
    return {c,p};
  };

  {
    const{c,p}=await ctx();
    chk(await p.evaluate(()=>admin===false&&!adminMode()),'modalità utente (socio, non staff in UI)');
    await openSheet(p,'war');
    chk(await p.evaluate(()=>!!document.querySelector('#tt-ver')&&!document.querySelector('#tg')),'Warhammer: campo versione, niente gioco della collezione');
    await p.fill('#tt-ver','Warhammer 40.000 10ª edizione');
    await p.click('#tsv');await W(400);
    const war=await p.evaluate(()=>window._SAVED[window._SAVED.length-1]||null);
    chk(war&&war.typeId==='war'&&war.hostId==='m1'&&/40\.000/.test(war.versione||''),'socio host: tavolo Warhammer salvato con la versione');
    const toasts=await p.evaluate(()=>({t:(window._TOASTS||[]).join('\n'),d:(window._DENIED||[]).slice()}));
    chk(!/permessi admin/i.test(toasts.t+' '+toasts.d.join(' '))&&!toasts.d.length,'nessun errore di permessi admin sul testo Warhammer');
    await c.close();
  }

  {
    const{c,p}=await ctx();
    await openSheet(p,'gdr');
    await p.fill('#tt-rpgq','Last Sabbath');
    await p.click('#tsv');await W(400);
    const gdr=await p.evaluate(()=>window._SAVED[window._SAVED.length-1]||null);
    chk(gdr&&gdr.typeId==='gdr'&&gdr.gameName==='Last Sabbath'&&!gdr.gameId,'socio host: tavolo GDR salvato con il nome del gioco');
    chk(await p.evaluate(()=>!(window._DENIED||[]).length),'GDR: nessun rifiuto permessi');
    await c.close();
  }

  {
    const{c,p}=await ctx();
    await openSheet(p,'magic');
    chk(await p.evaluate(()=>!!document.querySelector('#tt-ver')),'tipo personalizzato: stesso campo di testo libero');
    await p.fill('#tt-ver','Commander, mazzo draghi');
    await p.click('#tsv');await W(400);
    const cu=await p.evaluate(()=>window._SAVED[window._SAVED.length-1]||null);
    chk(cu&&cu.typeId==='magic'&&/Commander/.test(cu.versione||''),'socio host: tipo personalizzato salvato con il testo');
    chk(await p.evaluate(()=>!(window._DENIED||[]).length),'personalizzato: nessun rifiuto permessi');
    await c.close();
  }

  {
    const{c,p}=await ctx();
    const r=await p.evaluate(()=>{
      // un altro socio non può cambiare il testo di un tavolo già aperto
      window._TS=[{id:'tw1',date:'2026-11-11',hostId:'m2',seats:2,time:'21:00',typeId:'war',versione:'10ª',players:[{memberId:'m2'}],status:'open'}];
      return DB.saveTable({id:'tw1',versione:'hack'}).then(()=>'ok').catch(e=>e.message);
    });
    chk(/Solo chi ha aperto/.test(r),'un altro socio non può modificare la versione');
    await c.close();
  }

  await b.close();srv.close();
  console.log(ok+'/'+n+' controlli');
  process.exit(ok===n?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
