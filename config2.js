// v41.14 — Configurazione riorganizzata (mockup approvati, 8 punti):
// 1 indice a righe ▸ in gruppi (Identità, Funzioni, Testi) con riassunto · 2 barra 💾 Salva fissa con n. modifiche e conferma all'uscita
// 3 record e badge GDR come righe compatte ▸/▾ · 4 testi con ricerca, «Gruppo: Tutto», «Solo modificati», «modificato», «↺ Originale»
// 5 «Tipi di tavolo» anche qui (Funzioni) · 6 moduli come righe con interruttore · 7 aiuti leggeri, niente chip nelle etichette
// 8 errori accanto al campo, Salva porta al primo errore, «Scegli immagine» per il logo.
// Riordina il DOM di views.config: campi, id, validazioni e salvataggio restano quelli originali (stessi app_settings).
// Testo nuovo solo via textContent; nessun HTML iniettato.
(function(){
const T={tit:'⚙️ Configurazione',back:'← Configurazione',g:{id:'Identità',fn:'Funzioni',tx:'Testi'},
 assoc:'Associazione',logo:'Logo',colori:'Colori',moduli:'Moduli',tipi:'Tipi di tavolo',gdr:'Record e badge GDR',testi:'Testi dell\'app',
 salva:'💾 Salva',nomod:'Nessuna modifica',mod1:'1 modifica',modn:n=>n+' modifiche',uscire:'Hai modifiche non salvate. Uscire senza salvare?',
 cerca:'🔍 Cerca un testo (es. coppa, tavolo)',gruppo:'Gruppo',tutto:'Tutto',tutti:'Tutti i testi',soloMod:'Solo modificati',modificato:'modificato',orig:'↺ Originale',
 nessuno:'Nessun testo trovato.',scegli:'Scegli immagine',nessunFile:'nessun file scelto',predef:'predefinito',impost:'impostato',attivo:'attivo',spento:'spento',
 attivi:n=>n+(n===1?' attivo':' attivi'),record:'Record',soglia:'soglia',errFix:'Correggi il campo evidenziato'};
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
const arrow=o=>{const a=el('span','ar',o?'▾':'▸');a.setAttribute('aria-hidden','true');return a};
const actRow=(r,f)=>{r.tabIndex=0;r.setAttribute('role','button');r.onclick=f;r.onkeydown=e=>{if(e.target===r&&(e.key==='Enter'||e.key===' ')){e.preventDefault();f()}}};
function row(ic,title,sub,pill){const r=el('div','cfr');r.append(el('span','ic',ic));const t=el('span','t');const b=el('b',null,title);if(pill)b.append(pill);t.append(b);const s=el('span','sub');if(sub!=null)s.textContent=sub;t.append(s);r.append(t,arrow(false));return r}
const S={on:false,base:null,extra:0,sec:null,V:null,save:null};
const fields=V=>[...V.querySelectorAll('#cfg2 input:not([type=file]):not(.cfq),#cfg2 textarea')];
const val=i=>i.type==='checkbox'?(i.checked?'1':'0'):i.value;
function snap(V){S.base=new Map(fields(V).map(i=>[i,val(i)]));S.extra=0;count(V)}
function dirtyN(V){if(!S.base)return 0;let n=S.extra;fields(V).forEach(i=>{if(S.base.has(i)&&S.base.get(i)!==val(i))n++});return n}
function count(V){const n=dirtyN(V),s=document.getElementById('cfsbn');if(s)s.textContent=n?(n===1?T.mod1:T.modn(n)):T.nomod;const bar=document.getElementById('cfsb');if(bar)bar.classList.toggle('dirty',n>0);refreshIdx(V)}
window.CF2={T,dirty:()=>S.on&&S.V?dirtyN(S.V)>0:false,count:()=>S.V?dirtyN(S.V):0};
// --- 8 · errori accanto al campo
function fieldErrors(V){const out=[];const push=(inp,msg)=>{if(inp)out.push([inp,msg])};
 const bv={};['nome','motto','citta','instagram','email'].forEach(k=>{const i=V.querySelector('#cf-'+k);bv[k]=i?i.value.trim().replace(k==='instagram'?/^@/:/$^/,''):''});
 const L=BRAND.LIM;for(const k in L){const n=bv[k].length;if(n<L[k][0]||n>L[k][1])push(V.querySelector('#cf-'+k),k==='nome'?`Da ${L.nome[0]} a ${L.nome[1]} caratteri`:`Massimo ${L[k][1]} caratteri`)}
 if(bv.instagram&&!BRAND.IG.test(bv.instagram))push(V.querySelector('#cf-instagram'),'Solo lettere, numeri, punto e trattino basso (senza @)');
 if(bv.email&&(!BRAND.MAIL.test(bv.email)||bv.email.length>120))push(V.querySelector('#cf-email'),'Email non valida');
 ['coppa','sfida'].forEach(k=>{const on=V.querySelector('#cm-'+k);if(!on)return;const n=V.querySelector('#cm-'+k+'-nome'),d=V.querySelector('#cm-'+k+'-desc');
  if(n){const s=n.value.trim();if(s.length<2||s.length>40)push(n,'Da 2 a 40 caratteri');else if(MOD.BAD.test(s))push(n,'Non può contenere < o >')}
  if(d){const s=d.value;if(s.length>120)push(d,'Massimo 120 caratteri');else if(MOD.BAD.test(s))push(d,'Non può contenere < o >')}});
 if(typeof TXT!=='undefined')for(const k in TXT_DEF){const i=V.querySelector('#ct-'+k);if(!i)continue;const s=i.value.trim(),[a,b]=TXT.LIM[k];
  if(s.length<a||s.length>b)push(i,a?`Da ${a} a ${b} caratteri`:`Massimo ${b} caratteri`);else if(!TXT.ok(k,s))push(i,k==='ente_cf'?'Solo lettere e numeri':k==='festa'?'Formato MM-GG (es. 01-03) o vuoto':'Non può contenere < > " &')}
 const g=V.querySelector('#cm-gdrrec');if(g&&g.checked&&typeof GDRB!=='undefined'){GDRB.recIds.forEach(k=>{const i=V.querySelector('#gr-'+k);if(!i)return;const s=i.value.trim();if(s.length<2||s.length>40)push(i,'Da 2 a 40 caratteri');else if(GDRB.BAD.test(s))push(i,'Non può contenere < o >')});
  GDRB.badgeDef.forEach(d=>{const id=d[0],max=d[6],n=V.querySelector('#gb-'+id+'-n'),ds=V.querySelector('#gb-'+id+'-d'),so=V.querySelector('#gb-'+id+'-s');
   if(n){const s=n.value.trim();if(s.length<2||s.length>40)push(n,'Da 2 a 40 caratteri');else if(GDRB.BAD.test(s))push(n,'Non può contenere < o >')}
   if(ds){const s=ds.value.trim();if(s.length<2||s.length>120)push(ds,'Da 2 a 120 caratteri');else if(GDRB.BAD.test(s))push(ds,'Non può contenere < o >')}
   if(so){const v=Number(so.value);if(!Number.isInteger(v)||v<1||v>max)push(so,`Numero intero da 1 a ${max}`)}})}
 return out}
function showErrors(V,list){V.querySelectorAll('#cfg2 .cfe').forEach(x=>x.remove());V.querySelectorAll('#cfg2 [aria-invalid]').forEach(x=>{x.removeAttribute('aria-invalid');x.removeAttribute('aria-describedby')});
 list.forEach(([i,m],n)=>{if(i.getAttribute('aria-invalid'))return;const p=el('p','cfe',m);p.id='cfe-'+n;p.setAttribute('role','alert');i.setAttribute('aria-invalid','true');i.setAttribute('aria-describedby',p.id);i.after(p)})}
// --- sezioni
function secOf(i){return i.closest('.cfsec')}
function openSec(V,sec){S.sec=sec;V.querySelector('#cfidx').hidden=!!sec;V.querySelectorAll('#cfg2 .cfsec').forEach(s=>s.hidden=s!==sec);const h=V.querySelector('#cfbk');h.hidden=!sec;
 const top=V.querySelector('#cfg2 > .hrow h2');if(top)top.textContent=sec?sec.dataset.tit:T.tit;if(!sec)refreshIdx(V);scrollTo(0,0)}
function reveal(V,i){const s=secOf(i);if(s&&S.sec!==s)openSec(V,s);let d=i.closest('details');while(d){d.open=true;d=d.parentElement&&d.parentElement.closest('details')}
 const w=i.closest('.cftf');if(w)w.hidden=false;i.focus({preventScroll:true});i.scrollIntoView({block:'center'})}
// --- riassunti dell'indice
function refreshIdx(V){const I=V.querySelector('#cfidx');if(!I)return;const g=id=>V.querySelector('#'+id),set=(k,t)=>{const r=I.querySelector('[data-cfs="'+k+'"] .sub');if(r)r.textContent=t};
 const nm=(g('cf-nome')||{}).value||'',ci=(g('cf-citta')||{}).value||'',ig=((g('cf-instagram')||{}).value||'').replace(/^@/,'');set('assoc',[nm,ci,ig?'@'+ig:''].filter(Boolean).join(' · '));
 const lg=k=>{const b=g('cfi-'+k);return b&&b.querySelector('img')?T.impost:T.predef};set('logo','Barra: '+lg('logo_barra')+' · Completo: '+lg('logo'));
 set('colori','7 colori · anteprima');const dots=I.querySelector('[data-cfs="colori"] .cfdots');if(dots){dots.replaceChildren();['primario','secondario','accento','barra1','filo'].forEach(k=>{const c=g('cfc-'+k);const d=el('i');if(c&&/^#[0-9a-f]{6}$/i.test(c.value))d.style.background=c.value;dots.append(d)})}
 const mods=['coppa','sfida','libri'].map(k=>g('cm-'+k)).filter(Boolean),on=mods.filter(x=>x.checked).length;const mp=I.querySelector('[data-cfs="moduli"] .cfpill');if(mp)mp.textContent=T.attivi(on);
 set('moduli',['coppa','sfida'].map(k=>MOD.nome(k)).concat('Libri sociali').join(', '));
 const gd=g('cm-gdrrec'),gp=I.querySelector('[data-cfs="gdr"] .cfpill');if(gp&&gd){gp.textContent=gd.checked?T.attivo:T.spento;gp.classList.toggle('off',!gd.checked)}
 if(typeof TXT_DEF!=='undefined'){const n=Object.keys(TXT_DEF).filter(k=>{const i=g('ct-'+k);return i&&i.value.trim()!==TXT_DEF[k]}).length;set('testi',Object.keys(TXT_DEF).length+' testi'+(n?' · '+n+(n===1?' modificato':' modificati'):''))}}
// --- costruzione
function build(V){const cards=[...V.children];const root=el('div');root.id='cfg2';
 const hr=V.querySelector(':scope>.hrow')||el('div','hrow');const bk=el('button','s',T.back);bk.type='button';bk.id='cfbk';bk.hidden=true;bk.onclick=()=>openSec(V,null);
 const h2=hr.querySelector('h2')||el('h2');hr.replaceChildren(bk,h2);h2.textContent=T.tit;root.append(hr);
 const help=V.querySelector(':scope>p.muted.sm');if(help)help.classList.add('cfhelp');
 const byH=t=>cards.find(c=>c.matches&&c.matches('.card')&&c.querySelector(':scope>h3')&&c.querySelector(':scope>h3').textContent.trim()===t);
 const secs=[['assoc','🏷️',T.assoc,byH('Associazione')],['logo','🖼️',T.logo,byH('Logo')],['colori','🎨',T.colori,byH('Colori')],['moduli','🧩',T.moduli,byH('Moduli')],['gdr','🐉',T.gdr,V.querySelector('#cfgdr')],['testi','✏️',T.testi,V.querySelector('#cftx')]];
 const I=el('div');I.id='cfidx';if(help)I.append(help);
 const grp=(t,keys)=>{I.append(el('p','cfgh',t));const box=el('div','card cflist');keys.forEach(k=>{if(k==='tipi'){if(typeof views==='undefined'||!views.tavolitipi)return;const r=row('🪑',(typeof TT!=='undefined'&&TT.t&&TT.t('gest'))||T.tipi,(typeof TT!=='undefined'&&TT.attivo?TT.attivo().map(x=>x.nome).join(', '):'')||'');r.dataset.cfs='tipi';
   actRow(r,()=>{window._ttFrom='config';go('tavolitipi')});box.append(r);return}
  const s=secs.find(x=>x[0]===k);if(!s||!s[3])return;let pill=null;if(k==='moduli'||k==='gdr'){pill=el('span','cfpill')}
  const r=row(s[1],s[2],'',pill);r.dataset.cfs=k;if(k==='colori'){const d=el('span','cfdots');d.setAttribute('aria-hidden','true');r.querySelector('b').append(d)}
  actRow(r,()=>openSec(V,s[3]));box.append(r)});I.append(box)};
 grp(T.g.id,['assoc','logo','colori']);grp(T.g.fn,['moduli','tipi','gdr']);grp(T.g.tx,['testi']);root.append(I);
 secs.forEach(([k,ic,t,c])=>{if(!c)return;c.classList.add('cfsec');c.dataset.tit=ic+' '+t;c.dataset.cfk=k;c.hidden=true;const h=c.querySelector(':scope>h3');if(h)h.hidden=true;root.append(c)});
 // salva: barra fissa
 const err=V.querySelector('#cferr'),sv=V.querySelector('#cfsave');const bar=el('div','cfsb');bar.id='cfsb';const n=el('span',null,T.nomod);n.id='cfsbn';n.setAttribute('role','status');
 if(sv){sv.textContent=T.salva;sv.style.width='';bar.append(n,sv)}if(err){err.hidden=true;root.append(err)}root.append(el('div','cfsbsp'),bar);
 V.replaceChildren(root);
 // 7 · etichette senza chip, aiuti leggeri sotto l'etichetta
 root.querySelectorAll('label .kw,.cfsw .kw').forEach(k=>k.replaceWith(...k.childNodes));
 root.querySelectorAll('label .muted.sm').forEach(s=>{s.classList.add('cfh');const l=s.closest('label');if(l){l.childNodes.forEach(x=>{if(x.nodeType===3)x.textContent=x.textContent.replace(/\s+$/,'')})}});
 root.querySelectorAll('.cfcol label br').forEach(b=>b.remove());
 logo(root);moduli(root);gdr(root);testi(V,root)}
// 8 · «Scegli immagine»
function logo(root){root.querySelectorAll('.cflogo input[type=file]').forEach(f=>{f.classList.add('cffile');f.tabIndex=-1;f.setAttribute('aria-hidden','true');
 const b=el('button','s cfpick',T.scegli);b.type='button';const nm=el('span','cffn',T.nessunFile);b.onclick=()=>f.click();
 f.addEventListener('change',()=>{const x=f.files&&f.files[0];nm.textContent=x?x.name.slice(0,40):T.nessunFile;S.extra++;setTimeout(()=>count(S.V),50)});
 f.after(b,nm)});
 root.querySelectorAll('[data-cfx]').forEach(b=>b.addEventListener('click',()=>{S.extra++;count(S.V)}))}
// 6 · moduli con interruttore
function moduli(root){root.querySelectorAll('.cfsw input[type=checkbox]').forEach(i=>{i.classList.add('cfsw2');i.setAttribute('role','switch');const l=i.closest('label');if(l)l.classList.add('cfswr')})}
// 3 · GDR compatto
function gdr(root){const box=root.querySelector('#cmf-gdrrec');if(!box||typeof GDRB==='undefined')return;
 const recs=[...box.querySelectorAll('[id^="gr-"]')];if(recs.length){const d=el('details','cfd');const s=el('summary','cfr');s.append(el('span','ic','🏅'));const t=el('span','t');t.append(el('b',null,T.record),el('span','sub',recs.length+' record'));s.append(t,arrow(false));d.append(s);const w=el('div','cfdb');
  recs.forEach(i=>{const l=i.previousElementSibling;if(l&&l.tagName==='LABEL')w.append(l);w.append(i)});d.append(w);const first=box.querySelector('.cftg');if(first)first.replaceWith(d);else box.prepend(d)}
 box.querySelectorAll('.gdrb').forEach(b=>{const n=b.querySelector('[id$="-n"]'),so=b.querySelector('[id$="-s"]'),lab=b.querySelector('label');const ic=(lab?lab.textContent:'').trim().split(' ')[0]||'🏅';
  const d=el('details','cfd');const s=el('summary','cfr');s.append(el('span','ic',ic));const t=el('span','t'),bt=el('b'),sub=el('span','sub');t.append(bt,sub);s.append(t,arrow(false));
  const up=()=>{bt.textContent=(n&&n.value.trim())||'—';sub.textContent=T.soglia+' '+(so?so.value:'')};up();[n,so].forEach(x=>x&&x.addEventListener('input',up));
  b.before(d);d.append(s,b);d.addEventListener('toggle',()=>{s.querySelector('.ar').textContent=d.open?'▾':'▸'})});
 root.querySelectorAll('#cfgdr details.cfd').forEach(d=>d.addEventListener('toggle',()=>{const a=d.querySelector(':scope>summary .ar');if(a)a.textContent=d.open?'▾':'▸'}))}
// 4 · testi con ricerca e tendine
function testi(V,root){const tx=root.querySelector('#cftx');if(!tx||typeof TXT_DEF==='undefined')return;tx.open=true;const sm=tx.querySelector(':scope>summary');if(sm)sm.hidden=true;
 const hp=tx.querySelector(':scope>p.muted.sm');if(hp){hp.textContent='ⓘ Tocca un testo per cambiarlo. Niente < > nei testi.';hp.classList.add('cfhelp')}
 const groups=[];let cur=null;[...tx.children].forEach(c=>{if(c.matches('p.cftg')){cur={nome:c.textContent.trim(),head:c,items:[]};groups.push(cur);c.classList.remove('kw');c.classList.add('cfgh')}
  else if(cur&&c.matches('label')&&c.htmlFor&&c.htmlFor.startsWith('ct-')){cur.items.push(c)}});
 const q=el('input','cfq');q.type='search';q.placeholder=T.cerca;q.setAttribute('aria-label',T.cerca.replace(/^\S+\s/,''));q.maxLength=60;
 const sg=el('select','cfsel');sg.setAttribute('aria-label',T.gruppo);sg.append(Object.assign(el('option',null,T.gruppo+': '+T.tutto),{value:''}));groups.forEach((g,i)=>sg.append(Object.assign(el('option',null,g.nome),{value:String(i)})));
 const sm2=el('select','cfsel');sm2.setAttribute('aria-label',T.soloMod);sm2.append(Object.assign(el('option',null,T.tutti),{value:''}),Object.assign(el('option',null,T.soloMod),{value:'mod'}));
 const bar=el('div','cfsels');bar.append(sg,sm2);const none=el('p','cfhelp',T.nessuno);none.hidden=true;
 (hp||tx.firstChild).after(q,bar,none);
 groups.forEach(g=>{const box=el('div','card cflist cftg2');g.head.after(box);g.box=box;
  g.items.forEach(l=>{const k=l.htmlFor.slice(3),i=tx.querySelector('#ct-'+k);if(!i)return;const d=el('details','cfd cftf');d.dataset.k=k;const s=el('summary','cfr');const t=el('span','t');const sl=el('small');const lt=el('span',null,String(TXT.L[k]||k).replace(/^[^·]*·\s*/,''));const pm=el('span','cfmod',T.modificato);sl.append(lt,pm);const pv=el('span','cfpv');t.append(sl,pv);s.append(t,arrow(false));
   const w=el('div','cfdb');l.classList.add('cfvh');w.append(l,i);const o=el('button','s cforig',T.orig);o.type='button';o.onclick=()=>{i.value=TXT_DEF[k];i.dispatchEvent(new Event('input',{bubbles:true}))};w.append(o);d.append(s,w);box.append(d);
   const up=()=>{pv.textContent=i.value.trim()||'—';const m=i.value.trim()!==TXT_DEF[k];pm.hidden=!m;d.dataset.mod=m?'1':'0'};up();i.addEventListener('input',up);
   d.addEventListener('toggle',()=>{s.querySelector('.ar').textContent=d.open?'▾':'▸'})})});
 const nf=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const filt=()=>{const v=nf(q.value.trim()),gi=sg.value,mo=sm2.value==='mod';let tot=0;groups.forEach((g,ix)=>{let k=0;g.box.querySelectorAll('.cftf').forEach(d=>{const i=d.querySelector('input,textarea');const hit=(gi===''||gi===String(ix))&&(!mo||d.dataset.mod==='1')&&(!v||nf(d.querySelector('small').textContent+' '+(i?i.value:'')+' '+g.nome).includes(v));d.hidden=!hit;if(hit)k++});g.head.hidden=g.box.hidden=!k;tot+=k});none.hidden=tot>0};
 q.oninput=filt;sg.onchange=filt;sm2.onchange=filt;tx.addEventListener('input',e=>{if(e.target!==q&&sm2.value==='mod')filt()});tx._filt=filt;filt();
 const rs=tx.querySelector('#ctdef');if(rs){rs.classList.add('cfrst');rs.addEventListener('click',()=>setTimeout(()=>{tx.querySelectorAll('.cftf').forEach(d=>{const i=d.querySelector('input,textarea');if(i)i.dispatchEvent(new Event('input',{bubbles:true}))})},0))}}
// --- montaggio
async function mount(V){build(V);S.V=V;S.on=true;S.sec=null;
 const sv=V.querySelector('#cfsave'),orig=sv&&sv.onclick;
 V.addEventListener('input',e=>{if(e.target.matches('.cfq'))return;if(V.querySelector('#cfg2 .cfe'))showErrors(V,fieldErrors(V));count(V)});V.addEventListener('change',()=>count(V));
 V.querySelectorAll('#cfdef,#cgdrdef').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>count(V),0)));
 if(sv&&orig)sv.onclick=async e=>{const list=fieldErrors(V);showErrors(V,list);if(list.length){reveal(V,list[0][0]);toastVal(T.errFix+': '+list[0][1],'E-CFG-V');return}
  const r=await orig.call(sv,e);if(!V.querySelector('#cfg2 .cfe')&&!(V.querySelector('#cferr')||{}).textContent)snap(V);return r};
 snap(V);refreshIdx(V)}
const _c=views.config;views.config=async function(...a){S.on=false;const r=await _c.apply(this,a);try{if(V.querySelector('#cfsave')&&typeof adminMode==='function'&&adminMode())await mount(V)}catch(e){console.warn('config v41.14',e)}return r};
// 2 · conferma all'uscita
const _go=window.go;window.go=async function(v,...a){if(S.on&&v!=='config'&&S.V&&dirtyN(S.V)>0){const ok=await ask(T.uscire);if(!ok){try{history.replaceState(null,'','#config');window._curKey='config'}catch(e){}return}}if(v!=='config')S.on=false;return _go.call(this,v,...a)};
addEventListener('beforeunload',e=>{if(S.on&&S.V&&dirtyN(S.V)>0){e.preventDefault();e.returnValue=''}});
// 5 · Tipi di tavolo: si torna in Configurazione se aperto da lì
if(views.tavolitipi){const _t=views.tavolitipi;views.tavolitipi=async function(...a){const from=window._ttFrom;const r=await _t.apply(this,a);try{if(from==='config'){const b=[...V.querySelectorAll('.hrow button.s')].find(x=>/Gestione/.test(x.textContent));if(b){b.textContent=T.back;b.onclick=()=>{window._ttFrom='config';go('config')}}}}catch(e){}return r};
 const _go2=window.go;window.go=function(v,...a){if(v!=='tavolitipi'&&v!=='config')window._ttFrom=null;return _go2.call(this,v,...a)}}
})();
