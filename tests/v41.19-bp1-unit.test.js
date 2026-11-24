// node tests/v41.19-bp1-unit.test.js — Superadmin e correzioni soci (test only)
const fs=require('fs'),path=require('path'),vm=require('vm');
const {APP_VERSION,swCache,hasAsset}=require('./appver');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0,ok=0;const chk=(c,m)=>{n++;if(c)ok++;else console.error('FAIL',m)}

chk((String(APP_VERSION).startsWith('41.19')||String(APP_VERSION).startsWith('41.20'))&&swCache()&&hasAsset('app.js')&&hasAsset('data.js')&&hasAsset('sb.js')&&hasAsset('libri.js'),'APP_VERSION 41.19+/41.20 e cache SW allineata');

const app=read('app.js'),data=read('data.js'),sb=read('sb.js'),libri=read('libri.js'),pf=read('profilo.js'),sql=read('supabase/migrate-v41.19.sql');

chk(/function romeEveningDate\(/.test(app)&&/function nameTokens\(/.test(app)&&/function isSuperadmin\(/.test(app),'helper romeEveningDate, nameTokens, isSuperadmin');
chk(app.includes("oggi=romeEveningDate()")&&app.includes('gestionePlaysFilter(ps,{...af,game:gf},romeEveningDate())')&&/today\|\|romeEveningDate\(\)/.test(app),'storico, serata e playWarn usano romeEveningDate');
chk(app.includes("download='pergioco-backup-'+romeToday()+'.json'"),'export backup resta sul calendario (romeToday)');
chk(/Registrazione d\\?'emergenza/.test(app)&&/prima che entri nel libro soci/.test(app),'registrazione d\'emergenza in UI');
chk(/data-del=/.test(app)&&/admin_member_remove/.test(sb),'elimina socio solo via RPC admin');
chk(/Nomina admin/.test(app)&&/superadmin/.test(app)&&/setAdminMember/.test(sb)&&/is_superadmin/.test(sb),'UI e client Superadmin');
chk(/Ha spiegato il gioco/.test(app)&&/explained_member_id/.test(sb)&&/explainedMemberId/.test(sb),'campo spiegato partita');
chk(/collegato a /.test(app)&&/da collegare/.test(app),'stati codici collegato/da collegare');
chk(/soci attivi/.test(app)&&/soci nel libro \(con tessera\)/.test(app),'contatore soci attivi e soci nel libro con tessera');
chk(/residenzaHtml/.test(app)&&/staff_member_residenza/.test(app),'residenza dal libro soci');

chk(/exp1/.test(data)&&/Primo insegnante/.test(data)&&/Maestro di regole/.test(data)&&/Professore/.test(data)&&/Spiega-tutto/.test(data),'4 badge spiegazione in BADGES');
chk(/explainedDistinct/.test(data)&&/explained:ok.length/.test(data),'Badges.stats explained/explainedDistinct con anti-abuso');
chk(!/ricompens/.test(data.slice(data.indexOf("['exp1'"),data.indexOf("['expg10'")+80)),'badge spiegazione non sono ricompense');

chk(/alter table public.admins add column if not exists super/.test(sql)&&/is_superadmin\(\)/.test(sql)&&/admin_set_admin\(/.test(sql)&&/Deve restare almeno un superadmin/.test(sql)&&/Non puoi toglierti da solo/.test(sql),'SQL superadmin e guardie');
chk(/revoke insert, update, delete on public.admins from authenticated/.test(sql),'REVOKE write su admins');
chk(/next_tessera\(\)/.test(sql)&&/members_tessera_uidx/.test(sql)&&/members_mod_insert/.test(sql),'tessera unica e automatica');
chk(/admin_member_remove_info/.test(sql)&&/plays_explained_trg/.test(sql)&&/member_name_key/.test(sql)&&/staff_member_residenza/.test(sql),'SQL elimina, spiegato, nomi, residenza');
chk(/expn>=1/.test(sql)&&/expdg>=10/.test(sql),'member_xp_base include i badge spiegazione');
chk(/grant execute on function public.admin_set_admin/.test(sql)&&/revoke all on function public.admin_set_admin/.test(sql),'RPC solo authenticated');

chk(/nameKey=/.test(libri)&&/const omonimi=/.test(libri),'abbinamento libro tollerante');
chk(libri.includes('om.length===1')&&libri.includes("LB.save('libro_soci'"),'unione automatica se match univoco al caricamento');

// runtime helpers
const ctx={Intl,Date,String,Math};
vm.createContext(ctx);
vm.runInContext(app.slice(app.indexOf('const romeToday='),app.indexOf('document.addEventListener')),ctx);
const ev=ctx.romeEveningDate, nt=ctx.nameTokens, nn=ctx.nameNorm;

// 24/11/2026 07:30 Europe/Rome (UTC+1) = 06:30Z → serata del 23
chk(ev(new Date('2026-11-24T06:30:00Z'))==='2026-11-23','prima delle 08:00 Roma la serata è il giorno prima');
// 08:00 Roma = 07:00Z
chk(ev(new Date('2026-11-24T07:00:00Z'))==='2026-11-24','dalle 08:00 Roma è il giorno di calendario');
chk(ev(new Date('2026-11-24T22:00:00Z'))==='2026-11-24','sera stessa data');
chk(nt('Maria Giovanna','Rossi')===nt('Rossi','Maria Giovanna'),'token bag: ordine invertito');
chk(nt('José','García')===nt('Jose','Garcia'),'senza accenti');
chk(nt('Giovanni','Rossi')!==nt('Giovanni','Rossi Bianchi'),'nomi parziali non coincidono');

chk(!/\bclub\b/i.test(sql)&&!/\bludoteca\b/i.test(sql),'nessun «club» o «ludoteca» nella migrazione');


const sql2=fs.existsSync(path.join(root,'supabase/migrate-v41.19.1.sql'))?read('supabase/migrate-v41.19.1.sql'):'';
chk(/libro_soci_assign_tessera/.test(sql2)&&/returning tessera into/.test(sql2),'v41.19.1: tessera del socio torna sul libro');
chk(/Solo soci non ancora collegati/.test(libri)&&/const linkable=/.test(libri)&&/next_tessera/.test(libri),'libro: tendina solo soci da collegare e tessera precompilata');
chk(/Cerca socio per nome/.test(app)&&/Può anche non essere al tavolo/.test(app),'spiegato: ricerca per nome, anche fuori dal tavolo');
chk(/Spiegazioni/.test(app)&&/Giochi spiegati/.test(app)&&/explainedDistinct/.test(data),'statistiche personali: spiegazioni e giochi spiegati');
chk(/stg pfexpl/.test(pf)&&/Spiegazioni/.test(pf)&&/V\.querySelector\('#st33'\)/.test(pf),'profilo: spiegazioni in griglia secondaria, riga tolta solo se c\'è #st33');
chk(!/ng.append\(tile\(ctx.exp/.test(pf),'profilo: spiegazioni non mescolate alle 6 tessere del mockup');
chk(!/deve essere uno dei giocatori/.test(sql2),'SQL: niente vincolo explainer tra i giocatori');
chk(!/p\.explainedMemberId===mid&&\(p\.players/.test(data),'client: spiegazioni conteggiate anche fuori dal tavolo');
chk(!/\bclub\b/i.test(sql2)&&!/\bludoteca\b/i.test(sql2),'nessun «club» o «ludoteca» nella migrazione 41.19.1');

console.log(`v41.19-bp1-unit: ${ok}/${n} ok`);
if(ok<n)process.exit(1);
