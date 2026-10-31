// v38.0 — errori "parlanti": cosa è successo, cosa fare, e un codice breve da riferire allo staff.
// Nessun segreto o dato personale nei log: email, token, UUID e numeri lunghi vengono mascherati.
const ERR_AREE={LOGIN:'accesso',REG:'registrazione',PWD:'recupero password',SOCI:'gestione soci',MOD:'moderatori',PROF:'profilo',
 PARTITA:'partita',GIOCO:'giochi',BGG:'ricerca BGG',VOTO:'voti',EVENTO:'eventi',PREN:'prenotazioni',COPPA:'Coppa Antero',SFIDA:'sfida',
 DES:'Lista desideri',LIBRI:'registro soci e volontari',BACKUP:'backup',STAT:'statistiche',WRAP:'Wrapped',COMM:'commenti',APP:'app'};
// tipi di errore tecnico -> numero del codice + spiegazione
const ERR_TIPI=[
 [/timeout|timed out|aborterror|signal is aborted/i,'16','Il server ci sta mettendo troppo a rispondere.','Riprova tra poco; se la connessione è lenta avvicinati al wifi o passa ai dati mobili.'],
 [/quotaexceeded|quota|storage.*full|exceeded the quota/i,'12','La memoria del browser per questo sito è piena.','Chiudi le altre schede, libera spazio sul telefono o nelle impostazioni del browser cancella i dati dei siti vecchi (non di PerGioco), poi riapri l\'app.'],
 [/notallowederror|permission (denied|dismissed)|not allowed by the user agent|clipboard|securityerror/i,'13','Il browser ha bloccato un permesso (appunti, fotocamera o condivisione).','Consenti il permesso per questo sito nelle impostazioni del browser e riprova, oppure fai l\'operazione a mano.'],
 [/cannot read prop|of null|of undefined|null is not an object|undefined is not an object|reading '|has no properties|notfounderror/i,'15','Una parte della schermata non era pronta o mancava un dato.','Torna indietro, riapri la schermata e riprova: i dati già salvati non sono stati toccati.'],
 [/is not a function|is not defined|can't find variable|not supported|unsupported|notsupportederror|syntaxerror|unexpected identifier/i,'14','Il tuo browser non supporta una funzione usata qui.','Aggiorna il browser (Chrome, Safari, Firefox o Edge recenti) oppure usa l\'app installata sul telefono.'],
 [/unexpected token|json\.parse|is not valid json|unexpected end of json/i,'17','Il server ha risposto in modo inatteso.','Riprova tra qualche minuto; se succede ancora avvisa lo staff con il codice.'],
 [/failed to fetch|networkerror|network request failed|load failed|err_internet|offline|err_network/i,'01','Non riesco a collegarmi al server.','Controlla la connessione a internet e riprova tra qualche secondo.'],
 [/invalid login credentials|invalid_credentials|invalid_grant/i,'02','Email o password errate.','Controlla di aver scritto bene l\'email e la password (attenzione a spazi finali e maiuscole nella password). Se non la ricordi usa «Password dimenticata?» con un codice dallo staff.'],
 [/email not confirmed/i,'03','L\'email non è ancora confermata.','Chiedi allo staff di verificare il tuo account.'],
 [/jwt expired|invalid jwt|refresh token|session.*(missing|expired|not found)|not authenticated|auth session/i,'04','La tua sessione è scaduta.','Esci e rientra con email e password, poi riprova.'],
 [/row-level security|permission denied|42501|not authorized|non autorizzat|forbidden|\b403\b|permessi/i,'05','Non hai i permessi per questa operazione.','Se pensi di doverli avere, chiedi a un admin di controllare il tuo ruolo.'],
 [/duplicate key|23505|already exists|già present|already registered|user already/i,'06','Questo elemento esiste già.','Controlla di non averlo già inserito (stessa email, stesso gioco, stessa tessera…).'],
 [/violates check constraint|23514|value too long|22001|invalid input syntax|22P02|out of range/i,'07','Alcuni dati non sono accettati.','Controlla i campi: lunghezze, numeri e date devono essere validi.'],
 [/foreign key|23503|still referenced/i,'08','Questo elemento è collegato ad altri dati.','Non si può eliminare o modificare finché è usato (per esempio in partite o prenotazioni).'],
 [/too many requests|rate limit|\b429\b|over_request_rate/i,'09','Troppi tentativi in poco tempo.','Aspetta un paio di minuti e riprova.'],
 [/password should be|weak password|password.*(at least|almeno)/i,'10','La password è troppo debole.','Usa almeno 8 caratteri, meglio se con lettere e numeri.'],
 [/\b5\d\d\b|internal server error|service unavailable|bad gateway/i,'11','Il server ha avuto un problema momentaneo.','Riprova tra qualche minuto; se continua avvisa lo staff con il codice.'],
 [/\bquota\b|storage.*full/i,'12','Spazio esaurito sul server.','Avvisa lo staff con il codice.']];

// —— contesto: schermata attuale e ultima azione dell'utente ——
const ERR_SCHERMI={ludoteca:['Giochi','GIOCO'],nuova:['Nuova partita','PARTITA'],record:['Record','STAT'],giocatori:['Soci','SOCI'],serata:['Serata','EVENTO'],eventi:['Eventi','EVENTO'],
 altro:['Gestione','SOCI'],stats:['Statistiche','STAT'],profilo:['Profilo','PROF'],desideri:['Lista desideri','DES'],coppa:['Coppa Antero','COPPA'],libri:['Registro soci e volontari','LIBRI'],wrapped:['Wrapped','WRAP']};
// id del pulsante (eventualmente "schermata#id") -> [area, cosa stavi facendo, è un modulo con dati inseriti?]
const ERR_AZIONI={save:['PARTITA','salvare la partita',1],'nuova#ga':['PARTITA','aggiungere un ospite',0],pko:['PARTITA','confermare i giocatori',0],
 'ludoteca#ga':['GIOCO','aggiungere il gioco',1],gbq:['BGG','cercare il gioco su BGG',0],
 esv:['EVENTO','salvare l\'evento',1],evnew:['EVENTO','creare un nuovo evento',0],evedit:['EVENTO','modificare l\'evento',1],evdel:['EVENTO','annullare l\'evento',0],tsv:['EVENTO','aprire il tavolo',1],evcsv:['EVENTO','scaricare il CSV',0],evics:['EVENTO','aggiungere l\'evento al calendario',0],
 evbook:['PREN','prenotarti all\'evento',0],evpr:['PREN','prenotarti al tavolo',0],evcanc:['PREN','annullare la prenotazione',0],
 cpsave:['COPPA','salvare la configurazione della Coppa',1],cpnew:['COPPA','creare l\'edizione della Coppa',0],cpme:['COPPA','iscriverti o ritirarti dalla Coppa',0],cpdel:['COPPA','eliminare l\'edizione',0],cpapri:['COPPA','aprire le iscrizioni',0],
 dsok:['DES','proporre il gioco',1],dsapri:['DES','aprire la votazione',0],dschiudi:['DES','chiudere la votazione',0],dsscad:['DES','salvare la scadenza',1],
 msv:['SOCI','salvare il socio',1],ma:['MOD','nominare il moderatore',1],smg:['PROF','collegare il tuo account',0],
 lsv:['LIBRI','salvare la scheda nel registro',1],ldel:['LIBRI','eliminare la scheda',0],limp:['LIBRI','importare il file Excel',0],lcsv:['LIBRI','scaricare il CSV',0],lpdf:['LIBRI','preparare il PDF',0],
 ago:['LOGIN','entrare',1],lg:['LOGIN','entrare come admin',1],eqgo:['SFIDA','trovare la sfida',0],eqq:['SFIDA','calcolare la sfida',1],antadd:['SFIDA','aggiungere la meccanica',1],
 ex:['BACKUP','esportare il backup',0],wrass:['WRAP','aprire il Wrapped dell\'associazione',0],ast:['STAT','aprire le statistiche',0]};
let ERR_ULTIMA=null;
function errAzioneDa(el){const b=el&&el.closest&&el.closest('button,[role=button],a,input[type=checkbox],select,summary');if(!b)return;
 const tab=window._cur||'',id=b.id||'',def=ERR_AZIONI[tab+'#'+id]||ERR_AZIONI[id];
 const lbl=(b.getAttribute('aria-label')||b.textContent||b.value||'').replace(/[\u{1F000}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu,'').replace(/\s+/g,' ').trim().slice(0,40);
 const form=!!(b.closest('.card,form,dialog,.modal')&&b.closest('.card,form,dialog,.modal').querySelector('input:not([type=checkbox]):not([type=hidden]),textarea'));
 ERR_ULTIMA={t:Date.now(),tab,area:def?def[0]:null,cosa:def?def[1]:(lbl?`usare «${lbl}»`:''),form:def?!!def[2]:form}}
if(typeof document!=='undefined'&&document.addEventListener){document.addEventListener('click',e=>errAzioneDa(e.target),true);document.addEventListener('change',e=>errAzioneDa(e.target),true)}
function errCtx(){const tab=(typeof window!=='undefined'&&window._cur)||'';const s=ERR_SCHERMI[tab];const a=ERR_ULTIMA&&Date.now()-ERR_ULTIMA.t<20000?ERR_ULTIMA:null;
 return{schermo:s?s[0]:'',area:(a&&a.area)||(s&&s[1])||'APP',cosa:a?a.cosa:'',form:a?a.form:false}}
// helper per i gestori: azione('PARTITA','salvare la partita',async()=>{...}) — dà il nome all'azione e cattura gli errori
function azione(area,cosa,fn,form=true){return async(...x)=>{ERR_ULTIMA={t:Date.now(),tab:window._cur||'',area,cosa,form};try{return await fn(...x)}catch(e){toastErr(e,area);}}}
const ERR_LOG='pergioco-errlog';
function errPulisci(s){return String(s??'').replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g,'<email>').replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g,'<token>')
 .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,'<id>').replace(/\b(sb|sk|pk)_[\w-]{10,}/g,'<chiave>').replace(/\b\d{6,}\b/g,'<num>').replace(/\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/g,'<cf>').slice(0,300)}
// testo grezzo dell'errore (Error, errore Supabase, stringa)
function errTesto(e){if(e==null)return'';if(typeof e==='string')return e;return [e.message,e.error_description,e.details,e.hint,e.code,e.status].filter(Boolean).join(' ')}
// messaggi applicativi già in italiano (RAISE EXCEPTION delle funzioni o throw nel codice): si mostrano così come sono
const errApplicativo=m=>/[àèéìòù]|\b(non|il|la|gli|le|un|una|del|della|già|serve|servono|massimo|minimo|codice|gioco|socio|evento|tavolo|posti|coppa)\b/i.test(m)&&!/\b(the|is|not|of|for|failed)\b/i.test(m);
function errCodice(area,num){return 'E-'+(ERR_AREE[area]?area:'APP')+'-'+num}
function errLog(code,area,raw){try{const l=JSON.parse(localStorage.getItem(ERR_LOG)||'[]');l.push({t:new Date().toISOString(),code,area,v:(document.querySelector('script[src*="app.js"]')?.src.match(/v=([\d.]+)/)||[])[1],msg:errPulisci(raw)});
 localStorage.setItem(ERR_LOG,JSON.stringify(l.slice(-30)))}catch(_){}console.warn('[PerGioco]',code,errPulisci(raw))}
// spiega un errore: {code,msg}. area 'APP' o assente => si usa l'area della schermata/azione corrente
function errSpiega(e,area){const C=errCtx();if(!area||area==='APP')area=C.area||'APP';
 const raw=errTesto(e).replace(/^.*?ERROR:\s*/,'').trim();
 const prima=C.cosa?`Non sono riuscito a ${C.cosa}${C.schermo?' (schermata '+C.schermo+')':''}: `:'';
 const resta=C.form?' Quello che hai inserito è ancora qui, non serve riscriverlo.':'';
 if(typeof navigator!=='undefined'&&navigator.onLine===false){const c=errCodice(area,'01');errLog(c,area,raw);return{code:c,msg:`${prima}sei offline. Collegati a internet e riprova.${resta}`}}
 for(const [re,n,cosa,fare] of ERR_TIPI)if(re.test(raw)){const c=errCodice(area,n);errLog(c,area,raw);return{code:c,msg:`${prima}${prima?cosa.charAt(0).toLowerCase()+cosa.slice(1):cosa} ${fare}${resta}`}}
 if(raw&&raw.length<=200&&errApplicativo(raw)){const c=errCodice(area,'00');errLog(c,area,raw);return{code:c,msg:`${prima}${raw.replace(/\.?$/,'.')}${resta}`}}
 let h=0;for(const ch of errPulisci(raw))h=(h*31+ch.charCodeAt(0))>>>0;const c=errCodice(area,'99')+'-'+(h%65536).toString(16).toUpperCase().padStart(4,'0');errLog(c,area,raw);
 if(area==='BGG')return{code:c,msg:`${prima||'La ricerca su BGG non ha funzionato: '}BoardGameGeek non risponde come dovrebbe. Riprova tra un minuto, oppure incolla direttamente il link o l'ID del gioco da boardgamegeek.com.`};
 if(prima)return{code:c,msg:`${prima}c'è stato un problema imprevisto nell'app.${resta} Riprova tra poco; se succede ancora chiudi e riapri l'app e avvisa lo staff con il codice.`};
 const dove=C.schermo?`nella schermata ${C.schermo}`:`(${ERR_AREE[area]||'app'})`;
 return{code:c,msg:`Qualcosa non ha funzionato ${dove}. Riprova; se succede ancora chiudi e riapri l'app e avvisa lo staff con il codice.`}}
// mostra l'errore all'utente; prefisso opzionale (es. "Salvataggio non riuscito")
function toastErr(e,area,prefisso){const {code,msg}=errSpiega(e,area);toast(`⚠️ ${prefisso&&!/^Non sono riuscito/.test(msg)?prefisso+': ':''}${msg} [${code}]`,true);return code}
// messaggio di validazione con codice fisso (non viene loggato: è un errore di compilazione)
function toastVal(msg,code){toast(`✋ ${msg}${code?' ['+code+']':''}`)}
