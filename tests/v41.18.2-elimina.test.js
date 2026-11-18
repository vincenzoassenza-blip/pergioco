// node tests/v41.18.2-elimina.test.js — tasto Elimina gioco: solo admin, conferma, nascondi/elimina
const pw=require('playwright-core'),fs=require('fs'),path=require('path');
const {setup}=require('./screenshots-profilo.js');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};const W=ms=>new Promise(r=>setTimeout(r,ms));
const SHOT=process.env.SHOT||'/workspace';
(async()=>{
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
  const boot=async(role,extra)=>{
    const p=await setup(b,role,900);
    await p.evaluate(extra=>{
      const base=[{id:'g1',name:'Catan',min:3,max:4},{id:'g2',name:'Azul',min:2,max:4},{id:'g3',name:'Brass: Birmingham',min:2,max:4},{id:'g4',name:'Dixit',min:3,max:6},{id:'g5',name:'Wingspan',min:1,max:5},{id:'g6',name:'<img src=x onerror=alert(1)>',min:2,max:4},{id:'g7',name:'Solo senza storico',min:1,max:1},{id:'g8',name:'Nascosto già',min:2,max:4,hidden:true}];
      const gs=window._GS=base.map(g=>({...g}));
      const ps=window._PS=(typeof DB.plays==='function'&&false)?[]:[];
      // keep plays from setup by re-reading? setup already stubbed DB.plays. Re-get via evaluate we must redefine both.
    },extra);
    // redefine games/plays/tables/remove around the setup stubs
    await p.evaluate(()=>{
      const gs=window._GS=[{id:'g1',name:'Catan',min:3,max:4},{id:'g2',name:'Azul',min:2,max:4},{id:'g3',name:'Brass: Birmingham',min:2,max:4},{id:'g4',name:'Dixit',min:3,max:6},{id:'g5',name:'Wingspan',min:1,max:5},{id:'g6',name:'<img src=x onerror=alert(1)>',min:2,max:4},{id:'g7',name:'Solo senza storico',min:1,max:1},{id:'g8',name:'Nascosto già',min:2,max:4,hidden:true}];
      const origP=DB.plays;
      // keep existing plays from previous stub by calling once
    });
    return p;
  };
  // Simpler path: after setup, patch in one evaluate
  const open=async(role,opts={})=>{
    const p=await setup(b,role,900);
    await p.evaluate(({mod,keepPlays})=>{
      const gs=[{id:'g1',name:'Catan',min:3,max:4},{id:'g2',name:'Azul',min:2,max:4},{id:'g3',name:'Brass: Birmingham',min:2,max:4},{id:'g4',name:'Dixit',min:3,max:6},{id:'g5',name:'Wingspan',min:1,max:5},{id:'g6',name:'<img src=x onerror=alert(1)>',min:2,max:4},{id:'g7',name:'Solo senza storico',min:1,max:1},{id:'g8',name:'Nascosto già',min:2,max:4,hidden:true}];
      window._GS=gs;
      // plays already stubbed: include g1..g6, not g7. tables none for g7.
      const prevPlays=DB.plays;
      DB.games=async()=>window._GS;
      DB.removeGameInfo=async id=>{
        const g=window._GS.find(x=>x.id===id);if(!g)throw new Error('Gioco non trovato');
        const ps=await prevPlays();
        const plays=ps.filter(x=>x.gameId===id).length;
        const tables=((typeof DB.allTables==='function'?await DB.allTables():[])||[]).filter(t=>t.gameId===id).length;
        return {id,name:g.name,hidden:!!g.hidden,plays,tables,coppa:0,action:(plays||tables)?'hide':'delete'};
      };
      DB.removeGame=async id=>{
        const info=await DB.removeGameInfo(id);
        if(info.action==='hide'){const g=window._GS.find(x=>x.id===id);if(g)g.hidden=true}
        else window._GS=window._GS.filter(x=>x.id!==id);
        window._LAST=info;return info;
      };
      if(mod&&DB.remote)DB.remote.modCached=true;
      if(typeof drawModeBtn==='function')drawModeBtn();
      go('ludoteca');
    },opts);
    await W(1200);
    return p;
  };

  {const p=await open('staff');const q=f=>p.evaluate(f);
    chk(await q(()=>[...document.querySelectorAll('#gl .gitem')].map(x=>x.getAttribute('aria-label')).join('|').includes('Catan')&&![...document.querySelectorAll('#gl .gitem')].some(x=>/Nascosto già/.test(x.getAttribute('aria-label')||''))),'collezione: visibili sì, già nascosto no');
    chk(await q(()=>[...document.querySelectorAll('#gl .gitem')].some(x=>/Solo senza storico/.test(x.getAttribute('aria-label')||''))),'collezione: gioco senza storico visibile');
    await p.click('.gitem[data-gp="g1"]');await W(800);
    chk(await q(()=>!!document.getElementById('gdel')&&document.getElementById('gdel').textContent==='🗑 Elimina gioco'),'admin: tasto nella scheda di Catan');
    await p.evaluate(()=>document.getElementById('gdel').scrollIntoView({block:'center'}));await W(200);
    await p.screenshot({path:path.join(SHOT,'v41.18.2-elimina-gioco.png'),clip:{x:0,y:0,width:430,height:900}});
    await p.click('#gdel');await W(400);
    const msg=await q(()=>{const x=document.querySelector('.mdl .mtx');return x&&x.textContent});
    chk(msg&&/Catan/.test(msg)&&/partit/.test(msg)&&/nascosto/.test(msg)&&/storico, partite ed EXP restano/.test(msg),'conferma Catan: verrà nascosto, con il motivo');
    chk(await q(()=>document.querySelector('.mdl .p')&&document.querySelector('.mdl .p').textContent==='Nascondi gioco'),'conferma: tasto Nascondi gioco');
    await p.click('.mdl .p');await W(1000);
    chk(await q(()=>!document.querySelector('.gitem[data-gp="g1"]')&&!document.getElementById('gdel')),'dopo nascondi: Catan sparisce dalla collezione e la scheda si chiude');
    await q(()=>go('record'));await W(1400);
    const inRec=await q(()=>{
      const d=document.getElementById('rgames');
      if(d&&!d.open)d.open=true;
      return !!(d&&d.querySelector('[data-rg="g1"]')) || !!(document.querySelector('[data-gid="g1"]'));
    });
    chk(inRec,'Record: Catan resta tra le statistiche per gioco');
    if(inRec){await p.click('#rgames [data-rg="g1"]');await W(800);
      chk(await p.evaluate(()=>!!document.querySelector('.gpg h2')&&/Catan/.test(document.querySelector('.gpg h2').textContent)&&!document.getElementById('gdel')),'Record: la scheda di Catan (nascosto) si apre, senza tasto Elimina');
    }else chk(false,'Record: la scheda di Catan (nascosto) si apre, senza tasto Elimina');
    await p.context().close()}

  {const p=await open('staff');const q=f=>p.evaluate(f);
    await p.click('.gitem[data-gp="g7"]');await W(800);
    await p.click('#gdel');await W(400);
    const msg=await q(()=>{const x=document.querySelector('.mdl .mtx');return x&&x.textContent});
    chk(msg&&/Solo senza storico/.test(msg)&&/eliminato definitivamente/.test(msg)&&!/nascosto dalla collezione, ma storico/.test(msg),'conferma senza storico: eliminazione definitiva');
    chk(await q(()=>document.querySelector('.mdl .p').textContent==='Elimina definitivamente'),'conferma: tasto Elimina definitivamente');
    await p.click('.mdl .p');await W(1000);
    chk(await q(()=>!document.querySelector('.gitem[data-gp="g7"]')&&window._LAST&&window._LAST.action==='delete'),'dopo elimina: il gioco non è più in collezione');
    await p.context().close()}

  {const p=await open('socio');const q=f=>p.evaluate(f);
    await p.click('.gitem[data-gp="g1"]');await W(800);
    chk(await q(()=>!document.getElementById('gdel')&&!!document.querySelector('.gpg')),'socio: scheda senza tasto Elimina');
    await p.context().close()}

  {const p=await open('staff',{mod:true});const q=f=>p.evaluate(f);
    chk(await q(()=>typeof isMod==='function'&&isMod()&&adminMode()),'moderatore in modalità staff');
    await p.click('.gitem[data-gp="g1"]');await W(800);
    chk(await q(()=>!document.getElementById('gdel')),'moderatore: nessun tasto Elimina gioco');
    await p.context().close()}

  await b.close();
  console.log(`v41.18.2-elimina: ${ok}/${n} ok`);
  process.exit(ok===n?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
