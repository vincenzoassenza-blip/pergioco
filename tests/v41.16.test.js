// node tests/v41.16.test.js — Più vittorie in scheda gioco, filtro Sospesi, sezione Ricompense
const pw=require('playwright-core');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const PORT=process.env.TEST_PORT||8799;

(async()=>{
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
  const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:430,height:900},locale:'it-IT',timezoneId:'Europe/Rome'});
  const p=await ctx.newPage();
  p.on('pageerror',e=>console.log('ERR',e.message));
  await p.route(/supabase|jsdelivr/,r=>r.abort());
  await p.goto('http://localhost:'+PORT+'/');
  await W(800);
  await p.evaluate(()=>{
    document.body.classList.remove('gate');localStorage.clear();admin=true;localStorage.setItem('pergioco-mode','admin');
    const ms=[
      {id:'m1',nome:'Anna',cognome:'Verdi',active:true,userId:'u1'},
      {id:'m2',nome:'Bruno',cognome:'Neri',active:true},
      {id:'m3',nome:'Carla',cognome:'Gialli',active:true,sospeso:true}
    ];
    const gs=[{id:'catan',name:'Catan',min:3,max:4,minT:60,maxT:90,age:10,coop:false,kind:'gdt'},
              {id:'azul',name:'Azul',min:2,max:4,minT:30,maxT:45,age:8,coop:false,kind:'gdt'},
              {id:'gdrx',name:'Last Sabbath',min:1,max:6,minT:120,maxT:180,age:16,coop:true,kind:'gdr'}];
    const ps=[
      {id:'p1',gameId:'catan',date:'2026-10-01',coop:false,playKind:'board',players:[{memberId:'m1',winner:true,score:'11'},{memberId:'m2',winner:false,score:'7'}]},
      {id:'p2',gameId:'catan',date:'2026-10-08',coop:false,playKind:'board',players:[{memberId:'m1',winner:true,score:'10'},{memberId:'m2',winner:false,score:'8'}]},
      {id:'p3',gameId:'catan',date:'2026-10-15',coop:false,playKind:'board',players:[{memberId:'m2',winner:true,score:'12'},{memberId:'m1',winner:false,score:'6'}]},
      {id:'p4',gameId:'azul',date:'2026-10-02',coop:false,playKind:'board',players:[{memberId:'m2',winner:true,score:'80'},{memberId:'m1',winner:false,score:'70'}]},
      {id:'p5',gameId:'gdrx',date:'2026-10-03',playKind:'gdr',typeId:'gdr',coop:true,players:[{memberId:'m1',winner:false},{memberId:'m2',winner:false}]}
    ];
    DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>ps;DB.allTables=async()=>[];DB.hasPin=async()=>true;DB.legacyNames=async()=>[];
    DB.status='online';const R=DB.remote||{};R.user=async()=>({id:'u1'});R.isAdmin=async()=>true;R.client=null;DB.remote=R;
    if(typeof RC!=='undefined'){RC.data=RC.norm(RC.seed());RC.ready=true;RC.data.assegnate=[{member_id:'m1',ricompensa_id:'tester'}]}
  });
  const catan=await p.evaluate(async()=>{const gs=await DB.games(),ps=await DB.plays();await gamePage(gs[0],ps);const card=[...document.querySelectorAll('.gpg .card')].find(c=>/Record/.test(c.textContent||''));
    const row=[...card.querySelectorAll('.rec')].find(r=>/Più vittorie/.test(r.textContent||''));
    return{card:card?card.innerText:'',row:row?row.innerText:''}});
  chk(/Più vittorie/.test(catan.row)&&/Anna/.test(catan.row)&&/2/.test(catan.row)&&!/Bruno/.test(catan.row),'scheda Catan: Più vittorie = Anna con 2, non Bruno');

  const azul=await p.evaluate(async()=>{document.querySelectorAll('.gpg').forEach(x=>x.remove());
    const gs=await DB.games(),ps=await DB.plays();await gamePage(gs[1],ps);
    const card=[...document.querySelectorAll('.gpg .card')].find(c=>/Record/.test(c.textContent||''));
    return card?card.innerText:''});
  chk(!/Più vittorie/.test(azul),'scheda Azul: niente Più vittorie sotto le 2 vittorie');

  const gdr=await p.evaluate(async()=>{document.querySelectorAll('.gpg').forEach(x=>x.remove());
    const gs=await DB.games(),ps=await DB.plays();await gamePage(gs[2],ps);
    const card=[...document.querySelectorAll('.gpg .card')].find(c=>/Record/.test(c.textContent||''));
    return card?card.innerText:''});
  chk(!/Più vittorie/.test(gdr),'scheda GDR: niente Più vittorie');

  await p.evaluate(()=>{document.querySelectorAll('.gpg').forEach(x=>x.remove());go('altro')});
  await W(800);
  const gest=await p.evaluate(()=>{
    const r=[...document.querySelectorAll('#allist .alr b, #adm button, button')].map(x=>x.textContent);
    return{hasRc:r.some(x=>/Ricompense/.test(x||'')),filtro:!!document.querySelector('select.alfilt'),opts:document.querySelector('select.alfilt')? [...document.querySelector('select.alfilt').options].map(o=>o.text):[]};
  });
  chk(gest.hasRc,'Gestione: voce Ricompense');
  // il filtro compare nella tab Soci, che può essere già aperta
  if(!gest.filtro){
    await p.evaluate(()=>{const b=[...document.querySelectorAll('#allist .alr')].find(x=>/Soci/.test(x.textContent||''));if(b)b.click()});
    await W(400);
  }
  const gest2=await p.evaluate(()=>{
    const s=document.querySelector('select.alfilt');
    return{ok:!!s&&[...s.options].some(o=>o.value==='sospesi'||o.text==='Sospesi')};
  });
  chk(gest2.ok,'Gestione Soci: filtro Sospesi');

  await ctx.close();await b.close();
  console.log(`v41.16 pw: ${ok}/${n} ok`);
  if(ok!==n)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
