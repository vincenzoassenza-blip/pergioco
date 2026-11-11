// node tests/v41.14-password.test.js — Cambia password nel Profilo collegato, 412×915
const pw=require('playwright-core'),fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
const PORT=8843;
const BASE=`http://127.0.0.1:${PORT}/`;
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const MIME={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let pth=decodeURIComponent((q.url||'/').split('?')[0]);if(pth==='/')pth='/index.html';
  fs.readFile(path.join(ROOT,pth),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':MIME[path.extname(pth)]||'application/octet-stream'});r.end(b)})});

const seed=async(p,opt={})=>{
  await p.evaluate(opt=>{
    document.body.classList.remove('gate');
    localStorage.clear();
    admin=!!opt.staff;
    localStorage.setItem('pergioco-mode',opt.staff?'admin':'user');
    window._pv=opt.other||null;
    const ms=[
      {id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1',favGameId:'g1',soprannome:'Vince',avatar:'🦊'},
      {id:'m2',nome:'Giulia',cognome:'Rossi',active:true,userId:'u2'}
    ];
    const gs=[{id:'g1',name:'Catan',min:3,max:4}];
    DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>[];DB.allTables=async()=>[];
    DB.legacyNames=async()=>[];DB.hasPin=async()=>true;DB.status=opt.offline?'offline':'online';
    const R=DB.remote||{};
    R.user=async()=>({id:'u1',email:'socio@example.com'});
    R.isAdmin=async()=>!!opt.staff;
    R.updateProfile=async o=>{window._upd=o};
    R.changePassword=async(cur,neu)=>{
      window._pwCalls=(window._pwCalls||[]).concat([{step:'change'}]);
      if(window._pwFail==='bad')throw new Error('La password attuale non è corretta');
      if(window._pwFail==='net')throw new Error('Failed to fetch');
      window._pwOk={did:true};
    };
    DB.remote=R;
  },opt);
  await p.evaluate(async()=>{
    if(window.HD417&&HD417.av)try{await HD417.av()}catch(e){}
    window._pv=window._pv||null;
    await views.profilo();
  });
  await W(400);
};

(async()=>{
  await new Promise((res,rej)=>srv.listen(PORT,'127.0.0.1',e=>e?rej(e):res()));
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--lang=it-IT']});
  const ctx=async()=>{
    const c=await b.newContext({serviceWorkers:'block',viewport:{width:412,height:915},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'});
    const p=await c.newPage();
    const leaks=[];
    const watch=t=>{if(/attualeok|nuovapw|Secret\d|P@ss/.test(String(t)))leaks.push(String(t))};
    p.on('console',m=>watch(m.text()));
    p.on('pageerror',e=>watch(e.message));
    await p.route(/supabase\.co|jsdelivr/,r=>r.abort());
    await p.goto(BASE,{waitUntil:'load'});await W(700);
    p._leaks=leaks;
    return {c,p};
  };

  {
    const{c,p}=await ctx();
    await seed(p,{});
    chk(await p.$('#pwbox #pwopen'),'riga 🔑 Cambia password nel proprio Profilo');
    chk(await p.evaluate(()=>document.querySelector('#pwopen b').textContent==='Cambia password'&&document.querySelector('#pwopen .ic').textContent==='🔑'&&document.querySelector('#pwopen .ar').textContent==='▸'),'etichetta e freccia ▸');
    chk(await p.evaluate(()=>document.getElementById('pwform').hidden),'form chiuso all\'inizio');
    await p.click('#pwopen');await W(200);
    chk(await p.evaluate(()=>!document.getElementById('pwform').hidden&&document.getElementById('pwopen').getAttribute('aria-expanded')==='true'&&document.querySelector('#pwopen .ar').textContent==='▾'),'tocco apre il modulo (▾)');
    chk(await p.evaluate(()=>['pwcur','pwnew','pwnew2'].every(id=>{const i=document.getElementById(id);return i&&i.type==='password'&&i.autocomplete})),'tre campi password con autocomplete');
    await p.click('#pwgo');await W(150);
    chk(await p.evaluate(()=>/Inserisci la password attuale/.test(document.getElementById('pwerr').textContent)&&!document.getElementById('pwerr').hidden),'errore: password attuale mancante');
    await p.fill('#pwcur','attualeok');await p.fill('#pwnew','corta');await p.fill('#pwnew2','corta');await p.click('#pwgo');await W(150);
    chk(await p.evaluate(()=>/almeno 8 caratteri/.test(document.getElementById('pwerr').textContent)),'errore: lunghezza minima 8');
    await p.fill('#pwnew','nuovapw1');await p.fill('#pwnew2','nuovapw2');await p.click('#pwgo');await W(150);
    chk(await p.evaluate(()=>/non coincidono/.test(document.getElementById('pwerr').textContent)),'errore: conferma diversa');
    await p.fill('#pwnew','attualeok');await p.fill('#pwnew2','attualeok');await p.click('#pwgo');await W(150);
    chk(await p.evaluate(()=>/diversa da quella attuale/.test(document.getElementById('pwerr').textContent)),'errore: nuova uguale all\'attuale');
    await p.evaluate(()=>window._pwFail='bad');
    await p.fill('#pwnew','nuovapw1');await p.fill('#pwnew2','nuovapw1');await p.click('#pwgo');await W(200);
    chk(await p.evaluate(()=>/password attuale non è corretta/.test(document.getElementById('pwerr').textContent)),'errore: password attuale non corretta, in italiano');
    await p.evaluate(()=>window._pwFail=null);
    await p.fill('#pwcur','attualeok');await p.fill('#pwnew','nuovapw1');await p.fill('#pwnew2','nuovapw1');await p.click('#pwgo');await W(300);
    chk(await p.evaluate(()=>window._pwOk&&window._pwOk.did&&document.getElementById('pwform').hidden&&!document.getElementById('pwcur').value),'successo: chiama changePassword, chiude e svuota i campi');
    chk(await p.evaluate(()=>[...document.querySelectorAll('.toast')].some(t=>t.textContent==='Password aggiornata')),'toast «Password aggiornata»');
    await p.click('#pedit');await W(200);
    chk(await p.$('#pwfromed'),'in Modifica profilo c\'è 🔑 Cambia password');
    await p.click('#pwfromed');await W(200);
    chk(await p.evaluate(()=>!document.getElementById('pwform').hidden),'il pulsante in Modifica apre il modulo');
    chk(!p._leaks.length,'nessuna password nei log o errori JS');
    await c.close();
  }

  {
    const{c,p}=await ctx();
    await seed(p,{other:'m2',staff:true});
    // viewing another member: set _pv before profilo
    await p.evaluate(async()=>{window._pv='m2';await views.profilo()});await W(400);
    chk(await p.evaluate(()=>!document.getElementById('pwbox')),'sul profilo di un altro socio il cambio password non c\'è');
    await c.close();
  }

  await b.close();srv.close();
  console.log(ok+'/'+n+' controlli');
  process.exit(ok===n?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
