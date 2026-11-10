// node tests/v41.13.1-header-unit.test.js
const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};

const brand=read('brand.js'),idx=read('index.html'),sw=read('sw.js'),js=read('header.js'),css=read('styles.css'),app=read('app.js');

chk(/APP_VERSION='41\.13\.1'/.test(brand),'versione 41.13.1');
chk(/pergioco-v41\.13\.1/.test(sw)&&/header\.js\?v=41\.13\.1/.test(sw)&&/header\.js\?v=41\.13\.1/.test(idx),'cache sw e header.js ?v=41.13.1');
chk(/styles\.css\?v=41\.13\.1/.test(idx)&&/styles\.css\?v=41\.13\.1/.test(sw),'styles ?v=41.13.1');
chk(/app\.js\?v=41\.13\.1/.test(idx)&&/brand\.js\?v=41\.13\.1/.test(idx),'app.js e brand.js ?v=41.13.1');
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
