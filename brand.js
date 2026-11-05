// v41 — Configurazione dell'associazione (nome, motto, città, Instagram, email, logo, colori).
// Fonte: public.app_settings chiave 'brand' (lettura solo utenti autenticati; scrittura solo admin + CHECK lato server).
// Prima del login (o se il DB non risponde) si usano l'ultima copia salvata sul telefono o i valori PerGioco.
// Tutti i valori sono testo dell'utente: mostrarli SEMPRE con esc()/textContent; i loghi solo in <img src> validati.
const APP_VERSION='41.0';
const BRAND_DEF=Object.freeze({nome:'PerGioco',motto:'Gioca, prenota, condividi',citta:'Ragusa',instagram:'pergiocoets',email:'info@pergioco.org',logo:'',logo_barra:'',
 colori:Object.freeze({primario:'#14254a',secondario:'#2a4785',accento:'#f2b134',sfondo:'#f4f6fb'})});
const BRAND={
 KEY:'pergioco-brand',v:null,loaded:false,
 LIM:{nome:[2,40],motto:[0,80],citta:[0,40]},LOGO_MAX:150000,
 HEX:/^#[0-9a-f]{6}$/i,IG:/^[A-Za-z0-9._]{1,30}$/,MAIL:/^[^@\s<>"]+@[^@\s<>"]+\.[A-Za-z]{2,}$/,
 LOGO:/^(https:\/\/[^\s"<>]+|data:image\/(svg\+xml|png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$/,
 // Unisce con i valori predefiniti scartando campi sconosciuti o non validi (difesa anche lato client).
 norm(x){const d=BRAND_DEF,o={};x=x&&typeof x==='object'?x:{};
  for(const k of ['nome','motto','citta','instagram','email','logo','logo_barra'])o[k]=typeof x[k]==='string'?x[k]:d[k];
  if(String(o.nome).trim().length<2)o.nome=d.nome;
  o.colori={};const c=x.colori&&typeof x.colori==='object'?x.colori:{};for(const k in d.colori)o.colori[k]=this.HEX.test(c[k]||'')?c[k]:d.colori[k];
  for(const k of ['logo','logo_barra'])if(o[k]&&(!this.LOGO.test(o[k])||o[k].length>this.LOGO_MAX))o[k]='';
  if(o.instagram&&!this.IG.test(o.instagram))o.instagram='';return o},
 // Errori di validazione (stesse regole del vincolo SQL brand_valid); [] = ok
 errors(x){const e=[],L=this.LIM;for(const k in L){const n=String(x[k]||'').trim().length;if(n<L[k][0]||n>L[k][1])e.push(k==='nome'?`Nome: da ${L.nome[0]} a ${L.nome[1]} caratteri`:`${k==='motto'?'Motto':'Città'}: massimo ${L[k][1]} caratteri`)}
  if(x.instagram&&!this.IG.test(x.instagram))e.push('Instagram: solo lettere, numeri, punto e trattino basso (senza @)');
  if(x.email&&(!this.MAIL.test(x.email)||x.email.length>120))e.push('Email non valida');
  for(const k of ['logo','logo_barra'])if(x[k]){if(x[k].length>this.LOGO_MAX)e.push('Logo troppo grande (max ~110 KB)');else if(!this.LOGO.test(x[k]))e.push('Logo: serve un indirizzo https:// o un file SVG/PNG/JPG/WebP');else if(/^data:image\/svg/.test(x[k])&&this.svgBad(x[k]))e.push('Logo SVG non sicuro (script o collegamenti esterni)')}
  for(const k in BRAND_DEF.colori)if(!this.HEX.test((x.colori||{})[k]||''))e.push('Colore '+k+': formato #RRGGBB');return e},
 svgBad(u){try{const t=atob(u.slice(u.indexOf(',')+1));return /(<script|javascript:|\son[a-z]+\s*=|<foreignObject|xlink:href\s*=\s*["']?\s*(https?|data):)/i.test(t)}catch(e){return true}},
 cached(){try{return JSON.parse(localStorage.getItem(this.KEY)||'null')}catch(e){return null}},
 cl(){return window.CP_CLIENT||(DB.remote&&DB.remote.client)||null},
 async load(force){if(this.loaded&&!force)return this.v;const c=this.cl();if(!c)return this.v;
  try{const{data,error}=await c.from('app_settings').select('value').eq('key','brand').maybeSingle();if(error)throw error;
   this.loaded=true;if(data&&data.value){this.v=this.norm(data.value);try{localStorage.setItem(this.KEY,JSON.stringify(this.v))}catch(e){}this.apply()}}catch(e){console.warn('brand',e)}return this.v},
 async save(x){const c=this.cl();if(!c)throw new Error('Serve la connessione al database');const v=this.norm(x);const err=this.errors(v);if(err.length)throw Object.assign(new Error(err.join(' · ')),{val:true});
  const{error}=await c.from('app_settings').upsert({key:'brand',value:v});if(error)throw error;this.v=v;try{localStorage.setItem(this.KEY,JSON.stringify(v))}catch(e){}this.apply();return v},
 ig(){return this.v.instagram?{url:'https://www.instagram.com/'+encodeURIComponent(this.v.instagram)+'/',tag:'@'+this.v.instagram}:null},
 tag(s){return '#'+String(s||'').normalize('NFD').replace(/[^A-Za-z0-9]/g,'')},
 vars(c,el){el=el||document.documentElement;el.style.setProperty('--b',c.primario);el.style.setProperty('--b2',c.secondario);el.style.setProperty('--a',c.accento);el.style.setProperty('--bg',c.sfondo)},
 apply(){const v=this.v;this.vars(v.colori);const b=document.querySelector('header .brand'),s=document.querySelector('header .sub');if(b)b.textContent=v.nome;if(s){s.textContent=v.motto;s.hidden=!v.motto}
  document.title=v.nome+(v.motto?' – '+v.motto:'');const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=v.colori.primario;const a=document.querySelector('meta[name="apple-mobile-web-app-title"]');if(a)a.content=v.nome}
};
BRAND.v=BRAND.norm(BRAND.cached());
if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>BRAND.apply(),{once:true});else BRAND.apply();
