// Solo Node, nessun browser/rete/DB. Dati illustrativi.
const fs=require('fs'),vm=require('vm'),assert=require('assert');let n=0;
const app=fs.readFileSync(__dirname+'/../app.js','utf8'),css=fs.readFileSync(__dirname+'/../styles.css','utf8');
const code=app.slice(app.indexOf('function gestionePlaysFilter('),app.indexOf('const PF_K='));const ctx={};vm.createContext(ctx);vm.runInContext(code,ctx);
const P=[{id:'c',date:'2026-11-08',gameId:'g1',players:[{memberId:'m1'}]},{id:'a',date:'2026-11-01',gameId:'g1',players:[{memberId:'m2'}]},{id:'b',date:'2026-10-01',gameId:'g2',players:[{memberId:'m1'}]},{id:'d',date:'2025-01-01',gameId:'g1',players:[{memberId:'m1'}]}];
const f=x=>ctx.gestionePlaysFilter(P,{period:'all',...x},'2026-11-08').map(p=>p.id).join(',');
function check(c,m){assert.ok(c,m);n++}
check(f({})==='c,a,b,d','recenti prima');check(f({game:'g1'})==='c,a,d','gioco');check(f({member:'m1'})==='c,b,d','socio');check(f({game:'g1',member:'m1'})==='c,d','AND');
check(f({period:'month'})==='c,a','ultimo mese');check(f({period:'year'})==='c,a,b','anno');check(f({period:'custom',from:'2026-11-01',to:'2026-11-08'})==='c,a','limiti inclusivi');check(f({period:'custom',from:'2026-11-01',to:'2026-11-01',member:'m2',game:'g1'})==='a','tutti combinati');
check(f({period:'custom',from:'2026-11-08',to:'2026-11-01'})==='','date invertite: nessun risultato');check(f({member:'m9'})==='','nessun risultato');check(P[0].id==='c'&&P[1].id==='a','nessuna mutazione');
check(css.includes('.alsch[hidden]{display:none}'),'soci: hidden esplicito');check(css.includes('.gp .gpt{font-size:13px'),'collisione gpt risolta');check(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'griglia comprimibile');check(css.includes('.gpg .gpc{width:100%;min-width:0;max-width:640px}'),'contenitore viewport');
check(fs.readFileSync(__dirname+'/../stats.js','utf8').includes("gpc.querySelector(':scope > .row')"),'ancora diretta');check(app.includes("if(!adminMode()||isMod())return;const l=gestionePlaysFilter"),'guard admin/mod');check(app.includes('esc(memberName(m))'),'nomi escaped nei filtri');check(app.includes("x.memberId?'" )===false||app.includes('gpnames'),'risultati minimali');
const labels=fs.readFileSync(__dirname+'/../brand.js','utf8');check(['gp_period','gp_member','gp_all','gp_range','gp_from','gp_to'].every(k=>labels.includes(k)),'etichette configurabili');
console.log(`${n}/${n}`);
