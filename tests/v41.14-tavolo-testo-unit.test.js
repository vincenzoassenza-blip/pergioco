// node tests/v41.14-tavolo-testo-unit.test.js
// Bug: un socio in modalità utente che apre un tavolo Warhammer (o GDR / tipo
// personalizzato) vedeva «servono i permessi admin» sul testo libero.
// Causa: colonne versione/game_name senza GRANT di colonna per authenticated,
// nascosta dal toast generico di flush(). Il creatore deve poter scrivere
// il testo del proprio tavolo; gli altri no.
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let n=0,ok=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};

const mig=read('supabase/migrate-v41.14.1.sql');
const mig111=read('supabase/migrate-v41.11.1.sql');
const sb=read('sb.js');
const js=read('tavoli-tipi.js');

chk(/NON applicare in produzione/.test(mig),'migrazione preparata, da non applicare prima del «vai»');
chk(/grant select, insert, update\s*\(\s*type_id,\s*master_member_id,\s*master_name,\s*game_name,\s*bgg_rpg_id,\s*versione\s*\)\s*on public\.tables to authenticated/i.test(mig),
  'GRANT di colonna su tables.versione e tables.game_name per authenticated');
chk(/grant select, insert, update\s*\(\s*play_kind,\s*game_name,\s*versione,\s*bgg_rpg_id,\s*type_id,\s*gdr\s*\)\s*on public\.plays to authenticated/i.test(mig),
  'GRANT di colonna su plays.game_name / versione');
chk(/elsif k = 'custom'/.test(mig)&&/new\.game_id := null/.test(mig),'tipo personalizzato: testo libero, niente gioco della collezione obbligatorio');
chk(/k = 'war'/.test(mig)&&/k = 'gdr'/.test(mig),'Warhammer e GDR restano distinti');
chk(/is_admin\(\)/.test(mig)===false,'il testo libero non richiede is_admin()');
chk(/new\.versione/.test(mig)&&/old\.versione/.test(mig)&&/Solo chi ha aperto il tavolo può modificarlo/.test(mig),
  'solo il creatore (o lo staff, già in is_staff) modifica versione/game_name in update');
chk(/notify pgrst/.test(mig),'NOTIFY ricarica lo schema PostgREST');

// Contratto: senza GRANT di colonna il socio host veniva rifiutato (il bug);
// con GRANT, host sì, estraneo no, staff sì. Lunghezza e <> restano vietati.
function canWrite({hasColGrant,isStaff,isHost,op,versione,gameName}){
  const text=String(versione||gameName||'');
  if(text){
    if(/[<>]/.test(text))return{ok:false,why:'xss'};
    const max=versione?60:100;
    if(text.length>max)return{ok:false,why:'len'};
    if(!hasColGrant)return{ok:false,why:'grant'}; // bug riprodotto
  }
  if(isStaff)return{ok:true};
  if(op==='insert'||isHost)return{ok:true};
  return{ok:false,why:'host'};
}
chk(canWrite({hasColGrant:false,isStaff:false,isHost:true,op:'insert',versione:'Warhammer 40.000 10ª edizione'}).why==='grant',
  'bug riprodotto: senza GRANT il socio host è rifiutato sul testo Warhammer');
chk(canWrite({hasColGrant:false,isStaff:false,isHost:true,op:'insert',gameName:'Last Sabbath'}).why==='grant',
  'bug riprodotto: stesso rifiuto sul nome GDR');
chk(canWrite({hasColGrant:true,isStaff:false,isHost:true,op:'insert',versione:'Warhammer 40.000 10ª edizione'}).ok,
  'fix: con GRANT il socio host scrive la versione');
chk(canWrite({hasColGrant:true,isStaff:false,isHost:true,op:'insert',gameName:'Last Sabbath'}).ok,
  'fix: il socio host scrive il gioco GDR');
chk(canWrite({hasColGrant:true,isStaff:false,isHost:true,op:'insert',versione:'Age of Sigmar'}).ok,
  'fix: tipo personalizzato (stesso testo libero) per il creatore');
chk(canWrite({hasColGrant:true,isStaff:true,isHost:false,op:'update',versione:'10ª'}).ok,
  'lo staff può ancora modificare il testo');
chk(canWrite({hasColGrant:true,isStaff:false,isHost:false,op:'update',versione:'hack'}).why==='host',
  'un altro socio non può modificare il testo');
chk(canWrite({hasColGrant:true,isStaff:false,isHost:true,op:'insert',versione:'<script>x</script>'}).why==='xss',
  'testo con <> rifiutato (vincolo già in v41.11.1)');
chk(canWrite({hasColGrant:true,isStaff:false,isHost:true,op:'insert',versione:'x'.repeat(61)}).why==='len',
  'versione oltre 60 caratteri rifiutata');

const escM=js.match(/const escTxt=s=>[^;]+;/);
chk(!!escM,'escTxt presente nel client');
const escTxt=new Function(escM[0]+';return escTxt;')();
chk(escTxt('<b>40.000</b> 10ª')==='40.000 10ª'&&!/[<>]/.test(escTxt('<img src=x onerror=alert(1)>Ciao')),
  'il client toglie i tag e i <> prima di salvare');
chk(/#tt-ver/.test(js)&&/\.slice\(0,60\)/.test(js)&&/\.slice\(0,100\)/.test(js),
  'maxLength client: versione 60, nome GDR 100 (come i vincoli SQL)');
chk(/payload\.versione/.test(js)&&/payload\.gameName/.test(js),
  'il modulo invia versione (Warhammer/custom) e gameName (GDR)');
chk(/versione:t\.versione/.test(sb)&&/game_name:t\.gameName/.test(sb),'MAP tables include versione e game_name');
chk(/toastErr\(last,'EVENTO'\)/.test(sb),'flush mostra l\'errore reale, non un generico «permessi admin»');
chk(/tables_versione_len/.test(mig111)&&/versione !~ '\[<>\]'/.test(mig111),'vincolo lunghezza + no <> già in v41.11.1');

console.log(ok+'/'+n+' controlli');
process.exit(ok===n?0:1);
