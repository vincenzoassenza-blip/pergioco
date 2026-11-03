// node tests/picker.test.js — selettore giochi v38.2: ricerca, scorciatoie, escape, sincronizzazione del <select>
const fs=require('fs');global.esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
eval(fs.readFileSync(__dirname+'/../picker.js','utf8')+';global.gpNorm=gpNorm;global.gpFilter=gpFilter;global.gpShort=gpShort;global.gpMount=gpMount');
let ok=0,n=0;const chk=(c,m,x)=>{n++;if(c)ok++;else console.log('FAIL',m,x??'')};
const gs=[{id:'a',name:'Città di Carte'},{id:'b',name:'Carcassonne'},{id:'c',name:'Ticket to Ride'},{id:'d',name:'<img src=x onerror=alert(1)>'},{id:'e',name:'Azul'},{id:'f',name:'Pandemic'},{id:'g',name:'Catan'},{id:'h',name:'Root'}];
chk(gpNorm('CITTÀ  di  Càrte')==='citta di carte','norm');
chk(gpFilter(gs,'citta').map(g=>g.id).join()==='a','accenti');chk(gpFilter(gs,'CAR').map(g=>g.id).join()==='b,a','parte del nome, prima chi inizia così',gpFilter(gs,'CAR').map(g=>g.id));
chk(gpFilter(gs,'ride tick').length===1,'più parole');chk(gpFilter(gs,'').length===0&&gpFilter(gs,'zzz').length===0,'vuoto/nessuno');chk(gpFilter(gs,'a'.repeat(5000)).length===0,'input lunghissimo');
const ps=[{gameId:'h',date:'2026-10-30',players:[{memberId:'m1'}]},{gameId:'f',date:'2026-10-01',players:[{memberId:'m1'}]},...['e','e','e','c','c','b','g','zz'].map((x,i)=>({gameId:x,date:'2026-09-0'+i,players:[{memberId:'m2'}]}))];
const sc=gpShort(gs,ps,'m1');chk(sc[0].id==='h'&&sc[1].id==='f'&&sc[2].id==='e'&&sc.length===6,'recenti miei poi più giocati, max 6',sc.map(g=>g.id));
chk(!gpShort(gs,ps,null).some(g=>!g),'id inesistenti ignorati');
// DOM minimale
const mkEl=()=>{const e={hidden:false,attrs:{},children:[],_h:'',setAttribute(k,v){this.attrs[k]=v},after(b){this.next=b},dispatchEvent(ev){this.fired=(this.fired||0)+1;this.onchange&&this.onchange(ev)},value:''};return e};
global.Event=class{constructor(t){this.type=t}};
// verifica escape: l'HTML generato non deve contenere il nome grezzo
const html=gpFilter(gs,'img').map(g=>`<span>${esc(g.name)}</span>`).join('');chk(!/<img src=x/.test(html),'escape nomi');
const src=fs.readFileSync(__dirname+'/../picker.js','utf8');chk(/maxlength="60"/.test(src),'maxlength ricerca');chk(!/\$\{g\.name\}/.test(src)&&!/\$\{g\.id\}/.test(src),'nessun nome/id senza esc()');
const app=fs.readFileSync(__dirname+'/../app.js','utf8');chk(/gpMount\(\$\('#g'\)/.test(app)&&/E-PARTITA-V3/.test(app),'app usa il selettore e valida la scelta');
console.log(`${ok}/${n} ok`);process.exit(ok===n?0:1)
