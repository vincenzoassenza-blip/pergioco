// node tests/v41.14.3-host-miepartite-unit.test.js — blocco leave del creatore + filtri «Le mie partite»
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};

const app=read('app.js'),data=read('data.js'),sql=read('supabase/migrate-v41.14.3.sql');
const idx=read('index.html'),sw=read('sw.js'),brand=read('brand.js');

chk(/seduto&&!\(host&&!staff\)/.test(app),'UI: Lascia il posto nascosto al creatore non staff');
chk(/data-cancel="\$\{esc\(t.id\)\}"/.test(app)&&/Annulla tavolo/.test(app),'UI: Annulla tavolo nel menu del creatore');
chk(/host&&!staff\?`<button type="button" data-cancel/.test(app),'Annulla solo per il socio creatore, non per lo staff');
chk(!/Hai aperto tu questo tavolo/.test(app),'rimosso il dialogo che permetteva al creatore di lasciare');
chk(/Non puoi lasciare il tavolo che hai aperto: annullalo/.test(app),'toast se il creatore prova comunque a lasciare');
chk(/DB\.cancelTable/.test(app),'Annulla chiama DB.cancelTable');
chk(/\[data-cancel\]/.test(app)&&/data-agmore/.test(app),'Annulla è nel menu ⋯');

chk(/Non puoi lasciare il tavolo che hai aperto: annullalo/.test(data),'data.js: leave locale del creatore bloccato');
chk(/rpc\('table_cancel'/.test(data)&&/async cancelTable/.test(data),'data.js: cancelTable via RPC table_cancel');

chk(/p_action='join'/.test(sql)&&/not public.is_staff\(\)/.test(sql),'migrazione: table_seat blocca leave del creatore non staff');
chk(/function public.tables_host_guard/.test(sql)&&/x->>'memberId'=new.host_id/.test(sql),'migrazione: host_guard tiene il creatore tra i giocatori');
chk(/function public.table_cancel/.test(sql)&&/Puoi annullare solo il tavolo che hai aperto/.test(sql),'migrazione: RPC table_cancel solo per l\'host su tavolo aperto');
chk(/policy tables_host_delete/.test(sql)&&/coalesce\(status,'open'\)='open'/.test(sql),'migrazione: RLS delete per l\'host sul tavolo aperto');
chk(/is_staff\(\) then return new/.test(sql),'host_guard: staff invariato');

chk(/mie-partite\.js\?v=/.test(idx)&&sw.includes((idx.match(/mie-partite\.js\?v=([\d.]+)/)||[])[0]),'mie-partite.js in index e cache SW, stesso pin');
chk(require('./appver').APP_VERSION==='41.14.3'&&require('./appver').swCache()&&/mie-partite\.js\?v=41\.14\.3/.test(idx)&&/mie-partite\.js\?v=41\.14\.3/.test(sw),'APP_VERSION 41.14.3 e cache SW/?v= allineate');
chk(!/club|ludoteca/i.test(read('mie-partite.js')),'testi senza club/ludoteca');

function _gdr(p){return !!(p&&(p.playKind==='gdr'||p.typeId==='gdr'))}
function _board(p){return !!(p&&p.gameId&&p.playKind!=='gdr'&&p.typeId!=='gdr')}
function _pf(){return Promise.resolve()}
const sandbox={views:{profilo:_pf},console,isGdrPlay:_gdr,isBoardGamePlay:_board};
sandbox.window=sandbox;
sandbox.document={getElementById:()=>null};
vm.runInNewContext(read('mie-partite.js'),sandbox);
const MP=sandbox.MP;
chk(!!MP&&MP.PAGE===20,'MP esposto, pagina da 20');
chk(MP.periodRange('all','2026-11-11')===null,'periodo Tutto: nessun intervallo');
chk(String(MP.periodRange('1m','2026-11-11'))==='2026-10-11,2026-11-11','ultimo mese');
chk(String(MP.periodRange('y','2026-11-11'))==='2026-01-01,2026-11-11','anno corrente');

const plays=[
  {id:'p1',date:'2026-11-10',gameId:'catan',playKind:'board',typeId:'board',coop:false,players:[{memberId:'me',score:'11',winner:true},{memberId:'al',score:'9',winner:false}]},
  {id:'p2',date:'2026-09-01',gameId:'azul',playKind:'board',typeId:'board',coop:false,players:[{memberId:'me',score:'4',winner:false},{memberId:'al',score:'8',winner:true}]},
  {id:'p3',date:'2026-11-05',playKind:'gdr',typeId:'gdr',gameName:'D&D 5e',gdr:{avventura:'Rovine',sessione:'campagna',sessione_n:2,esito:'in_corso',masterMemberId:'me'},players:[{memberId:'me',character:'Master'},{memberId:'al',character:'Thorn',score:'99'}]},
  {id:'p4',date:'2026-11-08',playKind:'war',typeId:'war',versione:'40k 10e',gameName:'Warhammer',players:[{memberId:'al'}]},
  {id:'p5',date:'2026-11-01',gameId:'catan',playKind:'board',typeId:'board',sfidaId:'s1',coop:false,players:[{memberId:'me',winner:true,score:'12'},{memberId:'al',score:'5'}]}
];
const all=MP.filterPlays(plays,'me','all','all','2026-11-11');
chk(all.length===4&&all[0].id==='p1'&&!all.some(x=>x.id==='p4'),'filtro: solo le mie, più recenti prima, niente partite altrui');
chk(MP.filterPlays(plays,'me','1m','all','2026-11-11').every(p=>p.date>='2026-10-11')&&MP.filterPlays(plays,'me','1m','all','2026-11-11').length===3,'filtro periodo ultimo mese');
chk(MP.filterPlays(plays,'me','all','gdr','2026-11-11').map(p=>p.id).join()==='p3','filtro tipo GDR');
const xp=MP.playXp(plays[0],'me',plays.slice().reverse());
chk(xp.total>=15&&xp.parts.some(x=>x.l==='Partita'&&x.n===10)&&xp.parts.some(x=>x.l==='Vittoria'),'EXP: partita + vittoria');
const xp5=MP.playXp(plays[4],'me',[{...plays[0]},plays[4]]);
chk(xp5.parts.some(x=>x.l==='Sfida')&&xp5.total>=25,'EXP: sfida vinta (senza gioco nuovo se Catan già giocato)');
chk(MP.esitoMine(plays[2],plays[2].players[0])==='In corso','esito GDR in corso');
chk(MP.playTypeId(plays[2])==='gdr'&&MP.playTypeId(plays[3])==='war','tipo GDR / Warhammer');

console.log(`v41.14.3-host-miepartite-unit: ${ok}/${n}`);
process.exit(ok===n?0:1);
