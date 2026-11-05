// node tests/v41.8.1-noflash.test.js — il layout vecchio non deve mai essere visibile (Record, Profilo, Community, Altro, Partita, Giochi, Agenda)
const pw=require('playwright-core');const{setup}=require('./screenshots-classifica.js');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 for(const role of['socio','staff']){const p=await setup(b,role,1200);const errs=[];p.on('pageerror',e=>errs.push(e.message));
  for(const v of['record','profilo','giocatori','altro','nuova','ludoteca','serata','record']){
   await p.evaluate(v=>{const sig=()=>[...V.children].map(c=>c.tagName+'.'+c.className+(c.hidden?'#h':'')).join('|');window._fr=[];window._start=sig();window._run=true;
    const tick=()=>{if(!window._run)return;const vis=!V.classList.contains('vprep')&&getComputedStyle(V).opacity!=='0';window._fr.push({vis,s:sig()});requestAnimationFrame(tick)};requestAnimationFrame(tick);window._pv=null;go(v)},v);
   await p.waitForTimeout(2500);
   const r=await p.evaluate(()=>{window._run=false;const fin=[...V.children].map(c=>c.tagName+'.'+c.className+(c.hidden?'#h':'')).join('|');const bad=window._fr.filter(f=>f.vis&&f.s!==fin&&f.s!==window._start);return{bad:bad.length,frames:window._fr.length,ex:bad[0]&&bad[0].s.slice(0,160),fin:fin.slice(0,80)}});
   chk(r.bad===0&&r.frames>20,`${role} ${v}: nessun frame col layout vecchio (${r.bad}/${r.frames}) ${r.ex||''}`)}
  chk(errs.length===0,role+': nessun errore JS '+errs.join('|'));await p.context().close()}
 const fs=require('fs'),js=fs.readFileSync(__dirname+'/../noflash.js','utf8'),h=fs.readFileSync(__dirname+'/../index.html','utf8');
 chk(/noflash\.js\?v=41\.8\.1"><\/script><\/body>/.test(h)&&!/innerHTML/.test(js),'noflash.js caricato per ultimo, niente innerHTML');
 await b.close();console.log(`${ok}/${n}`);process.exit(ok===n?0:1)})();
