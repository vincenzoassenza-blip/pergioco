// v38.2 — selettore giochi con scorciatoie e ricerca. Tiene sincronizzato un <select> nascosto (stesso id), così il resto del codice usa .value come prima.
const gpNorm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const gpFilter=(gs,q,max=30)=>{const n=gpNorm(q).slice(0,60);if(!n)return[];const w=n.split(' ');const r=gs.filter(g=>{const x=gpNorm(g.name);return w.every(t=>x.includes(t))});
 r.sort((a,b)=>{const x=gpNorm(a.name),y=gpNorm(b.name);return (y.startsWith(n)-x.startsWith(n))||x.localeCompare(y)});return r.slice(0,max)};
// scorciatoie: prima i giochi giocati di recente da me, poi i più giocati in assoluto
const gpShort=(gs,ps,meId,max=6)=>{const ok=new Set(gs.map(g=>g.id)),out=[];const add=id=>{if(ok.has(id)&&!out.includes(id)&&out.length<max)out.push(id)};
 if(meId)[...ps].filter(p=>(p.players||[]).some(x=>x.memberId===meId)).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,30).forEach(p=>out.length<3&&add(p.gameId));
 const c={};ps.forEach(p=>c[p.gameId]=(c[p.gameId]||0)+1);Object.keys(c).sort((a,b)=>c[b]-c[a]).forEach(add);return out.map(id=>gs.find(g=>g.id===id))};
const gpImg=g=>typeof dsThumb==='function'?dsThumb(g&&g.thumb).replace('class="dsimg','class="gpimg dsimg'):'<div class="gpimg">🎲</div>';
// sel: <select> nascosto; ps: partite; meId: socio corrente (facoltativo)
function gpMount(sel,gs,ps,meId,opt){opt=opt||{};if(!sel)return null;const box=document.createElement('div');box.className='gp';const uid='gp'+Math.random().toString(36).slice(2,7);
 sel.hidden=true;sel.setAttribute('aria-hidden','true');sel.tabIndex=-1;sel.after(box);
 const sc=gpShort(gs,ps||[],meId);
 box.innerHTML=`<div class="gpcur" id="${uid}c" aria-live="polite"></div><div class="gpsel">${sc.length?`<div class="muted gpt">Scorciatoie</div><div class="gpchips" role="list">${sc.map(g=>`<button type="button" role="listitem" class="gpchip" data-id="${esc(g.id)}">${gpImg(g)}<span>${esc(g.name)}</span></button>`).join('')}</div>`:''}
 <label for="${uid}q" class="gpt">🔎 Cerca un gioco</label><input id="${uid}q" class="gpq" type="search" maxlength="60" autocomplete="off" placeholder="Scrivi parte del nome…" aria-controls="${uid}r"><div class="gpres" id="${uid}r" role="listbox" aria-label="Risultati"></div></div>`;
 const q=box.querySelector('.gpq'),res=box.querySelector('.gpres'),cur=box.querySelector('.gpcur'),pick=box.querySelector('.gpsel');
 const sync=()=>{const g=gs.find(x=>x.id===sel.value);if(g){cur.innerHTML=`<div class="gpon">${gpImg(g)}<b>${esc(g.name)}</b><button type="button" class="gpchg">Cambia</button>${opt.clear?`<button type="button" class="gpclr" aria-label="${esc(opt.clear)}">✕</button>`:''}</div>`;pick.hidden=true;cur.querySelector('.gpchg').onclick=()=>{pick.hidden=false;q.value='';res.innerHTML='';q.focus()};const cl=cur.querySelector('.gpclr');if(cl)cl.onclick=()=>{sel.value='';sel.dispatchEvent(new Event('change'));sync()}}else{cur.innerHTML=`<p class="muted gpnone">${esc(opt.none||'Nessun gioco scelto: tocca una scorciatoia o cerca.')}</p>`;pick.hidden=false}};
 const choose=id=>{if(!gs.some(g=>g.id===id))return;sel.value=id;sel.dispatchEvent(new Event('change'));sync();const b=cur.querySelector('.gpchg');if(b)b.focus()};
 const draw=()=>{const r=gpFilter(gs,q.value);res.innerHTML=q.value.trim()?(r.length?r.map(g=>`<button type="button" role="option" class="gpit" data-id="${esc(g.id)}">${gpImg(g)}<span>${esc(g.name)}</span></button>`).join(''):'<p class="muted">Nessun gioco trovato.</p>'):''};
 q.oninput=draw;q.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const f=res.querySelector('.gpit');if(f)choose(f.dataset.id)}else if(e.key==='ArrowDown'){const f=res.querySelector('.gpit');if(f){e.preventDefault();f.focus()}}};
 res.onkeydown=e=>{const it=e.target.closest('.gpit');if(!it)return;if(e.key==='ArrowDown'&&it.nextElementSibling){e.preventDefault();it.nextElementSibling.focus()}else if(e.key==='ArrowUp'){e.preventDefault();(it.previousElementSibling||q).focus()}};
 box.onclick=e=>{const b=e.target.closest('[data-id]');if(b&&box.contains(b))choose(b.dataset.id)};
 sync();return{sync,choose,box}}
