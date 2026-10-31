const pw=require('playwright-core');
(async()=>{for(const url of ['https://vincenzoassenza-blip.github.io/pergioco/','http://localhost:8799/']){
 const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:1440,height:900},permissions:['clipboard-read','clipboard-write']});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));let body=null;
 await p.route(/auth\/v1\/token/,r=>{body=JSON.parse(r.request().postData());r.fulfill({status:400,contentType:'application/json',body:'{"error":"invalid_grant","code":"invalid_credentials","message":"Invalid login credentials"}'})});
 await p.goto(url);await p.waitForSelector('#ae');
 await p.evaluate(()=>navigator.clipboard.writeText('\u200B Test.Fake@Example.COM \r\n'));await p.click('#ae');await p.keyboard.press('Control+V');
 await p.evaluate(()=>navigator.clipboard.writeText('Segreta123'));await p.click('#ap');await p.keyboard.press('Control+V');
 const ev=await p.$eval('#ae',e=>e.value);await p.click('#ago');await p.waitForTimeout(3000);
 const txt=await p.evaluate(()=>document.body.innerText.match(/(Email o password errate|Email non valida|errore imprevisto[^\n]*)/)?.[0]);
 console.log(url,'field=',JSON.stringify(ev),'sent=',body&&body.email,'pwlen=',body&&body.password.length,'msg=',txt,'errors=',errs);await b.close()}})();
