// v17 — uso da desktop: tastiera (Esc chiude, Tab resta nella finestra aperta) e marcatura mouse/tastiera.
(()=>{
const OVL='.mdl,.modal,.gpg';
const top=()=>{const l=[...document.querySelectorAll(OVL)].filter(e=>e.isConnected&&getComputedStyle(e).display!=='none');return l[l.length-1]||null};
const FOC='button:not([disabled]),[href],input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
const closeTop=o=>{
 if(o.classList.contains('gpg')){const b=o.querySelector('.gpb');if(b){b.click();return true}}
 const b=[...o.querySelectorAll('button')].find(x=>x.offsetParent&&/^(✕|×|annulla|chiudi|indietro|‹ indietro|← indietro)$/i.test(x.textContent.trim()));
 if(b){b.click();return true}
 o.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true};
document.addEventListener('keydown',e=>{const o=top();if(!o)return;
 if(e.key==='Escape'){if(o.querySelector('.mbox[role=dialog] .mtt'))return;/* gestito da modal() */
  const el=document.activeElement;if(el&&el.tagName==='SELECT')return;e.preventDefault();closeTop(o)}
 else if(e.key==='Tab'){const f=[...o.querySelectorAll(FOC)].filter(x=>x.offsetParent!==null);if(!f.length)return;
  const i=f.indexOf(document.activeElement);
  if(e.shiftKey&&(i<=0)){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&(i<0||i===f.length-1)){e.preventDefault();f[0].focus()}}
});
// elementi cliccabili non nativi (div/span con data-*) raggiungibili con Tab e attivabili con Invio/Spazio
const CL='[data-gp],[data-ev],.lrow,.evc,#mieiev .evrow,.gpl';
const mark=r=>r.querySelectorAll&&r.querySelectorAll(CL).forEach(e=>{if(/^(BUTTON|A|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(e.tagName)||e.hasAttribute('tabindex'))return;e.tabIndex=0;e.setAttribute('role','button')});
new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>n.nodeType===1&&(mark(n),n.matches&&n.matches(CL)&&mark(n.parentNode||n))))).observe(document.documentElement,{childList:true,subtree:true});
mark(document);
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches(CL)&&e.target.getAttribute('role')==='button'){e.preventDefault();e.target.click()}});
})();
