// node tests/v41.16.1.test.js — assegnazione ricompense su mobile (tocco, ricerca, RPC)
const pw=require('playwright-core');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const PORT=process.env.TEST_PORT||8799;

(async()=>{
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
  const ctx=await b.newContext({
    serviceWorkers:'block',
    viewport:{width:390,height:844},
    hasTouch:true,
    isMobile:true,
    locale:'it-IT',
    timezoneId:'Europe/Rome'
  });
  const p=await ctx.newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.route(/supabase|jsdelivr/,r=>r.abort());
  await p.goto('http://127.0.0.1:'+PORT+'/');
  await W(1000);

  await p.evaluate(()=>{
    document.body.classList.remove('gate');localStorage.clear();
    admin=true;localStorage.setItem('pergioco-mode','admin');
    const ms=[
      {id:'m1',nome:'Anna',cognome:'Verdi',active:true,userId:'u1'},
      {id:'m2',nome:'Bruno',cognome:'Neri',active:true},
      {id:'m3',nome:'Carla',cognome:'Gialli',active:true,sospeso:true}
    ];
    DB.games=async()=>[];DB.members=async()=>ms;DB.plays=async()=>[];DB.allTables=async()=>[];
    DB.hasPin=async()=>true;DB.legacyNames=async()=>[];
    DB.status='online';
    window._rpcCalls=[];
    const assigned=[];
    const R=DB.remote||{};
    R.user=async()=>({id:'u1'});R.isAdmin=async()=>true;
    R.client={rpc:async(name,args)=>{
      window._rpcCalls.push({name,args});
      if(name==='ricompensa_assegna'){
        const {p_member,p_ricompensa,p_on}=args||{};
        const i=assigned.findIndex(a=>a.member_id===p_member&&a.ricompensa_id===p_ricompensa);
        if(p_on&&i<0)assigned.push({member_id:p_member,ricompensa_id:p_ricompensa});
        if(!p_on&&i>=0)assigned.splice(i,1);
        return {data:null,error:null};
      }
      if(name==='ricompense_stato'){
        return {data:Object.assign(RC.norm(RC.seed()),{assegnate:assigned.slice()}),error:null};
      }
      return {data:null,error:null};
    }};
    R.refresh=async()=>{};
    DB.remote=R;
    if(typeof RC!=='undefined'){RC.data=RC.norm(RC.seed());RC.ready=true}
  });

  await p.evaluate(()=>RC.draw('tester'));
  await W(600);

  const layout=await p.evaluate(()=>{
    const row=document.querySelector('.rcaln');
    const sw=row&&row.querySelector('input.rcsw');
    const nm=row&&row.querySelector('.rcalnm');
    if(!row||!sw||!nm)return {ok:false};
    const rs=getComputedStyle(row),cs=getComputedStyle(sw),ns=getComputedStyle(nm);
    const rr=row.getBoundingClientRect(),cr=sw.getBoundingClientRect(),nr=nm.getBoundingClientRect();
    return {
      ok:true,
      display:rs.display,
      minH:parseFloat(rs.minHeight),
      rowH:rr.height,
      inputW:cr.width,
      inputH:cr.height,
      nameLeft:nr.left,
      swLeft:cr.left,
      vAlign:Math.abs((nr.top+nr.bottom)/2-(cr.top+cr.bottom)/2),
      rows:document.querySelectorAll('.rcaln').length,
      vis:!!document.querySelector('#rcvis.rcsw'),
      visRow:(()=>{const l=document.querySelector('label.rctog');return l&&getComputedStyle(l).display==='flex'&&l.getBoundingClientRect().height>=44})()
    };
  });
  chk(layout.ok&&layout.rows===3,'elenco soci in scheda ricompensa');
  chk(layout.display==='flex'&&layout.minH>=44&&layout.rowH>=44,'riga flex, altezza minima 44px');
  chk(layout.inputW<=48&&layout.inputW>=40&&layout.inputH<=30,'interruttore compatto, non a tutta larghezza');
  chk(layout.nameLeft<layout.swLeft&&layout.vAlign<=8,'nome a sinistra, interruttore a destra, allineati');
  chk(layout.vis&&layout.visRow,'Visibile in app: stesso interruttore, riga toccabile');

  // ricerca filtra
  await p.fill('#rcaq','Anna');
  await W(200);
  const filt=await p.evaluate(()=>[...document.querySelectorAll('.rcaln')].map(l=>({t:l.querySelector('.rcalnm').textContent,h:l.hidden})));
  chk(filt.filter(x=>!x.h).length===1&&!filt.find(x=>/Anna/.test(x.t)).h&&filt.filter(x=>!/Anna/.test(x.t)).every(x=>x.h),'ricerca per nome mostra solo Anna');
  await p.fill('#rcaq','');
  await W(150);

  // tocco sul nome (non sul checkbox) → assegna via RPC
  const before=await p.evaluate(()=>window._rpcCalls.length);
  await p.locator('.rcaln',{hasText:'Anna Verdi'}).locator('.rcalnm').tap();
  await W(500);
  const afterOn=await p.evaluate(()=>{
    const calls=window._rpcCalls.filter(c=>c.name==='ricompensa_assegna');
    const last=calls[calls.length-1];
    const sw=document.querySelector('.rcaln[data-q*="anna"] .rcsw');
    return {n:calls.length,args:last&&last.args,checked:sw&&sw.checked,stato:window._rpcCalls.some(c=>c.name==='ricompense_stato')};
  });
  chk(afterOn.n>=1&&afterOn.args&&afterOn.args.p_member==='m1'&&afterOn.args.p_ricompensa==='tester'&&afterOn.args.p_on===true,'tocco sul nome chiama ricompensa_assegna (p_on true)');
  chk(afterOn.checked===true&&afterOn.stato,'interruttore acceso e stato ricaricato via RPC');

  // deseleziona → rimuove
  await p.locator('.rcaln',{hasText:'Anna Verdi'}).locator('.rcalnm').tap();
  await W(500);
  const afterOff=await p.evaluate(()=>{
    const calls=window._rpcCalls.filter(c=>c.name==='ricompensa_assegna');
    const last=calls[calls.length-1];
    const sw=document.querySelector('.rcaln[data-q*="anna"] .rcsw');
    return {n:calls.length,on:last&&last.args.p_on,checked:sw&&sw.checked};
  });
  chk(afterOff.n>=2&&afterOff.on===false&&afterOff.checked===false,'secondo tocco rimuove l\'assegnazione via RPC');

  // riquadro nella scheda socio: stesse righe toccabili
  const box=await p.evaluate(()=>{
    const host=document.createElement('div');
    document.body.appendChild(host);
    RC.mountBox(host,{id:'m2'});
    const row=host.querySelector('.rcaln');
    const sw=row&&row.querySelector('input.rcsw');
    const rs=row&&row.getBoundingClientRect();
    const cs=sw&&sw.getBoundingClientRect();
    const ok=!!(row&&sw&&rs.height>=44&&cs.width<=48&&rs.left<=cs.left);
    host.remove();
    return ok;
  });
  chk(box,'riquadro Ricompense nella scheda socio: riga 44px, interruttore a destra');

  chk(errs.length===0,'nessun errore JS su mobile: '+(errs.join('|')||'ok'));

  await ctx.close();await b.close();
  console.log(`v41.16.1 pw: ${ok}/${n} ok`);
  if(ok!==n)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
