// v37.6 — promozione Instagram non invasiva (@pergiocoets). Nessun dato inviato, nessun accesso al DB.
const IG={
 url:'https://www.instagram.com/pergiocoets/',tag:'@pergiocoets',
 link(t,cls){return`<a class="igx ${cls||''}" href="${this.url}" target="_blank" rel="noopener noreferrer">${t}</a>`},
 riga(){return`<p class="igl">${this.link('📸 Seguici su Instagram <b>@pergiocoets</b>')}</p>`},
 meKey(){return'pergioco-ig-card-'+((typeof XP!=='undefined'&&XP.me)||'ospite')},
 card(){if(localStorage.getItem(this.meKey()))return'';return`<div class="card igcard" role="note"><button type="button" class="igcx" data-igclose aria-label="Chiudi">✕</button><b>📸 Siamo su Instagram!</b><p class="muted">Foto delle serate, nuovi giochi ed eventi: seguici su <b>@pergiocoets</b>.</p>${this.link('Apri Instagram ›','igbtn')}</div>`},
 mobile(){return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)},
 testo(g){return`Partita a ${String(g||'un gioco').replace(/[\r\n]+/g,' ').slice(0,80)} con @pergiocoets 🎲 #PerGioco #Ragusa`},
 async copia(t){try{await navigator.clipboard.writeText(t);return true}catch(e){try{const a=document.createElement('textarea');a.value=t;a.setAttribute('readonly','');a.style.cssText='position:fixed;opacity:0';document.body.append(a);a.select();const ok=document.execCommand('copy');a.remove();return ok}catch(_){return false}}},
 web(){const w=window.open(this.url,'_blank','noopener');if(!w)location.href=this.url},
 async foto(g){const ok=await this.copia(this.testo(g));toast(ok?'Testo copiato, incollalo nel post':'Tagga @pergiocoets nel post');
  if(!this.mobile())return this.web();
  let gone=false;const off=()=>{if(document.visibilityState==='hidden')gone=true};document.addEventListener('visibilitychange',off);window.addEventListener('pagehide',off);
  setTimeout(()=>{document.removeEventListener('visibilitychange',off);window.removeEventListener('pagehide',off);if(!gone&&document.visibilityState==='visible')this.web()},1500);
  location.href=/Android/i.test(navigator.userAgent)?'instagram://camera':'instagram://story-camera'},
 btn(g,cls){return`<button type="button" class="s igfoto ${cls||''}" data-igg="${esc(g||'')}">📸 Fai una foto e taggaci</button>`},
 dopoPartita(g){document.querySelectorAll('.igpost').forEach(x=>x.remove());const d=document.createElement('div');d.className='igpost';d.setAttribute('role','status');
  d.innerHTML=`<button type="button" class="igcx" data-igpx aria-label="Chiudi">✕</button><div><b>Partita salvata! 🎉</b><div class="muted sm">Immortala il tavolo: foto e tag ${'@pergiocoets'}</div></div>${this.btn(g)}`;document.body.append(d);setTimeout(()=>d.remove(),15000)}};
document.addEventListener('click',e=>{const a=e.target.closest('a.igx');if(a){e.stopPropagation();return}
 const f=e.target.closest('[data-igg]');if(f){e.preventDefault();e.stopPropagation();IG.foto(f.dataset.igg);const p=f.closest('.igpost');if(p)p.remove();return}
 if(e.target.closest('[data-igpx]')){e.target.closest('.igpost').remove();return}
 const c=e.target.closest('[data-igclose]');if(c){localStorage.setItem(IG.meKey(),'1');c.closest('.igcard').remove()}},true);
Object.keys(views).forEach(k=>{if(!['profilo','altro','ludoteca'].includes(k))return;const f=views[k];views[k]=async(...a)=>{const r=await f.apply(views,a);
 try{if(typeof V==='undefined')return r;if(k==='ludoteca'){if(!V.querySelector('.igcard')){const h=IG.card();if(h){const t=V.querySelector('h2');t?t.insertAdjacentHTML('afterend',h):V.insertAdjacentHTML('afterbegin',h)}}}
  else if(!V.querySelector('.igl'))V.insertAdjacentHTML('beforeend',IG.riga())}catch(e){}return r}});
