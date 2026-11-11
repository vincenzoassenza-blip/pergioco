// v41.15 — GDR nella collezione: ricerca RPGGeek (stessa ricerca ottimizzata dei tavoli GDR: Edge bgg-meta mode «rpg»,
// type rpg,rpgitem, sistemi in cima, cache rpgsearch-v2) e scheda via mode «rpginfo» (XML API2 lato server).
// Solo chi vede il form «Aggiungi un gioco» (stesso permesso di oggi). Solo createElement/textContent.
const GDRC={
 // Ricerca condivisa con i tavoli GDR (tavoli-tipi.js usa la stessa chiamata)
 async search(q){const c=DB.remote&&DB.remote.client;if(!c||!c.functions)throw new Error('ricerca non disponibile');
  const{data,error}=await c.functions.invoke('bgg-meta',{body:{mode:'rpg',q:String(q||'').trim().slice(0,60)}});if(error||!data||data.error)throw new Error((data&&data.error)||'RPGGeek non raggiungibile');return Array.isArray(data.items)?data.items:[]},
 async info(id){const c=DB.remote&&DB.remote.client;const{data,error}=await c.functions.invoke('bgg-meta',{body:{mode:'rpginfo',bgg_id:+id}});if(error||!data||data.error)throw new Error((data&&data.error)||'RPGGeek non raggiungibile');return data},
 row(d){const a=x=>Array.isArray(x)?x.filter(s=>typeof s==='string'&&s.trim()&&!/[<>]/.test(s)).map(s=>s.trim()):[];
  const th=/^https:\/\/cf\.geekdo-images\.com\/[A-Za-z0-9_./%=:()-]+$/.test(d.thumb||'')&&String(d.thumb).length<=400?d.thumb:null;
  return{name:String(d.nome||'').replace(/[<>]/g,'').trim().slice(0,100),min:2,max:6,minT:120,maxT:240,age:12,coop:false,isExp:false,playTime:180,year:Number.isInteger(+d.anno)&&+d.anno>=1800&&+d.anno<=2100?+d.anno:null,bggId:+d.bgg_id,thumb:th,best:[],rec:[],categories:[],mechanics:[],
   kind:'gdr',rpgSystem:a(d.sistema).map(s=>s.slice(0,100)).slice(0,10),rpgGenre:a(d.genere).map(s=>s.slice(0,60)).slice(0,20),rpgPublisher:a(d.editore).map(s=>s.slice(0,100)).slice(0,10),rpgLang:a(d.lingua).map(s=>s.slice(0,40)).slice(0,10)}},
 html(){return'<div class="gdrc"><label for="grq">🐉 Aggiungi un GDR da RPGGeek</label><input id="grq" placeholder="es. Dungeons &amp; Dragons 5e" maxlength="60" autocomplete="off"><div id="grr" aria-live="polite"></div></div>'},
 bind(gs){const q=$('#grq'),r=$('#grr');if(!q||!r)return;let tm,seq=0;
  q.oninput=()=>{clearTimeout(tm);const s=q.value.trim();if(s.length<2){r.replaceChildren();return}const my=++seq;
   tm=setTimeout(async()=>{r.textContent='Cerco su RPGGeek…';
    try{const items=await GDRC.search(s);if(my!==seq)return;r.replaceChildren();if(!items.length){r.textContent='Nessun risultato su RPGGeek.';return}
     items.forEach(it=>{const b=document.createElement('button');b.type='button';b.className='s gdrhit';b.textContent=it.nome+(it.anno?` (${it.anno})`:'')+(it.tipo==='rpg'?' · sistema':'');
      b.onclick=()=>GDRC.add(it.bgg_id,gs,b);r.append(b)})}
    catch(e){if(my===seq)r.textContent='⚠️ RPGGeek non raggiungibile, riprova.'}},400)}},
 async add(id,gs,btn){if(typeof adminMode==='function'&&!adminMode())return;
  if((gs||[]).some(g=>+g.bggId===+id))return toast('Già presente nella collezione');
  if(btn)btn.disabled=true;
  try{const row=GDRC.row(await GDRC.info(id));if(!row.name||!row.bggId)throw new Error('dati assenti');
   await DB.addGame(row);toast('🐉 GDR aggiunto: '+row.name);go('ludoteca')}
  catch(e){if(btn)btn.disabled=false;toast('⚠️ '+(e.message||'GDR non aggiunto'))}}};
window.GDRC=GDRC;
