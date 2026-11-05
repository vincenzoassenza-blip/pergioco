// node tests/v41.7-header.test.js — v41.7: barra in alto, variante A (gradiente e filo dalla config, logo, nome + motto, iniziali → Profilo)
const pw=require('playwright-core'),fs=require('fs');const {hdr}=require('./screenshots-header.js');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 {const p=await hdr(b,'socio',900);const errs=[];p.on('pageerror',e=>errs.push(e.message));const q=f=>p.evaluate(f);
  const st=await q(()=>{const h=getComputedStyle(document.querySelector('header'));return{bg:h.backgroundImage,bb:h.borderBottomColor,bw:h.borderBottomWidth}});
  chk(/linear-gradient\(100deg, rgb\(15, 28, 61\) 0%, rgb\(31, 61, 122\) 100%\)/.test(st.bg),'gradiente #0f1c3d → #1f3d7a '+st.bg);
  chk(st.bb==='rgb(255, 215, 106)'&&st.bw==='3px','filo giallo #ffd76a');
  chk(await q(()=>{const i=document.querySelector('header img.hlogo');return i&&i.getAttribute('src')==='img/logo-barra.svg'&&i.complete&&i.naturalWidth>0&&!getComputedStyle(i).borderRadius.startsWith('5')}),'dado bianco predefinito, senza cerchio');
  chk(await q(()=>{const b=document.querySelector('header .brand'),s=document.querySelector('header .sub');return b.textContent===BRAND.v.nome&&+getComputedStyle(b).fontWeight>=700&&s.textContent===BRAND.v.motto&&parseFloat(getComputedStyle(s).fontSize)<14}),'nome in grassetto e motto piccolo dalla config');
  chk(await q(()=>{const a=document.getElementById('avbtn');return a&&!a.hidden&&a.textContent==='VA'&&a.getAttribute('aria-label')}),'iniziali del socio');
  chk(await q(()=>getComputedStyle(document.getElementById('outbtn')).display==='none'),'Esci non è più nella barra');
  chk(await q(()=>!!document.querySelector('.alacc .alsub')),'Esci in Altro › Il mio account');
  await p.click('#avbtn');await W(1200);chk(await q(()=>location.hash.startsWith('#profilo')&&!window._pv&&!!document.querySelector('.card.prof')),'le iniziali aprono il proprio Profilo');
  // config: un'altra associazione cambia colori, logo, nome e motto (XSS come testo)
  await q(()=>{BRAND.v=BRAND.norm({nome:'<b>Ass</b> X',motto:'Motto <i>y</i>',logo_barra:'data:image/png;base64,iVBORw0KGgo=',colori:{primario:'#14254a',secondario:'#2a4785',accento:'#f2b134',sfondo:'#f4f6fb',barra1:'#112233',barra2:'#445566',filo:'#abcdef'}});BRAND.apply()});
  const s2=await q(()=>{const h=getComputedStyle(document.querySelector('header'));return{bg:h.backgroundImage,bb:h.borderBottomColor,src:document.querySelector('header img.hlogo').getAttribute('src'),b:document.querySelector('header .brand').innerHTML,s:document.querySelector('header .sub').textContent}});
  chk(/rgb\(17, 34, 51\).*rgb\(68, 85, 102\)/.test(s2.bg)&&s2.bb==='rgb(171, 205, 239)','colori della barra dalla config');
  chk(s2.src.startsWith('data:image/png')&&s2.b==='&lt;b&gt;Ass&lt;/b&gt; X'&&s2.s==='Motto <i>y</i>','logo e testi dalla config, escaping');
  await q(()=>{BRAND.v=BRAND.norm({logo_barra:'javascript:alert(1)',colori:{barra1:'red;}'}});BRAND.apply()});
  chk(await q(()=>document.querySelector('header img.hlogo').getAttribute('src')==='img/logo-barra.svg'&&BRAND.v.colori.barra1==='#0f1c3d'),'valori non validi → predefiniti');
  chk(await q(()=>JSON.stringify([BRAND_DEF.colori.barra1,BRAND_DEF.colori.barra2,BRAND_DEF.colori.filo])==='["#0f1c3d","#1f3d7a","#ffd76a"]'),'predefiniti identici al mockup');
  chk(await q(()=>BRAND.errors(BRAND.norm({})).length===0),'config predefinita valida');
  chk(errs.length===0,'socio: nessun errore JS '+errs.join('|'));await p.context().close()}
 {const p=await hdr(b,'anon',900);const errs=[];p.on('pageerror',e=>errs.push(e.message));const q=f=>p.evaluate(f);await q(()=>drawOutBtn());await W(400);
  chk(await q(()=>{const a=document.getElementById('avbtn');return !a||a.hidden}),'non collegato: niente iniziali');
  chk(await q(()=>!!document.querySelector('header img.hlogo')&&document.querySelector('header .brand').textContent==='PerGioco'),'non collegato: logo e nome');
  chk(errs.length===0,'anon: nessun errore JS '+errs.join('|'));await p.context().close()}
 {const p=await hdr(b,'staff',900);const errs=[];p.on('pageerror',e=>errs.push(e.message));const q=f=>p.evaluate(f);
  chk(await q(()=>!document.getElementById('modebtn').hidden&&!document.getElementById('avbtn').hidden),'staff: modalità + iniziali');
  chk(await q(()=>{const r=document.querySelector('header .brand').getBoundingClientRect(),m=document.getElementById('modebtn').getBoundingClientRect();return r.right<=m.left+1||document.querySelector('header .brand').scrollWidth>=0&&parseFloat(getComputedStyle(document.querySelector('header .brand')).paddingRight)>=180}),'staff: il nome non finisce sotto i pulsanti');
  chk(await q(()=>{const a=document.querySelector('.alaccs');return a&&!a.hidden&&a.querySelector('.alacc .alsub')}),'staff: Esci in Gestione › Il mio account');
  await q(()=>go('config'));await W(1500);chk(await q(()=>['barra1','barra2','filo'].every(k=>document.getElementById('cfc-'+k))),'config: i 3 colori della barra');
  chk(errs.length===0,'staff: nessun errore JS '+errs.join('|'));await p.context().close()}
 const h=fs.readFileSync(__dirname+'/../index.html','utf8'),sw=fs.readFileSync(__dirname+'/../sw.js','utf8'),js=fs.readFileSync(__dirname+'/../header.js','utf8'),css=fs.readFileSync(__dirname+'/../styles.css','utf8'),mf=fs.readFileSync(__dirname+'/../manifest.json','utf8');
 chk(/altro\.js\?v=41\.6"><\/script><script src="header\.js\?v=41\.7"><\/script>/.test(h)&&/pergioco-v41\.[78]/.test(sw)&&sw.includes('header.js?v=41.7')&&sw.includes('img/logo-barra.svg')&&/styles\.css\?v=41\.[78]/.test(h)&&/APP_VERSION='41\.[78](\.\d)?'/.test(fs.readFileSync(__dirname+'/../brand.js','utf8')),'versione 41.7, header.js ultimo');
 chk(!/innerHTML|insertAdjacentHTML|outerHTML/.test(js)&&!/club|ludoteca/i.test(js),'header.js: solo textContent, nessun «club»');
 const blk=css.slice(css.indexOf('/* v41.7 — Barra'));chk(blk.length>100&&!/#[0-9a-f]{3,6}\b/i.test(blk.replace(/#(outbtn|hback|modebtn|avbtn)\b/g,'')),'CSS v41.7 solo variabili');
 chk(/name="theme-color"/.test(h)&&!/barra|hd1/.test(mf),'manifest e theme-color non toccati');
 chk(fs.existsSync(__dirname+'/../supabase/migrate-v41.7.sql'),'migrazione CHECK pronta');
 await b.close();console.log(`${ok}/${n}`);process.exit(ok===n?0:1)})();
