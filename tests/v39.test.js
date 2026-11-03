// node tests/v39.test.js — v39.0: avvisi morbidi, link unici, ordinamento recenti, testi e versioni
const fs=require('fs'),R=f=>fs.readFileSync(__dirname+'/../'+f,'utf8');global.esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const A=R('app.js'),G=R('giochi.js'),X=R('xp.js'),S=R('stats.js'),D=R('desideri.js'),I=R('index.html'),W=R('sw.js'),C=R('styles.css');
let ok=0,n=0;const chk=(c,m,x)=>{n++;if(c)ok++;else console.log('FAIL',m,x??'')};
const grab=(src,re)=>{const m=src.match(re);if(!m)throw new Error('manca '+re);return m[0]};
eval(grab(A,/function playWarn[\s\S]*?return w\}/)+';global.playWarn=playWarn');
eval(grab(A,/const gLink=.*\n/)+grab(A,/const mLink=.*\n/)+';global.gLink=gLink;global.mLink=mLink');
eval(grab(G,/const gLastMine=.*\n/)+';global.gLastMine=gLastMine');
const g={name:'Azul',min:2,max:4},T='2026-10-31';
chk(playWarn(g,3,'2026-10-30',T).length===0,'ok nei limiti');chk(/da 2 a 4/.test(playWarn(g,1,'2026-10-30',T)[0]),'sotto min');chk(/fino a 4/.test(playWarn(g,6,'2026-10-30',T)[0]),'sopra max');
chk(/futuro/.test(playWarn(g,3,'2026-11-02',T)[0]),'futuro');chk(/3 mesi/.test(playWarn(g,3,'2020-04-02',T)[0]),'vecchia');chk(playWarn(g,3,'2026-08-15',T).length===0,'2,5 mesi ok');
chk(playWarn(null,9,'xx',T).length===0,'gioco/data mancanti non bloccano');chk(playWarn({name:'X'},50,T,T).length===0,'senza min/max nessun avviso');
chk(!/<img/.test(gLink('a"b','<img src=x>'))&&/data-gid="a&quot;b"/.test(gLink('a"b','x')),'gLink escape');chk(gLink(null,'<b>')==='&lt;b&gt;','gLink senza id');
chk(/data-pv="m&lt;1"/.test(mLink('m<1','N')),'mLink escape');
const ps=[{gameId:'a',date:'2026-10-01',players:[{memberId:'m1'}]},{gameId:'a',date:'2026-10-20',players:[{memberId:'m1'}]},{gameId:'b',date:'2026-10-25',players:[{memberId:'m2'}]}];
const l=gLastMine(ps,'m1');chk(l.a==='2026-10-20'&&!l.b,'recenti solo mie');chk(Object.keys(gLastMine(ps,null)).length===0,'senza socio');
chk(/'Zombies':'Zombi'/.test(G)&&/'Video Game Theme':'Videogioco'/.test(G),'categorie');chk(!/>Tutt[ie]</.test(G),'Tutto nei menu',G.match(/>Tutt[ie]</));chk(/Giocati più di recente/.test(G),'ordina recenti');
chk(/id="apshow"/.test(A)&&/Mostra password/.test(A),'mostra password');chk(/maxlength="40"/.test(A)&&/gncnt/.test(A),'ospite maxlength');chk(/comprendono anche chi apre/.test(A),'testo posti');
chk(!/<h2>Io<\/h2>/.test(A),'niente card Io');chk(/role="button" tabindex="0"/.test(X)&&/data-pv="\$\{esc\(r\.member_id\)\}" role/.test(X),'riga XP cliccabile');chk(/roc\$\{r\?' rclick'/.test(A),'record cliccabili');
chk(/keydown/.test(A),'tastiera');chk(/data-bdg/.test(A)&&/function bdgPop/.test(A),'popup badge');chk(/des_vota',\{p:id,p_on:true\}/.test(D),'autovoto');
chk(/if\(!adminMode\(\)\)return`<div class="rec"><span>Tavoli organizzati/.test(A),'liste solo staff');chk(/mLink\(x\.id/.test(S)&&/gLink\(d\.id/.test(S),'link in statistiche');
chk(/\.hint\{/.test(C)&&/\.cnt\{/.test(C),'css');chk(/pergioco-v39\.0/.test(W)&&!/\?v=(?!39\.0)\d/.test(I+W),'versioni 39.0');
console.log(ok+'/'+n+' ok');process.exit(ok===n?0:1)
