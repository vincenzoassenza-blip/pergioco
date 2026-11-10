// v41.12.1 — Barra in alto: logo e nome a sinistra; a destra la foto del socio (o le iniziali) → Profilo.
// «Esci» è in Altro › Il mio account. Solo textContent / attributi validati (niente HTML iniettato).
(function(){
const T={profilo:'Apri il tuo profilo'};
function logo(){const h=H();if(!h)return;let i=h.querySelector('img.hlogo');if(!i){i=document.createElement('img');i.className='hlogo';i.setAttribute('aria-hidden','true');i.alt='';const b=h.querySelector('.brand');h.insertBefore(i,b||h.firstChild)}
 const v=BRAND.v||BRAND_DEF,u=v.logo_barra&&BRAND.LOGO.test(v.logo_barra)?v.logo_barra:BRAND_LOGO_BARRA;if(i.getAttribute('src')!==u)i.src=u}
const ap=BRAND.apply;BRAND.apply=function(...a){const r=ap.apply(this,a);try{logo()}catch(e){console.warn('header',e)}return r};
const H=()=>document.querySelector('header');
// iniziali: nome + cognome del socio collegato all'account (soprannome escluso: è libero)
const ini=(m,u)=>{const w=m?[m.nome,m.cognome].map(x=>String(x||'').trim()).filter(Boolean):[];let s=w.length>1?w[0][0]+w[w.length-1][0]:w.length?w[0].slice(0,2):String(u&&u.email||'').slice(0,2);return [...s].slice(0,2).join('').toUpperCase()};
function paintAv(b,m,u){const t=ini(m,u),src=typeof photoUrlOk==='function'?photoUrlOk(m&&m.photoUrl):'';
 b.setAttribute('data-ini',t);
 b.querySelectorAll('img').forEach(i=>i.remove());
 if(src){const img=document.createElement('img');img.className='avimg';img.alt='';img.width=36;img.height=36;img.decoding='async';img.referrerPolicy='no-referrer';
  b.textContent='';b.append(img);img.src=src+(m&&m.photoRev?('?v='+encodeURIComponent(m.photoRev)):'');b.hidden=false}
 else{b.textContent=t;b.hidden=!t}}
async function av(){const h=H();if(!h)return;const bx=h.querySelector('.hbtns');if(!bx)return;let b=document.getElementById('avbtn');
 if(!b){b=document.createElement('button');b.id='avbtn';b.type='button';b.className='hav';b.hidden=true;b.title=T.profilo;b.setAttribute('aria-label',T.profilo);bx.append(b);
  b.onclick=()=>{window._pv=null;const n=document.querySelector('nav [data-v="profilo"]');if(n)n.click();else go('profilo')}}
 try{const u=DB.remote&&DB.status==='online'?await DB.remote.user():null;if(!u){b.hidden=true;b.textContent='';return}let m=null;try{m=(await DB.members()).find(x=>x.userId===u.id)||null}catch(e){}
  paintAv(b,m,u)}catch(e){b.hidden=true}}
const od=window.drawOutBtn;window.drawOutBtn=function(...a){const r=od&&od.apply(this,a);const o=document.getElementById('outbtn');if(o)o.classList.add('hdout');av();return r};
const run=()=>{try{logo();window.drawOutBtn()}catch(e){console.warn('header',e)}};
window.HD417={T,av};
if(document.readyState==='loading')addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
