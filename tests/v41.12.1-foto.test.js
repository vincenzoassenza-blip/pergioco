// node tests/v41.12.1-foto.test.js — foto profilo in barra e in modifica (porta 8814)
const pw=require('playwright-core'),fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
const BASE='http://127.0.0.1:8814/';
const ORIGIN='https://egmrtcezrjyoynlhknpz.supabase.co';
const PHOTO=ORIGIN+'/storage/v1/object/public/profile-photos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/avatar.webp';
const PNG=fs.readFileSync(path.join(__dirname,'fixtures/foto-test.png'));
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const T={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent((q.url||'/').split('?')[0]);if(p==='/')p='/index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(b)})});

const seed=async(p,opt={})=>{
  await p.route(PHOTO, r=>{
    if(opt.broken) return r.fulfill({status:404,body:'no'});
    return r.fulfill({status:200,contentType:'image/png',body:PNG});
  });
  await p.evaluate(({opt,PHOTO})=>{
    document.body.classList.remove('gate');
    localStorage.clear();admin=false;
    localStorage.setItem('pergioco-mode','socio');
    const ms=[
      {id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1',soprannome:'Vince',photoUrl:opt.photo?PHOTO:''},
      {id:'m2',nome:'Giulia',cognome:'Rossi',active:true,photoUrl:opt.other?PHOTO:''}
    ];
    const gs=[{id:'g1',name:'Catan',min:3,max:4}];
    DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>[];
    DB.allTables=async()=>[];DB.hasPin=async()=>true;DB.legacyNames=async()=>[];
    DB.status='online';
    const R=DB.remote||{};
    R.user=async()=>({id:'u1',email:'vincenzo.assenza@example.org'});
    R.isAdmin=async()=>false;R.modCached=false;
    R.updateProfile=async o=>{window._upd=o};
    R.uploadPhoto=async b=>{window._up=!!(b&&b.size);return PHOTO};
    R.removePhotoFile=async()=>{window._rm=true};
    DB.remote=R;window._MS=ms;
  },{opt,PHOTO});
  await p.evaluate(()=>{window._pv=null;if(typeof drawOutBtn==='function')drawOutBtn();go('profilo')});
  await W(800);
};

(async()=>{
  await new Promise(r=>srv.listen(8814,'127.0.0.1',r));
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
  const ctx=async()=>{
    const c=await b.newContext({serviceWorkers:'block',viewport:{width:430,height:900},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'});
    const p=await c.newPage();
    p.on('pageerror',e=>console.log('ERR',e.message));
    await p.route(/supabase|jsdelivr/,r=>{
      if(String(r.request().url()).startsWith(ORIGIN+'/storage/')) return r.fallback();
      return r.abort();
    });
    await p.goto(BASE,{waitUntil:'domcontentloaded'});
    await W(600);
    return p;
  };

  {const p=await ctx();await seed(p,{});
    chk(await p.evaluate(()=>document.getElementById('avbtn')&&!document.getElementById('avbtn').hidden&&document.getElementById('avbtn').textContent==='VA'&&!document.querySelector('#avbtn img')),'senza foto: iniziali in barra');
    chk(await p.evaluate(()=>!!document.querySelector('#efotogo')&&/Scegli foto/.test(document.getElementById('efotogo').textContent)),'modifica profilo: Scegli foto');
    chk(await p.evaluate(()=>{const d=document.getElementById('efotodel');return d&&d.hidden}),'senza foto: Rimuovi nascosto');
    await p.context().close()}

  {const p=await ctx();await seed(p,{photo:true});
    await p.evaluate(async()=>{if(window.HD417&&HD417.av)await HD417.av()});
    await W(400);
    const info=await p.evaluate(()=>{const b=document.getElementById('avbtn'),img=b&&b.querySelector('img.avimg'),s=img&&getComputedStyle(img),c=b&&getComputedStyle(b);
      return{src:img&&img.getAttribute('src'),circ:c&&c.borderRadius,cover:s&&s.objectFit,w:c&&c.width,ini:b&&b.getAttribute('data-ini')}});
    chk(info.src&&info.src.split('?')[0].endsWith('/avatar.webp')&&info.ini==='VA','con foto: immagine in barra al posto delle iniziali');
    chk(info.circ==='50%'&&info.cover==='cover'&&info.w==='36px','ritaglio circolare 36px');
    chk(await p.evaluate(()=>!!document.querySelector('.card.prof img.avimg')),'foto anche nell\'avatar del Profilo');
    chk(await p.evaluate(()=>{const d=document.getElementById('efotodel');return d&&!d.hidden}),'con foto: Rimuovi visibile');
    await p.context().close()}

  {const p=await ctx();await seed(p,{photo:true,broken:true});
    await p.evaluate(async()=>{if(window.HD417&&HD417.av)await HD417.av()});
    await W(600);
    chk(await p.evaluate(()=>{const b=document.getElementById('avbtn');return b&&!b.querySelector('img')&&b.textContent==='VA'}),'foto non caricabile: torna alle iniziali');
    await p.context().close()}

  {const p=await ctx();await seed(p,{});
    const okSrc=await p.evaluate(PHOTO=>{
      const evil=['javascript:alert(1)','https://evil.example/x.png','data:image/png;base64,abcd',PHOTO.replace('avatar.webp','x.svg'),'<img src=x onerror=alert(1)>'];
      const ms=window._MS;ms[0].photoUrl=evil[0];
      const h1=avatarHtml(ms[0],32);
      ms[0].photoUrl=evil[1];const h2=avatarHtml(ms[0],32);
      ms[0].photoUrl=evil[2];const h3=avatarHtml(ms[0],32);
      ms[0].photoUrl=evil[3];const h4=avatarHtml(ms[0],32);
      ms[0].photoUrl=evil[4];const h5=avatarHtml(ms[0],32);
      ms[0].photoUrl=PHOTO;const hOk=avatarHtml(ms[0],32);
      const bad=[h1,h2,h3,h4,h5].every(h=>!/avimg/.test(h)&&!/javascript:/i.test(h)&&!/evil\.example/.test(h)&&!/onerror/.test(h));
      return bad&&hOk.includes('avimg')&&hOk.includes(PHOTO)&&!hOk.includes('<img src=x');
    },PHOTO);
    chk(okSrc,'URL non validi non finiscono nel HTML; URL valido sì, escapato');
    await p.evaluate(async PHOTO=>{window._MS[0].photoUrl='https://evil.example/x.png';if(HD417&&HD417.av)await HD417.av()},{PHOTO});
    await W(200);
    chk(await p.evaluate(()=>{const b=document.getElementById('avbtn'),img=b&&b.querySelector('img');return !img&&b.textContent==='VA'}),'URL malevolo in barra: restano le iniziali');
    await p.context().close()}

  {const p=await ctx();await seed(p,{});
    await p.click('#pedit');await W(200);
    const file=path.join(__dirname,'fixtures/foto-test.png');
    await p.setInputFiles('#efoto',file);
    await W(400);
    chk(await p.evaluate(()=>!!document.querySelector('.avedit img.avimg')&&!document.getElementById('efotodel').hidden),'anteprima dopo la scelta del file');
    await p.click('#esv');await W(400);
    const saved=await p.evaluate(()=>({up:window._up,upd:window._upd}));
    chk(saved.up===true&&saved.upd&&saved.upd.photoUrl===PHOTO,'Salva carica la foto e invia l\'URL');
    await p.context().close()}

  {const p=await ctx();await seed(p,{photo:true});
    await p.click('#pedit');await W(200);
    await p.click('#efotodel');await W(100);
    await p.click('#esv');await W(400);
    const saved=await p.evaluate(()=>({rm:window._rm,upd:window._upd}));
    chk(saved.rm===true&&saved.upd&&(saved.upd.photoUrl==null||saved.upd.photoUrl===''),'Rimuovi foto: torna alle iniziali e cancella il file');
    await p.context().close()}

  {const p=await ctx();await seed(p,{other:true});
    await p.evaluate(()=>{window._pv='m2';go('profilo')});await W(800);
    chk(await p.evaluate(()=>!!document.querySelector('.card.prof img.avimg')),'foto visibile anche sull\'avatar di un altro socio');
    await p.context().close()}

  chk(/APP_VERSION='41\.12\.1'/.test(fs.readFileSync(path.join(ROOT,'brand.js'),'utf8')),'versione brand 41.12.1');

  await b.close();srv.close();
  console.log(ok+'/'+n+' controlli');
  process.exit(ok===n?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
