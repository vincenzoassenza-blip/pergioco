// node tests/v41.13.2-sondaggi-unit.test.js
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const brand=read('brand.js'),idx=read('index.html'),sw=read('sw.js'),js=read('sondaggi.js'),cm=read('community.js'),css=read('styles.css');
const {APP_VERSION,swCache,hasAsset}=require('./appver');chk(!!APP_VERSION&&swCache()&&hasAsset('sondaggi.js'),'APP_VERSION dal codice + sondaggi in cache');
chk(hasAsset('sondaggi.js'),'sondaggi.js in index e sw');
chk(hasAsset('styles.css'),'styles in index e sw');
chk(/adminMode\(\)/.test(js)&&/has_active/.test(js)&&!/PS\.d&&\(PS\.d\.staff\|\|PS\.d\.has_active\)/.test(js),'tab: adminMode o sondaggio attivo, non più staff||has_active');
chk(/staffUi=\(\)=>!!\(PS\.d&&PS\.d\.staff&&typeof adminMode==='function'&&adminMode\(\)\)/.test(js),'crea/gestisci solo in modalità admin');
chk(/id="psempty"/.test(js)&&/Crea sondaggio/.test(js)&&/#pscrea/.test(js),'stato vuoto con Crea sondaggio (solo staffUi/admin)');
chk(/id="pscrea"/.test(js)&&/#psnew,#pscrea/.test(js),'pulsante vuoto apre il form');
chk(/tab==='sondaggi'&&!showSon/.test(cm)&&/PS\.showTab/.test(cm),'Community nasconde il tab e torna indietro se non visibile');
chk(/#psempty/.test(css),'stile stato vuoto');
chk(!/club|ludoteca/i.test(js),'niente club/ludoteca');
console.log(ok+'/'+n+' controlli');
if(ok!==n)process.exit(1);
