// v12: Eventi (separati dalla Serata, raggiungibili dalla linguetta in cima a Serata).
// Le regole vere (posti, lista d'attesa, caparra, solo soci, archivio) stanno nel database: qui solo interfaccia.
const EV={
 c:()=>DB.remote.client,
 async list(){const {data,error}=await EV.c().from('eventi').select('*').order('inizio');if(error)throw error;return data||[]},
 async mine(){const u=await DB.remote.user();if(!u)return[];const {data,error}=await EV.c().from('evento_pren').select('*').eq('user_id',u.id).order('created_at');if(error)throw error;return data||[]},
 async info(id){const {data,error}=await EV.c().rpc('evento_info',{p_evento:id});if(error)throw error;return data||{occupati:0,attesa:0,presenti:0,nomi:[]}},
 async prenota(id,ospite){const {data,error}=await EV.c().rpc('evento_prenota',{p_evento:id,p_ospite:ospite||null});if(error)throw error;return data},
 async annulla(id){const {error}=await EV.c().rpc('evento_annulla',{p_evento:id});if(error)throw error},
 async staff(pren,azione,importo,presente){const {error}=await EV.c().rpc('evento_staff',{p_pren:pren,p_azione:azione,p_importo:importo??null,p_presente:presente??null});if(error)throw error},
 async prenotati(id){const {data,error}=await EV.c().from('evento_pren').select('*').eq('evento_id',id).order('created_at');if(error)throw error;return data||[]},
 async save(e){const q=e.id?EV.c().from('eventi').update(e).eq('id',e.id):EV.c().from('eventi').insert(e);const {error}=await q;if(error)throw error},
 async presenze(mid){const {data}=await EV.c().rpc('evento_presenze',{p_member:mid});return data||{eventi:0,tornei:0}}};
const TZ='Europe/Rome';
const evData=iso=>new Date(iso).toLocaleString('it-IT',{timeZone:TZ,weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const toInput=iso=>iso?new Date(iso).toLocaleString('sv-SE',{timeZone:TZ}).slice(0,16).replace(' ','T'):'';
// "2026-11-05T21:00" letto come ora di Roma -> ISO UTC (indipendente dal fuso del telefono)
function fromInput(v){if(!v)return null;const [d,t]=v.split('T'),[y,mo,da]=d.split('-').map(Number),[h,mi]=t.split(':').map(Number);const g=Date.UTC(y,mo-1,da,h,mi);
 const w=new Date(g).toLocaleString('sv-SE',{timeZone:TZ}).replace(' ','T')+'Z';return new Date(g-(Date.parse(w)-g)).toISOString()}
const euro=n=>n==null||n===''?'':'€ '+Number(n).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
const hasQuota=e=>(+e.quota||0)>0||(+e.caparra||0)>0;
const ST={confermata:['ok','✅ Confermata'],in_attesa_conferma:['pend','⏳ In attesa di conferma caparra'],attesa:['wait','🕒 Lista d\'attesa'],annullata:['off','Annullata'],rifiutata:['off','Annullata dallo staff']};
const stBadge=s=>ST[s]?`<span class="evb ${ST[s][0]}">${ST[s][1]}</span>`:'';
const ATTIVE=['confermata','in_attesa_conferma','attesa'];
const evMsg=e=>{const m=(e&&e.message)||String(e);return /fetch|network/i.test(m)?'Connessione assente: riprova quando sei online.':m};
const segHtml=a=>`<div class="seg evseg"><button data-sv="serata" class="${a==='serata'?'on':''}">🪑 Tavoli</button><button data-sv="eventi" class="${a==='eventi'?'on':''}">🎉 Eventi</button></div>`;
const bindSeg=()=>V.querySelectorAll('[data-sv]').forEach(b=>b.onclick=()=>{if(!b.classList.contains('on'))go(b.dataset.sv)});
const navSerata=()=>document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v==='serata'));
function ics(e){const z=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');const x=s=>String(s||'').replace(/([,;\\])/g,'\\$1').replace(/\n/g,'\\n');
 const t=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//PerGioco//IT','BEGIN:VEVENT','UID:'+e.id+'@pergioco','DTSTAMP:'+z(Date.now()),'DTSTART:'+z(e.inizio),'DTEND:'+z(new Date(e.inizio).getTime()+3*36e5),'SUMMARY:'+x(e.titolo),e.luogo?'LOCATION:'+x(e.luogo):'',e.descrizione?'DESCRIPTION:'+x(e.descrizione):'','END:VEVENT','END:VCALENDAR'].filter(Boolean).join('\r\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/calendar'}));a.download=(e.titolo||'evento').replace(/[^\w-]+/g,'_')+'.ics';document.body.append(a);a.click();a.remove()}
const card=(e,p,i)=>{const fut=new Date(e.inizio)>new Date(),chiuso=new Date(e.chiusura)<new Date();
 return`<div class="card evc${e.annullato?' evx':''}" data-ev="${e.id}">${e.immagine?`<img class="evimg" src="${esc(e.immagine)}" alt="" loading="lazy" onerror="this.remove()">`:''}<div class="evt"><b>${esc(e.titolo)}</b>
 <div class="muted">📅 ${esc(evData(e.inizio))}${e.luogo?` · 📍 ${esc(e.luogo)}`:''}</div>
 <div class="evtags">${e.annullato?'<span class="evb off">Evento annullato</span>':''}${e.torneo?'<span class="evb t">🏆 Torneo</span>':''}${e.solo_soci?'<span class="evb t">Solo soci in regola</span>':''}${hasQuota(e)?`<span class="evb t">${e.quota?'Quota '+euro(e.quota):'Caparra '+euro(e.caparra)}</span>`:'<span class="evb t">Gratuito</span>'}${i?`<span class="evb t">${i.occupati}/${e.posti} posti${i.attesa?` · ${i.attesa} in attesa`:''}</span>`:''}${!fut&&!e.annullato?`<span class="evb t">✔ ${i?i.presenti:0} presenti</span>`:chiuso&&!e.annullato?'<span class="evb off">Prenotazioni chiuse</span>':''}</div>
 ${p?stBadge(p.stato):''}</div></div>`};
async function eventi(){navSerata();
 if(!DB.remote||DB.status!=='online'){V.innerHTML=segHtml('eventi')+'<h2>🎉 Eventi</h2><div class="card"><p class="muted">Gli eventi richiedono la connessione al database. Riprova quando sei online.</p></div>';bindSeg();return}
 const staff=adminMode(),arch=staff&&window._evArch;
 V.innerHTML=segHtml('eventi')+'<h2>🎉 Eventi</h2><p class="muted">Caricamento…</p>';bindSeg();
 let es,mine;try{[es,mine]=await Promise.all([EV.list(),EV.mine()])}catch(e){V.innerHTML=segHtml('eventi')+`<h2>🎉 Eventi</h2><p class="warn">${esc(evMsg(e))}</p>`;bindSeg();return}
 const now=Date.now(),past=e=>new Date(e.inizio).getTime()<now-12*36e5;
 let show=es.filter(e=>arch?past(e):!past(e));if(arch)show.reverse();
 const info={};await Promise.all(show.map(async e=>{try{info[e.id]=await EV.info(e.id)}catch(x){}}));
 const myP=id=>mine.find(p=>p.evento_id===id&&ATTIVE.includes(p.stato))||mine.filter(p=>p.evento_id===id).pop();
 V.innerHTML=segHtml('eventi')+`<div class="hrow"><h2>🎉 Eventi</h2>${staff?'<button class="p" id="evnew">➕ Nuovo</button>':''}</div>
 ${staff?`<div class="seg" style="margin-bottom:10px"><button data-ar="0" class="${arch?'':'on'}">Prossimi</button><button data-ar="1" class="${arch?'on':''}">🗄 Archivio (staff)</button></div>`:''}
 ${show.map(e=>card(e,myP(e.id),info[e.id])).join('')||`<div class="card"><p class="muted">${arch?'Nessun evento passato.':'Nessun evento in programma. Torna a trovarci presto!'}</p></div>`}`;
 bindSeg();V.querySelectorAll('[data-ar]').forEach(b=>b.onclick=()=>{window._evArch=b.dataset.ar==='1';eventi()});
 if($('#evnew'))$('#evnew').onclick=()=>evForm({});
 V.querySelectorAll('[data-ev]').forEach(c=>c.onclick=()=>evDetail(es.find(e=>e.id===c.dataset.ev),myP(c.dataset.ev),info[c.dataset.ev]))}
async function evDetail(e,p,i){const staff=adminMode(),ms=await DB.members(),mn=id=>{const m=ms.find(m=>m.id===id);return m?memberName(m):'Socio'};
 i=i||await EV.info(e.id).catch(()=>null);const aperto=!e.annullato&&new Date(e.chiusura)>new Date(),attiva=p&&ATTIVE.includes(p.stato);
 const nomi=(i&&i.nomi||[]).map(n=>esc(mn(n.member_id))+(n.ospite?' <span class="muted">+1 ospite</span>':''));
 const o=openPanel(`${e.immagine?`<img class="evimg big" src="${esc(e.immagine)}" alt="Locandina" onerror="this.remove()">`:''}<h3>${esc(e.titolo)}</h3>
 <p>📅 <b>${esc(evData(e.inizio))}</b>${e.luogo?`<br>📍 ${esc(e.luogo)}`:''}<br>⏰ Prenotazioni fino a ${esc(evData(e.chiusura))}</p>
 ${e.descrizione?`<p class="evdesc">${esc(e.descrizione)}</p>`:''}
 <div class="evtags">${e.annullato?'<span class="evb off">Evento annullato</span>':''}${e.torneo?'<span class="evb t">🏆 Torneo</span>':''}${e.solo_soci?'<span class="evb t">Solo soci in regola con la quota</span>':'<span class="evb t">Aperto a tutti</span>'}${e.ospiti?'<span class="evb t">Ospiti ammessi (max 1)</span>':''}${i?`<span class="evb t">${i.occupati}/${e.posti} posti${i.attesa?` · ${i.attesa} in lista d'attesa`:''}</span>`:''}</div>
 ${hasQuota(e)?`<div class="lwarn">💶 ${e.quota?`Quota di partecipazione: <b>${euro(e.quota)}</b>. `:''}${e.caparra?`Caparra: <b>${euro(e.caparra)}</b>. `:''}La prenotazione diventa <b>confermata</b> solo dopo che hai versato la caparra di persona a un admin o moderatore. Nessun pagamento nell'app.</div>`:''}
 ${p?`<p>La tua prenotazione: ${stBadge(p.stato)}${p.ospite?` <span class="muted">· con ${esc(p.ospite)}</span>`:''}</p>`:''}
 <div class="mbt evact">${aperto&&!attiva?`${e.ospiti?'<label class="lchk"><input type="checkbox" id="evg"> Porto un ospite</label><input id="evgn" placeholder="Nome dell\'ospite" hidden>':''}<button class="p" id="evbook">🎟 Prenota</button>`:''}
 ${aperto&&attiva?'<button class="danger" id="evcanc">Annulla prenotazione</button>':''}${!aperto&&!e.annullato&&!attiva?'<p class="muted">Prenotazioni chiuse.</p>':''}
 ${!e.annullato&&new Date(e.inizio)>new Date()?'<button class="s" id="evics">📆 Aggiungi al calendario</button>':''}</div>
 ${nomi.length?`<details><summary>Chi partecipa (${nomi.length})</summary><ul class="lbl">${nomi.map(n=>`<li>${n}</li>`).join('')}</ul></details>`:''}
 ${staff?'<hr><div class="mbt"><button class="p" id="evpr">👥 Prenotati</button><button class="s" id="evedit">✏️ Modifica</button></div>':''}
 <div class="mbt"><button class="s" data-close>Chiudi</button></div>`);
 const q=s=>o.querySelector(s),re=()=>{o.close();eventi()};
 if(q('#evg'))q('#evg').onchange=()=>{q('#evgn').hidden=!q('#evg').checked;if(q('#evg').checked)q('#evgn').focus()};
 if(q('#evbook'))q('#evbook').onclick=async()=>{const g=q('#evg')&&q('#evg').checked?q('#evgn').value.trim():'';if(q('#evg')&&q('#evg').checked&&!g)return toast('Scrivi il nome dell\'ospite');
  try{const s=await EV.prenota(e.id,g);o.close();await modal(s==='confermata'?'Prenotazione confermata! Ti aspettiamo.':s==='in_attesa_conferma'?'Posto riservato. La prenotazione sarà confermata quando verserai la caparra di persona a un admin o moderatore.':'L\'evento è al completo: sei in lista d\'attesa. Se si libera un posto vieni promosso automaticamente.',{cancel:false});eventi()}catch(x){toast(evMsg(x))}};
 if(q('#evcanc'))q('#evcanc').onclick=async()=>{if(!await ask('Annullare la tua prenotazione?'))return;try{await EV.annulla(e.id);toast('Prenotazione annullata');re()}catch(x){toast(evMsg(x))}};
 if(q('#evics'))q('#evics').onclick=()=>ics(e);
 if(q('#evedit'))q('#evedit').onclick=()=>{o.close();evForm(e)};
 if(q('#evpr'))q('#evpr').onclick=()=>{o.close();evStaff(e)}}
function evForm(e){const nuovo=!e.id;
 const o=openPanel(`<h3>${nuovo?'Nuovo evento':'Modifica evento'}</h3><form id="evf">
 <label>Titolo *</label><input name="titolo" required maxlength="120" value="${esc(e.titolo||'')}">
 <label>Descrizione</label><textarea name="descrizione" rows="3">${esc(e.descrizione||'')}</textarea>
 <div class="row"><div><label>Inizio (ora italiana) *</label><input name="inizio" type="datetime-local" required value="${toInput(e.inizio)}"></div><div><label>Chiusura prenotazioni *</label><input name="chiusura" type="datetime-local" required value="${toInput(e.chiusura)}"></div></div>
 <label>Luogo</label><input name="luogo" value="${esc(e.luogo||'')}">
 <label>Locandina (link https, facoltativo)</label><input name="immagine" type="url" placeholder="https://…" value="${esc(e.immagine||'')}">
 <div class="row"><div><label>Posti massimi *</label><input name="posti" type="number" min="1" max="1000" required value="${e.posti||20}"></div><div><label>Quota € (facolt.)</label><input name="quota" type="number" min="0" step="0.5" value="${e.quota??''}"></div><div><label>Caparra € (facolt.)</label><input name="caparra" type="number" min="0" step="0.5" value="${e.caparra??''}"></div></div>
 <label class="lchk"><input type="checkbox" name="solo_soci"${e.solo_soci?' checked':''}> Solo soci in regola con la quota (dal Libro soci)</label>
 <label class="lchk"><input type="checkbox" name="ospiti"${e.ospiti?' checked':''}> Ospiti ammessi (max 1 per persona)</label>
 <label class="lchk"><input type="checkbox" name="torneo"${e.torneo?' checked':''}> È un torneo</label>
 <p class="muted">Con quota o caparra le prenotazioni restano «in attesa di conferma» (tengono il posto) finché lo staff non conferma la caparra ricevuta di persona.</p>
 <div class="mbt">${!nuovo&&!e.annullato?'<button type="button" class="danger" id="evdel">Annulla evento</button>':''}<button type="button" class="s" data-close>Chiudi</button><button class="p">Salva</button></div></form>`);
 const f=o.querySelector('#evf');
 f.onsubmit=async ev=>{ev.preventDefault();const F=new FormData(f),n=k=>F.get(k)===''?null:+F.get(k);
  const d={titolo:F.get('titolo').trim(),descrizione:F.get('descrizione').trim()||null,luogo:F.get('luogo').trim()||null,immagine:F.get('immagine').trim()||null,inizio:fromInput(F.get('inizio')),chiusura:fromInput(F.get('chiusura')),posti:+F.get('posti'),quota:n('quota'),caparra:n('caparra'),solo_soci:!!F.get('solo_soci'),ospiti:!!F.get('ospiti'),torneo:!!F.get('torneo')};
  if(e.id)d.id=e.id;
  if((nuovo||d.inizio!==e.inizio)&&new Date(d.inizio)<new Date())return modal('La data dell\'evento non può essere nel passato.',{cancel:false});
  if(new Date(d.chiusura)>new Date(d.inizio))return modal('La chiusura delle prenotazioni deve essere prima dell\'inizio.',{cancel:false});
  if(d.immagine&&!/^https:\/\//.test(d.immagine))return modal('Il link della locandina deve iniziare con https://',{cancel:false});
  try{await EV.save(d);toast('Evento salvato');o.close();eventi()}catch(x){modal(evMsg(x),{cancel:false})}};
 if(o.querySelector('#evdel'))o.querySelector('#evdel').onclick=async()=>{if(!await ask('Annullare l\'evento? Resterà visibile come «annullato» e non si potrà più prenotare.'))return;try{await EV.save({id:e.id,annullato:true});toast('Evento annullato');o.close();eventi()}catch(x){toast(evMsg(x))}}}
async function evStaff(e){const ms=await DB.members(),mn=id=>{const m=ms.find(m=>m.id===id);return m?memberName(m):'(socio non collegato)'};
 let ps;try{ps=await EV.prenotati(e.id)}catch(x){return toast(evMsg(x))}
 const ord={confermata:0,in_attesa_conferma:1,attesa:2,annullata:3,rifiutata:4};ps.sort((a,b)=>ord[a.stato]-ord[b.stato]||a.created_at.localeCompare(b.created_at));
 const occ=ps.filter(p=>p.stato==='confermata'||p.stato==='in_attesa_conferma').reduce((s,p)=>s+1+(p.ospite?1:0),0),pres=ps.filter(p=>p.presente).reduce((s,p)=>s+1+(p.ospite?1:0),0);
 const row=p=>`<div class="evrow"><div><b>${esc(mn(p.member_id))}</b>${p.ospite?` <span class="muted">+ ${esc(p.ospite)}</span>`:''}<br>${stBadge(p.stato)}${p.caparra_at?`<br><small class="muted">Caparra ${euro(p.caparra_importo)} ricevuta da ${esc(p.caparra_da)} il ${esc(evData(p.caparra_at))}</small>`:''}</div><div class="evbtn">
 ${p.stato==='in_attesa_conferma'?`<button class="p" data-cap="${p.id}">💶 Conferma caparra ricevuta</button>`:''}
 ${p.stato==='confermata'?`<label class="lchk"><input type="checkbox" data-pres="${p.id}"${p.presente?' checked':''}> Presente</label>`:''}
 ${ATTIVE.includes(p.stato)?`<button class="s" data-rif="${p.id}">Annulla</button>`:''}</div></div>`;
 const o=openPanel(`<div class="hrow"><h3>👥 ${esc(e.titolo)}</h3></div><p class="muted">${esc(evData(e.inizio))} · ${occ}/${e.posti} posti occupati · ${pres} presenti</p>
 ${ps.map(row).join('')||'<p class="muted">Nessuna prenotazione.</p>'}
 <div class="mbt"><button class="s" id="evcsv">⬇️ CSV</button><button class="s" data-close>Chiudi</button></div>`,true);
 const again=()=>{o.close();evStaff(e)};
 o.querySelectorAll('[data-cap]').forEach(b=>b.onclick=async()=>{const v=await askText('Importo della caparra ricevuta di persona (€):',String(e.caparra??e.quota??''));if(v==null)return;const n=+String(v).replace(',','.');if(!(n>=0)||String(v).trim()==='')return toast('Importo non valido');
  try{await EV.staff(b.dataset.cap,'conferma_caparra',n);toast('Prenotazione confermata');again()}catch(x){toast(evMsg(x))}});
 o.querySelectorAll('[data-rif]').forEach(b=>b.onclick=async()=>{if(!await ask('Annullare questa prenotazione? Il posto passa al primo in lista d\'attesa.'))return;try{await EV.staff(b.dataset.rif,'rifiuta');toast('Prenotazione annullata');again()}catch(x){toast(evMsg(x))}});
 o.querySelectorAll('[data-pres]').forEach(c=>c.onchange=async()=>{try{await EV.staff(c.dataset.pres,'presente',null,c.checked);toast(c.checked?'Segnato presente':'Presenza tolta')}catch(x){c.checked=!c.checked;toast(evMsg(x))}});
 o.querySelector('#evcsv').onclick=()=>{const c=v=>`"${String(v??'').replace(/"/g,'""')}"`;const L=[['Nome','Ospite','Stato','Prenotato il','Caparra','Caparra ricevuta da','Caparra il','Presente'].map(c).join(';')].concat(ps.map(p=>[mn(p.member_id),p.ospite,(ST[p.stato]||[,p.stato])[1].replace(/^\W+\s/,''),evData(p.created_at),p.caparra_importo,p.caparra_da,p.caparra_at?evData(p.caparra_at):'',p.presente?'Sì':'No'].map(c).join(';')));
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+L.join('\r\n')],{type:'text/csv'}));a.download='prenotati-'+e.titolo.replace(/[^\w-]+/g,'_')+'.csv';document.body.append(a);a.click();a.remove()}}
// "I miei eventi" in fondo al proprio Profilo
async function mieiEventiHtml(){try{const [mine,es]=await Promise.all([EV.mine(),EV.list()]);const u=await DB.remote.user(),me=(await DB.members()).find(m=>u&&m.userId===u.id);const pz=me?await EV.presenze(me.id):{eventi:0,tornei:0};
 const rows=mine.filter(p=>ATTIVE.includes(p.stato)).map(p=>({p,e:es.find(e=>e.id===p.evento_id)})).filter(x=>x.e);
 return`<div class="card" id="mieiev"><h3>🎉 I miei eventi</h3>${rows.map(({p,e})=>`<div class="evrow" data-mev="${e.id}"><div><b>${esc(e.titolo)}</b><br><small class="muted">${esc(evData(e.inizio))}</small></div>${stBadge(p.stato)}</div>`).join('')||'<p class="muted">Nessuna prenotazione attiva.</p>'}
 <div class="evtags"><span class="evb ${pz.eventi>=5?'ok':'off'}">🎟 Presente a 5 eventi ${pz.eventi>=5?'✔':`(${pz.eventi}/5)`}</span><span class="evb ${pz.tornei>=1?'ok':'off'}">🏆 Torneista ${pz.tornei>=1?'✔':'(0/1)'}</span></div>
 <button class="s" id="goev">Vedi tutti gli eventi</button></div>`}catch(e){return''}}
const _serata=views.serata;views.serata=async(...a)=>{await _serata(...a);if(DB.remote){V.insertAdjacentHTML('afterbegin',segHtml('serata'));bindSeg()}};
const _profilo=views.profilo;views.profilo=async(...a)=>{await _profilo(...a);if(window._pv||!DB.remote||DB.status!=='online'||!(await DB.remote.user()))return;const h=await mieiEventiHtml();if(!h||location.hash!=='#profilo')return;V.insertAdjacentHTML('beforeend',h);
 $('#goev').onclick=()=>go('eventi');V.querySelectorAll('[data-mev]').forEach(r=>r.onclick=()=>go('eventi'))};
views.eventi=eventi;
