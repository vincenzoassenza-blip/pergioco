// v37 PerGioco Wrapped — riepilogo annuale in stile "storie".
// Tutto è calcolato sul dispositivo con i dati che il socio può già leggere (partite, giochi, soci).
// Privacy: nemesi e compagno solo al diretto interessato (o staff); MAI nell'immagine condivisa salvo statistiche pubbliche.
// Nessun nome di altri soci nei confronti "top X%". Testi sempre via esc() o fillText (niente HTML non filtrato).
(function(){
const MESI=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const durOk=v=>{const n=Number(v);return v!==''&&v!=null&&Number.isInteger(n)&&n>=1&&n<=1440?n:null};
const gmin=g=>{if(!g)return null;const pt=+g.playTime,a=+g.minT,b=+g.maxT;if(pt>0&&pt<=1440)return pt;if(a>0&&b>0)return Math.min(1440,(a+b)/2);if(a>0||b>0)return Math.min(1440,a||b);return 45};
const SKIP=/expansion|espansione/i;
const cnt=(o,k,n=1)=>{o[k]=(o[k]||0)+n};
const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0])));
const nm=m=>m?String(m.soprannome||m.nome||'?'):'?';
const ore=min=>min<90?Math.round(min)+' min':(Math.round(min/6)/10).toLocaleString('it-IT')+' ore';
const fmtD=d=>{const[y,m,g]=d.split('-');return +g+' '+MESI[+m-1]+' '+y};
const PAL=[['#14254a','#2a4785'],['#5b2a86','#c0399a'],['#0f6b5c','#1fb58f'],['#a33b20','#f2b134'],['#1d3c78','#3fa7d6'],['#6a1b3a','#e0556a'],['#2d2d6b','#7b5cd6'],['#21543a','#9ccc3c']];

const WR={st:null,
 cl(){return window.CP_CLIENT||(DB.remote&&DB.remote.client)||null},
 async stato(force){if(this.st&&!force)return this.st;const c=this.cl();if(!c)return this.st={attivo:false,anno:new Date().getFullYear(),me:null,staff:false};
  try{const{data,error}=await c.rpc('wrapped_stato',{});if(error)throw error;this.st=data||{}}catch(e){this.st={attivo:false,anno:new Date().getFullYear(),me:null,staff:false}}return this.st},
 async set(on,anno){const c=this.cl();const{data,error}=await c.rpc('wrapped_set',{p_attivo:!!on,p_anno:+anno});if(error)throw error;this.st=data;return data},
 // chi può vedere quale anno
 puo(st,anno){return !!(st.staff||(st.attivo&&st.me&&+anno<=+st.anno))},

 async dati(anno){const[ps,gs,ms]=await Promise.all([DB.plays(),DB.games(),DB.members()]);
  const G=Object.fromEntries(gs.map(g=>[g.id,g])),Y=String(anno);
  return{ps:ps.filter(p=>p&&p.date&&Array.isArray(p.players)),py:ps.filter(p=>p&&p.date&&String(p.date).slice(0,4)===Y&&Array.isArray(p.players)),gs,G,ms,Y}},

 durata(p,G){return durOk(p.duration)||gmin(G[p.gameId])||45},

 // ---- socio ----
 async socio(mid,anno,pub){const{ps,py,G,ms,Y}=await this.dati(anno);const M=Object.fromEntries(ms.map(m=>[m.id,m]));const me=M[mid];
  const mine=py.filter(p=>p.players.some(x=>x.memberId===mid)).sort((a,b)=>String(a.date).localeCompare(b.date));
  if(!mine.length)return{vuoto:true,me,anno};
  const meP=p=>p.players.find(x=>x.memberId===mid)||{},won=p=>p.coop?!!p.groupWin:!!meP(p).winner;
  let min=0;const perG={},perC={},perMe={},perMo={},perD={},perDm={},comp={},nem={};
  for(const p of mine){const d=this.durata(p,G);min+=d;cnt(perG,p.gameId);cnt(perMo,String(p.date).slice(5,7));cnt(perD,p.date);cnt(perDm,p.date,d);
   const g=G[p.gameId]||{};(g.categories||[]).filter(c=>!SKIP.test(c)).forEach(c=>cnt(perC,c));(g.mechanics||[]).forEach(c=>cnt(perMe,c));
   for(const x of p.players)if(x.memberId&&x.memberId!==mid&&M[x.memberId])cnt(comp,x.memberId);
   if(!p.coop&&!meP(p).winner)for(const x of p.players)if(x.winner&&x.memberId&&x.memberId!==mid&&M[x.memberId])cnt(nem,x.memberId)}
  const prima=new Set(ps.filter(p=>String(p.date)<Y+'-01-01'&&p.players.some(x=>x.memberId===mid)).map(p=>p.gameId));
  const diversi=Object.keys(perG).length,nuovi=Object.keys(perG).filter(g=>!prima.has(g)).length;
  const comp_=mine.filter(p=>!p.coop),coop=mine.length-comp_.length,vit=mine.filter(won).length;
  const pct=comp_.length?Math.round(comp_.filter(won).length/comp_.length*100):null;
  let serie=0,s=0;for(const p of mine){if(won(p)){s++;serie=Math.max(serie,s)}else s=0}
  const serate=Object.keys(perD).length;
  const [dTop]=top(perD);const sera={data:dTop[0],n:dTop[1],min:perDm[dTop[0]]};
  const [moTop]=top(perMo);
  // confronti anonimi: posizione tra i soci che hanno giocato nell'anno
  const tot={};for(const p of py)for(const x of p.players)if(x.memberId&&M[x.memberId])cnt(tot,x.memberId);
  const arr=Object.values(tot).sort((a,b)=>b-a),pos=arr.findIndex(v=>v<=mine.length)+1,attivi=arr.length;
  const topPct=attivi>1?Math.max(1,Math.ceil(pos/attivi*100)):100;
  // badge sbloccati nell'anno = sbloccati con le partite fino a fine anno meno quelli già sbloccati prima
  let badge=[];try{if(typeof Badges!=='undefined'){const fin=Y+'-12-31',ini=Y+'-01-01',base=typeof badgeCtx==='function'?await badgeCtx():{plays:ps,games:Object.values(G),tables:[],ratings:[]};
   const ctx=f=>({...base,plays:base.plays.filter(f),tables:(base.tables||[]).filter(t=>!t.date||f(t))});
   const prima_=new Set(Badges.unlocked('m:'+mid,ctx(p=>String(p.date)<ini))),dopo=Badges.list('m:'+mid,ctx(p=>String(p.date)<=fin));
   badge=dopo.filter(b=>b.on&&!prima_.has(b.id)).map(b=>({icon:b.icon,name:b.name}))}}catch(e){console.warn('wrapped badge',e)}
  const exp=mine.length*10+vit*5+serate*15+nuovi*10;
  const c1=top(comp)[0],n1=top(nem)[0];
  return{me,anno:+anno,n:mine.length,min,serate,diversi,nuovi,vit,pct,coop,serie,sera,mese:{m:+moTop[0],n:moTop[1]},
   topG:top(perG).slice(0,3).map(([g,n])=>({nome:(G[g]&&G[g].name)||'?',n})),cat:(top(perC)[0]||[])[0]||null,mec:(top(perMe)[0]||[])[0]||null,
   comp:c1?{nome:nm(M[c1[0]]),n:c1[1]}:null,nem:n1?{nome:nm(M[n1[0]]),n:n1[1]}:null,topPct,attivi,badge,exp,pub:!!pub}},

 titolo(d){const share=d.topG[0]?d.topG[0].n/d.n:0;
  if(d.pct!=null&&d.pct>=55&&d.n>=8)return['👑','Il Campione di Sant\'Antero','Vinci così tanto che il Santo ti chiede consigli prima della processione.'];
  if(d.nuovi>=8||d.diversi/d.n>0.7)return['🧭','L\'Esploratore della Ludoteca','Ogni scatola chiusa è una porta: Sant\'Antero ti ha visto aprirle tutte.'];
  if(share>=0.4)return['💍','Il Fedelissimo','Un gioco, un amore. Nemmeno la festa di Sant\'Antero ti separa da '+d.topG[0].nome+'.'];
  if(d.coop>d.n/2)return['🤝','Lo Spirito di Squadra','Si vince insieme o si perde insieme: benedizione cooperativa di Sant\'Antero.'];
  if(d.sera.n>=5)return['🌙','L\'Animale da Serata','Quando gli altri sbadigliano tu chiedi "un\'altra?". Sant\'Antero chiude a chiave per ultimo.'];
  return['🎲','Il Giocatore di Sant\'Antero','Costante, curioso, sempre al tavolo: il cuore che fa girare PerGioco.']},

 // storie: {k (kicker), big, sub, list, emoji, priv}
 storieSocio(d){const S=[],nome=nm(d.me);
  if(d.vuoto)return[{emoji:'🎲',k:'Wrapped '+d.anno,big:'Nessuna partita',sub:'Nel '+d.anno+' non risultano partite registrate. Il tavolo ti aspetta!'}];
  S.push({emoji:'🎁',k:'PerGioco Wrapped',big:String(d.anno),sub:'Ciao '+nome+'! Ecco il tuo anno al tavolo. Tocca per scorrere →'});
  S.push({emoji:'🎲',k:'Hai giocato',big:d.n+' partite',sub:'circa '+ore(d.min)+' di gioco in '+d.serate+(d.serate===1?' serata':' serate'),note:'Durate stimate dove non registrate'});
  if(d.topG[0])S.push({emoji:'🏆',k:'Il tuo gioco dell\'anno',big:d.topG[0].nome,sub:d.topG[0].n+(d.topG[0].n===1?' partita':' partite'),list:d.topG.slice(1).map((g,i)=>(i+2)+'. '+g.nome+' · '+g.n)});
  S.push({emoji:'🧭',k:'Hai esplorato',big:d.diversi+' giochi diversi',sub:d.nuovi?d.nuovi+(d.nuovi===1?' mai provato prima':' mai provati prima'):'tutti già conosciuti: fedeltà assoluta!'});
  if(d.cat||d.mec)S.push({emoji:'🧩',k:'Il tuo genere',big:d.cat||d.mec,sub:d.mec&&d.cat?'meccanica preferita: '+d.mec:''});
  S.push({emoji:'🌙',k:'La serata più intensa',big:fmtD(d.sera.data),sub:d.sera.n+(d.sera.n===1?' partita':' partite')+' · circa '+ore(d.sera.min)});
  S.push({emoji:'📅',k:'Il tuo mese più attivo',big:MESI[d.mese.m-1],sub:d.mese.n+(d.mese.n===1?' partita':' partite')});
  S.push({emoji:'🥇',k:'Vittorie',big:String(d.vit),sub:(d.pct!=null?d.pct+'% nelle competitive':'solo cooperative!')+(d.serie>1?' · serie migliore: '+d.serie+' di fila':'')});
  S.push({emoji:'📈',k:'Rispetto agli altri soci',big:d.topPct<=50?'Top '+d.topPct+'%':'Ogni partita conta',sub:d.topPct<=50?'per numero di partite tra '+d.attivi+' soci attivi':'hai giocato con '+d.attivi+' soci attivi nel '+d.anno});
  if(d.comp)S.push({emoji:'🤝',k:'Al tavolo più spesso con',big:d.comp.nome,sub:d.comp.n+' partite insieme',priv:true});
  if(d.nem)S.push({emoji:'😈',k:'La tua nemesi',big:d.nem.nome,sub:'ti ha battuto '+d.nem.n+(d.nem.n===1?' volta':' volte')+'. Vendetta nel '+(d.anno+1)+'?',priv:true});
  S.push({emoji:'🏅',k:'Badge ed EXP',big:'+'+d.exp+' EXP',sub:d.badge.length?d.badge.length+(d.badge.length===1?' badge sbloccato':' badge sbloccati'):'Nessun nuovo badge, ma tanta esperienza',list:d.badge.slice(0,5).map(b=>b.icon+' '+b.name),note:'EXP stimati dall\'attività dell\'anno'});
  const[e,t,f]=this.titolo(d);S.push({emoji:e,k:'Il tuo titolo '+d.anno,big:t,sub:f,fin:true});
  return S},

 // ---- associazione (nessun dato personale) ----
 async assoc(anno){const{py,G,gs,Y}=await this.dati(anno);if(!py.length)return{vuoto:true,anno};
  let min=0;const perG={},perD={},perMo={},soci=new Set();
  for(const p of py){min+=this.durata(p,G);cnt(perG,p.gameId);cnt(perD,p.date);cnt(perMo,String(p.date).slice(5,7));p.players.forEach(x=>x.memberId&&soci.add(x.memberId))}
  const [dTop]=top(perD),[moTop]=top(perMo);
  const nuoviLud=gs.filter(g=>String(g.addedAt||g.createdAt||'').slice(0,4)===Y&&!g.isExp).length;
  const maxTav=Math.max(...py.map(p=>p.players.length));
  return{anno:+anno,n:py.length,min,serate:Object.keys(perD).length,soci:soci.size,giochi:Object.keys(perG).length,
   topG:top(perG).slice(0,5).map(([g,n])=>({nome:(G[g]&&G[g].name)||'?',n})),sera:{data:dTop[0],n:dTop[1]},mese:{m:+moTop[0],n:moTop[1]},nuoviLud,maxTav}},
 storieAssoc(d){if(d.vuoto)return[{emoji:'🎲',k:'Wrapped '+d.anno,big:'Nessuna partita',sub:'Nessuna partita registrata nel '+d.anno+'.'}];
  return[{emoji:'🏛️',k:'PerGioco Wrapped',big:String(d.anno),sub:'L\'anno dell\'associazione, tutto insieme'},
   {emoji:'🎲',k:'Insieme abbiamo giocato',big:d.n+' partite',sub:'circa '+ore(d.min)+' in '+d.serate+' serate',note:'Durate stimate dove non registrate'},
   {emoji:'👥',k:'Soci al tavolo',big:String(d.soci),sub:'soci attivi su '+d.giochi+' giochi diversi'},
   {emoji:'🏆',k:'I giochi dell\'anno',big:d.topG[0]?d.topG[0].nome:'—',sub:d.topG[0]?d.topG[0].n+' partite':'',list:d.topG.slice(1).map((g,i)=>(i+2)+'. '+g.nome+' · '+g.n)},
   {emoji:'🌙',k:'Record',big:fmtD(d.sera.data),sub:'la serata più intensa: '+d.sera.n+' partite',list:['📅 Mese top: '+MESI[d.mese.m-1]+' ('+d.mese.n+')','🪑 Tavolo più grande: '+d.maxTav+' giocatori'].concat(d.nuoviLud?['📦 '+d.nuoviLud+' giochi nuovi in ludoteca']:[])},
   {emoji:'🙏',k:'Grazie!',big:'Viva PerGioco',sub:'E che Sant\'Antero benedica i dadi anche nel '+(d.anno+1)+'.',fin:true}]},

 // ---- visualizzatore a storie ----
 apri(S,titolo,pub){document.getElementById('wr')?.remove();let i=0;const el=document.createElement('div');el.id='wr';el.setAttribute('role','dialog');el.setAttribute('aria-label',titolo);document.body.append(el);
  const draw=()=>{const s=S[i],c=PAL[i%PAL.length];el.style.background=`linear-gradient(160deg,${c[0]},${c[1]})`;
   el.innerHTML=`<div class="wrbar">${S.map((_,k)=>`<i class="${k<i?'on':k===i?'cur':''}"></i>`).join('')}</div>
   <div class="wrtop"><img src="icons/icon-192.png" alt=""><b>PerGioco Wrapped</b><button class="wrx" data-wr="x" aria-label="Chiudi">✕</button></div>
   <div class="wrs"><div class="wre">${esc(s.emoji)}</div><div class="wrk">${esc(s.k)}</div><div class="wrb">${esc(s.big)}</div>${s.sub?`<div class="wrsub">${esc(s.sub)}</div>`:''}
   ${s.list&&s.list.length?`<div class="wrl">${s.list.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`:''}${s.note?`<div class="wrn">${esc(s.note)}</div>`:''}
   ${s.priv&&!pub?'<div class="wrp">🔒 Solo per te: non compare nelle immagini condivise</div>':''}</div>
   <div class="wrbot"><button data-wr="sh">📤 Salva / condividi</button>${s.fin?'<button data-wr="x">Fine</button>':''}</div>`};
  const mv=d=>{i=Math.max(0,Math.min(S.length-1,i+d));draw()};
  let x0=null;el.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});
  el.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>40){e.preventDefault();mv(dx<0?1:-1)}});
  el.addEventListener('click',e=>{const b=e.target.closest('[data-wr]');if(b){if(b.dataset.wr==='x')return chiudi();if(b.dataset.wr==='sh')return this.condividi(S[i],i,pub,titolo);}
   if(e.target.closest('button'))return;mv(e.clientX<innerWidth/3?-1:1)});
  const key=e=>{if(e.key==='ArrowRight')mv(1);else if(e.key==='ArrowLeft')mv(-1);else if(e.key==='Escape')chiudi()};
  const chiudi=()=>{el.remove();document.removeEventListener('keydown',key)};document.addEventListener('keydown',key);draw();return el},

 // ---- immagine 1080x1920 sul client ----
 async png(s,i,pub){const W=1080,H=1920,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d'),c=PAL[i%PAL.length];
  const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,c[0]);g.addColorStop(1,c[1]);x.fillStyle=g;x.fillRect(0,0,W,H);
  x.globalAlpha=.08;x.fillStyle='#fff';for(let k=0;k<7;k++){x.beginPath();x.arc(120+k*160,1700-(k%3)*90,60+k*12,0,7);x.fill()}x.globalAlpha=1;
  const F='system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  const wrap=(t,y,size,weight,maxW,lh,col)=>{x.font=`${weight} ${size}px ${F}`;x.fillStyle=col||'#fff';x.textAlign='center';const words=String(t).split(/\s+/);let line='',lines=[];
   for(const w of words){const tt=line?line+' '+w:w;if(x.measureText(tt).width>maxW&&line){lines.push(line);line=w}else line=tt}if(line)lines.push(line);
   lines.slice(0,5).forEach((l,k)=>x.fillText(l,W/2,y+k*lh));return y+lines.slice(0,5).length*lh};
  try{const im=new Image();im.src='icons/icon-192.png';await im.decode();x.save();x.beginPath();x.arc(W/2,190,80,0,7);x.clip();x.drawImage(im,W/2-80,110,160,160);x.restore()}catch(e){}
  x.font=`700 44px ${F}`;x.fillStyle='rgba(255,255,255,.92)';x.textAlign='center';x.fillText('PerGioco Wrapped',W/2,340);
  // contenuto: le storie private senza statistiche pubbliche non vengono mai disegnate con nomi
  let k=s.k,big=s.big,sub=s.sub,list=s.list||[];if(s.priv&&!pub){big='🤫';sub='Questa la tengo per me!';list=[]}
  let y=620;x.font=`200px ${F}`;x.fillText(s.emoji,W/2,y);y+=150;
  y=wrap(k.toUpperCase(),y,46,'700',900,58,'rgba(255,255,255,.8)')+40;
  y=wrap(big,y+60,big.length>14?96:140,'800',960,big.length>14?108:150)+20;
  if(sub)y=wrap(sub,y+30,50,'500',900,64,'rgba(255,255,255,.92)')+30;
  for(const l of list.slice(0,5))y=wrap(l,y+20,44,'600',900,56,'rgba(255,255,255,.88)');
  if(s.note){x.font=`400 32px ${F}`;x.fillStyle='rgba(255,255,255,.65)';x.fillText(s.note,W/2,1700)}
  x.font=`600 36px ${F}`;x.fillStyle='rgba(255,255,255,.85)';x.fillText('Associazione PerGioco · Sant\'Antero',W/2,1830);
  return new Promise(r=>cv.toBlob(r,'image/png'))},
 async condividi(s,i,pub,titolo){try{const b=await this.png(s,i,pub);const f=new File([b],`pergioco-wrapped-${i+1}.png`,{type:'image/png'});
   if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:titolo});return}catch(e){if(e&&e.name==='AbortError')return}}
   const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=f.name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);toast('Immagine salvata')}catch(e){toast('Impossibile creare l\'immagine')}},

 // ---- punti di accesso ----
 anni(st){const now=new Date().getFullYear(),max=st.staff?now:+st.anno,out=[];for(let y=max;y>=Math.max(2020,max-5);y--)out.push(y);return out},
 async card(own,mid){const st=await this.stato();if(!st.staff&&!(st.attivo&&own))return null;const m=(await DB.members()).find(x=>x.id===mid);
  const box=document.createElement('div');box.className='card wrcard';box.id='wrcard';
  box.innerHTML=`<b>🎁 PerGioco Wrapped</b> ${st.attivo?'':'<span class="muted">(anteprima staff: spento per i soci)</span>'}
   <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><select id="wranno" aria-label="Anno">${this.anni(st).map(y=>`<option ${y===+st.anno?'selected':''}>${y}</option>`).join('')}</select>
   ${mid?`<button class="p" id="wrmio">${own?'Il mio Wrapped':'Wrapped di '+esc(nm(m))}</button>`:''}<button id="wrass">🏛️ Associazione</button></div>
`;
  box.addEventListener('click',async e=>{const id=e.target.id,anno=+box.querySelector('#wranno').value;
   try{if(id==='wrmio'){const st=await this.stato();if(!this.puo(st,anno))return toast('Wrapped non ancora disponibile');const pub=!!(m&&m.statsPub);this.apri(this.storieSocio(await this.socio(mid,anno,pub)),'Wrapped '+anno,pub)}
    if(id==='wrass'){if(!this.puo(await this.stato(),anno))return toast('Wrapped non ancora disponibile');this.apri(this.storieAssoc(await this.assoc(anno)),'Wrapped PerGioco '+anno,true)}
}catch(err){toast(err.message||'Errore')}});
  return box},
 async gestione(){const st=await this.stato(true);if(!st.staff)return null;const box=document.createElement('div');box.className='card wrcard';box.id='wrgest';
  const draw=st=>{const on=!!st.attivo;box.innerHTML=`<b>🎁 PerGioco Wrapped</b>
   <div class="wrst ${on?'on':'off'}" id="wrstato">${on?'🟢 Wrapped ATTIVO per i soci (anno '+esc(st.anno)+')':'⚪ Wrapped SPENTO per i soci'}</div>
   <label class="row" style="gap:8px;margin:6px 0">Anno <select id="wrsa">${this.anni({staff:true}).map(y=>`<option ${y===+st.anno?'selected':''}>${y}</option>`).join('')}</select></label>
   <div class="row" style="gap:8px;flex-wrap:wrap"><button class="${on?'':'p'}" id="wrtog">${on?'Spegni per i soci':'Attiva per i soci'}</button>${on?'<button id="wranno2">Cambia anno</button>':''}</div>
   <div class="muted" style="margin-top:6px">Lo staff può sempre vederlo in anteprima dal Profilo.</div>`;
   const save=async(att)=>{try{const ns=await this.set(att,box.querySelector('#wrsa').value);toast(ns.attivo?'Wrapped attivato per i soci':'Wrapped spento per i soci');draw(ns)}catch(e){toast(e.message||'Errore')}};
   box.querySelector('#wrtog').onclick=()=>save(!on);const a2=box.querySelector('#wranno2');if(a2)a2.onclick=()=>save(true)};
  draw(st);return box},
 async banner(){const st=await this.stato();if(!st.attivo||!st.me)return null;const b=document.createElement('div');b.className='card wrban';b.id='wrban';
  b.innerHTML=`<span>🎁</span><div><b>Il tuo PerGioco Wrapped ${esc(st.anno)} è pronto!</b><div class="muted">Partite, record, nemesi e il tuo titolo dell'anno.</div></div><button class="p">Apri</button>`;
  b.querySelector('button').onclick=async()=>{const m=(await DB.members()).find(x=>x.id===st.me);const pub=!!(m&&m.statsPub);this.apri(this.storieSocio(await this.socio(st.me,st.anno,pub)),'Wrapped '+st.anno,pub)};return b}};
window.WR=WR;

// aggancio a Profilo (dopo "Le mie statistiche") e alla home
{const _p=views.profilo;views.profilo=async(...a)=>{await _p(...a);try{const st=await WR.stato(true);const pv=window._pv||st.me;const own=!!st.me&&pv===st.me;
  if(!own&&!st.staff)return;const c=await WR.card(own,pv);if(!c)return;const h=V.querySelector('#st33h');h?h.parentNode.insertBefore(c,h.nextSibling):V.append(c)}catch(e){console.warn('wrapped',e)}}}
{const _a=views.altro;views.altro=async(...a)=>{await _a(...a);try{const c=await WR.gestione();if(c&&!V.querySelector('#wrgest'))V.append(c)}catch(e){console.warn('wrapped',e)}}}
{const _l=views.ludoteca;views.ludoteca=async(...a)=>{await _l(...a);try{const b=await WR.banner();if(b&&!V.querySelector('#wrban'))V.prepend(b)}catch(e){}}}
})();
