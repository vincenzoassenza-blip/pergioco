// node tests/v41.13.1-header-unit.test.js
const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};

const brand=read('brand.js'),idx=read('index.html'),sw=read('sw.js'),js=read('header.js'),css=read('styles.css'),app=read('app.js');

const {APP_VERSION,swCache,hasAsset}=require('./appver');chk(!!APP_VERSION&&swCache()&&hasAsset('header.js'),'APP_VERSION dal codice + header in cache');
chk(hasAsset('header.js'),'header.js in index e sw');
chk(hasAsset('styles.css'),'styles in index e sw');
chk(hasAsset('app.js')&&hasAsset('brand.js'),'app.js e brand.js in index e sw');
chk(!/innerHTML|insertAdjacentHTML|outerHTML/.test(js),'header.js: nessun HTML iniettato');
chk(!/club|ludoteca/i.test(js),'header.js: niente club/ludoteca');
chk(/b\.hidden=true/.test(app)&&/#modebtn\{display:none!important\}/.test(css),'pulsante modalità rimosso dalla barra');
chk(js.includes('Passa a modalità admin')&&js.includes('Passa a modalità utente')&&js.includes('Profilo ▸')&&js.includes('Esci'),'voci del menu');
chk(/aria-haspopup/.test(js)&&/role','menu'/.test(js)&&/Escape/.test(js)&&/pointerdown/.test(js),'popover accessibile, chiusura Esc e tap fuori');
chk(/hav\.adm::after/.test(css)&&/content:"🛡️"/.test(css),'bollino admin oro con scudo');
chk(/\.hav\{[^}]*width:36px;height:36px/.test(css)&&/aspect-ratio:1/.test(css)&&/flex-shrink:0/.test(css)&&/object-fit:cover/.test(css)&&/border-radius:50%/.test(css),'avatar cerchio: misure fisse, aspect-ratio, flex-shrink, cover');
chk(/text-overflow:ellipsis/.test(css)&&/header \.sub/.test(css),'sottotitolo con ellissi');
chk(/data-hav/.test(js)&&/#havmenu \[role=menuitem\]/.test(css)&&/text-decoration:none/.test(css),'righe menu cliccabili senza sottolineatura');
console.log(ok+'/'+n+' controlli');
if(ok!==n)process.exit(1);
