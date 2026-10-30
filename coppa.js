// v35 — "Coppa Antero": torneo svizzero 1 contro 1 o a tavoli da 3–4 negli Eventi. Abbinamenti, ranking e giochi sono calcolati dal server (RPC SECURITY DEFINER).
const CP={d:null,camp:null,
 cl(){return window.CP_CLIENT||(DB.remote&&DB.remote.client)||null},
 async rpc(n,a){const c=this.cl();if(!c)throw new Error('La Coppa richiede la connessione al database');const{data,error}=await c.rpc(n,a||{});if(error)throw error;return data},
 async load(){try{if(!this.cl())return;this.d=await this.rpc('coppa_lista')||null;const u=(this.d&&this.d.coppe||[]).find(c=>c.stato==='concluso');this.camp=u?u.campione:null}catch(e){console.warn('CP',e)}},
 pt(s,q,k){const T=s===4?[3,2,1,0]:s===3?[3,1.5,0]:[1,0];let a=0;for(let i=0;i<k;i++)a+=T[q-1+i]||0;return Math.round(a/k*10)/10},
 rom(n){const v=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];let o='';n=+n||0;for(const[a,r]of v)while(n>=a){o+=r;n-=a}return o},
 turno(t){return 'Turno '+(+t||0)},
 MISTO:false, // v35: formato misto nascosto nell'interfaccia (supportato dal DB): true per riattivarlo
 FMT:{'1v1':'1 contro 1',tavoli:'Tavoli da 3–4',misto:'Misto (2–4)','4p':'4 giocatori'},
 STATI:{bozza:'📝 Bozza',iscrizioni:'✍️ Iscrizioni aperte',in_corso:'⚔️ In corso',concluso:'👑 Conclusa'},
 // badge: stessa logica del server (member_xp)
 bstats(key){const z={cpN:0,cpPod:false,cpCamp:0,cpImb:false,cpGiant:false,cpRim:false};const d=this.d;if(!d||!String(key).startsWith('m:'))return z;const id=String(key).slice(2);
  const conc=new Map((d.coppe||[]).filter(c=>c.stato==='concluso').map(c=>[c.id,c]));
  (d.finali||[]).filter(f=>f.m===id&&conc.has(f.c)).forEach(f=>{const cc=conc.get(f.c);if(cc.formato&&cc.formato!=='1v1'){const ts=(d.tavoli||[]).filter(t=>t.c===f.c&&t.pos&&id in t.pos),w1=(d.finali||[]).find(x=>x.c===f.c&&x.pos===1);
   z.cpN++;if(f.pos<=3)z.cpPod=true;if(f.pos===1)z.cpCamp++;if(ts.length&&!ts.some(t=>+t.pos[id]!==1)&&cc.turni>=3)z.cpImb=true;
   if(w1&&w1.m!==id&&ts.some(t=>w1.m in t.pos&&+t.pos[id]<+t.pos[w1.m]))z.cpGiant=true;if(f.pos<=3&&ts.some(t=>t.t===1&&+t.pos[id]!==1))z.cpRim=true;return}
   const inc=(d.incontri||[]).filter(i=>i.c===f.c&&i.b&&(i.a===id||i.b===id)),w1=(d.finali||[]).find(x=>x.c===f.c&&x.pos===1);
   z.cpN++;if(f.pos<=3)z.cpPod=true;if(f.pos===1)z.cpCamp++;if(!inc.some(i=>i.w!==id)&&conc.get(f.c).turni>=3)z.cpImb=true;
   if(w1&&w1.m!==id&&inc.some(i=>i.w===id&&(i.a===w1.m||i.b===w1.m)))z.cpGiant=true;if(f.pos<=3&&inc.some(i=>i.t===1&&i.w!==id))z.cpRim=true});return z}};
BADGES.push(['cpart','🏆','Coppa Antero','Partecipa a una Coppa Antero',s=>s.cpN>=1],['cpod','🥉','Podio della Coppa','Chiudi tra i primi 3 una Coppa Antero',s=>!!s.cpPod],
 ['ccamp','👑','Campione della Coppa','Vinci una Coppa Antero',s=>s.cpCamp>=1],['cimb','🛡️','Imbattibile','Vinci tutti gli incontri di una Coppa (almeno 3 turni)',s=>!!s.cpImb],
 ['cgig','🪓','Ammazzagiganti','Batti chi poi vince la Coppa',s=>!!s.cpGiant],['crim','📈','Rimonta','Perdi il primo turno e chiudi sul podio',s=>!!s.cpRim],
 ['cvet','🎖️','Veterano della Coppa','Partecipa a 3 edizioni della Coppa',s=>s.cpN>=3]);
{const _bs=Badges.stats;Badges.stats=function(k,o){return Object.assign(_bs.call(this,k,o),CP.bstats(k))}}
{const _xl=XP.load.bind(XP);XP.load=async function(){await _xl();await CP.load()}}
const cpMsg=e=>String(e&&e.message||e||'Errore').replace(/^.*?ERROR:\s*/,'').slice(0,200);
async function cpCard(){if(!CP.cl())return'';if(!CP.d)await CP.load();const d=CP.d;if(!d)return'';const st=!!d.staff,c=(d.coppe||[]).filter(x=>st||x.stato!=='bozza')[0];
 if(!c)return st?`<div class="card cpc"><div class="hrow"><b>🏆 Coppa Antero</b><button class="p" id="cpnew">➕ Crea la prima edizione</button></div><p class="muted">Torneo svizzero 1 contro 1 o a tavoli da 3–4: nessun tavolo ripetuto, mai lo stesso gioco due volte.</p></div>`:'';
 return`<div class="card cpc" data-cp="${esc(c.id)}" role="button"><div class="hrow"><b>🏆 Coppa Antero ${esc(CP.rom(c.edizione))}</b><span class="evb t">${esc(CP.STATI[c.stato]||c.stato)}</span></div>
 <p class="muted">${cpDur(c)?'📅 '+esc(cpDur(c))+' · ':''}${c.stato==='in_corso'?esc(CP.turno(c.turno))+' di '+c.turni:c.turni+' turni'} · ${esc(CP.FMT[c.formato]||'1 contro 1')} · ${c.iscritti} iscritt${c.iscritti==1?'o':'i'}${c.stato==='concluso'&&c.campione?' · 👑 '+cpNome(c.campione):''}</p>
 ${st&&c.stato==='concluso'?'<button class="s" id="cpnew">➕ Nuova edizione</button>':''}</div>`}
const cpD=d=>{const x=new Date(d+'T12:00:00');return isNaN(x)?'':x.toLocaleDateString('it-IT',{day:'numeric',month:'short'})};
const cpDur=c=>c.data_inizio&&c.data_fine?`dal ${cpD(c.data_inizio)} al ${cpD(c.data_fine)}`:c.data_inizio?`dal ${cpD(c.data_inizio)}`:c.data_fine?`fino al ${cpD(c.data_fine)}`:'';
let _cpMs=[];const cpNome=id=>{const m=_cpMs.find(m=>m.id===id);return m?nmH(m):'<span class="muted">Socio</span>'};
async function cpBind(){V.querySelectorAll('[data-cp]').forEach(e=>e.onclick=ev=>{if(ev.target.closest('button'))return;window._cpId=e.dataset.cp;go('coppa')});
 const n=$('#cpnew');if(n)n.onclick=async()=>{try{const id=await CP.rpc('coppa_crea',{p_turni:3,p_pool:[],p_formato:'1v1'});await CP.load();window._cpId=id;go('coppa')}catch(e){toast(cpMsg(e))}}}
const _evv=views.eventi;views.eventi=async(...a)=>{await _evv(...a);if(window._cur!=='eventi')return;_cpMs=await DB.members();const h=await cpCard();if(!h||window._cur!=='eventi'||$('.cpc'))return;
 const at=V.querySelector('.hrow')||V.querySelector('h2');at.insertAdjacentHTML('afterend',h);cpBind()};
views.coppa=async function(){clearInterval(window._cpT);const id=window._cpId||(CP.d&&CP.d.coppe[0]||{}).id;if(!id){go('eventi');return}
 V.innerHTML='<h2>🏆 Coppa Antero</h2><p class="muted">Caricamento…</p>';
 let v,gs;try{[v,gs,_cpMs]=await Promise.all([CP.rpc('coppa_vista',{p:id}),DB.games(),DB.members()])}catch(e){V.innerHTML=`<h2>🏆 Coppa Antero</h2><p class="warn">${esc(cpMsg(e))}</p>`;return}
 if(!v||!v.coppa){V.innerHTML='<h2>🏆 Coppa Antero</h2><p class="muted">Coppa non trovata.</p>';return}
 const c=v.coppa,st=!!v.staff,me=v.me,gn=g=>esc((gs.find(x=>x.id===g)||{}).name||'Gioco'),nm=cpNome,inc=v.incontri||[],cur=c.stato==='in_corso'?c.turno:0,F=c.formato||'1v1',T1=F==='1v1',tav=v.tavoli||[];
 const lo=f=>f==='tavoli'?3:2,hi=f=>f==='1v1'?2:4,fit=(g,f)=>(+g.min||1)<=hi(f)&&(+g.max||99)>=lo(f),okG=g=>!g.coop&&!g.isExp&&fit(g,'misto'),pool=c.pool||[];
 const cfg=st&&c.stato!=='concluso'?`<details class="card" ${c.stato==='bozza'?'open':''}><summary><b>⚙️ Configurazione (staff)</b></summary>
  <label>Formato</label><div class="seg" id="cpf">${['1v1','tavoli','misto'].filter(f=>f!=='misto'||CP.MISTO||F==='misto').map(f=>`<button type="button" data-f="${f}" class="${f===F?'on':''}"${c.stato!=='bozza'?' disabled':''}>${esc(CP.FMT[f])}</button>`).join('')}</div><p class="muted" id="cpfh" style="font-size:12px"></p>
  <label>Turni (max 5)</label><select id="cpt">${[1,2,3,4,5].map(n=>`<option value="${n}"${n===c.turni?' selected':''}${n<cur?' disabled':''}>${n}</option>`).join('')}</select>
  <label>Pool di giochi <span class="muted" id="cpcnt"></span></label><input id="cpq" placeholder="Cerca gioco…">
  <div class="cppool">${gs.filter(okG).sort((a,b)=>a.name.localeCompare(b.name,'it')).map(g=>`<label class="cpg" data-mn="${+g.min||1}" data-mx="${+g.max||99}"><input type="checkbox" value="${esc(g.id)}"${pool.includes(g.id)?' checked':''}${c.stato==='in_corso'&&pool.includes(g.id)?' disabled':''}> ${esc(g.name)} <span class="muted">${+g.min||1}–${+g.max||'?'}</span></label>`).join('')}</div>
  <label>Durata <span class="muted">(facoltativa: la Coppa può durare giorni o settimane)</span></label><div class="row"><input type="date" id="cpdi" value="${esc(c.data_inizio||'')}" aria-label="Data inizio"><input type="date" id="cpdf" value="${esc(c.data_fine||'')}" aria-label="Data fine"></div>
  <label>Scadenza dei turni <span class="muted">(facoltativa)</span></label><div class="cpsc">${Array.from({length:5},(_,k)=>`<label class="cpsl"${k>=c.turni?' hidden':''}>${esc(CP.turno(k+1))}<input type="date" data-sc="${k}" value="${esc((c.scadenze||[])[k]||'')}"></label>`).join('')}</div>
  <p class="warn" id="cpwarn" hidden></p><button class="p" id="cpsave">💾 Salva configurazione</button>${c.stato!=='in_corso'?' <button class="s" id="cpdel">🗑 Elimina</button>':''}</details>`:'';
 const myIn=me&&v.iscritti.includes(me);
 const isc=`<div class="card"><b>✍️ Iscritti (${v.iscritti.length})</b><div class="chips" style="margin-top:6px">${v.iscritti.map(m=>`<span class="chip">${nm(m)}</span>`).join('')||'<span class="muted">Ancora nessuno.</span>'}</div>
  ${c.stato==='iscrizioni'?(me?`<button class="${myIn?'s':'p'}" id="cpme" style="margin-top:8px">${myIn?'Ritirati':'🏆 Iscriviti'}</button>`:'<p class="muted" style="margin-top:8px">Per iscriverti il tuo account deve essere collegato a un socio.</p>')
   +(st?`<div class="row" style="margin-top:8px"><select id="cpadd"><option value="">Iscrivi un socio…</option>${_cpMs.filter(m=>m.active!==false&&!v.iscritti.includes(m.id)).map(m=>`<option value="${esc(m.id)}">${esc(memberName(m))}</option>`).join('')}</select></div>`:''):''}</div>`;
 const turni0=[...new Set(inc.map(i=>i.turno))].sort((a,b)=>b-a);
 const row=i=>{if(!i.b)return`<div class="cpm bye">😴 ${nm(i.a)} riposa · <span class="muted">vittoria a tavolino</span></div>`;
  const can=i.turno===cur&&(st||(!i.vincitore&&me&&(me===i.a||me===i.b)));const w=x=>i.vincitore===x?' cpw':i.vincitore?' cpl':'';
  return`<div class="cpm"><div class="cpv"><span class="cpp${w(i.a)}">${nm(i.a)}</span><span class="muted">vs</span><span class="cpp${w(i.b)}">${nm(i.b)}</span></div><div class="muted">🎲 ${gn(i.game_id)}${i.vincitore?' · 🏆 vince '+nm(i.vincitore):i.turno===cur?' · in attesa del risultato':''}</div>
  ${can?`<div class="row cpbtn"><button class="s" data-res="${esc(i.id)}" data-w="${esc(i.a)}">Vince ${esc(memberName(_cpMs.find(m=>m.id===i.a)||{}))}</button><button class="s" data-res="${esc(i.id)}" data-w="${esc(i.b)}">Vince ${esc(memberName(_cpMs.find(m=>m.id===i.b)||{}))}</button></div>`:''}</div>`};
 const rowT=t=>{const m=t.membri||[];if(m.length===1)return`<div class="cpm bye">😴 ${nm(m[0])} riposa · <span class="muted">1,5 punti</span></div>`;
  const P=t.posizioni||{},done=Object.keys(P).length>0,can=t.turno===cur&&(st||(!done&&me&&m.includes(me)));const ord=[...m].sort((a,b)=>done?(+P[a])-(+P[b]):0);
  return`<div class="cpm cptav"><div class="muted">🎲 ${gn(t.game_id)} · tavolo da ${m.length}</div><ol class="cptl">${ord.map(x=>`<li class="cpp${done&&+P[x]===1?' cpw':''}">${done?`<b>${+P[x]}°</b> `:''}${nm(x)}${done?` <span class="muted">${String(CP.pt(m.length,+P[x],ord.filter(y=>+P[y]===+P[x]).length)).replace('.',',')} pt</span>`:''}</li>`).join('')}</ol>
  ${done?'':t.turno===cur?'<div class="muted">in attesa del risultato</div>':''}
  ${can?`<div class="cpres" data-t="${esc(t.id)}">${m.map(x=>`<label class="row">${nm(x)}<select data-m="${esc(x)}" aria-label="Posizione">${m.map((_,k)=>`<option value="${k+1}"${+P[x]===k+1?' selected':''}>${k+1}°</option>`).join('')}</select></label>`).join('')}<button class="s" data-rt="${esc(t.id)}">${done?'✏️ Correggi':'✔ Registra'} risultato</button></div>`:''}</div>`};
 const turni=T1?turni0:[...new Set(tav.map(t=>t.turno))].sort((a,b)=>b-a);
 const tab=turni.length?`<h3 class="rsec">⚔️ Tabellone${c.stato==='in_corso'?' <span class="evb t">live</span>':''}</h3>${turni.map(t=>`<div class="card"><b>${esc(CP.turno(t))}</b>${t===cur?' <span class="muted">(in corso)</span>':''}${(c.scadenze||[])[t-1]?` <span class="muted">· entro il ${esc(cpD(c.scadenze[t-1]))}</span>`:''}${T1?inc.filter(i=>i.turno===t).map(row).join(''):tav.filter(x=>x.turno===t).map(rowT).join('')}</div>`).join('')}`:'';
 const claT=`<h3 class="rsec">📊 Classifica${c.stato==='concluso'?' finale':''}</h3><div class="card"><table class="cpt"><tr><th>#</th><th>Socio</th><th title="Punti">Pt</th><th title="Primi posti">1°</th><th title="Ranking (parte da 1000)">Rank</th><th title="Forza avversari">Avv.</th></tr>
  ${v.classifica.map(r=>`<tr class="${r.member_id===me?'me':''}"><td>${r.pos<=3&&c.stato==='concluso'?['🥇','🥈','🥉'][r.pos-1]:r.pos}</td><td>${nm(r.member_id)}</td><td><b>${esc(String(+r.punti).replace('.',','))}</b></td><td>${+r.primi}</td><td>${+r.ranking}</td><td>${esc(String(+r.buchholz).replace('.',','))}</td></tr>`).join('')}</table>
  <p class="muted" style="font-size:12px">Ordine: punti → primi posti → ranking → forza degli avversari. Punti: tavolo da 4 → 3/2/1/0, da 3 → 3/1,5/0, pari merito divisi.</p></div>`;
 const cla=!T1&&v.classifica.length&&c.stato!=='bozza'&&c.stato!=='iscrizioni'?claT:v.classifica.length&&c.stato!=='bozza'&&c.stato!=='iscrizioni'?`<h3 class="rsec">📊 Classifica${c.stato==='concluso'?' finale':''}</h3><div class="card"><table class="cpt"><tr><th>#</th><th>Socio</th><th title="Vittorie">V</th><th title="Sconfitte">P</th><th title="Ranking (parte da 1000)">Rank</th><th title="Forza avversari (Buchholz)">Avv.</th></tr>
  ${v.classifica.map(r=>`<tr class="${r.member_id===me?'me':''}"><td>${r.pos<=3&&c.stato==='concluso'?['🥇','🥈','🥉'][r.pos-1]:r.pos}</td><td>${nm(r.member_id)}</td><td><b>${r.vinte}</b></td><td>${r.perse}</td><td>${r.ranking}</td><td>${r.buchholz}</td></tr>`).join('')}</table>
  <p class="muted" style="font-size:12px">Ordine: vittorie → scontro diretto → ranking → forza degli avversari.</p></div>`:'';
 const allIn=cur&&(T1?!inc.some(i=>i.turno===cur&&!i.vincitore):!tav.some(t=>t.turno===cur&&(t.membri||[]).length>1&&!Object.keys(t.posizioni||{}).length));
 const act=st?(c.stato==='bozza'?`<button class="p" id="cpapri"${pool.length<c.turni?' disabled':''}>✍️ Apri iscrizioni</button>`:c.stato==='iscrizioni'?`<button class="p" id="cpavvia"${v.iscritti.length<(F==='tavoli'?3:2)?' disabled':''}>⚔️ Avvia la Coppa (${v.iscritti.length} iscritti)</button>`:c.stato==='in_corso'?`<button class="p" id="cpnext"${allIn?'':' disabled'}>${c.turno<c.turni?'➡️ Genera '+esc(CP.turno(c.turno+1)):'👑 Concludi e incorona'}</button>${allIn?'':'<p class="muted">Servono tutti i risultati del turno.</p>'}`:''):'';
 V.innerHTML=`<div class="hrow"><h2>🏆 Coppa Antero <span class="cpn">${esc(CP.rom(c.edizione))}</span></h2><button class="s" id="cpback">← Eventi</button></div>
 <div class="evtags"><span class="evb t">${esc(CP.STATI[c.stato]||c.stato)}</span><span class="evb t">${esc(CP.FMT[F]||F)}</span><span class="evb t">${c.turni} turni</span>${c.stato==='in_corso'?`<span class="evb t">${esc(CP.turno(c.turno))}</span>`:''}<span class="evb t">${pool.length} giochi nel pool</span>${cpDur(c)?`<span class="evb t">📅 ${esc(cpDur(c))}</span>`:''}</div>
 ${c.stato==='concluso'&&c.campione?`<div class="card cpking">👑 <b>${nm(c.campione)}</b> incoronato da Sant'Antero<div class="muted">Campione della Coppa Antero ${esc(CP.rom(c.edizione))}</div></div>`:''}
 ${act?`<div class="card">${act}</div>`:''}${cfg}${tab}${cla}${c.stato!=='in_corso'&&c.stato!=='concluso'||!turni.length?isc:''}
 <p class="muted" style="font-size:12px">${T1?'':'Regole: mai due volte lo stesso tavolo, si cerca di non ritrovare gli stessi avversari; i tavoli sono equilibrati per punti e ranking; ogni tavolo gioca un gioco adatto al numero di giocatori, mai già giocato da nessuno di loro, scelto per favorire chi ha meno vittorie. '+(F==='tavoli'?'Con 5 iscritti uno riposa (1,5 punti, al massimo una volta).':'I tavoli da 2 si usano solo se inevitabili.')}</p><p class="muted" style="font-size:12px"${T1?'':' hidden'}>Regole: niente rivincite, nessun gioco si ripete per lo stesso giocatore, a chi ha meno vittorie toccano giochi più favorevoli. Con giocatori dispari uno riposa (vittoria a tavolino, al massimo una volta).</p>`;
 const re=()=>views.coppa(),run=async(f,ok)=>{try{await f();if(ok)toast(ok);await CP.load();re()}catch(e){toast(cpMsg(e))}};
 $('#cpback').onclick=()=>go('eventi');
 V.querySelectorAll('[data-res]').forEach(b=>b.onclick=()=>run(()=>CP.rpc('coppa_risultato',{p_incontro:b.dataset.res,p_vincitore:b.dataset.w}),'Risultato registrato ✔'));
 V.querySelectorAll('[data-rt]').forEach(b=>b.onclick=()=>{const box=b.closest('.cpres'),pos={};box.querySelectorAll('select[data-m]').forEach(s=>pos[s.dataset.m]=+s.value);
  run(()=>CP.rpc('coppa_risultato_t',{p_tavolo:b.dataset.rt,p_pos:pos}),'Risultato registrato ✔')});
 if($('#cpme'))$('#cpme').onclick=()=>run(()=>CP.rpc('coppa_iscrivi',{p:c.id,p_member:null,p_esci:!!myIn}),myIn?'Ti sei ritirato':'Iscritto! In bocca al lupo 🏆');
 if($('#cpadd'))$('#cpadd').onchange=e=>e.target.value&&run(()=>CP.rpc('coppa_iscrivi',{p:c.id,p_member:e.target.value,p_esci:false}),'Socio iscritto');
 if($('#cpapri'))$('#cpapri').onclick=()=>run(()=>CP.rpc('coppa_apri',{p:c.id}),'Iscrizioni aperte');
 if($('#cpavvia'))$('#cpavvia').onclick=()=>confirm('Avviare la Coppa? Le iscrizioni si chiudono e parte il primo turno.')&&run(()=>CP.rpc('coppa_avvia',{p:c.id}),'Si parte! ⚔️');
 if($('#cpnext'))$('#cpnext').onclick=()=>run(()=>CP.rpc('coppa_avanza',{p:c.id}),c.turno<c.turni?'Nuovo turno generato':"👑 Incoronato da Sant'Antero!");
 if($('#cpdel'))$('#cpdel').onclick=()=>confirm('Eliminare questa Coppa?')&&run(async()=>{await CP.rpc('coppa_elimina',{p:c.id});window._cpId=null;go('eventi')},'Coppa eliminata');
 let fs=F;if($('#cpsave')){const fh={'1v1':'Sfide a due: servono giochi per 2 giocatori.','tavoli':'Tavoli da 3 o 4 (mai da 2): servono giochi per 3–4 giocatori.','misto':'Tavoli da 3–4, da 2 solo se inevitabile: servono giochi per 2–4 giocatori.'};
  const flt=()=>{V.querySelectorAll('#cpf [data-f]').forEach(b=>b.classList.toggle('on',b.dataset.f===fs));$('#cpfh').textContent=fh[fs]||'';V.querySelectorAll('.cpg').forEach(l=>{const ok=+l.dataset.mn<=hi(fs)&&+l.dataset.mx>=lo(fs);l.classList.toggle('cpko',!ok);if(!ok){const i=l.querySelector('input');if(!i.disabled)i.checked=false}})};
  V.querySelectorAll('#cpf [data-f]').forEach(b=>b.onclick=()=>{fs=b.dataset.f;flt();chk0()});flt();
  var chk0=()=>{};const sel=()=>[...V.querySelectorAll('.cppool input:checked')].map(i=>i.value),chk=()=>{const n=sel().length,t=+$('#cpt').value,w=$('#cpwarn');$('#cpcnt').textContent=`(${n} selezionati)`;w.hidden=n>=t;V.querySelectorAll('.cpsl').forEach((l,k)=>l.hidden=k>=t);w.textContent=`⚠️ Il pool ha ${n} giochi ma i turni sono ${t}: servono almeno ${t} giochi, perché un gioco non si ripete mai per lo stesso giocatore.`};
  chk0=chk;V.querySelectorAll('.cppool input,#cpt').forEach(i=>i.onchange=chk);chk();
  $('#cpq').oninput=e=>{const q=e.target.value.toLowerCase();V.querySelectorAll('.cpg').forEach(l=>l.hidden=l.classList.contains('cpko')||q&&!l.textContent.toLowerCase().includes(q))};
  $('#cpsave').onclick=()=>run(async()=>{const di=$('#cpdi').value||null,df=$('#cpdf').value||null;if(di&&df&&df<di)throw new Error('La data di fine deve essere uguale o successiva all\'inizio');
   await CP.rpc('coppa_config',{p:c.id,p_turni:+$('#cpt').value,p_pool:sel(),p_formato:fs});
   const t=+$('#cpt').value,sc=[...V.querySelectorAll('[data-sc]')].slice(0,t).map(i=>i.value||null);while(sc.length&&!sc[sc.length-1])sc.pop();
   await CP.rpc('coppa_date',{p:c.id,p_inizio:di,p_fine:df,p_scadenze:sc})},'Configurazione salvata')}
 if(c.stato==='in_corso')window._cpT=setInterval(()=>{if(window._cur!=='coppa'){clearInterval(window._cpT);return}if(!document.activeElement||document.activeElement===document.body)re()},20000)};
// Record: top 5 dell'ultima Coppa (fino alla prossima), più Coppe vinte, albo d'oro
const _rec=views.record;views.record=async(...a)=>{await _rec(...a);if(!CP.cl())return;if(!CP.d)await CP.load();const d=CP.d;if(!d||window._cur!=='record')return;
 const cs=(d.coppe||[]).filter(c=>c.stato==='concluso');if(!cs.length)return;_cpMs=await DB.members();const u=cs[0];
 const top=(d.finali||[]).filter(f=>f.c===u.id).sort((a,b)=>a.pos-b.pos).slice(0,5),cnt={};cs.forEach(c=>c.campione&&(cnt[c.campione]=(cnt[c.campione]||0)+1));
 const best=Object.entries(cnt).sort((a,b)=>b[1]-a[1]);const max=best.length?best[0][1]:0;
 V.insertAdjacentHTML('beforeend',`<h3 class="rsec">🏆 Coppa Antero</h3><div class="card cpc" data-cp="${esc(u.id)}" role="button"><b>Top 5 · Edizione ${esc(CP.rom(u.edizione))}</b>
 <ol class="cptop">${top.map(f=>`<li>${['🥇','🥈','🥉','4°','5°'][f.pos-1]||f.pos} ${cpNome(f.m)} <span class="muted">${u.formato&&u.formato!=='1v1'?esc(String(+f.pt).replace('.',','))+' punti':f.v+' vittorie'}</span></li>`).join('')}</ol></div>
 <div class="rov"><div class="roc"><span class="roi">👑</span><span class="rot">Più Coppe Antero vinte</span><span class="roh">${best.filter(b=>b[1]===max).map(b=>cpNome(b[0])).join(', ')}</span><span class="rov2">${max} ${max==1?'Coppa':'Coppe'}</span></div></div>
 <div class="card"><b>📜 Albo d'oro</b>${cs.map(c=>`<div class="row" style="margin-top:4px"><span>Edizione ${esc(CP.rom(c.edizione))}</span><span>${c.campione?cpNome(c.campione):'—'}</span></div>`).join('')}</div>`);cpBind()};
