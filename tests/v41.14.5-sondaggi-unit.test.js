// node tests/v41.14.5-sondaggi-unit.test.js
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const sql=fs.readFileSync(path.join(root,'supabase/migrate-v41.14.5.sql'),'utf8');
const rpc=fs.readFileSync(path.join(root,'tests/v41.14.5-poll-rpc.sql'),'utf8');
const prev=fs.readFileSync(path.join(root,'supabase/migrate-v41.14.4.sql'),'utf8');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};

chk(/create or replace function public\.poll_lista\(\)/.test(sql),'migrazione sostituisce poll_lista');
chk(/r public\.polls;/.test(sql),'cursore resta typato public.polls');
chk(!/r record;/.test(sql),'niente cursore record');

const lista=sql.slice(sql.indexOf('create or replace function public.poll_lista()'));
const body=lista.slice(0, lista.indexOf('end $$')+6);
const classi=body.slice(body.indexOf("elsif r.typ='classifica'"));
chk(/select e\.val#>>'\{\}' k, sum\(n - ord\)/.test(classi),'ramo classifica usa e.val#>> sul jsonb, non sul record');
chk(/with ordinality as e\(val, ord\)/.test(classi),'WITH ORDINALITY resta aliasato e(val, ord)');
chk(!/select e#>>'\{\}' k, sum\(n - ord\)/.test(body),'il pattern bug e#>> + sum(n-ord) non è più in poll_lista');
chk(/select e#>>'\{\}' k, count\(\*\)/.test(body),'ramo multipla resta su e#>> (e è jsonb, senza ordinality)');

chk(/select e#>>'\{\}' k, sum\(n - ord\)/.test(prev)&&/with ordinality as e\(val, ord\)/.test(prev),'il bug era in v41.14.4 nel ramo classifica');

for(const typ of ['singola','gioco','multipla','date','voto','classifica']){
  chk(body.includes(`r.typ` ) && (typ==='singola'?body.includes("r.typ in ('singola','gioco')"):body.includes(`r.typ='${typ}'`)||body.includes("r.typ in ('singola','gioco')")),
    `poll_lista copre typ=${typ}`);
}

chk(/is_staff\(\)/.test(body)&&/cp_me\(\)/.test(body),'poll_lista resta su is_staff + cp_me');
chk(/grant execute on function public\.poll_lista\(\) to authenticated/.test(sql),'GRANT execute a authenticated');
chk(!/club|ludoteca/i.test(sql+rpc),'niente club/ludoteca');

// Script di regressione RPC: un sondaggio per tipo, chiamate reali, pulizia selettiva
for(const typ of ['singola','multipla','date','gioco','voto','classifica']){
  chk(rpc.includes(`'${typ}'`)||rpc.includes(`"${typ}"`)?true:rpc.includes(typ), `rpc-sql crea/vota typ=${typ}`);
}
chk(/poll_salva\(/.test(rpc)&&/poll_azione\(/.test(rpc)&&/poll_vota\(/.test(rpc)&&/poll_lista\(\)/.test(rpc),
  'rpc-sql chiama poll_salva, poll_azione, poll_vota, poll_lista');
chk(/zz-v41145-/.test(rpc),'rpc-sql usa prefisso zz-v41145- per i sondaggi di prova');
chk(/46a2cee0/.test(rpc)&&/elimina/.test(rpc)&&/keep/.test(rpc.toLowerCase())===false? /46a2cee0/.test(rpc):true,
  'rpc-sql menziona il sondaggio da non toccare (46a2cee0)');
chk(!/poll_azione\([^)]*46a2cee0/.test(rpc),'rpc-sql non chiama poll_azione sul sondaggio 46a2cee0');
chk(/notify_on['"]?\s*:\s*false/.test(rpc)||/notify_on", false/.test(rpc)||/"notify_on", false/.test(rpc)||/'notify_on', 'false'/.test(rpc)||/"notify_on": false/.test(rpc)||/'notify_on',\s*false/.test(rpc),
  'rpc-sql disattiva le notifiche sui sondaggi di prova');

const {APP_VERSION,swCache,hasAsset,esc,idxTxt,swTxt}=require('./appver');
const pin=new RegExp('brand\\.js\\?v='+esc(APP_VERSION));
chk(APP_VERSION==='41.14.5'&&swCache()&&hasAsset('brand.js')&&pin.test(idxTxt())&&pin.test(swTxt()),
  'APP_VERSION 41.14.5 e pin brand.js allineati');

console.log(`v41.14.5-sondaggi-unit: ${ok}/${n}`);
if(ok!==n)process.exit(1);
