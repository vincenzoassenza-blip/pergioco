// v41.7 — Barra in alto, variante A: gradiente e filo dalla config (colori.barra1/barra2/filo), logo della barra dalla config
// (logo_barra, con il dado bianco come predefinito), nome in grassetto e motto piccolo, a destra le iniziali del socio → Profilo.
// «Esci» non sta più nella barra: è in Altro › Il mio account. Solo textContent / attributi validati.
(function(){
const T={profilo:'Apri il tuo profilo'};window.HD417={T};
const H=()=>document.querySelector('header');
function logo(){const h=H();if(!h)return;let i=h.querySelector('img.hlogo');if(!i){i=document.createElement('img');i.className='hlogo';i.setAttribute('aria-hidden','true');i.alt='';const b=h.querySelector('.brand');h.insertBefore(i,b||h.firstChild)}
 const v=BRAND.v||BRAND_DEF,u=v.logo_barra&&BRAND.LOGO.test(v.logo_barra)?v.logo_barra:BRAND_LOGO_BARRA;if(i.getAttribute('src')!==u)i.src=u}
const ap=BRAND.apply;BRAND.apply=function(...a){const r=ap.apply(this,a);try{logo()}catch(e){console.warn('header v41.7',e)}return r};
// iniziali: nome + cognome del socio collegato all'account (soprannome escluso: è libero)
const ini=(m,u)=>{const w=m?[m.nome,m.cognome].map(x=>String(x||'').trim()).filter(Boolean):[];let s=w.length>1?w[0][0]+w[w.length-1][0]:w.length?w[0].slice(0,2):String(u&&u.email||'').slice(0,2);return [...s].slice(0,2).join('').toUpperCase()};
async function av(){const h=H();if(!h)return;const bx=h.querySelector('.hbtns');if(!bx)return;let b=document.getElementById('avbtn');
 if(!b){b=document.createElement('button');b.id='avbtn';b.type='button';b.className='hav';b.hidden=true;b.title=T.profilo;b.setAttribute('aria-label',T.profilo);bx.append(b);
  b.onclick=()=>{window._pv=null;const n=document.querySelector('nav [data-v="profilo"]');if(n)n.click();else go('profilo')}}
 try{const u=DB.remote&&DB.status==='online'?await DB.remote.user():null;if(!u){b.hidden=true;return}let m=null;try{m=(await DB.members()).find(x=>x.userId===u.id)||null}catch(e){}
  const t=ini(m,u);b.textContent=t;b.hidden=!t}catch(e){b.hidden=true}}
const od=window.drawOutBtn;window.drawOutBtn=function(...a){const r=od&&od.apply(this,a);const o=document.getElementById('outbtn');if(o)o.classList.add('hdout');av();return r};
const run=()=>{try{logo();window.drawOutBtn()}catch(e){console.warn('header v41.7',e)}};
if(document.readyState==='loading')addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
