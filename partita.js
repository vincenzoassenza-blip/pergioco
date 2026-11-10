// v41.2 — pagina Partita secondo il mockup approvato (7 ritocchi):
// 1 passi numerati «1 Gioco» / «2 Giocatori e punti»; 2 gioco scelto in un riquadro con «Cambia ▸»;
// 3 scorciatoie a pillola + ricerca, senza scritte tratteggiate di stato vuoto; 4 Competitiva/Cooperativa nel passo 2;
// 5 righe giocatore: nome senza sottolineatura, riga intera toccabile con ▸ (porta ai punti), punti evidenziati, 🏆 al migliore;
// 6 «Aggiungi giocatori» e «+ Ospite» affiancati; 7 «Altro (data, durata, nota)» ▸/▾, pillola della data, avviso morbido punti mancanti.
// Solo DOM/CSS sopra la vista esistente: validazioni, escaping e salvataggio restano quelli di app.js.
(()=>{const _n=views.nuova;views.nuova=async function(ed,...a){const r=await _n.call(this,ed,...a);try{ptApply(ed)}catch(e){console.warn('partita',e)}return r};
const lab=(card,t)=>[...card.querySelectorAll('label')].find(l=>l.textContent.trim().startsWith(t));
const mkH=(n,t)=>{const h=document.createElement('div');h.className='pth';h.innerHTML=`<span class="n" aria-hidden="true">${n}</span><span>${esc(t)}</span>`;return h};
function ptApply(ed){const card=V.querySelector('.card');if(!card||!$('#save')||card.classList.contains('pt')||card.classList.contains('ttreg'))return;card.classList.add('pt');
 // 1 + 2 + 3 — Gioco
 const lg=lab(card,'Gioco');if(lg){const h=mkH(1,'Gioco');h.id='pth1';lg.replaceWith(h)}
 const gp=card.querySelector('.gp');if(gp){gp.querySelectorAll('.gpt').forEach(x=>x.classList.add('sr'));const q=gp.querySelector('.gpq');if(q)q.placeholder='🔎 Cerca un gioco…'}
 // 2 — Giocatori e punti: modalità, giocatori, pulsanti
 const lS=lab(card,'Soci al tavolo'),lG=lab(card,'Giocatori'),pl=$('#pl'),pk=$('#pk');
 const h2=mkH(2,'Giocatori e punti');h2.id='pth2';(lS||lG).before(h2);
 const sec=document.createElement('div');sec.className='ptsec';h2.after(sec);
 const lm=lab(card,'Modalità'),mode=$('#mode'),hint=mode&&mode.nextElementSibling,coop=$('#coop');
 if(mode){if(lm)lm.classList.add('sr');sec.append(...[lm,mode].filter(Boolean));if(hint&&hint.classList.contains('hint')){hint.textContent='ⓘ Cooperativa: si vince o si perde tutti insieme.';sec.append(hint)}}
 if(coop)sec.append(coop);if(lS)lS.remove();if(lG){lG.classList.add('sr');sec.append(lG)}if(pl)sec.append(pl);
 // 6 — pulsanti affiancati; l'ospite si scrive in un riquadro che si apre con «+ Ospite»
 const bt=document.createElement('div');bt.className='ptbtns';sec.append(bt);if(pk){pk.removeAttribute('style');bt.append(pk)}
 const gn=$('#gn'),lo=lab(card,'Ospite');if(gn){const box=document.createElement('div');box.id='ptosp';box.className='ptosp';box.hidden=true;
  const row=gn.closest('.row'),cnt=$('#gncnt');box.append(...[lo,row,cnt].filter(Boolean));sec.append(box);$('#ga').textContent='Aggiungi';
  const ob=document.createElement('button');ob.type='button';ob.className='s';ob.id='ptob';ob.textContent='+ Ospite';ob.setAttribute('aria-expanded','false');ob.setAttribute('aria-controls','ptosp');bt.append(ob);
  ob.onclick=()=>{box.hidden=!box.hidden;ob.setAttribute('aria-expanded',String(!box.hidden));if(!box.hidden)gn.focus()};
  $('#ga').addEventListener('click',()=>setTimeout(()=>{if(!gn.value){box.hidden=true;ob.setAttribute('aria-expanded','false')}},0))}
 // 5 — righe giocatore
 const rows=()=>{const comp=!(mode&&mode.querySelector('[data-m="1"].on'));const ps=[...pl.querySelectorAll('.ps')];
  pl.querySelectorAll('.prow').forEach(d=>{if(d.classList.contains('ptr'))return;d.classList.add('ptr');const inp=d.querySelector('input[disabled]');if(!inp)return;
   let v=inp.value,suf='';const lk=v.endsWith(' · Tu 🔒'),os=v.endsWith(' (ospite)');if(lk){v=v.slice(0,-8);suf='(tu)'}else if(os){v=v.slice(0,-9);suf='(ospite)'}
   const n=document.createElement('span');n.className='ptn';n.innerHTML=`<span class="ptnm">${esc(v)}${suf?` <small>${suf}</small>`:''}</span><span class="ptgo" aria-hidden="true">▸</span>`;
   const tr=document.createElement('span');tr.className='pttr';tr.setAttribute('aria-hidden','true');inp.replaceWith(tr,n);
   const b=d.querySelector('button');if(b&&b.disabled){b.textContent='🔒';b.classList.add('ptlk');b.setAttribute('aria-label','Sei sempre tra i giocatori')}else if(b){b.setAttribute('aria-label','Togli '+v)}
   const p=d.querySelector('.ps');if(p){p.addEventListener('input',upd)}
   d.addEventListener('click',e=>{if(e.target.closest('input,button'))return;const p=d.querySelector('.ps');if(p&&!p.hidden){p.focus();p.select&&p.select()}})});
  upd()};
 const upd=()=>{const comp=!(mode&&mode.querySelector('[data-m="1"].on'));const ps=[...pl.querySelectorAll('.ps')];const nums=ps.map(p=>p.value.trim()===''||isNaN(+p.value.replace(',','.'))?null:+p.value.replace(',','.'));
  const mx=Math.max(...nums.filter(x=>x!=null));ps.forEach((p,i)=>{p.classList.toggle('ptv',nums[i]!=null);const t=p.closest('.prow').querySelector('.pttr');if(t)t.textContent=comp&&nums.filter(x=>x!=null).length>1&&nums[i]===mx?'🏆':''});
  pl.classList.toggle('ptcoop',!comp);const miss=nums.filter(x=>x==null).length,w=$('#ptw');
  if(w){const on=comp&&ps.length>1&&miss>0&&miss<ps.length;w.hidden=!on;if(on)w.textContent=`⚠️ Punti mancanti per ${miss} giocator${miss==1?'e':'i'}: puoi salvare lo stesso`}};
 new MutationObserver(rows).observe(pl,{childList:true});if(mode)mode.addEventListener('click',()=>setTimeout(upd,0));rows();
 // 7 — Altro, data, avviso
 const al=$('#uxaltro'),sv=$('#save');if(al){const sm=al.querySelector('summary');const lbl=()=>{sm.textContent='Altro (durata, nota)'};lbl();
  const dt=document.createElement('button');dt.type='button';dt.id='ptdate';dt.className='ptdate';al.after(dt);
  const dl=()=>{const v=$('#d')&&$('#d').value;dt.textContent='📅 '+(isoOk(v)?(v===romeToday()?'Oggi, ':'')+new Date(v+'T12:00').toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'}):'Data non valida')+' ▸';lbl()};dl();
  // v41.8.1 — la data si mostra una volta sola: il campo nativo vive dentro la pillola (nascosto), etichetta e riepilogo in Altro spariscono
  const di=$('#d');if(di){const lb=di.previousElementSibling;if(lb&&lb.tagName==='LABEL')lb.remove();const dd=$('#dday');if(dd)dd.hidden=true;
   const wr=document.createElement('span');wr.className='ptdw';dt.before(wr);wr.append(dt,di);di.classList.add('agdi','ptdi');di.tabIndex=-1;di.setAttribute('aria-hidden','true');dt.setAttribute('aria-label','Data della partita: cambia');
   di.addEventListener('change',dl);di.addEventListener('input',dl);
   dt.onclick=()=>{try{di.showPicker();return}catch(e){}di.classList.remove('agdi');di.removeAttribute('aria-hidden');di.tabIndex=0;dt.hidden=true;di.focus();di.addEventListener('blur',()=>{di.classList.add('agdi');di.setAttribute('aria-hidden','true');di.tabIndex=-1;dt.hidden=false},{once:true})}}
  if(sv){const w=document.createElement('div');w.id='ptw';w.className='ptw';w.hidden=true;w.setAttribute('role','status');sv.before(w)}}
 upd()}
})();
