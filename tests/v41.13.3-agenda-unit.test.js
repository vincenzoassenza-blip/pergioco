// node tests/v41.13.3-agenda-unit.test.js
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};

const brand=read('brand.js'),idx=read('index.html'),sw=read('sw.js'),app=read('app.js'),css=read('styles.css');

chk(/APP_VERSION='41\.13\.3'/.test(brand),'versione 41.13.3');
chk(/const C='pergioco-v41\.13\.3'/.test(sw)&&/app\.js\?v=41\.13\.3/.test(sw)&&/app\.js\?v=41\.13\.3/.test(idx),'cache sw e app.js ?v=41.13.3');
chk(/styles\.css\?v=41\.13\.3/.test(idx)&&/styles\.css\?v=41\.13\.3/.test(sw)&&/brand\.js\?v=41\.13\.3/.test(idx),'styles e brand ?v=41.13.3');
chk(/class="agtop"/.test(app)&&/class="agtit"/.test(app)&&/-webkit-line-clamp:2/.test(css),'titolo in .agtit con max 2 righe');
chk(/class="agst/.test(app)&&/\.agtop\{[^}]*align-items:flex-start/.test(css)&&/\.agst\{[^}]*text-align:right/.test(css),'posti liberi in alto a destra');
chk(/ttbadge agtipo/.test(app)&&/\.agl2\{[^}]*flex-wrap:nowrap/.test(css),'etichetta tipo nella riga meta');
chk(/class="s agchiudi"/.test(app)&&/Chiudi e registra/.test(app)&&/class="agmore"/.test(app),'Chiudi a vista e pulsante ⋯');
chk(/aria-label="Altre azioni"/.test(app)&&/aria-haspopup="menu"/.test(app),'menu ⋯ accessibile');
chk(/tipiAtt\.length>3/.test(app)&&/Tipo: \$\{esc\(curLab\)\} ▾/.test(app),'tendina Tipo solo oltre 3 tipi');
chk(/#agcal svg/.test(css)&&/<svg viewBox="0 0 24 24"/.test(app),'calendarietto SVG ridotto');
chk(/#agmenu button\{[^}]*text-decoration:none/.test(css)&&/\.agmore\{/.test(css),'menu e ⋯ senza sottolineature');
const i0=app.indexOf('v41.13.3 — scheda'),i1=app.indexOf('async config()');
chk(i0>0&&i1>i0&&!/club|ludoteca/i.test(app.slice(i0,i1)),'niente club/ludoteca nel blocco Agenda v41.13.3');
chk(/if\(!adminMode\(\)\)return/.test(app)&&/if\(!adminMode\(\)\|\|isMod\(\)\)return/.test(app)&&/if\(!\(adminMode\(\)\|\|meM&&meM\.id===t\.hostId\)\)return/.test(app),'azioni staff/host ancora protette da adminMode/ruolo');
chk(/textContent=it\.lab/.test(app)&&/createElement\('div'\)/.test(app)&&/Escape/.test(app)&&/pointerdown/.test(app),'menu costruito con DOM (textContent), chiusura Esc e tap fuori');
chk(/esc\(t\.id\)/.test(app)&&/esc\(g\.name\)/.test(app)&&/esc\(t\.note\)/.test(app)&&/esc\(\(typ\.icona/.test(app),'id, titolo, nota e tipo escapati');
chk(/staff=adminMode\(\)/.test(app)&&/if\(host\|\|staff\)/.test(app),'Chiudi/⋯ solo per organizzatore o staff in modalità admin');
chk(/\.agtf \.chip\{[^}]*font-size:12px/.test(css)&&/min-height:28px/.test(css),'chip filtro più piccoli');
console.log(ok+'/'+n+' controlli');
if(ok!==n)process.exit(1);
