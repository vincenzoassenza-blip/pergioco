// v41.16 — Ricompense in app: effetti visibili, pannello Gestione, scelta nel profilo.
// Catalogo e assegnazioni arrivano da RPC (o da localStorage in modalità locale).
const RC={
 ICONE:Object.freeze(['socio-fondatore-b','pioniere','tester','coppa','d20','pergamena','clessidra','lanterna']),
 AVATAR:Object.freeze(['custode-arco','esploratore-e','re-dei-meeple','inventore','golem-dadi','cartografa','cavaliere','maga','ladra','drago','pirata','alchimista']),
 BASE:Object.freeze(['base-meeple-navy','base-meeple-oro','base-meeple-teal']),
 COLORI:Object.freeze([
  {v:'#14254a',l:'Blu navy'},{v:'#c4921a',l:'Oro'},{v:'#2a4785',l:'Blu'},{v:'#1e7a43',l:'Verde'},
  {v:'#8b1e3f',l:'Bordeaux'},{v:'#0e6b8a',l:'Teal'},{v:'#3d2c8a',l:'Viola'},{v:'#a34b12',l:'Rame'}]),
 CORNICI:Object.freeze([{v:'oro',l:'Oro'},{v:'navy',l:'Navy'},{v:'doppio',l:'Doppio anello'},{v:'alloro',l:'Alloro'}]),
 SFONDI:Object.freeze([{v:'navy-gold',l:'Navy e oro'},{v:'navy',l:'Navy'},{v:'gold',l:'Oro'},{v:'teal',l:'Teal'},{v:'verde',l:'Verde'},{v:'bordeaux',l:'Bordeaux'},{v:'viola',l:'Viola'}]),
 TIPI:Object.freeze(['titolo','icona','colore','cornice','sfondo']),
 LAB:{titolo:'Titolo',icona:'Icona',colore:'Colore del nome',cornice:'Cornice',sfondo:'Sfondo del profilo'},
 lkey:'pergioco-ricompense',
 data:{catalogo:[],assegnate:[],scelte:[]},
 extra:{},ready:false,_p:null,
 icoOk(s){return this.ICONE.includes(s)},
 avOk(s){return this.AVATAR.includes(s)||this.BASE.includes(s)},
 colOk(s){return this.COLORI.some(c=>c.v===s)},
 file(s){return String(s||'').replace(/[^a-z0-9-]/g,'')},
 icoSrc(s){return this.icoOk(s)?'img/ricompense/icone/'+this.file(s)+'.svg':''},
 avSrc(s){return this.avOk(s)?'img/ricompense/avatar/'+this.file(s)+'.svg':''},
 rpc(name,args){const c=DB.remote&&DB.remote.client;if(!c||!c.rpc)return Promise.reject(new Error('offline'));return c.rpc(name,args||{})},
 local(){try{return JSON.parse(localStorage.getItem(this.lkey)||'')}catch(e){return null}},
 setLocal(d){try{localStorage.setItem(this.lkey,JSON.stringify(d))}catch(e){}this.data=d},
 seed(){return{catalogo:[
  {id:'socio-fondatore',nome:'Socio fondatore',titolo:'Socio fondatore',icona:'socio-fondatore-b',colore:'#c4921a',cornice:'oro',sfondo:'navy-gold',avatar:['custode-arco','re-dei-meeple'],visibile:true,modo:'manuale',modo_param:{},priorita:100},
  {id:'pioniere-2026',nome:'Pioniere 2026',titolo:'Pioniere 2026',icona:'pioniere',colore:'#0e6b8a',cornice:'navy',sfondo:'teal',avatar:['esploratore-e','cartografa'],visibile:true,modo:'tessera_entro',modo_param:{entro:'2026-12-31',escludi:['socio-fondatore']},priorita:80},
  {id:'tester',nome:'Tester',titolo:'Tester',icona:'tester',colore:'#3d2c8a',cornice:'doppio',sfondo:'viola',avatar:['inventore','golem-dadi'],visibile:true,modo:'manuale',modo_param:{},priorita:60}
 ],assegnate:[],scelte:[]}},
 norm(d){const c=(d&&d.catalogo||[]).filter(r=>r&&typeof r.id==='string').map(r=>({
  id:this.file(r.id).slice(0,40),nome:String(r.nome||'').slice(0,60),titolo:String(r.titolo||'').slice(0,60),
  icona:this.icoOk(r.icona)?r.icona:'',colore:this.colOk(r.colore||r.colore_nome)?(r.colore||r.colore_nome):'',
  cornice:['oro','navy','doppio','alloro'].includes(r.cornice)?r.cornice:'',
  sfondo:['navy-gold','navy','gold','teal','verde','bordeaux','viola'].includes(r.sfondo)?r.sfondo:'',
  avatar:(r.avatar||r.avatar_sbloccati||[]).map(String).filter(a=>this.avOk(a)).slice(0,8),
  visibile:r.visibile!==false,modo:['manuale','tessera_entro','ruolo'].includes(r.modo)?r.modo:'manuale',
  modo_param:r.modo_param&&typeof r.modo_param==='object'?r.modo_param:{},priorita:Math.max(0,Math.min(1000,+r.priorita||0))
 }));
  const as=(d&&d.assegnate||[]).filter(a=>a&&a.member_id&&a.ricompensa_id).map(a=>({member_id:String(a.member_id),ricompensa_id:String(a.ricompensa_id)}));
  const sc=(d&&d.scelte||[]).filter(s=>s&&s.member_id&&this.TIPI.concat(['avatar']).includes(s.tipo)).map(s=>({member_id:String(s.member_id),tipo:s.tipo,ricompensa_id:String(s.ricompensa_id)}));
  return{catalogo:c,assegnate:as,scelte:sc}},
 async load(){if(this._p)return this._p;this._p=(async()=>{
  let d=null;
  if(DB.remote&&DB.status==='online'&&DB.remote.client){
   try{const {data,error}=await this.rpc('ricompense_stato');if(!error&&data)d=data}catch(e){}
  }
  if(!d)d=this.local()||this.seed();
  this.data=this.norm(d);if(!DB.remote||DB.status!=='online')this.setLocal(this.data);
  this.ready=true;return this.data})();
  try{return await this._p}finally{this._p=null}},
 async reload(){this.ready=false;return this.load()},
 cat(id){return this.data.catalogo.find(r=>r.id===id)},
 owned(mid){return this.data.assegnate.filter(a=>a.member_id===mid).map(a=>this.cat(a.ricompensa_id)).filter(Boolean)
  .sort((a,b)=>(b.priorita||0)-(a.priorita||0)||a.nome.localeCompare(b.nome,'it'))},
 effetti(mid){if(!mid)return null;
  const staff=typeof adminMode==='function'&&adminMode();
  const owned=this.owned(mid).filter(r=>r.visibile||staff);
  const pick=(tipo,has)=>{const l=owned.filter(has);if(!l.length)return null;
   const ch=this.data.scelte.find(s=>s.member_id===mid&&s.tipo===tipo);
   if(ch){const r=l.find(x=>x.id===ch.ricompensa_id);if(r)return r}return l[0]};
  const it=pick('titolo',r=>!!r.titolo),ic=pick('icona',r=>!!r.icona),co=pick('colore',r=>!!r.colore);
  const fr=pick('cornice',r=>!!r.cornice),bg=pick('sfondo',r=>!!r.sfondo);
  return{owned,titolo:it&&it.titolo||'',icona:ic&&ic.icona||'',colore:co&&co.colore||'',cornice:fr&&fr.cornice||'',sfondo:bg&&bg.sfondo||'',
   avatar:[...new Set(owned.flatMap(r=>r.avatar||[]))],pick:{titolo:it,icona:ic,colore:co,cornice:fr,sfondo:bg}}},
 iconHtml(mid){const e=this.effetti(mid),s=e&&this.icoSrc(e.icona);return s?`<img class="rcico" src="${s}" alt="" width="20" height="20">`:''},
 nameHtml(m,escaped){if(!m||!m.id)return escaped;const e=this.effetti(m.id),col=e&&this.colOk(e.colore)?` style="color:${e.colore}"`:'';
  return`${this.iconHtml(m.id)}<span class="rcnm"${col}>${escaped}</span>`},
 titleHtml(m){const e=m&&this.effetti(m.id);return e&&e.titolo?`<span class="rctit">${esc(e.titolo)}</span>`:''},
 frameClass(m){const e=m&&this.effetti(m.id);return e&&e.cornice?' rcfr-'+e.cornice:''},
 bgClass(m){const e=m&&this.effetti(m.id);return e&&e.sfondo?' rcbg-'+e.sfondo:''},
 avSlug(m){const a=m&&m.avatar!=null?String(m.avatar):'';return this.avOk(a)?a:''},
 // —— scritture
 async salva(r){if(DB.remote&&DB.remote.client&&DB.status==='online'){
   const p={id:r.id,nome:r.nome,titolo:r.titolo||'',icona:r.icona||'',colore:r.colore||'',cornice:r.cornice||'',sfondo:r.sfondo||'',
    avatar:r.avatar||[],visibile:r.visibile!==false,modo:r.modo||'manuale',modo_param:r.modo_param||{},priorita:+r.priorita||0};
   const {error}=await this.rpc('ricompensa_salva',{p});if(error)throw error;await this.reload();return r.id}
  const d=this.norm(this.data);const i=d.catalogo.findIndex(x=>x.id===r.id);if(i>=0)d.catalogo[i]=this.norm({catalogo:[r]}).catalogo[0];else d.catalogo.push(this.norm({catalogo:[r]}).catalogo[0]);this.setLocal(d);return r.id},
 async elimina(id){if(DB.remote&&DB.remote.client&&DB.status==='online'){const {error}=await this.rpc('ricompensa_elimina',{p_id:id});if(error)throw error;await this.reload();return}
  const d=this.norm(this.data);d.catalogo=d.catalogo.filter(r=>r.id!==id);d.assegnate=d.assegnate.filter(a=>a.ricompensa_id!==id);d.scelte=d.scelte.filter(s=>s.ricompensa_id!==id);this.setLocal(d)},
 async assegna(mid,rid,on){if(DB.remote&&DB.remote.client&&DB.status==='online'){const {error}=await this.rpc('ricompensa_assegna',{p_member:mid,p_ricompensa:rid,p_on:!!on});if(error)throw error;await this.reload();return}
  const d=this.norm(this.data);d.assegnate=d.assegnate.filter(a=>!(a.member_id===mid&&a.ricompensa_id===rid));if(on)d.assegnate.push({member_id:mid,ricompensa_id:rid});if(!on)d.scelte=d.scelte.filter(s=>!(s.member_id===mid&&s.ricompensa_id===rid));this.setLocal(d)},
 async scegli(tipo,rid){if(DB.remote&&DB.remote.client&&DB.status==='online'){const {error}=await this.rpc('ricompensa_scegli',{p_tipo:tipo,p_ricompensa:rid||null});if(error)throw error;await this.reload();return}
  const me=await this.myId();if(!me)throw new Error('Account non collegato');
  const d=this.norm(this.data);d.scelte=d.scelte.filter(s=>!(s.member_id===me&&s.tipo===tipo));if(rid)d.scelte.push({member_id:me,tipo,ricompensa_id:rid});this.setLocal(d)},
 async syncAuto(){if(DB.remote&&DB.remote.client&&DB.status==='online'){const {data,error}=await this.rpc('ricompense_sync_auto');if(error)throw error;await this.reload();return data}
  return{assegnate:0}},
 async myId(){try{const u=DB.remote&&DB.status==='online'?await DB.remote.user():null;if(!u)return null;const ms=await DB.members();const m=ms.find(x=>x.userId===u.id);return m?m.id:null}catch(e){return null}},
 async loadSospesi(){this.extra={};if(!(DB.remote&&DB.remote.client&&DB.status==='online'))return{};
  if(!(typeof adminMode==='function'&&adminMode()))return{};
  try{const {data,error}=await this.rpc('staff_soci_sospesi');if(error||!data)return{};
   (Array.isArray(data)?data:[]).forEach(x=>{if(x&&x.id)this.extra[x.id]={nota:x.nota||'',dal:x.dal||'',rientro:x.rientro||''}});
   const d=await DB.adapter.getAll();(d.members||[]).forEach(m=>{const e=this.extra[m.id];if(e){m.sospesoNota=e.nota;m.sospesoRientro=e.rientro;m.sospesoDal=e.dal}});
   if(DB.adapter.cache&&DB.adapter.cache.replaceAll)await DB.adapter.cache.replaceAll(d);
   return this.extra}catch(e){return{}}},
 async setSospeso(id,on,nota,rientro){if(DB.remote&&DB.remote.client&&DB.status==='online'){
   const {error}=await this.rpc('staff_socio_sospeso',{p_id:id,p_sospeso:!!on,p_nota:on?(nota||null):null,p_rientro:on&&rientro?rientro:null});
   if(error)throw error;await DB.remote.refresh();await this.loadSospesi();return}
  const d=await DB.adapter.getAll();const m=(d.members||[]).find(x=>x.id===id);if(!m)throw new Error('Socio non trovato');
  if(on){m.sospeso=true;m.sospesoNota=(nota||'').slice(0,300);m.sospesoRientro=rientro||'';m.sospesoDal=m.sospesoDal||new Date().toISOString()}
  else{m.sospeso=false;m.sospesoNota='';m.sospesoRientro='';m.sospesoDal=''}
  await DB.adapter.replaceAll(d)},
 // —— UI gestione
 slug(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)},
 async draw(id){if(!(typeof adminMode==='function'&&adminMode())){V.innerHTML='<h2>Ricompense</h2><p class="muted">Riservato allo staff.</p>';return}
  await this.load();const ms=await DB.members();
  if(id)return this.sheet(this.cat(id)||{id:'',nome:'',titolo:'',icona:'',colore:'',cornice:'',sfondo:'',avatar:[],visibile:true,modo:'manuale',modo_param:{},priorita:50},ms,!this.cat(id));
  const cnt=rid=>this.data.assegnate.filter(a=>a.ricompensa_id===rid).length;
  V.innerHTML=`<div class="hrow"><h2>🏅 Ricompense</h2><button class="s" id="rcbk">← Indietro</button></div>
   <p class="muted">Titolo, colore, icona, cornice, sfondo e avatar a tema. Gli effetti di tipo diverso si sommano; per i doppioni il socio sceglie dal profilo.</p>
   <div id="rcl">${this.data.catalogo.map(r=>`<div class="rec rcr" data-id="${esc(r.id)}"><span>${r.icona&&this.icoSrc(r.icona)?`<img class="rcico" src="${this.icoSrc(r.icona)}" alt="" width="20" height="20">`:''}<b>${esc(r.nome)}</b>${r.titolo&&r.titolo!==r.nome?` <span class="muted">· ${esc(r.titolo)}</span>`:''}<br><span class="muted">${cnt(r.id)} ${cnt(r.id)===1?'socio':'soci'} · ${r.visibile?'visibile':'nascosta'} · ${r.modo==='tessera_entro'?'automatica (tessera)':'manuale'}</span></span><span class="chip">${esc(String(r.priorita))}</span></div>`).join('')||'<p class="muted">Nessuna ricompensa.</p>'}</div>
   <button class="p" id="rcnew">➕ Nuova ricompensa</button>
   <button class="s" id="rcsync" style="width:100%;margin-top:8px">Aggiorna le automatiche</button>`;
  $('#rcbk').onclick=()=>go('altro');
  $('#rcnew').onclick=()=>this.draw('__new__');
  $('#rcsync').onclick=async()=>{try{const r=await this.syncAuto();toast('Assegnazioni automatiche aggiornate'+(r&&r.assegnate!=null?` (${r.assegnate} nuove)`:''));this.draw()}catch(e){toastErr(e,'SOCI')}};
  V.querySelectorAll('.rcr').forEach(el=>el.onclick=()=>this.draw(el.dataset.id))},
 async sheet(r,ms,isNew){const avAll=[...this.BASE,...this.AVATAR];
  const grid=(arr,key,ok,src,sel)=>{const cur=sel instanceof Array?sel:[sel];
   return`<div class="rcgrid">${arr.map(v=>{const on=cur.includes(v);const s=src(v);return`<button type="button" class="rcpick${on?' on':''}" data-${key}="${esc(v)}">${s?`<img src="${s}" alt="">`:esc(v)}</button>`}).join('')}<button type="button" class="rcpick${cur.filter(Boolean).length?'':' on'}" data-${key}="">Nessuna</button></div>`};
  V.innerHTML=`<div class="hrow"><h2>${isNew?'Nuova ricompensa':esc(r.nome)}</h2><button class="s" id="rcbk">← Elenco</button></div>
   <div class="card alform rcsheet"><label>Nome *</label><input id="rcnome" maxlength="60" value="${esc(r.nome)}">
   ${isNew?`<label>Identificativo (solo lettere, numeri e trattini)</label><input id="rcid" maxlength="40" value="${esc(r.id)}" placeholder="es. socio-fondatore">`:''}
   <label>Titolo sotto il nome (profilo e Community)</label><input id="rctitolo" maxlength="60" value="${esc(r.titolo||'')}">
   <label>Icona accanto al nome</label>${grid(this.ICONE,'icona',v=>this.icoOk(v),v=>this.icoSrc(v),r.icona)}
   <label>Colore del nome</label><div class="rcgrid">${this.COLORI.map(c=>`<button type="button" class="rcpick rccol${r.colore===c.v?' on':''}" data-colore="${c.v}" style="background:${c.v}" title="${esc(c.l)}"></button>`).join('')}<button type="button" class="rcpick${r.colore?'':' on'}" data-colore="">Nessuno</button></div>
   <label>Cornice della foto</label>${grid(this.CORNICI.map(c=>c.v),'cornice',()=>1,()=>'',r.cornice)}
   <p class="muted sm" style="margin-top:-6px">${this.CORNICI.map(c=>c.v+': '+c.l).join(' · ')}</p>
   <label>Sfondo del profilo</label>${grid(this.SFONDI.map(c=>c.v),'sfondo',()=>1,()=>'',r.sfondo)}
   <label>Avatar a tema sbloccati</label><div class="rcgrid">${avAll.map(v=>`<button type="button" class="rcpick${(r.avatar||[]).includes(v)?' on':''}" data-av="${v}"><img src="${this.avSrc(v)}" alt="${esc(v)}"></button>`).join('')}</div>
   <label class="lchk"><input type="checkbox" id="rcvis"${r.visibile!==false?' checked':''}> Visibile in app</label>
   <label>Come si ottiene</label><select id="rcmodo"><option value="manuale"${r.modo==='manuale'?' selected':''}>Assegnata a mano dallo staff</option><option value="tessera_entro"${r.modo==='tessera_entro'?' selected':''}>Automatica: tessera pagata entro una data</option></select>
   <div id="rcparam"${r.modo==='tessera_entro'?'':' hidden'}><label>Entro il</label><input id="rcentro" type="date" value="${esc((r.modo_param&&r.modo_param.entro)||'')}">
   <label>Escludi chi ha già (identificativi, separati da virgola)</label><input id="rcescl" maxlength="200" value="${esc(((r.modo_param&&r.modo_param.escludi)||[]).join(', '))}"></div>
   <label>Priorità (in caso di doppioni, se il socio non sceglie)</label><input id="rcpri"${typeof nA==='function'?nA('int',0,1000,'Priorità'):' type="number" min="0" max="1000"'} value="${esc(String(r.priorita||0))}">
   <button class="p" id="rcsv">Salva</button>${isNew?'':`<button class="s" id="rcdel" style="width:100%;margin-top:8px">Elimina ricompensa</button>`}</div>
   ${isNew?'':this.assignHtml(r,ms)}`;
  $('#rcbk').onclick=()=>this.draw();
  const pick=key=>{V.querySelectorAll('[data-'+key+']').forEach(b=>b.onclick=()=>{V.querySelectorAll('[data-'+key+']').forEach(x=>x.classList.toggle('on',x===b))})};
  pick('icona');pick('colore');pick('cornice');pick('sfondo');
  V.querySelectorAll('[data-av]').forEach(b=>b.onclick=()=>b.classList.toggle('on'));
  $('#rcmodo').onchange=()=>{$('#rcparam').hidden=$('#rcmodo').value!=='tessera_entro'};
  if($('#rcid')&&!$('#rcid').value)$('#rcnome').addEventListener('input',()=>{if(!$('#rcid').dataset.lock)$('#rcid').value=this.slug($('#rcnome').value)});
  if($('#rcid'))$('#rcid').addEventListener('input',()=>{$('#rcid').dataset.lock='1'});
  $('#rcsv').onclick=async()=>{try{if(typeof numForm==='function'&&!numForm(V))return;const nome=$('#rcnome').value.trim();if(nome.length<2)return toast('Il nome è obbligatorio');
   const id=isNew?this.slug($('#rcid').value||nome):r.id;if(!/^[a-z0-9-]{2,40}$/.test(id))return toast('Identificativo non valido');
   const icona=(V.querySelector('[data-icona].on')||{}).dataset.icona||'';
   const colore=(V.querySelector('[data-colore].on')||{}).dataset.colore||'';
   const cornice=(V.querySelector('[data-cornice].on')||{}).dataset.cornice||'';
   const sfondo=(V.querySelector('[data-sfondo].on')||{}).dataset.sfondo||'';
   const avatar=[...V.querySelectorAll('[data-av].on')].map(b=>b.dataset.av).filter(a=>this.avOk(a));
   const modo=$('#rcmodo').value,entro=$('#rcentro')&&$('#rcentro').value,escl=($('#rcescl')&&$('#rcescl').value||'').split(',').map(s=>s.trim()).filter(s=>/^[a-z0-9-]{2,40}$/.test(s));
   if(modo==='tessera_entro'&&!/^\d{4}-\d{2}-\d{2}$/.test(entro||''))return toast('Indica la data entro cui deve essere pagata la tessera');
   await this.salva({id,nome,titolo:$('#rctitolo').value.trim(),icona,colore,cornice,sfondo,avatar,visibile:$('#rcvis').checked,modo,modo_param:modo==='tessera_entro'?{entro,escludi:escl}:{},priorita:+$('#rcpri').value||0});
   toast('Ricompensa salvata');this.draw(id)}catch(e){toastErr(e,'SOCI')}};
  if($('#rcdel'))$('#rcdel').onclick=async()=>{if(!await ask('Eliminare «'+r.nome+'»? Le assegnazioni verranno tolte.'))return;try{await this.elimina(r.id);toast('Ricompensa eliminata');this.draw()}catch(e){toastErr(e,'SOCI')}};
  this.bindAssign(r,ms)},
 assignHtml(r,ms){const has=id=>this.data.assegnate.some(a=>a.member_id===id&&a.ricompensa_id===r.id);
  return`<div class="card"><b>Assegna a un socio</b>
   <input id="rcaq" type="search" maxlength="80" placeholder="🔍 Cerca per nome" autocomplete="off">
   <div id="rcal" class="rcal">${ms.map(m=>`<label class="rcaln" data-q="${esc([m.nome,m.cognome,m.soprannome,memberName(m)].filter(Boolean).join(' ').toLowerCase())}"><input type="checkbox" data-am="${esc(m.id)}"${has(m.id)?' checked':''}> ${esc(memberName(m))}</label>`).join('')}</div></div>`},
 bindAssign(r,ms){const q=$('#rcaq'),box=$('#rcal');if(!q||!box)return;
  const filt=()=>{const v=q.value.trim().toLowerCase();box.querySelectorAll('.rcaln').forEach(l=>{l.hidden=!!v&&!((l.dataset.q||'').includes(v))})};
  q.oninput=filt;filt();
  box.querySelectorAll('[data-am]').forEach(cb=>cb.onchange=async()=>{try{await this.assegna(cb.dataset.am,r.id,cb.checked);toast(cb.checked?'Assegnata':'Rimossa')}catch(e){cb.checked=!cb.checked;toastErr(e,'SOCI')}})},
 // riquadro nella scheda socio (Gestione)
 boxHtml(m){if(!m)return'';const ids=new Set(this.owned(m.id).map(r=>r.id));
  return`<div class="rcbox"><b>Ricompense</b>${this.data.catalogo.map(r=>`<label class="lchk"><input type="checkbox" data-rcass="${esc(r.id)}"${ids.has(r.id)?' checked':''}> ${esc(r.nome)}</label>`).join('')||'<p class="muted">Nessuna ricompensa in catalogo.</p>'}</div>`},
 bindBox(root,m){if(!root||!m)return;root.querySelectorAll('[data-rcass]').forEach(cb=>cb.onchange=async()=>{try{await this.assegna(m.id,cb.dataset.rcass,cb.checked);toast(cb.checked?'Ricompensa assegnata':'Ricompensa tolta')}catch(e){cb.checked=!cb.checked;toastErr(e,'SOCI')}})},
 mountBox(root,m){if(!root||!m||root.querySelector('.rcbox'))return;const wrap=document.createElement('div');wrap.innerHTML=this.boxHtml(m);root.append(...wrap.childNodes);this.bindBox(root,m)},
 // selettore effetti nel profilo del socio
 selHtml(m){const e=this.effetti(m.id);if(!e||e.owned.length<1)return'';
  const tipi=this.TIPI.map(t=>{const l=e.owned.filter(r=>t==='titolo'?r.titolo:t==='icona'?r.icona:t==='colore'?r.colore:t==='cornice'?r.cornice:r.sfondo);if(l.length<2)return'';
   const cur=e.pick[t]&&e.pick[t].id;
   return`<label>${esc(this.LAB[t])}</label><select data-rcsc="${t}">${l.map(r=>`<option value="${esc(r.id)}"${r.id===cur?' selected':''}>${esc(r.nome)}</option>`).join('')}</select>`}).join('');
  const avs=[...this.BASE,...e.avatar];
  const avSel=avs.length?`<label>Avatar a tema</label><div class="rcgrid rcavsel">${avs.map(v=>`<button type="button" class="rcpick${this.avSlug(m)===v?' on':''}" data-rcav="${v}"><img src="${this.avSrc(v)}" alt=""></button>`).join('')}<button type="button" class="rcpick${this.avSlug(m)?'':' on'}" data-rcav="">Iniziali o foto</button></div>`:'';
  if(!tipi&&!avSel)return'';
  return`<div class="card rcsel"><b>Le tue ricompense</b>${e.owned.map(r=>`<div class="rec"><span>${r.icona&&this.icoSrc(r.icona)?`<img class="rcico" src="${this.icoSrc(r.icona)}" alt="" width="20" height="20">`:''}${esc(r.nome)}${r.titolo?` <span class="muted">· ${esc(r.titolo)}</span>`:''}</span></div>`).join('')}${tipi?'<p class="muted sm">Hai più effetti dello stesso tipo: scegli quale mostrare.</p>'+tipi:''}${avSel}</div>`},
 bindSel(root,m,onAv){if(!root||!m)return;
  root.querySelectorAll('[data-rcsc]').forEach(s=>s.onchange=async()=>{try{await this.scegli(s.dataset.rcsc,s.value);toast('Scelta salvata');if(typeof go==='function')go('profilo')}catch(e){toastErr(e,'APP')}});
  root.querySelectorAll('[data-rcav]').forEach(b=>b.onclick=()=>{if(onAv)onAv(b.dataset.rcav||'')})},
 // dialogo sospensione
 async askSospeso(m){return new Promise(res=>{const w=document.createElement('div');w.className='mdl';
   const e=this.extra[m.id]||{};
   w.innerHTML=`<div class="mbox"><div class="mtt">Sospendi ${esc(memberName(m))}</div>
    <p class="muted">Il socio resta nel registro, con partite e EXP. Non conta nell'avviso dei pagamenti, non compare tra gli attivi né nelle classifiche del periodo.</p>
    <label>Nota (facoltativa)</label><textarea id="sosn" maxlength="300" rows="3">${esc(m.sospesoNota||e.nota||'')}</textarea>
    <label>Data di rientro (facoltativa)</label><input id="sosd" type="date" value="${esc(m.sospesoRientro||e.rientro||'')}">
    <div class="mbt"><button class="s" data-x>Annulla</button><button class="p" data-ok>Sospendi</button></div></div>`;
   document.body.appendChild(w);
   const close=v=>{w.remove();res(v)};
   w.querySelector('[data-x]').onclick=()=>close(null);
   w.querySelector('[data-ok]').onclick=()=>close({nota:w.querySelector('#sosn').value.trim().slice(0,300),rientro:w.querySelector('#sosd').value||''});
   w.addEventListener('click',ev=>{if(ev.target===w)close(null)})}) }
};

// Vista Gestione → Ricompense
if(typeof views==='object')views.ricompense=async()=>RC.draw();

// Carica i dati insieme a XP, così nomi e icone sono pronti al primo disegno.
if(typeof XP==='object'&&XP.ensure){const _e=XP.ensure.bind(XP);XP.ensure=()=>Promise.all([_e(),RC.load().catch(()=>{})])}

// Decorazione lieve dopo il render (titolo in Community / sfondo profilo), se i template l'hanno già messo non raddoppia.
if(typeof views==='object'&&views.profilo){const _pf=views.profilo;views.profilo=async function(...a){const r=await _pf.apply(this,a);try{await RC.load();
  const ms=await DB.members(),u=DB.remote&&DB.status==='online'?await DB.remote.user():null;
  let m=null,own=false;
  if(window._pv){m=ms.find(x=>x.id===window._pv);own=!!(m&&u&&m.userId===u.id)}
  else{m=u?ms.find(x=>x.userId===u.id):null;own=!!m}
  if(!m)return r;
  const host=typeof V!=='undefined'&&V.querySelector('.card.prof');
  if(own&&host&&!V.querySelector('.rcsel')){const wrap=document.createElement('div');wrap.innerHTML=RC.selHtml(m);
   const card=wrap.querySelector('.rcsel');if(card){host.after(card);
    RC.bindSel(card,m,async slug=>{try{if(!DB.remote||!DB.remote.updateProfile){m.avatar=slug||'';toast('Avatar aggiornato');if(typeof go==='function')go('profilo');return}
     await DB.remote.updateProfile({soprannome:m.soprannome||'',avatar:slug||'',color:m.color||'',favGameId:m.favGameId||'',photoUrl:m.photoUrl||''});
     toast('Avatar aggiornato');if(DB.remote.refresh)await DB.remote.refresh();if(typeof go==='function')go('profilo')}catch(e){toastErr(e,'APP')}});
   }}
 }catch(e){console.warn('ricompense profilo',e)}return r}}
window.RC=RC;
