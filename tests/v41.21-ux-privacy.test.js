// node tests/v41.21-ux-privacy.test.js — ritocchi UX e informativa privacy (testo sorgente + una schermata)
const fs=require('fs'),path=require('path'),pw=require('playwright-core');
const {APP_VERSION,swCache,hasAsset}=require('./appver');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0,ok=0;const chk=(c,m,x)=>{n++;if(c)ok++;else console.error('FAIL',m,x??'')}

chk(APP_VERSION==='41.21'&&swCache()&&hasAsset('app.js')&&hasAsset('privacy.js')&&hasAsset('styles.css'),'APP_VERSION 41.21 e cache SW allineata');

const app=read('app.js'),priv=read('privacy.js'),gio=read('giochi.js'),ev=read('eventi.js'),tt=read('tavoli-tipi.js'),so=read('sondaggi.js'),xp=read('xp.js'),css=read('styles.css'),br=read('brand.js'),sql=read('supabase/migrate-v41.21.sql'),al=read('altro.js');

chk(/type="email"/.test(app)&&/inputmode="email"/.test(app)&&/id="ae" type="email"/.test(app),'campi email con type=email e inputmode');
chk(/time24Html\(/.test(app)&&/dateTime24Html\(/.test(app)&&/hourCycle:'h23'/.test(app),'helper ora 24h e hourCycle h23');
chk(!/type="time"/.test(app+ev+tt+so)&&!/datetime-local/.test(app+ev+tt+so),'nessun type=time o datetime-local rimasto');
chk(/dateTime24Html\('ev-inizio'/.test(ev)&&/time24Html\('tt'/.test(tt)&&/dateTime24Html\('pschiude'/.test(so),'eventi, tavoli e sondaggi usano i selettori 24h');
chk(/staff dell\\'associazione/.test(app)||/staff dell'associazione/.test(app),'codice di registrazione: testo generico dello staff');
chk(/priv-ok/.test(app)&&/Ho letto e accetto l'informativa privacy/.test(app)&&/PRIV\.checkReg/.test(app)&&/accettaDopoSignup/.test(app),'casella privacy obbligatoria alla registrazione');
chk(/PRIV\.dopoAvvio/.test(app)&&/mostraBlocco/.test(priv)&&/priv-lock/.test(priv)&&/window\.go=async function/.test(priv),'blocco al primo accesso e go() intercettato');
chk(/rpc\('privacy_accept'\)/.test(priv)&&/rpc\('privacy_status'\)/.test(priv)&&/rpc\('privacy_testo'\)/.test(priv),'client: solo RPC, niente insert diretto');
chk(/gm_gdt:'Giochi da tavolo'/.test(br),'testo predefinito Giochi da tavolo');
chk(/Livello \$\{r\.level\}/.test(xp)&&/esperienza/.test(xp),'XP e livello spiegati nella scheda');
chk(/id="pth" hidden/.test(app),'titolo Pannello admin nascosto di default');
chk(/ospiti compresi/.test(app)&&!/ospiti inclusi/.test(app),'frase Agenda con singolare\/plurale e ospiti compresi');
chk(/Nessun tavolo stasera: apri tu il primo/.test(app)&&/class="p agnew"/.test(app),'Agenda vuota con pulsante');
chk(/na\?'<p class="muted">Nessun gioco corrisponde ai filtri/.test(gio)&&/Nessun gioco in elenco/.test(gio),'Giochi: messaggio filtri solo se i filtri ci sono');
chk(/Soci più attivi/.test(app)&&/attiviHtml/.test(app),'Community: soci più attivi senza ricerca');
chk(/--m:#4a5263/.test(css)&&/button\.s\{background:#d4dcec/.test(css),'contrasto pulsanti e grigio più scuro');
chk(/overflow-wrap:anywhere/.test(css)&&/\.roh\{font-weight:700;white-space:normal/.test(css),'nomi lunghi nei Record vanno a capo');
chk(/class="s gpchg"/.test(read('picker.js')),'pulsante Cambia allineato agli altri secondari');
chk(/create table if not exists public\.privacy_consents/.test(sql)&&/security definer/.test(sql)&&/auth\.uid\(\)/.test(sql),'SQL: tabella e RPC SECURITY DEFINER con auth.uid');
chk(/grant execute on function public\.privacy_accept\(\) to authenticated/.test(sql)&&/revoke all on function public\.privacy_accept\(\) from public, anon/.test(sql),'SQL: GRANT solo authenticated, anon revocato su privacy_accept');
chk(/grant execute on function public\.privacy_testo\(\) to anon, authenticated/.test(sql),'SQL: privacy_testo leggibile anche da anon (solo testo, niente dati personali)');
chk(/perform public\.require_privacy_ok/.test(sql)&&/privacy_consenso_ins/.test(sql),'SQL: controllo server sulle RPC e sulla RLS di scrittura');
chk(/viene ignorato/.test(sql)&&!/ver := nullif\(btrim\(coalesce\(p_version/.test(sql),'SQL: versione informativa assegnata solo dal server');
chk(/'admin_set_moderator'/.test(sql)&&/'admin_set_moderator_member'/.test(sql),'SQL: anche le RPC dei moderatori controllano l\'accettazione');
chk(/el.inert=true/.test(priv)&&/el.inert=false/.test(priv),'blocco: inert sul resto della pagina');
chk(/current_setting\('pergioco\.privacy_write'/.test(sql)&&/is_admin\(\)/.test(sql),'SQL: testo modificabile solo dagli admin tramite RPC');
chk(!/\bclub\b/i.test(priv.split('TESTO_DEF:')[1]||'')&&!/\bludoteca\b/i.test(priv.split('TESTO_DEF:')[1]||''),'nessun «club» o «ludoteca» nel testo dell\'informativa');

(async()=>{
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
  const c=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844},locale:'en-US'});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8799/',{waitUntil:'networkidle'});await p.waitForTimeout(2000);
  const r=await p.evaluate(()=>{
    const ae=document.querySelector('#ae');
    const typ=ae?ae.getAttribute('type'):null,im=ae?ae.getAttribute('inputmode'):null,ac=ae?ae.getAttribute('autocomplete'):null;
    const t24=typeof time24Html==='function'?time24Html('t', '21:00', true):'';
    const hasSel=/<select id="t-h"/.test(t24)&&/<option value="21" selected>/.test(t24);
    const gdt=typeof TXT!=='undefined'&&TXT.g?TXT.g('gm_gdt'):'';
    return {typ,im,ac,hasSel,gdt,hasPriv:typeof PRIV!=='undefined',escOk:typeof PRIV!=='undefined'&&!/<img/.test(PRIV._esc('<img src=x>'))};
  });
  chk(r.typ==='email'&&r.im==='email'&&r.ac==='username','login: campo email con tastiera email');
  chk(r.hasSel,'selettore 24h produce ore e minuti');
  chk(r.gdt==='Giochi da tavolo','etichetta Giochi da tavolo in pagina');
  chk(r.hasPriv&&r.escOk,'PRIV presente e testo escapato');
  chk(!errs.length,'nessun errore in pagina: '+(errs[0]||''));
  await b.close();
  console.log(`v41.21-ux-privacy: ${ok}/${n} ok`);
  process.exit(ok===n?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
