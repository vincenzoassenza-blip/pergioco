// node tests/anteprima-ui-sondaggi-desideri-sfida-unit.test.js
const fs=require('fs'),path=require('path');const R=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const s=R('sondaggi.js'),d=R('desideri.js'),cm=R('community.js'),css=R('styles.css'),eq=R('equilibrio.js'),tt=R('tavoli-tipi.js');
chk(/\$\{inner\?help:`<h2/.test(s),'tendina sondaggio: niente secondo titolo/chip quando è dentro la scheda');
chk(/\$\{inner\?\(p\.can_see\?'':/.test(s),'risultati in tendina: niente titolo ripetuto');
chk(/<h2 style="margin-top:0">\$\{esc\(p\.title\)\}<\/h2>\$\{help\}\$\{meta\(p\)\}/.test(s),'vista a pagina intera mantiene titolo e chip');
chk(/row dsbtns/.test(d)&&/row dsbtns/.test(cm),'Scadenza/Chiudi ora nella riga dsbtns (desideri e community)');
chk(/\.dsbtns button\{margin:0;width:auto;flex:1 1 0;min-height:44px\}/.test(css),'pulsanti con stesso margine, larghezza e altezza');
chk(/pergioco-sfida-bozza/.test(eq)&&/EQD\.put\(ed\)/.test(eq),'sfida: bozza salvata in localStorage prima di aprire Partita');
chk(/TTL:2\*864e5/.test(eq)&&/SFID\(d\.sfidaId\)/.test(eq),'bozza valida 2 giorni e con id sfida controllato');
chk(/p\.sfidaId===d\.sfidaId\)EQD\.clear\(\)/.test(eq),'bozza cancellata quando la partita della sfida è salvata');
chk(/id="eqdgo"/.test(eq)&&/id="eqdno"/.test(eq),'Partita mostra Riprendi / Scarta');
chk(/📅 Crea tavolo/.test(eq)&&/EQT\.book\(b\.dataset\.book,st\.ids\)/.test(eq),'Crea tavolo passa gioco e partecipanti');
chk(/window\._agPrefill=null/.test(tt),'prefill consumato una volta sola');
chk(/players:\[\{memberId:h\}\]/.test(tt),'il creatore è sempre seduto');
chk(/if\(pf&&staff&&t\.kind==='board'&&pfIds\.length\)/.test(tt),'solo lo staff siede direttamente gli altri partecipanti');
chk(!/club|ludoteca/i.test(eq.slice(eq.indexOf('anteprima — Sfida'))),'niente club/ludoteca nei testi nuovi');
console.log(`anteprima-ui: ${ok}/${n}`);if(ok!==n)process.exit(1);
