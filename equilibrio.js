// v29 — "Sfida equilibrata": propone i giochi più equilibrati per un gruppo di soci.
// Dati: partite registrate (RLS esistente: lettura per utenti autenticati) + game_meta (fortuna; lettura già consentita agli autenticati).
// Le risposte alle domande "pochi dati" sono salvate per socio in member_profile_gioco (migrate-v29.sql), così non si richiedono due volte.
const EQ={MIN_N:5,FULL_N:10,TIME:{'30':30,'60':60,'120':120,'0':0},PREF:['ind','new','known'],FREQ:['raro','spesso','vet'],GUSTO:['strat','mix','luck'],
 hash(s){let h=2166136261;for(const c of String(s)){h^=c.codePointAt(0);h=Math.imul(h,16777619)}return h>>>0},
 // esperienza/forza di ogni partecipante nel gioco g
 stats(ps,ids,games){const comp=ps.filter(p=>!p.coop&&Array.isArray(p.players)),S={};
  ids.forEach(id=>S[id]={n:0,w:0,exp:0,g:{},cat:{}});
  const gById=Object.fromEntries(games.map(g=>[g.id,g]));
  comp.forEach(p=>{const k=p.players.length||2,cat=gById[p.gameId]?(typeof gMain==='function'?gMain(gById[p.gameId]):''):'';
   p.players.forEach(x=>{const s=S[x.memberId];if(!s)return;const e=1/k;s.n++;s.exp+=e;if(x.winner)s.w++;
    const a=s.g[p.gameId]=s.g[p.gameId]||{n:0,w:0,exp:0};a.n++;a.exp+=e;if(x.winner)a.w++;
    if(cat){const c=s.cat[cat]=s.cat[cat]||{n:0,w:0,exp:0};c.n++;c.exp+=e;if(x.winner)c.w++}})});
  return{S,comp}},
 rel(o,k=3){return o&&o.n?(o.w+k*o.exp/o.n)/(o.exp+k*o.exp/o.n):1}, // win rate rispetto all'atteso, smussato verso 1
 // scontri diretti nel gioco tra i partecipanti
 h2h(comp,ids,gid){const set=new Set(ids),W={};let pairs=0,sum=0;
  comp.forEach(p=>{if(p.gameId!==gid)return;const pr=p.players.filter(x=>set.has(x.memberId));if(pr.length<2)return;
   pr.forEach(a=>pr.forEach(b=>{if(a!==b&&a.winner&&!b.winner){const k=a.memberId+'>'+b.memberId;W[k]=(W[k]||0)+1}}))});
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const a=W[ids[i]+'>'+ids[j]]||0,b=W[ids[j]+'>'+ids[i]]||0;if(a+b){pairs++;sum+=Math.abs(a-b)/(a+b+2)}}
  return{v:pairs?sum/pairs:0,n:pairs}},
 // peso dei dati reali per persona (0..1): sotto MIN_N partite servono le domande
 wData(s){return Math.min(1,s.n/EQ.FULL_N)},
 needQuiz(S,ids){return ids.filter(id=>S[id].n<EQ.FULL_N)},
 score(g,ctx){const{S,comp,ids,Q,meta,pref}=ctx,M=meta[g.id]||{},luck=M.luck!=null?M.luck:1;
  const per=ids.map(id=>{const s=S[id],wd=EQ.wData(s),q=Q[id]||null,a=s.g[g.id];
   const eD=a?1-Math.exp(-a.n/3):0,fq=q?EQ.FREQ.indexOf(q.freq):-1,kn=!!(a&&a.n)||!!(q&&q.known.includes(g.id));
   const eQ=q?(kn?[0.45,0.65,0.85][fq]:[0,0.08,0.2][fq]):eD;
   const E=q?wd*eD+(1-wd)*eQ:eD;
   const sk=a&&a.n>=2?EQ.rel(a):EQ.rel(s.cat[typeof gMain==='function'?gMain(g):'']||s);
   const skQ=q?[0.85,1,1.2][fq]:sk,skill=q?wd*sk+(1-wd)*skQ:sk;
   const gu=q?q.gusto:null;
   return{E,F:skill*(0.6+0.8*E),gu,kn:!!kn,played:a?a.n:0}});
  const F=per.map(x=>x.F),m=F.reduce((a,b)=>a+b,0)/F.length,sd=Math.sqrt(F.reduce((a,b)=>a+(b-m)**2,0)/F.length);
  const imb=Math.min(1,sd/(m||1)),Es=per.map(x=>x.E),gap=Math.max(...Es)-Math.min(...Es);
  const lf=1-0.15*luck*Math.min(1,(imb+gap)*2);       // la fortuna aiuta soprattutto quando i livelli differiscono
  const H=EQ.h2h(comp,ids,g.id);
  let s=100*(1-(0.5*imb*lf+0.3*H.v+0.2*gap*lf));
  const gs=per.map(x=>x.gu).filter(Boolean);if(gs.length){const t=gs.reduce((a,x)=>a+EQ.GUSTO.indexOf(x)-1,0)/gs.length;s-=6*Math.abs(t-(luck-1))}
  const allNew=per.every(x=>!x.played&&!x.kn),allKnow=per.every(x=>x.E>=0.3);
  if(pref==='new')s+=allNew?8:-6;if(pref==='known')s+=allKnow?8:-6;
  return{g,s,imb,gap,h:H,luck,allNew,allKnow,per}},
 why(r,i){const h=EQ.hash(r.g.id+'|'+i),pk=a=>a[h%a.length],out=[];
  if(r.h.n&&r.h.v<0.2)out.push(pk(['Nei vostri scontri diretti a questo gioco siete quasi pari.','Tra di voi qui il conto è in equilibrio: nessuno domina.','Le partite già fatte tra voi a questo gioco sono finite in modo vario.']));
  else if(r.h.n)out.push(pk(['Qualcuno qui ha vinto più spesso, ma il resto compensa.','Gli scontri diretti pendono un po\', ma i livelli sono vicini.']));
  if(r.allNew)out.push(pk(['Nessuno di voi lo conosce: partite tutti dallo stesso via.','È nuovo per tutti, quindi si parte alla pari.','Si scopre insieme: nessun vantaggio di esperienza.']));
  else if(r.gap<0.2)out.push(pk(['Avete un\'esperienza simile con questo gioco.','Lo conoscete più o meno allo stesso modo.','Livelli di esperienza vicini: partita aperta.']));
  else if(r.luck>=1.5)out.push(pk(['Un po\' di fortuna rimescola le carte e livella le differenze.','Il caso dà una mano anche a chi ha meno esperienza.']));
  if(r.imb<0.12&&out.length<2)out.push(pk(['Sulla carta ve la giocate alla pari.','Il pronostico è davvero incerto.','Difficile dire chi vincerà: ottimo segno.']));
  if(!out.length)out.push(pk(['Tra i giochi possibili è quello con meno squilibri.','Buon compromesso tra esperienza e talento del gruppo.']));
  return out.slice(0,2).join(' ')}};

// profilo di gioco per socio: validato in lettura e in scrittura (stessi vincoli dei CHECK in migrate-v29.sql)
const EQP={key:'pergioco-eqprof-v29',ID:/^[A-Za-z0-9_-]{1,40}$/,
 clean(r){if(!r||typeof r!=='object')return null;const f=r.freq??r.frequenza,g=r.gusto??r.preferenza,k=r.known??r.giochi_conosciuti;
  if(!EQ.FREQ.includes(f)||!EQ.GUSTO.includes(g))return null;const known=[...new Set((Array.isArray(k)?k:[]).filter(x=>typeof x==='string'&&EQP.ID.test(x)))].slice(0,50);return{freq:f,gusto:g,known}},
 _cache(){try{const o=JSON.parse(localStorage.getItem(this.key));return o&&typeof o==='object'?o:{}}catch(e){return{}}},
 _put(m){try{localStorage.setItem(this.key,JSON.stringify(m))}catch(e){}},
 client(){return DB.remote&&DB.mode==='online'?DB.remote.client:null},
 async load(){const raw=this._cache(),out={};const c=this.client();
  if(c){try{const{data,error}=await c.from('member_profile_gioco').select('member_id,frequenza,preferenza,giochi_conosciuti');if(!error&&Array.isArray(data)){const m={};data.forEach(r=>{const v=EQP.clean(r);if(v&&typeof r.member_id==='string'&&r.member_id.length<=60)m[r.member_id]=v});this._put(m);return m}}catch(e){}}
  for(const k in raw){const v=EQP.clean(raw[k]);if(v)out[k]=v}return out},
 async save(id,d){const v=EQP.clean(d);if(!v||typeof id!=='string'||!id||id.length>60)throw new Error('dati non validi');const c=this.client();
  if(c){const{error}=await c.from('member_profile_gioco').upsert({member_id:id,frequenza:v.freq,preferenza:v.gusto,giochi_conosciuti:v.known},{onConflict:'member_id'});if(error)throw error}
  const m=this._cache();m[id]=v;this._put(m);return v}};
async function eqOpen(){const all=await DB.members(),ms=all.filter(m=>m.active),gsAll=await DB.games(),ps=await DB.plays(),meta=typeof Meta!=='undefined'?await Meta.load():{};
 const games=gsAll.filter(g=>!g.isExp&&!(typeof isCoop==='function'&&isCoop(g)));
 const st={ids:[],guests:0,time:'0',pref:'ind',Q:await EQP.load(),off:0};let _u=null;try{_u=DB.remote?(await DB.remote.user())?.id:null}catch(e){}
 const me=all.find(m=>_u&&m.userId===_u)||null;if(me&&me.active)st.ids.push(me.id);
 // v31: chi non è staff è sempre tra i partecipanti (bloccato); senza socio collegato non può creare sfide
 const staff=typeof adminMode==='function'&&adminMode(),lock=!staff&&me&&me.active?me.id:null,noMe=!staff&&!lock;
 const keep=ids=>lock&&!ids.includes(lock)?[lock,...ids.filter(x=>x!==lock)]:ids;
 const nm=id=>{const m=all.find(x=>x.id===id);if(!m)return'?';const t=[m.nome,m.cognome].filter(Boolean).join(' ')||m.name||'Socio';return String(t).slice(0,60)};
 const top=(t,back)=>`<div class="cwz-top"><button class="cwz-back" id="eqb">← ${esc(back)}</button><span class="muted">⚖️ Sfida equilibrata</span></div><h2 id="eqh" tabindex="-1">${esc(t)}</h2>`;
 const N=()=>st.ids.length+st.guests;
 const cand=()=>{const n=N(),T=EQ.TIME[st.time]||0;return games.filter(g=>g.min<=n&&g.max>=n&&(!T||(+g.minT||gPt(g))<=T))};
 // 1) partecipanti + filtri
 const s1=()=>{V.innerHTML=`<div class="cwz eq">${top('Chi gioca?','Partita')}
  <p class="muted">Scegli almeno 2 soci: ti proponiamo i giochi in cui la sfida è più equilibrata.</p>
  <div class="card"><button class="s" id="eqp" style="width:100%">👥 Scegli i soci (${st.ids.length})</button>
   <div class="eqchips">${st.ids.map(id=>id===lock?`<span class="chip eqme" title="Sei sempre tra i partecipanti">${esc(nm(id))} · <b>tu</b> 🔒</span>`:`<span class="chip">${esc(nm(id))}</span>`).join('')}</div>${lock?'<p class="muted" style="font-size:13px;margin:4px 0 0">Partecipi sempre alle sfide che crei: puoi aggiungere o togliere gli altri soci.</p>':''}
   <label>Ospiti (non contano nei calcoli)</label><div class="row eqstep"><button class="s" id="eqgm">−</button><b id="eqgn">${st.guests}</b><button class="s" id="eqgp">+</button></div></div>
  <div class="card"><label>Giocatori al tavolo</label><p><b>${N()}</b> <span class="muted">(calcolato dai partecipanti)</span></p>
   <label>Tempo disponibile</label><div class="seg" id="eqt">${[['30','30 min'],['60','1 ora'],['120','2 ore'],['0','Senza limite']].map(([v,l])=>`<button data-v="${v}" class="${st.time===v?'on':''}">${l}</button>`).join('')}</div>
   <label>Preferenza</label><div class="seg" id="eqf">${[['ind','Indifferente'],['new','Nuovo per tutti'],['known','Che conoscono tutti']].map(([v,l])=>`<button data-v="${v}" class="${st.pref===v?'on':''}">${l}</button>`).join('')}</div></div>
  ${me&&me.active?`<p class="equpd"><a href="#" id="equ">${st.Q[me.id]?'aggiorna le mie preferenze':'indica le mie preferenze'}</a></p>`:''}
  ${noMe?'<p class="warn" id="eqnome">Il tuo account non è ancora collegato a un socio, quindi non puoi creare una sfida. Chiedi a un admin di collegarlo (Altro → Pannello admin).</p>':''}<button class="p" id="eqgo" ${st.ids.length<2||noMe?'disabled':''}>Trova la sfida più equilibrata</button>${st.ids.length<2?'<p class="muted">Servono almeno 2 soci.</p>':''}</div>`;
  $('#eqh').focus();$('#eqb').onclick=()=>go('nuova');
  $('#eqp').onclick=async()=>{const r=await pickMembers(ms,st.ids,'Chi partecipa alla sfida?');if(!r)return;st.ids=keep(r.filter(id=>ms.some(m=>m.id===id))).slice(0,20);if(lock&&!r.includes(lock))toast('Non puoi toglierti dalla sfida');s1()};
  $('#eqgm').onclick=()=>{st.guests=Math.max(0,st.guests-1);s1()};$('#eqgp').onclick=()=>{st.guests=Math.min(10,st.guests+1);s1()};
  if($('#equ'))$('#equ').onclick=e=>{e.preventDefault();const{S}=EQ.stats(ps,[me.id],games);s2(S,[me.id],true)};
  V.querySelectorAll('#eqt [data-v]').forEach(b=>b.onclick=()=>{if(b.dataset.v in EQ.TIME){st.time=b.dataset.v;s1()}});
  V.querySelectorAll('#eqf [data-v]').forEach(b=>b.onclick=()=>{if(EQ.PREF.includes(b.dataset.v)){st.pref=b.dataset.v;s1()}});
  $('#eqgo').onclick=()=>{st.ids=keep(st.ids);if(st.ids.length<2||noMe)return;st.off=0;const{S}=EQ.stats(ps,st.ids,games);const need=EQ.needQuiz(S,st.ids).filter(id=>!st.Q[id]);need.length?s2(S,need):res()}};
 // 2) pochi dati: domande rapide per chi ha poche partite
 const s2=(S,need,edit)=>{const C=cand().sort((a,b)=>EQ.hash(a.id)%7-EQ.hash(b.id)%7).sort((a,b)=>ps.filter(p=>p.gameId===b.id).length-ps.filter(p=>p.gameId===a.id).length).slice(0,8);
  const draft={};need.forEach(id=>{const q=st.Q[id];draft[id]=q?{freq:q.freq,known:q.known.slice(),gusto:q.gusto}:{freq:'',known:[],gusto:'mix'}});
  const C2=edit?[...new Map([...C,...games.filter(g=>need.some(id=>draft[id].known.includes(g.id)))].map(g=>[g.id,g])).values()].slice(0,20):C;
  V.innerHTML=`<div class="cwz eq">${top(edit?'Le mie preferenze':'Qualche domanda veloce','Chi gioca')}
  ${edit?'<p class="muted">Facoltativo: aggiorna come giochi. Le risposte restano salvate per le prossime sfide.</p>':`<p class="cwz-note">ℹ️ Abbiamo ancora poche partite registrate per ${need.length===1?esc(nm(need[0])):'alcuni di voi'}: rispondete a due domande e la stima sarà più giusta. ${need.some(id=>S[id].n>=EQ.MIN_N)?'Per chi ha già qualche partita contiamo anche quelle.':''} Le risposte vengono salvate: non ve le richiederemo.</p>`}
  ${need.map(id=>`<div class="card eqq" data-id="${esc(id)}"><b>${esc(nm(id))}</b>
   <label>Quanto gioca?</label><div class="seg" data-k="freq">${[['raro','Ogni tanto'],['spesso','Spesso'],['vet','Veterano']].map(([v,l])=>`<button data-v="${v}" class="${draft[id].freq===v?'on':''}">${l}</button>`).join('')}</div>
   ${C2.length?`<label>Conosce già qualcuno di questi?</label><div class="eqknown" data-k="known">${C2.map(g=>`<button class="chip${draft[id].known.includes(g.id)?' on':''}" data-v="${esc(g.id)}" aria-pressed="${draft[id].known.includes(g.id)}">${esc(g.name)}</button>`).join('')}</div>`:''}
   <label>Preferisce</label><div class="seg" data-k="gusto">${[['strat','Strategia'],['mix','Un mix'],['luck','Fortuna']].map(([v,l])=>`<button data-v="${v}" class="${draft[id].gusto===v?'on':''}">${l}</button>`).join('')}</div></div>`).join('')}
  <button class="p" id="eqq">${edit?'Salva':'Calcola'}</button>${edit?'':'<button id="eqskip" class="s" style="margin-top:8px;width:100%">Salta le domande</button>'}</div>`;
  $('#eqh').focus();$('#eqb').onclick=s1;
  V.querySelectorAll('.eqq').forEach(c=>{const d=draft[c.dataset.id];if(!d)return;
   c.querySelectorAll('[data-k="freq"] button,[data-k="gusto"] button').forEach(b=>b.onclick=()=>{const k=b.parentNode.dataset.k,v=b.dataset.v;if(!(k==='freq'?EQ.FREQ:EQ.GUSTO).includes(v))return;d[k]=v;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b))});
   c.querySelectorAll('[data-k="known"] button').forEach(b=>b.onclick=()=>{const v=b.dataset.v;if(!C2.some(g=>g.id===v))return;const i=d.known.indexOf(v);if(i>=0)d.known.splice(i,1);else d.known.push(v);b.setAttribute('aria-pressed',d.known.includes(v));b.classList.toggle('on',d.known.includes(v))})});
  $('#eqq').onclick=async()=>{const miss=need.filter(id=>!draft[id].freq);if(miss.length)return toast('Indica quanto gioca '+nm(miss[0]));const b=$('#eqq');b.disabled=true;let ko=0;
   for(const id of need){const prev=st.Q[id],d=draft[id];
    // i giochi conosciuti già salvati che non erano tra le scelte mostrate restano
    const kept=prev?prev.known.filter(g=>!C2.some(x=>x.id===g)):[];const v=EQP.clean({...d,known:[...kept,...d.known]});if(!v)continue;st.Q[id]=v;
    try{await EQP.save(id,v)}catch(e){ko++}}
   if(ko)toast('⚠️ Risposte usate per questa sfida ma non salvate: riprova più tardi');else toast(edit?'✅ Preferenze aggiornate':'✅ Risposte salvate');
   edit?s1():res()};
  if($('#eqskip'))$('#eqskip').onclick=res};
 // 3) risultato
 const res=()=>{const{S,comp}=EQ.stats(ps,st.ids,games),ctx={S,comp,ids:st.ids,Q:st.Q,meta,pref:st.pref};
  const L=cand().map(g=>EQ.score(g,ctx)).sort((a,b)=>b.s-a.s||a.g.name.localeCompare(b.g.name));
  if(st.off>=L.length)st.off=0;const show=L.slice(st.off,st.off+3);
  V.innerHTML=`<div class="cwz eq">${top('Le sfide più equilibrate','Modifica')}
  <p class="muted">${esc(st.ids.map(nm).join(', '))}${st.guests?` + ${st.guests} ospit${st.guests===1?'e':'i'}`:''} · ${N()} al tavolo</p>
  ${show.length?show.map((r,j)=>`<div class="card cwz-r"><div class="row"><b>${['🥇','🥈','🥉'][j]} ${esc(r.g.name)}</b><span class="muted" style="flex:0 0 auto">👥 ${esc(pRange(r.g))} · ⏱ ~${esc(gPt(r.g))} min</span></div><p class="cwz-why">${esc(EQ.why(r,st.off+j))}</p>
   <div class="cwz-btns"><button data-see="${esc(r.g.id)}">📖 Scheda</button><button class="p" data-book="${esc(r.g.id)}">📅 Prenota un tavolo</button><button class="p" data-play="${esc(r.g.id)}">⚔️ Giochiamo questa</button></div></div>`).join('')
   :'<p class="muted">Nessun gioco della collezione va bene per questo numero di giocatori e questo tempo. Prova ad allargare il tempo.</p>'}
  <div class="cwz-btns">${L.length>3?'<button id="eqn">🔄 Altra proposta</button>':''}<button id="eqm">✏️ Cambia partecipanti</button></div></div>`;
  $('#eqh').focus();$('#eqb').onclick=s1;$('#eqm').onclick=s1;if($('#eqn'))$('#eqn').onclick=()=>{st.off+=3;res()};
  V.querySelectorAll('[data-see]').forEach(b=>b.onclick=()=>{const g=gsAll.find(x=>x.id===b.dataset.see);if(g&&typeof gamePage==='function')gamePage(g,ps)});
  V.querySelectorAll('[data-book]').forEach(b=>b.onclick=()=>typeof cBook==='function'&&cBook(b.dataset.book));
  V.querySelectorAll('[data-play]').forEach(b=>b.onclick=async()=>{const r=show.find(x=>x.g.id===b.dataset.play);if(!r||r.g.coop||noMe||(lock&&!st.ids.includes(lock)))return;b.disabled=true;
   const pron={};st.ids.forEach((id,i)=>{const F=r.per[i]&&r.per[i].F;pron[id]=Math.max(0,Math.min(2,isFinite(F)?F:1))});
   try{const sf=await SF.create({memberIds:st.ids,proposti:show.map(x=>x.g.id),scelto:r.g.id,pron,nuovo:r.allNew});
    views.nuova({sfidaId:sf.id,gameId:r.g.id,date:new Date().toISOString().slice(0,10),players:st.ids.map(id=>({memberId:id,score:''}))})}
   catch(e){b.disabled=false;toastErr(e,'SFIDA','Sfida non creata')}})};
 s1()}
// pulsante discreto in cima alla scheda Partita (solo per nuova partita, non in modifica)
(()=>{const _n=views.nuova;views.nuova=async function(ed,...a){await _n.call(this,ed,...a);if(ed&&(ed.id||ed.fromTable||ed.sfidaId))return;const h=V.querySelector('h2');if(!h||V.querySelector('#eqo'))return;
 h.insertAdjacentHTML('afterend','<button class="eqo" id="eqo">⚖️ Sfida equilibrata · <span>a cosa giochiamo per stare alla pari?</span></button>');$('#eqo').onclick=()=>eqOpen()}})();
