// node tests/v41.13.2-sondaggi-unit.test.js
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const brand=read('brand.js'),idx=read('index.html'),sw=read('sw.js'),js=read('sondaggi.js'),cm=read('community.js'),css=read('styles.css');
chk(/APP_VERSION='41\.1[3-9](\.[0-9]+)?'/.test(brand),'versione 41.13+');
chk(/const C='pergioco-v41\.1[3-9](\.[0-9]+)?'/.test(sw)&&/sondaggi\.js\?v=41\.13/.test(sw)&&/sondaggi\.js\?v=41\.13/.test(idx),'cache 41.13+ e sondaggi.js');
chk(/styles\.css\?v=41\.1[3-9]/.test(idx)&&/styles\.css\?v=41\.1[3-9]/.test(sw),'styles ?v=41.13+');
chk(/adminMode\(\)/.test(js)&&/has_active/.test(js)&&!/PS\.d&&\(PS\.d\.staff\|\|PS\.d\.has_active\)/.test(js),'tab: adminMode o sondaggio attivo, non più staff||has_active');
chk(/staffUi=\(\)=>!!\(PS\.d&&PS\.d\.staff&&typeof adminMode==='function'&&adminMode\(\)\)/.test(js),'crea/gestisci solo in modalità admin');
chk(/id="psempty"/.test(js)&&/Crea sondaggio/.test(js)&&/#pscrea/.test(js),'stato vuoto con Crea sondaggio (solo staffUi/admin)');
chk(/id="pscrea"/.test(js)&&/#psnew,#pscrea/.test(js),'pulsante vuoto apre il form');
chk(/tab==='sondaggi'&&!showSon/.test(cm)&&/PS\.showTab/.test(cm),'Community nasconde il tab e torna indietro se non visibile');
chk(/#psempty/.test(css),'stile stato vuoto');
chk(!/club|ludoteca/i.test(js),'niente club/ludoteca');
console.log(ok+'/'+n+' controlli');
if(ok!==n)process.exit(1);
