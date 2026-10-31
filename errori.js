// v38.0 — errori "parlanti": cosa è successo, cosa fare, e un codice breve da riferire allo staff.
// Nessun segreto o dato personale nei log: email, token, UUID e numeri lunghi vengono mascherati.
const ERR_AREE={LOGIN:'accesso',REG:'registrazione',PWD:'recupero password',SOCI:'gestione soci',MOD:'moderatori',PROF:'profilo',
 PARTITA:'partita',GIOCO:'giochi',BGG:'ricerca BGG',VOTO:'voti',EVENTO:'eventi',PREN:'prenotazioni',COPPA:'Coppa Antero',SFIDA:'sfida',
 DES:'Lista desideri',LIBRI:'registro soci e volontari',BACKUP:'backup',STAT:'statistiche',WRAP:'Wrapped',COMM:'commenti',APP:'app'};
// tipi di errore tecnico -> numero del codice + spiegazione
const ERR_TIPI=[
 [/failed to fetch|networkerror|network request failed|load failed|err_internet|offline|timeout|timed out|aborterror/i,'01','Non riesco a collegarmi al server.','Controlla la connessione a internet e riprova tra qualche secondo.'],
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
 [/quota|storage.*full|exceeded/i,'12','Spazio esaurito sul dispositivo o sul server.','Libera spazio o avvisa lo staff con il codice.']];
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
// spiega un errore: {code,msg}
function errSpiega(e,area='APP'){const raw=errTesto(e).replace(/^.*?ERROR:\s*/,'').trim();
 if(typeof navigator!=='undefined'&&navigator.onLine===false){const c=errCodice(area,'01');errLog(c,area,raw);return{code:c,msg:'Sei offline. Collegati a internet e riprova.'}}
 for(const [re,n,cosa,fare] of ERR_TIPI)if(re.test(raw)){const c=errCodice(area,n);errLog(c,area,raw);return{code:c,msg:`${cosa} ${fare}`}}
 if(raw&&raw.length<=200&&errApplicativo(raw)){const c=errCodice(area,'00');errLog(c,area,raw);return{code:c,msg:raw.replace(/\.?$/,'.')}}
 let h=0;for(const ch of errPulisci(raw))h=(h*31+ch.charCodeAt(0))>>>0;const c=errCodice(area,'99')+'-'+(h%65536).toString(16).toUpperCase().padStart(4,'0');errLog(c,area,raw);
 return{code:c,msg:`Qualcosa non ha funzionato (${ERR_AREE[area]||'app'}). Riprova; se succede ancora chiudi e riapri l'app, poi avvisa lo staff con il codice.`}}
// mostra l'errore all'utente; prefisso opzionale (es. "Salvataggio non riuscito")
function toastErr(e,area,prefisso){const {code,msg}=errSpiega(e,area);toast(`⚠️ ${prefisso?prefisso+': ':''}${msg} [${code}]`,true);return code}
// messaggio di validazione con codice fisso (non viene loggato: è un errore di compilazione)
function toastVal(msg,code){toast(`✋ ${msg}${code?' ['+code+']':''}`)}
