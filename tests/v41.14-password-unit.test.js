// node tests/v41.14-password-unit.test.js — validazione e changePassword (senza stampare password)
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};

const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
chk(/const PW_MIN=8/.test(app)&&/neu\.length<PW_MIN/.test(app),'PW_MIN = 8, usata nella validazione');
const m=app.match(/function pwChangeVal\(cur,neu,neu2\)\{[\s\S]*?\n\}/);
chk(!!m,'pwChangeVal presente in app.js');
const ctx={pwChangeVal:null};vm.runInNewContext('const PW_MIN=8;'+m[0]+';this.pwChangeVal=pwChangeVal',ctx);
const {pwChangeVal}=ctx;
chk(typeof pwChangeVal==='function','pwChangeVal eseguibile');
chk(/const PW_MIN=8/.test(app),'PW_MIN = 8, come «Password dimenticata»');
const reset=app.includes("pw.length<8")&&app.includes('La password deve avere almeno 8 caratteri');
chk(reset,'il recupero password usa la stessa soglia e lo stesso messaggio');

const cases=[
  ['','nuovaok1','nuovaok1','E-PWD-V1','Inserisci la password attuale'],
  ['attuale1','','','E-PWD-V2','Inserisci la nuova password'],
  ['attuale1','corta','corta','E-PWD-V3','La password deve avere almeno 8 caratteri'],
  ['attuale1','nuovaok1','nuovaok2','E-PWD-V4','Le due password non coincidono: riscrivile uguali'],
  ['stessaok1','stessaok1','stessaok1','E-PWD-V5','La nuova password deve essere diversa da quella attuale'],
];
for(const [a,b,c,code,msg] of cases){
  const r=pwChangeVal(a,b,c);
  chk(!r.ok&&r.code===code&&r.msg===msg,code);
}
chk(pwChangeVal('attuale1','nuovaok1','nuovaok1').ok===true,'dati validi: ok');

const sb=fs.readFileSync(path.join(ROOT,'sb.js'),'utf8');
chk(/async changePassword\(cur,neu\)/.test(sb)&&/signInWithPassword/.test(sb)&&/updateUser\(\{password:neu\}\)/.test(sb),'sb.js: verifica accesso, poi updateUser({password})');
chk(!/console\.(log|info|debug|warn|error)\([^)]*cur|console\.(log|info|debug|warn|error)\([^)]*neu/.test(sb.split('changePassword')[1].split('async signOut')[0]),'changePassword non scrive le password nei log');

async function runChange(user,signRes,updRes,cur,neu){
  const calls=[];
  const self={
    async user(){return user},
    client:{auth:{
      async signInWithPassword(o){calls.push(['in',Object.keys(o).sort().join(',')]);return signRes},
      async updateUser(o){calls.push(['up',Object.keys(o).join(',')]);return updRes}
    }}
  };
  const body=sb.split('async changePassword(cur,neu){')[1].split('async signOut')[0].replace(/\},\s*$/,'');
  const fn=vm.runInNewContext('async function changePassword(cur,neu){'+body+'}\nchangePassword',{});
  let err=null;try{await fn.call(self,cur,neu)}catch(e){err=e}
  return {err,calls};
}

(async()=>{
  let r=await runChange({email:'socio@example.com'},{error:null},{error:null},'x','y');
  chk(!r.err&&r.calls.join('|')==='in,email,password|up,password','ordine: signIn poi updateUser; chiavi ok, niente valori in calls labels');
  r=await runChange({email:'socio@example.com'},{error:{message:'Invalid login credentials'}},{error:null},'x','y');
  chk(r.err&&r.err.message==='La password attuale non è corretta'&&!r.calls.some(c=>c[0]==='up'),'password attuale errata: messaggio italiano, niente updateUser');
  r=await runChange(null,{error:null},{error:null},'x','y');
  chk(r.err&&r.err.code==='E-PWD-V6'&&/email/.test(r.err.message),'senza email: E-PWD-V6');
  const src=fs.readFileSync(path.join(ROOT,'app.js'),'utf8')+fs.readFileSync(path.join(ROOT,'profilo.js'),'utf8');
  chk(/pwProfilo\(V\)/.test(fs.readFileSync(path.join(ROOT,'profilo.js'),'utf8')),'profilo.js richiama pwProfilo dopo il riordino');
  chk(/textContent/.test(src)&&!/#pwerr.*innerHTML/.test(src),'testi del modulo via textContent');
  console.log(ok+'/'+n+' controlli');
  process.exit(ok===n?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
