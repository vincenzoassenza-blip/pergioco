// node tests/v41.18.3-mostra-unit.test.js — tasto Mostra password in registrazione, accesso, reset e Profilo
const {APP_VERSION,swCache,hasAsset,read}=require('./appver');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
const app=read('app.js'),css=read('styles.css');

chk(!!APP_VERSION&&swCache(),'APP_VERSION in brand.js allineata alla cache SW');
chk(hasAsset('app.js')&&hasAsset('styles.css')&&hasAsset('brand.js'),'asset modificati pinnati in index e SW');
chk(/function revealPw\(el,show\)/.test(app)&&/el\.cloneNode\(false\)/.test(app),'revealPw clona il campo se il type non cambia');
chk(/function bindPwShow\(cb,ids\)/.test(app)&&/addEventListener\('change'/.test(app)&&/addEventListener\('click'/.test(app),'bindPwShow ascolta change e click sulla label');
chk(/bindPwShow\(\$\('#apshow'\),\['ap','ap2'\]\)/.test(app),'accesso/registrazione/reset usano bindPwShow');
chk(/bindPwShow\(cb,\['pwcur','pwnew','pwnew2'\]\)/.test(app),'Cambia password in Profilo usa bindPwShow');
chk(!/\.onchange=e=>\['#ap','#ap2'\]/.test(app)&&!/cb\.onchange=\(\)=>\['pwcur'/.test(app),'niente vecchio onchange che cambia solo i.type');
chk(/for="apshow"/.test(app)&&/<input id="ap"[\s\S]*?<input id="ap2"[\s\S]*?id="apshow"/.test(app),'Mostra password è dopo entrambi i campi, con for=');
chk(/\.gck\{[^}]*min-height:44px[^}]*cursor:pointer/.test(css)&&/\.gck input\{[^}]*width:20px/.test(css),'area di tocco della label .gck almeno 44px');
console.log(`v41.18.3-mostra-unit: ${ok}/${n} ok`);
process.exit(ok===n?0:1);
