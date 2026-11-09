#!/usr/bin/env node
const fs=require('fs');const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let n=0,ok=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/.*$/gm,'$1');
const coll=read('supabase/functions/bgg-collection/index.ts');
const shared=read('supabase/functions/_shared/bgg.ts');
const imp=read('import-bgg.js');
const brand=read('brand.js');
const giochi=read('giochi.js');
const des=read('desideri.js');
const cons=read('consigliere.js');
const cm=read('community.js');
const mig=read('supabase/migrate-v41.10.2.sql');

chk(/mode === "user"/.test(coll)&&/xmlapi2\/user\?name=/.test(coll),'bgg-collection mode user → XML API2 user');
chk(/parseUser/.test(shared)&&/avatarOk/.test(shared),'shared parseUser + avatarOk');
chk(/cf\.geekdo-static\.com/.test(shared),'avatar consente geekdo-static');
chk(/is_admin/.test(coll),'collection resta solo admin');
chk(/bgg_api_cache/.test(coll)&&/user:/.test(coll),'cache key user:');
chk(/UDEB=600/.test(imp)&&/UMIN=3/.test(imp)&&/UMAX=50/.test(imp),'debounce 600 / min 3 / max 50');
chk(/mode:'user'/.test(imp)&&/viaUserCheck/.test(imp)&&/viaUserMissing/.test(imp),'UI verifica username');
chk(/ibggchip/.test(imp)&&/pushRecent/.test(imp)&&/bgg_recent_users/.test(imp),'chip recenti + app_settings');
chk(/ibgg_viaUserCheck/.test(brand)&&/ibgg_viaUserMissing/.test(brand)&&/ibgg_viaUserRecent/.test(brand),'testi configurabili nuovi');
chk(/APP_VERSION='41\.10\.2'/.test(brand),'APP_VERSION 41.10.2');
chk(/bgg_recent_users_valid/.test(mig)&&/ibgg_viaUserCheck/.test(mig),'migrazione recenti + testi');
chk(!/club|ludoteca/i.test(imp.match(/viaUserCheck:.*?viaUserRemove:[^,]+/)?.[0]||''),'nuovi testi senza club/ludoteca');
chk(/function bggPwrHtml/.test(brand),'helper logo condiviso');
chk(/bggPwrHtml/.test(giochi)&&/id="ga"/.test(giochi),'logo in Aggiungi gioco');
chk(/bggPwrHtml/.test(giochi)&&/Apri la pagina BGG/.test(giochi),'logo in scheda gioco (se BGG)');
chk(/bggPwrHtml/.test(des),'logo in Desideri');
chk(/bggPwrHtml/.test(cm),'logo in Community/Desideri');
chk(/bggPwrHtml/.test(cons),'logo in Consigliere risultati');
chk(/powered-by-bgg\.png/.test(imp),'logo già in import BGG');
chk(!/api\.geekdo\.com/.test(strip(coll))&&!/wikidata/.test(strip(coll)),'collection senza scraping');

// parseUser unit
const parseUserSrc=shared;
chk(/id vuoto = utente assente|!id\) return \{ found: false/.test(parseUserSrc),'id vuoto → not found');

console.log(`\n${ok}/${n} controlli`);
if(ok!==n)process.exit(1);
