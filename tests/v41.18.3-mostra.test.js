// node tests/v41.18.3-mostra.test.js — incolla password complessa e Mostra password (mobile)
const pw=require('playwright-core'),path=require('path'),http=require('http'),fs=require('fs');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c)ok++;else console.log('FAIL',m)};
const W=ms=>new Promise(r=>setTimeout(r,ms));
const SHOT=process.env.SHOT||'/workspace';
const COMPLEX='G7!pQ#m2$vL9@xR4^wT&uY*3bN';
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2'};
function startServer(){
  return new Promise((resolve,reject)=>{
    const srv=http.createServer((req,res)=>{
      const u=decodeURIComponent((req.url||'/').split('?')[0]);
      let f=path.join(ROOT,u==='/'?'index.html':u.replace(/^\//,''));
      if(!f.startsWith(ROOT)) {res.writeHead(403);return res.end()}
      fs.readFile(f,(e,b)=>{
        if(e){res.writeHead(404);return res.end('not found')}
        res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});
        res.end(b);
      });
    });
    srv.listen(0,'127.0.0.1',()=>resolve(srv));
    srv.on('error',reject);
  });
}

const paste=async(p,sel,text)=>{
  await p.focus(sel);
  await p.evaluate(({sel,text})=>{
    const el=document.querySelector(sel);
    el.focus();
    const ev=new Event('paste',{bubbles:true,cancelable:true});
    Object.defineProperty(ev,'clipboardData',{value:{getData:()=>text}});
    el.dispatchEvent(ev);
  },{sel,text});
};

const clickLabelText=async p=>{
  const lab=p.locator('label.gck').filter({hasText:'Mostra password'});
  const box=await lab.boundingBox();
  if(!box)throw new Error('label.gck assente');
  await p.mouse.click(box.x+Math.min(box.width-12,80), box.y+box.height/2);
};

(async()=>{
  const srv=await startServer();
  const base='http://127.0.0.1:'+srv.address().port+'/';
  const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
  const openAuth=async mode=>{
    const ctx=await b.newContext({
      serviceWorkers:'block',
      viewport:{width:390,height:844},
      deviceScaleFactor:2,
      hasTouch:true,
      isMobile:true,
      locale:'it-IT',
      timezoneId:'Europe/Rome',
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
    const p=await ctx.newPage();
    p.on('pageerror',e=>console.log('ERR',e.message));
    await p.route(/supabase|jsdelivr/,r=>r.abort());
    await p.goto(base,{waitUntil:'domcontentloaded'});
    await W(800);
    await p.evaluate(mode=>{
      document.body.classList.add('gate');
      window._am=mode;
      authForm();
    },mode);
    await W(400);
    return p;
  };

  const checkMode=async(mode,doShot)=>{
    const p=await openAuth(mode);
    const q=f=>p.evaluate(f);
    await paste(p,'#ap',COMPLEX);
    if(mode!=='login')await paste(p,'#ap2',COMPLEX);
    const before=await q(()=>({show:document.getElementById('apshow')?.checked,t:document.getElementById('ap')?.type,v:document.getElementById('ap')?.value,t2:document.getElementById('ap2')?.type||null,v2:document.getElementById('ap2')?.value||null}));
    chk(before.v===COMPLEX&&!before.show&&before.t==='password','['+mode+'] incolla: valore nel campo, ancora nascosta');
    if(mode!=='login')chk(before.v2===COMPLEX&&before.t2==='password','['+mode+'] incolla anche su Ripeti password');
    await clickLabelText(p);
    await W(200);
    const after=await q(()=>({show:document.getElementById('apshow')?.checked,t:document.getElementById('ap')?.type,v:document.getElementById('ap')?.value,t2:document.getElementById('ap2')?.type||null,v2:document.getElementById('ap2')?.value||null}));
    chk(after.show===true&&after.t==='text'&&after.v===COMPLEX,'['+mode+'] tocco su «Mostra password»: #ap visibile, valore intatto');
    if(mode!=='login')chk(after.t2==='text'&&after.v2===COMPLEX,'['+mode+'] anche #ap2 visibile');
    if(doShot){
      await p.screenshot({path:path.join(SHOT,'fix-mostra-password.png'),clip:{x:0,y:0,width:390,height:844}});
    }
    await clickLabelText(p);
    await W(200);
    const hid=await q(()=>({show:document.getElementById('apshow')?.checked,t:document.getElementById('ap')?.type,v:document.getElementById('ap')?.value}));
    chk(hid.show===false&&hid.t==='password'&&hid.v===COMPLEX,'['+mode+'] secondo tocco: torna nascosta, valore intatto');
    await p.context().close();
  };

  await checkMode('signup',true);
  await checkMode('login',false);
  await checkMode('reset',false);

  // Workaround iOS: se assegnare type è ignorato, si clona il campo
  {
    const p=await openAuth('signup');
    await p.evaluate(()=>{
      const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'type');
      Object.defineProperty(HTMLInputElement.prototype,'type',{
        configurable:true,
        get(){return d.get.call(this)},
        set(v){if(this.id==='ap'||this.id==='ap2')return;d.set.call(this,v)}
      });
    });
    await paste(p,'#ap',COMPLEX);
    await paste(p,'#ap2',COMPLEX);
    await clickLabelText(p);
    await W(250);
    const r=await p.evaluate(()=>({t:document.getElementById('ap')?.type,v:document.getElementById('ap')?.value,t2:document.getElementById('ap2')?.type,v2:document.getElementById('ap2')?.value,show:document.getElementById('apshow')?.checked}));
    chk(r.show&&r.t==='text'&&r.v===COMPLEX&&r.t2==='text'&&r.v2===COMPLEX,'clone: anche se type è bloccato, i campi diventano visibili');
    await p.context().close();
  }

  // Profilo: Cambia password
  {
    const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:430,height:900},deviceScaleFactor:2,hasTouch:true,isMobile:true,locale:'it-IT',timezoneId:'Europe/Rome'});
    const p=await ctx.newPage();
    await p.route(/supabase|jsdelivr/,r=>r.abort());
    await p.goto(base,{waitUntil:'domcontentloaded'});
    await W(1000);
    await p.evaluate(()=>{
      document.body.classList.remove('gate');
      admin=true;
      localStorage.setItem('pergioco-mode','admin');
      const ms=[{id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true,userId:'u1'}];
      const gs=[{id:'g1',name:'Catan',min:3,max:4}];
      DB.games=async()=>gs;DB.members=async()=>ms;DB.plays=async()=>[];DB.allTables=async()=>[];DB.legacyNames=async()=>[];DB.hasPin=async()=>true;
      DB.status='online';
      const R=DB.remote||{};R.user=async()=>({id:'u1'});R.isAdmin=async()=>true;R.changePassword=async()=>{};DB.remote=R;
      window._pv=null;go('profilo');
    });
    await W(1500);
    await p.evaluate(()=>{const row=document.getElementById('pwopen');if(row)row.click()});
    await W(400);
    chk(await p.evaluate(()=>!!document.getElementById('pwshow')),'Profilo: checkbox Mostra password presente');
    await paste(p,'#pwnew',COMPLEX);
    await paste(p,'#pwnew2',COMPLEX);
    await clickLabelText(p);
    await W(200);
    const r=await p.evaluate(()=>({show:document.getElementById('pwshow')?.checked,t:document.getElementById('pwnew')?.type,v:document.getElementById('pwnew')?.value,t2:document.getElementById('pwnew2')?.type,v2:document.getElementById('pwnew2')?.value,tc:document.getElementById('pwcur')?.type}));
    chk(r.show&&r.t==='text'&&r.v===COMPLEX&&r.t2==='text'&&r.v2===COMPLEX&&r.tc==='text','Profilo: incolla + Mostra password rivela i tre campi');
    await p.context().close();
  }

  await b.close();
  srv.close();
  console.log(`v41.18.3-mostra: ${ok}/${n} ok`);
  process.exit(ok===n?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
