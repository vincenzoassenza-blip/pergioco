// v41.10.2 — Importa giochi da BoardGameGeek (Gestione, solo admin).
// Via File (CSV) e Nome utente (Edge bgg-collection + verifica user). Logo Powered by BGG con link ufficiale.
// Solo textContent / createElement. Testi da TXT (chiavi ibgg_*).
(()=>{const DEF={titolo:'📥 Importa da BoardGameGeek',sub:'File CSV/Excel o nome utente BGG',soloAdmin:'🔒 Solo gli admin possono importare i giochi.',intro:'I giochi devono avere un ID BGG. Prima dell\'import vedi l\'anteprima e scegli cosa aggiungere.',
 viaFile:'Carica un file',viaFileSub:'CSV o Excel esportato da BGG → Collection → Export',viaUser:'Nome utente BGG',viaUserSub:'Recupera la collezione «owned» dall\'account',viaUserSoon:'Disponibile a breve',viaUserHelp:'Inserisci il nome utente BoardGameGeek (collezione owned). Solo admin.',viaUserGo:'Recupera collezione',viaUserWait:'Recupero da BoardGameGeek… può richiedere un minuto.',viaUserErr:'Collezione non recuperata. Controlla il nome utente e riprova.',viaUserCheck:'Verifico…',viaUserOk:'Utente trovato',viaUserMissing:'Nome utente non trovato su BGG',viaUserRecent:'Usati di recente',viaUserRemove:'Rimuovi',attrib:'Dati giochi da BoardGameGeek',
 fileHelp:'Su BoardGameGeek: Collection → Export. Accettiamo CSV, massimo 2 MB e 2.000 righe.',filePick:'Tocca per scegliere il file',fileHint:'ⓘ Non condividiamo il file: lo leggiamo solo sul telefono per costruire l\'anteprima.',
 xlsx:'I file Excel (.xlsx) non sono ancora letti qui: aprilo e salvalo come CSV, poi carica il CSV.',troppoGrande:'File troppo grande (massimo 2 MB).',troppoRighe:'Troppe righe (massimo 2.000).',nessunId:'Nessun gioco con ID BGG valido nel file.',continua:'Continua',annulla:'Annulla',
 anteprima:'Anteprima import',letti:'giochi letti',nuovi:'nuovi',presenti:'già presenti',espansioni:'espansioni',mostra:'Mostra',tutto:'Tutto',filtroNuovi:'Nuovi',filtroPres:'Già presenti',filtroExp:'Espansioni',
 selNuovi:'Seleziona nuovi',desel:'Deseleziona tutto',importa:'Importa {n} giochi selezionati',maxSel:'Puoi importare al massimo 500 giochi per volta: deselezionane qualcuno.',
 tagNuovo:'nuovo',tagDup:'già presente',tagExp:'espansione',detAnno:'ID BGG {id}',giaColl:'già in collezione · ID {id}',expAnno:'espansione · {y}',
 esito:'Import completato',aggiunti:'{n} giochi aggiunti',saltati:'già presenti saltati',nonSel:'espansioni non selezionate',errori:'errori',vaiColl:'Vai alla collezione',altroImp:'Altro import',
 dettaglio:'Dettaglio',indietro:'← Torna all\'anteprima',giocatori:'Giocatori',durata:'Durata',eta:'Età',tipo:'Tipo',coop:'Cooperativo',comp:'Competitivo',min:'min'};
 const t=k=>{const K='ibgg_'+k;return(typeof TXT!=='undefined'&&TXT.v&&typeof TXT.v[K]==='string'&&TXT.v[K])||DEF[k]};
 const el=(g,c,x)=>{const e=document.createElement(g);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
 const escTxt=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/[<>]/g,'').trim().slice(0,100);
 const clamp=(v,lo,hi)=>{const n=+v;return Number.isInteger(n)&&n>=lo&&n<=hi?n:null};
 const MAXB=2*1024*1024,MAXR=2000,MAXI=500;
 const ST={step:'home',rows:[],filter:'all',sel:new Set(),detail:null,result:null,userDraft:'',lastUser:null};
 const reset=()=>{ST.step='home';ST.rows=[];ST.filter='all';ST.sel=new Set();ST.detail=null;ST.result=null;ST.userDraft='';ST.lastUser=null};

 const can=()=>typeof adminMode==='function'&&adminMode()&&typeof isMod==='function'&&!isMod();

 const UMAX=50, UMIN=3, UDEB=600;
 const URE=/^[A-Za-z0-9][A-Za-z0-9_ -]{0,49}$/;
 const cleanUser=s=>{const u=String(s||'').trim().replace(/[^A-Za-z0-9_ -]/g,'').slice(0,UMAX);return u};
 const avatarOk=u=>{const x=String(u||'').trim();if(x.length>400)return null;
  if(/^https:\/\/cf\.geekdo-static\.com\/[A-Za-z0-9_./%=:?&+-]+$/i.test(x))return x;
  if(/^https:\/\/cf\.geekdo-images\.com\/[A-Za-z0-9_./%=:?&+-]+$/i.test(x))return x;
  if(/^https:\/\/([A-Za-z0-9-]+\.)*boardgamegeek\.com\/[A-Za-z0-9_./%=:?&+-]+$/i.test(x))return x;return null};
 const LS_RECENT='pergioco-bgg-recent-users';
 const readRecentLS=()=>{try{const a=JSON.parse(localStorage.getItem(LS_RECENT)||'[]');return Array.isArray(a)?a.map(cleanUser).filter(u=>u&&URE.test(u)).slice(0,5):[]}catch(e){return[]}};
 const writeRecentLS=a=>{try{localStorage.setItem(LS_RECENT,JSON.stringify(a.slice(0,5)))}catch(e){}};
 async function loadRecent(){const loc=readRecentLS();
  try{const c=DB.remote&&DB.remote.client;if(!c)return loc;
   const q=c.from('app_settings').select('value').eq('key','bgg_recent_users').maybeSingle();
   const{data,error}=await Promise.race([q,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),1500))]);
   if(error||!data||!data.value)return loc;
   const arr=Array.isArray(data.value.users)?data.value.users:[];
   const out=arr.map(cleanUser).filter(u=>u&&URE.test(u)).slice(0,5);
   writeRecentLS(out);return out}catch(e){return loc}}
 async function saveRecent(list){const out=list.map(cleanUser).filter(u=>u&&URE.test(u)).slice(0,5);writeRecentLS(out);
  try{const c=DB.remote&&DB.remote.client;if(!c||!can())return;
   await c.from('app_settings').upsert({key:'bgg_recent_users',value:{users:out}})}catch(e){}}
 async function pushRecent(username){const u=cleanUser(username);if(!u||!URE.test(u))return;
  const cur=await loadRecent();const next=[u,...cur.filter(x=>x.toLowerCase()!==u.toLowerCase())].slice(0,5);await saveRecent(next)}
 async function removeRecent(username){const u=cleanUser(username).toLowerCase();const cur=await loadRecent();await saveRecent(cur.filter(x=>x.toLowerCase()!==u))}


 // --- CSV ---
 const HDR={id:['objectid','object id','id','bggid','bgg_id','gameid'],name:['objectname','object name','name','title','gamename'],
  year:['yearpublished','year published','year'],minp:['minplayers','min players','minplayer'],maxp:['maxplayers','max players','maxplayer'],
  mint:['minplaytime','min playtime','minplayingtime'],maxt:['maxplaytime','max playtime','maxplayingtime'],pt:['playingtime','playing time','avgplayingtime'],
  age:['minage','min age','age'],thumb:['thumbnail','image','imageurl','image url'],type:['itemtype','subtype','type','objecttype']};
 const normH=h=>String(h||'').toLowerCase().replace(/[\s_-]+/g,' ').trim();
 const mapHdr=hs=>{const m={};Object.keys(HDR).forEach(k=>{const i=hs.findIndex(h=>HDR[k].includes(normH(h)));if(i>=0)m[k]=i});return m};
 function parseCsv(text){const rows=[];let i=0,cur='',row=[],q=false;const push=()=>{row.push(cur);cur=''};const end=()=>{push();if(row.some(c=>c.trim()))rows.push(row);row=[]};
  while(i<text.length){const c=text[i];if(q){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
   else if(c==='"')q=true;else if(c===','||c===';'){push();if(c===';')end()}else if(c==='\n'){if(text[i-1]!=='\r')end()}else if(c!=='\r')cur+=c;i++}
  if(cur||row.length)end();return rows}
 function rowsFromCsv(text){const raw=parseCsv(text);if(raw.length<2)return[];const map=mapHdr(raw[0]);if(map.id==null||map.name==null)return null;
  const out=[],seen=new Set();
  for(let r=1;r<raw.length&&r<=MAXR;r++){const cells=raw[r],id=clamp(cells[map.id],1,99999999);if(!id||seen.has(id))continue;seen.add(id);
   const name=escTxt(cells[map.name]);if(!name)continue;
   let min=clamp(cells[map.minp],1,100)||1,max=clamp(cells[map.maxp],1,100)||min;if(max<min)max=min;
   let minT=clamp(cells[map.mint],0,1440),maxT=clamp(cells[map.maxt],0,1440),pt=clamp(cells[map.pt],0,1440);
   if(minT==null&&maxT==null&&pt!=null){minT=maxT=pt}if(minT==null)minT=maxT||30;if(maxT==null)maxT=minT;if(maxT<minT)maxT=minT;
   const typ=normH(cells[map.type]||''),exp=/expansion|boardgameexpansion/.test(typ);
   const th=String(cells[map.thumb]||'').trim();const thumb=/^https:\/\/cf\.geekdo-images\.com\/[A-Za-z0-9_./%=:()-]+$/.test(th)&&th.length<=400?th:null;
   out.push({bggId:id,name,year:clamp(cells[map.year],1800,2100),min,max,minT,maxT,playTime:pt||maxT,age:clamp(cells[map.age],0,99)||0,isExp:exp,thumb,coop:false})}
  return out}

 async function enrichStatus(list){const gs=await DB.games(),have=new Set(gs.filter(g=>g.bggId).map(g=>+g.bggId));
  return list.map(g=>({...g,status:have.has(+g.bggId)?'dup':g.isExp?'exp':'new'}))}

 // --- render ---
 function top(title){const h=el('div','hrow');h.append(el('h2',null,title));const b=el('button','s');b.type='button';b.textContent='← Gestione';b.onclick=()=>go('altro');h.append(b);return h}
 function home(){V.replaceChildren();V.append(top(t('titolo')));
  if(!can()){V.append(el('div','card',t('soloAdmin')));return}
  V.append(el('p','muted sm',t('intro')));
  const c=el('div','card');
  const f=el('div','alr albtn');f.append(el('span','ic','📄'),(()=>{const x=el('span','t');x.append(el('b',null,t('viaFile')),el('span','sub',t('viaFileSub')));return x})(),el('span','ar','▸'));
  act(f,()=>{ST.step='file';draw()});c.append(f);
  const u=el('div','alr albtn');u.append(el('span','ic','👤'),(()=>{const x=el('span','t');x.append(el('b',null,t('viaUser')),el('span','sub',t('viaUserSub')));return x})(),el('span','ar','▸'));
  act(u,()=>{ST.step='user';draw()});c.append(u);V.append(c);V.append(attrib())}
function attrib(){const w=el('div','ibggpwr');const a=el('a');a.href='https://boardgamegeek.com';a.target='_blank';a.rel='noopener noreferrer';a.title=t('attrib');
  const img=el('img');img.src='img/powered-by-bgg.png';img.alt='Powered by BoardGameGeek';img.width=120;img.height=36;img.loading='lazy';a.append(img);w.append(a);return w}
function userStep(){V.replaceChildren();V.append(top(t('viaUser')),el('p','muted sm',t('viaUserHelp')));
  const box=el('div','card');const lb=el('label',null,t('viaUser'));const inp=el('input');inp.type='text';inp.maxLength=UMAX;inp.autocomplete='off';inp.spellcheck=false;inp.placeholder='username';inp.setAttribute('aria-label',t('viaUser'));
  if(ST.userDraft)inp.value=ST.userDraft;
  const status=el('div','ibggverify');status.setAttribute('aria-live','polite');
  const goB=el('button','p');goB.type='button';goB.textContent=t('viaUserGo');goB.disabled=true;
  let timer=null,seq=0,verified=null; // verified={found,username,...}|null
  const setBtn=()=>{const ok=verified&&verified.found&&cleanUser(inp.value)===verified.username;goB.disabled=!ok;goB.textContent=t('viaUserGo')};
  const showWait=()=>{status.className='ibggverify wait';status.replaceChildren();status.append(document.createTextNode(t('viaUserCheck')));verified=null;setBtn()};
  const showMissing=()=>{status.className='ibggverify err';status.replaceChildren();status.append(document.createTextNode(t('viaUserMissing')));verified={found:false};setBtn()};
  const showFound=u=>{status.className='ibggverify';status.replaceChildren();
   const row=el('div','ibgguserok');const av=el('span','ibggav');const aurl=avatarOk(u.avatar);
   if(aurl){const img=el('img');img.src=aurl;img.alt='';img.width=40;img.height=40;img.loading='lazy';av.append(img)}else av.append(document.createTextNode('👤'));
   const tx=el('span','t');const full=[u.firstname,u.lastname].filter(Boolean).map(escTxt).join(' ');
   tx.append(el('b',null,escTxt(u.username||'')));
   if(full)tx.append(el('small',null,full));
   else tx.append(el('small',null,t('viaUserOk')));
   row.append(av,tx);status.append(row);verified={...u,found:true,username:cleanUser(u.username||inp.value)};setBtn()};
  const clearStatus=()=>{status.className='ibggverify';status.replaceChildren();verified=null;setBtn()};
  const verify=async(reason)=>{const username=cleanUser(inp.value);ST.userDraft=username;
   if(username.length<UMIN||!URE.test(username)){clearStatus();goB.disabled=true;return}
   const my=++seq;showWait();
   const c=DB.remote&&DB.remote.client;if(!c||!c.functions){if(my===seq){status.className='ibggverify err';status.textContent=t('viaUserErr');verified=null;setBtn()}return}
   try{const{data,error}=await c.functions.invoke('bgg-collection',{body:{mode:'user',username}});if(my!==seq)return;
    if(error||!data){status.className='ibggverify err';status.textContent=t('viaUserErr');verified=null;setBtn();return}
    if(data.error){status.className='ibggverify err';status.textContent=t('viaUserErr');verified=null;setBtn();return}
    if(!data.found)showMissing();else showFound({username:data.username||username,firstname:data.firstname,lastname:data.lastname,avatar:data.avatar,id:data.id})}
   catch(e){if(my!==seq)return;status.className='ibggverify err';status.textContent=t('viaUserErr');verified=null;setBtn()}};
  inp.oninput=()=>{ST.userDraft=cleanUser(inp.value);verified=null;setBtn();if(timer)clearTimeout(timer);timer=setTimeout(()=>verify('deb'),UDEB)};
  inp.onblur=()=>{if(timer)clearTimeout(timer);verify('blur')};
  goB.onclick=async()=>{if(!can())return toast(t('soloAdmin'));const username=cleanUser(inp.value);if(!verified||!verified.found||username!==verified.username)return toast(t('viaUserMissing'));
   const c=DB.remote&&DB.remote.client;if(!c||!c.functions)return toast('⚠️ Funzione non disponibile');goB.disabled=true;goB.textContent=t('viaUserWait');
   try{const{data,error}=await c.functions.invoke('bgg-collection',{body:{username}});if(error||!data||data.error)throw new Error((data&&data.error)||'BGG');
    const items=Array.isArray(data.items)?data.items:[];const mapped=items.map(it=>({bggId:+it.bgg_id,name:escTxt(it.nome),year:it.anno||null,min:+it.min||1,max:+it.max||1,minT:+it.minT||30,maxT:+it.maxT||30,playTime:+it.durata||null,age:+it.eta||0,isExp:!!it.exp,thumb:it.thumb||null,coop:false})).filter(g=>g.bggId&&g.name);
    if(!mapped.length){toast(t('nessunId'));goB.disabled=false;goB.textContent=t('viaUserGo');return}
    await pushRecent(username);ST.lastUser=username;ST.rows=await enrichStatus(mapped);ST.filter='all';ST.sel=new Set(ST.rows.filter(r=>r.status==='new').map(r=>r.bggId));ST.step='preview';draw()}
   catch(e){toast(t('viaUserErr'));goB.disabled=false;goB.textContent=t('viaUserGo');setBtn()}};
  box.append(lb,inp,status,goB);V.append(box);
  const paintChips=(recent)=>{
   const old=V.querySelector('.ibggrecent');if(old)old.remove();
   if(!recent.length||ST.step!=='user')return;
   const wrap=el('div','ibggrecent card');wrap.append(el('div','lab',t('viaUserRecent')));
   const chips=el('div','ibggchips');
   recent.forEach(name=>{const chip=el('span','ibggchip');const b=el('button','chipname');b.type='button';b.textContent=name;b.onclick=()=>{inp.value=name;ST.userDraft=name;verify('chip')};
    const x=el('button','x');x.type='button';x.textContent='×';x.setAttribute('aria-label',t('viaUserRemove')+' '+name);
    x.onclick=async e=>{e.stopPropagation();await removeRecent(name);draw()};chip.append(b,x);chips.append(chip)});
   wrap.append(chips);V.insertBefore(wrap,box.nextSibling||null)};
  paintChips(readRecentLS());
  loadRecent().then(r=>{if(ST.step==='user')paintChips(r)});
  V.append(attrib());
  if(cleanUser(inp.value).length>=UMIN)verify('init')}
 function fileStep(){V.replaceChildren();V.append(top(t('viaFile')),el('p','muted sm',t('fileHelp')));
  const box=el('div','card ibggdrop');const ic=el('div','ibggico','📎');const b=el('b',null,t('filePick'));const inp=el('input');inp.type='file';inp.accept='.csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';inp.className='ibggfile';
  inp.onchange=async()=>{const f=inp.files&&inp.files[0];if(!f)return;if(/\.xlsx$/i.test(f.name)||/sheet|excel/i.test(f.type)){toast(t('xlsx'));inp.value='';return}
   if(f.size>MAXB){toast(t('troppoGrande'));return}let text;try{text=await f.text()}catch(e){toast('⚠️ File non leggibile');return}
   if((text.match(/\n/g)||[]).length>MAXR){toast(t('troppoRighe'));return}
   const parsed=rowsFromCsv(text);if(parsed===null){toast('⚠️ Intestazioni CSV non riconosciute (servono objectid e objectname)');return}
   if(!parsed.length){toast(t('nessunId'));return}
   ST.rows=await enrichStatus(parsed);ST.filter='all';ST.sel=new Set(ST.rows.filter(r=>r.status==='new').map(r=>r.bggId));ST.step='preview';draw()};
  box.append(ic,b,inp);box.onclick=e=>{if(e.target!==inp)inp.click()};V.append(box,el('p','muted sm',t('fileHint')))}

 function counts(){const a=ST.rows;return{n:a.length,nu:a.filter(r=>r.status==='new').length,du:a.filter(r=>r.status==='dup').length,ex:a.filter(r=>r.status==='exp').length}}
 function filtered(){const f=ST.filter;return ST.rows.filter(r=>f==='all'||(f==='new'&&r.status==='new')||(f==='dup'&&r.status==='dup')||(f==='exp'&&r.status==='exp'))}

 function preview(){const c=counts();V.replaceChildren();V.append(top(t('anteprima')));
  V.append(el('p','muted sm',`${c.n} ${t('letti')} · ${c.nu} ${t('nuovi')} · ${c.du} ${t('presenti')} · ${c.ex} ${t('espansioni')}`));
  const bar=el('div','card');const lb=el('label',null,t('mostra'));const sel=el('select');sel.setAttribute('aria-label',t('mostra'));
  [['all',t('tutto')],['new',t('filtroNuovi')],['dup',t('filtroPres')],['exp',t('filtroExp')]].forEach(([v,l])=>{const o=el('option',null,`📅 ${t('mostra')}: ${l}`);o.value=v;if(ST.filter===v)o.selected=true;sel.append(o)});
  sel.onchange=()=>{ST.filter=sel.value;draw()};bar.append(lb,sel);
  const seg=el('div','ibggseg');const b1=el('button','chip');b1.type='button';b1.textContent=t('selNuovi');b1.onclick=()=>{ST.sel=new Set(ST.rows.filter(r=>r.status==='new').map(r=>r.bggId));draw()};
  const b2=el('button','chip');b2.type='button';b2.textContent=t('desel');b2.onclick=()=>{ST.sel=new Set();draw()};seg.append(b1,b2);bar.append(seg);V.append(bar);
  const list=el('div','card');
  filtered().forEach(g=>{const r=el('div','ibggrow');const ck=el('button','ibggck'+(ST.sel.has(g.bggId)?' on':''));ck.type='button';ck.textContent=ST.sel.has(g.bggId)?'✓':'';ck.setAttribute('aria-pressed',ST.sel.has(g.bggId)?'true':'false');
   ck.onclick=e=>{e.stopPropagation();if(ST.sel.has(g.bggId))ST.sel.delete(g.bggId);else{if(ST.sel.size>=MAXI){toast(t('maxSel'));return}ST.sel.add(g.bggId)}draw()};
   const th=el('span','ibggth','🎲');const tx=el('span','t');tx.append(el('b',null,g.name));
   let sub;if(g.status==='dup')sub=t('giaColl').replace('{id}',String(g.bggId));else if(g.status==='exp')sub=t('expAnno').replace('{y}',g.year||'—');
   else sub=[g.year,`${g.min}–${g.max}`,g.playTime?`~${g.playTime} ${t('min')}`:''].filter(Boolean).join(' · ');
   tx.append(el('small',null,sub));const tag=el('span','ibggtag '+g.status,g.status==='new'?t('tagNuovo'):g.status==='dup'?t('tagDup'):t('tagExp'));
   const goD=()=>{ST.detail=g;ST.step='detail';draw()};r.append(ck,th,tx,tag,el('span','ar','▸'));act(r,goD);list.append(r)});
  V.append(list);
  const n=ST.sel.size;const go=el('button','p');go.type='button';go.textContent=t('importa').replace('{n}',String(n));go.disabled=!n;go.onclick=()=>doImport();V.append(go);V.append(attrib())}

 function detail(){const g=ST.detail;if(!g){ST.step='preview';return draw()}V.replaceChildren();V.append(top(g.name));
  const c=el('div','card');const head=el('div','ibggdhead');head.append(el('span','ibggth big','🎲'));
  const meta=el('div');meta.append(el('span','ibggtag '+g.status,g.status==='new'?t('tagNuovo'):g.status==='dup'?t('tagDup'):t('tagExp')),el('b',null,g.name),el('div','muted',t('detAnno').replace('{id}',String(g.bggId))+(g.year?` · ${g.year}`:'')));
  head.append(meta);c.append(head);
  const grid=el('div','ibgggrid');[['giocatori',`${g.min}–${g.max}`],['durata',g.playTime?`~${g.playTime} ${t('min')}`:'—'],['eta',g.age?`${g.age}+`:'—'],['tipo',g.coop?t('coop'):t('comp')]].forEach(([k,v])=>{const x=el('div','ibggstat');x.append(el('div','muted',t(k)),el('b',null,v));grid.append(x)});
  c.append(grid);V.append(c);const back=el('button','s');back.type='button';back.textContent=t('indietro');back.onclick=()=>{ST.step='preview';draw()};V.append(back)}

 function result(){const r=ST.result||{ok:0,skip:0,err:0,expSkip:0};V.replaceChildren();V.append(top(t('esito')));
  const c=el('div','card ibggok');c.append(el('div','ibggico','✅'),el('p',null,''));c.querySelector('p').append(el('b',null,t('aggiunti').replace('{n}',String(r.ok))));
  c.append(el('p','muted sm',`${r.err} ${t('errori')} · ${r.skip} ${t('saltati')} · ${r.expSkip} ${t('nonSel')}`));V.append(c);
  const nav=el('div','card');const a=el('div','alr albtn');a.append(el('span','ic','🎲'),(()=>{const x=el('span','t');x.append(el('b',null,t('vaiColl')));return x})(),el('span','ar','▸'));act(a,()=>go('ludoteca'));
  const b=el('div','alr albtn');b.append(el('span','ic','📥'),(()=>{const x=el('span','t');x.append(el('b',null,t('altroImp')));return x})(),el('span','ar','▸'));act(b,()=>{reset();draw()});
  nav.append(a,b);V.append(nav);V.append(attrib())}

 async function doImport(){if(!can())return toast(t('soloAdmin'));const pick=ST.rows.filter(r=>ST.sel.has(r.bggId)&&r.status!=='dup').slice(0,MAXI);
  if(!pick.length)return;const btn=V.querySelector('button.p');if(btn){btn.disabled=true;btn.textContent='…'}
  let ok=0,err=0;const added=[];const have=new Set((await DB.games()).filter(g=>g.bggId).map(g=>+g.bggId));
  const rows=pick.filter(g=>!have.has(+g.bggId)).map(g=>({name:g.name,min:g.min,max:g.max,minT:g.minT,maxT:g.maxT,age:g.age,coop:!!g.coop,isExp:!!g.isExp,playTime:g.playTime,year:g.year,bggId:g.bggId,thumb:g.thumb||null,best:[],rec:[],categories:[],mechanics:[]}));
  try{
   if(DB.remote&&DB.remote.client&&typeof DB.remote.importGamesBgg==='function'){
    try{const r=await DB.remote.importGamesBgg(rows);ok=+(r&&r.ok)||0;err=+(r&&r.err)||0;(r&&r.ids||[]).forEach(id=>added.push(id))}
    catch(e){if(!/games_import_bgg|PGRST202|42883|does not exist/i.test(String(e.message||e.code||e)))throw e;
     for(const row of rows){try{const ng=await DB.addGame(row);ok++;if(ng&&ng.id)added.push(ng.id)}catch(x){err++}}}
   }else{for(const row of rows){try{const ng=await DB.addGame(row);ok++;if(ng&&ng.id)added.push(ng.id)}catch(x){err++}}}
  }catch(e){err+=rows.length;console.warn('import-bgg',e)}
  const expSkip=ST.rows.filter(r=>r.status==='exp'&&!ST.sel.has(r.bggId)).length,skip=ST.rows.filter(r=>r.status==='dup').length;
  ST.result={ok,err,skip,expSkip};ST.step='done';draw();kickMeta(added)}

 function kickMeta(ids){const c=DB.remote&&DB.remote.client;if(!c||!c.functions||!ids.length)return;
  (async()=>{for(const id of ids.slice(0,25)){try{await c.functions.invoke('bgg-meta',{body:{game_id:id}})}catch(e){}await new Promise(r=>setTimeout(r,1600))}})()}

 function act(r,f){r.tabIndex=0;r.setAttribute('role','button');r.onclick=e=>{if(e.target.closest('button.ibggck'))return;f()};r.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}}}
 function draw(){if(ST.step==='file')return fileStep();if(ST.step==='user')return userStep();if(ST.step==='preview')return preview();if(ST.step==='detail')return detail();if(ST.step==='done')return result();return home()}

 views.importbgg=async function(){if(!can()){V.replaceChildren();V.append(top(t('titolo')),el('div','card',t('soloAdmin')));return}
  reset();draw()};
 window.IBGG={DEF,t,parseCsv,rowsFromCsv,MAXB,MAXR,MAXI,UMAX,UMIN,URE,cleanUser,avatarOk,draw,ST,loadRecent,saveRecent,pushRecent,removeRecent}})();
