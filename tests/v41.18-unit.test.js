// node tests/v41.18-unit.test.js — moderatori e admin collegati al socio, riconoscimento per user_id
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sql=read('supabase/migrate-v41.18.sql');
const sch=read('supabase/schema.sql');
const app=read('app.js');
const sb=read('sb.js');
const css=read('styles.css');
const {APP_VERSION,swCache,hasAsset}=require('./appver');

chk(!!APP_VERSION&&swCache(),'APP_VERSION in brand.js allineata alla cache SW');
chk(hasAsset('app.js')&&hasAsset('sb.js')&&hasAsset('styles.css')&&hasAsset('brand.js'),'asset modificati pinnati in index e SW');

chk(/alter table public\.moderators add column if not exists user_id uuid/.test(sql),'migrazione additiva: colonna user_id su moderators');
chk(/update public\.moderators mo[\s\S]*set user_id = u\.id[\s\S]*auth\.users/.test(sql),'backfill user_id da auth.users senza cancellare righe');
chk(/create unique index if not exists moderators_user_id_uidx/.test(sql),'indice unico su user_id (dove non è null)');
chk(!/drop table/i.test(sql)&&!/truncate/i.test(sql)&&!/delete from public\.moderators/i.test(sql.replace(/delete from public\.moderators where lower\(email\)/g,'')),'nessuna perdita di dati nella migrazione');

chk(/m\.user_id is not null and m\.user_id = auth\.uid\(\)/.test(sql)&&/lower\(m\.email\) = lower\(coalesce\(auth\.jwt\(\)/.test(sql),'is_moderator riconosce anche user_id, non solo email');
chk(/drop function if exists public\.admin_moderators\(\)/.test(sql)&&/returns table\(/.test(sql)&&/stato text/.test(sql),'admin_moderators ricreata con nome, cognome, stato');
chk(/when m\.id is not null then 'collegato'/.test(sql)&&/then 'account'/.test(sql)&&/else 'assente'/.test(sql),'stati collegato / account / assente');
chk(/function public\.admin_admins\(\)/.test(sql)&&/from public\.admins a/.test(sql),'RPC admin_admins in sola lettura, stessa forma');
chk(/insert into public\.moderators\(email, user_id\)/.test(sql)&&/on conflict \(email\) do update/.test(sql),'admin_set_moderator salva anche user_id');
chk(/function public\.admin_set_moderator_member\(p_member text, p_on boolean\)/.test(sql)&&/Il socio non ha un account collegato/.test(sql)&&/perform public\.admin_set_moderator/.test(sql),'nomina dal socio: legge email da auth.users');
chk(/if not public\.is_admin\(\)/.test(sql)&&/Solo gli admin/.test(sql),'RPC di gestione solo is_admin');
chk(/set search_path = public/.test(sql),'search_path fissato a public');
chk(/revoke all on function public\.admin_moderators\(\) from public, anon/.test(sql)&&/revoke all on function public\.admin_admins\(\) from public, anon/.test(sql)&&/revoke all on function public\.admin_set_moderator\(text, boolean\) from public, anon/.test(sql)&&/revoke all on function public\.admin_set_moderator_member\(text, boolean\) from public, anon/.test(sql),'REVOKE anon e public sulle nuove funzioni');
chk(/grant execute on function public\.admin_moderators\(\) to authenticated/.test(sql)&&/grant execute on function public\.admin_admins\(\) to authenticated/.test(sql)&&/grant execute on function public\.admin_set_moderator_member\(text, boolean\) to authenticated/.test(sql),'GRANT solo ad authenticated');
chk(/revoke all on function public\.is_moderator\(\) from public, anon/.test(sql)&&/grant execute on function public\.is_moderator\(\) to authenticated/.test(sql),'is_moderator: anon revocato, GRANT authenticated');
chk(!/tessera|codice_fiscale|cf\b|residenza|nascita|telefono/i.test(sql.split('admin_moderators')[1].split('admin_set_moderator')[0]),'le RPC elenco non espongono dati anagrafici oltre nome e email');

chk(/function public\.admin_admins\(\)/.test(sch)&&/user_id uuid/.test(sch.split('public.moderators')[1].slice(0,200)),'schema.sql allineato a v41.18');

chk(/staffRow\(x\)/.test(sb)&&/async admins\(\)/.test(sb)&&/admin_admins/.test(sb)&&/setModeratorMember/.test(sb)&&/admin_set_moderator_member/.test(sb),'sb.js: elenco strutturato, admins(), setModeratorMember');
chk(/typeof x==='string'/.test(sb)&&/x\.admin_moderators/.test(sb),'sb.js accetta ancora le email semplici come fallback');

chk(/function staffCard\(/.test(app)&&/function staffStato\(/.test(app)&&/Account registrato, nessun socio collegato/.test(app)&&/Non ancora registrato/.test(app),'stati in italiano nell\'interfaccia');
chk(/esc\(titolo\)/.test(app)&&/esc\(email\)/.test(app)&&/esc\(st\)/.test(app)&&/esc\(memberName\(m\)\)/.test(app),'nome, email, stato e opzioni del select con escape XSS');
chk(/<h3 class="alsub">Admin<\/h3>/.test(app)&&/staffCard\(x,false\)/.test(app)&&!/staffCard\(x,false\)[\s\S]{0,80}Rimuovi/.test(app.split('h3 class="alsub">Admin')[1].slice(0,400)),'sezione Admin in sola lettura, senza Rimuovi');
chk(/<h3 class="alsub">Moderatori<\/h3>/.test(app)&&/id="mmem"/.test(app)&&/Nomina dal socio/.test(app)&&/id="me2"/.test(app)&&/Nomina per email/.test(app),'scelta dal socio registrato e campo email per chi non è iscritto');
chk(/setModeratorMember\(id,true\)/.test(app)&&/staffCard\(x,true\)/.test(app),'nomina dal socio e rimozione per email');
chk(/taken\.has\(m\.id\)/.test(app)&&/m\.userId/.test(app),'il select esclude già nominati e soci senza account');
chk(/user_id is not null and m\.user_id = auth\.uid\(\)/.test(sql),'il ruolo sopravvive al cambio email grazie a user_id');

chk(/\.alstaffp/.test(css)&&/\.alsub/.test(css),'stile nome in evidenza e email sotto');
chk(!/club|ludoteca/i.test(app.split('function staffStato')[1].split('function drawOutBtn')[0]+sql+sb.split('staffRow')[1].split('searchMembers')[0]),'niente «club»/«ludoteca» nel nuovo codice');

console.log(`v41.18-unit: ${ok}/${n} ok`);
if(ok!==n)process.exit(1);
