// node tests/screenshots-giochi.js — v41.8 Giochi: socio/staff, con e senza tavoli oggi
const pw=require('playwright-core');const{setup}=require('./screenshots-profilo.js');const OUT=process.env.OUT||'/workspace/pergioco-mockups/ux/';
const gio=async(b,role,mode,h)=>{const p=await setup(b,role,h);await p.evaluate(mode=>{const td=romeToday(),d=n=>{const x=new Date(td+'T12:00');x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
 const T={oggi:[{id:'a',date:td,status:'open',seats:4,gameId:'g1',hostId:'m2',players:[{memberId:'m2'},{memberId:'m3'}]},{id:'b',date:td,status:'open',seats:5,gameId:'g4',hostId:'m4',players:[{memberId:'m4'},{memberId:'m1'},{name:'<b>X</b>'}]},{id:'c',date:td,status:'closed',seats:4,gameId:'g2',hostId:'m2',players:[]}],
  prossimo:[{id:'d',date:d(3),status:'open',seats:4,gameId:'g1',hostId:'m2',players:[{memberId:'m2'}]},{id:'e',date:d(7),status:'open',seats:4,gameId:'g2',hostId:'m2',players:[]}],nessuno:[]};
 window._TS=T[mode];DB.allTables=async()=>window._TS;if(typeof drawModeBtn==='function')drawModeBtn();go('ludoteca')},mode);await p.waitForTimeout(1500);return p};
module.exports={gio};
if(require.main===module)(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
 for(const role of['socio','staff'])for(const [m,f] of [['oggi','tavoli-oggi'],['prossimo','senza-tavoli']]){const p=await gio(b,role,m,900);await p.screenshot({path:OUT+`v41.8-giochi-${role}-${f}.png`,clip:{x:0,y:0,width:430,height:900}});await p.context().close()}
 await b.close();console.log('ok')})();
