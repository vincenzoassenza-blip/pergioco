// v41.12 — Record e badge GDR (calcolati dai dati, configurabili, senza impatto su member_xp).
const GDRB_REC=['sessioni','ore','sistemi','master','campagne','mese','oneshot'];
const GDRB_REC_DEF=Object.freeze({
  sessioni:{icona:'🐉',nome:'Sessioni giocate'},
  ore:{icona:'⏳',nome:'Ore di gioco'},
  sistemi:{icona:'📜',nome:'Sistemi diversi'},
  master:{icona:'🎭',nome:'Master più attivo'},
  campagne:{icona:'📕',nome:'Campagne concluse'},
  mese:{icona:'📅',nome:'Più sessioni in un mese'},
  oneshot:{icona:'⚡',nome:'Più one-shot'}
});
const GDRB_MESI=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const GDRB_BADGE_DEF=Object.freeze([
  ['gs1','🐉','Prima sessione','Gioca la prima sessione GDR','sessioni',1,99],
  ['gs5','📖','Cantastorie','Gioca 5 sessioni GDR','sessioni',5,99],
  ['gs10','🕯️','Lanterna accesa','Gioca 10 sessioni GDR','sessioni',10,99],
  ['gs25','🏰','Veterano del dungeon','Gioca 25 sessioni GDR','sessioni',25,99],
  ['gh3','⏳','Primo veglione','Accumula 3 ore di gioco di ruolo','ore',3,200],
  ['gh10','⏰','Veglia notturna','Accumula 10 ore di gioco di ruolo','ore',10,200],
  ['gh30','🧿','Maratona epica','Accumula 30 ore di gioco di ruolo','ore',30,200],
  ['gy3','📜','Esploratore di mondi','Prova 3 sistemi di gioco diversi','sistemi',3,99],
  ['gy8','🗺️','Atlante dei regni','Prova 8 sistemi di gioco diversi','sistemi',8,99],
  ['gm1','🎭','Dietro lo schermo','Conduci la prima sessione da master','master',1,99],
  ['gm5','🧙','Narratore assiduo','Conduci 5 sessioni da master','master',5,99],
  ['gm15','👑','Archimago della gilda','Conduci 15 sessioni da master','master',15,99],
  ['gc1','📕','Prima campagna','Concludi una campagna','campagne',1,99],
  ['gc3','📚','Saga completa','Concludi 3 campagne','campagne',3,99],
  ['go5','⚡','Storia in una sera','Gioca 5 one-shot','oneshot',5,99],
  ['gmo4','📅',"Mese d'avventura",'Gioca 4 sessioni GDR nello stesso mese','mese',4,31],
  ['gpg5','🪪','Molteplici identità','Interpreta 5 personaggi diversi','pg',5,99]
]);
const GDRB={
  KEY:'pergioco-gdr-rec',v:null,loaded:false,BAD:/[<>]/,
  recIds:GDRB_REC,badgeDef:GDRB_BADGE_DEF,
  defValue(){const rec={},badge={};GDRB_REC.forEach(k=>rec[k]={nome:GDRB_REC_DEF[k].nome});
    GDRB_BADGE_DEF.forEach(([id,,nome,desc,,soglia])=>badge[id]={nome,desc,soglia});
    return{attivo:true,rec,badge}},
  clipNome(s,d){s=typeof s==='string'?s.trim():'';return s.length>=2&&s.length<=40&&!this.BAD.test(s)?s:d},
  clipDesc(s,d){s=typeof s==='string'?s.trim():'';return s.length>=2&&s.length<=120&&!this.BAD.test(s)?s:d},
  clipSoglia(v,d,max){const n=Number(v);return Number.isInteger(n)&&n>=1&&n<=max?n:d},
  norm(x){const d=this.defValue();x=x&&typeof x==='object'?x:{};
    const rec={};GDRB_REC.forEach(k=>{const m=x.rec&&x.rec[k]&&typeof x.rec[k]==='object'?x.rec[k]:{};rec[k]={nome:this.clipNome(m.nome,d.rec[k].nome)}});
    const badge={};GDRB_BADGE_DEF.forEach(([id,,nome,desc,,soglia,max])=>{const m=x.badge&&x.badge[id]&&typeof x.badge[id]==='object'?x.badge[id]:{};
      badge[id]={nome:this.clipNome(m.nome,nome),desc:this.clipDesc(m.desc,desc),soglia:this.clipSoglia(m.soglia,soglia,max)}});
    return{attivo:typeof x.attivo==='boolean'?x.attivo:true,rec,badge}},
  errors(x){const e=[];x=x&&typeof x==='object'?x:{};
    GDRB_REC.forEach(k=>{const n=String((x.rec&&x.rec[k]&&x.rec[k].nome)||'').trim();
      if(n.length<2||n.length>40)e.push('Record «'+(GDRB_REC_DEF[k].nome)+'»: il nome deve avere da 2 a 40 caratteri');
      else if(this.BAD.test(n))e.push('Record «'+(GDRB_REC_DEF[k].nome)+'»: il nome non può contenere < o >')});
    GDRB_BADGE_DEF.forEach(([id,,dn,dd,,ds,max])=>{const b=x.badge&&x.badge[id]||{},n=String(b.nome||'').trim(),s=String(b.desc||'').trim(),g=Number(b.soglia);
      if(n.length<2||n.length>40)e.push('Badge «'+dn+'»: il nome deve avere da 2 a 40 caratteri');
      else if(this.BAD.test(n))e.push('Badge «'+dn+'»: il nome non può contenere < o >');
      if(s.length<2||s.length>120)e.push('Badge «'+dn+'»: la descrizione deve avere da 2 a 120 caratteri');
      else if(this.BAD.test(s))e.push('Badge «'+dn+'»: la descrizione non può contenere < o >');
      if(!Number.isInteger(g)||g<1||g>max)e.push('Badge «'+dn+'»: soglia da 1 a '+max)});
    return e},
  cached(){try{return JSON.parse(localStorage.getItem(this.KEY)||'null')}catch(e){return null}},
  cl(){return typeof BRAND!=='undefined'&&BRAND.cl?BRAND.cl():(DB.remote&&DB.remote.client)||null},
  async load(force){if(this.loaded&&!force)return this.v;const c=this.cl();if(!c||!c.from)return this.v;
    try{const{data,error}=await c.from('app_settings').select('value').eq('key','gdr_rec').maybeSingle();if(error)throw error;this.loaded=true;
      if(data&&data.value){this.v=this.norm(data.value);try{localStorage.setItem(this.KEY,JSON.stringify(this.v))}catch(e){}}}catch(e){console.warn('gdr_rec',e)}return this.v},
  async save(x){const c=this.cl();if(!c||!c.from)throw new Error('Serve la connessione al database');const err=this.errors(x);if(err.length)throw Object.assign(new Error(err.join(' · ')),{val:true});const v=this.norm(x);
    const{error}=await c.from('app_settings').upsert({key:'gdr_rec',value:v});if(error)throw error;this.v=v;try{localStorage.setItem(this.KEY,JSON.stringify(v))}catch(e){}return v},
  tipoGdrAttivo(){if(typeof TT==='undefined')return true;const ts=TT.attivo?TT.attivo():(TT.types||[]).filter(t=>t.attivo);if(!ts.length&&!(TT.types||[]).length)return true;return ts.some(t=>t.kind==='gdr')},
  visible(){return !!(this.v&&this.v.attivo)&&this.tipoGdrAttivo()},
  async ensure(){if(typeof TT!=='undefined'&&TT.load&&!TT.loaded)try{await TT.load()}catch(e){}if(!this.loaded)try{await this.load()}catch(e){}return this.v},
  recNome(k){return(this.v&&this.v.rec&&this.v.rec[k]&&this.v.rec[k].nome)||GDRB_REC_DEF[k].nome},
  recIcon(k){return GDRB_REC_DEF[k].icona},
  badgeConf(id){const d=GDRB_BADGE_DEF.find(x=>x[0]===id);const b=this.v&&this.v.badge&&this.v.badge[id];
    return{id,icon:d[1],nome:(b&&b.nome)||d[2],desc:(b&&b.desc)||d[3],campo:d[4],soglia:(b&&b.soglia)||d[5]}},
  sistemaId(p){return p&&(p.bggRpgId||p.bgg_rpg_id||(p.gdr&&(p.gdr.bggRpgId||p.gdr.bgg_rpg_id)))||null},
  sistemaName(p){return String((p&&(p.gameName||p.game_name||(p.gdr&&p.gdr.sistema)))||'').trim().toLowerCase()},
  sistemaKey(p,alias){const id=this.sistemaId(p),n=this.sistemaName(p);if(id)return'id:'+id;if(n&&alias&&alias[n])return'id:'+alias[n];return n},
  avvKey(p){return String((p&&p.gdr&&p.gdr.avventura)||(p&&p.scenario)||'').trim().toLowerCase()},
  masterId(p){return(p&&p.gdr&&(p.gdr.masterMemberId||p.gdr.master_member_id))||(p&&(p.masterMemberId||p.master_member_id))||null},
  gdrPlays(ps){return(ps||[]).filter(p=>typeof isGdrPlay==='function'?isGdrPlay(p):(p&&(p.playKind||p.play_kind)==='gdr'))},
  memberStats(id,plays){const z={sessioni:0,ore:0,minuti:0,sistemi:0,master:0,campagne:0,mese:0,meseKey:'',oneshot:0,pg:0};if(!id)return z;
    const mine=this.gdrPlays(plays).filter(p=>(p.players||[]).some(x=>x.memberId===id));
    z.sessioni=mine.length;
    z.minuti=mine.reduce((s,p)=>s+(+p.duration>0?+p.duration:0),0);z.ore=z.minuti/60;
    const alias={};mine.forEach(p=>{const id=this.sistemaId(p),n=this.sistemaName(p);if(id&&n)alias[n]=id});
    const sist=new Set();mine.forEach(p=>{const k=this.sistemaKey(p,alias);if(k)sist.add(k)});z.sistemi=sist.size;
    z.master=mine.filter(p=>this.masterId(p)===id).length;
    const camps=new Set();mine.forEach(p=>{const g=p.gdr||{};if(g.sessione==='campagna'&&g.esito==='conclusa'){const a=this.avvKey(p),s=this.sistemaKey(p,alias);if(a&&s)camps.add(a+'|'+s)}});z.campagne=camps.size;
    const mesi={};mine.forEach(p=>{const m=String(p.date||'').slice(0,7);if(/^\d{4}-\d{2}$/.test(m))mesi[m]=(mesi[m]||0)+1});
    Object.keys(mesi).sort().forEach(k=>{if(mesi[k]>z.mese){z.mese=mesi[k];z.meseKey=k}});
    z.oneshot=mine.filter(p=>(p.gdr||{}).sessione==='one-shot').length;
    const pgs=new Set();mine.forEach(p=>(p.players||[]).forEach(x=>{if(x.memberId===id){const c=String(x.character||'').trim();if(c)pgs.add(c.toLowerCase())}}));z.pg=pgs.size;
    return z},
  oreLab(h){const x=Math.round((+h||0)*10)/10,s=Number.isInteger(x)?String(x):String(x).replace('.',',');return s+' '+(x===1?'ora':'ore')},
  meseLab(k){const p=String(k||'').split('-'),m=+p[1];return(GDRB_MESI[m-1]||p[1]||'')+(p[0]?' '+p[0]:'')},
  pl(v,a,b){return(+v||0)+' '+(+v===1?a:b)},
  recFmt(k,it){const v=it&&it.value;
    if(k==='sessioni')return this.pl(v,'sessione','sessioni');
    if(k==='ore')return this.oreLab(v);
    if(k==='sistemi')return this.pl(v,'sistema','sistemi');
    if(k==='master')return this.pl(v,'sessione da master','sessioni da master');
    if(k==='campagne')return this.pl(v,'campagna','campagne');
    if(k==='mese')return this.pl(v,'sessione','sessioni')+(it.meseKey?' · '+this.meseLab(it.meseKey):'');
    if(k==='oneshot')return this.pl(v,'one-shot','one-shot');
    return String(v??'')},
  records(plays,members){const ms=(members||[]).filter(m=>m&&m.id&&m.active!==false);
    const stats={};ms.forEach(m=>stats[m.id]=this.memberStats(m.id,plays));
    const name=id=>{const m=ms.find(x=>x.id===id);return m?(typeof memberName==='function'?memberName(m):(m.nome||id)):id};
    const best=(val,extra)=>{let b=null,w=[];ms.forEach(m=>{const s=stats[m.id],v=val(s);if(!(v>0))return;if(b===null||v>b){b=v;w=[m.id]}else if(v===b)w.push(m.id)});
      if(b===null)return null;const id=w[0];return{who:{id,name:name(id)},ids:w,value:b,...(extra?extra(stats[id],id):{})}};
    return{
      sessioni:best(s=>s.sessioni),
      ore:best(s=>s.ore),
      sistemi:best(s=>s.sistemi),
      master:best(s=>s.master),
      campagne:best(s=>s.campagne),
      mese:best(s=>s.mese,(s)=>({meseKey:s.meseKey})),
      oneshot:best(s=>s.oneshot)
    }},
  badgeList(s){return GDRB_BADGE_DEF.map(([id,icon])=>{const c=this.badgeConf(id),cur=+s[c.campo]||0,goal=c.soglia;
    return{id,icon:c.icon||icon,name:c.nome,desc:c.desc,on:cur>=goal,cur:Math.min(cur,goal),goal}})},
  formHtml(){const v=this.v||this.norm({}),ex=typeof esc==='function'?esc:s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const rec=GDRB_REC.map(k=>`<label for="gr-${k}">${ex(GDRB_REC_DEF[k].icona+' '+GDRB_REC_DEF[k].nome)}</label><input id="gr-${k}" maxlength="40" value="${ex(v.rec[k].nome)}">`).join('');
    const groups=[['Sessioni',['gs1','gs5','gs10','gs25']],['Ore',['gh3','gh10','gh30']],['Sistemi',['gy3','gy8']],['Master socio',['gm1','gm5','gm15']],['Campagne e one-shot',['gc1','gc3','go5']],['Altri',['gmo4','gpg5']]];
    const badges=groups.map(([g,ids])=>`<p class="kw cftg">${ex(g)}</p>`+ids.map(id=>{const d=GDRB_BADGE_DEF.find(x=>x[0]===id),b=v.badge[id],max=d[6];
      return`<div class="gdrb"><label for="gb-${id}-n">${ex(d[1]+' '+d[2])}</label><input id="gb-${id}-n" maxlength="40" value="${ex(b.nome)}"><label for="gb-${id}-d">Descrizione</label><input id="gb-${id}-d" maxlength="120" value="${ex(b.desc)}"><label for="gb-${id}-s">Soglia</label><input id="gb-${id}-s" type="number" min="1" max="${max}" step="1" value="${ex(b.soglia)}"></div>`}).join('')).join('');
    return`<div class="card" id="cfgdr"><h3>🐉 Record e badge GDR</h3>
<p class="muted sm">ⓘ Spento = nascosto a tutti. Resta comunque nascosto se il tipo GDR non è attivo. I dati delle sessioni non si cancellano.</p>
<label class="cfsw"><input type="checkbox" id="cm-gdrrec"${v.attivo?' checked':''}><span class="kw">Record e badge GDR</span></label>
<div class="cfmf gdrfg" id="cmf-gdrrec"${v.attivo?'':' hidden'}>
<p class="kw cftg">Record</p>${rec}
${badges}
<button class="s" type="button" id="cgdrdef">↺ Valori originali</button>
</div></div>`},
  read(){const rec={},badge={};
    GDRB_REC.forEach(k=>{const el=typeof document!=='undefined'&&document.getElementById('gr-'+k);rec[k]={nome:el?el.value.trim():this.recNome(k)}});
    GDRB_BADGE_DEF.forEach(([id])=>{const n=document.getElementById('gb-'+id+'-n'),d=document.getElementById('gb-'+id+'-d'),s=document.getElementById('gb-'+id+'-s'),c=this.badgeConf(id);
      badge[id]={nome:n?n.value.trim():c.nome,desc:d?d.value.trim():c.desc,soglia:s?+s.value:c.soglia}});
    const on=document.getElementById('cm-gdrrec');
    return{attivo:on?!!on.checked:true,rec,badge}},
  applyForm(v){v=this.norm(v);const on=document.getElementById('cm-gdrrec');if(on)on.checked=v.attivo;
    const box=document.getElementById('cmf-gdrrec');if(box)box.hidden=!v.attivo;
    GDRB_REC.forEach(k=>{const el=document.getElementById('gr-'+k);if(el)el.value=v.rec[k].nome});
    GDRB_BADGE_DEF.forEach(([id])=>{const n=document.getElementById('gb-'+id+'-n'),d=document.getElementById('gb-'+id+'-d'),s=document.getElementById('gb-'+id+'-s');
      if(n)n.value=v.badge[id].nome;if(d)d.value=v.badge[id].desc;if(s)s.value=v.badge[id].soglia})},
  bindConfig(prev){const on=document.getElementById('cm-gdrrec'),box=document.getElementById('cmf-gdrrec');
    if(on)on.onchange=()=>{if(box)box.hidden=!on.checked;if(prev)prev()};
    const root=document.getElementById('cfgdr');if(root)root.querySelectorAll('input').forEach(i=>i.addEventListener('input',()=>prev&&prev()));
    const rst=document.getElementById('cgdrdef');if(rst)rst.onclick=()=>{this.applyForm(this.defValue());if(prev)prev()}},
  mount(V,plays,members){const old=V.querySelector('#gdrrec');if(old)old.remove();if(!this.visible())return;
    const recs=this.records(plays,members),empty=!this.gdrPlays(plays).length;
    const box=document.createElement('div');box.id='gdrrec';box.className='clrec gdrrec';
    const tit=document.createElement('h3');tit.className='rsec';tit.textContent='🐉 Record GDR';box.append(tit);
    if(empty){const p=document.createElement('p');p.className='muted gdrvuoto';p.textContent='Ancora nessuna sessione GDR.';box.append(p)}
    const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
    GDRB_REC.forEach(k=>{
      const it=recs[k],w=el('div','clrw'),r=el('div','clln clrow gdrln');
      r.append(el('span','ic',this.recIcon(k)));
      const t=el('span','t');t.append(el('small',null,this.recNome(k)));
      const n=el('span','nm');
      if(it&&it.who){n.append(el('b','who',it.who.name));if(it.ids&&it.ids.length>1)n.append(el('span','tie','+'+(it.ids.length-1)))}
      else n.append(el('span','muted','—'));
      t.append(n);r.append(t);
      if(it)r.append(el('span','pill',this.recFmt(k,it)));
      const ar=el('span','ar','▸');ar.setAttribute('aria-hidden','true');r.append(ar);
      if(it&&it.who){r.dataset.pv=it.who.id;r.tabIndex=0;r.setAttribute('role','button');r.setAttribute('aria-label',this.recNome(k)+': '+it.who.name)}
      w.append(r);box.append(w);
    });
    const ref=V.querySelector('#rgames')||V.querySelector('#uxnums');
    const recBox=V.querySelector('.clrec:not(#gdrrec)');
    if(ref)ref.before(box);else if(recBox)recBox.after(box);else V.append(box);
  }
};
GDRB.v=GDRB.norm(GDRB.cached());
if(typeof Badges!=='undefined'){
  const _list=Badges.list.bind(Badges);
  Badges.list=function(key,ctx){const base=_list(key,ctx);
    if(!GDRB.visible())return base.filter(b=>!GDRB_BADGE_DEF.some(d=>d[0]===b.id));
    const id=key&&String(key).startsWith('m:')?key.slice(2):null;
    const s=GDRB.memberStats(id,ctx&&ctx.plays||[]);
    const ids=new Set(GDRB_BADGE_DEF.map(d=>d[0]));
    return base.filter(b=>!ids.has(b.id)).concat(GDRB.badgeList(s));
  };
}
if(typeof views!=='undefined'&&views.record){
  const _r=views.record;
  views.record=async function(...a){const r=await _r.apply(this,a);try{await GDRB.ensure();const ps=typeof pf==='function'?pf(await DB.plays()):await DB.plays();GDRB.mount(V,ps,await DB.members())}catch(e){console.warn('gdr-rec',e)}return r};
}
if(typeof views!=='undefined'&&views.config){
  const _c=views.config;
  views.config=async function(...a){if(typeof GDRB!=='undefined')await GDRB.ensure();const r=await _c.apply(this,a);return r};
}
