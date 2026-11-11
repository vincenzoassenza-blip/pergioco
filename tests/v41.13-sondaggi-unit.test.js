// node tests/v41.13-sondaggi-unit.test.js
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.log('FAIL',m);process.exitCode=1}};

const brand=fs.readFileSync(path.join(ROOT,'brand.js'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
const idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const sql=fs.readFileSync(path.join(ROOT,'supabase/migrate-v41.13.sql'),'utf8');
const low=sql.replace(/--.*$/mg,'');
const js=fs.readFileSync(path.join(ROOT,'sondaggi.js'),'utf8');
const cm=fs.readFileSync(path.join(ROOT,'community.js'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');

const {APP_VERSION,swCache,hasAsset}=require('./appver');chk(!!APP_VERSION&&swCache()&&hasAsset('sondaggi.js'),'APP_VERSION dal codice + sondaggi in cache');
chk(hasAsset('sondaggi.js')&&hasAsset('styles.css'),'sondaggi.js e styles in cache');
chk(/sondaggi\.js\?v=/.test(idx)&&/community\.js\?v=41\.13/.test(idx)&&idx.indexOf('sondaggi.js')<idx.indexOf('community.js'),'index: sondaggi.js prima di community.js');
chk(hasAsset('styles.css'),'styles in index e sw');

chk(!/insert into public\.(plays|games|game_meta)/i.test(low)&&!/update public\.(plays|games|game_meta|member_xp_base|member_xp_cp)\b/i.test(low),'migrazione non altera plays/games/xp di base');
chk(/create table if not exists public\.polls/.test(sql)&&/poll_options/.test(sql)&&/poll_participants/.test(sql)&&/poll_ballots/.test(sql),'4 tabelle principali');
chk(/poll_xp_grant/.test(sql)&&/poll_badge_grant/.test(sql)&&/poll_notices/.test(sql),'grant XP/badge e notifiche');
['singola','multipla','date','gioco','voto','classifica'].forEach(k=>chk(sql.includes("'"+k+"'"),'tipo '+k+' in SQL'));
chk(/revoke all on table public\.polls/.test(low)&&/from public, anon, authenticated/.test(low),'REVOKE tabelle a public/anon/authenticated');
chk(/grant execute on function public\.'\|\|fn/.test(sql)||/grant execute on function public\.' \|\|fn/.test(sql),'GRANT execute dinamico a authenticated');
chk(/poll_lista\(\)/.test(sql)&&/poll_vota/.test(sql)&&/poll_salva/.test(sql)&&/poll_azione/.test(sql),'RPC elenco, voto, salva, azione');
chk(/'poll_notify\(uuid,text\)'/.test(sql)===false,'poll_notify non è esposta a authenticated');
chk(/r\.anonymous then[\s\S]{0,200}member_id, choices[\s\S]{0,80}null/.test(sql)||/values \(p_id, null, p_choices/.test(sql),'scheda anonima senza member_id');
chk(/Nei sondaggi anonimi il voto non si può cambiare/.test(sql),'voto anonimo non modificabile (niente collegamento)');
chk(/date_trunc\('day'/.test(sql),'timestamp scheda anonima troncato al giorno');
chk(/enable row level security/.test(sql),'RLS attiva');
chk(/char_length\(btrim\(title\)\) between 1 and 80/.test(sql)&&/char_length\(help\) <= 280/.test(sql),'limiti titolo e aiuto');
chk(/geekdo-images/.test(sql)&&sql.indexOf('javascript:')<0,'copertine solo BGG, niente javascript');
chk(/create or replace function public\.member_xp\(\)/.test(sql)&&/poll_xp_grant/.test(sql),'member_xp somma anche gli XP sondaggio');
chk(/is_staff\(\)/.test(sql)&&/Solo lo staff/.test(sql),'scrittura riservata allo staff lato DB');
chk(/des_proponi/.test(sql)&&/poll_collega_desideri/.test(sql),'collegamento a lista desideri');

chk(/adminMode/.test(js)&&/PS\.showTab=/.test(js)&&/has_active/.test(js)&&!/PS\.d\.staff\|\|PS\.d\.has_active/.test(js),'tab: visibile in adminMode o con sondaggio attivo');
chk(/data-cmt="sondaggi"/.test(cm)&&/showSon/.test(cm)&&/PS\.showTab/.test(cm),'community.js rispetta la visibilità del tab');
chk(!/club|ludoteca/i.test(js)&&!/club|ludoteca/i.test(cm),'niente club/ludoteca nei testi nuovi');
chk(/esc\(p\.title\)/.test(js)&&/esc\(o\.label\)/.test(js)&&/esc\(p\.help\)/.test(js),'testi utente passano da esc()');
chk(/Invia il voto/.test(js)&&/Nuovo sondaggio/.test(js)&&/Crea sondaggio/.test(js)&&/Fissa in alto/.test(js),'testi italiani del mockup');
chk(/poll_vota/.test(js)&&/poll_salva/.test(js)&&/poll_azione/.test(js)&&/poll_collega_desideri/.test(js),'client chiama le RPC');
chk(/\.card\.pin/.test(css)&&/\.types/.test(css)&&/\.dyn button/.test(css),'stili lista, tipi e doodle');
chk(/v41\.13 — Sondaggi/.test(js),'file marcato v41.13');

console.log(ok+'/'+n+' controlli');
process.exit(ok===n?0:1);
