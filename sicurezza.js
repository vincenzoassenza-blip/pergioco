// v15 — sicurezza degli input: pulizia testi, lunghezze massime, incolla, URL sicuri, CSV, errori globali.
const TXT_MAX={gn:100,sc:100,nt:1000,du:4,tn:300,pkq:100,q:100,gq:100,ccq:100,lq2:100,mn:60,mc2:60,mso:40,es:40,mt:30,le:254,ae:254,me2:254,lp:72,ap:72,ap2:72,p1:12,p2:12,pi:12,np:12,ac:14,evgn:80,
 titolo:120,descrizione:3000,luogo:150,immagine:500,nome:60,cognome:60,luogo_nascita:100,codice_fiscale:16,indirizzo:200,comune:100,provincia:2,numero_tessera:30,motivo_uscita:300,attivita:300,assicurazione:200,cap:5};
const TXT_LABEL={titolo:'Titolo',descrizione:'Descrizione',luogo:'Luogo',immagine:'Locandina',nome:'Nome',cognome:'Cognome',soprannome:'Soprannome',luogo_nascita:'Luogo di nascita',indirizzo:'Indirizzo',comune:'Comune',numero_tessera:'N. tessera',motivo_uscita:'Motivo uscita',attivita:'Attività',assicurazione:'Assicurazione',note:'Note',scenario:'Scenario',name:'Nome gioco',tessera:'Tessera',ospite:'Ospite',codice_fiscale:'Codice fiscale',provincia:'Provincia'};
// limiti per colonna del DB (uguali ai CHECK di migrate-v15.sql)
const COL_MAX={games:{name:100,thumb:500},members:{nome:60,cognome:60,soprannome:40,tessera:30,avatar:16},plays:{note:1000,scenario:100},tables:{note:300},
 eventi:{titolo:120,descrizione:3000,luogo:150,immagine:500},libro_soci:{nome:60,cognome:60,luogo_nascita:100,codice_fiscale:16,indirizzo:200,comune:100,provincia:2,numero_tessera:30,motivo_uscita:300},
 libro_volontari:{nome:60,cognome:60,codice_fiscale:16,attivita:300,assicurazione:200}};
const BAD_CH=/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B\u200C\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\uFFF9-\uFFFB]/g;
const BAD_ZWJ=/(?<!\p{Extended_Pictographic}\uFE0F?)\u200D|\u200D(?!\p{Extended_Pictographic})/gu; // ZWJ solo dentro le emoji composte
// pulizia: caratteri di controllo e invisibili via; spazi normalizzati; multi=true conserva gli a capo
function txtNorm(s,multi){s=String(s??'').normalize('NFC').replace(/\r\n?/g,'\n').replace(BAD_CH,'').replace(BAD_ZWJ,'').replace(/\t/g,' ');
 if(multi)return s.replace(/[ \u00A0\u2000-\u200A\u3000]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n');
 return s.replace(/\n/g,' ').replace(/[ \u00A0\u2000-\u200A\u3000]+/g,' ')}
// taglia senza spezzare emoji/lettere composte
function txtCut(s,n){if(s.length<=n)return s;if(window.Intl&&Intl.Segmenter){let o='';for(const {segment} of new Intl.Segmenter('it',{granularity:'grapheme'}).segment(s)){if(o.length+segment.length>n)break;o+=segment}return o}
 let o=s.slice(0,n);if(/[\uD800-\uDBFF]$/.test(o))o=o.slice(0,-1);return o}
const isTxt=t=>t&&(t.tagName==='TEXTAREA'||(t.tagName==='INPUT'&&/^(text|search|email|url|tel|password|)$/i.test(t.getAttribute('type')||'')))&&!t.dataset.num;
const txtKey=t=>t.id||t.name||t.dataset.f||'';
const txtMax=t=>+t.getAttribute('maxlength')>0?+t.getAttribute('maxlength'):(TXT_MAX[txtKey(t)]||(t.tagName==='TEXTAREA'?1000:t.type==='email'?254:t.type==='password'?72:200));
function txtApplyMax(root){(root.querySelectorAll?root:document).querySelectorAll('input,textarea').forEach(t=>{if(isTxt(t)&&!t.hasAttribute('maxlength'))t.setAttribute('maxlength',txtMax(t))})}
new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType!==1)return;if(n.matches&&n.matches('input,textarea'))txtApplyMax(n.parentNode||document);else txtApplyMax(n)}))).observe(document.documentElement,{childList:true,subtree:true});
txtApplyMax(document);
// digitazione: via i caratteri invisibili/di controllo (anche da tastiere o correttori)
document.addEventListener('input',e=>{const t=e.target;if(!isTxt(t)||t.type==='password')return;const v=t.value,c=v.normalize('NFC').replace(/\r\n?/g,'\n').replace(BAD_CH,'').replace(BAD_ZWJ,'');if(c!==v){const p=Math.max(0,(t.selectionStart||0)-(v.length-c.length));t.value=c;try{t.setSelectionRange(p,p)}catch(_){}}},true);
// incolla: testo pulito, spazi normalizzati, troncato con avviso se troppo lungo
document.addEventListener('paste',e=>{const t=e.target;if(!isTxt(t))return;const raw=(e.clipboardData||window.clipboardData).getData('text');if(raw==null)return;e.preventDefault();
 let c=txtNorm(raw,t.tagName==='TEXTAREA');if(t.type!=='password')c=t.tagName==='TEXTAREA'?c:c.trim();if(t.type==='password')c=raw.replace(BAD_CH,'');
 const max=txtMax(t),s=t.selectionStart??t.value.length,en=t.selectionEnd??s,room=max-(t.value.length-(en-s));
 if(c.length>room){c=txtCut(c,Math.max(0,room));toast(`✂️ Testo incollato troppo lungo: tenuti ${c.length} caratteri (massimo ${max}).`)}
 try{t.setRangeText(c,s,en,'end')}catch(_){t.value=t.value.slice(0,s)+c+t.value.slice(en)}t.dispatchEvent(new Event('input',{bubbles:true}))},true);
// controllo al salvataggio di un oggetto da inviare al DB
function rowClean(table,row){const lim=COL_MAX[table]||{};const multi=['descrizione','note'];for(const k of Object.keys(row)){const v=row[k];if(typeof v!=='string')continue;
  let c=txtNorm(v,multi.includes(k)).trim();row[k]=c===''&&v!==''&&k!=='id'?null:c;
  if(lim[k]&&c.length>lim[k])throw new Error(`«${TXT_LABEL[k]||k}» è troppo lungo: ${c.length} caratteri, massimo ${lim[k]}.`)}
 if(row.immagine&&!safeUrl(row.immagine))throw new Error('Il link della locandina deve essere un indirizzo https:// valido.');
 if(row.thumb&&!safeUrl(row.thumb,true))row.thumb=null;return row}
// URL: solo https (http ammesso solo dove indicato); niente javascript:, data:, ecc.
function safeUrl(u,http){try{const s=String(u??'').trim();if(!s||s.length>500)return'';const x=new URL(s);return(x.protocol==='https:'||(http&&x.protocol==='http:'))&&/^https?:\/\//i.test(s)?x.href:''}catch(e){return''}}
// v41.12.1 — foto profilo: solo URL pubblici dello storage di questa app (niente XSS, niente altri host)
const FOTO_MAX=5*1024*1024,FOTO_OUT=256,FOTO_OUT_MAX=512*1024;
const FOTO_RE=/^\/storage\/v1\/object\/public\/profile-photos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/avatar\.(webp|jpg|jpeg|png)$/i;
function fotoOrigin(){try{const c=window.PERGIOCO_CONFIG||{},u=(c.supabaseUrl||'').trim().replace(/\/$/,'');return u&&new URL(u).protocol==='https:'?new URL(u).origin:''}catch(e){return''}}
function photoUrlOk(u){try{const s=String(u??'').trim();if(!s||s.length>300)return'';const x=new URL(s);if(x.protocol!=='https:'||x.username||x.password||x.search||x.hash)return'';const origin=fotoOrigin();if(!origin||x.origin!==origin)return'';return FOTO_RE.test(x.pathname)?x.origin+x.pathname:''}catch(e){return''}}
function fotoTipo(buf){const u=buf instanceof Uint8Array?buf:new Uint8Array(buf||[]);if(u.length>=3&&u[0]===0xff&&u[1]===0xd8&&u[2]===0xff)return'image/jpeg';if(u.length>=8&&u[0]===0x89&&u[1]===0x50&&u[2]===0x4e&&u[3]===0x47)return'image/png';if(u.length>=12&&u[0]===0x52&&u[1]===0x49&&u[2]===0x46&&u[3]===0x46&&u[8]===0x57&&u[9]===0x45&&u[10]===0x42&&u[11]===0x50)return'image/webp';return''}
async function processAvatar(file){if(!file)throw new Error('Scegli una foto.');const n=String(file.name||'').toLowerCase();if(/\.svgz?$/.test(n)||file.type==='image/svg+xml')throw new Error('Scegli un file JPEG, PNG o WebP (niente SVG).');if(file.size>FOTO_MAX)throw new Error('La foto è troppo grande (massimo 5 MB).');const buf=new Uint8Array(await file.arrayBuffer());if(!fotoTipo(buf))throw new Error('Scegli un file JPEG, PNG o WebP (niente SVG).');let bmp;try{bmp=await createImageBitmap(new Blob([buf],{type:fotoTipo(buf)}),{imageOrientation:'from-image'})}catch(e){throw new Error('Impossibile leggere l\'immagine. Prova un altro file.')}if(!bmp.width||!bmp.height){try{bmp.close()}catch(e){}throw new Error('Impossibile leggere l\'immagine. Prova un altro file.')}const s=Math.min(bmp.width,bmp.height),sx=(bmp.width-s)/2,sy=(bmp.height-s)/2,c=document.createElement('canvas');c.width=c.height=FOTO_OUT;c.getContext('2d').drawImage(bmp,sx,sy,s,s,0,0,FOTO_OUT,FOTO_OUT);try{bmp.close()}catch(e){}const blob=await new Promise(res=>{try{c.toBlob(b=>{if(b&&b.size)res(b);else c.toBlob(res,'image/jpeg',.85)},'image/webp',.85)}catch(e){res(null)}});if(!blob||!blob.size)throw new Error('Impossibile leggere l\'immagine. Prova un altro file.');if(blob.size>FOTO_OUT_MAX)throw new Error('La foto compressa è ancora troppo pesante. Prova un\'altra immagine.');return blob}

// CSV: virgolette e niente formule (= + - @ tab a inizio cella)
const csvCell=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return'"'+s.replace(/"/g,'""')+'"'};
const IMP_MAX_MB=5,IMP_MAX_ROWS=5000;
// data layer: pulizia e limiti prima di ogni scrittura
if(typeof SupabaseAdapter!=='undefined'){const _run=SupabaseAdapter.run.bind(SupabaseAdapter);SupabaseAdapter.run=async o=>{if(o.row)try{rowClean(MAP[o.k].t,o.row)}catch(e){const A={games:'GIOCO',plays:'PARTITA',eventi:'EVENTO',tables:'EVENTO',members:'SOCI',libro_soci:'LIBRI',libro_volontari:'LIBRI'}[MAP[o.k]?MAP[o.k].t:'']||errCtx().area;toastVal(e.message+' Accorcia il testo o correggi il campo e salva di nuovo.','E-'+A+'-V9');return{message:e.message,code:'CLIENT'}}return _run(o)}}
if(typeof LB!=='undefined'){const _s=LB.save.bind(LB);LB.save=(t,r)=>_s(t,rowClean(t,r))}
if(typeof EV!=='undefined'){const _s=EV.save;EV.save=e=>_s(rowClean('eventi',e))}
// immagini rotte (al posto di onerror inline, bloccato dalla CSP)
document.addEventListener('error',e=>{const t=e.target;if(!t||t.tagName!=='IMG')return;if(t.classList.contains('evimg')){t.remove();return}if(t.classList.contains('avimg')){const p=t.parentElement,ini=p&&p.getAttribute('data-ini')||'';t.remove();if(p){p.classList.remove('avph');if(p.id==='avbtn'||p.classList.contains('hav')){p.textContent=ini}else if(ini)p.textContent=ini}}},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;if(b.dataset.act==='reload')location.reload();else if(b.dataset.act.startsWith('go:'))go(b.dataset.act.slice(3))});
// errori globali: messaggio invece della pagina bianca
let _errAt=0;function appErr(m){if(Date.now()-_errAt<3000)return;_errAt=Date.now();try{const r=(typeof errSpiega==='function')?errSpiega(m,'APP'):{code:'E-APP-99'};toast(r.msg?`⚠️ ${r.msg} [${r.code}]`:`⚠️ Qualcosa non ha funzionato. Chiudi e riapri l'app; se succede ancora avvisa lo staff con il codice [${r.code}].`,true)}catch(_){}
 if(V&&!V.children.length)V.innerHTML='<div class="card"><h3>⚠️ Qualcosa è andato storto</h3><p class="muted">La pagina non si è caricata correttamente.</p><button class="p" data-act="reload">Ricarica</button></div>'}
addEventListener('error',e=>{if(e.target===window||e.error)appErr(e.message)});
addEventListener('unhandledrejection',e=>appErr(e.reason&&e.reason.message||String(e.reason)));
