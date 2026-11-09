// node tests/v41.1-identico.test.js — A3: con i testi predefiniti, quello che si vede è IDENTICO a main v41.0
// (stessi dati finti nelle due versioni: badge, fonti XP, errori, Wrapped HTML + immagine, Sfida, Coppa, Libri).
const pw=require('playwright-core'),fs=require('fs'),path=require('path'),http=require('http'),{execSync}=require('child_process');
const _ver=(fs.readFileSync(path.join(__dirname,'../brand.js'),'utf8').match(/APP_VERSION='([^']+)'/)||[])[1];
if(_ver!=='41.\d+'){console.log('SKIP v41.1-identico: APP_VERSION='+_ver+' (test specifico della v41.1)');process.exit(0)}
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
const MAIN='/tmp/pg-v410-main';fs.rmSync(MAIN,{recursive:true,force:true});fs.mkdirSync(MAIN);execSync(`git archive main | tar -x -C ${MAIN}`,{cwd:path.join(__dirname,'..')});
const T={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';fs.readFile(path.join(MAIN,p),(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(b)})}).listen(8797);
// differenze VOLUTE della v41.1 (A2, già approvate): normalizzate prima del confronto
const A2=s=>s.replace(/arriva in ludoteca/g,"arriva nella collezione dell'associazione").replace(/della Ludoteca/g,'della Collezione').replace(/ludoteca/g,'collezione').replace(/La Sfida di Antero/g,'Sfida di Antero').replace(/Campione della Coppa Antero/g,'Campione · Coppa Antero').replace(/Coppa non trovata/g,'Torneo non trovato').replace(/Più Coppe Antero vinte/g,'Più vittorie · Coppa Antero').replace(/Albo d'oro della Sfida/g,"Albo d'oro · Sfida di Antero");
const FP=async()=>{const out={},R=Math.random;Math.random=()=>0.42;const sv=[];const fl=[];
 const P=CanvasRenderingContext2D.prototype,_f=P.fillText;P.fillText=function(t,...a){fl.push(String(t));return _f.call(this,t,...a)};
 out.badges=BADGES.map(b=>b.slice(0,4));out.xp=XP_SRC.map(x=>x.slice(0,3));
 out.err=[ERR_AREE.COPPA,Object.entries(ERR_AZIONI).filter(([k,a])=>a[0]==='COPPA').map(([k,a])=>[k,a[1],a[2]]),ERR_SCHERMI.coppa,errSpiega(new Error('QuotaExceededError: quota'),'APP')];
 const W=WR;const tit=[{pct:60,n:10},{nuovi:12,n:20,topG:[{nome:'Catan',n:3}]},{topG:[{nome:'Catan',n:30}],n:31},{coop:10,n:12},{tardi:8,n:9},{n:5}];
 out.titoli=tit.map(d=>{try{return W.titolo(d)}catch(e){return 'ERR'}});
 try{const d=await W.socio('m1',2026);out.ws=W.storieSocio(d);const a=W.storieAssoc(await W.assoc(2026));out.wa=a;
  W.apri(out.ws,'Wrapped',false);const ov=document.body.lastElementChild;out.wrhtml=ov.innerHTML;ov.remove();
  for(const [i,s] of [...out.ws,...a].entries()){try{await W.png(s,i,i>=out.ws.length)}catch(e){fl.push('ERRPNG')}}}catch(e){out.wserr=String(e)}
 out.canvas=fl.slice();fl.length=0;
 try{ANTDB.R=()=>null;await openAntero();const o=document.body.lastElementChild;out.ant=o.innerHTML;o.remove()}catch(e){out.anterr=String(e)}
 try{CP.cl=()=>({});CP.d={staff:true,coppe:[]};out.cpvuota=await cpCard();
  for(const c of [{id:'c1',edizione:2,stato:'concluso',campione:'m1',turni:3,turno:3,formato:'tavoli',pool:['g1']},{id:'c2',edizione:3,stato:'bozza',turni:3,turno:0,formato:'1v1',pool:['g1']},{id:'c3',edizione:3,stato:'in_corso',turni:3,turno:1,formato:'tavoli',pool:['g1']}]){
   CP.d={staff:true,coppe:[c]};CP.rpc=async(n)=>n==='coppa_vista'?{coppa:c,staff:true,me:'m1',iscritti:[{member_id:'m1'},{member_id:'m2'}],incontri:[],tavoli:[],classifica:[]}:null;
   window._cpId=c.id;await views.coppa();out['cp_'+c.id]=V.innerHTML;out['cpc_'+c.id]=await cpCard()}
  out.cperr=cpMsg(new Error('C\'è già una Coppa Antero non conclusa'))}catch(e){out.cperr2=String(e)}
 try{panel('<p>x</p>');await new Promise(r=>setTimeout(r,50));const o=document.querySelector('.lbx');out.libri=o&&o.outerHTML;document.querySelector('.mdl')?.remove()}catch(e){out.liberr=String(e)}
 P.fillText=_f;Math.random=R;return out};
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});const errs=[];
 const run=async url=>{const p=await (await b.newContext({serviceWorkers:'block',viewport:{width:460,height:1000},locale:'it-IT',timezoneId:'Europe/Rome'})).newPage();p.on('pageerror',e=>errs.push(url+' '+e.message));
  await p.clock.install({time:new Date('2026-06-10T10:00:00+02:00')});
  await p.route(/supabase|jsdelivr/,r=>r.abort());await p.goto(url);await p.waitForTimeout(1500);
  await p.evaluate(()=>{document.body.classList.remove('gate');localStorage.clear();admin=true;localStorage.setItem('pergioco-mode','admin');
   window.CP_CLIENT={from:t=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})}),upsert:async()=>({error:null})})};
   const ms=[{id:'m1',nome:'Anna',cognome:'Rossi'},{id:'m2',nome:'Bruno',cognome:'Verdi'}],gs=[{id:'g1',name:'Catan',min:2,max:4,categories:['Economic'],mechanics:['Trading']},{id:'g2',name:'Azul',min:2,max:4}];
   const ps=[];for(let i=0;i<14;i++)ps.push({id:'p'+i,gameId:i%3?'g1':'g2',date:'2026-0'+(1+i%5)+'-1'+(i%9),coop:false,duration:60,players:[{memberId:'m1',winner:i%2==0,score:10},{memberId:'m2',winner:i%2==1,score:8}]});
   DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>ps;DB.allTables=async()=>[];DB.legacyNames=async()=>[];DB.hasPin=async()=>true});
  await p.evaluate(()=>go('eventi')).catch(()=>{});await p.waitForTimeout(500);
  const r=JSON.parse(JSON.stringify(await p.evaluate(FP)));await p.context().close();return r};
 const a=await run('http://localhost:8797/'),c=await run('http://localhost:8799/');
 for(const k of new Set([...Object.keys(a),...Object.keys(c)])){const x=A2(JSON.stringify(a[k])),y=A2(JSON.stringify(c[k]));
  if(x!==y){let i=0;while(x[i]===y[i])i++;console.log('  diff',k,'\n   main:',x.slice(Math.max(0,i-60),i+80),'\n   v41.1:',y.slice(Math.max(0,i-60),i+80))}
  chk(x===y,'identico: '+k)}
 console.log('  cov',c.titoli.filter(t=>t!=='ERR').length,(c.ant||'').length,/anteri/.test(c.ant),(c.cp_c1||'').length);chk(c.titoli.filter(t=>t!=='ERR').length>=2&&!c.wserr&&!c.anterr&&!c.cperr2&&!c.liberr&&c.canvas.length>20&&c.ant&&c.ant.length>500&&/anteri/.test(c.ant)&&c.cp_c1&&c.cp_c1.length>300,'il confronto copre davvero i rendering '+[c.wserr,c.anterr,c.cperr2,c.liberr,c.canvas.length].join('|'));
 chk(!errs.length,'nessun errore JS '+errs.join(' | '));
 console.log(`v41.1-identico: ${ok}/${n}`);await b.close();srv.close();process.exit(ok===n?0:1)})();
