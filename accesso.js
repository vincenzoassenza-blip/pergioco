// v41.17 — regole di accesso per stato socio (non in regola, sospeso, disattivato).
// Lo staff è sempre escluso dai blocchi.
const ACC={
 data:null,
 avvisoFatto:false,
 msgSospeso:'Il tuo account è sospeso: puoi consultare l\'app, ma in questo periodo non puoi fare questa azione.',
 msgQuota:'Per rinnovare la tessera associativa, contatta lo staff.',
 msgDisatt:'Il tuo account è disattivato.\n\nPer rinnovare la tessera associativa, contatta lo staff.',
 isStaff(){return !!(this.data&&this.data.staff)},
 bloccaApp(){return !!(this.data&&this.data.blocca_app&&!this.data.staff)},
 bloccaAzioni(){return !!(this.data&&this.data.blocca_azioni&&!this.data.staff)},
 nonInRegola(){return !!(this.data&&this.data.non_in_regola&&!this.data.staff)},
 guardAzioni(){if(this.bloccaAzioni()){if(typeof toast==='function')toast(this.msgSospeso);return false}return true},
 apply(st){this.data=st||null;if(typeof SupabaseAdapter!=='undefined')SupabaseAdapter.accesso=this.data;return this.data},
 nomeAss(){return(typeof BRAND!=='undefined'&&BRAND.v&&BRAND.v.nome)?BRAND.v.nome:'PerGioco'},
 _esc(s){return typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))},
 showBlocco(){
  document.body.classList.add('gate','acc-lock');
  const V=document.getElementById('view');if(!V)return;
  V.innerHTML=`<div class="login-hero acc-lock-screen" id="acc-lock">
    <img src="icons/icon-192.png" alt="">
    <h1>${this._esc(this.nomeAss())}</h1>
    <p>Il tuo account è disattivato.</p>
    <p>Per rinnovare la tessera associativa, contatta lo staff.</p>
    <button class="p" type="button" id="acc-esci">Esci</button>
  </div>`;
  const b=document.getElementById('acc-esci');
  if(b)b.onclick=()=>{if(typeof DB!=='undefined'&&DB.logout)DB.logout()};
 },
 showAvviso(){
  return new Promise(res=>{
   const o=document.createElement('div');o.className='mdl acc-avviso';o.id='acc-avviso';
   o.innerHTML=`<div class="mbox" role="alertdialog" aria-modal="true" aria-labelledby="acc-av-t" aria-describedby="acc-av-x">
     <div class="mtt" id="acc-av-t">Tessera associativa</div>
     <div class="mtx" id="acc-av-x">Non risulti in regola con la quota. Per rinnovare la tessera associativa, contatta lo staff.</div>
     <p class="acc-cd-wrap muted" id="acc-cd-wrap">Puoi proseguire tra <b id="acc-cd">5</b> secondi.</p>
     <div class="mbt"><button class="p" type="button" id="acc-ok" hidden>Ho capito</button></div>
    </div>`;
   document.body.appendChild(o);
   const btn=o.querySelector('#acc-ok'),cd=o.querySelector('#acc-cd'),wrap=o.querySelector('#acc-cd-wrap');
   let n=5;const tm=setInterval(()=>{n--;if(n<=0){clearInterval(tm);if(wrap)wrap.hidden=true;btn.hidden=false;btn.disabled=false;btn.focus();return}if(cd)cd.textContent=String(n)},1000);
   const end=()=>{clearInterval(tm);o.remove();this.avvisoFatto=true;res()};
   btn.onclick=()=>end();
  });
 },
 bannerHtml(){return this.bloccaAzioni()?`<div class="card acc-ban" id="acc-ban" role="status">${this._esc(this.msgSospeso)}</div>`:''},
 mountBanner(){
  const old=document.getElementById('acc-ban');
  if(!this.bloccaAzioni()){if(old)old.remove();return}
  if(old)return;
  const V=document.getElementById('view');if(!V)return;
  V.insertAdjacentHTML('afterbegin',this.bannerHtml());
 },
 async dopoAvvio(){
  if(this.bloccaApp()){this.showBlocco();return 'blocked'}
  if(this.nonInRegola()&&!this.avvisoFatto)await this.showAvviso();
  return this.data&&this.data.stato||'ok';
 }
};
window.ACC=ACC;
