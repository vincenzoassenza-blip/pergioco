const fs=require('fs');global.localStorage={_:{},getItem(k){return this._[k]||null},setItem(k,v){this._[k]=v}};global.document={querySelector:()=>null};global.navigator={onLine:true};
const out=[];global.toast=(t)=>out.push(t);console.warn=()=>{};
eval(fs.readFileSync(__dirname+'/../errori.js','utf8')+';global.errSpiega=errSpiega;global.errPulisci=errPulisci');
const C=[['TypeError: Failed to fetch','PREN','E-PREN-01'],['Invalid login credentials','LOGIN','E-LOGIN-02'],['JWT expired','PARTITA','E-PARTITA-04'],
['new row violates row-level security policy for table "plays"','PARTITA','E-PARTITA-05'],['duplicate key value violates unique constraint "games_pkey"','GIOCO','E-GIOCO-06'],
['new row for relation "eventi" violates check constraint "x"','EVENTO','E-EVENTO-07'],['update or delete on table "games" violates foreign key constraint','GIOCO','E-GIOCO-08'],
['Request rate limit reached','LOGIN','E-LOGIN-09'],['Password should be at least 6 characters','REG','E-REG-10'],['Il tavolo è al completo','PREN','E-PREN-00'],['weird thing x','COPPA',/^E-COPPA-99-[0-9A-F]{4}$/]];
let ok=0;for(const [m,a,exp] of C){const r=errSpiega({message:m},a);const pass=exp instanceof RegExp?exp.test(r.code):r.code===exp;if(!pass)console.log('FAIL',m,r.code);else ok++}
const p=errPulisci('mario.rossi@gmail.com eyJabc.def.ghi 123e4567-e89b-12d3-a456-426614174000 RSSMRA80A01H501U sb_secret_abcdefghijkl');
const priv=!/@|eyJ|RSSMRA|sb_secret|426614/.test(p);console.log(`${ok}/${C.length} mapping ok, privacy ${priv?'ok':'FAIL'}: ${p}`);process.exit(ok===C.length&&priv?0:1)
