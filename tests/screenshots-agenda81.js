// node tests/screenshots-agenda81.js — v41.8.1 Agenda: Oggi e un altro giorno toccato
const pw=require('playwright-core');const{gio}=require('./screenshots-giochi.js');
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});const p=await gio(b,'socio','oggi',900);
 await p.evaluate(()=>{const x=new Date(romeToday()+'T12:00');x.setDate(x.getDate()+2);_TS.push({id:'f',date:x.toISOString().slice(0,10),status:'open',seats:4,gameId:'g5',hostId:'m2',players:[{memberId:'m2'}]});window._ser=null;go('serata')});await p.waitForTimeout(1500);
 await p.screenshot({path:'/workspace/pergioco-mockups/ux/v41.8.1-agenda-oggi.png'});const d=await p.$$('.agdays [data-d]');await d[1].click();await p.waitForTimeout(500);
 await p.screenshot({path:'/workspace/pergioco-mockups/ux/v41.8.1-agenda-altro-giorno.png'});await b.close();console.log('ok')})();
