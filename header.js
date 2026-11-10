// v41.13.1 — Barra: logo e nome a sinistra; a destra foto/avatar/iniziali. Tocca per il menu account
// (staff: cambio modalità, Profilo, Esci; soci: Profilo ed Esci). In admin, bollino oro sull'avatar.
// Solo textContent / attributi validati (niente HTML iniettato).
(function(){
const T={menu:'Menu account',profilo:'Profilo ▸',esci:'Esci',admin:'🛡️ Passa a modalità admin',utente:'👤 Passa a modalità utente'};
function logo(){const h=H();if(!h)return;let i=h.querySelector('img.hlogo');if(!i){i=document.createElement('img');i.className='hlogo';i.setAttribute('aria-hidden','true');i.alt='';const b=h.querySelector('.brand');h.insertBefore(i,b||h.firstChild)}
 const v=BRAND.v||BRAND_DEF,u=v.logo_barra&&BRAND.LOGO.test(v.logo_barra)?v.logo_barra:BRAND_LOGO_BARRA;if(i.getAttribute('src')!==u)i.src=u}
const ap=BRAND.apply;BRAND.apply=function(...a){const r=ap.apply(this,a);try{logo()}catch(e){console.warn('header',e)}return r};
const H=()=>document.querySelector('header');
const ini=(m,u)=>{const w=m?[m.nome,m.cognome].map(x=>String(x||'').trim()).filter(Boolean):[];let s=w.length>1?w[0][0]+w[w.length-1][0]:w.length?w[0].slice(0,2):String(u&&u.email||'').slice(0,2);return [...s].slice(0,2).join('').toUpperCase()};
function avEmoji(m){const a=m&&m.avatar!=null?String(m.avatar):'';return a&&a.length<=16&&!/[<>]|https?:/i.test(a)?a:''}
function avColor(m){return m&&m.color&&/^#[0-9a-f]{6}$/i.test(m.color)?m.color:''}
function face(b){let f=b.querySelector('.havin');if(!f){f=document.createElement('span');f.className='havin';f.setAttribute('aria-hidden','true');b.insertBefore(f,b.firstChild)}return f}
function syncBadge(b){if(!b)return;b.classList.toggle('adm',typeof adminMode==='function'&&!!adminMode())}
function paintAv(b,m,u){const t=ini(m,u),emo=avEmoji(m),src=typeof photoUrlOk==='function'?photoUrlOk(m&&m.photoUrl):'';
 b.setAttribute('data-ini',t);if(emo)b.setAttribute('data-av',emo);else b.removeAttribute('data-av');
 const f=face(b);f.querySelectorAll('img').forEach(i=>i.remove());f.textContent='';
 const col=avColor(m);
 if(src){const img=document.createElement('img');img.className='avimg';img.alt='';img.width=36;img.height=36;img.decoding='async';img.referrerPolicy='no-referrer';
  b.style.background='';b.style.color='';b.style.fontSize='';f.style.background='';f.style.color='';f.style.fontSize='';f.append(img);img.src=src+(m&&m.photoRev?('?v='+encodeURIComponent(m.photoRev)):'');b.hidden=false}
 else{f.textContent=emo||t;if(emo&&col){b.style.background=col;b.style.color='#fff';b.style.fontSize='18px'}else{b.style.background='';b.style.color='';b.style.fontSize=''}b.hidden=!(emo||t)}
 syncBadge(b)}
let menuEl=null,menuOn=null,menuOff=null;
function closeMenu(){if(!menuEl)return;menuEl.remove();menuEl=null;if(menuOn){document.removeEventListener('pointerdown',menuOn,true);document.removeEventListener('keydown',menuOff,true);menuOn=menuOff=null}
 const b=document.getElementById('avbtn');if(b){b.setAttribute('aria-expanded','false');b.removeAttribute('aria-controls')}}
function items(){const out=[];const staff=typeof admin!=='undefined'&&!!admin;
 if(staff){const user=typeof uiMode==='function'&&uiMode()==='user';out.push({k:'mode',lab:user?T.admin:T.utente,act:()=>{closeMenu();if(typeof setMode==='function')setMode(user?'admin':'user')}})}
 out.push({k:'profilo',lab:T.profilo,act:()=>{closeMenu();window._pv=null;const n=document.querySelector('nav [data-v="profilo"]');if(n)n.click();else go('profilo')}});
 out.push({k:'esci',lab:T.esci,act:()=>{closeMenu();if(typeof confirmLogout==='function')confirmLogout()}});
 return out}
function place(m,b){const r=b.getBoundingClientRect(),pad=8,mw=Math.min(280,window.innerWidth-pad*2);m.style.width=mw+'px';
 const top=Math.round(r.bottom+6),left=Math.min(Math.max(pad,r.right-mw),window.innerWidth-mw-pad);
 m.style.top=top+'px';m.style.left=left+'px'}
function openMenu(b){closeMenu();const m=document.createElement('div');m.id='havmenu';m.setAttribute('role','menu');m.setAttribute('aria-labelledby','avbtn');
 items().forEach(it=>{const x=document.createElement('button');x.type='button';x.setAttribute('role','menuitem');x.setAttribute('data-hav',it.k);x.textContent=it.lab;x.onclick=it.act;m.append(x)});
 document.body.append(m);place(m,b);b.setAttribute('aria-expanded','true');b.setAttribute('aria-controls','havmenu');menuEl=m;
 const list=[...m.querySelectorAll('[role=menuitem]')];if(list[0])list[0].focus();
 menuOn=e=>{if(m.contains(e.target)||b.contains(e.target))return;closeMenu()};
 menuOff=e=>{if(e.key==='Escape'){e.preventDefault();closeMenu();b.focus();return}
  if(e.key==='Tab'){closeMenu();return}
  if(e.key!=='ArrowDown'&&e.key!=='ArrowUp'&&e.key!=='Home'&&e.key!=='End')return;
  e.preventDefault();const i=list.indexOf(document.activeElement);let n=0;
  if(e.key==='ArrowDown')n=i<0?0:(i+1)%list.length;else if(e.key==='ArrowUp')n=i<0?list.length-1:(i-1+list.length)%list.length;else if(e.key==='End')n=list.length-1;
  list[n].focus()};
 document.addEventListener('pointerdown',menuOn,true);
 document.addEventListener('keydown',menuOff,true)}
function toggle(b){if(menuEl)closeMenu();else openMenu(b)}
async function av(){const h=H();if(!h)return;const bx=h.querySelector('.hbtns');if(!bx)return;let b=document.getElementById('avbtn');
 if(!b){b=document.createElement('button');b.id='avbtn';b.type='button';b.className='hav';b.hidden=true;b.title=T.menu;b.setAttribute('aria-label',T.menu);b.setAttribute('aria-haspopup','menu');b.setAttribute('aria-expanded','false');bx.append(b);
  b.onclick=()=>toggle(b)}
 try{const u=DB.remote&&DB.status==='online'?await DB.remote.user():null;if(!u){closeMenu();b.hidden=true;const f=b.querySelector('.havin');if(f){f.querySelectorAll('img').forEach(i=>i.remove());f.textContent=''}b.classList.remove('adm');return}let m=null;try{m=(await DB.members()).find(x=>x.userId===u.id)||null}catch(e){}
  paintAv(b,m,u)}catch(e){closeMenu();b.hidden=true}}
function hideMode(){const b=document.getElementById('modebtn');if(b){b.hidden=true;b.setAttribute('aria-hidden','true')}}
const od=window.drawOutBtn;window.drawOutBtn=function(...a){const r=od&&od.apply(this,a);const o=document.getElementById('outbtn');if(o)o.classList.add('hdout');hideMode();av();return r};
const md=window.drawModeBtn;window.drawModeBtn=function(...a){const r=md&&md.apply(this,a);hideMode();const b=document.getElementById('avbtn');if(b)syncBadge(b);if(menuEl){closeMenu()}return r};
const run=()=>{try{logo();hideMode();window.drawOutBtn()}catch(e){console.warn('header',e)}};
window.HD417={T,av,closeMenu,syncBadge};
if(document.readyState==='loading')addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
