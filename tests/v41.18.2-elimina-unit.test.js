// node tests/v41.18.2-elimina-unit.test.js — elimina/nascondi gioco (solo admin)
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sql=read('supabase/migrate-v41.18.2.sql');
const sch=read('supabase/schema.sql');
const gio=read('giochi.js');
const data=read('data.js');
const sb=read('sb.js');
const app=read('app.js');
const cons=read('consigliere.js');
const sond=read('sondaggi.js');
const {APP_VERSION,swCache,hasAsset}=require('./appver');

chk(APP_VERSION==='41.18.2'&&swCache(),'versione 41.18.2 in brand.js allineata alla cache SW');
chk(['giochi.js','data.js','sb.js','app.js','brand.js','styles.css'].every(hasAsset),'asset modificati pinnati in index e SW');

chk(/alter table public\.games add column if not exists hidden boolean not null default false/.test(sql),'migrazione additiva: colonna games.hidden default false');
chk(/grant select \(hidden\) on public\.games to authenticated/.test(sql)&&/grant update \(hidden\)/.test(sql),'GRANT per colonna hidden solo ad authenticated');
chk(/function public\.admin_game_remove_info\(p_id text\)/.test(sql)&&/function public\.admin_game_remove\(p_id text\)/.test(sql),'RPC info e remove');
chk(/security definer/.test(sql)&&/set search_path = public/.test(sql),'RPC security definer e search_path fissato a public');
chk(/if not public\.is_admin\(\)/.test(sql)&&!/is_staff\(\)|is_moderator\(\)/.test(sql.replace(/commento[\s\S]*/,sql)),'le RPC controllano is_admin, non is_staff');
chk(/revoke all on function public\.admin_game_remove_info\(text\) from public, anon/.test(sql)&&/revoke all on function public\.admin_game_remove\(text\) from public, anon/.test(sql),'REVOKE anon e public sulle RPC');
chk(/grant execute on function public\.admin_game_remove_info\(text\) to authenticated/.test(sql)&&/grant execute on function public\.admin_game_remove\(text\) to authenticated/.test(sql),'GRANT execute solo ad authenticated');
chk(/char_length\(p_id\) > 80/.test(sql)&&/p_id !~/.test(sql)&&/A-Za-z0-9/.test(sql),'id del gioco validato (lunghezza e caratteri)');
chk(/n_plays > 0 or n_tables > 0 or n_coppa > 0 then 'hide' else 'delete'/.test(sql),'con partite, tavoli o Coppa: nasconde; altrimenti elimina');
chk(/update public\.games set hidden = true/.test(sql)&&/delete from public\.games where id = p_id/.test(sql),'hide aggiorna hidden, delete cancella la riga');
chk(/update public\.members set fav_game_id = null/.test(sql),'in eliminazione azzera il gioco preferito');
chk(/when foreign_key_violation then/.test(sql),'se un vincolo blocca la cancellazione, nasconde');
chk(!/drop table/i.test(sql)&&!/truncate/i.test(sql),'nessuna perdita di dati nella migrazione');
chk(/add column if not exists hidden boolean not null default false/.test(sch),'schema.sql allineato: colonna hidden');

chk(/adminMode\(\)&&typeof isMod==='function'&&!isMod\(\)&&!g.hidden/.test(gio),'il tasto è solo per gli admin in modalità admin, non per i moderatori, e non sui già nascosti');
chk(/b\.textContent='🗑 Elimina gioco'/.test(gio),'etichetta del tasto con textContent');
chk(/okL:hide\?'Nascondi gioco':'Elimina definitivamente'/.test(gio)&&/focusNo:true/.test(gio),'la conferma spiega il caso e ha Annulla in evidenza');
chk(/non ha partite né tavoli né altri riferimenti/.test(gio)&&/verrà nascosto dalla collezione, ma storico, partite ed EXP restano/.test(gio),'testi della conferma: elimina vs nascondi');
chk(/const gs=gamesVis\(await DB\.games\(\)\)/.test(gio),'la collezione elenca solo i giochi visibili');
chk(/gamesVis=gs=>\(gs\|\|\[\]\)\.filter\(g=>!g\.hidden\)/.test(data),'gamesVis esclude i nascosti');
chk(/async removeGameInfo/.test(data)&&/async removeGame/.test(data),'DB.removeGame e info anche in locale');
chk(/hidden:!!g.hidden/.test(sb)&&/hidden:!!r.hidden/.test(sb),'sb.js mappa hidden in to/from');
chk(/rpc\('admin_game_remove_info'/.test(sb)&&/rpc\('admin_game_remove'/.test(sb),'il client remoto chiama le RPC, non delete diretto');
chk(/filter\(g=>!g.hidden\|\|\(ed&&ed.gameId&&g.id===ed.gameId\)\)/.test(app),'il picker di una nuova partita nasconde i giochi occultati');
chk(/serata\(\)\{const gs=gamesVis\(await DB\.games\(\)\)/.test(app),'il picker dei tavoli esclude i nascosti');
chk(/cWizard\(mode\)\{if\(!CFLOW\[mode\]\)return;const gs=gamesVis\(await DB.games\(\)\)/.test(cons),'il consigliere esclude i nascosti');
chk(/gamesVis\(gs\)\.filter\(g=>\(g.name/.test(sond),'la ricerca giochi dei sondaggi esclude i nascosti');
chk(!/club|ludoteca/i.test(gio.split('go(\'ludoteca\')').join('').replace(/views\.ludoteca/g,'')),'niente «club» o «ludoteca» nei testi nuovi');

console.log(`v41.18.2-elimina-unit: ${ok}/${n} ok`);
if(ok!==n)process.exit(1);
