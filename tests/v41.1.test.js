// node tests/v41.1.test.js — v41.1 A2: moduli configurabili (Coppa, Sfida, Libri), niente «ludoteca», colori da variabili
const pw=require('playwright-core'),fs=require('fs');let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});let allErrs=[];
const mk=async(role,rows)=>{const p=await (await b.newContext({serviceWorkers:'block',viewport:{width:460,height:1000},locale:'it-IT'})).newPage();p.on('pageerror',e=>allErrs.push(e.message));
 await p.route(/supabase|jsdelivr/,r=>r.abort());await p.goto('http://localhost:8799/');await p.waitForTimeout(1500);
 await p.evaluate(([role,rows])=>{document.body.classList.remove('gate');localStorage.clear();if(role==='staff'){admin=true;localStorage.setItem('pergioco-mode','admin')}
  window.UPS=[];window.CP_CLIENT={from:t=>({select:()=>({eq:(k,v)=>({maybeSingle:async()=>({data:rows[v]?{value:rows[v]}:null,error:null})})}),upsert:async x=>{UPS.push(x);return{error:null}}}),rpc:async()=>({data:null,error:null})};
  DB.games=async()=>[];DB.members=async()=>[];DB.plays=async()=>[];DB.allTables=async()=>[];DB.legacyNames=async()=>[];DB.hasPin=async()=>true;DB.status='online';BRAND.loaded=false;MOD.loaded=false},[role,rows]);
 return p};
// default
let p=await mk('staff',{});await p.evaluate(()=>MOD.load(true));
let r=await p.evaluate(()=>({on:['coppa','sfida','libri'].map(k=>MOD.on(k)),c:MOD.nome('coppa'),s:MOD.nome('sfida'),bad:BADGES.find(b=>b[0]==='cpart')[3]}));
chk(r.on.every(Boolean)&&r.c==='Coppa Antero'&&r.s==='Sfida di Antero'&&/Coppa Antero/.test(r.bad),'default: tutto acceso con i nomi attuali');
await p.evaluate(()=>go('altro'));await p.waitForTimeout(800);r=await p.evaluate(()=>document.getElementById('aant')?.textContent);chk(r==='⚖️ Sfida di Antero','pulsante Sfida col nome di default');
// rinominati + spenti
const ROWS={moduli:{coppa:{attivo:true,nome:'Trofeo Prova',desc:'x'},sfida:{attivo:false,nome:'Sfida Prova'},libri:{attivo:false}}};
p=await mk('staff',ROWS);await p.evaluate(()=>MOD.load(true));await p.evaluate(()=>go('altro'));await p.waitForTimeout(800);
r=await p.evaluate(()=>({aant:!!document.getElementById('aant'),alib:!!document.getElementById('alib'),bad:BADGES.filter(b=>/^c(part|pod|camp)$/.test(b[0])).map(b=>b[3]).join('|'),xs:XP_SRC.filter(x=>/^coppa/.test(x[0])).map(x=>x[1]).join('|'),es:ERR_SCHERMI.coppa[0]}));
chk(!r.aant,'Sfida spenta: pulsante nascosto');chk(!r.alib,'Libri spenti: pulsante nascosto');chk(/Trofeo Prova/.test(r.bad)&&!/Antero/.test(r.bad),'badge col nome nuovo');chk(/Trofeo Prova/.test(r.xs)&&!/Antero/.test(r.xs),'fonti XP col nome nuovo');chk(r.es==='Trofeo Prova','nome schermata errori');
await p.evaluate(()=>{window._ant=0;const o=document.body.children.length;openAntero();window._ant=document.body.children.length-o});chk(await p.evaluate(()=>window._ant===0),'openAntero non apre se spenta');
await p.evaluate(()=>go('libri'));await p.waitForTimeout(600);chk(await p.evaluate(()=>window._cur!=='libri'),'Libri spenti: vista non raggiungibile');
// coppa spenta
p=await mk('staff',{moduli:{coppa:{attivo:false,nome:'Trofeo Prova'},sfida:{attivo:true,nome:'Sfida Prova'},libri:{attivo:true}}});await p.evaluate(()=>MOD.load(true));
r=await p.evaluate(async()=>{CP.camp='m1';const c=await badgeCtx();return{camp:cpCamp('m1'),lv:lv('m1'),list:(()=>{try{return Badges.list('m:m1',c).map(b=>b.id)}catch(e){return 'ERR '+e.message}})()}});
chk(!r.camp&&!/👑/.test(r.lv),'Coppa spenta: niente corona');chk(Array.isArray(r.list)&&!r.list.some(id=>/^c(part|pod|camp|imb|gig|rim|vet)$/.test(id))&&r.list.length>5,'Coppa spenta: badge della Coppa nascosti '+String(r.list).slice(0,60));
await p.evaluate(()=>{window._cpId='x';go('coppa')});await p.waitForTimeout(800);chk(await p.evaluate(()=>window._cur!=='coppa'||!/Trofeo/.test(V.innerHTML)),'Coppa spenta: vista non raggiungibile');
await p.evaluate(()=>go('altro'));await p.waitForTimeout(600);chk(await p.evaluate(()=>document.getElementById('aant')?.textContent==='⚖️ Sfida Prova'),'Sfida rinominata');
// XSS / valori non validi
r=await p.evaluate(()=>MOD.norm({coppa:{attivo:true,nome:'<img src=x onerror=window.XSS=1>'},sfida:{attivo:'si'}}));chk(r.coppa.nome==='Coppa Antero'&&r.sfida.attivo===true,'norm scarta nomi con < > e tipi errati');
// Configurazione
p=await mk('staff',{});await p.evaluate(()=>go('config'));await p.waitForTimeout(1000);
r=await p.evaluate(()=>({c:['coppa','sfida','libri'].map(k=>!!document.getElementById('cm-'+k)&&document.getElementById('cm-'+k).checked),nm:$('#cm-coppa-nome').value}));
chk(r.c.every(Boolean)&&r.nm==='Coppa Antero','Configurazione: interruttori accesi e nomi');
await p.click('#cm-sfida');chk(await p.evaluate(()=>$('#cmf-sfida').hidden),'spegnere nasconde i campi del modulo');
await p.fill('#cm-coppa-nome','X');await p.click('#cfsave');await p.waitForTimeout(400);chk(await p.evaluate(()=>UPS.length===0),'nome troppo corto: nessun salvataggio');
await p.fill('#cm-coppa-nome','<b>Trofeo</b>');await p.click('#cfsave');await p.waitForTimeout(400);chk(await p.evaluate(()=>UPS.length===0),'nome con < >: nessun salvataggio');
await p.fill('#cm-coppa-nome','Trofeo Prova');await p.click('#cm-libri');await p.click('#cfsave');await p.waitForTimeout(600);
r=await p.evaluate(()=>UPS.find(x=>x.key==='moduli'));chk(r&&r.value.coppa.nome==='Trofeo Prova'&&r.value.sfida.attivo===false&&r.value.libri.attivo===false&&r.value.coppa.attivo===true,'upsert moduli');
p=await mk('socio',{});await p.evaluate(()=>go('config'));await p.waitForTimeout(500);chk(!await p.evaluate(()=>!!document.getElementById('cm-coppa')),'socio: niente moduli');
// sorgenti
const rd=f=>fs.readFileSync(f,'utf8'),JS=fs.readdirSync('.').filter(f=>/\.js$/.test(f)&&f!=='sw.js');
const vis=JS.map(rd).join('\n').replace(/^\s*\/\/.*$/gm,'');
// i default (BADGES, XP_SRC, ERR_*) vengono sostituiti a runtime da MOD.apply (verificato sopra)
const visUI=vis.split('\n').filter(l=>!/MOD_DEF=|BADGES\.push|^\s*\['c(camp|imb)|XP_SRC=|ERR_AREE=|PARTITA:'partita'|altro:\['Gestione'|replace\(\/Coppa Antero|MOD\.nome\('coppa'\):'Coppa Antero'/.test(l)).join('\n');
chk(!/Coppa Antero|Coppe Antero|Sfida di Antero|Prescelti di Antero/.test(visUI),'niente nomi fissi dei moduli nell’UI');
const lud=[...vis.matchAll(/[^\n]{0,30}ludoteca[^\n]{0,10}/gi)].map(m=>m[0]).filter(s=>!/views\.ludoteca|'ludoteca'|ludoteca\(\)|#ludoteca|ludoteca:\[|ludoteca#|"ludoteca"/.test(s));chk(!lud.length,'niente «ludoteca» nei testi: '+lud.join(' | '));
chk(!/\bclub\b/i.test(vis+rd('index.html')),'mai «club»');
chk(!/#14254a/i.test(rd('app.js')+rd('stats.js')+rd('wrapped.js')),'niente #14254a fisso');
const sw=rd('sw.js'),idx=rd('index.html');chk(/const C='pergioco-v41\.[1-7]'/.test(sw)&&!/v=41\.0/.test(sw+idx)&&/APP_VERSION='41\.[1-7]'/.test(rd('brand.js')),'versione 41.1');
const sql=rd('supabase/migrate-v41.1.sql');chk(/moduli_valid/.test(sql)&&/revoke all on function public\.mod_nome/i.test(sql)&&!/drop table|delete from/i.test(sql),'SQL additiva');
chk(!allErrs.length,'nessun errore JS '+allErrs.join('|'));
console.log(`v41.1: ${ok}/${n}`);await b.close();process.exit(ok===n?0:1)})();
