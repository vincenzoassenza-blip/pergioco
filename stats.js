// v33 — "📊 Le mie statistiche" (caricato su richiesta). Privacy: avversari (nemesi/vittima/bilanci) solo socio stesso + staff.
(function(){
const DN=['Lun','Mar','Mer','Gio','Ven','Sab','Dom'],MN=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const pc=(a,b)=>b?Math.round(100*a/b)+'%':'—';
const pct=(a,b)=>`${pc(a,b)} <span class="muted">(${b|0})</span>`;
const num=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(String(v).replace(',','.').trim());return Number.isFinite(n)?n:null};
const dd=s=>{const[y,m,d]=String(s).split('-').map(Number);return new Date(Date.UTC(y,m-1,d))};
const days=(a,b)=>Math.round((dd(b)-dd(a))/864e5);
const df=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return'—';const[y,m,d]=s.split('-');return `${+d} ${MN[m-1]} ${y}`};
const pname=(x,ms)=>{if(!x||!x.memberId)return 'Ospite';const m=ms.find(y=>y.id===x.memberId);return m?memberName(m):'Ospite'};
const gmin=g=>{if(!g)return null;const pt=+g.playTime,a=+g.minT,b=+g.maxT;if(pt>0&&pt<=1440)return pt;if(a>0&&b>0)return Math.min(1440,(a+b)/2);if(a>0||b>0)return Math.min(1440,a||b);return null};
function from(per){const t=romeToday();if(per==='12m'){const d=dd(t);d.setUTCFullYear(d.getUTCFullYear()-1);return d.toISOString().slice(0,10)}if(per==='m')return t.slice(0,8)+'01';return '0000'}
function calc(mid,plays,gs,per){
 const today=romeToday(),f=from(per),allMine=plays.filter(p=>p.players.some(x=>x.memberId===mid)&&/^\d{4}-\d{2}-\d{2}$/.test(p.date||''));
 const mine=allMine.filter(p=>p.date>=f&&p.date<=today).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
 const me=p=>p.players.find(x=>x.memberId===mid)||{},won=p=>p.coop?!!p.groupWin:!!me(p).winner;
 const G=new Map(),dates=new Set();let w=0,min=0,minN=0;
 for(const p of mine){dates.add(p.date);if(won(p))w++;const g=gs.find(x=>x.id===p.gameId),mm=durOk(p.duration)?+p.duration:gmin(g);if(mm){min+=mm;minN++}
  const k=p.gameId;if(!G.has(k))G.set(k,{id:k,name:g?g.name:'Gioco rimosso',n:0,w:0,first:p.date,last:p.date,sc:[],coop:0});const r=G.get(k);r.n++;if(won(p))r.w++;r.last=p.date;if(p.coop)r.coop++;else{const s=num(me(p).score);if(s!==null)r.sc.push(s)}}
 const games=[...G.values()].sort((a,b)=>b.n-a.n||a.name.localeCompare(b.name));
 let h=0;games.map(g=>g.n).sort((a,b)=>b-a).forEach((n,i)=>{if(n>=i+1)h=i+1});
 const lastAll=new Map();for(const p of allMine)if(!lastAll.has(p.gameId)||lastAll.get(p.gameId)<p.date)lastAll.set(p.gameId,p.date);
 const dusty=[...lastAll].filter(([,d])=>days(d,today)>60).map(([id,d])=>({name:(gs.find(x=>x.id===id)||{}).name||'Gioco rimosso',d,ago:days(d,today)})).sort((a,b)=>b.ago-a.ago);
 // avversari
 const O=new Map();let guest=0;
 for(const p of mine){const iw=!!me(p).winner;for(const x of p.players){if(x.memberId===mid)continue;if(!x.memberId){guest++;continue}
  if(!O.has(x.memberId))O.set(x.memberId,{id:x.memberId,n:0,beatMe:0,beat:0,coop:0,coopW:0,comp:0});const o=O.get(x.memberId);o.n++;
  if(p.coop){o.coop++;if(p.groupWin)o.coopW++}else{o.comp++;if(x.winner&&!iw)o.beatMe++;if(iw&&!x.winner)o.beat++}}}
 const opp=[...O.values()];
 const nem=opp.filter(o=>o.beatMe>0).sort((a,b)=>b.beatMe-a.beatMe||b.comp-a.comp)[0]||null,vit=opp.filter(o=>o.beat>0).sort((a,b)=>b.beat-a.beat||b.comp-a.comp)[0]||null;
 // abitudini
 const wd=[0,0,0,0,0,0,0],mo=new Map();for(const p of mine){wd[(dd(p.date).getUTCDay()+6)%7]++;const k=p.date.slice(0,7);mo.set(k,(mo.get(k)||0)+1)}
 let bw=0,cw=0;for(const p of mine){if(won(p)){cw++;bw=Math.max(bw,cw)}else cw=0}
 const ev=[...new Set(plays.map(p=>p.date).filter(d=>d&&d>=f&&d<=today))].sort();let bs=0,cs=0;for(const d of ev){if(dates.has(d)){cs++;bs=Math.max(bs,cs)}else cs=0}
 const topM=[...mo].sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?1:-1))[0]||null;
 return{n:mine.length,w,games,h,dates:dates.size,first:mine[0]&&mine[0].date,last:mine.length?mine[mine.length-1].date:null,min,minN,dusty,opp,guest,nem,vit,wd,mo,bw,cw,bs,cs,topM}}
const bar=(v,max)=>`<span class="stb"><i style="width:${max?Math.max(3,Math.round(100*v/max)):0}%"></i></span>`;
function months12(){const t=dd(romeToday()),r=[];for(let i=11;i>=0;i--){const d=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()-i,1));r.push(d.toISOString().slice(0,7))}return r}
function spark(mo){const ks=months12(),v=ks.map(k=>mo.get(k)||0),mx=Math.max(1,...v),W=300,H=60,dx=W/11;const pts=v.map((y,i)=>`${(i*dx).toFixed(1)},${(H-4-(H-12)*y/mx).toFixed(1)}`).join(' ');
 return `<svg class="stsp" viewBox="-14 0 328 ${H+14}" role="img" aria-label="Partite per mese negli ultimi 12 mesi"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/>${v.map((y,i)=>`<circle cx="${(i*dx).toFixed(1)}" cy="${(H-4-(H-12)*y/mx).toFixed(1)}" r="2.5"><title>${MN[+ks[i].slice(5)-1]}: ${y}</title></circle>`).join('')}${ks.map((k,i)=>i%2?'':`<text x="${(i*dx).toFixed(1)}" y="${H+12}" text-anchor="middle">${MN[+k.slice(5)-1]}</text>`).join('')}</svg>`}
function html(m,s,full,per,ms,own){
 const hrs=s.min/60,est=s.n?`~${hrs<10?hrs.toFixed(1).replace('.',','):Math.round(hrs)} h`:'—';
 const fb=[['sempre','Sempre'],['12m','12 mesi'],['m','Questo mese']].map(([k,l])=>`<button type="button" class="${per===k?'on':''}" data-sp="${k}" aria-pressed="${per===k}">${l}</button>`).join('');
 const box=(v,l)=>`<div class="stn"><b>${v}</b><span>${l}</span></div>`;
 let o=`<div class="card st" id="st33"><h3>📊 ${own?'Le mie statistiche':'Statistiche di '+esc(memberName(m))}</h3><div class="stf" role="group" aria-label="Periodo">${fb}</div>`;
 if(!s.n)return o+`<p class="muted">Nessuna partita in questo periodo.</p></div>`;
 o+=`<div class="stg">${box(s.n,'partite')}${box(`${s.w} · ${pc(s.w,s.n)}`,'vittorie')}${box(s.games.length,'giochi diversi')}${box(s.dates,'serate')}${box(s.h,'h-index')}${box(est,'ore <i>stima</i>')}</div>
 <p class="muted sm">Dal ${df(s.first)} al ${df(s.last)}. Ore stimate dalla durata media del gioco (BGG), non misurate${s.minN<s.n?` · ${s.n-s.minN} partite senza durata nota`:''}. Le cooperative contano come vittoria se il gruppo vince.</p>`;
 const mx=s.games[0]?s.games[0].n:1;
 o+=`<details class="std" open><summary>🎲 Giochi (${s.games.length})</summary><div class="stl">${s.games.map((g,i)=>{const sc=g.sc,av=sc.length?sc.reduce((a,b)=>a+b,0)/sc.length:null,f=v=>String(Math.round(v*10)/10).replace('.',',');
  return `<div class="str"${i>=8?' hidden data-more':''}><div class="strh"><button type="button" class="stlink" data-g="${esc(g.id)}"><b>${esc(g.name)}</b> ›</button><span>${g.n}×</span></div>${bar(g.n,mx)}<div class="muted sm">Vinte ${g.w} · ${pct(g.w,g.n)} · prima ${df(g.first)} · ultima ${df(g.last)}${sc.length?` · punti: max ${f(Math.max(...sc))}, media ${f(av)}, min ${f(Math.min(...sc))}`:''}</div></div>`}).join('')}</div>${s.games.length>8?`<button type="button" class="s sm" data-all>Mostra tutti (${s.games.length})</button>`:''}
 ${s.dusty.length?`<p class="sm"><b>🧹 Da rispolverare</b> (non giocati da oltre 60 giorni): ${s.dusty.slice(0,8).map(d=>`${esc(d.name)} <span class="muted">(${d.ago} gg)</span>`).join(', ')}</p>`:''}</details>`;
 if(full){const so=[...s.opp].sort((a,b)=>b.n-a.n),nm=id=>{const x=ms.find(y=>y.id===id);return x?esc(memberName(x)):'Ospite'},omx=so[0]?so[0].n:1;
  o+=`<details class="std"><summary>⚔️ Avversari</summary>
  <div class="stg2"><div class="stn"><b>${s.nem?nm(s.nem.id):'—'}</b><span>😈 nemesi${s.nem?` · ti ha battuto ${s.nem.beatMe}×`:''}</span></div><div class="stn"><b>${s.vit?nm(s.vit.id):'—'}</b><span>🎯 vittima${s.vit?` · battuto ${s.vit.beat}×`:''}</span></div></div>
  <div class="stl">${so.slice(0,15).map(x=>`<div class="str"><div class="strh"><b>${nm(x.id)}</b><span>${x.n} insieme</span></div>${bar(x.n,omx)}<div class="muted sm">${x.comp?`Competitive: ${x.beat} vinte / ${x.beatMe} perse contro (${x.comp})`:''}${x.comp&&x.coop?' · ':''}${x.coop?`Coop insieme: ${x.coop}, vinte ${pct(x.coopW,x.coop)}`:''}</div></div>`).join('')}</div>
  ${s.guest?`<p class="muted sm">+ ${s.guest} partecipazioni di Ospite.</p>`:''}</details>`}
 const wmx=Math.max(1,...s.wd),ks=months12(),mmx=Math.max(1,...ks.map(k=>s.mo.get(k)||0));
 o+=`<details class="std"><summary>📅 Abitudini</summary>
 <div class="sthm" aria-label="Partite per giorno della settimana">${s.wd.map((v,i)=>`<div class="sth" style="--a:${(v/wmx).toFixed(2)};color:${v/wmx>.45?'#fff':'#14254a'}" title="${DN[i]}: ${v}"><b>${v}</b><span>${DN[i]}</span></div>`).join('')}</div>
 <div class="sthm sthm12" aria-label="Partite per mese">${ks.map(k=>{const v=s.mo.get(k)||0;return `<div class="sth" style="--a:${(v/mmx).toFixed(2)};color:${v/mmx>.45?'#fff':'#14254a'}" title="${k}: ${v}"><b>${v}</b><span>${MN[+k.slice(5)-1]}</span></div>`}).join('')}</div>
 ${spark(s.mo)}
 <div class="stg">${box(s.bw,'serie vittorie max')}${box(s.cw,'serie vittorie attuale')}${box(s.bs,'serate di fila max')}${box(s.topM?`${MN[+s.topM[0].slice(5)-1]} ${s.topM[0].slice(0,4)}`:'—','mese più attivo'+(s.topM?` (${s.topM[1]})`:''))}${box(s.dates?String(Math.round(10*s.n/s.dates)/10).replace('.',','):'—','partite per serata')}</div></details>`;
 if(own)o+=`<label class="stpub"><input type="checkbox" id="stpub"${m.statsPub?' checked':''}><span><b>Rendi pubbliche le mie statistiche</b><br><span class="muted sm">(gli altri soci vedranno solo i numeri aggregati, mai nemesi, vittima o bilanci con le persone)</span></span></label>`;
 return o+`</div>`}

// v34: statistiche per singolo gioco
function sline(v,lab){if(v.length<2)return '';const mx=Math.max(...v),mn=Math.min(...v),W=300,H=56,dx=W/(v.length-1),Y=y=>(H-4-(H-12)*(mx===mn?.5:(y-mn)/(mx-mn))).toFixed(1);
 return `<svg class="stsp" viewBox="-8 0 316 ${H+4}" role="img" aria-label="${lab}"><polyline points="${v.map((y,i)=>`${(i*dx).toFixed(1)},${Y(y)}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="2"/>${v.map((y,i)=>`<circle cx="${(i*dx).toFixed(1)}" cy="${Y(y)}" r="2.5"><title>${y}</title></circle>`).join('')}</svg>`}
const f1=v=>String(Math.round(v*10)/10).replace('.',',');
function gameMine(g,m,plays,gs,ms,full,open){
 const mid=m.id,L=plays.filter(p=>p.gameId===g.id&&p.players.some(x=>x.memberId===mid)&&/^\d{4}-\d{2}-\d{2}$/.test(p.date||'')).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);if(!L.length)return '';
 const me=p=>p.players.find(x=>x.memberId===mid)||{},won=p=>p.coop?!!p.groupWin:!!me(p).winner,w=L.filter(won).length;
 const sc=L.filter(p=>!p.coop).map(p=>({s:num(me(p).score),d:p.date,p})).filter(x=>x.s!==null);
 let best=null,worst=null;for(const x of sc){if(!best||x.s>best.s)best=x;if(!worst||x.s<worst.s)worst=x}
 const pos=[];for(const p of L){if(p.coop)continue;const my=num(me(p).score);if(my===null)continue;const o=p.players.map(x=>num(x.score)).filter(v=>v!==null);if(o.length<2)continue;pos.push(1+o.filter(v=>v>my).length)}
 let bw=0,cw=0;for(const p of L){if(won(p)){cw++;bw=Math.max(bw,cw)}else cw=0}
 const mm=gmin(g);let min=0;for(const p of L)min+=durOk(p.duration)?+p.duration:(mm||0);
 const byN=new Map();for(const p of L){const n=p.players.length;const r=byN.get(n)||{n,t:0,w:0};r.t++;if(won(p))r.w++;byN.set(n,r)}
 const bn=[...byN.values()].sort((a,b)=>b.w/b.t-a.w/a.t||b.t-a.t)[0];
 const O=new Map();let guest=0;for(const p of L){const iw=!!me(p).winner;for(const x of p.players){if(x.memberId===mid)continue;if(!x.memberId){guest++;continue}const o=O.get(x.memberId)||{id:x.memberId,n:0,bm:0,b:0};o.n++;if(!p.coop){if(x.winner&&!iw)o.bm++;if(iw&&!x.winner)o.b++}O.set(x.memberId,o)}}
 const nm=id=>{const x=ms.find(y=>y.id===id);return x?esc(memberName(x)):'Ospite'},op=[...O.values()];
 const top=op.sort((a,b)=>b.n-a.n)[0],nem=[...op].filter(o=>o.bm).sort((a,b)=>b.bm-a.bm)[0],vit=[...op].filter(o=>o.b).sort((a,b)=>b.b-a.b)[0];
 const box=(v,l)=>`<div class="stn"><b>${v}</b><span>${l}</span></div>`,last=[...L].reverse().slice(0,5);
 const own=m._own;
 return `<details class="card st stg1" id="stg-mine"${open?' open':''}><summary><b>📊 ${own?'Le mie statistiche su questo gioco':'Statistiche di '+esc(memberName(m))+' su questo gioco'}</b></summary>
 <div class="stg">${box(L.length,'partite')}${box(`${w} · ${pc(w,L.length)}`,`vittorie <span class="muted">(${L.length})</span>`)}${box(bw,'serie vittorie max')}
 ${box(best?f1(best.s):'—','punteggio max'+(best?`<br>${df(best.d)}`:''))}${box(sc.length?f1(sc.reduce((a,b)=>a+b.s,0)/sc.length):'—','punteggio medio')}${box(worst?f1(worst.s):'—','punteggio min'+(worst?`<br>${df(worst.d)}`:''))}
 ${box(pos.length?f1(pos.reduce((a,b)=>a+b,0)/pos.length)+'°':'—','posizione media'+(pos.length?` (${pos.length})`:''))}${box(min?`~${min/60<10?f1(min/60):Math.round(min/60)} h`:'—','ore <i>stima</i>')}${box(bn?bn.n+' giocatori':'—','dove vinci di più'+(bn?`<br>${pc(bn.w,bn.t)} (${bn.t})`:''))}</div>
 <p class="muted sm">Prima partita ${df(L[0].date)} · ultima ${df(L[L.length-1].date)}. Posizione ricavata dal punteggio, quando c'è.</p>
 ${sc.length>1?`<p class="sm"><b>Andamento punteggi</b></p>${sline(sc.map(x=>x.s),'Andamento dei punteggi')}`:''}
 ${full?`<div class="stg2">${box(top?nm(top.id):'—','🤝 con chi giochi di più'+(top?` (${top.n})`:''))}${box(nem?nm(nem.id):'—','😈 nemesi'+(nem?` · ${nem.bm}×`:''))}${box(vit?nm(vit.id):'—','🎯 vittima'+(vit?` · ${vit.b}×`:''))}</div><p class="muted sm">🔒 Avversari visibili solo a te e allo staff${guest?` · + ${guest} partecipazioni di Ospite`:''}.</p>`:''}
 <p class="sm"><b>Ultime partite</b></p>${last.map((p,i)=>`<div class="stlp"><button type="button" class="s stlb" data-lp="${i}" aria-expanded="false">${df(p.date)} · ${p.coop?(p.groupWin?'✅ vinta (coop)':'❌ persa (coop)'):(me(p).winner?'🏆 vinta':'perso')}${num(me(p).score)!==null?' · '+f1(num(me(p).score))+' pt':''}</button><div class="muted sm" hidden>${p.players.map(x=>`${x.memberId?nm(x.memberId):'Ospite'}${x.winner?' 🏆':''}${num(x.score)!==null?' '+f1(num(x.score)):''}`).join(' · ')}${p.scenario?'<br>Scenario: '+esc(p.scenario):''}</div></div>`).join('')}
 </details>`}
function gameAssoc(g,plays,rate){
 const L=plays.filter(p=>p.gameId===g.id&&/^\d{4}-\d{2}-\d{2}$/.test(p.date||'')).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
 const box=(v,l)=>`<div class="stn"><b>${v}</b><span>${l}</span></div>`;
 let o=`<details class="card st stg1" id="stg-assoc"><summary><b>🏛️ Statistiche PerGioco</b> <span class="muted sm">dati aggregati, senza nomi</span></summary>`;
 if(!L.length)return o+`<p class="muted">Non ancora giocato in associazione.</p></details>`;
 const dates=new Set(L.map(p=>p.date)),who=new Set(),win=new Set(),cnt=new Map(),mo=new Map();let tot=0;
 for(const p of L){for(const x of p.players)who.add(Stats.key(x));tot+=p.players.length;cnt.set(p.players.length,(cnt.get(p.players.length)||0)+1);mo.set(p.date.slice(0,7),(mo.get(p.date.slice(0,7))||0)+1);if(!p.coop)for(const x of p.players)if(x.winner)win.add(Stats.key(x))}
 const mode=[...cnt].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0],co=L.filter(p=>p.coop),cw=co.filter(p=>p.groupWin).length,comp=L.filter(p=>!p.coop);
 const sc=[];for(const p of comp)for(const x of p.players){const v=num(x.score);if(v!==null)sc.push(v)}
 const d=L.map(p=>durOk(p.duration)).filter(Boolean),gm=gmin(g),dur=d.length?Math.round(d.reduce((a,b)=>a+b,0)/d.length):gm?Math.round(gm):null;
 o+=`<div class="stg">${box(L.length,'partite')}${box(dates.size,'serate')}${box(who.size,'giocatori diversi')}${box(f1(tot/L.length),'giocatori per partita')}${box(mode?mode[0]:'—','n° giocatori più frequente')}${box(dur?dur+' min':'—','durata'+(d.length?' media':' <i>stima</i>'))}
 ${co.length?box(`${pc(cw,co.length)}`,`vittorie del gruppo <span class="muted">(${co.length})</span>`):''}${comp.length?box(win.size,'vincitori diversi'):''}${sc.length?box(f1(sc.reduce((a,b)=>a+b,0)/sc.length),'punteggio medio'):''}${sc.length?box(f1(Math.max(...sc)),'punteggio massimo'):''}${box(rate&&rate.n?rate.a.toFixed(1).replace('.',',')+'/10':'—','voto medio soci'+(rate&&rate.n?` (${rate.n})`:''))}</div>
 <p class="muted sm">Prima volta ${df(L[0].date)} · ultima ${df(L[L.length-1].date)}${comp.length?` · ${win.size} persone diverse hanno vinto almeno una volta (equilibrio)`:''}.</p><p class="sm"><b>Partite per mese</b> <span class="muted">(ultimi 12 mesi)</span></p>${spark(mo)}</details>`;
 return o}
async function gameMount(o,g,opt){const gpc=o&&o.querySelector('.gpc');if(!gpc)return;const plays=await DB.plays(),gs=await DB.games(),ms=await DB.members();
 const rate=typeof Rate!=='undefined'&&Rate.avg?Rate.avg(g.id):null;const anchor=gpc.querySelector('.row')||gpc.firstElementChild;
 let h=gameAssoc(g,plays,rate);if(opt&&opt.m){opt.m._own=opt.own;h=gameMine(g,opt.m,plays,gs,ms,opt.own||opt.staff,opt.open)+h}
 anchor.insertAdjacentHTML('afterend',h);gpc.querySelectorAll('[data-lp]').forEach(b=>b.onclick=()=>{const d=b.nextElementSibling;d.hidden=!d.hidden;b.setAttribute('aria-expanded',String(!d.hidden))})}
window.StatsV33={gameMount,async mount(host,m,{own,staff}){
 if(!host||!m)return;const full=own||staff;if(!full&&!m.statsPub)return;
 const plays=await DB.plays(),gs=await DB.games(),ms=await DB.members();let per='sempre';
 const draw=()=>{const old=host.querySelector('#st33'),h=html(m,calc(m.id,plays,gs,per),full,per,ms,own);if(old)old.outerHTML=h;else host.insertAdjacentHTML('beforeend',h);bind()};
 const bind=()=>{const c=host.querySelector('#st33');c.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>{if(!['sempre','12m','m'].includes(b.dataset.sp))return;per=b.dataset.sp;const op=[...c.querySelectorAll('details')].map(d=>d.open);draw();host.querySelectorAll('#st33 details').forEach((d,i)=>d.open=op[i])});
  c.querySelectorAll('[data-g]').forEach(b=>b.onclick=async()=>{const g=gs.find(x=>x.id===b.dataset.g);if(!g||typeof gamePage!=='function')return;window._gsCtx={m,own,staff,open:true};try{await gamePage(g,plays)}finally{window._gsCtx=null}});
  const ma=c.querySelector('[data-all]');if(ma)ma.onclick=()=>{c.querySelectorAll('[data-more]').forEach(x=>x.hidden=false);ma.remove()};
  const cb=c.querySelector('#stpub');if(cb)cb.onchange=async()=>{const v=cb.checked;cb.disabled=true;try{if(DB.remote&&DB.remote.setStatsPub)await DB.remote.setStatsPub(v);m.statsPub=v;toast(v?'Statistiche pubbliche: gli altri vedranno solo i numeri aggregati':'Statistiche private')}catch(e){cb.checked=!v;toastErr(e,'STAT','Impostazione non salvata')}finally{cb.disabled=false}}};
 draw()}};
})();
