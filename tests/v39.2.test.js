// node tests/v39.2.test.js — «+» Apri un tavolo (tutti i soci) e riga Instagram allineata
const fs=require('fs');const src=fs.readFileSync(__dirname+'/../app.js','utf8'),css=fs.readFileSync(__dirname+'/../styles.css','utf8');
const grab=n=>{const i=src.indexOf('function '+n+'(');const j=src.indexOf('\n',i);return src.slice(i,j)};
let nt={},f={focus(){f.f=1}};global.$=s=>s==='#nt'?nt:null;global.setTimeout=x=>x();
eval(grab('tFab')+';'+grab('tFabGo')+';global.tFab=tFab;global.tFabGo=tFabGo');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
chk(tFab(null)==='','senza socio collegato: nessun pulsante');
const h=tFab({id:1});chk(/id="tfab"/.test(h)&&/class="gfab"/.test(h)&&/aria-label="Apri un tavolo"/.test(h),'pulsante con stile gfab e aria-label');
chk(!/adminMode/.test(grab('tFab')),'visibile a tutti, non solo staff');
global.window={_agNew(){window.o=1}};tFabGo();chk(window.o===1,'v40.6: il + apre il foglio «Apri un tavolo»');
global.window={};tFabGo();chk(true,'nessun errore senza foglio');
chk(/players:\[\{memberId:h\}\]/.test(src),'chi apre il tavolo è già giocatore');
chk(/\$\{tFab\(/.test(src)&&!/segHtml[^\n]*tFab/.test(src),'render solo nella vista Tavoli');
chk(/\.evc \.igev\{[^}]*padding:0 14px 12px[^}]*font-size:12px/.test(css),'riga Instagram allineata al padding della card');
console.log(`${ok}/${n} ok`);process.exit(ok===n?0:1)
