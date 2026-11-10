// node tests/v41.14-config.test.js — Configurazione v41.14 a 412px + stessi app_settings di v41.13.3 (porte 8837/8838)
const pw=require('playwright-core'),fs=require('fs'),path=require('path'),http=require('http');
const NEW=path.join(__dirname,'..'),OLD=process.env.OLD_ROOT||'/tmp/pergioco-main-v41133';
const OUT='/workspace/pergioco-mockups/ux/configurazione-v2';fs.mkdirSync(OUT,{recursive:true});
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const T={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const serve=(root,port)=>new Promise(r=>{const s=http.createServer((q,res)=>{let p=decodeURIComponent((q.url||'/').split('?')[0]);if(p==='/')p='/index.html';fs.readFile(path.join(root,p),(e,b)=>{if(e){res.writeHead(404);res.end();return}res.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});res.end(b)})});s.listen(port,'127.0.0.1',()=>r(s))});
// valori di prova (non i dati reali): stessi per vecchia e nuova versione
const SET={brand:{nome:'PerGioco',motto:'Gioca, prenota, condividi',citta:'Ragusa',instagram:'pergiocoets',email:'info@pergioco.org',logo:'',logo_barra:'',colori:{primario:'#14254a',secondario:'#2a4785',accento:'#f2b134',sfondo:'#f4f6fb',barra1:'#0f1c3d',barra2:'#1f3d7a',filo:'#ffd76a'}},
 moduli:{coppa:{attivo:true,nome:'Coppa Antero',desc:"Torneo svizzero dell'associazione"},sfida:{attivo:false,nome:'Sfida di Antero',desc:'Torneo tra meccaniche (staff)'},libri:{attivo:true}},
 testi:{coppa_breve:'Coppa',tt_pieno:'Tavolo al completo per stasera'}};
const TYPES=[{id:'board',nome:'Gioco da tavolo',icona:'🎲',sort:10,attivo:true,capacity_default:5,kind:'board'},{id:'gdr',nome:'GDR',icona:'🐉',sort:20,attivo:true,capacity_default:2,kind:'gdr'}];
const seed=(p)=>p.evaluate(({SET,TYPES})=>{document.body.classList.remove('gate');localStorage.clear();admin=true;localStorage.setItem('pergioco-mode','admin');
 const ms=[{id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1',avatar:'🦊',color:'#455a64'}];
 DB.games=async()=>[];DB.members=async()=>ms;DB.plays=async()=>[];DB.allTables=async()=>[];DB.hasPin=async()=>true;DB.legacyNames=async()=>[];DB.status='online';
 window.__up=[];const R=DB.remote||{};R.user=async()=>({id:'u1',email:'v@x.it'});R.isAdmin=async()=>true;R.modCached=false;R.adminCached=true;
 R.client={from(t){if(t==='table_types')return{select:()=>({order:async()=>({data:TYPES,error:null})})};
   return{select:()=>({eq:(k,v)=>({maybeSingle:async()=>({data:SET[v]!==undefined?{value:JSON.parse(JSON.stringify(SET[v]))}:null,error:null})}),order:async()=>({data:[],error:null})}),
    upsert:async(row)=>{window.__up.push(JSON.parse(JSON.stringify(row)));return{error:null}}}},rpc:async()=>({data:null,error:null})};
 DB.remote=R;window.isMod=()=>false;if(window.TT){TT.loaded=false;TT.types=TYPES.slice()}if(typeof drawModeBtn==='function')drawModeBtn()},{SET,TYPES});
const setv=(p,id,v)=>p.evaluate(([id,v])=>{const i=document.getElementById(id);i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))},[id,v]);
(async()=>{const sN=await serve(NEW,8837),sO=await serve(OLD,8838);
 const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const open=async port=>{const c=await b.newContext({serviceWorkers:'block',viewport:{width:412,height:915},deviceScaleFactor:2,locale:'it-IT',timezoneId:'Europe/Rome'});const p=await c.newPage();
  p.on('pageerror',e=>console.error('pageerror',e.message));await p.route(/supabase\.co|jsdelivr/,r=>r.abort());await p.goto(`http://127.0.0.1:${port}/`);await W(700);await seed(p);
  await p.evaluate(async()=>{if(window.TT&&TT.load)try{await TT.load()}catch(e){}if(window.HD417)await HD417.av();go('config')});await W(900);await p.evaluate(()=>document.querySelectorAll('.toast').forEach(t=>t.remove()));return{c,p}};
 const saveRun=async(port,edit)=>{const{c,p}=await open(port);if(edit){await setv(p,'cf-motto','Gioca e condividi');await setv(p,'ct-coppa_breve','Trofeo');await p.evaluate(()=>{const x=document.getElementById('cm-sfida');x.checked=true;x.dispatchEvent(new Event('change',{bubbles:true}))})}
  await p.evaluate(()=>document.getElementById('cfsave').click());await W(600);const up=await p.evaluate(()=>window.__up);await c.close();return up};
 // A) stessi app_settings di prima
 for(const ed of [false,true]){const o=await saveRun(8838,ed),nw=await saveRun(8837,ed);chk(o.length>0&&JSON.stringify(o)===JSON.stringify(nw),`salvataggio ${ed?'con modifiche':'senza modifiche'}: stessi app_settings di v41.13.3 (${nw.map(x=>x.key).join(',')})`)}
 // B) indice e barra Salva
 {const{c,p}=await open(8837);
  const idx=await p.evaluate(()=>({g:[...document.querySelectorAll('#cfidx .cfgh')].map(x=>x.textContent),r:[...document.querySelectorAll('#cfidx .cfr')].map(x=>x.dataset.cfs),sub:document.querySelector('[data-cfs="assoc"] .sub').textContent,
   sec:[...document.querySelectorAll('.cfsec')].every(s=>s.hidden),bar:getComputedStyle(document.getElementById('cfsb')).position,n:document.getElementById('cfsbn').textContent,h:document.documentElement.scrollHeight,deco:[...document.querySelectorAll('#cfidx .cfr')].every(r=>getComputedStyle(r).textDecorationLine==='none')}));
  chk(idx.g.join('|')==='Identità|Funzioni|Testi','gruppi Identità, Funzioni, Testi');
  chk(idx.r.join(',')==='assoc,logo,colori,moduli,tipi,gdr,testi','righe dell\'indice, Tipi di tavolo in Funzioni');
  chk(idx.sub==='PerGioco · Ragusa · @pergiocoets','riassunto Associazione');chk(idx.sec,'all\'apertura solo l\'indice');chk(idx.deco,'righe senza sottolineatura');
  chk(idx.bar==='fixed'&&idx.n==='Nessuna modifica','barra Salva fissa: Nessuna modifica');chk(idx.h<1400,'pagina corta ('+idx.h+'px invece di ~7700)');
  const lay=await p.evaluate(()=>{const hit=(a,b)=>{const A=a.getBoundingClientRect(),B=b.getBoundingClientRect();return!(A.right<=B.left+.5||B.right<=A.left+.5||A.bottom<=B.top+.5||B.bottom<=A.top+.5)};const o=[];
   const rs=[...document.querySelectorAll('#cfidx .cfr')];for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++)if(hit(rs[i],rs[j]))o.push('righe');
   const s=document.getElementById('cfsave'),nn=document.getElementById('cfsbn');if(hit(s,nn))o.push('barra');rs.forEach(r=>{if(r.scrollWidth>r.clientWidth+1)o.push('overflow')});return o});
  chk(!lay.length,'412px: niente accavallamenti nell\'indice ('+(lay.join(',')||'ok')+')');
  await p.screenshot({path:path.join(OUT,'pubblicata-01-indice.png')});
  // modifiche contate + conferma all'uscita
  await p.click('[data-cfs="assoc"]');await W(150);chk(await p.evaluate(()=>!document.querySelector('[data-cfk="assoc"]').hidden&&document.getElementById('cfidx').hidden),'riga apre la sezione');
  await setv(p,'cf-motto','Altro motto');chk((await p.textContent('#cfsbn'))==='1 modifica','contatore: 1 modifica');
  await p.evaluate(()=>{go('record')});await W(300);chk(await p.$('.mdl'),'uscita con modifiche: chiede conferma');
  const cancel=await p.$('.mdl [data-k="0"]');if(cancel)await cancel.click();await W(300);chk(await p.evaluate(()=>!!document.getElementById('cfsave')),'annulla: resta in Configurazione');
  // 8 errore accanto al campo + Salva porta al primo errore
  await setv(p,'cf-nome','X');await p.click('[data-cfs]').catch(()=>{});await p.evaluate(()=>document.getElementById('cfbk').click());await W(100);
  await p.evaluate(()=>document.getElementById('cfsave').click());await W(300);
  const er=await p.evaluate(()=>{const i=document.getElementById('cf-nome'),e=i.nextElementSibling;return{inv:i.getAttribute('aria-invalid'),msg:e&&e.classList.contains('cfe')?e.textContent:'',vis:!i.closest('.cfsec').hidden,foc:document.activeElement===i,up:window.__up.length}});
  chk(er.inv==='true'&&/caratteri/.test(er.msg)&&er.vis&&er.foc&&er.up===0,'errore accanto al campo, Salva apre e mette a fuoco il primo errore, niente salvataggio');
  await setv(p,'cf-nome','PerGioco');chk(await p.evaluate(()=>!document.querySelector('#cfg2 .cfe')),'errore sparisce correggendo');
  // XSS: valori mostrati come testo
  await setv(p,'cf-citta','<img src=x onerror=window.__x=1>');await p.evaluate(()=>document.getElementById('cfbk').click());await W(100);
  chk(await p.evaluate(()=>!window.__x&&!document.querySelector('#cfidx img')&&document.querySelector('[data-cfs="assoc"] .sub').textContent.includes('<img')),'XSS: riassunto solo testo');
  await c.close()}
 // C) moduli, logo, GDR, testi
 {const{c,p}=await open(8837);
  await p.click('[data-cfs="moduli"]');await W(100);chk(await p.evaluate(()=>[...document.querySelectorAll('[data-cfk="moduli"] input[type=checkbox]')].every(i=>i.getAttribute('role')==='switch'&&getComputedStyle(i).appearance==='none')),'moduli con interruttore');
  chk(await p.evaluate(()=>!document.querySelector('#cfg2 label .kw')),'niente chip nelle etichette');
  await p.evaluate(()=>document.getElementById('cfbk').click());await p.click('[data-cfs="logo"]');await W(100);
  chk(await p.evaluate(()=>[...document.querySelectorAll('.cfpick')].length===2&&[...document.querySelectorAll('.cffile')].every(f=>f.getBoundingClientRect().width<=2)),'logo: «Scegli immagine», selettore nativo nascosto');
  await p.evaluate(()=>document.getElementById('cfbk').click());await p.click('[data-cfs="gdr"]');await W(100);
  const g=await p.evaluate(()=>{const d=[...document.querySelectorAll('#cfgdr details.cfd')];return{n:d.length,closed:d.every(x=>!x.open),sum:d[1]&&d[1].querySelector('summary').textContent}});
  chk(g.n===18&&g.closed&&/soglia 1/.test(g.sum),'GDR: 1 riga record + 17 badge compatti chiusi ('+g.sum+')');
  const gh=await p.evaluate(()=>document.documentElement.scrollHeight);chk(gh<2400,'GDR compatto ('+gh+'px)');
  await p.evaluate(()=>document.getElementById('cfbk').click());await p.click('[data-cfs="testi"]');await W(150);
  const t=await p.evaluate(()=>({g:[...document.querySelectorAll('#cftx select.cfsel')[0].options].map(o=>o.textContent)[0],m:[...document.querySelectorAll('#cftx select.cfsel')[1].options].map(o=>o.textContent),
   tot:document.querySelectorAll('#cftx .cftf').length,mod:[...document.querySelectorAll('#cftx .cftf')].filter(d=>d.dataset.mod==='1').map(d=>d.dataset.k)}));
  chk(t.g==='Gruppo: Tutto'&&t.m.join('|')==='Tutti i testi|Solo modificati','tendine «Gruppo: Tutto» e «Solo modificati»');
  chk(t.tot===Object.keys(await p.evaluate(()=>TXT_DEF)).length,'tutti i testi presenti ('+t.tot+')');chk(t.mod.join(',')==='tt_pieno','etichetta «modificato» sul testo cambiato');
  await p.selectOption('#cftx select.cfsel >> nth=1','mod');await W(100);chk(await p.evaluate(()=>[...document.querySelectorAll('#cftx .cftf')].filter(d=>!d.hidden).map(d=>d.dataset.k).join(','))==='tt_pieno','«Solo modificati» filtra');
  await p.selectOption('#cftx select.cfsel >> nth=1','');await p.fill('#cftx .cfq','coppa');await W(100);
  chk(await p.evaluate(()=>{const v=[...document.querySelectorAll('#cftx .cftf')].filter(d=>!d.hidden);return v.length>0&&v.length<15}),'ricerca per parola');
  await p.screenshot({path:path.join(OUT,'pubblicata-02-testi.png')});
  await p.fill('#cftx .cfq','');await p.evaluate(()=>{const d=document.querySelector('.cftf[data-k="tt_pieno"]');d.open=true;d.querySelector('.cforig').click()});
  chk(await p.evaluate(()=>document.getElementById('ct-tt_pieno').value===TXT_DEF.tt_pieno&&document.querySelector('.cftf[data-k="tt_pieno"]').dataset.mod==='0'),'«↺ Originale» ripristina il default');
  await c.close()}
 // D) Tipi di tavolo da Configurazione e ritorno
 {const{c,p}=await open(8837);await p.click('[data-cfs="tipi"]');await W(500);const bk=await p.evaluate(()=>[...document.querySelectorAll('.hrow button.s')].map(x=>x.textContent));
  chk(bk.includes('← Configurazione'),'Tipi di tavolo: ritorno «← Configurazione»');await p.evaluate(()=>[...document.querySelectorAll('.hrow button.s')].find(x=>x.textContent==='← Configurazione').click());await W(500);
  chk(await p.evaluate(()=>!!document.getElementById('cfidx')),'torna all\'indice');await c.close()}
 // E) socio / modalità utente: nessun accesso
 {const{c,p}=await open(8837);await p.evaluate(()=>{localStorage.setItem('pergioco-mode','user');go('config')});await W(500);chk(await p.evaluate(()=>!document.getElementById('cfsave')&&!document.getElementById('cfg2')),'modalità utente: Configurazione non disponibile');await c.close()}
 await b.close();sN.close();sO.close();console.log(ok+'/'+n+' controlli');if(ok!==n)process.exit(1)})().catch(e=>{console.error(e);process.exit(1)});
