// v41 — Configurazione dell'associazione (nome, motto, città, Instagram, email, logo, colori).
// Fonte: public.app_settings chiave 'brand' (lettura solo utenti autenticati; scrittura solo admin + CHECK lato server).
// Prima del login (o se il DB non risponde) si usano l'ultima copia salvata sul telefono o i valori PerGioco.
// Tutti i valori sono testo dell'utente: mostrarli SEMPRE con esc()/textContent; i loghi solo in <img src> validati.
const APP_VERSION='41.15';
// Logo ufficiale Powered by BGG (stesso markup ovunque si usano dati BGG).
function bggPwrHtml(){return '<div class="ibggpwr"><a href="https://boardgamegeek.com" target="_blank" rel="noopener noreferrer" title="Dati giochi da BoardGameGeek"><img src="img/powered-by-bgg.png" alt="Powered by BoardGameGeek" width="120" height="36" loading="lazy"></a></div>'}
const BRAND_DEF=Object.freeze({nome:'PerGioco',motto:'Gioca, prenota, condividi',citta:'Ragusa',instagram:'pergiocoets',email:'info@pergioco.org',logo:'',logo_barra:'',
 colori:Object.freeze({primario:'#14254a',secondario:'#2a4785',accento:'#f2b134',sfondo:'#f4f6fb',barra1:'#0f1c3d',barra2:'#1f3d7a',filo:'#ffd76a'})});
// v41.7 — logo della barra predefinito (dado bianco) se la config non ne ha uno
const BRAND_LOGO_BARRA='img/logo-barra.svg';
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
 vars(c,el){el=el||document.documentElement;el.style.setProperty('--b',c.primario);el.style.setProperty('--b2',c.secondario);el.style.setProperty('--a',c.accento);el.style.setProperty('--bg',c.sfondo);el.style.setProperty('--hd1',c.barra1);el.style.setProperty('--hd2',c.barra2);el.style.setProperty('--hdf',c.filo)},
 apply(){const v=this.v;this.vars(v.colori);const b=document.querySelector('header .brand'),s=document.querySelector('header .sub');if(b)b.textContent=v.nome;if(s){s.textContent=v.motto;s.hidden=!v.motto}
  document.title=v.nome+(v.motto?' – '+v.motto:'');const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=v.colori.primario;const a=document.querySelector('meta[name="apple-mobile-web-app-title"]');if(a)a.content=v.nome}
};
BRAND.v=BRAND.norm(BRAND.cached());
if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>BRAND.apply(),{once:true});else BRAND.apply();
// v41.1 (A2) — moduli configurabili: Coppa, Sfida (staff), Libri sociali. Riga app_settings key='moduli' (vincolo DB moduli_valid, scrittura solo admin).
const MOD_DEF=Object.freeze({coppa:{attivo:true,nome:'Coppa Antero',desc:"Torneo svizzero dell'associazione"},sfida:{attivo:true,nome:'Sfida di Antero',desc:'Torneo tra meccaniche (staff)'},libri:{attivo:true}});
const MOD={KEY:'pergioco-moduli',v:null,loaded:false,NOMI:['coppa','sfida'],BAD:/[<>]/,
 norm(x){const o={};x=x&&typeof x==='object'?x:{};for(const k of Object.keys(MOD_DEF)){const d=MOD_DEF[k],m=x[k]&&typeof x[k]==='object'?x[k]:{};o[k]={attivo:typeof m.attivo==='boolean'?m.attivo:d.attivo};
  if('nome' in d){const n=typeof m.nome==='string'?m.nome.trim():'';o[k].nome=n.length>=2&&n.length<=40&&!this.BAD.test(n)?n:d.nome;const s=typeof m.desc==='string'?m.desc.trim():'';o[k].desc=s.length<=120&&!this.BAD.test(s)?s:d.desc}}return o},
 errors(x){const e=[],L={coppa:'Torneo a coppa',sfida:'Sfida tra meccaniche'};for(const k of this.NOMI){const m=x[k]||{},n=String(m.nome||'').trim(),s=String(m.desc||'');
  if(n.length<2||n.length>40)e.push(L[k]+': il nome deve avere da 2 a 40 caratteri');else if(this.BAD.test(n))e.push(L[k]+': il nome non può contenere < o >');
  if(s.length>120)e.push(L[k]+': descrizione troppo lunga (max 120)');else if(this.BAD.test(s))e.push(L[k]+': la descrizione non può contenere < o >')}return e},
 on(k){return !!(this.v[k]&&this.v[k].attivo)},nome(k){return(this.v[k]&&this.v[k].nome)||MOD_DEF[k].nome},desc(k){return(this.v[k]&&this.v[k].desc)||''},
 cached(){try{return JSON.parse(localStorage.getItem(this.KEY)||'null')}catch(e){return null}},
 async load(force){if(this.loaded&&!force)return this.v;const c=BRAND.cl();if(!c)return this.v;
  try{const{data,error}=await c.from('app_settings').select('value').eq('key','moduli').maybeSingle();if(error)throw error;this.loaded=true;
   if(data&&data.value){this.v=this.norm(data.value);try{localStorage.setItem(this.KEY,JSON.stringify(this.v))}catch(e){}this.apply()}}catch(e){console.warn('moduli',e)}return this.v},
 async save(x){const c=BRAND.cl();if(!c)throw new Error('Serve la connessione al database');const err=this.errors(x);if(err.length)throw Object.assign(new Error(err.join(' · ')),{val:true});const v=this.norm(x);
  const{error}=await c.from('app_settings').upsert({key:'moduli',value:v});if(error)throw error;this.v=v;try{localStorage.setItem(this.KEY,JSON.stringify(v))}catch(e){}this.apply();return v},
 // testi statici (badge, fonti XP, nomi schermate errori) col nome configurato
 apply(){const n=this.nome('coppa'),R=s=>TXT.cp(s);
  if(typeof BADGES!=='undefined')BADGES.forEach(b=>{if(!b._o)b._o=[b[2],b[3]];b[2]=R(b._o[0]);b[3]=R(b._o[1])});
  if(typeof XP_SRC!=='undefined')XP_SRC.forEach(x=>{if(!x._o)x._o=x[1];x[1]=R(x._o)});
  if(typeof ERR_AREE!=='undefined'){if(!ERR_AREE._oc)ERR_AREE._oc=ERR_AREE.COPPA;ERR_AREE.COPPA=R(ERR_AREE._oc)}
  if(typeof ERR_AZIONI!=='undefined')for(const a of Object.values(ERR_AZIONI))if(a[0]==='COPPA'){if(a._o===undefined)a._o=a[1];a[1]=R(a._o)}
  if(typeof ERR_SCHERMI!=='undefined'&&ERR_SCHERMI.coppa)ERR_SCHERMI.coppa[0]=n}};
MOD.v=MOD.norm(MOD.cached());
document.addEventListener('DOMContentLoaded',()=>MOD.apply());
// v41.1 (A3) — testi propri dell'associazione (lore della Sfida, nome breve della Coppa, regolamenti, dati dell'ente).
// Riga app_settings key='testi' (vincolo DB testi_valid, scrittura solo admin). DEFAULT = testi PerGioco identici a v41.0.
const TXT_DEF=Object.freeze({gm_tutto:'Tutto',gm_gdt:'GDT',gm_gdr:'GDR',gp_period:"Periodo",gp_all:"Tutto",gp_range:"Intervallo date",gp_member:"Partecipante",gp_from:"Da",gp_to:"A",santo:"Sant'Antero",festa:'01-03',antero:'antero',anteri:'anteri',coppa_breve:'Coppa',coppa_plur:'Coppe',
 coppa_intro:'Torneo svizzero 1 contro 1 o a tavoli da 3–4: nessun tavolo ripetuto, mai lo stesso gioco due volte.',
 coppa_regole_tavoli:'Regole: mai due volte lo stesso tavolo, si cerca di non ritrovare gli stessi avversari; i tavoli sono equilibrati per punti e ranking; ogni tavolo gioca un gioco adatto al numero di giocatori, mai già giocato da nessuno di loro, scelto per favorire chi ha meno vittorie.',
 coppa_regole_1v1:'Regole: niente rivincite, nessun gioco si ripete per lo stesso giocatore, a chi ha meno vittorie toccano giochi più favorevoli. Con giocatori dispari uno riposa (vittoria a tavolino, al massimo una volta).',
 ente_nome:'PerGioco APS',ente_cf:'92052290886',
 // v41.8 — pagina Giochi: titolo della collezione e striscia dei tavoli
 collezione:'📚 La nostra collezione',g8_oggi:'📅 Oggi',g8_prox:'📅 Prossimo tavolo',g8_tav1:'tavolo',g8_tavn:'tavoli',g8_lib1:'posto libero',g8_libn:'posti liberi',g8_pieni:'nessun posto libero',
 // v41.8.1 — Profilo: livello in evidenza ({n} = XP mancanti, {l} = livello successivo)
 lv_invito:'Ancora {n} XP per il livello {l}',lv_come:'Come guadagnare XP',lv_max:'Livello massimo raggiunto',
 ibgg_titolo:'📥 Importa da BoardGameGeek',ibgg_sub:'File CSV/Excel o nome utente BGG',ibgg_viaFile:'Carica un file',ibgg_viaUser:'Nome utente BGG',ibgg_viaUserSoon:'Disponibile a breve',ibgg_viaUserHelp:'Inserisci il nome utente BoardGameGeek (collezione owned). Solo admin.',ibgg_viaUserGo:'Recupera collezione',ibgg_viaUserWait:'Recupero da BoardGameGeek… può richiedere un minuto.',ibgg_viaUserErr:'Collezione non recuperata. Controlla il nome utente e riprova.',ibgg_attrib:'Dati giochi da BoardGameGeek',
 ibgg_anteprima:'Anteprima import',ibgg_mostra:'Mostra',ibgg_tutto:'Tutto',ibgg_importa:'Importa {n} giochi selezionati',ibgg_esito:'Import completato',ibgg_viaUserCheck:'Verifico…',ibgg_viaUserOk:'Utente trovato',ibgg_viaUserMissing:'Nome utente non trovato su BGG',ibgg_viaUserRecent:'Usati di recente',ibgg_viaUserRemove:'Rimuovi',ibgg_src:'BoardGameGeek',irpg_src:'RPGGeek',irpg_titolo:'📥 Importa da RPGGeek',irpg_sub:'File CSV/Excel o nome utente RPGGeek',irpg_viaUser:'Nome utente RPGGeek',irpg_viaUserHelp:'Inserisci il nome utente RPGGeek (stesso account di BoardGameGeek, collezione owned). Solo admin.',irpg_viaUserWait:'Recupero da RPGGeek… può richiedere un minuto.',irpg_viaUserErr:'Collezione non recuperata. Controlla il nome utente e riprova.',irpg_viaUserMissing:'Nome utente non trovato su RPGGeek',irpg_attrib:'Dati giochi da RPGGeek',irpg_fileHelp:'Su RPGGeek: Collection → Export. Accettiamo CSV o Excel, massimo 2 MB e 2.000 righe.',irpg_viaFileSub:'CSV o Excel esportato da RPGGeek → Collection → Export',irpg_viaUserSub:'Recupera la collezione «owned» dall\'account',tt_pieno:'I tavoli {tipo} per questa serata sono al completo. Per ulteriori prenotazioni contatta lo staff nel gruppo WhatsApp.',tt_wa:'',tt_ora:'21:00',tt_ora_lab:'Orario della serata',tt_gest:'Tipi di tavolo',tt_tipi:'Tipi',tt_cap:'Disponibili per serata',tt_master:'Master',tt_gioco:'Gioco',tt_nota:'Nota',tt_posti:'Posti (master compreso)',tt_versione:'Versione',tt_versione_ph:'es. Warhammer 40.000 10ª edizione',tt_filtro:'Tipo di tavolo',tt_tutto:'Tutto',tt_reg_gdr:'Registra sessione GDR',tt_reg_altro:'Registra una partita',tt_sistema:'Sistema / gioco',tt_avventura:'Avventura / campagna',tt_sessione:'Sessione',tt_oneshot:'One-shot',tt_campagna:'Campagna',tt_sess_n:'Sessione n°',tt_esito:'Esito',tt_conclusa:'Avventura conclusa',tt_incorso:'In corso',tt_esito_nota:"Nota sull'esito",tt_pg:'Personaggio',tt_nome_partita:'Nome'});
const TXT={KEY:'pergioco-testi',v:null,loaded:false,
 // [min,max]; brevi: niente < > " & (finiscono dentro testi HTML); lunghi: niente < > e sempre esc()
 LIM:{gp_period:[1,40],gp_all:[1,40],gp_range:[1,40],gp_member:[1,40],gp_from:[1,40],gp_to:[1,40],santo:[2,40],festa:[0,5],antero:[2,20],anteri:[2,20],coppa_breve:[2,30],coppa_plur:[2,30],coppa_intro:[0,400],coppa_regole_tavoli:[0,600],coppa_regole_1v1:[0,600],ente_nome:[2,80],ente_cf:[0,16],collezione:[2,40],gm_tutto:[2,20],gm_gdt:[2,20],gm_gdr:[2,20],g8_oggi:[2,30],g8_prox:[2,30],g8_tav1:[2,20],g8_tavn:[2,20],g8_lib1:[2,30],g8_libn:[2,30],g8_pieni:[2,40],lv_invito:[5,60],lv_come:[2,40],lv_max:[2,40],ibgg_titolo:[2,60],ibgg_sub:[2,80],ibgg_viaFile:[2,40],ibgg_viaUser:[2,40],ibgg_viaUserSoon:[2,40],ibgg_viaUserHelp:[2,120],ibgg_viaUserGo:[2,40],ibgg_viaUserWait:[2,80],ibgg_viaUserErr:[2,80],ibgg_attrib:[2,60],ibgg_anteprima:[2,40],ibgg_mostra:[2,20],ibgg_tutto:[2,20],ibgg_importa:[2,60],ibgg_esito:[2,40],ibgg_viaUserCheck:[2,40],ibgg_viaUserOk:[2,60],ibgg_viaUserMissing:[2,80],ibgg_viaUserRecent:[2,40],ibgg_viaUserRemove:[2,40],ibgg_src:[2,40],irpg_src:[2,40],irpg_titolo:[2,60],irpg_sub:[2,80],irpg_viaUser:[2,40],irpg_viaUserHelp:[2,160],irpg_viaUserWait:[2,80],irpg_viaUserErr:[2,80],irpg_viaUserMissing:[2,80],irpg_attrib:[2,60],irpg_fileHelp:[2,160],irpg_viaFileSub:[2,80],irpg_viaUserSub:[2,80],tt_pieno:[10,280],tt_wa:[0,200],tt_ora:[5,5],tt_ora_lab:[2,40],tt_gest:[2,40],tt_tipi:[2,40],tt_cap:[2,40],tt_master:[2,40],tt_gioco:[2,40],tt_nota:[2,40],tt_posti:[2,40],tt_versione:[2,40],tt_versione_ph:[2,80],tt_filtro:[2,40],tt_tutto:[2,20],tt_reg_gdr:[2,50],tt_reg_altro:[2,50],tt_sistema:[2,40],tt_avventura:[2,40],tt_sessione:[2,40],tt_oneshot:[2,30],tt_campagna:[2,30],tt_sess_n:[2,30],tt_esito:[2,30],tt_conclusa:[2,40],tt_incorso:[2,30],tt_esito_nota:[2,40],tt_pg:[2,30],tt_nome_partita:[2,30]},
 LUNGHI:['coppa_intro','coppa_regole_tavoli','coppa_regole_1v1','tt_pieno'],BADS:/[<>"&]/,BADL:/[<>]/,CF:/^[A-Za-z0-9]*$/,FESTA:/^((0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))?$/,
 L:{gm_tutto:"Pagina Giochi · Tutto",gm_gdt:"Pagina Giochi · GDT",gm_gdr:"Pagina Giochi · GDR",gp_period:"Gestione Partite · Periodo",gp_all:"Gestione Partite · Tutto",gp_range:"Gestione Partite · Intervallo date",gp_member:"Gestione Partite · Partecipante",gp_from:"Gestione Partite · Da",gp_to:"Gestione Partite · A",santo:'Santo / patrono',festa:'Festa del santo (MM-GG)',antero:'Numero magico (singolare)',anteri:'Numero magico (plurale)',coppa_breve:'Nome breve della Coppa',coppa_plur:'Plurale',coppa_intro:'Descrizione della Coppa',coppa_regole_tavoli:'Regole (a tavoli)',coppa_regole_1v1:'Regole (1 contro 1)',ente_nome:'Nome legale dell\'ente',ente_cf:'Codice fiscale',collezione:'Titolo della collezione',g8_oggi:'Striscia: oggi',g8_prox:'Striscia: prossimo tavolo',g8_tav1:'Tavolo (singolare)',g8_tavn:'Tavoli (plurale)',g8_lib1:'Posto libero (singolare)',g8_libn:'Posti liberi (plurale)',g8_pieni:'Tutti pieni',lv_invito:'Invito al prossimo livello ({n} XP, {l} livello)',lv_come:'Titolo della spiegazione XP',lv_max:'Livello massimo',ibgg_titolo:'Titolo import BGG',ibgg_sub:'Sottotitolo riga Gestione',ibgg_viaFile:'Via file',ibgg_viaUser:'Via utente BGG',ibgg_viaUserSoon:'Utente: messaggio «a breve»',ibgg_viaUserHelp:'Aiuto username BGG',ibgg_viaUserGo:'Pulsante recupera',ibgg_viaUserWait:'Attesa recupero',ibgg_viaUserErr:'Errore recupero',ibgg_attrib:'Testo attribuzione BGG',ibgg_anteprima:'Titolo anteprima',ibgg_mostra:'Etichetta filtro',ibgg_tutto:'Voce Tutto',ibgg_importa:'Pulsante importa ({n})',ibgg_esito:'Titolo esito',ibgg_viaUserCheck:'Verifica username in corso',ibgg_viaUserOk:'Utente trovato',ibgg_viaUserMissing:'Username assente su BGG',ibgg_viaUserRecent:'Etichetta username recenti',ibgg_viaUserRemove:'Rimuovi username recente',ibgg_src:'Import · fonte BGG',irpg_src:'Import · fonte RPGGeek',irpg_titolo:'Titolo import RPGGeek',irpg_sub:'Sottotitolo import RPGGeek',irpg_viaUser:'Via utente RPGGeek',irpg_viaUserHelp:'Aiuto username RPGGeek',irpg_viaUserWait:'Attesa recupero RPGGeek',irpg_viaUserErr:'Errore recupero RPGGeek',irpg_viaUserMissing:'Username assente su RPGGeek',irpg_attrib:'Testo attribuzione RPGGeek',irpg_fileHelp:'Aiuto file RPGGeek',irpg_viaFileSub:'Sottotitolo file RPGGeek',irpg_viaUserSub:'Sottotitolo utente RPGGeek',tt_pieno:'Messaggio tipo pieno',tt_wa:'Link WhatsApp (facoltativo)',tt_ora:'Orario serata (HH:MM)',tt_ora_lab:'Etichetta orario serata',tt_gest:'Titolo Gestione Tavoli',tt_tipi:'Etichetta tipi',tt_cap:'Capienza per serata',tt_master:'Campo Master',tt_gioco:'Campo gioco GDR',tt_nota:'Campo nota',tt_posti:'Etichetta posti',tt_versione:'Campo Versione (Warhammer)',tt_versione_ph:'Placeholder Versione',tt_filtro:'Etichetta filtro Agenda',tt_tutto:'Voce Tutto (filtro)',tt_reg_gdr:'Titolo registra GDR',tt_reg_altro:'Titolo registra altro tipo',tt_sistema:'Campo sistema GDR',tt_avventura:'Campo avventura',tt_sessione:'Etichetta sessione',tt_oneshot:'Voce one-shot',tt_campagna:'Voce campagna',tt_sess_n:'Etichetta numero sessione',tt_esito:'Etichetta esito',tt_conclusa:'Voce avventura conclusa',tt_incorso:'Voce in corso',tt_esito_nota:'Etichetta nota esito',tt_pg:'Etichetta personaggio',tt_nome_partita:'Etichetta nome partita'},
 ok(k,s){const[a,b]=this.LIM[k];s=String(s);const n=s.trim().length;return n>=a&&n<=b&&!(this.LUNGHI.includes(k)?this.BADL:this.BADS).test(s)&&(k!=='ente_cf'||this.CF.test(s))&&(k!=='festa'||this.FESTA.test(s.trim()))},
 norm(x){const o={};x=x&&typeof x==='object'?x:{};for(const k in TXT_DEF){const s=typeof x[k]==='string'?x[k].trim():null;o[k]=s!==null&&this.ok(k,s)?s:TXT_DEF[k]}return o},
 errors(x){const e=[];for(const k in TXT_DEF){const s=String(x[k]??'').trim(),[a,b]=this.LIM[k];
  if(s.length<a||s.length>b)e.push(`${this.L[k]}: ${a?`da ${a} a ${b}`:`massimo ${b}`} caratteri`);else if(!this.ok(k,s))e.push(`${this.L[k]}: ${k==='ente_cf'?'solo lettere e numeri':k==='festa'?'formato MM-GG (es. 01-03) o vuoto':this.LUNGHI.includes(k)?'non può contenere < o >':'non può contenere < > " &'}`)}return e},
 g(k){return(this.v&&this.v[k])||TXT_DEF[k]},
 cap(s){return s.charAt(0).toUpperCase()+s.slice(1)},
 // lore della Sfida: identità se i valori sono quelli predefiniti
 lore(s){if(typeof s!=='string')return s;const v=this.v;if(v.santo===TXT_DEF.santo&&v.antero===TXT_DEF.antero&&v.anteri===TXT_DEF.anteri)return s;
  const P=typeof MOD!=='undefined'?[MOD.nome('sfida'),MOD.nome('coppa')]:[];P.forEach((p,i)=>{s=s.split(p).join('\u0002'+i+'\u0002')});
  return s.replace(/Sant['’]Antero/g,'\u0001').replace(/ANTERO/g,v.antero.toUpperCase()).replace(/anteri/g,v.anteri).replace(/Anteri/g,this.cap(v.anteri)).replace(/antero/g,v.antero).replace(/Antero/g,this.cap(v.antero)).replace(/\u0001/g,v.santo).replace(/\u0002(\d)\u0002/g,(_,i)=>P[i])},
 // «Coppa»/«Coppe» generici (il nome completo del modulo resta MOD.nome)
 cp(s){if(typeof s!=='string')return s;const v=this.v,n=typeof MOD!=='undefined'?MOD.nome('coppa'):'Coppa Antero';
  if(v.coppa_breve===TXT_DEF.coppa_breve&&v.coppa_plur===TXT_DEF.coppa_plur)return s.replace(/Coppa Antero/g,n);
  return s.replace(/Coppa Antero/g,'\u0001').replace(/\bCoppa\b/g,v.coppa_breve).replace(/\bCoppe\b/g,v.coppa_plur).replace(/\u0001/g,n)},
 cached(){try{return JSON.parse(localStorage.getItem(this.KEY)||'null')}catch(e){return null}},
 async load(force){if(this.loaded&&!force)return this.v;const c=BRAND.cl();if(!c)return this.v;
  try{const{data,error}=await c.from('app_settings').select('value').eq('key','testi').maybeSingle();if(error)throw error;this.loaded=true;
   if(data&&data.value){this.v=this.norm(data.value);try{localStorage.setItem(this.KEY,JSON.stringify(this.v))}catch(e){}if(typeof MOD!=='undefined')MOD.apply()}}catch(e){console.warn('testi',e)}return this.v},
 async save(x){const c=BRAND.cl();if(!c)throw new Error('Serve la connessione al database');const err=this.errors(x);if(err.length)throw Object.assign(new Error(err.join(' · ')),{val:true});const v=this.norm(x);
  const{error}=await c.from('app_settings').upsert({key:'testi',value:v});if(error)throw error;this.v=v;try{localStorage.setItem(this.KEY,JSON.stringify(v))}catch(e){}MOD.apply();return v}};
TXT.v=TXT.norm(TXT.cached());
