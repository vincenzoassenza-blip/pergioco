// v41.8.1 — niente «flash» della schermata vecchia: i file caricati dopo app.js riordinano la pagina dopo il primo render
// (Record aspetta un giro di timer, Altro/Profilo dati asincroni). Il contenuto resta invisibile finché la vista non è pronta.
(()=>{const VW=['record','profilo','giocatori','altro','nuova','ludoteca','stats','serata'];let n=0;
 const on=()=>{n++;V.classList.add('vprep')},off=()=>{n=Math.max(0,n-1);if(!n)V.classList.remove('vprep')};
 VW.forEach(k=>{const f=views[k];if(typeof f!=='function')return;views[k]=async function(...a){on();const g=setTimeout(()=>{n=0;V.classList.remove('vprep')},4000);try{return await f.apply(this,a)}finally{clearTimeout(g);off()}}});
 window.NOFLASH={VW}})();
