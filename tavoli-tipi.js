// v41.11 — Tipi di tavolo configurabili (Gioco da tavolo / GDR / Warhammer).
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
  t(k){const K='tt_'+k;return(typeof TXT!=='undefined'&&TXT.v&&typeof TXT.v[K]==='string'&&TXT.v[K])||({pieno:CFG_DEF.pieno_msg,wa:'',ora:'21:00',gest:'Tipi di tavolo',tipi:'Tipi',cap:'Disponibili per serata',master:'Master',gioco:'Gioco',nota:'Nota',posti:'Posti (master compreso)'})[k]||k},
  async load(){
    const c=DB.remote&&DB.remote.client;
    if(!c){this.types=DEF_TYPES.slice();this.cfg={...CFG_DEF};this.loaded=true;return}
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
    this.loaded=true;
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
  async remaining(date,typeId){const cap=await this.capacity(date,typeId),n=await this.countOpen(date,typeId);return Math.max(0,cap-n)},
  pienoMsg(typeId){const t=this.byId(typeId);const msg=(typeof TXT!=='undefined'&&TXT.g('tt_pieno'))||this.cfg.pieno_msg||CFG_DEF.pieno_msg;return String(msg).replace(/\{tipo\}/g,t.nome)},
  waUrl(){const u=(typeof TXT!=='undefined'&&TXT.g('tt_wa'))||this.cfg.whatsapp_url||'';return /^https:\/\/(chat\.whatsapp\.com|wa\.me)\//.test(u)?u:''},
  oraDefault(){const o=(typeof TXT!=='undefined'&&TXT.g('tt_ora'))||this.cfg.ora_default||'21:00';return /^[0-2]\d:[0-5]\d$/.test(o)?o:'21:00'}
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
    const lbOra=document.createElement('label');lbOra.textContent=TT.t('ora')||'Orario serata predefinito';
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
      const sub=document.createElement('span');sub.className='sub';sub.textContent=`${TT.t('cap')}: ${t.capacity_default} · ${t.kind}`;
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
  dayIn.onchange=e=>{const v=e.target.value;if(isoOk(v)&&v>=oggi){D=v;sd();paintType()}else{toast('Data non valida');e.target.value=D}};

  let rpgSel=null;
  const paintType=async()=>{
    fields.replaceChildren();logoSlot.replaceChildren();rpgSel=null;goBtn.disabled=false;goBtn.classList.remove('off');pieno.hidden=true;
    const t=TT.byId(typeId);const rem=await TT.remaining(D,typeId);
    if(rem<=0){
      pieno.hidden=false;pieno.replaceChildren();
      const p=document.createElement('p');p.textContent=TT.pienoMsg(typeId);pieno.append(p);
      const wa=TT.waUrl();if(wa){const a=document.createElement('a');a.href=wa;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Apri il gruppo WhatsApp ▸';pieno.append(a)}
      goBtn.disabled=true;goBtn.classList.add('off');
    }
    // time always
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
      // master
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
      // game RPG search
      const lg=document.createElement('label');lg.textContent=TT.t('gioco')||'Gioco';
      const iq=document.createElement('input');iq.id='tt-rpgq';iq.maxLength=60;iq.placeholder='Cerca su RPGGeek oppure scrivi il nome';iq.autocomplete='off';
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
              a.onclick=()=>{rpgSel={id:it.bgg_id,nome:it.nome};iq.value=it.nome;picked.textContent='Selezionato: '+it.nome;res.replaceChildren()};
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
      // war / custom: only seats + time (already in row)
    }
  };

  const paintSeg=()=>{
    typeSeg.replaceChildren();
    TT.attivo().forEach(t=>{
      const b=document.createElement('button');b.type='button';b.dataset.tid=t.id;b.textContent=`${t.icona} ${t.nome}`;
      if(t.id===typeId)b.classList.add('on');
      b.onclick=()=>{typeId=t.id;paintSeg();paintType()};
      typeSeg.append(b);
    });
  };
  paintSeg();await paintType();

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
  // monkey-patch card rendering by wrapping after original is heavy; instead intercept V HTML post-render
  await _ser.apply(this,a);
  try{
    const ts=await DB.allTables();
    V.querySelectorAll('.agcard, .card').forEach(el=>{
      // find table id from data attributes on buttons inside
      const bid=el.querySelector('[data-sd],[data-lv],[data-c],[data-o],[data-x],[data-j]');
      // skip
    });
    // Annotate open buttons area: prepend type badge on each table card via scanning data-c / structure
    // Cards don't have data-id on root; enhance head titles by matching game names — lighter approach:
    // re-query tables for current date and inject badges into .agsec visible
    const sec=V.querySelector('#tl .agsec:not([hidden])');if(!sec)return;
    const date=sec.dataset.day;const list=ts.filter(t=>t.date===date);
    sec.querySelectorAll('.card').forEach((card,i)=>{
      const t=list[i];if(!t)return;const typ=TT.byId(t.typeId||'board');
      if(card.querySelector('.ttbadge'))return;
      const badge=document.createElement('span');badge.className='ttbadge chip';badge.textContent=`${typ.icona} ${typ.nome}`;
      const h=card.querySelector('b, .hrow, .agtitle')||card.firstElementChild;if(h)h.prepend(badge);
      else card.prepend(badge);
    });
  }catch(e){console.warn('tt badge',e)}
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

// Preload
if(typeof DB!=='undefined'){try{TT.load()}catch(e){}}
})();
