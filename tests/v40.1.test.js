// node tests/v40.1.test.js — data "oggi" in ora di Roma
const fs=require('fs');let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
const romeToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
const RealDate=Date;const at=iso=>{const t=new RealDate(iso).getTime();global.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[t]))}static now(){return t}}};
at('2026-11-03T23:40:00Z');chk(romeToday()==='2026-11-04','dopo mezzanotte Roma (inverno)');
at('2026-07-01T22:30:00Z');chk(romeToday()==='2026-07-02','dopo mezzanotte Roma (estate)');
at('2026-11-04T22:59:00Z');chk(romeToday()==='2026-11-04','prima di mezzanotte');global.Date=RealDate;
for(const f of['app.js','equilibrio.js','libri.js','ux40.js'])chk(!/new Date\(\)\.toISOString\(\)\.slice\(0,10\)/.test(fs.readFileSync(f,'utf8')),'no UTC today in '+f);
const A=fs.readFileSync('app.js','utf8');chk(/const today=romeToday\(\)/.test(A),'nuova usa romeToday');chk(/^const romeToday=/.test(A),'romeToday globale');
console.log(ok+'/'+n+' ok');process.exit(ok===n?0:1)
