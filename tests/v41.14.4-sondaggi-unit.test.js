// node tests/v41.14.4-sondaggi-unit.test.js
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const sql=fs.readFileSync(path.join(root,'supabase/migrate-v41.14.4.sql'),'utf8');
const js=fs.readFileSync(path.join(root,'sondaggi.js'),'utf8');
const old=fs.readFileSync(path.join(root,'supabase/migrate-v41.13.sql'),'utf8');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};

chk(/create or replace function public\.poll_lista\(\)/.test(sql),'migrazione sostituisce poll_lista');
chk(/r public\.polls;/.test(sql),'cursore typato public.polls, non record');
chk(!/r record;/.test(sql),'niente r record in poll_lista v41.14.4');
chk(/poll_can_see\(r, me, st, voted\)/.test(sql),'poll_can_see riceve la riga typata');
chk(/grant execute on function public\.poll_lista\(\) to authenticated/.test(sql),'GRANT execute a authenticated');
chk(/r record;/.test(old)&&/poll_can_see\(r, me, st, voted\)/.test(old),'il bug era nel cursore record di v41.13');
const lista=sql.slice(sql.indexOf('create or replace function public.poll_lista()'));
const body=lista.slice(0, lista.indexOf('end $$')+6);
chk(/is_staff\(\)/.test(body)&&/cp_me\(\)/.test(body),'poll_lista resta su is_staff + cp_me (moderatore compreso)');
chk(!/is_admin\(\) then raise/.test(body),'nessun blocco solo-admin in poll_lista');
chk(/PS\.load=async\(\)=>\{try\{if\(PS\.cl\(\)\)\{PS\.d=await PS\.rpc\('poll_lista'\);PS\.err=null\}/.test(js),'load azzera PS.err se riesce');
chk(/id="pserr"/.test(js)&&/T\.errLoad/.test(js),'se poll_lista fallisce si vede l\'errore, non una lista vuota senza pulsante');
chk(/errLoad:'Non riesco a caricare i sondaggi\.'/.test(js),'testo di errore in italiano');
chk(!/club|ludoteca/i.test(sql+js),'niente club/ludoteca');
const {APP_VERSION,swCache,hasAsset,esc,idxTxt,swTxt}=require('./appver');
const pin=new RegExp('sondaggi\\.js\\?v='+esc(APP_VERSION));
chk(!!APP_VERSION&&swCache()&&hasAsset('sondaggi.js')&&pin.test(idxTxt())&&pin.test(swTxt()),'APP_VERSION e pin sondaggi.js allineati');

console.log(`v41.14.4-sondaggi-unit: ${ok}/${n}`);
if(ok!==n)process.exit(1);
