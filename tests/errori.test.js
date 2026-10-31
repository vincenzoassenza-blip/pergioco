// node tests/errori.test.js — mappa errori -> codici, contesto, anonimizzazione
const fs=require('fs');global.localStorage={_:{},getItem(k){return this._[k]||null},setItem(k,v){this._[k]=v}};global.document={querySelector:()=>null};global.navigator={onLine:true};global.window={};
global.toast=()=>{};console.warn=()=>{};
eval(fs.readFileSync(__dirname+'/../errori.js','utf8')+';global.errSpiega=errSpiega;global.errPulisci=errPulisci;global.setAz=x=>{ERR_ULTIMA=x}');
const C=[['TypeError: Failed to fetch','PREN','E-PREN-01'],['Invalid login credentials','LOGIN','E-LOGIN-02'],['JWT expired','PARTITA','E-PARTITA-04'],
['new row violates row-level security policy for table "plays"','PARTITA','E-PARTITA-05'],['duplicate key value violates unique constraint "games_pkey"','GIOCO','E-GIOCO-06'],
['new row for relation "eventi" violates check constraint "x"','EVENTO','E-EVENTO-07'],['update or delete on table "games" violates foreign key constraint','GIOCO','E-GIOCO-08'],
['Request rate limit reached','LOGIN','E-LOGIN-09'],['Password should be at least 6 characters','REG','E-REG-10'],['Il tavolo è al completo','PREN','E-PREN-00'],
["QuotaExceededError: Failed to execute 'setItem' on 'Storage'",'APP','E-APP-12'],['NotAllowedError: Write permission denied.','APP','E-APP-13'],
['structuredClone is not defined','APP','E-APP-14'],["Cannot read properties of undefined (reading 'id')",'APP','E-APP-15'],['The operation timed out.','EVENTO','E-EVENTO-16'],
['Unexpected token < in JSON at position 0','BGG','E-BGG-17'],['weird thing x','COPPA',/^E-COPPA-99-[0-9A-F]{4}$/]];
let ok=0,n=0;const chk=(c,m,x)=>{n++;if(c)ok++;else console.log('FAIL',m,x)};
for(const [m,a,exp] of C){const r=errSpiega({message:m},a);chk(exp instanceof RegExp?exp.test(r.code):r.code===exp,m,r.code)}
// contesto: salvataggio partita, errore sconosciuto
window._cur='nuova';setAz({t:Date.now(),tab:'nuova',area:'PARTITA',cosa:'salvare la partita',form:true});
let r=errSpiega('zzz qwerty','APP');chk(/^E-PARTITA-99-/.test(r.code)&&/Non sono riuscito a salvare la partita \(schermata Nuova partita\)/.test(r.msg)&&/ancora qui/.test(r.msg),'ctx-unknown',r);
r=errSpiega('Failed to fetch');chk(r.code==='E-PARTITA-01'&&/salvare la partita/.test(r.msg),'ctx-net',r);
setAz(null);window._cur='serata';r=errSpiega('zzz');chk(/nella schermata Serata/.test(r.msg)&&/^E-EVENTO-99/.test(r.code),'ctx-tab-only',r);
const p=errPulisci('mario.rossi@gmail.com eyJabc.def.ghi 123e4567-e89b-12d3-a456-426614174000 RSSMRA80A01H501U sb_secret_abcdefghijkl');
chk(!/@|eyJ|RSSMRA|sb_secret|426614/.test(p),'privacy',p);console.log(`${ok}/${n} ok`);process.exit(ok===n?0:1)
