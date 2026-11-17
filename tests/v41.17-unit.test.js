// node tests/v41.17-unit.test.js — regole di accesso, Past President, lucchetto admin
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sql=read('supabase/migrate-v41.17.sql');
const acc=read('accesso.js');
const rc=read('ricompense.js');
const app=read('app.js');
const sb=read('sb.js');
const data=read('data.js');
const brand=read('brand.js');
const sw=read('sw.js');
const idx=read('index.html');

chk(/APP_VERSION='41\.17'/.test(brand)&&/pergioco-v41\.17/.test(sw),'versione 41.17 in brand.js e cache SW');
chk(/accesso\.js\?v=41\.17/.test(idx)&&/accesso\.js\?v=41\.17/.test(sw),'accesso.js pinnato in index e SW');
chk(/styles\.css\?v=41\.17/.test(idx)&&/app\.js\?v=41\.17/.test(idx)&&/ricompense\.js\?v=41\.17/.test(idx),'asset modificati con ?v=41.17');

chk(/function public\.accesso_stato\(/.test(sql)&&/security definer/.test(sql)&&/non_in_regola/.test(sql)&&/blocca_app/.test(sql)&&/blocca_azioni/.test(sql),'RPC accesso_stato security definer con stato del chiamante');
chk(!/libro_soci s[\s\S]{0,40}member_id <>/.test(sql)&&/s\.member_id = m\.id/.test(sql),'accesso_stato usa solo il libro del chiamante');
chk(/function public\.can_read_app\(/.test(sql)&&/is_deactivated_user/.test(sql)&&/as restrictive for all to authenticated/.test(sql),'policy restrittiva can_read_app per utenti disattivati');
chk(/function public\.is_active_member\(/.test(sql)&&/function public\.member_can_act\(/.test(sql)&&/coalesce\(m\.sospeso, false\) is not true/.test(sql),'helper is_active_member e member_can_act escludono i sospesi');
chk(/function public\.require_active_member\(/.test(sql)&&/account è sospeso/.test(sql)&&/tessera associativa/.test(sql),'require_active_member con messaggi per sospeso e disattivato');
chk(/tables_insert[\s\S]*is_active_member/.test(sql)&&/plays_insert_self[\s\S]*is_active_member/.test(sql),'policy tavoli e partite richiedono is_active_member');
chk(/table_seat/.test(sql)&&/poll_vota/.test(sql)&&/des_vota/.test(sql)&&/update_my_profile/.test(sql),'patch RPC di azione (tavoli, voti, profilo)');
chk(/grant execute on function public\.accesso_stato\(\) to authenticated/.test(sql)&&/revoke all on function public\.accesso_stato\(\) from public, anon/.test(sql),'GRANT accesso_stato solo ad authenticated, anon revocato');
chk(/is_staff\(\)/.test(sql)&&/if st then/.test(sql)&&/blocca_app', false/.test(sql),'lo staff è escluso dai blocchi anche in accesso_stato');

chk(/'past-president'/.test(sql)&&/Past President/.test(sql)&&/dado-5-past/.test(sql)&&/, 105/.test(sql),'seed SQL Past President, icona dado-5-past, priorità 105');
chk(/rc_past_president_trg/.test(sql)&&/ricompensa_id = 'presidente'/.test(sql)&&/on conflict \(member_id, ricompensa_id\) do nothing/.test(sql),'trigger permanente su assegnazione Presidente');
chk(/where a\.ricompensa_id = 'presidente'/.test(sql),'backfill Past President per chi ha già Presidente');
chk(/function public\.rc_solo_admin\(/.test(sql)&&/presidente','past-president'/.test(sql)&&/not public\.is_admin\(\)/.test(sql),'rc_solo_admin: Presidente e Past President solo is_admin');
chk(/ricompensa_salva[\s\S]*rc_solo_admin[\s\S]*ricompensa_elimina[\s\S]*rc_solo_admin[\s\S]*ricompensa_assegna[\s\S]*rc_solo_admin/.test(sql),'salva, elimina e assegna bloccati per non admin');
chk(/dado-5-past/.test(sql.split('rc_icona_ok')[1]||''),'allowlist icone include dado-5-past');

chk(fs.existsSync(path.join(root,'img/ricompense/icone/dado-5-past.svg')),'file SVG dado-5-past presente');
const svg=read('img/ricompense/icone/dado-5-past.svg');
chk(/#f2b134/.test(svg)&&/#14254a/.test(svg)&&!/xmlns:xlink/.test(svg),'SVG in blu e oro, originale');

chk(/id:'past-president'/.test(rc)&&/priorita:105/.test(rc)&&/icona:'dado-5-past'/.test(rc)&&RCKeep(rc),'seed JS Past President prio 105');
function RCKeep(s){return /id:'presidente'/.test(s)&&/priorita:110/.test(s)}
chk(/soloAdmin\(id\)/.test(rc)&&/isAdmin\(\)/.test(rc)&&/Solo gli admin/.test(rc)&&/rclck/.test(rc),'UI lucchetto e controlli disabilitati per i non admin');
chk(/dado-5-past/.test(rc),'ICONE include dado-5-past');

chk(/const ACC=/.test(acc)&&/showAvviso/.test(acc)&&/showBlocco/.test(acc)&&/acc-cd/.test(acc),'modulo ACC con avviso e schermata di blocco');
chk(/Puoi proseguire tra/.test(acc)&&/setInterval/.test(acc)&&/n--/.test(acc)&&/btn\.hidden=false/.test(acc),'countdown 5 secondi poi compare Ho capito');
chk(/tessera associativa/.test(acc)&&/contatta lo staff/.test(acc)&&/account è disattivato/.test(acc)&&/account è sospeso/.test(acc),'testi in italiano, tessera e staff, senza dati altrui');
chk(!/club/.test(acc)&&!/ludoteca/.test(acc),'niente «club» o «ludoteca» nei testi nuovi');
chk(/statoAccesso/.test(sb)&&/blocca_app/.test(sb)&&/return 'blocked'/.test(sb),'init controlla accesso_stato prima del refresh');
chk(/DB\.mode==='blocked'/.test(app)&&/ACC\.showBlocco/.test(app)&&/ACC\.dopoAvvio/.test(app),'avvio: schermata disattivato e avviso quota');
chk(/bloccaAzioni/.test(app)&&/blocked/.test(app)&&/data-sd/.test(app),'tavoli: azioni nascoste se sospeso');
chk(/guardAzioni/.test(data)&&/addPlay/.test(data)&&/saveTable/.test(data)&&/seat/.test(data),'data.js blocca le azioni da socio');
chk(/club/.test(acc+rc)===false, 'nessun club in accesso/ricompense');

chk(rc.indexOf("id:'presidente'")<rc.indexOf("id:'past-president'"),'nel seed Presidente resta prima di Past President (prio 110 > 105)');


const css=read('styles.css');
chk(/nav button\.on\{color:#14254a;font-weight:700\}/.test(css)&&/nav button\.on::before\{opacity:1\}/.test(css)&&/#e3e9f7/.test(css),'tab attivo: pillola #e3e9f7 e testo #14254a');
chk(/nav button::before\{[^}]*inset:4px 3px/.test(css)&&/border-radius:14px/.test(css)&&/transition:opacity \.15s/.test(css),'pillola arretrata, arrotondata, transizione breve, senza cambiare padding della barra');
chk(/nav button\{min-height:52px\}/.test(css)&&/padding:8px 0/.test(css),'altezza e padding dei tab invariati');
chk(/aria-current','page'/.test(app)&&/removeAttribute\('aria-current'\)/.test(app),'go() imposta aria-current=page sul tab attivo');
chk(/nav button:hover\{color:var\(--b\);background:none\}/.test(css),'hover desktop non stende uno sfondo a tutta larghezza');

console.log(`v41.17 unit: ${ok}/${n} ok`);
if(ok!==n)process.exit(1);
