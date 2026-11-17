#!/usr/bin/env node
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let n=0,ok=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};

const mig=read('supabase/migrate-v41.16.sql');
const data=read('data.js'),app=read('app.js'),xp=read('xp.js'),libri=read('libri.js'),altro=read('altro.js');
const rc=read('ricompense.js'),sb=read('sb.js'),hdr=read('header.js'),css=read('styles.css');
const {APP_VERSION,swCache,hasAsset}=require('./appver');

chk(APP_VERSION==='41.16'&&swCache()&&hasAsset('ricompense.js')&&hasAsset('data.js')&&hasAsset('app.js'),'APP_VERSION 41.16, cache SW e asset allineati');
chk(/grant execute on function public\.ricompense_stato\(\) to authenticated/.test(mig)
  &&/revoke all on function public\.ricompense_stato\(\) from public, anon/.test(mig)
  &&/revoke all on function public\.ricompensa_salva\(jsonb\) from public, anon/.test(mig)
  &&/grant execute on function public\.ricompensa_salva\(jsonb\) to authenticated/.test(mig)
  &&/revoke all on function public\.staff_socio_sospeso/.test(mig)
  &&/grant execute on function public\.staff_socio_sospeso/.test(mig),'GRANT solo authenticated, revoke anon/public sulle RPC');
chk(/revoke all on table public\.ricompense from public, anon, authenticated/.test(mig)
  &&/revoke all on table public\.socio_ricompense from public, anon, authenticated/.test(mig)
  &&/enable row level security/.test(mig),'tabelle ricompense: RLS, nessun GRANT diretto');
chk(/grant select \(sospeso\) on public\.members/.test(mig)
  &&/revoke insert \(sospeso, sospeso_nota, sospeso_dal, sospeso_rientro\)/.test(mig)
  &&/staff_soci_sospesi/.test(mig),'sospeso visibile, nota solo via RPC staff');
chk(!/alter table public\.(plays|games|game_meta)/.test(mig)&&!/create or replace function public\.member_xp/.test(mig),'migrazione non altera plays/games/game_meta né member_xp');
chk(/rc_icona_ok|rc_avatar_ok|rc_colore_ok/.test(mig)&&/Avatar non sbloccato/.test(mig),'allowlist icone/avatar/colori e blocco avatar non sbloccato');
chk(/pioniere-2026/.test(mig)&&/socio-fondatore/.test(mig)&&/escludi.:\[.socio-fondatore/.test(mig),'seed Fondatore, Pioniere 2026 (esclusi i fondatori), Tester');
chk(!/club|ludoteca/i.test(mig+rc+altro+css),'niente club/ludoteca nei testi nuovi');

chk(/function socioAttivo|const socioAttivo=/.test(data)&&/sospeso/.test(data),'socioAttivo in data.js');
chk(/mostWins\(gameId,plays/.test(data)&&/wins>=min/.test(data),'Stats.mostWins');
chk(/Più vittorie/.test(app)&&/Stats\.mostWins/.test(app),'scheda gioco: riga Più vittorie');
chk(/sospeso\?'sospeso'/.test(app)&&/data-son/.test(app)&&/askSospeso/.test(app),'Gestione: Sospendi / Riattiva');
chk(/STAFF_VIEWS=\[.*ricompense/.test(app)&&/go\('ricompense'\)/.test(app),'vista staff Ricompense');
chk(/sospesi/.test(altro)&&/Filtro soci/.test(altro),'filtro Sospesi in Gestione');
chk(/sospeso\)\.map\(m=>m\.id\)/.test(libri)&&/member_id&&sosp\.has/.test(libri),'avviso quote: esclusi i sospesi');
chk(/_skip=new Set\(ms\.filter/.test(app)&&/socioAttivo/.test(xp),'classifiche del periodo senza i sospesi');
chk(/sospeso/.test(sb)&&/RC\.nameHtml/.test(xp)&&/RC\.avSlug/.test(hdr),'sb, nomi e header agganciati alle ricompense');
chk(/\.rcico/.test(css)&&/width:20px/.test(css)&&/\.rctit/.test(css)&&/\.rcbg-navy-gold/.test(css),'CSS icona 20px, titolo, sfondi');

const sandbox={console,Date,String,Math,Object,Array,Set,Map,JSON,Number,parseInt,isNaN,Infinity,isFinite,
  localStorage:{_s:{},getItem(k){return this._s[k]||null},setItem(k,v){this._s[k]=String(v)},removeItem(k){delete this._s[k]}},
  document:{addEventListener(){},querySelector(){return null},createElement(){return{}}},
  window:{},esc:s=>String(s).replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]))
};
sandbox.window=sandbox;sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(data+'\nthis.isGdrPlay=isGdrPlay;this.isBoardGamePlay=isBoardGamePlay;this.Stats=Stats;this.socioAttivo=socioAttivo;this.memberName=memberName;',sandbox,{filename:'data.js'});
vm.runInContext(rc+'\nthis.RC=RC;',sandbox,{filename:'ricompense.js'});
const {Stats,socioAttivo,RC}=sandbox;

const ms=[
  {id:'m1',nome:'Anna',cognome:'Verdi',active:true},
  {id:'m2',nome:'Bruno',cognome:'Neri',active:true},
  {id:'m3',nome:'Carla',cognome:'Gialli',active:true,sospeso:true},
  {id:'m4',nome:'Dario',cognome:'Blu',active:false}
];
chk(socioAttivo(ms[0])&&socioAttivo(ms[1])&&!socioAttivo(ms[2])&&!socioAttivo(ms[3]),'socioAttivo: esclusi sospesi e disattivati');

const plays=[
  {id:'p1',gameId:'catan',date:'2026-10-01',coop:false,players:[{memberId:'m1',winner:true,score:'11'},{memberId:'m2',winner:false,score:'7'}]},
  {id:'p2',gameId:'catan',date:'2026-10-08',coop:false,players:[{memberId:'m1',winner:true,score:'10'},{memberId:'m2',winner:false,score:'8'}]},
  {id:'p3',gameId:'catan',date:'2026-10-15',coop:false,players:[{memberId:'m2',winner:true,score:'12'},{memberId:'m1',winner:false,score:'6'}]},
  {id:'p4',gameId:'azul',date:'2026-10-02',coop:false,players:[{memberId:'m2',winner:true,score:'80'},{memberId:'m3',winner:false,score:'70'}]},
  {id:'p5',gameId:'gdr1',date:'2026-10-03',playKind:'gdr',typeId:'gdr',gameId:'gdr1',players:[{memberId:'m1',winner:true},{memberId:'m2',winner:false}]}
];
const wC=Stats.mostWins('catan',plays,ms,2);
chk(wC.length===1&&wC[0].memberId==='m1'&&wC[0].wins===2,'Catan: Anna 2 vittorie (Bruno ne ha 1, non compare)');
chk(Stats.mostWins('azul',plays,ms,2).length===0,'Azul: una sola vittoria, riga assente');
chk(Stats.mostWins('gdr1',plays,ms,2).length===0,'GDR: nessuna riga Più vittorie');

const tiePlays=plays.concat([
  {id:'p6',gameId:'catan',date:'2026-10-22',coop:false,players:[{memberId:'m2',winner:true,score:'9'},{memberId:'m1',winner:false,score:'5'}]}
]);
const tie=Stats.mostWins('catan',tiePlays,ms,2);
chk(tie.length===2&&tie.every(x=>x.wins===2)&&tie.map(x=>x.memberId).sort().join(',')==='m1,m2','a parità si mostrano entrambi');

// ricompense: stack e priorità / scelta
RC.data=RC.norm({catalogo:RC.seed().catalogo,assegnate:[
  {member_id:'m1',ricompensa_id:'socio-fondatore'},
  {member_id:'m1',ricompensa_id:'tester'}
],scelte:[]});
const e=RC.effetti('m1');
chk(e.titolo==='Socio fondatore'&&e.icona==='socio-fondatore-b'&&e.colore==='#c4921a','a parità di tipo vince la priorità staff (fondatore)');
chk(e.avatar.includes('custode-arco')&&e.avatar.includes('inventore'),'avatar di tipi diversi (fondatore+tester) si sommano');
RC.data.scelte=[{member_id:'m1',tipo:'titolo',ricompensa_id:'tester'}];
chk(RC.effetti('m1').titolo==='Tester','la scelta del socio batte la priorità');
chk(RC.icoSrc('tester')==='img/ricompense/icone/tester.svg'&&!RC.icoSrc('../x')&&!RC.icoSrc('foo')&&!RC.avSrc('javascript:alert(1)'),'src solo da allowlist');
const html=RC.nameHtml(ms[0],sandbox.esc('Anna Verdi'));
chk(/rcico/.test(html)&&/tester\.svg/.test(html)===false&&/socio-fondatore-b\.svg/.test(html),'icona nel nome, file consentito');
chk(!RC.titleHtml(ms[0]).includes('<')||/rctit/.test(RC.titleHtml(ms[0])),'titolo escapato nel markup');

console.log(`v41.16 unit: ${ok}/${n} ok`);
if(ok!==n)process.exit(1);
