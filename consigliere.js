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
  // --- punteggio: ogni motivo è {k:tipo, p:forza, ...dettagli}; le frasi le scrive cPhrase
  let s=0;const why=[],miss=[];const pt=gPt(g)||+g.maxT||60,w=M.w,add=(k,p,d)=>why.push(Object.assign({k,p},d||{}));
  if(n){if(best.includes(n)){s+=3;add('pl',3,{n,lv:'best'})}else if(rec.includes(n)){s+=1.5;add('pl',1.5,{n,lv:'rec'})}else if(nOk(n))add('pl',0.3,{n,lv:'ok'});else{s-=3;miss.push('n')}}
  if(lim){if(pt<=lim){s+=lim>=999?1:2.5;add('dur',lim>=999?0.8:2.2,{pt,lim})}else if(pt<=lim*1.3){s+=0.5;add('dur',0.2,{pt,lim,over:1});miss.push('t')}else{s-=4;miss.push('t')}}
  const co=isCoop(g)||M.inter===0;if(A.k){if((A.k==='co')===co){s+=3;add(co?'co':'cp',2.6)}else{s-=5;miss.push('k')}}
  if(A.a){const t=CATM[A.a];const hit=(t.c||[]).some(c=>cat.has(c))||(t.s||[]).some(c=>sub.has(c))||(t.m||[]).some(c=>mech.has(c))||(A.a==='strat'&&w>=2.6);if(hit){s+=3;add('atm',2.8,{a:A.a})}else{s-=1;miss.push('a')}}
  const tw=A.w?+A.w:A.e?({1:1.5,2:2.3,3:3.2})[A.e]:null;
  if(tw&&w){const d=Math.abs(w-tw);s+=2.5-2*d;if(d<=0.5)add('wt',2-d*2,{w})}
  else if(tw&&!w&&A.e==='1'&&(+g.age||10)<=8)s+=0.5;
  if(A.m){const hit=A.m.filter(k=>CMECH[k].some(x=>mech.has(x)));s+=Math.min(6,hit.length*2.5);if(hit.length)add('mech',2.4+hit.length*0.4,{m:hit.map(k=>CMNAME[k]),ma:hit.map(k=>CMART[k])})}
  if(A.i&&M.inter!=null){if(+A.i===M.inter){s+=2;add('inter',1.8,{v:M.inter})}else s-=Math.abs(+A.i-M.inter)*1.5}
  if(A.l&&M.luck!=null){if(+A.l===M.luck){s+=1.5;add('luck',1.4,{v:M.luck})}else s-=Math.abs(+A.l-M.luck)}
  if(A.th){if(CTHEME[A.th].some(c=>cat.has(c))){s+=2;add('th',2,{t:A.th})}}
  if(A.lg&&A.lg!=='4'&&M.lang!=null&&M.lang<=+A.lg)add('lang',M.lang===0?1.2:0.6,{v:M.lang});
  if(A.ag&&A.ag!=='99'&&age&&age<=+A.ag)add('age',0.9,{age});
  if(A.v){const r=Rate.avg(g.id);if(r&&r.n&&r.a){s+=(r.a-3)*1.2;if(r.a>=4)add('vote',1.6+(r.a-4),{a:+r.a,c:r.n})}}
  if(!ps.some(p=>p.gameId===g.id))add("new",A.x?1.2:0.4);
  s+=(M.avg?(M.avg-6.5)*0.3:0); // spareggio leggero: gradimento BGG
  out.push({g,s,why,miss,pt,w,mech:[...mech],cat:[...cat],best})}
 return out.sort((a,b)=>b.s-a.s||a.g.name.localeCompare(b.g.name))}
// --- Motivazioni: frasi varie e deterministiche (stesse risposte → stesse frasi), mai ripetute nella stessa terna
const CMNAME={wp:'piazzamento lavoratori',deck:'costruzione del mazzo',area:'controllo di aree',draft:'draft di carte',tile:'piazzamento tessere',set:'collezione di set',auct:'aste',dice:'dadi',push:'rischia o fermati',net:'rotte e collegamenti',pow:'poteri diversi',hid:'ruoli nascosti e bluff',neg:'trattative',team:'gioco a squadre'};
const CMIT={'Melding and Splaying':'la combinazione di carte','Worker Placement':'il piazzamento dei lavoratori','Deck, Bag, and Pool Building':'la costruzione del mazzo','Area Majority / Influence':'la lotta per le maggioranze','Open Drafting':'la scelta delle carte','Closed Drafting':'il draft di carte','Tile Placement':'il piazzamento di tessere','Set Collection':'la collezione di set','Auction / Bidding':'le aste','Dice Rolling':'i lanci di dadi','Push Your Luck':'il «rischia o fermati»','Network and Route Building':'la costruzione di rotte','Variable Player Powers':'i poteri diversi per ognuno','Hidden Roles':'i ruoli nascosti','Betting and Bluffing':'il bluff','Deduction':'la deduzione','Negotiation':'le trattative','Trading':'gli scambi','Team-Based Game':'il gioco a squadre','Pattern Building':'la composizione di schemi','Grid Coverage':'il riempimento della griglia','Simultaneous Action Selection':'le scelte simultanee','Take That':'i dispetti agli avversari','Cooperative Game':'la collaborazione','Real-Time':'la corsa contro il tempo','Trick-taking':'le prese','Memory':'la memoria','Race':'la corsa al traguardo','Contracts':'i contratti da completare','Communication Limits':'la comunicazione limitata','Action Queue':'la programmazione delle azioni','Hand Management':'la gestione della mano','Enclosure':'il recinto di territori','Acting':'la recitazione','Paper-and-Pencil':'carta e matita','Track Movement':'la corsa su percorso','Modular Board':'il tabellone modulare'};
const CMPRI=['Worker Placement','Deck, Bag, and Pool Building','Area Majority / Influence','Hidden Roles','Deduction','Push Your Luck','Tile Placement','Network and Route Building','Trick-taking','Real-Time','Communication Limits','Auction / Bidding','Pattern Building','Grid Coverage','Negotiation','Betting and Bluffing','Closed Drafting','Open Drafting','Set Collection','Take That','Dice Rolling','Variable Player Powers','Contracts','Race','Memory','Acting','Enclosure','Simultaneous Action Selection','Action Queue','Hand Management'];
const CCIT={'Economic':'economia','Fantasy':'fantasy','Science Fiction':'fantascienza','Civilization':'civiltà','City Building':'costruzione di città','Medieval':'Medioevo','Ancient':'mondo antico','Farming':'vita di campagna','Renaissance':'Rinascimento','Territory Building':'conquista di territori','Fighting':'combattimento','Mythology':'mitologia','Animals':'animali','Industry / Manufacturing':'industria','Space Exploration':'esplorazione spaziale','Nautical':'mare e navi','Adventure':'avventura','Environmental':'natura','Exploration':'esplorazione','Horror':'horror','Zombies':'zombie','Pirates':'pirati','Trains':'treni','Racing':'corse','Sports':'sport','Mafia':'malavita','Spies / Secret Agents':'spionaggio','Political':'politica','Wargame':'guerra','Aviation / Flight':'aviazione',};
const CTHN={fan:'fantasy',sf:'fantascienza',hist:'storico',eco:'economico',nat:'natura e animali',hor:'horror',war:'battaglie',abs:'astratto'};
const CATN={party:['risate','divertimento leggero','serate allegre'],strat:['strategia','pianificazione','scelte ragionate'],bluff:['bluff','sospetti e deduzioni','facce da poker'],adv:['avventura','esplorazione','storie da vivere']};
const cPrep=(p,x)=>x.replace(/^(il|lo|la|i|gli|le|l')\s?/,(m,a)=>({a:{il:'al ',lo:'allo ',la:'alla ',i:'ai ',gli:'agli ',le:'alle ',"l'":"all'"},di:{il:'del ',lo:'dello ',la:'della ',i:'dei ',gli:'degli ',le:'delle ',"l'":"dell'"},su:{il:'sul ',lo:'sullo ',la:'sulla ',i:'sui ',gli:'sugli ',le:'sulle ',"l'":"sull'"}})[p][a]);
const CMART={wp:'il piazzamento lavoratori',deck:'la costruzione del mazzo',area:'il controllo di aree',draft:'il draft di carte',tile:'il piazzamento di tessere',set:'la collezione di set',auct:'le aste',dice:'i dadi',push:'il «rischia o fermati»',net:'le rotte da collegare',pow:'i poteri diversi per ognuno',hid:'i ruoli nascosti',neg:'le trattative',team:'il gioco a squadre'};
const cAnd=a=>a.length>1?a.slice(0,-1).join(', ')+' e '+a[a.length-1]:a[0];
const cMin=m=>m>=90?(m%60?`un'ora e ${m%60} minuti`:m/60+' ore'):m===60?'un\'ora':m+' minuti';
const cWt=w=>w<1.6?'leggerissimo':w<2.1?'leggero':w<2.7?'di peso medio':w<3.3?'piuttosto corposo':'impegnativo';
// T[tipo] = [frasi complete], C[tipo] = [code minuscole da agganciare]; d = dettagli motivo, G = dettagli del gioco
const CT={
 pl:[(d,G)=>d.n===1?'Funziona benissimo anche in solitario.':d.lv==='best'?`In ${d.n} dà il meglio di sé, parola di chi ci ha giocato su BGG.`:`In ${d.n} funziona bene.`,
  (d,G)=>d.n===1?'Ideale per una partita da soli.':d.lv==='best'?`Per un tavolo da ${d.n}, ${G.name} è perfetto.`:`In ${d.n} gira senza problemi.`,
  (d,G)=>d.n===1?'Da soli è una sfida bellissima.':d.lv==='best'?`Siete in ${d.n}? È la sua formazione ideale.`:`Per ${d.n} è una scelta solida.`,
  (d,G)=>d.n===1?'Il solitario è uno dei suoi punti forti.':d.lv==='best'?`Il tavolo da ${d.n} è quello dove brilla di più.`:`Regge bene anche in ${d.n}.`,
  (d,G)=>d.n===1?'Per giocare da soli è perfetto.':d.lv==='best'?`Con ${d.n} persone esprime tutto il suo potenziale.`:`Con ${d.n} persone fila liscio.`,
  (d,G)=>d.n===1?'Chi gioca in solitario lo adora.':d.lv==='best'?`Chi lo conosce lo consiglia proprio in ${d.n}.`:`Si adatta bene a un gruppo da ${d.n}.`],
 dur:[(d,G)=>`Una partita dura circa ${cMin(d.pt)}${d.over?', appena oltre il vostro tempo':''}.`,
  (d,G)=>d.lim>=999?`Con circa ${cMin(d.pt)} a partita, avete tempo anche per la rivincita.`:`In ${cMin(d.pt)} si chiude, quindi ci state comodi.`,
  (d,G)=>`Bastano ${cMin(d.pt)} per arrivare alla fine.`,
  (d,G)=>`Si apre, si gioca e si chiude in ${cMin(d.pt)}.`,
  (d,G)=>d.pt<=30?`È rapido: ${cMin(d.pt)} e via, magari ne fate due.`:`Occupa ${cMin(d.pt)}, senza trascinarsi.`,
  (d,G)=>`I ${d.pt} minuti volano.`],
 co:[(d,G)=>'Qui si vince o si perde tutti insieme.',(d,G)=>'Nessuno resta indietro: il nemico è il gioco stesso.',(d,G)=>'Perfetto per fare squadra e discutere ogni mossa.',
  (d,G)=>`${G.name} vi mette dalla stessa parte del tavolo.`,(d,G)=>'Collaborare è l\'unico modo per farcela.',(d,G)=>'Niente rivalità: si ragiona e si festeggia in gruppo.'],
 cp:[(d,G)=>'Ognuno per sé, e alla fine uno solo esulta.',(d,G)=>'Sfida vera: preparatevi a contendervi la vittoria.',(d,G)=>'Un bel testa a testa, dove ogni punto conta.',
  (d,G)=>`${G.name} vi mette uno contro l'altro, con stile.`,(d,G)=>'Per chi ama la competizione sana.',(d,G)=>'Qui si gioca per vincere, e si vede.'],
 atm:[(d,G)=>`Ha proprio il sapore che cercate: ${CATN[d.a][0]}.`,(d,G)=>`Se volete ${CATN[d.a][1]}, qui ne trovate a volontà.`,(d,G)=>`È fatto apposta per ${CATN[d.a][2]}.`,
  (d,G)=>`Atmosfera giusta: ${CATN[d.a][0]} dall'inizio alla fine.`,(d,G)=>`Uno dei titoli più adatti a ${CATN[d.a][1]} della nostra ludoteca.`,(d,G)=>`Punta tutto su ${CATN[d.a][2]}, proprio come chiedete.`],
 wt:[(d,G)=>d.w<2.7?`È ${cWt(d.w)}: regole che si spiegano senza fatica.`:`È ${cWt(d.w)}, ma ripaga ogni minuto di ragionamento.`,
  (d,G)=>`Complessità ${d.w.toFixed(1).replace('.',',')} su 5, giusta per il vostro livello.`,
  (d,G)=>d.w<2.2?'Si impara in cinque minuti e diverte subito.':d.w<3?'Ha regole di media complessità, senza mal di testa.':'Ha profondità da vendere per chi gioca spesso.',
  (d,G)=>`Il peso è quello che fa per voi: ${cWt(d.w)}.`,
  (d,G)=>d.w<2.2?'Anche chi gioca poco entra subito in partita.':'Vi darà qualcosa su cui ragionare, senza esagerare.',
  (d,G)=>`Sulla bilancia di BGG pesa ${d.w.toFixed(1).replace('.',',')}: il vostro punto giusto.`],
 mech:[(d,G)=>`Ha ${cAnd(d.ma)}, come piace a voi.`,(d,G)=>`${d.ma[0].replace(/^./,c=>c.toUpperCase())} ${/^(i|le|gli) /.test(d.ma[0])?'sono':'è'} al centro di tutto.`,
  (d,G)=>`Se cercate ${cAnd(d.ma)}, qui siete a casa.`,(d,G)=>d.m.length>1?`Unisce ${cAnd(d.ma)}: proprio quello che avete chiesto.`:`Ruota tutto attorno ${cPrep('a',d.ma[0])}.`,
  (d,G)=>`Meccanica preferita in primo piano: ${d.m[0]}.`,(d,G)=>`Spunta la casella «${d.m[0]}» della vostra lista.`],
 inter:[(d,G)=>['Niente attacchi: si costruisce in pace.','Ognuno per la sua strada, ma attenti a chi vi ruba la mossa.','Dispetti e scontri diretti non mancano.'][d.v],
  (d,G)=>['Zero cattiverie tra giocatori.','L\'interazione è indiretta: si compete senza litigare.','Preparatevi a colpire e a essere colpiti.'][d.v],
  (d,G)=>['Il clima resta tranquillo, senza attacchi.','Si gioca fianco a fianco, rubandosi le occasioni.','Si interagisce eccome: è un gioco di scontro.'][d.v]],
 luck:[(d,G)=>['Conta la testa, non la fortuna.','Un pizzico di fortuna tiene viva la partita.','La fortuna regna sovrana: risate garantite.'][d.v],
  (d,G)=>['Decidete voi, i dadi c\'entrano poco.','Un po\' di caso, ma vince chi ragiona.','Tutto può cambiare all\'ultimo tiro.'][d.v],
  (d,G)=>['Pochissimo spazio al caso.','Fortuna e strategia ben dosate.','Il caso rimescola sempre le carte.'][d.v]],
 th:[(d,G)=>`Tema ${CTHN[d.t]}, come avete chiesto.`,(d,G)=>`Vi porta in un mondo ${CTHN[d.t]}.`,(d,G)=>`L'ambientazione ${CTHN[d.t]} è curata.`,(d,G)=>`Per gli amanti del ${CTHN[d.t]}.`.replace('del fantascienza','della fantascienza').replace('del natura','della natura').replace('del battaglie','delle battaglie')],
 lang:[(d,G)=>d.v===0?'Non c\'è testo da leggere: va bene per chiunque.':'Il testo sui componenti è poco.',(d,G)=>d.v===0?'Niente da leggere, nessuno resta fuori.':'Serve poca lettura.'],
 age:[(d,G)=>`Dai ${d.age} anni in su: va bene anche per i più giovani.`,(d,G)=>`Adatto dai ${d.age} anni, quindi tutti possono giocare.`],
 vote:[(d,G)=>`Ai soci piace tanto: ${d.a.toFixed(1).replace('.',',')}⭐.`,(d,G)=>`Al circolo ha ottimi voti: ${d.a.toFixed(1).replace('.',',')} su 5.`,(d,G)=>`Uno dei preferiti dei soci (${d.a.toFixed(1).replace('.',',')}⭐).`],
 new:[(d,G)=>'Al circolo non l\'ha ancora giocato nessuno: tocca a voi inaugurarlo.',(d,G)=>'Ancora intonso al circolo, è il momento giusto.',(d,G)=>'Una novità per tutti: nessuna partita registrata finora.']};
const CC={
 pl:[d=>d.n===1?'ottimo in solitario':d.lv==='best'?`ideale in ${d.n}`:`ottimo in ${d.n}`,d=>d.lv==='best'?`perfetto per ${d.n}`:`adatto a ${d.n}`,d=>d.n===1?'anche da soli':`pensato per tavoli da ${d.n}`],
 dur:[d=>`in circa ${cMin(d.pt)}`,d=>`e si chiude in ${d.pt} minuti`,d=>`senza superare ${cMin(d.pt)}`],
 co:[()=>'tutti dalla stessa parte',()=>'giocando in squadra',()=>'collaborando'],
 cp:[()=>'con una bella sfida',()=>'uno contro l\'altro',()=>'tra rivali'],
 atm:[d=>`con tanto ${CATN[d.a][0]}`.replace('tanto avventura','tanta avventura').replace('tanto strategia','tanta strategia'),d=>`con ${CATN[d.a][1]} a volontà`,d=>`fatto per ${CATN[d.a][2]}`],
 wt:[d=>`con regole ${d.w<2.2?'leggere':d.w<3?'medie':'profonde'}`,d=>`${cWt(d.w)} al punto giusto`,d=>`con un peso di ${d.w.toFixed(1).replace('.',',')} su 5`],
 mech:[d=>`basato ${cPrep('su',d.ma[0])}`,d=>`con ${cAnd(d.ma)}`,d=>`tutto giocato ${cPrep('su',d.ma[0])}`],
 inter:[d=>['senza attacchi','con interazione indiretta','con tanti scontri diretti'][d.v],d=>['in pace','con qualche sgambetto','con colpi diretti'][d.v]],
 luck:[d=>['quasi senza fortuna','con un po\' di fortuna','con tanta fortuna'][d.v],d=>['dove conta la testa','con un pizzico di caso','dove il caso domina'][d.v]],
 th:[d=>`ambientato in un mondo ${CTHN[d.t]}`,d=>`con tema ${CTHN[d.t]}`],
 lang:[d=>d.v===0?'senza testo da leggere':'con poco testo'],age:[d=>`dai ${d.age} anni`],
 vote:[d=>`e i soci lo adorano (${d.a.toFixed(1).replace('.',',')}⭐)`],new:[()=>'e nessuno l\'ha ancora provato']};
const COPEN=['','','Ottima scelta: ','Andate sul sicuro: ','Da provare: ','Fa per voi: ','Bella pensata: ','Ve lo consiglio: ','Colpo sicuro: ','Occhio a questo: '];
// dettaglio del gioco (meccanica principale, categoria, numero ideale) per rendere la frase unica
const CDET=[G=>G.mm&&`Il cuore del gioco? ${G.mm.replace(/^./,c=>c.toUpperCase())}.`,G=>G.ct&&`Tema: ${G.ct}.`,G=>G.mm&&`Occhio ${cPrep('a',G.mm)}: è lì che si vince.`,G=>G.ct&&`Ambientazione: ${G.ct}.`,G=>G.mm&&`Da non perdere: ${G.mm}.`,G=>G.ct&&`Piacerà a chi ama le ambientazioni a tema ${G.ct}.`];
function cHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function cPhrase(list,A){const seed=JSON.stringify(A),used=new Set(),pick=(arr,key,h)=>{for(let j=0;j<arr.length;j++){const i=(h+j)%arr.length;if(!used.has(key+i)){used.add(key+i);return arr[i]}}return arr[h%arr.length]};
 list.forEach((r,ix)=>{const g=r.g,h=cHash(seed+'|'+g.id),mm=CMPRI.find(m=>r.mech.includes(m)),ct=r.cat.map(c=>CCIT[c]).find(Boolean);
  const G={name:g.name,mm:mm&&CMIT[mm],ct};
  const R=[...r.why].sort((a,b)=>b.p-a.p||a.k.localeCompare(b.k));
  // 1° motivo: il più forte, ma se lo stesso tipo è già stato il primo di un risultato precedente si prova il successivo (varietà)
  let a=R[0];if(a&&ix&&list.slice(0,ix).some(x=>x._k===a.k)&&R[1]&&R[1].p>=a.p-1.2)a=R[1];r._k=a&&a.k;
  const b=R.find(x=>x!==a&&x.p>=0.8&&x.k!=='new'&&!(a&&a.k==='co'&&x.k==='inter'))||R.find(x=>x!==a&&x.p>=0.4);
  let txt='';
  if(!a){txt=pick(CDET,'det',h)(G)||`${G.name}: una scelta che non delude.`}
  else{const op0=pick(COPEN,'op',h>>>3);let main=pick(CT[a.k]||[()=>''],a.k+'T',h>>>5)(a,G);const op=/[:?]/.test(main)?'':op0;
   const mode=(h>>>9)%3; // 0: due frasi, 1: frase + coda, 2: frase + dettaglio gioco
   let extra='';
   if(b&&mode!==2&&mode===1&&CC[b.k]){const tail=pick(CC[b.k],b.k+'C',h>>>11)(b);extra=main.replace(/[.!]$/,'')+', '+tail.replace(/^e /,'')+'.';}
   if(extra)txt=op+extra;else{txt=op+main;const sec=b&&mode===0?pick(CT[b.k],b.k+'T',h>>>13)(b,G):(pick(CDET,'det',h>>>15)(G)||(b?pick(CT[b.k],b.k+'T',h>>>13)(b,G):''));if(sec)txt+=' '+sec}
   if(op){const rest=txt.slice(op.length);const keep=/^\d/.test(rest)||rest.startsWith(G.name);txt=op+(keep?rest:rest.charAt(0).toLowerCase()+rest.slice(1))}}
  r.txt=sanitizeShort(txt.replace(/\s+/g,' ').trim().replace(/^./,c=>c.toUpperCase()),220);
  r.warn=cMissOne(r,A)})}
function sanitizeShort(s,n){s=String(s).replace(/[<>"`]/g,'');return s.length>n?s.slice(0,n-1)+'…':s}
const CMISS={n:r=>`non è pensato esattamente per il vostro numero (${pRange(r.g)})`,t:r=>`dura un po' di più (~${r.pt} min)`,k:(r,A)=>A.k==='co'?'non è cooperativo':'è cooperativo, non competitivo',a:()=>'l\'atmosfera è un po\' diversa'};
function cMissOne(r,A){if(!r.miss.length)return'';const t=r.miss.map(k=>CMISS[k](r,A));return'Attenzione: '+t.join(' e ')+'.'}
function cMissNote(list,A){if(!list.length||!list.every(r=>r.miss.length))return list.some(r=>r.miss.length)?'Non tutti i consigli rispettano ogni criterio: dove manca qualcosa ve lo segnalo.':'';
 const n=+A.n,tl={30:'in meno di 30 minuti',60:'entro un\'ora',120:'in 1–2 ore'}[A.t]||'',kw=A.k==='co'?'cooperativo':A.k==='cp'?'competitivo':'gioco adatto',an=A.a?{party:'da party',strat:'strategico',bluff:'di bluff',adv:'d\'avventura'}[A.a]:'';
 const req=['Nessun',kw==='gioco adatto'&&an?'gioco '+an:kw+(an&&kw!=='gioco adatto'?' '+an:''),n?'per '+(n===8?'8 o più':n):'',tl].filter(Boolean).join(' ');
 return sanitizeShort(req+': ecco i più vicini.',200)}
const CRELAX=['','Non c\'era niente per quel numero esatto di giocatori "ideale": ho considerato anche quelli supportati.','Ho allargato i criteri: inclusi anche giochi già giocati e meno rigidi su età e testo.','Nessun gioco esatto per quel numero di giocatori: ecco i più vicini (uno in più o in meno).'];
function cRecommend(games,meta,ps,A,me){for(let r=0;r<4;r++){const l=cScore(games,meta,ps,A,me,r);if(l.length){const list=l.slice(0,3);cPhrase(list,A);return{list,relax:r,notes:[CRELAX[r],cMissNote(list,A)].filter(Boolean)}}}return{list:[],relax:4,notes:[]}}

// --- Interfaccia
// v28: due modalità, scelte DOPO «Consigliami tu» (ex "semplice" = Al volo, ex "dettagliato" = Su misura)
const CMODE={s:{n:'Al volo ⚡',d:'Poche domande veloci e via: tre giochi pronti da mettere in tavola.'},x:{n:'Su misura 🎯',d:'Qualche domanda in più su gusti e meccaniche, per il gioco cucito addosso a voi.'}};
function cChoose(){V.innerHTML=`<div class="cwz"><div class="cwz-top"><button class="cwz-back" id="cwb" aria-label="Torna ai giochi">← Giochi</button><span class="muted">Consigliami tu</span></div>
 <h2 id="cwq" tabindex="-1">Come preferite che vi consigli?</h2><div class="cwz-modes" role="group" aria-labelledby="cwq">${Object.entries(CMODE).map(([k,m])=>`<button class="cwz-mode" data-m="${esc(k)}"><b>${esc(m.n)}</b><span>${esc(m.d)}</span></button>`).join('')}</div></div>`;
 $('#cwq').focus();$('#cwb').onclick=()=>go('ludoteca');V.querySelectorAll('.cwz-mode').forEach(b=>b.onclick=()=>{const m=b.dataset.m;if(Object.prototype.hasOwnProperty.call(CMODE,m))cWizard(m)})}
async function cWizard(mode){if(!CFLOW[mode])return;const gs=await DB.games(),ps=await DB.plays(),meta=await Meta.load();let me=null;
 try{const u=DB.remote&&await DB.remote.user();if(u){const ms=await DB.members();const m=ms.find(x=>x.userId===u.id);me=m?m.id:null}}catch(e){}
 const flow=CFLOW[mode].filter(k=>k!=='x'||ps.length).filter(k=>k!=='v'||(window.Rate&&gs.some(g=>(Rate.avg(g.id)||{}).n))).filter(k=>!(k==='x'&&!me)||true);
 const A={};let i=0;
 const head=()=>`<div class="cwz-top"><button class="cwz-back" id="cwb" aria-label="Indietro">← ${i?'Indietro':'Modalità'}</button><span class="muted">${esc(CMODE[mode].n)} · ${Math.min(i+1,flow.length)}/${flow.length}</span></div><div class="cwz-bar"><span style="width:${Math.round(i/flow.length*100)}%"></span></div>`;
 const step=()=>{if(i>=flow.length)return result();const k=flow[i],q=CQ[k];let o=q.o;if(k==='x'&&!me)o=o.filter(x=>x[0]!=='me');
  V.innerHTML=`<div class="cwz">${head()}<h2 id="cwq" tabindex="-1">${esc(q.t)}</h2>${q.multi?`<p class="muted">Scegline fino a ${q.multi}, poi «Avanti». Puoi anche saltare.</p>`:''}
  <div class="cwz-opts${o.length>6?' many':''}" role="${q.multi?'group':'radiogroup'}" aria-labelledby="cwq">${o.map(([v,l])=>`<button class="cwz-o" data-v="${esc(v)}" ${q.multi?`aria-pressed="${(A[k]||[]).includes(v)}"`:''}>${esc(l)}</button>`).join('')}</div>
  ${q.multi?`<button class="p cwz-next" id="cwn">Avanti →</button>`:''}</div>`;
  $('#cwq').focus();$('#cwb').onclick=()=>{if(!i)return cChoose();i--;step()};
  V.querySelectorAll('.cwz-o').forEach(b=>b.onclick=()=>{const v=b.dataset.v;if(!q.o.some(x=>x[0]===v))return;
   if(q.multi){const a=A[k]=A[k]||[];const j=a.indexOf(v);if(j>=0)a.splice(j,1);else if(a.length<q.multi)a.push(v);else return toast(`Massimo ${q.multi}`);b.setAttribute('aria-pressed',a.includes(v))}
   else{A[k]=v;i++;step()}});
  if($('#cwn'))$('#cwn').onclick=()=>{i++;step()}};
 const result=()=>{const R=cRecommend(gs,meta,ps,cValid(A),me);
  V.innerHTML=`<div class="cwz">${head()}<h2>🎯 Ecco cosa vi consiglio</h2>${R.notes.map(x=>`<p class="cwz-note">ℹ️ ${esc(x)}</p>`).join('')}
  ${R.list.length?R.list.map((r,j)=>`<div class="card cwz-r"><div class="row"><b>${['🥇','🥈','🥉'][j]} ${esc(r.g.name)}</b><span class="muted" style="flex:0 0 auto">👥 ${pRange(r.g)} · ⏱ ~${gPt(r.g)} min</span></div>
   <p class="cwz-why">${esc(r.txt)}</p>${r.warn?`<p class="cwz-miss">⚠️ ${esc(r.warn)}</p>`:''}
   <div class="cwz-btns"><button data-see="${esc(r.g.id)}">📖 Vedi scheda</button><button class="p" data-book="${esc(r.g.id)}">📅 Prenota un tavolo con questo</button></div></div>`).join('')
   :'<p class="muted">Non ho trovato giochi adatti nemmeno allargando i criteri. Provate a cambiare qualche risposta.</p>'}
  <div class="cwz-btns"><button id="cwr">🔄 Rifai le domande</button><button id="cwm">🔀 Cambia modalità</button><button id="cwg">Torna ai giochi</button></div></div>`;
  $('#cwb').onclick=()=>{i=flow.length-1;step()};$('#cwr').onclick=()=>{for(const k in A)delete A[k];i=0;step()};$('#cwg').onclick=()=>go('ludoteca');$('#cwm').onclick=()=>cChoose();
  V.querySelectorAll('[data-see]').forEach(b=>b.onclick=()=>{const g=gs.find(x=>x.id===b.dataset.see);if(g)gamePage(g,ps)});
  V.querySelectorAll('[data-book]').forEach(b=>b.onclick=()=>cBook(b.dataset.book))};
 step()}
// apre l'Agenda con il gioco già scelto nel modulo "nuovo tavolo"
function cBook(id){if(typeof id!=='string'||id.length>40)return;go('serata');let n=0;const t=setInterval(()=>{const s=$('#tg');if(s||++n>40){clearInterval(t);if(!s)return;if([...s.options].some(o=>o.value===id)){s.value=id;s.dispatchEvent(new Event('change'))}
 const d=s.closest('details');if(d)d.open=true;s.scrollIntoView({block:'center'});toast('Scegli la data e apri il tavolo')}},50)}
// pulsanti in cima al tab Giochi
(()=>{const _l=views.ludoteca;views.ludoteca=async function(...a){await _l.apply(this,a);const h=V.querySelector('h2');if(!h)return;
 h.insertAdjacentHTML('afterend',`<div class="card cwz-cta"><b>🎯 Non sapete cosa giocare?</b><span class="muted">Rispondete a qualche domanda e vi proponiamo 3 giochi.</span><div class="cwz-btns"><button class="p" id="cws">Consigliami tu</button></div></div>`);
 $('#cws').onclick=()=>cChoose()}})();
// dopo "Aggiungi gioco": chiede alla Edge Function i dati extra BGG (solo staff; se fallisce restano "in arrivo")
async function cFetchMeta(gameId){const c=DB.remote&&DB.remote.client;if(!c||DB.mode!=='online'||typeof gameId!=='string')return'skip';
 try{const {data,error}=await c.functions.invoke('bgg-meta',{body:{game_id:gameId}});if(error||!data||data.status!=='ok')return'pending';Meta.map=null;return'ok'}catch(e){return'pending'}}
