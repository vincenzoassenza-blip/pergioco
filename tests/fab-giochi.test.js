// node tests/fab-giochi.test.js — il «+» flottante del tab Giochi compare solo con adminMode()
const fs=require('fs');const src=fs.readFileSync(__dirname+'/../giochi.js','utf8');
const grab=n=>{const i=src.indexOf('function '+n+'(');const j=src.indexOf('\nfunction ',i+1);return src.slice(i,j)};
let admin=false;global.adminMode=()=>admin;let el={},q={focus(){q.f=1}};global.$=s=>s==='#gadd'?el:s==='#gbq'?q:null;global.setTimeout=f=>f();
eval(grab('gFab')+';'+grab('gFabGo')+';global.gFab=gFab;global.gFabGo=gFabGo');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
chk(gFab()==='','socio: nessun pulsante');
el={open:false,scrollIntoView(){el.s=1}};gFabGo();chk(!el.open&&!el.s&&!q.f,'socio: gFabGo non fa nulla');
admin=true;const h=gFab();chk(/id="gfab"/.test(h)&&/aria-label="Aggiungi un gioco"/.test(h),'staff: pulsante con aria-label');
gFabGo();chk(el.open&&el.s&&q.f,'staff: apre gadd, scorre, focus #gbq');
chk(/adminMode\(\)\?gAdminForm\(\)\+gFab\(\):''/.test(src),'render condizionato ad adminMode');
console.log(`${ok}/${n} ok`);process.exit(ok===n?0:1)
