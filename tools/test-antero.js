// test della base antero: node tools/test-antero.js
const vm=require('vm'),fs=require('fs');const ctx={matchMedia:()=>({matches:false})};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname+'/../antero.js','utf8')+';this.ANT=ANT',ctx);const ANT=ctx.ANT;
const t=[[0,'zero'],[1,'1'],[2,'2'],[3,'antero-2'],[4,'antero-1'],[5,'antero'],[6,'antero e 1'],[10,'2 anteri'],[11,'2 anteri e 1'],[21,'4 anteri e 1'],[24,'4 anteri e antero-1'],[25,'1 antero²'],[30,'1 antero² e antero'],[2026,'3 antero⁴, 1 antero³, 1 antero² e 1']];
let ko=0;for(const[n,e]of t){const r=ANT.num(n);if(r!==e){ko++;console.log('FAIL',n,r,'atteso',e)}}
// ricostruzione numerica 0..5000
const back=s=>{if(s==='zero')return 0;const W={'1':1,'2':2,'antero-2':3,'antero-1':4,'antero':5};let v=0;for(let p of s.split(/, | e /)){let m;if(m=p.match(/^(\d) antero([²³⁴⁵⁶⁷⁸⁹])$/))v+=+m[1]*5**('  ²³⁴⁵⁶⁷⁸⁹'.indexOf(m[2]));else if(m=p.match(/^(\d) anteri$/))v+=5*m[1];else if(p==='antero'&&s!=='antero'&&p!==s.split(/, | e /).slice(-1)[0])v+=5;else v+=W[p]}return v};
for(let n=0;n<=5000;n++)if(back(ANT.num(n))!==n){ko++;console.log('FAIL roundtrip',n,ANT.num(n));break}
const L=[{id:1,nome:'Aste'}];const c=(x)=>JSON.stringify(ANT.checkNome(x,L));
const v=[['  Aste ','err'],['aste','err'],['antero','antero'],[' Antero ','antero'],['<b>x</b>','err'],['x'.repeat(41),'err'],['','err'],['Roll & Write','ok']];
for(const[x,k]of v)if(!c(x).includes('"'+k+'"')){ko++;console.log('FAIL nome',x,c(x))}
console.log(ANT.data('2026-10-30'));console.log(ko?ko+' errori':'Tutti i test OK');process.exit(ko?1:0);
