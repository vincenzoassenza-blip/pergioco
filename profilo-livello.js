// v41.8.1 — Profilo: livello in evidenza nella scheda in alto (numero + nome grandi, barra, «Ancora N XP per il livello L ▸»).
// Nessun calcolo nuovo: numeri letti dalla scheda XP già prodotta da xpCard (xp.js). Tocco → «Come guadagnare XP». Solo textContent.
(()=>{const T={invito:'Ancora {n} XP per il livello {l}',come:'Come guadagnare XP',max:'Livello massimo raggiunto'};
 const t=k=>(typeof TXT!=='undefined'&&TXT.v&&typeof TXT.v['lv_'+k]==='string'&&TXT.v['lv_'+k])||T[k];
 const el=(g,c,x)=>{const e=document.createElement(g);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
 function hero(V){const pr=V.querySelector('.card.prof'),xc=V.querySelector('.card.xpc');if(!pr||!xc||pr.querySelector('.lvh'))return;
  const lvb=xc.querySelector('.lvb'),nm=xc.querySelector('.lvb+b'),tot=xc.querySelector('.row>b'),bar=xc.querySelector('.xpbar>i'),mu=xc.querySelector('.xpbar+.muted'),det=xc.querySelector('details');
  const L=parseInt((lvb&&lvb.textContent.replace(/\D+/g,''))||'0',10),miss=parseInt((mu&&mu.textContent)||'',10),pc=Math.max(0,Math.min(100,parseFloat(bar&&bar.style.width)||0));if(!L)return;
  const b=el('button','lvh');b.type='button';b.setAttribute('aria-expanded','false');
  const top=el('span','lvht');top.append(el('span','lvn','Lv '+L),el('span','lvt',nm?nm.textContent:''),el('span','lvx',tot?tot.textContent:''));
  const br=el('span','lvbar');br.setAttribute('role','progressbar');br.setAttribute('aria-valuemin','0');br.setAttribute('aria-valuemax','100');br.setAttribute('aria-valuenow',String(Math.round(pc)));const f=el('i');f.style.width=pc+'%';br.append(f);
  const inv=el('span','lvi',miss>0?t('invito').replace('{n}',String(miss)).replace('{l}',String(L+1)):t('max'));const ar=el('span','ar','▸');ar.setAttribute('aria-hidden','true');const ir=el('span','lvir');ir.append(inv,ar);
  b.append(top,br,ir);const pn=el('div','lvpan');pn.hidden=true;pn.append(el('b',null,t('come')));if(det){[...det.children].filter(c=>c.tagName!=='SUMMARY').forEach(c=>pn.append(c))}
  b.onclick=()=>{pn.hidden=!pn.hidden;ar.textContent=pn.hidden?'▸':'▾';b.setAttribute('aria-expanded',pn.hidden?'false':'true')};
  pr.append(b,pn);const pl=pr.querySelector('.pname .lv');if(pl)pl.remove();xc.remove()}
 const _p=views.profilo;views.profilo=async function(...a){const r=await _p.apply(this,a);try{hero(V)}catch(e){console.warn('v41.8.1 livello',e)}return r};
 window.LV81={T,hero}})();
