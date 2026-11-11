// v41.11.1 — Tipi di tavolo configurabili (Gioco da tavolo / GDR / Warhammer).
// Staff (admin + moderatori): Gestione → Tavoli. Capienza lato DB + UI.
// Solo textContent/createElement o esc() negli HTML. Mai «club»/«ludoteca».
(()=>{
const DEF_TYPES=[
  {id:'board',nome:'Gioco da tavolo',icona:'🎲',sort:10,attivo:true,capacity_default:5,kind:'board'},
  {id:'gdr',nome:'GDR',icona:'🐉',sort:20,attivo:true,capacity_default:2,kind:'gdr'},
  {id:'war',nome:'Warhammer',icona:'⚔️',sort:30,attivo:true,capacity_default:2,kind:'war'}
];
const CFG_DEF={ora_default:'21:00',pieno_msg:'I tavoli {tipo} per questa serata sono al completo. Per ulteriori prenotazioni contatta lo staff nel gruppo WhatsApp.',whatsapp_url:''};
const TT={
  types:DEF_TYPES.slice(),
  caps:{}, // 'YYYY-MM-DD|typeId' -> n
  cfg:{...CFG_DEF},
  loaded:false,
  t(k){const K='tt_'+k;return(typeof TXT!=='undefined'&&TXT.v&&typeof TXT.v[K]==='string'&&TXT.v[K])||({pieno:CFG_DEF.pieno_msg,wa:'',ora:'21:00',ora_lab:'Orario della serata',gest:'Tipi di tavolo',tipi:'Tipi',cap:'Disponibili per serata',master:'Master',gioco:'Gioco',nota:'Nota',posti:'Posti (master compreso)',versione:'Versione',versione_ph:'es. Warhammer 40.000 10ª edizione',filtro:'Tipo di tavolo',tutto:'Tutto',reg_gdr:'Registra sessione GDR',reg_altro:'Registra una partita',sistema:'Sistema / gioco',avventura:'Avventura / campagna',sessione:'Sessione',oneshot:'One-shot',campagna:'Campagna',sess_n:'Sessione n°',esito:'Esito',conclusa:'Avventura conclusa',incorso:'In corso',esito_nota:"Nota sull'esito",pg:'Personaggio',nome_partita:'Nome'})[k]||k},
  async load(){
    const c=DB.remote&&DB.remote.client;
    if(!c){this.types=DEF_TYPES.slice();this.cfg={...CFG_DEF};this.loaded=true;this.loadThumbs();return}
    try{
      const[{data:types},{data:cfgRow}]=await Promise.all([
        c.from('table_types').select('*').order('sort'),
        c.from('app_settings').select('value').eq('key','tavoli_cfg').maybeSingle()
      ]);
      if(Array.isArray(types)&&types.length) this.types=types.map(x=>({id:x.id,nome:x.nome,icona:x.icona||'🎲',sort:+x.sort||0,attivo:x.attivo!==false,capacity_default:+x.capacity_default||0,kind:x.kind||'board'}));
      else this.types=DEF_TYPES.slice();
      if(cfgRow&&cfgRow.value) this.cfg={ora_default:cfgRow.value.ora_default||CFG_DEF.ora_default,pieno_msg:cfgRow.value.pieno_msg||CFG_DEF.pieno_msg,whatsapp_url:cfgRow.value.whatsapp_url||''};
      else this.cfg={...CFG_DEF};
    }catch(e){console.warn('tavoli-tipi load',e);this.types=DEF_TYPES.slice();this.cfg={...CFG_DEF}}
    this.loaded=true;this.loadThumbs();
  },
  attivo(){return this.types.filter(t=>t.attivo).sort((a,b)=>a.sort-b.sort)},
  byId(id){return this.types.find(t=>t.id===id)||DEF_TYPES[0]},
  async capacity(date,typeId){
    const c=DB.remote&&DB.remote.client;
    if(c){try{const{data}=await c.rpc('table_type_capacity',{p_date:date,p_type:typeId});if(typeof data==='number')return data}catch(e){}
      try{const{data}=await c.from('table_type_caps').select('capacity').eq('date',date).eq('type_id',typeId).maybeSingle();
        if(data&&data.capacity!=null)return +data.capacity}catch(e){}}
    return +this.byId(typeId).capacity_default||0;
  },
  async countOpen(date,typeId){
    const ts=await DB.allTables();
    return ts.filter(t=>t.date===date&&(t.typeId||'board')===typeId&&t.status==='open').length;
  },
  async remaining(date,typeId){const cap=await this.capacity(date,typeId),n=await this.countOpen(date,typeId);const r=Math.max(0,cap-n);this.remCache[date+'|'+typeId]=r;return r},
  pienoMsg(typeId){const t=this.byId(typeId);const msg=(typeof TXT!=='undefined'&&TXT.g('tt_pieno'))||this.cfg.pieno_msg||CFG_DEF.pieno_msg;return String(msg).replace(/\{tipo\}/g,t.nome)},
  waUrl(){const u=(typeof TXT!=='undefined'&&TXT.g('tt_wa'))||this.cfg.whatsapp_url||'';return /^https:\/\/(chat\.whatsapp\.com|wa\.me)\//.test(u)?u:''},
  oraDefault(){const o=(typeof TXT!=='undefined'&&TXT.g('tt_ora'))||this.cfg.ora_default||'21:00';return /^[0-2]\d:[0-5]\d$/.test(o)?o:'21:00'},
  remCache:{},
  remainingCached(date,typeId){const v=this.remCache[date+'|'+typeId];return typeof v==='number'?v:null},
  label(t,gs){
    gs=gs||[];
    if(t&&t.gameId){const g=gs.find(x=>x.id===t.gameId);if(g&&g.name)return{id:g.id,name:g.name}}
    const n=String((t&&(t.gameName||t.versione||(t.gdr&&t.gdr.sistema)))||'').trim();
    if(n)return{id:null,name:n};
    const typ=this.byId((t&&(t.typeId||t.playKind))||'board');
    return{id:null,name:typ.nome||'Tavolo'};
  },
  _thumbs:{},
  loadThumbs(){try{this._thumbs=Object.assign({},JSON.parse(localStorage.getItem('pergioco-rpg-thumbs')||'{}'))}catch(e){this._thumbs={}}},
  saveThumbs(){try{localStorage.setItem('pergioco-rpg-thumbs',JSON.stringify(this._thumbs))}catch(e){}},
  thumbUrl(id){if(!id)return'';const u=this._thumbs[String(id)];return(typeof safeUrl==='function'?safeUrl(u,true):(/^https:\/\/cf\.geekdo-images\.com\//.test(u)?u:''))||''},
  cov(t,gs){
    const typ=this.byId((t&&(t.typeId||t.playKind))||'board');
    if(t&&t.gameId){const g=(gs||[]).find(x=>x.id===t.gameId);if(g&&typeof gCov==='function')return gCov(g);if(g)return'<div class="gcov" aria-hidden="true">🎲</div>'}
    const rpg=t&&(t.bggRpgId||(t.gdr&&t.gdr.bggRpgId));
    if(typ.kind==='gdr'||rpg){
      const u=this.thumbUrl(rpg);
      if(u)return`<div class="gcov" aria-hidden="true"><img src="${esc(u)}" alt="" loading="lazy" decoding="async" width="48" height="48" referrerpolicy="no-referrer"></div>`;
      return'<div class="gcov" aria-hidden="true">🐉</div>';
    }
    return`<div class="gcov" aria-hidden="true">${esc(typ.icona||(typ.kind==='war'?'⚔️':'🎲'))}</div>`;
  },
  async fetchThumb(id){
    id=id?String(id):'';if(!id)return'';if(this.thumbUrl(id))return this.thumbUrl(id);
    const c=DB.remote&&DB.remote.client;if(!c||!c.functions)return'';
    try{
      const{data}=await c.functions.invoke('bgg-meta',{body:{mode:'info',bgg_id:+id}});
      const u=data&&data.thumb;const ok=typeof safeUrl==='function'?safeUrl(u,true):u;
      if(ok){this._thumbs[id]=ok;this.saveThumbs();return ok}
    }catch(e){}
    return'';
  }
};

window.TT=TT;

const escTxt=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/[<>]/g,'').trim();

// --- Gestione → Tavoli (staff) ---
async function gestTavoli(){
  if(typeof adminMode!=='function'||!adminMode()){V.replaceChildren();V.append(Object.assign(document.createElement('div'),{className:'card',textContent:'🔒 Solo lo staff può configurare i tavoli.'}));return}
  await TT.load();
  const top=()=>{const h=document.createElement('div');h.className='hrow';const t=document.createElement('h2');t.textContent='🪑 '+(TT.t('gest')||'Tipi di tavolo');const b=document.createElement('button');b.className='s';b.type='button';b.textContent='← Gestione';b.onclick=()=>go('altro');h.append(t,b);return h};
  const draw=async()=>{
    V.replaceChildren();V.append(top());
    V.append(Object.assign(document.createElement('p'),{className:'muted sm',textContent:'ⓘ Tipi di tavolo, capienza per serata e messaggio quando un tipo è pieno. Valori di default = testi di oggi.'}));
    // cfg card
    const cfg=document.createElement('div');cfg.className='card';
    const lbOra=document.createElement('label');lbOra.textContent=TT.t('ora_lab')||'Orario della serata';
    const inOra=document.createElement('input');inOra.type='time';inOra.id='tt-ora';inOra.value=TT.oraDefault();inOra.required=true;
    const lbMsg=document.createElement('label');lbMsg.textContent='Messaggio tipo pieno ({tipo} = nome)';
    const taMsg=document.createElement('textarea');taMsg.id='tt-msg';taMsg.maxLength=280;taMsg.rows=3;taMsg.value=TT.cfg.pieno_msg||CFG_DEF.pieno_msg;
    const lbWa=document.createElement('label');lbWa.textContent='Link WhatsApp (facoltativo)';
    const inWa=document.createElement('input');inWa.id='tt-wa';inWa.maxLength=200;inWa.placeholder='https://chat.whatsapp.com/…';inWa.value=TT.cfg.whatsapp_url||'';
    const saveCfg=document.createElement('button');saveCfg.className='p';saveCfg.type='button';saveCfg.textContent='Salva impostazioni serata';
    saveCfg.onclick=async()=>{
      const ora=inOra.value,msg=escTxt(taMsg.value).slice(0,280),wa=String(inWa.value||'').trim();
      if(!/^[0-2]\d:[0-5]\d$/.test(ora))return toast('Orario non valido');
      if(msg.length<10)return toast('Messaggio troppo corto');
      if(wa&&!/^https:\/\/(chat\.whatsapp\.com|wa\.me)\//.test(wa))return toast('Link WhatsApp non valido');
      const c=DB.remote&&DB.remote.client;if(!c)return toast('⚠️ Server non disponibile');
      const value={ora_default:ora,pieno_msg:msg,whatsapp_url:wa};
      const{error}=await c.from('app_settings').upsert({key:'tavoli_cfg',value});if(error)return toast('⚠️ '+error.message);
      // mirror into TXT if keys exist
      try{if(typeof TXT!=='undefined'&&TXT.v){TXT.v.tt_ora=ora;TXT.v.tt_pieno=msg;TXT.v.tt_wa=wa;await TXT.save(TXT.v)}}catch(e){}
      TT.cfg=value;toast('✅ Impostazioni salvate');
    };
    cfg.append(lbOra,inOra,lbMsg,taMsg,lbWa,inWa,saveCfg);V.append(cfg);

    // types list
    const list=document.createElement('div');list.className='card';
    list.append(Object.assign(document.createElement('b'),{textContent:TT.t('tipi')||'Tipi'}));
    TT.types.slice().sort((a,b)=>a.sort-b.sort).forEach(t=>{
      const row=document.createElement('div');row.className='alr';row.style.cursor='pointer';
      const ic=document.createElement('span');ic.className='ic';ic.textContent=t.icona;
      const tx=document.createElement('span');tx.className='t';
      const b=document.createElement('b');b.textContent=t.nome+(t.attivo?'':' (disattivo)');
      const sub=document.createElement('span');sub.className='sub';sub.textContent=`${TT.t('cap')}: ${t.capacity_default}`;
      tx.append(b,sub);const ar=document.createElement('span');ar.className='ar';ar.textContent='▸';
      row.append(ic,tx,ar);row.onclick=()=>editType(t);list.append(row);
    });
    const add=document.createElement('button');add.className='s';add.type='button';add.textContent='＋ Aggiungi tipo';add.onclick=()=>editType(null);
    list.append(add);V.append(list);

    // capacity override for a date
    const capC=document.createElement('div');capC.className='card';
    capC.append(Object.assign(document.createElement('b'),{textContent:'Capienza per una data'}));
    const dLab=document.createElement('label');dLab.textContent='Data';
    const dIn=document.createElement('input');dIn.type='date';dIn.id='tt-cap-d';dIn.min=romeToday();dIn.value=romeToday();
    const rows=document.createElement('div');rows.id='tt-cap-rows';
    const fillCaps=async()=>{
      rows.replaceChildren();
      const date=dIn.value;if(!date)return;
      for(const t of TT.attivo()){
        const rem=await TT.remaining(date,t.id);const cap=await TT.capacity(date,t.id);
        const r=document.createElement('div');r.className='row';r.style.alignItems='center';r.style.gap='8px';r.style.marginTop='8px';
        const lab=document.createElement('label');lab.style.flex='1';lab.textContent=`${t.icona} ${t.nome}`;
        const inp=document.createElement('input');inp.type='number';inp.min='0';inp.max='100';inp.value=String(cap);inp.dataset.tid=t.id;inp.style.width='72px';
        const hint=document.createElement('span');hint.className='muted sm';hint.textContent=`aperti ${cap-rem}/${cap}`;
        r.append(lab,inp,hint);rows.append(r);
      }
    };
    dIn.onchange=fillCaps;await fillCaps();
    const saveCap=document.createElement('button');saveCap.className='p';saveCap.type='button';saveCap.textContent='Salva capienze per la data';
    saveCap.onclick=async()=>{
      const c=DB.remote&&DB.remote.client;if(!c)return toast('⚠️ Server non disponibile');
      const date=dIn.value;if(!date)return;
      for(const inp of rows.querySelectorAll('input[data-tid]')){
        const capacity=Math.max(0,Math.min(100,+inp.value||0));
        const{error}=await c.from('table_type_caps').upsert({date,type_id:inp.dataset.tid,capacity});
        if(error)return toast('⚠️ '+error.message);
      }
      toast('✅ Capienze salvate');fillCaps();
    };
    capC.append(dLab,dIn,rows,saveCap);V.append(capC);
  };
  const editType=async(t)=>{
    const isNew=!t;t=t?{...t}:{id:'',nome:'',icona:'🎲',sort:99,attivo:true,capacity_default:2,kind:'custom'};
    V.replaceChildren();V.append(top());
    const box=document.createElement('div');box.className='card';
    const fields=[
      ['id','Id (solo lettere minuscole)',t.id,32,isNew],
      ['nome','Nome',t.nome,40,true],
      ['icona','Icona',t.icona,8,true],
      ['capacity_default',TT.t('cap'),String(t.capacity_default),3,true],
    ];
    const inputs={};
    fields.forEach(([k,lab,val,max,ed])=>{
      const L=document.createElement('label');L.textContent=lab;
      const I=document.createElement('input');I.value=val;I.maxLength=max;I.disabled=!ed&&k==='id';if(k==='capacity_default')I.type='number';
      inputs[k]=I;box.append(L,I);
    });
    const Lk=document.createElement('label');Lk.textContent='Modello campi';
    const Sk=document.createElement('select');
    [['board','Gioco da tavolo (gioco della collezione)'],['gdr','GDR (master + gioco RPG)'],['war','Warhammer (posti + orario)'],['custom','Personalizzato (come Warhammer)']].forEach(([v,l])=>{
      const o=document.createElement('option');o.value=v;o.textContent=l;if(t.kind===v)o.selected=true;Sk.append(o);
    });
    box.append(Lk,Sk);
    const act=document.createElement('label');act.className='gck';
    const ck=document.createElement('input');ck.type='checkbox';ck.checked=!!t.attivo;
    act.append(ck,document.createTextNode(' Attivo'));box.append(act);
    const save=document.createElement('button');save.className='p';save.type='button';save.textContent='Salva';
    save.onclick=async()=>{
      const id=String(inputs.id.value||'').trim().toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,32);
      const nome=escTxt(inputs.nome.value).slice(0,40);
      const icona=String(inputs.icona.value||'🎲').slice(0,8);
      const capacity_default=Math.max(0,Math.min(100,+inputs.capacity_default.value||0));
      const kind=Sk.value;const attivo=ck.checked;
      if(id.length<2||nome.length<2)return toast('Id e nome obbligatori');
      const c=DB.remote&&DB.remote.client;if(!c)return toast('⚠️ Server non disponibile');
      const row={id,nome,icona,capacity_default,kind,attivo,sort:t.sort||99};
      const{error}=await c.from('table_types').upsert(row);if(error)return toast('⚠️ '+error.message);
      toast('✅ Tipo salvato');await TT.load();draw();
    };
    const back=document.createElement('button');back.className='s';back.type='button';back.textContent='Annulla';back.onclick=draw;
    box.append(save,back);V.append(box);
  };
  await draw();
}
views.tavolitipi=gestTavoli;

// --- Wrap agSheet ---
const _agSheet=typeof agSheet==='function'?agSheet:null;
window.agSheet=async function(opts){
  await TT.load();
  const {gs,ms,meM,staff,S,oggi}=opts;
  if(document.querySelector('.agov'))return;
  const pf=opts.prefill||window._agPrefill||null;window._agPrefill=null;
  const pfIds=pf&&Array.isArray(pf.memberIds)?pf.memberIds.filter(id=>ms.some(m=>m.id===id)):[];
  let D=isoOk(S.date)&&S.date>=oggi?S.date:oggi;
  let typeId=TT.attivo()[0]?.id||'board';
  const o=document.createElement('div');o.className='agov';
  const sheet=document.createElement('div');sheet.className='agsheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');
  const hd=document.createElement('div');hd.className='aghd';
  const h3=document.createElement('h3');h3.id='agst';h3.textContent='Apri un tavolo';
  const xc=document.createElement('button');xc.type='button';xc.className='agclose';xc.setAttribute('aria-label','Chiudi');xc.textContent='✕';
  hd.append(h3,xc);sheet.append(hd);

  // type picker
  const typeWrap=document.createElement('div');typeWrap.className='tttypes';
  const typeLab=document.createElement('label');typeLab.textContent='Tipo di tavolo';typeWrap.append(typeLab);
  const typeSeg=document.createElement('div');typeSeg.className='seg ttseg';typeWrap.append(typeSeg);
  sheet.append(typeWrap);

  const hostBlock=document.createElement('div');
  if(staff){
    const lh=document.createElement('label');lh.htmlFor='th';lh.textContent='Chi ospita';
    const sh=document.createElement('select');sh.id='th';
    ms.slice().sort((a,b)=>memberName(a).localeCompare(memberName(b),'it')).forEach(m=>{
      const opt=document.createElement('option');opt.value=m.id;opt.textContent=memberName(m);if(meM&&m.id===meM.id)opt.selected=true;sh.append(opt);
    });
    hostBlock.append(lh,sh);
  }else{
    const d=document.createElement('div');d.className='agme';d.textContent='🏠 Ospiti tu, '+memberName(meM)+': il tuo posto è già incluso.';
    const hi=document.createElement('input');hi.type='hidden';hi.id='th';hi.value=meM.id;hostBlock.append(d,hi);
  }
  sheet.append(hostBlock);

  const dayLab=document.createElement('label');dayLab.textContent='Giorno';
  const dayBtn=document.createElement('button');dayBtn.type='button';dayBtn.className='s agdb';dayBtn.id='agdb';
  const dayIn=document.createElement('input');dayIn.type='date';dayIn.id='agdt';dayIn.lang='it';dayIn.min=oggi;dayIn.value=D;dayIn.className='agdi';dayIn.tabIndex=-1;dayIn.setAttribute('aria-hidden','true');
  sheet.append(dayLab,dayBtn,dayIn);

  const fields=document.createElement('div');fields.id='tt-fields';sheet.append(fields);
  const pieno=document.createElement('div');pieno.className='card warn ttfull';pieno.hidden=true;sheet.append(pieno);
  const goBtn=document.createElement('button');goBtn.type='button';goBtn.className='p';goBtn.id='tsv';goBtn.textContent='Apri il tavolo';sheet.append(goBtn);
  // logo BGG when GDR search
  const logoSlot=document.createElement('div');logoSlot.id='tt-bgglogo';sheet.append(logoSlot);

  o.append(sheet);document.body.append(o);requestAnimationFrame(()=>o.classList.add('on'));
  const rel=backClose(()=>o.remove());const close=()=>{rel();o.remove()};
  o.onclick=e=>{if(e.target===o||e.target.closest('.agclose'))close()};

  const sd=()=>{dayBtn.textContent='📅 '+(D===oggi?'Oggi, ':'')+agLbl(D)};sd();
  dayBtn.onclick=()=>{try{dayIn.showPicker()}catch(e){dayIn.click()}};
  dayIn.onchange=e=>{const v=e.target.value;if(isoOk(v)&&v>=oggi){D=v;sd();paintNow()}else{toast('Data non valida');e.target.value=D}};

  let rpgSel=null;
  const paintFields=()=>{
    fields.replaceChildren();logoSlot.replaceChildren();rpgSel=null;goBtn.disabled=false;goBtn.classList.remove('off');pieno.hidden=true;
    const t=TT.byId(typeId);
    const cached=TT.remainingCached(D,typeId);
    if(cached===0){
      pieno.hidden=false;pieno.replaceChildren();
      const p=document.createElement('p');p.textContent=TT.pienoMsg(typeId);pieno.append(p);
      const wa=TT.waUrl();if(wa){const a=document.createElement('button');a.type='button';a.className='s';a.style.width='100%';a.style.marginTop='8px';a.style.textDecoration='none';a.textContent='Apri il gruppo WhatsApp ▸';a.onclick=()=>window.open(wa,'_blank','noopener,noreferrer');pieno.append(a)}
      goBtn.disabled=true;goBtn.classList.add('off');
    }else if(cached==null){
      pieno.hidden=true;
    }
    const row=document.createElement('div');row.className='row';
    const d1=document.createElement('div');
    const lp=document.createElement('label');lp.htmlFor='tp';lp.textContent=t.kind==='gdr'?(TT.t('posti')||'Posti (master compreso)'):'Posti (te compreso)';
    const ip=document.createElement('input');ip.id='tp';ip.type='number';ip.min='1';ip.max='100';ip.required=true;ip.value=t.kind==='war'?'2':String((gs[0]&&gs[0].max)||4);
    d1.append(lp,ip);
    const d2=document.createElement('div');
    const lt=document.createElement('label');lt.htmlFor='tt';lt.textContent='Ora di inizio';
    const it=document.createElement('input');it.id='tt';it.type='time';it.required=true;it.value=TT.oraDefault();
    d2.append(lt,it);row.append(d1,d2);fields.append(row);

    if(t.kind==='board'){
      const lg=document.createElement('label');lg.textContent='Gioco';
      const sg=document.createElement('select');sg.id='tg';
      gs.forEach(g=>{const opt=document.createElement('option');opt.value=g.id;opt.textContent=g.name;sg.append(opt)});
      fields.insertBefore(sg,row);fields.insertBefore(lg,sg);
      if(typeof gpMount==='function')gpMount(sg,gs,[],null);
      sg.onchange=()=>{ip.value=String((gs.find(g=>g.id===sg.value)||{}).max||4)};
      const ln=document.createElement('label');ln.htmlFor='tn';ln.textContent=(TT.t('nota')||'Nota')+' (facoltativa)';
      const inn=document.createElement('input');inn.id='tn';inn.maxLength=120;inn.placeholder='es. spiego io le regole';
      fields.append(ln,inn);
    }else if(t.kind==='gdr'){
      const lm=document.createElement('label');lm.textContent=TT.t('master')||'Master';
      const sm=document.createElement('select');sm.id='tt-master';
      const oSelf=document.createElement('option');oSelf.value=meM?meM.id:'';oSelf.textContent=meM?('Io · '+memberName(meM)):'—';sm.append(oSelf);
      ms.filter(m=>!meM||m.id!==meM.id).sort((a,b)=>memberName(a).localeCompare(memberName(b),'it')).forEach(m=>{
        const opt=document.createElement('option');opt.value=m.id;opt.textContent=memberName(m);sm.append(opt);
      });
      const oFree=document.createElement('option');oFree.value='__free__';oFree.textContent='Altro (testo libero)…';sm.append(oFree);
      const free=document.createElement('input');free.id='tt-master-free';free.maxLength=60;free.placeholder='Nome del master';free.hidden=true;
      sm.onchange=()=>{free.hidden=sm.value!=='__free__'};
      fields.append(lm,sm,free);
      const lg=document.createElement('label');lg.textContent=TT.t('gioco')||'Gioco';
      const iq=document.createElement('input');iq.id='tt-rpgq';iq.maxLength=100;iq.placeholder='Cerca su RPGGeek oppure scrivi il nome';iq.autocomplete='off';
      const res=document.createElement('div');res.id='tt-rpgr';
      const picked=document.createElement('div');picked.id='tt-rpgpick';picked.className='muted sm';
      let tm;
      iq.oninput=()=>{clearTimeout(tm);rpgSel=null;picked.textContent='';const s=iq.value.trim();if(s.length<2){res.replaceChildren();return}
        tm=setTimeout(async()=>{
          res.textContent='Cerco…';
          try{
            const c=DB.remote&&DB.remote.client;if(!c||!c.functions){res.textContent='Scrivi il nome a mano (ricerca non disponibile).';return}
            const{data,error}=await c.functions.invoke('bgg-meta',{body:{mode:'rpg',q:s}});
            if(iq.value.trim()!==s)return;
            if(error||!data){res.textContent='Nessun risultato: puoi scrivere il nome a mano.';return}
            const items=Array.isArray(data.items)?data.items:[];
            res.replaceChildren();
            if(!items.length){res.textContent='Nessun risultato: puoi scrivere il nome a mano.';return}
            items.forEach(it=>{
              const a=document.createElement('button');a.type='button';a.className='s tt-rpg';a.style.display='block';a.style.width='100%';a.style.textAlign='left';a.style.marginTop='4px';
              a.textContent=it.nome+(it.anno?` (${it.anno})`:'');
              a.onclick=()=>{rpgSel={id:it.bgg_id,nome:it.nome};iq.value=it.nome;picked.textContent='Selezionato: '+it.nome;res.replaceChildren();if(it.bgg_id)TT.fetchThumb(it.bgg_id)};
              res.append(a);
            });
          }catch(e){res.textContent='Nessun risultato: puoi scrivere il nome a mano.'}
        },400);
      };
      fields.append(lg,iq,res,picked);
      if(typeof bggPwrHtml==='function'){const w=document.createElement('div');w.innerHTML=bggPwrHtml();logoSlot.append(w.firstChild)}
      const ln=document.createElement('label');ln.htmlFor='tn';ln.textContent=(TT.t('nota')||'Nota')+' (facoltativa)';
      const inn=document.createElement('input');inn.id='tn';inn.maxLength=120;fields.append(ln,inn);
    }else{
      const lv=document.createElement('label');lv.htmlFor='tt-ver';lv.textContent=(TT.t('versione')||'Versione')+' (facoltativa)';
      const iv=document.createElement('input');iv.id='tt-ver';iv.maxLength=60;iv.placeholder=TT.t('versione_ph')||'es. Warhammer 40.000 10ª edizione';
      fields.append(lv,iv);
    }
  };

  const paintSeg=()=>{
    typeSeg.replaceChildren();
    TT.attivo().forEach(t=>{
      const rem=TT.remainingCached(D,t.id);
      const b=document.createElement('button');b.type='button';b.dataset.tid=t.id;b.textContent=`${t.icona} ${t.nome}`;
      if(t.id===typeId)b.classList.add('on');
      if(rem===0)b.classList.add('off');
      b.onclick=()=>{typeId=t.id;paintNow()};
      typeSeg.append(b);
    });
  };

  let capTok=0;
  const refreshCap=async()=>{
    const tok=++capTok,date=D,cur=typeId;
    await Promise.all(TT.attivo().map(t=>TT.remaining(date,t.id)));
    if(tok!==capTok||date!==D)return;
    paintSeg();
    const rem=TT.remainingCached(D,cur);
    if(cur!==typeId)return;
    if(rem===0){
      pieno.hidden=false;pieno.replaceChildren();
      const p=document.createElement('p');p.textContent=TT.pienoMsg(cur);pieno.append(p);
      const wa=TT.waUrl();if(wa){const a=document.createElement('button');a.type='button';a.className='s';a.style.width='100%';a.style.marginTop='8px';a.style.textDecoration='none';a.textContent='Apri il gruppo WhatsApp ▸';a.onclick=()=>window.open(wa,'_blank','noopener,noreferrer');pieno.append(a)}
      goBtn.disabled=true;goBtn.classList.add('off');
    }else if(rem!=null){
      if(!goBtn.disabled||cur===typeId){/* keep fields */}
      if(rem>0){pieno.hidden=true;goBtn.disabled=false;goBtn.classList.remove('off')}
    }
  };
  const paintNow=()=>{paintSeg();paintFields();refreshCap();applyPf()};
  // anteprima — precompilazione da Sfida equilibrata
  let pfBox=null;
  const applyPf=()=>{if(!pf)return;const t=TT.byId(typeId);if(t.kind!=='board')return;const sg=$('#tg');
    if(sg&&pf.gameId&&[...sg.options].some(o=>o.value===pf.gameId)){sg.value=pf.gameId;sg.dispatchEvent(new Event('change'))}
    const ip=$('#tp');if(ip&&pfIds.length)ip.value=String(Math.max(+ip.value||1,pfIds.length));
    const altri=pfIds.filter(id=>!meM||id!==meM.id);
    if(!pfBox){pfBox=document.createElement('div');pfBox.className='sfb';pfBox.id='agpf';fields.after(pfBox)}
    const nomi=altri.map(id=>memberName(ms.find(m=>m.id===id))).join(', ');
    pfBox.textContent='';const b=document.createElement('b');b.textContent='⚖️ Dalla sfida equilibrata';pfBox.append(b);
    const p=document.createElement('p');p.style.margin='4px 0 0';
    p.textContent=staff?('Al tavolo: tu'+(nomi?' + '+nomi:'')+'. Come staff li siedi subito.'):('Ti siedi tu. '+(nomi?nomi+' si siederanno dall’Agenda: condividi il tavolo dopo averlo aperto.':''));
    pfBox.append(p);
    const inn=$('#tn');if(inn&&!inn.value&&nomi)inn.value=('Sfida equilibrata con '+nomi).slice(0,120)};
  paintNow();

  goBtn.onclick=async()=>{
    if(goBtn.disabled)return;
    if(!isoOk(D)||D<romeToday())return toast('Data non valida');
    const h=$('#th').value;if(!h||!ms.some(m=>m.id===h))return toast('Scegli chi ospita');
    if(!staff&&(!meM||h!==meM.id))return;
    const time=$('#tt').value;if(!/^[0-2]\d:[0-5]\d$/.test(time))return toast('Orario obbligatorio');
    const seats=Math.max(1,Math.min(100,+$('#tp').value||1));
    const t=TT.byId(typeId);
    const rem=await TT.remaining(D,typeId);if(rem<=0)return toast(TT.pienoMsg(typeId));
    const payload={date:D,evening:dayName(D),hostId:h,seats,time,note:($('#tn')&&$('#tn').value||'').trim().slice(0,120),typeId,players:[{memberId:h}],status:'open'};
    if(pf&&staff&&t.kind==='board'&&pfIds.length){const ex=pfIds.filter(id=>id!==h);payload.players=[{memberId:h},...ex.map(memberId=>({memberId}))].slice(0,seats);if(ex.length+1>seats)return toast('Aumenta i posti: servono '+(ex.length+1)+' posti per la sfida')}
    if(t.kind==='board'){
      const gid=$('#tg')&&$('#tg').value;if(!gid)return toast('Scegli un gioco');payload.gameId=gid;
    }else if(t.kind==='gdr'){
      const sm=$('#tt-master');let mid=sm&&sm.value,mname='';
      if(mid==='__free__'){mid=null;mname=escTxt($('#tt-master-free').value).slice(0,60);if(!mname)return toast('Indica il master')}
      else if(!mid)mid=h;
      payload.masterMemberId=mid||null;payload.masterName=mname||null;
      const gname=escTxt(($('#tt-rpgq')&&$('#tt-rpgq').value)||'').slice(0,100);
      if(!gname&&!(rpgSel&&rpgSel.nome))return toast('Indica il gioco');
      payload.gameName=(rpgSel&&rpgSel.nome)||gname;payload.bggRpgId=rpgSel?rpgSel.id:null;payload.gameId=null;
      // Il master occupa un posto tra quelli indicati
      if(mid&&mid!==h){
        payload.players=[{memberId:h},{memberId:mid}];
      }else if(!mid&&mname){
        payload.players=[{memberId:h},{guest:true,name:mname,role:'master'}];
      }else{
        payload.players=[{memberId:h}];
      }
      if(payload.players.length>seats)return toast('Aumenta i posti: il master deve avere posto');
    }else{
      payload.gameId=null;payload.gameName=null;payload.masterMemberId=null;payload.masterName=null;payload.bggRpgId=null;
      const ver=escTxt(($('#tt-ver')&&$('#tt-ver').value)||'').slice(0,60);payload.versione=ver||null;
    }
    try{
      await DB.saveTable(payload);close();S.date=D;toast('Tavolo aperto');go('serata');
    }catch(e){
      const msg=String(e.message||e);
      if(/pieno|Tipo pieno/i.test(msg))toast(TT.pienoMsg(typeId));
      else toast('⚠️ '+(msg||'Non è stato possibile aprire il tavolo'));
    }
  };
  setTimeout(()=>{const f=o.querySelector('.agclose');if(f)f.focus({preventScroll:true})},50);return o;
};

// Patch serata cards to show type icon + load TT
{const _ser=views.serata;views.serata=async function(...a){await TT.load();
  await _ser.apply(this,a);
  try{
    const ts=await DB.allTables();
    const ids=[...new Set(ts.map(t=>t.bggRpgId).filter(Boolean))];
    const missing=ids.filter(id=>!TT.thumbUrl(id));
    if(!missing.length)return;
    await Promise.all(missing.map(id=>TT.fetchThumb(id)));
    V.querySelectorAll('.card.agt[data-t]').forEach(card=>{
      const t=ts.find(x=>x.id===card.dataset.t);if(!t||!t.bggRpgId||!TT.thumbUrl(t.bggRpgId))return;
      const box=card.querySelector('.gcov');if(!box)return;
      const u=TT.thumbUrl(t.bggRpgId);
      box.replaceChildren();
      const img=document.createElement('img');img.src=u;img.alt='';img.loading='lazy';img.decoding='async';img.width=48;img.height=48;img.referrerPolicy='no-referrer';
      box.append(img);
    });
  }catch(e){console.warn('tt cover',e)}
}}

// Gestione row
{const boot=async()=>{
  const tryAdd=()=>{
    if(typeof adminMode!=='function'||!adminMode())return;
    const adm=document.getElementById('adm')||V.querySelector('#adm')||V;
    if(!adm||adm.querySelector('[data-alb="tavoli"]'))return;
    // Prefer altro staff() list — hook after views.altro
  };
  const _a=views.altro;
  views.altro=async function(...a){const r=await _a.apply(this,a);try{
    if(typeof adminMode==='function'&&adminMode()){
      // staff() in altro.js builds list; append our row into #adm or first card list
      let L=V.querySelector('#adm')||V.querySelector('.allist')||V;
      // Look for existing pattern alr with data-alb
      const host=V.querySelector('[data-alb]')&&V.querySelector('[data-alb]').parentElement;
      if(host&&!host.querySelector('[data-alb="tavoli"]')){
        const r=document.createElement('div');r.className='alr albtn';r.dataset.alb='tavoli';
        const ic=document.createElement('span');ic.className='ic';ic.textContent='🪑';
        const t=document.createElement('span');t.className='t';
        const b=document.createElement('b');b.textContent=TT.t('gest')||'Tipi di tavolo';
        const sub=document.createElement('span');sub.className='sub';sub.textContent='GDR, Warhammer, capienze e messaggio';
        t.append(b,sub);const ar=document.createElement('span');ar.className='ar';ar.textContent='▸';
        r.append(ic,t,ar);r.tabIndex=0;r.setAttribute('role','button');
        r.onclick=()=>go('tavolitipi');r.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go('tavolitipi')}};
        // insert before import if present else append
        const ibgg=host.querySelector('[data-alb="ibgg"]');
        if(ibgg)host.insertBefore(r,ibgg);else host.append(r);
      }
    }
  }catch(e){console.warn('tt gest row',e)}return r};
};boot()}


// --- Chiudi e registra coerente col tipo ---
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n};
async function registraAltro(t,typ,ed){
  const all=await DB.members(),gs=await DB.games(),ms=all.filter(m=>m.active||((ed||t)&&(ed&&ed.players||t.players||[]).some(x=>x.memberId===m.id)));
  const staff=typeof adminMode==='function'&&adminMode();
  const src=ed&&ed.id?ed:null;
  const titlePref=(src&&(src.gameName||src.versione))||(t&&(t.versione||t.gameName))||typ.nome;
  const date0=(src&&src.date)||(t&&t.date)||romeToday();
  const players0=(src&&src.players)||(t&&t.players)||[];
  V.replaceChildren();
  const h2=el('h2',null,TT.t('reg_altro')||'Registra una partita');
  const card=el('div','card ttreg');
  V.append(h2,card);
  const lbN=el('label',null,TT.t('nome_partita')||'Nome');lbN.htmlFor='tt-pn';
  const inN=el('input');inN.id='tt-pn';inN.maxLength=100;inN.value=titlePref||'';inN.readOnly=!staff;
  const lbD=el('label',null,'Data');lbD.htmlFor='d';
  const inD=document.createElement('input');inD.id='d';inD.type='date';inD.required=true;inD.value=date0;
  const dday=el('div','dday');
  const lbM=el('label',null,'Modalità');
  const mode=el('div','seg');mode.id='mode';
  const b0=el('button',null,'Competitiva');b0.type='button';b0.dataset.m='0';b0.className='on';
  const b1=el('button',null,'Cooperativa');b1.type='button';b1.dataset.m='1';
  mode.append(b0,b1);
  const hint=el('p','muted hint','ⓘ Competitiva: ognuno per sé, vince chi arriva primo. Cooperativa: si vince o si perde tutti insieme.');
  const coopBox=el('div');coopBox.id='coop';coopBox.hidden=true;
  const lbSc=el('label',null,'Scenario');
  const inSc=el('input');inSc.id='sc';inSc.maxLength=100;inSc.placeholder='es. Scenario 3';
  const lbRes=el('label',null,'Esito del gruppo');
  const res=el('div','seg');res.id='res';
  const r1=el('button',null,'Vittoria');r1.type='button';r1.dataset.r='1';r1.className='on';
  const r0=el('button',null,'Sconfitta');r0.type='button';r0.dataset.r='0';
  res.append(r1,r0);coopBox.append(lbSc,inSc,lbRes,res);
  const lbPl=el('label',null,'Giocatori e punteggi');
  const pl=el('div');pl.id='pl';
  const pk=el('button','s','👥 Aggiungi giocatori');pk.type='button';pk.id='pk';pk.style.width='100%';
  const lbO=el('label',null,'Ospite (non socio)');
  const rowO=el('div','row');
  const gn=el('input');gn.id='gn';gn.maxLength=40;gn.placeholder='Nome ospite';
  const ga=el('button','s','+ Ospite');ga.type='button';ga.id='ga';ga.style.flex='0 0 auto';
  rowO.append(gn,ga);
  const lbDu=el('label',null,'Durata (minuti, facoltativa)');
  const du=el('input');du.id='du';du.maxLength=4;du.placeholder='es. 45';if(typeof nA==='function'){/* skip */}
  const lbNt=el('label',null,(TT.t('nota')||'Nota')+' (facoltativa)');
  const nt=document.createElement('textarea');nt.id='nt';nt.rows=2;nt.maxLength=1000;
  const save=el('button','p',src&&src.id?'Salva modifiche':'Salva partita');save.type='button';save.id='save';
  const cx=el('button','s','Annulla');cx.type='button';cx.id='cx';cx.style.width='100%';cx.style.marginTop='6px';
  card.append(lbN,inN,lbD,inD,dday,lbM,mode,hint,coopBox,lbPl,pk,lbO,rowO,pl,lbDu,du,lbNt,nt,save,cx);
  let coop=!!(src&&src.coop),win=src&&src.groupWin!==false;
  const sel=[];
  (players0||[]).forEach(x=>sel.push({...x,score:x.score??''}));
  const drawSel=()=>{pl.replaceChildren();if(!sel.length)pl.append(el('p','muted','Nessuno selezionato.'));
    sel.forEach((s,i)=>{const d=el('div','prow');
      const name=s.memberId?memberName(all.find(m=>m.id===s.memberId)):((s.name||'')+(s.guest?' (ospite)':''));
      const a=el('input');a.disabled=true;a.value=name;
      const b=el('input','ps');b.placeholder='Punti';b.value=s.score??'';b.hidden=coop;b.oninput=e=>s.score=e.target.value;
      const rm=el('button','s','✕');rm.type='button';rm.onclick=()=>{sel.splice(i,1);drawSel()};
      d.append(a,b,rm);pl.append(d)});
  };
  const setMode=c=>{coop=c;coopBox.hidden=!c;card.querySelectorAll('.ps').forEach(i=>i.hidden=c);[...mode.querySelectorAll('button')].forEach(b=>b.classList.toggle('on',(b.dataset.m==='1')===c))};
  const setRes=w=>{win=w;[...res.querySelectorAll('button')].forEach(b=>b.classList.toggle('on',(b.dataset.r==='1')===w))};
  mode.onclick=e=>e.target.dataset.m&&setMode(e.target.dataset.m==='1');
  res.onclick=e=>e.target.dataset.r&&setRes(e.target.dataset.r==='1');
  pk.onclick=async()=>{const ids=await pickMembers(ms,sel.filter(x=>x.memberId).map(x=>x.memberId),'Aggiungi giocatori');if(!ids)return;
    for(let i=sel.length-1;i>=0;i--)if(sel[i].memberId&&!ids.includes(sel[i].memberId))sel.splice(i,1);
    ids.forEach(id=>sel.some(x=>x.memberId===id)||sel.push({memberId:id,score:''}));drawSel()};
  ga.onclick=()=>{const n=escTxt(gn.value).slice(0,40);if(!n)return toast('Scrivi il nome dell\'ospite');sel.push({guest:true,name:n,score:''});gn.value='';drawSel()};
  const dd=()=>{dday.textContent=(typeof dayLbl==='function'&&dayLbl(inD.value))?'📅 '+dayLbl(inD.value):''};inD.oninput=dd;inD.onchange=dd;dd();
  if(src){inSc.value=src.scenario||'';nt.value=src.note||'';du.value=src.duration??'';setMode(!!src.coop);if(src.coop)setRes(!!src.groupWin)}
  else setMode(false);
  drawSel();
  cx.onclick=()=>go(src&&src.id?'altro':'serata');
  save.onclick=async()=>{
    const name=escTxt(inN.value).slice(0,100);if(name.length<1)return toast('Indica il nome della partita');
    if(!isoOk(inD.value))return toast('Data non valida');
    if(!sel.length)return toast('Aggiungi almeno un giocatore');
    const players=sel.map(s=>s.memberId?{memberId:s.memberId,score:coop?null:(s.score===''?null:s.score)}:{guest:true,name:s.name,score:coop?null:(s.score===''?null:s.score)});
    const p={gameId:null,playKind:typ.kind||'custom',typeId:typ.id,gameName:name,versione:typ.kind==='war'?name.slice(0,60):null,date:inD.value,evening:dayName(inD.value),coop,groupWin:coop?win:null,scenario:coop?escTxt(inSc.value).slice(0,100):'',players,note:escTxt(nt.value).slice(0,1000),duration:durOk(du.value.trim())};
    try{
      if(src&&src.id){p.id=src.id;await DB.updatePlay(p);toast('Partita aggiornata');return go('altro')}
      const r=await DB.addPlay(p);if(t&&t.id)await DB.saveTable({id:t.id,status:'closed',playId:r.id});
      if(typeof XP!=='undefined'&&XP.refresh)XP.refresh();
      toast(coop?(win?'Vittoria del gruppo! 🎉':'Sconfitta… alla prossima!'):'Partita salvata');
      go('record');
    }catch(e){toast('⚠️ '+(e.message||'Non è stato possibile salvare'))}
  };
}

async function registraGdr(t,ed){
  const all=await DB.members(),ms=all.filter(m=>m.active||((ed||t)&&(ed&&ed.players||t.players||[]).some(x=>x.memberId===m.id)));
  const staff=typeof adminMode==='function'&&adminMode();
  const src=ed&&ed.id?ed:null;
  const gdr=src&&src.gdr||{};
  const date0=(src&&src.date)||(t&&t.date)||romeToday();
  const sistema0=(src&&src.gameName)||gdr.sistema||(t&&t.gameName)||'';
  const bgg0=(src&&src.bggRpgId)||gdr.bggRpgId||(t&&t.bggRpgId)||null;
  let rpgSel=bgg0?{id:bgg0,nome:sistema0}:null;
  const masterId0=gdr.masterMemberId||(t&&t.masterMemberId)||(t&&t.hostId)||'';
  const masterName0=gdr.masterName||(t&&t.masterName)||'';
  const players0=(src&&src.players)||(t&&t.players)||[];
  V.replaceChildren();
  const h2=el('h2',null,TT.t('reg_gdr')||'Registra sessione GDR');
  const card=el('div','card ttreg');
  V.append(h2,card);
  const add= (...nodes)=>card.append(...nodes);
  const lbM=el('label',null,TT.t('master')||'Master');
  const sm=document.createElement('select');sm.id='tt-rmaster';sm.disabled=!staff;
  ms.sort((a,b)=>memberName(a).localeCompare(memberName(b),'it')).forEach(m=>{
    const o=document.createElement('option');o.value=m.id;o.textContent=memberName(m);if(m.id===masterId0)o.selected=true;sm.append(o);
  });
  const oFree=document.createElement('option');oFree.value='__free__';oFree.textContent='Altro (testo libero)…';if(!masterId0&&masterName0)oFree.selected=true;sm.append(oFree);
  const free=el('input');free.id='tt-rmaster-free';free.maxLength=60;free.placeholder='Nome del master';free.value=masterName0||'';free.hidden=sm.value!=='__free__';free.disabled=!staff;
  sm.onchange=()=>{free.hidden=sm.value!=='__free__'};
  const lbS=el('label',null,TT.t('sistema')||'Sistema / gioco');
  const iq=el('input');iq.id='tt-rsist';iq.maxLength=100;iq.value=sistema0;iq.placeholder='Cerca su RPGGeek oppure scrivi il nome';iq.readOnly=!staff;
  const res=el('div');res.id='tt-rsistr';
  const picked=el('div','muted sm');if(rpgSel&&rpgSel.nome)picked.textContent='Selezionato: '+rpgSel.nome;
  if(staff){let tm;iq.oninput=()=>{clearTimeout(tm);rpgSel=null;picked.textContent='';const s=iq.value.trim();if(s.length<2){res.replaceChildren();return}
    tm=setTimeout(async()=>{
      res.textContent='Cerco…';
      try{
        const c=DB.remote&&DB.remote.client;if(!c||!c.functions){res.textContent='Scrivi il nome a mano (ricerca non disponibile).';return}
        const{data,error}=await c.functions.invoke('bgg-meta',{body:{mode:'rpg',q:s}});
        if(iq.value.trim()!==s)return;
        const items=(data&&Array.isArray(data.items))?data.items:[];
        res.replaceChildren();
        if(error||!items.length){res.textContent='Nessun risultato: puoi scrivere il nome a mano.';return}
        items.forEach(it=>{
          const a=el('button','s tt-rpg',it.nome+(it.anno?` (${it.anno})`:''));a.type='button';a.style.display='block';a.style.width='100%';a.style.textAlign='left';a.style.marginTop='4px';
          a.onclick=()=>{rpgSel={id:it.bgg_id,nome:it.nome};iq.value=it.nome;picked.textContent='Selezionato: '+it.nome;res.replaceChildren();TT.fetchThumb(it.bgg_id)};
          res.append(a);
        });
      }catch(e){res.textContent='Nessun risultato: puoi scrivere il nome a mano.'}
    },400);
  }}
  const logo=el('div');if(typeof bggPwrHtml==='function'){const w=document.createElement('div');w.innerHTML=bggPwrHtml();if(w.firstChild)logo.append(w.firstChild)}
  const lbA=el('label',null,(TT.t('avventura')||'Avventura / campagna')+' (facoltativa)');
  const inA=el('input');inA.id='tt-ravv';inA.maxLength=120;inA.value=gdr.avventura||'';
  const lbSe=el('label',null,TT.t('sessione')||'Sessione');
  const segS=el('div','seg');
  const s1=el('button',null,TT.t('oneshot')||'One-shot');s1.type='button';s1.dataset.s='one-shot';
  const s2=el('button',null,TT.t('campagna')||'Campagna');s2.type='button';s2.dataset.s='campagna';
  segS.append(s1,s2);
  let sess=gdr.sessione==='campagna'?'campagna':'one-shot';
  const nWrap=el('div');nWrap.id='tt-rsessn';
  const lbN=el('label',null,TT.t('sess_n')||'Sessione n°');
  const inN=el('input');inN.type='number';inN.min='1';inN.max='999';inN.value=String(gdr.sessione_n||1);
  nWrap.append(lbN,inN);
  const setSess=v=>{sess=v;[s1,s2].forEach(b=>b.classList.toggle('on',b.dataset.s===v));nWrap.hidden=v!=='campagna'};
  segS.onclick=e=>e.target.dataset.s&&setSess(e.target.dataset.s);setSess(sess);
  const lbD=el('label',null,'Data');
  const inD=document.createElement('input');inD.type='date';inD.id='d';inD.required=true;inD.value=date0;
  const lbDu=el('label',null,'Durata (minuti, facoltativa)');
  const du=el('input');du.maxLength=4;du.placeholder='es. 180';du.value=(src&&src.duration)||'';
  const lbP=el('label',null,'Giocatori');
  const pl=el('div');pl.id='pl';
  const pk=el('button','s','👥 Aggiungi giocatori');pk.type='button';pk.style.width='100%';
  const lbO=el('label',null,'Ospite (non socio)');
  const rowO=el('div','row');
  const gn=el('input');gn.maxLength=40;gn.placeholder='Nome ospite';
  const ga=el('button','s','+ Ospite');ga.type='button';ga.style.flex='0 0 auto';
  rowO.append(gn,ga);
  const sel=[];
  (players0||[]).forEach(x=>sel.push({...x,character:x.character||''}));
  const drawSel=()=>{pl.replaceChildren();if(!sel.length)pl.append(el('p','muted','Nessuno selezionato.'));
    sel.forEach((s,i)=>{
      const d=el('div','prow');
      const name=s.memberId?memberName(all.find(m=>m.id===s.memberId)):((s.name||'')+(s.guest?' (ospite)':''));
      const a=el('input');a.disabled=true;a.value=name;
      const ch=el('input');ch.placeholder=TT.t('pg')||'Personaggio';ch.maxLength=40;ch.value=s.character||'';ch.oninput=e=>s.character=escTxt(e.target.value).slice(0,40);
      const rm=el('button','s','✕');rm.type='button';rm.onclick=()=>{sel.splice(i,1);drawSel()};
      d.append(a,ch,rm);pl.append(d);
    });
  };
  pk.onclick=async()=>{const ids=await pickMembers(ms,sel.filter(x=>x.memberId).map(x=>x.memberId),'Aggiungi giocatori');if(!ids)return;
    for(let i=sel.length-1;i>=0;i--)if(sel[i].memberId&&!ids.includes(sel[i].memberId))sel.splice(i,1);
    ids.forEach(id=>sel.some(x=>x.memberId===id)||sel.push({memberId:id,character:''}));drawSel()};
  ga.onclick=()=>{const n=escTxt(gn.value).slice(0,40);if(!n)return toast('Scrivi il nome dell\'ospite');sel.push({guest:true,name:n,character:''});gn.value='';drawSel()};
  const lbE=el('label',null,TT.t('esito')||'Esito');
  const segE=el('div','seg');
  const e1=el('button',null,TT.t('conclusa')||'Avventura conclusa');e1.type='button';e1.dataset.e='conclusa';
  const e2=el('button',null,TT.t('incorso')||'In corso');e2.type='button';e2.dataset.e='in_corso';
  segE.append(e1,e2);
  let esito=gdr.esito==='conclusa'?'conclusa':'in_corso';
  const setEs=v=>{esito=v;[e1,e2].forEach(b=>b.classList.toggle('on',b.dataset.e===v))};
  segE.onclick=e=>e.target.dataset.e&&setEs(e.target.dataset.e);setEs(esito);
  const lbEn=el('label',null,(TT.t('esito_nota')||'Nota sull\'esito')+' (facoltativa)');
  const inEn=el('input');inEn.maxLength=200;inEn.value=gdr.esito_nota||'';
  const lbNt=el('label',null,(TT.t('nota')||'Nota')+' (facoltativa)');
  const nt=document.createElement('textarea');nt.rows=2;nt.maxLength=1000;nt.value=(src&&src.note)||'';
  const save=el('button','p',src&&src.id?'Salva modifiche':'Salva sessione');save.type='button';save.id='save';
  const cx=el('button','s','Annulla');cx.type='button';cx.style.width='100%';cx.style.marginTop='6px';
  add(lbM,sm,free,lbS,iq,res,picked,logo,lbA,inA,lbSe,segS,nWrap,lbD,inD,lbDu,du,lbP,pk,lbO,rowO,pl,lbE,segE,lbEn,inEn,lbNt,nt,save,cx);
  drawSel();
  cx.onclick=()=>go(src&&src.id?'altro':'serata');
  save.onclick=async()=>{
    const sistema=escTxt((rpgSel&&rpgSel.nome)||iq.value).slice(0,100);if(!sistema)return toast('Indica il sistema o il gioco');
    if(!isoOk(inD.value))return toast('Data non valida');
    if(!sel.length)return toast('Aggiungi almeno un giocatore');
    let mid=sm.value,mname='';
    if(mid==='__free__'){mid=null;mname=escTxt(free.value).slice(0,60);if(!mname)return toast('Indica il master')}
    const players=sel.map(s=>{
      const o=s.memberId?{memberId:s.memberId}:{guest:true,name:s.name};
      const ch=escTxt(s.character||'').slice(0,40);if(ch)o.character=ch;
      o.winner=false;
      return o;
    });
    const gdrObj={sistema,bggRpgId:rpgSel?rpgSel.id:null,masterMemberId:mid||null,masterName:mname||null,avventura:escTxt(inA.value).slice(0,120)||null,sessione:sess,sessione_n:sess==='campagna'?Math.max(1,Math.min(999,+inN.value||1)):null,esito,esito_nota:escTxt(inEn.value).slice(0,200)||null};
    const p={gameId:null,playKind:'gdr',typeId:'gdr',gameName:sistema,bggRpgId:rpgSel?rpgSel.id:null,date:inD.value,evening:dayName(inD.value),coop:true,groupWin:null,players,note:escTxt(nt.value).slice(0,1000),duration:durOk(du.value.trim()),gdr:gdrObj,scenario:escTxt(inA.value).slice(0,100)};
    try{
      if(src&&src.id){p.id=src.id;await DB.updatePlay(p);toast('Sessione aggiornata');return go('altro')}
      const r=await DB.addPlay(p);if(t&&t.id)await DB.saveTable({id:t.id,status:'closed',playId:r.id});
      if(typeof XP!=='undefined'&&XP.refresh)XP.refresh();
      toast('Sessione GDR registrata');
      go('record');
    }catch(e){toast('⚠️ '+(e.message||'Non è stato possibile salvare'))}
  };
}

{const _nuova=views.nuova;views.nuova=async function(ed,...a){
  try{
    await TT.load();
    let t=null;
    if(ed&&ed.fromTable)t=(await DB.allTables()).find(x=>x.id===ed.fromTable)||null;
    const kind=(t&&TT.byId(t.typeId||'board').kind)||(ed&&ed.playKind)||'board';
    const typ=t?TT.byId(t.typeId||'board'):(ed&&(ed.typeId||ed.playKind)?TT.byId(ed.typeId||ed.playKind):null);
    if(kind==='gdr'||(typ&&typ.kind==='gdr'))return registraGdr(t,ed);
    if(typ&&typ.kind&&typ.kind!=='board')return registraAltro(t,typ,ed);
  }catch(e){console.warn('tt registra',e)}
  return _nuova.call(this,ed,...a);
}}

// Preload
if(typeof DB!=='undefined'){try{TT.load()}catch(e){}}
})();
