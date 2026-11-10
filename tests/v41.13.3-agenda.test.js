// node tests/v41.13.3-agenda.test.js — schede Agenda compatte a 412px (porta 8835)
const pw=require('playwright-core'),fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.join(__dirname,'..');
const OUT='/workspace/pergioco-mockups/ux/agenda-schede';
const PORT=8835;
const BASE=`http://127.0.0.1:${PORT}/`;
fs.mkdirSync(OUT,{recursive:true});
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const T={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent((q.url||'/').split('?')[0]);if(p==='/')p='/index.html';
  fs.readFile(path.join(ROOT,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(b)})});

const TYPES3=[
  {id:'board',nome:'Gioco da tavolo',icona:'🎲',sort:10,attivo:true,capacity_default:5,kind:'board'},
  {id:'gdr',nome:'GDR',icona:'🐉',sort:20,attivo:true,capacity_default:2,kind:'gdr'},
  {id:'war',nome:'Warhammer',icona:'⚔️',sort:30,attivo:true,capacity_default:2,kind:'war'}
];
const TYPES4=TYPES3.concat([{id:'card',nome:'Carte',icona:'🃏',sort:40,attivo:true,capacity_default:4,kind:'board'}]);

const seed=async(p,opt={})=>{
  await p.evaluate(({opt,TYPES3,TYPES4})=>{
    document.documentElement.lang='it';
    document.body.classList.remove('gate');
    localStorage.clear();
    const staff=!!opt.staff;
    admin=staff;
    localStorage.setItem('pergioco-mode',opt.mode||(staff?'admin':'user'));
    const ms=[
      {id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1',avatar:'🦊',color:'#455a64'},
      {id:'m2',nome:'Giulia',cognome:'Rossi',active:true,userId:'u2'},
      {id:'m3',nome:'Marco',cognome:'Bianchi',active:true}
    ];
    const gs=[{id:'g1',name:opt.xss?'Catan <img src=x onerror=alert(1)>':'Catan',min:3,max:4}];
    const td=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
    window._TS=[
      {id:'tg1',date:td,hostId:'m1',seats:7,time:'21:00',typeId:'gdr',gameName:'Advanced Dungeons & Dragons (3rd Edition): Dungeon Masters Guide (2013)',bggRpgId:153208,masterMemberId:'m1',players:[{memberId:'m1'}],status:'open',note:opt.xss?'<script>window.__xss=1</script>':''},
      {id:'t1',date:td,evening:'Martedì',hostId:'m3',seats:4,time:'21:00',gameId:'g1',typeId:'board',players:[{memberId:'m3'},{memberId:'m2'}],status:'open',note:''},
      {id:'tw1',date:td,hostId:'m3',seats:2,time:'21:30',typeId:'war',versione:'Warhammer 40.000 10ª edizione',players:[{memberId:'m3'}],status:'open'}
    ];
    DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>[];
    DB.allTables=async()=>window._TS;
    DB.hasPin=async()=>true;DB.legacyNames=async()=>[];
    DB.status='online';
    const types=opt.types4?TYPES4:TYPES3;
    const uid=staff?'u1':'u2';
    const R=DB.remote||{};
    R.user=async()=>({id:uid});R.isAdmin=async()=>staff;R.modCached=false;R.adminCached=staff;
    R.client={
      from(table){
        if(table==='table_types')return{select:()=>({order:async()=>({data:types,error:null})})};
        if(table==='app_settings')return{select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})};
        return{select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})};
      },
      rpc:async()=>({data:null,error:null})
    };
    DB.remote=R;
    if(window.TT){TT.loaded=false;TT.types=types.slice();TT.cfg={ora_default:'21:00'}}
    if(typeof isMod==='function')window.isMod=()=>false;
    if(typeof drawModeBtn==='function')drawModeBtn();
  },{opt,TYPES3,TYPES4});
};

const overlap=(a,b)=>!(a.right<=b.left+0.5||b.right<=a.left+0.5||a.bottom<=b.top+0.5||b.bottom<=a.top+0.5);

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
    await p.evaluate(async()=>{
      if(window.TT&&TT.load)try{await TT.load()}catch(e){}
      if(window.HD417&&HD417.av)await HD417.av();
      if(typeof drawModeBtn==='function')drawModeBtn();
      go('serata');
    });
    await W(800);
    await p.evaluate(()=>document.querySelectorAll('.toast').forEach(t=>t.remove()));
  };

  // 1) staff admin: layout, Chiudi, ⋯, filtri chip, niente accavallamenti a 412px
  {
    const{c,p}=await ctx();
    await goAg(p,{staff:true,mode:'admin'});
    const first=p.locator('.card.agt').first();
    chk(await first.locator('.agtit').count(),'staff: titolo .agtit');
    const clamp=await first.locator('.agtit').evaluate(el=>getComputedStyle(el).webkitLineClamp);
    chk(clamp==='2','titolo -webkit-line-clamp 2');
    const titleBox=await first.locator('.agtit').evaluate(el=>{const cs=getComputedStyle(el),lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.25;return {h:el.getBoundingClientRect().height,lh,clamp:cs.webkitLineClamp,overflow:cs.overflow};});
    chk(titleBox.clamp==='2'&&titleBox.overflow==='hidden'&&titleBox.h<=titleBox.lh*2+2,'titolo lungo contenuto in 2 righe ('+JSON.stringify(titleBox)+')');
    chk(await first.locator('.agst').textContent().then(t=>t.includes('6 posti liberi')),'6 posti liberi in alto a destra');
    chk(await first.locator('.agl2 .agtipo, .agl2 .ttbadge').count(),'etichetta tipo nella riga meta');
    chk(await first.locator('.agchiudi').count() && (await first.locator('.agchiudi').textContent()).includes('Chiudi e registra'),'Chiudi e registra a vista');
    chk(await first.locator('.agmore').count(),'menu ⋯ presente');
    chk(!await first.locator('.agact [data-o]:not([hidden]):visible, .agact .lnk').count(),'azioni secondarie non sciolte sotto il pulsante');
    chk(await p.$('#agtf [data-tf]') && !await p.$('#agtipobtn'),'3 tipi: chip, non tendina');
    chk(await p.$('#agcal svg'),'calendarietto SVG');
    const lay=await p.evaluate(()=>{
      const hit=(a,b)=>{if(!a||!b)return false;const A=a.getBoundingClientRect(),B=b.getBoundingClientRect();return !(A.right<=B.left+0.5||B.right<=A.left+0.5||A.bottom<=B.top+0.5||B.bottom<=A.top+0.5)};
      const cards=[...document.querySelectorAll('.card.agt')];
      const out=[];
      for(const card of cards){
        const tit=card.querySelector('.agtit'),st=card.querySelector('.agst'),chi=card.querySelector('.agchiudi'),btn=card.querySelector('.agbtn'),more=card.querySelector('.agmore');
        if(hit(tit,st))out.push('titolo-posti');
        if(hit(chi,btn)||hit(btn,more)||hit(chi,more))out.push('azioni');
        const cr=card.getBoundingClientRect();
        for(const el of [chi,btn,more,tit,st]){
          if(!el)continue;const r=el.getBoundingClientRect();
          if(r.left<cr.left-1||r.right>cr.right+1)out.push('overflow-card');
        }
      }
      const days=[...document.querySelectorAll('.agdays .chip, #agcal')];
      for(let i=0;i<days.length;i++)for(let j=i+1;j<days.length;j++)if(hit(days[i],days[j]))out.push('date');
      const chips=[...document.querySelectorAll('#agtf .chip')];
      for(let i=0;i<chips.length;i++)for(let j=i+1;j<chips.length;j++)if(hit(chips[i],chips[j]))out.push('filtri');
      return out;
    });
    chk(lay.length===0,'nessun accavallamento a 412px: '+(lay.join(',')||'ok'));
    await p.screenshot({path:path.join(OUT,'live-01-staff.png')});
    await c.close();
  }

  // 2) menu ⋯ aperto: Ospite, Giocatori, Elimina; Esc chiude; niente sottolineature
  {
    const{c,p}=await ctx();
    await goAg(p,{staff:true,mode:'admin'});
    await p.locator('.card.agt .agmore').first().click();
    await p.waitForSelector('#agmenu');
    const txt=await p.locator('#agmenu').innerText();
    chk(txt.includes('Ospite')&&txt.includes('Giocatori')&&txt.includes('Elimina'),'menu: Ospite, Giocatori, Elimina');
    const deco=await p.evaluate(()=>[...document.querySelectorAll('#agmenu button')].every(b=>getComputedStyle(b).textDecorationLine==='none'));
    chk(deco,'voci menu senza sottolineatura');
    const menuBox=await p.evaluate(()=>{const m=document.getElementById('agmenu'),r=m.getBoundingClientRect();return r.left>=0&&r.right<=window.innerWidth+1&&r.top>=0&&r.bottom<=window.innerHeight+1});
    chk(menuBox,'menu interamente nel viewport 412×915');
    await p.screenshot({path:path.join(OUT,'live-02-menu.png')});
    await p.keyboard.press('Escape');
    chk(!await p.$('#agmenu'),'Esc chiude il menu');
    await c.close();
  }

  // 3) socio: solo azione principale, niente Chiudi né ⋯
  {
    const{c,p}=await ctx();
    await goAg(p,{staff:false,mode:'user'});
    const info=await p.evaluate(()=>[...document.querySelectorAll('.card.agt')].map(c=>({act:(c.querySelector('.agact')||{}).innerText||'',more:!!c.querySelector('.agmore'),chi:!!c.querySelector('.agchiudi')})));
    chk(info.length===3&&info.every(x=>!x.more&&!x.chi),'socio: niente ⋯ né Chiudi');
    chk(info[0].act.trim()==='Siediti'&&info[1].act.trim()==='Lascia il posto'&&info[2].act.trim()==='Siediti','socio: solo Siediti/Lascia il posto');
    await p.screenshot({path:path.join(OUT,'live-03-socio.png')});
    await c.close();
  }

  // 4) più di 3 tipi: tendina «Tipo: Tutto ▾»
  {
    const{c,p}=await ctx();
    await goAg(p,{staff:true,mode:'admin',types4:true});
    chk(await p.$('#agtipobtn') && !await p.$('#agtf [data-tf]'),'oltre 3 tipi: tendina, non chip');
    const lab=await p.locator('#agtipobtn').innerText();
    chk(lab.includes('Tipo:')&&lab.includes('Tutto')&&lab.includes('▾'),'etichetta Tipo: Tutto ▾');
    await p.click('#agtipobtn');
    await p.waitForSelector('#agmenu');
    const opts=await p.locator('#agmenu button').allTextContents();
    chk(opts.some(x=>x.includes('Tutto'))&&opts.some(x=>x.includes('Carte'))&&opts.length===5,'tendina: Tutto + 4 tipi');
    await p.keyboard.press('Escape');
    await c.close();
  }

  // 5) XSS: titolo e nota escapati, niente esecuzione
  {
    const{c,p}=await ctx();
    let alerted=false;p.on('dialog',d=>{alerted=true;d.dismiss()});
    await goAg(p,{staff:true,mode:'admin',xss:true});
    const html=await p.locator('.card.agt').nth(1).innerHTML();
    chk(html.includes('&lt;img')||html.includes('Catan &lt;')||!html.includes('<img src=x'),'nome gioco escapato');
    chk(await p.evaluate(()=>!window.__xss),'nota script non eseguita');
    chk(!alerted,'nessun alert XSS');
    await c.close();
  }

  // 6) staff in modalità utente: come un socio (niente Chiudi/⋯ se non host)
  {
    const{c,p}=await ctx();
    await goAg(p,{staff:true,mode:'user'});
    // Vincenzo (m1) is host of GDR, so first card may still show Chiudi as host.
    // Other cards (Catan, Warhammer) must not show staff extras because adminMode is false (staff=adminMode()).
    const info=await p.evaluate(()=>[...document.querySelectorAll('.card.agt')].map(c=>({id:c.getAttribute('data-t'),more:!!c.querySelector('.agmore'),chi:!!c.querySelector('.agchiudi'),act:(c.querySelector('.agact')||{}).innerText||''})));
    const gdr=info.find(x=>x.id==='tg1'),oth=info.filter(x=>x.id!=='tg1');
    chk(gdr&&gdr.chi&&gdr.more,'host in modalità utente: Chiudi e ⋯ (è organizzatore)');
    chk(oth.every(x=>!x.more&&!x.chi),'altri tavoli in modalità utente: niente azioni staff');
    await c.close();
  }

  await b.close();srv.close();
  console.log(ok+'/'+n+' controlli');
  if(ok!==n)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
