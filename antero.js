// v26 — "La Sfida di Antero": torneo tra meccaniche, solo admin e moderatori. Tutti i numeri in base antero (5 è il massimo di tutto).
const ANT={MAX:5,NOMI:['zero','1','2','antero-2','antero-1','antero'],SUP:['','','²','³','⁴','⁵','⁶','⁷','⁸','⁹'],
 // numero → base antero. 3='antero-2', 10='2 anteri', 21='4 anteri e 1', 2026='antero-2 antero⁴, 1 antero³, 1 antero² e 1'
 num(n){n=Math.floor(Math.abs(+n||0));if(n<=5)return ANT.NOMI[n];const d=[];for(let x=n;x;x=Math.floor(x/5))d.push(x%5);
  const parti=[];for(let k=d.length-1;k>=1;k--){const c=d[k];if(!c)continue;parti.push(k===1?(c===1?'antero':c+' anteri'):c+' antero'+(ANT.SUP[k]||'^'+k))}
  if(d[0])parti.push(ANT.NOMI[d[0]]);return parti.length>1?parti.slice(0,-1).join(', ')+' e '+parti[parti.length-1]:parti[0]},
 MESI:['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'],
 oggi(){const s=(typeof romeToday==='function'?romeToday():new Date().toISOString().slice(0,10));return s},
 data(iso){const [y,m,d]=String(iso).split('-').map(Number);return`${ANT.num(d)} ${ANT.MESI[m-1]}, anno ${ANT.num(y)}`},
 festa(){return ANT.oggi().slice(5)==='01-03'},
 // meccanica benedetta del giorno: deterministica per data
 hash(s){let h=2166136261;for(const c of String(s)){h^=c.codePointAt(0);h=Math.imul(h,16777619)>>>0}return h},
 benedetta(list,iso){if(!list.length)return null;const l=[...list].sort((a,b)=>String(a.id).localeCompare(String(b.id),'en',{numeric:true}));return l[ANT.hash('antero:'+iso)%l.length].id},
 rm:()=>matchMedia('(prefers-reduced-motion: reduce)').matches,
 // validazione nome (client; il DB ha gli stessi vincoli)
 checkNome(raw,list,selfId){const n=(typeof txtNorm==='function'?txtNorm(raw):String(raw??'')).trim().replace(/\s+/g,' ');
  if(!n)return{err:'Il nome è obbligatorio.'};if(n.toUpperCase()==='ANTERO')return{antero:true};
  if(n.length>40)return{err:`Nome troppo lungo: ${ANT.num(n.length)} caratteri, massimo 40 (cioè antero-2 anteri e antero... ehm, 8 anteri).`};
  if(/[<>"`\\{}]/.test(n))return{err:'Niente simboli < > " ` \\ { } nel nome.'};
  if(list.some(m=>m.id!==selfId&&m.nome.toLocaleLowerCase('it')===n.toLocaleLowerCase('it')))return{err:`«${n}» c'è già: Sant'Antero non ama i doppioni.`};return{ok:n}},
 // emoji: esattamente 1 grapheme fatto solo di emoji (ZWJ, VS16, tono pelle, bandiere). Vuoto => 🎲
 EMO:/^(?:\p{Regional_Indicator}{2}|[\u{1F0A0}-\u{1F0FF}]|\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?(?:\u200D\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?)*(?:[\u{E0020}-\u{E007E}]+\u{E007F})?)$/u,
 graf(s){try{return[...new Intl.Segmenter('it',{granularity:'grapheme'}).segment(s)].map(x=>x.segment)}catch(e){return Array.from(s)}},
 isEmo(g){return typeof g==='string'&&g.length>0&&[...g].length<=16&&!/[\u0000-\u1FFF\u2100-\u214F]/u.test(g)&&ANT.EMO.test(g)},
 checkEmoji(raw){const e=String(raw??'').trim();if(!e)return{ok:'🎲'};const g=ANT.graf(e);
  if(g.length!==1)return{err:g.every(ANT.isEmo)?'Inserisci UNA sola emoji (ne hai messe '+g.length+').':'Qui va solo un\'emoji 🙂 — niente lettere, numeri, simboli o testo.'};
  if(!ANT.isEmo(g[0]))return{err:'Qui va solo un\'emoji 🙂 — niente lettere, numeri, simboli o testo.'};return{ok:g[0]}},
 // filtro live su input/incolla: tiene l'ultima emoji valida e segnala il resto
 emoField(inp,msg){const show=t=>{inp.classList.toggle('bad',!!t);if(msg){msg.textContent=t||'';msg.hidden=!t}};
  const fix=()=>{const v=inp.value.trim();if(!v){show('');return}const r=ANT.checkEmoji(v);if(r.ok){if(inp.value!==r.ok)inp.value=r.ok;show('');return}
   const ok=ANT.graf(v).filter(ANT.isEmo);inp.value=ok.length?ok[ok.length-1]:'';show(r.err)};
  inp.addEventListener('input',fix);inp.addEventListener('paste',ev=>{const t=(ev.clipboardData||window.clipboardData)?.getData('text')||'';ev.preventDefault();const r=ANT.checkEmoji(t);if(r.ok&&t.trim()){inp.value=r.ok;show('')}else show(t.trim()?r.err:'')});
  inp.addEventListener('drop',ev=>ev.preventDefault())}};

// archivio: Supabase se online, altrimenti copia locale (anteprima / offline)
const ANTDB={LK:'pergioco-antero-v26',
 R(){return DB.remote&&DB.status==='online'?DB.remote.client:null},
 seed:['Deckbuilding🃏','Piazzamento Lavoratori👷','Piazzamento Tessere🧩','Wargame⚔️','Piazzamento Dadi🎲','Azionario📈','Scacchistico♟️','Controllo Territorio🗺️','Aste🔨','Line Battler🛡️','Carte🂡','Selezione Azioni🎯'],
 loc(){try{const d=JSON.parse(localStorage.getItem(ANTDB.LK));if(d&&d.m)return d}catch(e){}const m=ANTDB.seed.map((s,i)=>{const e=s.match(/\p{Extended_Pictographic}.*$|🂡$/u)[0];return{id:i+1,nome:s.slice(0,-e.length),emoji:e,attiva:true,ordine:i+1}});return{m,albo:[],seq:m.length}},
 put(d){localStorage.setItem(ANTDB.LK,JSON.stringify(d))},
 ck(r){if(r.error){const e=new Error(r.error.message);e.code=r.error.code;throw e}return r.data},
 async mecc(){const c=ANTDB.R();if(c)return ANTDB.ck(await c.from('antero_meccaniche').select('id,nome,emoji,attiva,ordine').order('ordine').order('id').limit(1000));return ANTDB.loc().m.sort((a,b)=>a.ordine-b.ordine||a.id-b.id)},
 async add(nome,emoji,ordine){const c=ANTDB.R();if(c)return ANTDB.ck(await c.from('antero_meccaniche').insert({nome,emoji,ordine}).select().single());const d=ANTDB.loc();const r={id:++d.seq,nome,emoji,attiva:true,ordine};d.m.push(r);ANTDB.put(d);return r},
 async upd(id,p){const c=ANTDB.R();if(c)return ANTDB.ck(await c.from('antero_meccaniche').update(p).eq('id',id).select().single());const d=ANTDB.loc();const r=d.m.find(x=>x.id===id);Object.assign(r,p);ANTDB.put(d);return r},
 async albo(){const c=ANTDB.R();if(c)return ANTDB.ck(await c.from('antero_albo').select('id,nome,emoji,santificata,created_at').order('created_at',{ascending:false}).limit(ANT.MAX));return ANTDB.loc().albo.slice(0,ANT.MAX)},
 async del(id){const c=ANTDB.R();if(c){const r=await c.from('antero_meccaniche').delete().eq('id',id).select('id');ANTDB.ck(r);if(!r.data||!r.data.length)throw new Error('Eliminazione non riuscita (permessi?)');return}const d=ANTDB.loc();d.m=d.m.filter(x=>x.id!==id);d.albo.forEach(a=>{if(a.meccanica_id===id)a.meccanica_id=null});ANTDB.put(d)},
 async vinci(m,santificata,scelte){const c=ANTDB.R();if(c)return ANTDB.ck(await c.from('antero_albo').insert({meccanica_id:m.id,nome:m.nome,emoji:m.emoji,santificata,scelte}));const d=ANTDB.loc();d.albo.unshift({id:Date.now(),nome:m.nome,emoji:m.emoji,santificata,created_at:new Date().toISOString()});d.albo=d.albo.slice(0,25);ANTDB.put(d)}};

const FRASI_SANTINO=['«Il mio nome non è una meccanica: è una dottrina.»','«Chi scrive ANTERO invano, aspetta antero secondi.»','«Non avrai altra meccanica all\'infuori di me.»'];
const FRASI_GIUDIZIO=['Sant\'Antero ha visto. Sant\'Antero approva (più o meno).','Antero scelte: il Santo prende appunti.','Il Santo annuisce solennemente.','Giudizio emesso: continuate pure, figlioli.'];

async function openAntero(){
 if(!(typeof adminMode==='function'&&adminMode()))return toast('🔒 Riservato allo staff');
 document.querySelector('.ant')?.remove();
 const o=document.createElement('div');o.className='ant'+(ANT.festa()?' festa':'');o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','La Sfida di Antero');
 const M=document.createElement('div');o.append(M);document.body.append(o);document.body.classList.add('antopen');
 let tab='torneo',all=[],T=null,timer=null,nsc=0,taps=0,tapT=0;
 const today=ANT.oggi();
 const onKey=e=>{if(e.key==='Escape'&&!document.querySelector('.mdl')&&!o.querySelector('.antsantino')){e.preventDefault();exit()}};
 const close=()=>{clearTimeout(timer);document.removeEventListener('keydown',onKey);o.remove();document.body.classList.remove('antopen')};
 const undoBack=typeof backClose==='function'?backClose(close):null;
 // X / Esc: chiude SUBITO e poi consuma la voce di cronologia (Indietro del browser chiama close tramite backClose)
 const exit=()=>{if(!o.isConnected)return;close();if(undoBack)undoBack()};document.addEventListener('keydown',onKey);
 const err=(e)=>{const r=errSpiega(e,'SFIDA');const b=o.querySelector('#anterr');if(b){b.hidden=false;b.innerHTML=`⚠️ <b>Il Santo non gradisce: operazione non riuscita.</b><small>${esc(r.msg)} [${esc(r.code)}]</small>`}else toast(`⚠️ ${r.msg} [${r.code}]`,true)};
 const banner=(html,cls='',ms=2600)=>{const b=document.createElement('div');b.className='antban '+cls;b.innerHTML=html;b.setAttribute('role','status');o.append(b);setTimeout(()=>b.remove(),ms);return b};
 const att=()=>all.filter(m=>m.attiva);
 const lbl=m=>`<span class="antemo" aria-hidden="true">${esc(m.emoji||'🎲')}</span><span class="antnm">${esc(m.nome)}</span>`;
 const shell=()=>{M.innerHTML=`<div class="anthd"><button class="antx" aria-label="Chiudi">✕</button><h2 id="antt" tabindex="0">⚖️ La Sfida di Antero</h2>
  <div class="antcal">📜 Oggi è il ${esc(ANT.data(today))}</div>${ANT.festa()?'<div class="antfesta">🎉 Oggi è Sant\'Antero! Festa grande, ma con antero coriandoli al massimo 🎉</div>':''}
  <div class="seg"><button data-at="torneo" class="${tab==='torneo'?'on':''}">🏆 Torneo</button><button data-at="mecc" class="${tab==='mecc'?'on':''}">🧩 Meccaniche</button><button data-at="albo" class="${tab==='albo'?'on':''}">📜 Prescelti</button></div></div>
  <div id="anterr" class="anterr" hidden></div><div class="antbody" id="antb"></div>`;
  o.querySelector('.antx').onclick=exit;
  o.querySelector('.seg').onclick=e=>{const t=e.target.closest('[data-at]');if(t){tab=t.dataset.at;draw()}};
  o.querySelector('#antt').onclick=()=>{const n=Date.now();taps=n-tapT<1500?taps+1:1;tapT=n;if(taps>=ANT.MAX){taps=0;benedici()}}};
 const benedici=()=>{banner('<div class="halo big"></div><b>Sant\'Antero ti benedice</b><br><small>Per antero giorni le tue scelte saranno giuste (garanzia non inclusa).</small>','bless',3200)};
 const draw=async()=>{clearTimeout(timer);shell();const B=o.querySelector('#antb');try{if(tab==='torneo')drawT(B);else if(tab==='mecc')drawM(B);else await drawA(B)}catch(e){err(e)}};
 // ---- torneo: chi vince resta ----
 const nuovo=()=>{const l=att();for(let i=l.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[l[i],l[j]]=[l[j],l[i]]}T={coda:l,campione:l[0]||null,idx:1,storia:[],streak:0,ultimo:null,fine:false,nsc:0};nsc=0};
 const hes=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!o.isConnected||!T||T.fine)return;banner('<div class="halo blink"></div><b>Sant\'Antero si spazientisce…</b><br><small>Sono passati antero secondi. Il Santo tamburella le dita.</small>','imp',3500)},5000)};
 const drawT=(B)=>{const l=att();
  if(l.length<2){B.innerHTML=`<div class="card"><p>Servono almeno 2 meccaniche attive per sfidarsi. Attivale nella scheda <b>Meccaniche</b>.</p></div>`;return}
  if(!T||!T.coda.length)nuovo();
  const tot=T.coda.length-1,ben=ANT.benedetta(l,today);
  if(T.fine){const w=T.campione,sant=w.id===ben;
   B.innerHTML=`<div class="antwin${sant?' sant':''}" id="antw" tabindex="0" aria-label="Vincitrice: ${esc(w.nome)}. Tieni premuto antero secondi.">${sant?'<div class="halo"></div>':''}<div class="antwt">${sant?'✨ Vittoria santificata ✨':'🏆 Ha vinto'}</div>${lbl(w)}<div class="muted">dopo ${esc(ANT.num(T.storia.length))} scelte · tieni premuto antero secondi…</div></div>
   <canvas id="antpg" width="900" height="1200" class="antpg" aria-label="Pergamena"></canvas>
   <div class="row"><button class="p" id="antdl">📜 Scarica la pergamena</button></div><div class="row"><button class="s" id="antundo">↩️ Annulla ultima scelta</button><button class="s" id="antre">🔄 Ricomincia</button></div>`;
   pergamena(o.querySelector('#antpg'),w,sant);
   o.querySelector('#antdl').onclick=()=>o.querySelector('#antpg').toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='decreto-sant-antero-'+today+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)},'image/png');
   if(sant&&!T.stelle){T.stelle=1;stelle()}
   const W=o.querySelector('#antw');let lp=null;const st=e=>{lp=setTimeout(processione,5000,w)},en=()=>clearTimeout(lp);
   W.addEventListener('pointerdown',st);['pointerup','pointerleave','pointercancel'].forEach(k=>W.addEventListener(k,en));W.addEventListener('contextmenu',e=>e.preventDefault());
   bindT(B);return}
  const a=T.campione,b=T.coda[T.idx];
  B.innerHTML=`<div class="antcnt">Sfida <b>${esc(ANT.num(T.idx))}</b> di <b>${esc(ANT.num(tot))}</b></div>
   <div class="antduel"><button class="antcard" data-pick="a">${a.id===ben?'<span class="halo hid" aria-hidden="true"></span>':''}${lbl(a)}${T.storia.length?`<small>in carica da ${esc(ANT.num(T.streak))}</small>`:''}</button><div class="antvs">VS</div><button class="antcard" data-pick="b">${b.id===ben?'<span class="halo hid" aria-hidden="true"></span>':''}${lbl(b)}</button></div>
   <button class="s antns" id="antns">🤷 Non so scegliere${nsc?` (${esc(ANT.num(nsc))}/antero)`:''}</button>
   <div class="row"><button class="s" id="antundo"${T.storia.length?'':' disabled'}>↩️ Annulla ultima scelta</button><button class="s" id="antre">🔄 Ricomincia</button></div>`;
  B.querySelectorAll('[data-pick]').forEach(x=>x.onclick=()=>scegli(x.dataset.pick==='a'?a:b));
  o.querySelector('#antns').onclick=()=>{nsc++;if(nsc>=ANT.MAX){nsc=0;const w=Math.random()<.5?a:b;banner(`<div class="halo"></div><b>Antero ha parlato.</b><br>${lbl(w)}`,'spoke',2600);setTimeout(()=>scegli(w,true),900)}else{banner(`Il Santo prende nota: indecisione n. ${esc(ANT.num(nsc))}.`,'',1400);drawT(B)}};
  bindT(B);hes()};
 const bindT=(B)=>{const u=o.querySelector('#antundo');if(u)u.onclick=()=>{if(!T.storia.length)return;const s=T.storia.pop();Object.assign(T,s.prima);T.fine=false;T.stelle=0;draw()};
  o.querySelector('#antre').onclick=async()=>{if(T.storia.length&&!T.fine&&!await ask('Ricominciare il torneo da capo?'))return;T=null;draw()}};
 const scegli=async(w,santo)=>{const prima={campione:T.campione,idx:T.idx,streak:T.streak,ultimo:T.ultimo};T.storia.push({prima});
  T.streak=w.id===T.campione.id&&T.storia.length>1?T.streak+1:1;if(w.id!==T.campione.id)T.streak=1;T.campione=w;T.idx++;
  if(T.streak>ANT.MAX)banner('<b>Oltre l\'antero non si va!</b><br><small>Antero vittorie di fila sono il massimo: il Santo lascia passare, ma vi tiene d\'occhio.</small>','imp',3000);
  const n=T.storia.length;if(n%ANT.MAX===0&&T.idx<T.coda.length)banner(`<div class="halo"></div><b>Giudizio di Sant'Antero</b><br><small>${esc(ANT.num(n))} scelte. ${esc(FRASI_GIUDIZIO[(n/5-1)%FRASI_GIUDIZIO.length])}</small>`,'giud',2800);
  if(T.idx>=T.coda.length){T.fine=true;try{await ANTDB.vinci(w,w.id===ANT.benedetta(att(),today),n)}catch(e){draw().then(()=>err(e));return}}
  draw()};
 const stelle=()=>{const n=ANT.MAX;for(let i=0;i<n;i++){const s=document.createElement('div');s.className='antstar';s.textContent='⭐';s.style.left=(10+i*18)+'%';s.style.animationDelay=(i*.25)+'s';o.append(s);setTimeout(()=>s.remove(),4500)}};
 const processione=(w)=>{if(o.querySelector('.antproc'))return;const p=document.createElement('div');p.className='antproc';p.setAttribute('role','status');
  p.innerHTML=`<span>🕯️</span><span>🎺</span><span class="antpt">😇${esc(w.emoji||'🎲')}</span><span>🕯️</span><span>🥁</span><span>🎉</span><small>Processione in onore di «${esc(w.nome)}»</small>`;o.append(p);setTimeout(()=>p.remove(),ANT.rm()?2500:7000)};
 const pergamena=(c,w,sant)=>{const x=c.getContext('2d'),W=c.width,H=c.height;const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#f6e7c1');g.addColorStop(1,'#e8cf96');x.fillStyle=g;x.fillRect(0,0,W,H);
  x.strokeStyle='#8a5a1c';x.lineWidth=14;x.strokeRect(30,30,W-60,H-60);x.lineWidth=3;x.strokeRect(56,56,W-112,H-112);x.textAlign='center';x.fillStyle='#4a2d0b';
  const wrap=(t,y,f,lh,max=W-180)=>{x.font=f;const ws=String(t).split(' ');let l='';for(const p of ws){const k=l?l+' '+p:p;if(x.measureText(k).width>max&&l){x.fillText(l,W/2,y);y+=lh;l=p}else l=k}x.fillText(l,W/2,y);return y+lh};
  x.font='120px serif';x.fillText('😇',W/2,220);let y=wrap('PER DECRETO DI SANT\'ANTERO',330,'bold 50px Georgia,serif',60);
  y=wrap('anno '+ANT.num(+today.slice(0,4)),y+10,'italic 30px Georgia,serif',40);y=wrap(ANT.data(today).replace(/, anno.*$/,''),y,'italic 30px Georgia,serif',60);
  y=wrap('si proclama vincitrice della Sfida la meccanica',y+30,'32px Georgia,serif',44);x.font='110px serif';x.fillText(w.emoji||'🎲',W/2,y+90);
  y=wrap(w.nome.toUpperCase(),y+200,'bold 66px Georgia,serif',76);if(sant)y=wrap('✨ vittoria santificata ✨',y,'italic 34px Georgia,serif',50);
  y=wrap('Chi oserà contestarla sarà condannato a giocarci antero volte.',y+30,'italic 28px Georgia,serif',38);
  x.font='26px Georgia,serif';x.fillText('Dato in Ragusa, PerGioco APS · Il massimo è antero, sempre.',W/2,H-110)};
 // ---- gestione meccaniche ----
 const drawM=(B)=>{B.innerHTML=`<div class="card"><h3>➕ Nuova meccanica</h3><div class="row"><input id="antne" class="antemoin" maxlength="32" placeholder="🎲" aria-label="Emoji (solo una emoji)" inputmode="text" autocomplete="off" spellcheck="false"><input id="antnn" maxlength="40" placeholder="Nome (max 40 caratteri)" aria-label="Nome meccanica" autocomplete="off"></div><p class="antemsg" id="antemsg" role="alert" hidden></p><button class="p" id="antadd">Aggiungi</button></div>
  <div class="card"><h3>Meccaniche (${esc(ANT.num(all.length))}, attive ${esc(ANT.num(att().length))})</h3><p class="muted">Il torneo usa solo quelle attive.</p>${all.map(m=>`<div class="rec antrow${m.attiva?'':' off'}" data-id="${esc(m.id)}"><span>${lbl(m)}</span><span style="flex:0 0 auto"><button class="s" data-ren="${esc(m.id)}" aria-label="Modifica nome ed emoji">✏️</button> <button class="s" data-del="${esc(m.id)}" aria-label="Elimina ${esc(m.nome)}" title="Elimina">🗑️</button> <button class="s" data-tog="${esc(m.id)}">${m.attiva?'✅ Attiva':'⛔ Spenta'}</button></span></div>`).join('')}</div>`;
  const nn=o.querySelector('#antnn'),ne=o.querySelector('#antne');ANT.emoField(ne,o.querySelector('#antemsg'));
  o.querySelector('#antadd').onclick=async()=>{const c=ANT.checkNome(nn.value,all);if(c.antero)return santino([nn,ne,o.querySelector('#antadd')]);if(c.err){nn.classList.add('bad');return modal('⚠️ '+c.err,{cancel:false})}
   const e=ANT.checkEmoji(ne.value);if(e.err){ne.classList.add('bad');return modal('⚠️ '+e.err,{cancel:false})}
   try{const r=await ANTDB.add(c.ok,e.ok,Math.max(0,...all.map(m=>m.ordine||0))+1);all=await ANTDB.mecc();T=null;toast('Meccanica aggiunta: '+r.nome);draw()}catch(x){err(x)}};
  B.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!(typeof adminMode==='function'&&adminMode()))return toast('🔒 Riservato allo staff');const m=all.find(x=>String(x.id)===b.dataset.del);if(!m)return;
   if(!await modal('🗑️ Eliminare «'+m.nome+'»?\nL\'albo d\'oro conserva comunque le vittorie passate.'))return;
   try{await ANTDB.del(m.id);const inT=T&&!T.fine&&T.coda.some(x=>x.id===m.id);all=await ANTDB.mecc();if(inT||(T&&T.fine))T=null;toast('Eliminata: '+m.nome+(inT?' · torneo ricominciato':''));draw()}catch(x){err(x)}});
  B.querySelectorAll('[data-tog]').forEach(b=>b.onclick=async()=>{const m=all.find(x=>String(x.id)===b.dataset.tog);if(m.attiva&&att().length<=2)return modal('⚠️ Servono almeno 2 meccaniche attive per il torneo.',{cancel:false});try{await ANTDB.upd(m.id,{attiva:!m.attiva});all=await ANTDB.mecc();T=null;draw()}catch(x){err(x)}});
  B.querySelectorAll('[data-ren]').forEach(b=>b.onclick=async()=>{const m=all.find(x=>String(x.id)===b.dataset.ren);const v=await askText('Nuovo nome per «'+m.nome+'» (max 40 caratteri):',m.nome);if(v==null)return;const c=ANT.checkNome(v,all,m.id);if(c.antero)return santino([]);if(c.err)return modal('⚠️ '+c.err,{cancel:false});let em;for(;;){const pr=askText('Emoji per «'+c.ok+'» (una sola emoji; vuoto = 🎲):',m.emoji||'🎲');const mi=[...document.querySelectorAll('.mdl .min')].pop();if(mi){mi.maxLength=32;const w=document.createElement('p');w.className='antemsg';w.hidden=true;w.setAttribute('role','alert');mi.after(w);ANT.emoField(mi,w)}const ev=await pr;if(ev==null)return;em=ANT.checkEmoji(ev);if(em.ok)break;await modal('⚠️ '+em.err,{cancel:false})}
   if(c.ok===m.nome&&em.ok===m.emoji)return;
   try{await ANTDB.upd(m.id,{nome:c.ok,emoji:em.ok});all=await ANTDB.mecc();T=null;toast('Meccanica aggiornata');draw()}catch(x){err(x)}})};
 const santino=(els)=>{els.forEach(e=>e.disabled=true);const s=document.createElement('div');s.className='antsantino';s.setAttribute('role','alertdialog');
  s.innerHTML=`<div class="antsc"><div class="halo"></div><div class="antsf">🙏</div><b>SANT'ANTERO</b><p>${esc(FRASI_SANTINO[Math.floor(Math.random()*FRASI_SANTINO.length)])}</p><small id="antcd">Il campo resta benedetto (e bloccato) per antero secondi.</small></div>`;o.append(s);
  let k=5;const t=setInterval(()=>{k--;const cd=s.querySelector('#antcd');if(cd)cd.textContent=k>0?`Ancora ${ANT.num(k)} secondi di raccoglimento…`:'';if(k<=0){clearInterval(t);s.remove();els.forEach(e=>{e.disabled=false;if(e.tagName==='INPUT'&&e.id==='antnn')e.value=''})}},1000)};
 // ---- albo d'oro ----
 const drawA=async(B)=>{const l=(await ANTDB.albo()).slice(0,ANT.MAX);
  B.innerHTML=`<div class="card"><h3>📜 I Prescelti di Antero</h3><p class="muted">Le ultime antero vincitrici (di più non si può, ovviamente).</p>${l.length?l.map((r,i)=>`<div class="rec"><span><b>${esc(ANT.num(i+1))}.</b> ${lbl(r)}${r.santificata?' <span title="Vittoria santificata">😇</span>':''}</span><span class="muted">${esc(ANT.data(String(r.created_at).slice(0,10)).replace(/, anno.*/,''))}</span></div>`).join(''):'<p class="muted">Nessun prescelto ancora. Il Santo attende.</p>'}</div>`};
 try{all=await ANTDB.mecc();await draw()}catch(e){shell();err(e)}}
