// node tests/v41.9-import-bgg.test.js — v41.9 Import BGG (CSV client-side, solo admin)
const pw=require('playwright-core'),fs=require('fs');const{setup}=require('./screenshots-profilo.js');
const csv=fs.readFileSync(__dirname+'/fixtures/bgg-collection-sample.csv','utf8');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 {const p=await setup(b,'staff',900);
  await p.evaluate(()=>{DB.remote.isAdmin=async()=>true;DB.remote.modCached=false;admin=true});
  const r=await p.evaluate(c=>{const rows=IBGG.rowsFromCsv(c);return{n:rows.length,ids:rows.map(x=>x.bggId),names:rows.map(x=>x.name),exp:rows.filter(x=>x.isExp).map(x=>x.bggId),xss:rows.find(x=>x.bggId===999001)}},csv);
  chk(r.n===9&&r.ids.includes(13)&&r.ids.includes(478),'CSV: 9 giochi con ID');
  chk(r.exp[0]===478&&r.names.every(nm=>!/<b>/.test(nm))&&r.xss.name==='XSS Game','espansione + XSS come testo');
  chk(await p.evaluate(()=>IBGG.MAXB===2*1024*1024&&IBGG.MAXR===2000&&IBGG.MAXI===500),'limiti 2MB / 2000 / 500');
  await p.context().close()}
 {const p=await setup(b,'staff',900);const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.evaluate(async()=>{DB.remote.isAdmin=async()=>true;DB.remote.modCached=false;admin=true;drawModeBtn();
   const gs=await DB.games();if(gs[0])gs[0].bggId=266192; const bag={gs};
   DB.games=async()=>bag.gs; const _add=DB.addGame.bind(DB);
   DB.addGame=async g=>{const ng=await _add(g);bag.gs=[...bag.gs,ng];return ng}; go('altro')});await W(1500);
  chk(await p.evaluate(()=>!!document.querySelector('[data-alb="ibgg"]')),'riga in Gestione (admin)');
  await p.evaluate(()=>go('importbgg'));await W(800);
  chk(await p.evaluate(()=>/Importa da (BoardGameGeek|BGG e RPGGeek)/.test(document.querySelector('h2').textContent)&&!document.querySelector('.ibggsoon')&&!!document.querySelector('.ibggpwr img')),'scelta: utente attivo + logo');
  await p.evaluate(()=>{const r=[...document.querySelectorAll('.alr')].find(x=>/Carica un file/.test(x.textContent));r&&r.click()});await W(400);
  await p.evaluate(async c=>{const f=new File([c],'bgg-collection-sample.csv',{type:'text/csv'});const dt=new DataTransfer();dt.items.add(f);const inp=document.querySelector('.ibggfile');inp.files=dt.files;inp.dispatchEvent(new Event('change',{bubbles:true}))},csv);await W(1500);
  const prev=await p.evaluate(()=>({h2:document.querySelector('h2').textContent,sum:[...document.querySelectorAll('#view p')].map(p=>p.textContent).join(' | '),sel:document.querySelectorAll('.ibggck.on').length,tags:[...document.querySelectorAll('.ibggtag')].map(t=>t.textContent),filt:[...document.querySelectorAll('#view select option')].map(o=>o.textContent).join('|')}));
  chk(/Anteprima/.test(prev.h2),'anteprima aperta');
  chk(prev.tags.includes('nuovo')&&prev.tags.includes('già presente')&&prev.tags.includes('espansione'),'tag nuovo/già presente/espansione');
  chk(/Mostra: Tutto/.test(prev.filt),'filtro con Tutto');
  chk(await p.evaluate(()=>{const on=[...document.querySelectorAll('.ibggrow')].filter(r=>r.querySelector('.ibggck.on'));return on.length>0&&on.every(r=>r.querySelector('.ibggtag.new'))&&!on.some(r=>/Wingspan|Cities/.test(r.textContent))}),'default: solo nuovi');
  await p.evaluate(()=>document.querySelector('.ibggrow').click());await W(400);
  chk(await p.evaluate(()=>!!document.querySelector('.ibgggrid')),'dettaglio con ▸');
  await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Torna/.test(x.textContent));b&&b.click()});await W(400);
  const before=await p.evaluate(async()=>(await DB.games()).length);
  await p.evaluate(()=>document.querySelector('button.p').click());await W(2500);
  const after=await p.evaluate(async()=>({n:(await DB.games()).length,h2:document.querySelector('h2').textContent,body:document.getElementById('view').textContent}));
  chk(/Import completato/.test(after.h2)&&after.n>before,'esito e giochi aggiunti '+before+'→'+after.n);
  chk(/boardgamegeek\.com/i.test(after.body)||await p.evaluate(()=>!!document.querySelector('.ibggpwr img')),'logo Powered by BGG presente');
  chk(errs.length===0,'admin: nessun errore JS '+errs.join('|'));await p.context().close()}
 {const p=await setup(b,'staff',900);
  await p.evaluate(()=>{DB.remote.isAdmin=async()=>false;DB.remote.modCached=true;admin=true;drawModeBtn();go('altro')});await W(1500);
  chk(await p.evaluate(()=>!document.querySelector('[data-alb="ibgg"]')),'moderatore: niente riga Import');
  await p.evaluate(()=>go('importbgg'));await W(800);
  chk(await p.evaluate(()=>!document.querySelector('.ibggfile')),'moderatore bloccato');await p.context().close()}
 {const p=await setup(b,'staff',900);
  await p.evaluate(()=>{DB.remote.isAdmin=async()=>true;DB.remote.modCached=false;admin=true;go('importbgg')});await W(600);
  await p.evaluate(()=>{const r=[...document.querySelectorAll('.alr')].find(x=>/Carica un file/.test(x.textContent));r&&r.click()});await W(300);
  await p.evaluate(()=>{const f=new File(['PK'],'coli.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const dt=new DataTransfer();dt.items.add(f);const inp=document.querySelector('.ibggfile');inp.files=dt.files;inp.dispatchEvent(new Event('change',{bubbles:true}))});
  await W(500);chk(await p.evaluate(()=>[...document.querySelectorAll('.toast')].some(e=>/CSV|Excel|xlsx/i.test(e.textContent))),'xlsx non valido: messaggio di errore');await p.context().close()}
 const h=fs.readFileSync(__dirname+'/../index.html','utf8'),sw=fs.readFileSync(__dirname+'/../sw.js','utf8'),js=fs.readFileSync(__dirname+'/../import-bgg.js','utf8'),mig=fs.readFileSync(__dirname+'/../supabase/migrate-v41.9.sql','utf8');
 const {APP_VERSION,swCache,hasAsset}=require('./appver');chk(!!APP_VERSION&&swCache()&&hasAsset('import-bgg.js'),'APP_VERSION dal codice + import-bgg in cache');
 chk(!/innerHTML|insertAdjacentHTML/.test(js),'import-bgg.js: solo textContent');
 chk(/games_import_bgg/.test(mig)&&/is_admin/.test(mig)&&/ibgg_titolo/.test(mig)&&/revoke all on function public.games_import_bgg/.test(mig),'migrazione RPC + testi');
 chk(fs.existsSync(__dirname+'/../supabase/functions/bgg-collection/index.ts')&&/is_admin/.test(fs.readFileSync(__dirname+'/../supabase/functions/bgg-collection/index.ts','utf8')),'Edge Function collection admin-only');
 chk(fs.existsSync(__dirname+'/fixtures/bgg-collection-sample.csv'),'CSV di esempio');
 await b.close();console.log(`${ok}/${n}`);process.exit(ok===n?0:1)})();
