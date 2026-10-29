// v25 — "Aiutami a scegliere": consigliere a domande, deterministico (nessuna IA).
// Dati: giochi (cache) + game_meta (dati extra BGG, letti dal DB e salvati in cache, mai mostrati come tali).
const Meta={key:'pergioco-meta-v25',map:null,
 _cache(){try{const o=JSON.parse(localStorage.getItem(this.key));return o&&typeof o==='object'?o:{}}catch(e){return{}}},
 async load(){if(this.map)return this.map;this.map=this._cache();const c=DB.remote&&DB.remote.client;
  if(c&&DB.mode==='online'){try{const {data,error}=await c.from('game_meta').select('game_id,weight,best_players,rec_players,min_age,lang_dep,bgg_rank,bgg_avg,mechanics,categories,subdomains,interaction,luck,status');
   if(!error&&Array.isArray(data)){const m={};data.forEach(r=>{if(typeof r.game_id==='string'&&r.game_id.length<=40)m[r.game_id]=Meta.clean(r)});this.map=m;try{localStorage.setItem(this.key,JSON.stringify(m))}catch(e){}}}catch(e){}}
  return this.map},
 // validazione difensiva anche in lettura (range uguali ai CHECK di migrate-v25.sql)
 clean(r){const n=(v,lo,hi)=>typeof v==='number'||typeof v==='string'?(+v>=lo&&+v<=hi?+v:null):null,ia=a=>Array.isArray(a)?a.filter(x=>Number.isInteger(x)&&x>=1&&x<=100).slice(0,20):[],ta=(a,k)=>Array.isArray(a)?a.filter(x=>typeof x==='string'&&x.length<=80).slice(0,k):[];
  return{w:n(r.weight,1,5),best:ia(r.best_players),rec:ia(r.rec_players),age:n(r.min_age,0,99),lang:n(r.lang_dep,0,4),rank:n(r.bgg_rank,1,1e6),avg:n(r.bgg_avg,0,10),mech:ta(r.mechanics,60),cat:ta(r.categories,40),sub:ta(r.subdomains,10),inter:n(r.interaction,0,2),luck:n(r.luck,0,2),st:['pending','ok','error','nobgg'].includes(r.status)?r.status:'pending'}}};

// Domande. Ogni risposta è un valore di un elenco chiuso: qualsiasi altro valore viene scartato.
const CQ={
 n:{t:'👥 Quanti siete?',o:[1,2,3,4,5,6,7,8].map(i=>[String(i),i===8?'8 o più':String(i)])},
 t:{t:'⏱ Quanto tempo avete?',o:[['30','Meno di 30 minuti'],['60','Fino a un\'ora'],['120','1–2 ore'],['999','Una serata intera']]},
 k:{t:'🤝 Come volete giocare?',o:[['co','Insieme contro il gioco'],['cp','Uno contro l\'altro'],['','Indifferente']]},
 a:{t:'🎭 Che atmosfera cercate?',o:[['party','Risate e party'],['strat','Strategia'],['bluff','Bluff e deduzione'],['adv','Avventura'],['','Sorprendimi']]},
 e:{t:'🎲 Quanto giocate di solito?',o:[['1','Ogni tanto, meglio regole semplici'],['2','Abbastanza, regole medie vanno bene'],['3','Spesso, anche giochi impegnativi']]},
 nm:{t:'🎯 Numero di giocatori',o:[['best','Solo dove rende al meglio (voti BGG)'],['rec','Consigliato dalla community'],['sup','Basta che sia supportato']]},
 w:{t:'⚖️ Quanto impegnativo?',o:[['1.3','Leggero'],['2','Medio-leggero'],['2.7','Medio'],['3.4','Medio-pesante'],['4.1','Pesante'],['','Indifferente']]},
 m:{t:'⚙️ Meccaniche preferite',multi:3,o:[['wp','Piazzamento lavoratori'],['deck','Costruzione del mazzo'],['area','Controllo di aree'],['draft','Draft (scelta di carte)'],['tile','Piazzamento tessere'],['set','Collezionare set'],['auct','Aste e offerte'],['dice','Dadi'],['push','Rischia o fermati'],['net','Rotte e collegamenti'],['pow','Poteri diversi per ognuno'],['hid','Ruoli nascosti e bluff'],['neg','Trattative e scambi'],['team','A squadre']]},
 i:{t:'⚔️ Interazione tra giocatori',o:[['2','Diretta: attacchi e dispetti'],['1','Indiretta: ognuno per sé, si ruba qualcosa'],['0','Nessuna: collaboriamo'],['','Indifferente']]},
 l:{t:'🍀 Fortuna o controllo?',o:[['0','Controllo, poca fortuna'],['1','Un po\' di fortuna'],['2','Tanta fortuna, divertimento'],['','Indifferente']]},
 th:{t:'🗺 Tema',o:[['fan','Fantasy'],['sf','Fantascienza e spazio'],['hist','Storia'],['eco','Economia e costruzione'],['nat','Animali e natura'],['hor','Horror'],['war','Guerra e combattimento'],['abs','Astratto'],['','Indifferente']]},
 lg:{t:'🔤 Testo sui componenti',o:[['0','Nessun testo (ok per tutti)'],['2','Un po\' di testo va bene'],['4','Indifferente']]},
 ag:{t:'🎂 Età del più giovane',o:[['6','6 anni'],['8','8 anni'],['10','10 anni'],['12','12 anni'],['14','14+'],['99','Tutti adulti']]},
 x:{t:'🔁 Giochi già giocati',o:[['','Vanno bene anche quelli'],['me','Escludi quelli già giocati da me'],['all','Escludi quelli già giocati al circolo']]},
 v:{t:'⭐ Voti dei soci',o:[['1','Tienine conto'],['','Non considerarli']]}};
const CFLOW={s:['n','t','k','a','e'],x:['n','nm','t','k','w','m','i','l','th','lg','ag','x','v']};
const CMECH={wp:['Worker Placement','Worker Placement with Dice Workers','Worker Placement, Different Worker Types'],deck:['Deck, Bag, and Pool Building','Deck Construction'],area:['Area Majority / Influence','Area Movement'],draft:['Open Drafting','Closed Drafting','Action Drafting'],tile:['Tile Placement','Pattern Building','Grid Coverage'],set:['Set Collection'],auct:['Auction / Bidding','Auction: Dutch','Auction: Turn Order Until Pass','Auction: Sealed Bid','Auction: Once Around','Closed Economy Auction','Constrained Bidding'],dice:['Dice Rolling','Die Icon Resolution','Worker Placement with Dice Workers'],push:['Push Your Luck'],net:['Network and Route Building','Connections'],pow:['Variable Player Powers'],hid:['Hidden Roles','Betting and Bluffing','Traitor Game','Deduction'],neg:['Negotiation','Trading','Bribery'],team:['Team-Based Game']};
const CTHEME={fan:['Fantasy','Mythology'],sf:['Science Fiction','Space Exploration'],hist:['Ancient','Medieval','Renaissance','Civilization','Age of Reason','American West','Napoleonic'],eco:['Economic','City Building','Industry / Manufacturing','Farming','Territory Building','Trains','Transportation'],nat:['Animals','Environmental'],hor:['Horror','Zombies'],war:['Wargame','Fighting'],abs:['Abstract Strategy','Puzzle']};
const CATM={party:{c:['Party Game','Humor'],s:['Party Games']},strat:{c:['Economic','Civilization'],s:['Strategy Games']},bluff:{c:['Bluffing','Deduction'],m:['Hidden Roles','Betting and Bluffing','Traitor Game','Deduction']},adv:{c:['Adventure','Exploration','Fantasy'],s:['Thematic Games']}};
const CTXT={party:'risate assicurate',strat:'tanta strategia',bluff:'bluff e deduzione',adv:'un\'avventura'};

// risposte valide → oggetto pulito
function cValid(ans){const o={};for(const [k,v] of Object.entries(ans||{})){const q=CQ[k];if(!q)continue;const ok=new Set(q.o.map(x=>x[0]));
  if(q.multi){const a=(Array.isArray(v)?v:[]).filter(x=>ok.has(x)).slice(0,q.multi);if(a.length)o[k]=a}else if(typeof v==='string'&&ok.has(v)&&v!=='')o[k]=v}return o}

// Algoritmo: filtri duri + punteggio. relax: 0 nessuno, 1 giocatori "supportati", 2 ignora "già giocati" ed età/lingua, 3 giocatori ±1
function cScore(games,meta,ps,A,me,relax){const n=+A.n||0,lim=+A.t||0,out=[];
 const played=new Set(A.x==='all'?ps.map(p=>p.gameId):A.x==='me'&&me?ps.filter(p=>(p.players||[]).some(x=>x.memberId===me)).map(p=>p.gameId):[]);
 for(const g of games){if(g.isExp)continue;const M=meta[g.id]||{},mech=new Set([...(g.mechanics||[]),...(M.mech||[])]),cat=new Set([...(g.categories||[]),...(M.cat||[])]),sub=new Set(M.sub||[]);
  const best=(M.best&&M.best.length?M.best:g.best)||[],rec=(M.rec&&M.rec.length?M.rec:g.rec)||[],nOk=k=>g.min<=k&&(g.max>=k||k===8&&g.max>=8);
  // --- filtri duri
  if(n){if(relax<3&&!nOk(n))continue;if(relax>=3&&!(nOk(n)||nOk(n-1)||nOk(n+1)))continue;
   if(relax<1&&A.nm==='best'&&best.length&&!best.includes(n))continue;if(relax<1&&A.nm==='rec'&&rec.length&&!rec.includes(n)&&!best.includes(n))continue}
  if(relax<2&&played.has(g.id))continue;
  const age=M.age||+g.age||0;if(relax<2&&A.ag&&A.ag!=='99'&&age>+A.ag)continue;
  if(relax<2&&A.lg&&A.lg!=='4'&&M.lang!=null&&M.lang>+A.lg)continue;
  // --- punteggio
  let s=0;const why=[];const pt=gPt(g)||+g.maxT||60,w=M.w;
  if(n){if(best.includes(n)){s+=3;why.push(`ideale in ${n}`)}else if(rec.includes(n)){s+=1.5;why.push(`va bene in ${n}`)}else if(nOk(n))why.push(`si gioca in ${n}`);else{s-=3;why.push(`pensato per ${pRange(g)}`)}}
  if(lim){if(pt<=lim){s+=lim>=999?1:2.5;why.push(`circa ${pt} min`)}else if(pt<=lim*1.3){s+=0.5;why.push(`circa ${pt} min, poco più del previsto`)}else s-=4}
  const co=isCoop(g)||M.inter===0;if(A.k){if((A.k==='co')===co){s+=3;why.push(co?'si gioca insieme':'uno contro l\'altro')}else s-=5}
  if(A.a){const t=CATM[A.a];const hit=(t.c||[]).some(c=>cat.has(c))||(t.s||[]).some(c=>sub.has(c))||(t.m||[]).some(c=>mech.has(c))||(A.a==='strat'&&w>=2.6);if(hit){s+=3;why.push(CTXT[A.a])}else s-=1}
  const tw=A.w?+A.w:A.e?({1:1.5,2:2.3,3:3.2})[A.e]:null;
  if(tw&&w){const d=Math.abs(w-tw);s+=2.5-2*d;if(d<=0.5)why.push(w<1.8?'regole semplici':w<2.6?'regole medie':w<3.3?'abbastanza impegnativo':'impegnativo')}
  else if(tw&&!w&&A.e==='1'&&(+g.age||10)<=8)s+=0.5;
  if(A.m){const hit=A.m.filter(k=>CMECH[k].some(x=>mech.has(x)));s+=Math.min(6,hit.length*2.5);if(hit.length)why.push(hit.map(k=>CQ.m.o.find(o=>o[0]===k)[1].toLowerCase()).join(' e '))}
  if(A.i&&M.inter!=null){if(+A.i===M.inter){s+=2;why.push(['nessuno scontro','interazione indiretta','interazione diretta'][M.inter])}else s-=Math.abs(+A.i-M.inter)*1.5}
  if(A.l&&M.luck!=null){if(+A.l===M.luck){s+=1.5;why.push(['poca fortuna','un po\' di fortuna','tanta fortuna'][M.luck])}else s-=Math.abs(+A.l-M.luck)}
  if(A.th){if(CTHEME[A.th].some(c=>cat.has(c))){s+=2;why.push('tema '+CQ.th.o.find(o=>o[0]===A.th)[1].toLowerCase())}}
  if(A.v){const r=Rate.avg(g.id);if(r&&r.n&&r.a){s+=(r.a-3)*1.2;if(r.a>=4)why.push(`piace ai soci (${(+r.a).toFixed(1)}⭐)`)}}
  s+=(M.avg?(M.avg-6.5)*0.3:0); // spareggio leggero: gradimento BGG
  out.push({g,s,why:why.slice(0,4)})}
 return out.sort((a,b)=>b.s-a.s||a.g.name.localeCompare(b.g.name))}
const CRELAX=['','Non c\'era niente per quel numero esatto di giocatori "ideale": ho considerato anche quelli supportati.','Ho allargato i criteri: inclusi anche giochi già giocati e meno rigidi su età e testo.','Nessun gioco esatto per quel numero di giocatori: ecco i più vicini (uno in più o in meno).'];
function cRecommend(games,meta,ps,A,me){for(let r=0;r<4;r++){const l=cScore(games,meta,ps,A,me,r);if(l.length)return{list:l.slice(0,3),relax:r}}return{list:[],relax:4}}

// --- Interfaccia
async function cWizard(mode){if(!CFLOW[mode])return;const gs=await DB.games(),ps=await DB.plays(),meta=await Meta.load();let me=null;
 try{const u=DB.remote&&await DB.remote.user();if(u){const ms=await DB.members();const m=ms.find(x=>x.userId===u.id);me=m?m.id:null}}catch(e){}
 const flow=CFLOW[mode].filter(k=>k!=='x'||ps.length).filter(k=>k!=='v'||(window.Rate&&gs.some(g=>(Rate.avg(g.id)||{}).n))).filter(k=>!(k==='x'&&!me)||true);
 const A={};let i=0;
 const head=()=>`<div class="cwz-top"><button class="cwz-back" id="cwb" aria-label="Indietro">← ${i?'Indietro':'Giochi'}</button><span class="muted">${mode==='s'?'Consigliami tu':'Scelta nei dettagli'} · ${Math.min(i+1,flow.length)}/${flow.length}</span></div><div class="cwz-bar"><span style="width:${Math.round(i/flow.length*100)}%"></span></div>`;
 const step=()=>{if(i>=flow.length)return result();const k=flow[i],q=CQ[k];let o=q.o;if(k==='x'&&!me)o=o.filter(x=>x[0]!=='me');
  V.innerHTML=`<div class="cwz">${head()}<h2 id="cwq" tabindex="-1">${esc(q.t)}</h2>${q.multi?`<p class="muted">Scegline fino a ${q.multi}, poi «Avanti». Puoi anche saltare.</p>`:''}
  <div class="cwz-opts${o.length>6?' many':''}" role="${q.multi?'group':'radiogroup'}" aria-labelledby="cwq">${o.map(([v,l])=>`<button class="cwz-o" data-v="${esc(v)}" ${q.multi?`aria-pressed="${(A[k]||[]).includes(v)}"`:''}>${esc(l)}</button>`).join('')}</div>
  ${q.multi?`<button class="p cwz-next" id="cwn">Avanti →</button>`:''}</div>`;
  $('#cwq').focus();$('#cwb').onclick=()=>{if(!i)return go('ludoteca');i--;step()};
  V.querySelectorAll('.cwz-o').forEach(b=>b.onclick=()=>{const v=b.dataset.v;if(!q.o.some(x=>x[0]===v))return;
   if(q.multi){const a=A[k]=A[k]||[];const j=a.indexOf(v);if(j>=0)a.splice(j,1);else if(a.length<q.multi)a.push(v);else return toast(`Massimo ${q.multi}`);b.setAttribute('aria-pressed',a.includes(v))}
   else{A[k]=v;i++;step()}});
  if($('#cwn'))$('#cwn').onclick=()=>{i++;step()}};
 const result=()=>{const R=cRecommend(gs,meta,ps,cValid(A),me);
  V.innerHTML=`<div class="cwz">${head()}<h2>🎯 Ecco cosa vi consiglio</h2>${R.relax&&R.relax<4?`<p class="cwz-note">ℹ️ ${esc(CRELAX[R.relax])}</p>`:''}
  ${R.list.length?R.list.map((r,j)=>`<div class="card cwz-r"><div class="row"><b>${['🥇','🥈','🥉'][j]} ${esc(r.g.name)}</b><span class="muted" style="flex:0 0 auto">👥 ${pRange(r.g)} · ⏱ ~${gPt(r.g)} min</span></div>
   <p class="cwz-why">${esc(r.why.length?r.why.join(' · ').replace(/^./,c=>c.toUpperCase()):'Una buona scelta per voi')}</p>
   <div class="cwz-btns"><button data-see="${esc(r.g.id)}">📖 Vedi scheda</button><button class="p" data-book="${esc(r.g.id)}">📅 Prenota un tavolo con questo</button></div></div>`).join('')
   :'<p class="muted">Non ho trovato giochi adatti nemmeno allargando i criteri. Provate a cambiare qualche risposta.</p>'}
  <div class="cwz-btns"><button id="cwr">🔄 Rifai le domande</button><button id="cwg">Torna ai giochi</button></div></div>`;
  $('#cwb').onclick=()=>{i=flow.length-1;step()};$('#cwr').onclick=()=>{for(const k in A)delete A[k];i=0;step()};$('#cwg').onclick=()=>go('ludoteca');
  V.querySelectorAll('[data-see]').forEach(b=>b.onclick=()=>{const g=gs.find(x=>x.id===b.dataset.see);if(g)gamePage(g,ps)});
  V.querySelectorAll('[data-book]').forEach(b=>b.onclick=()=>cBook(b.dataset.book))};
 step()}
// apre l'Agenda con il gioco già scelto nel modulo "nuovo tavolo"
function cBook(id){if(typeof id!=='string'||id.length>40)return;go('serata');let n=0;const t=setInterval(()=>{const s=$('#tg');if(s||++n>40){clearInterval(t);if(!s)return;if([...s.options].some(o=>o.value===id)){s.value=id;s.dispatchEvent(new Event('change'))}
 const d=s.closest('details');if(d)d.open=true;s.scrollIntoView({block:'center'});toast('Scegli la data e apri il tavolo')}},50)}
// pulsanti in cima al tab Giochi
(()=>{const _l=views.ludoteca;views.ludoteca=async function(...a){await _l.apply(this,a);const h=V.querySelector('h2');if(!h)return;
 h.insertAdjacentHTML('afterend',`<div class="card cwz-cta"><b>🎯 Non sapete cosa giocare?</b><span class="muted">Rispondete a qualche domanda e vi proponiamo 3 giochi.</span><div class="cwz-btns"><button class="p" id="cws">Consigliami tu</button><button id="cwx">Voglio scegliere nei dettagli</button></div></div>`);
 $('#cws').onclick=()=>cWizard('s');$('#cwx').onclick=()=>cWizard('x')}})();
// dopo "Aggiungi gioco": chiede alla Edge Function i dati extra BGG (solo staff; se fallisce restano "in arrivo")
async function cFetchMeta(gameId){const c=DB.remote&&DB.remote.client;if(!c||DB.mode!=='online'||typeof gameId!=='string')return'skip';
 try{const {data,error}=await c.functions.invoke('bgg-meta',{body:{game_id:gameId}});if(error||!data||data.status!=='ok')return'pending';Meta.map=null;return'ok'}catch(e){return'pending'}}
