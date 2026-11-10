#!/usr/bin/env node
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let n=0,ok=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};

const mig=read('supabase/migrate-v41.12.sql');
const brand=read('brand.js');
const data=read('data.js');
const app=read('app.js');
const rec=read('gdr-rec.js');
const xp=read('xp.js');
const idx=read('index.html');
const sw=read('sw.js');

const {APP_VERSION,swCache,hasAsset,cssBlock}=require('./appver');chk(!!APP_VERSION&&swCache()&&hasAsset('gdr-rec.js'),'APP_VERSION dal codice + asset gdr-rec');
chk(/gdr_rec_valid/.test(mig)&&/key='gdr_rec'/.test(mig)&&/app_settings_gdr_rec_chk/.test(mig),'migrazione gdr_rec + vincolo');
chk(/revoke all on function public\.gdr_rec_valid/.test(mig)&&/grant execute[\s\S]*authenticated/.test(mig),'GRANT solo authenticated, revoke anon/public');
chk(!/alter table public\.(plays|games|game_meta)/.test(mig)&&!/create or replace function public\.member_xp/.test(mig),'migrazione non altera plays/games/game_meta né member_xp');
chk(/isGdrPlay/.test(data)&&/isBoardGamePlay/.test(data)&&/!isGdrPlay\(p\)&&x\.winner/.test(data),'esclusione GDR da vittorie overall');
chk(/mine\.filter\(isBoardGamePlay\)/.test(data)&&/!isGdrPlay\(p\)&&!p\.coop&&!isGdrPlay\(p\)/.test(data)+/filter\(p=>p\.gameId===g\.id&&!p\.coop&&!isGdrPlay/.test(data),'esclusione GDR da giochi diversi e record punteggio');
chk(/filter\(p=>p\.gameId===g\.id&&!p\.coop&&!isGdrPlay/.test(data)&&/mine\.filter\(isBoardGamePlay\)/.test(data),'Stats.records + Badges.distinct senza GDR');
chk(/ps\.filter\(board\)/.test(xp)&&/if\(gdr\(p\)\)return/.test(xp),'RA: gioco più giocato / vittorie senza sessioni GDR');
chk(/GDRB\.formHtml/.test(app)&&/GDRB\.save/.test(app)&&/adminMode\(\)\|\|isMod\(\)/.test(app),'config in Gestione (admin) + salvataggio');
chk(/text-decoration:none/.test(cssBlock('v41.12'))&&/gdrln/.test(read('styles.css')),'righe GDR senza sottolineatura');
chk(/Campagne concluse/.test(rec)&&/avventura\+sistema|a\+'\|'\+s|a\+['"]\|['"]\+s/.test(rec),'campagne per avventura+sistema');
chk(/masterId\(p\)===id/.test(rec)&&/character/.test(rec),'master solo socio + personaggi');
chk(!/club|ludoteca/i.test(rec),'niente club/ludoteca nei testi nuovi');

const sandbox={console,Date,String,Math,Object,Array,Set,Map,JSON,Number,parseInt,isNaN,Infinity,
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},
  document:{addEventListener(){}},window:{},
  sc:undefined
};
sandbox.window=sandbox;
sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(data+'\nthis.isGdrPlay=isGdrPlay;this.isBoardGamePlay=isBoardGamePlay;this.Stats=Stats;this.Badges=Badges;this.setWinners=setWinners;',sandbox,{filename:'data.js'});
vm.runInContext(rec+'\nthis.GDRB=GDRB;',sandbox,{filename:'gdr-rec.js'});

const {isGdrPlay,isBoardGamePlay,Stats,Badges,GDRB,setWinners}=sandbox;
const ms=[{id:'m1',nome:'Vincenzo',cognome:'Assenza',active:true},{id:'m2',nome:'Giulia',cognome:'Rossi',active:true},{id:'m3',nome:'Marco',cognome:'Bianchi',active:true}];
const gdr=(o)=>({playKind:'gdr',typeId:'gdr',gameId:null,coop:true,players:[],gdr:{},...o});
const plays=[
  gdr({id:'g1',date:'2026-09-10',gameName:'Last Sabbath',bggRpgId:402323,duration:180,gdr:{sistema:'Last Sabbath',bggRpgId:402323,masterMemberId:'m1',sessione:'one-shot',esito:'conclusa'},players:[{memberId:'m1',character:'Selene'},{memberId:'m2',character:'Ivy'}]}),
  gdr({id:'g2',date:'2026-09-24',gameName:'Last Sabbath',bggRpgId:402323,duration:120,gdr:{sistema:'Last Sabbath',bggRpgId:402323,masterMemberId:'m1',avventura:'Il sabba eterno',sessione:'campagna',esito:'in_corso'},players:[{memberId:'m1',character:'Selene'},{memberId:'m2',character:'Ivy'},{memberId:'m3',character:'Luca'}]}),
  gdr({id:'g3',date:'2026-10-08',gameName:'Last Sabbath',bggRpgId:402323,duration:150,gdr:{sistema:'Last Sabbath',bggRpgId:402323,masterMemberId:'m1',avventura:'Il sabba eterno',sessione:'campagna',esito:'conclusa'},players:[{memberId:'m1',character:'Selene'},{memberId:'m2',character:'Ivy'}]}),
  gdr({id:'g4',date:'2026-10-15',gameName:'Dungeons & Dragons (5th Edition)',bggRpgId:450,duration:240,gdr:{sistema:'Dungeons & Dragons (5th Edition)',bggRpgId:450,masterMemberId:'m1',avventura:'Rovine di Shadowfell',sessione:'campagna',esito:'in_corso'},players:[{memberId:'m1',character:'Dungeon Master'},{memberId:'m3',character:'Thorn'}]}),
  gdr({id:'g5',date:'2026-10-29',gameName:'Dungeons & Dragons (5th Edition)',bggRpgId:450,duration:180,gdr:{sistema:'Dungeons & Dragons (5th Edition)',bggRpgId:450,masterMemberId:'m1',avventura:'Rovine di Shadowfell',sessione:'campagna',esito:'conclusa'},players:[{memberId:'m1',character:'Dungeon Master'},{memberId:'m3',character:'Thorn'}]}),
  gdr({id:'g6',date:'2026-11-05',gameName:'Call of Cthulhu',bggRpgId:533,duration:90,gdr:{sistema:'Call of Cthulhu',bggRpgId:533,masterMemberId:'m1',avventura:'Il richiamo',sessione:'one-shot',esito:'conclusa'},players:[{memberId:'m1',character:'Custode'},{memberId:'m2',character:'Elia'}]}),
  {id:'b1',date:'2026-10-01',gameId:'catan',playKind:'board',coop:false,players:[{memberId:'m2',winner:true,score:'11'},{memberId:'m1',winner:false,score:'7'}]},
  gdr({id:'bad',date:'2026-10-02',gameId:'catan',duration:999,gameName:'Last Sabbath',gdr:{sistema:'Last Sabbath',sessione:'one-shot',esito:'conclusa',masterMemberId:'m2',masterName:'Ospite Master'},players:[{memberId:'m2',winner:true,score:'99',character:'Hack'}]})
];
setWinners(plays[7]);

chk(isGdrPlay(plays[0])&&!isBoardGamePlay(plays[0])&&isBoardGamePlay(plays[6])&&isGdrPlay(plays[7]),'isGdrPlay / isBoardGamePlay');
chk(plays[7].players[0].winner===false,'setWinners azzera vincitore GDR anche con score');

const O=Stats.overall(plays,ms);
chk(O.wins&&O.wins.who.id==='m2'&&O.wins.value===1,'Più vittorie ignora GDR (resta 1 di Catan)');
chk(O.distinct&&O.distinct.value===1,'Più giochi diversi: solo Catan, non i sistemi GDR');
const recs=Stats.records([{id:'catan',name:'Catan'}],plays);
chk(recs.length===1&&recs[0].best.score===11&&recs[0].best.p.memberId==='m2','Recordman / punteggio: 11 di Catan, ignora 99 GDR');

const s1=GDRB.memberStats('m1',plays);
chk(s1.sessioni===6&&s1.ore===16&&s1.sistemi===3&&s1.master===6,'m1: 6 sessioni, 16 ore, 3 sistemi, 6 da master');
chk(s1.campagne===2&&s1.mese===3&&s1.meseKey==='2026-10'&&s1.oneshot===2&&s1.pg===3,'m1: 2 campagne (avventura+sistema), 3 in ottobre, 2 one-shot, 3 PG');
const s2=GDRB.memberStats('m2',plays);
chk(s2.sessioni===5&&s2.campagne===1&&s2.master===1&&s2.sistemi===2,'m2: 5 sessioni (incluso bad), 1 campagna, 1 master socio (bad), 2 sistemi');
// master a testo libero senza memberId non conta
const guest=gdr({id:'gx',date:'2026-11-06',gameName:'X',gdr:{sistema:'X',masterName:'Anna Master',sessione:'one-shot',esito:'conclusa'},players:[{guest:true,name:'Anna Master'},{memberId:'m3'}]});
chk(GDRB.memberStats('m3',plays.concat([guest])).master===0,'master a testo libero senza socio: nessun credit master');

const R=GDRB.records(plays.filter(p=>p.id!=='bad'),ms);
chk(R.sessioni.who.id==='m1'&&R.sessioni.value===6&&R.ore.value===16&&R.campagne.value===2,'record: sessioni/ore/campagne a m1');
chk(R.mese.value===3&&R.mese.meseKey==='2026-10'&&/ottobre 2026/.test(GDRB.meseLab(R.mese.meseKey)),'record mese: 3 sessioni · ottobre 2026');

GDRB.v=GDRB.norm({attivo:true});
const bl=GDRB.badgeList(s1);
const on=Object.fromEntries(bl.map(b=>[b.id,b.on]));
chk(on.gs1&&on.gs5&&!on.gs10&&on.gh3&&on.gh10&&!on.gh30&&on.gy3&&!on.gy8,'badge sessioni/ore/sistemi m1 soglie default');
chk(on.gm1&&on.gm5&&!on.gm15&&on.gc1&&!on.gc3&&!on.go5&&!on.gmo4&&!on.gpg5,'badge master/campagne/altri m1');
const b2=Object.fromEntries(GDRB.badgeList(GDRB.memberStats('m2',plays.filter(p=>p.id!=='bad'))).map(b=>[b.id,b]));
chk(b2.gs1.on&&!b2.gs5.on&&b2.gs5.cur===4&&b2.gs5.goal===5&&b2.gh10.cur===9&&b2.gy3.cur===2,'progressi m2: Cantastorie 4/5, Veglia 9/10, Esploratore 2/3');

GDRB.v=GDRB.norm({attivo:false});
sandbox.TT={types:[{id:'gdr',kind:'gdr',attivo:true}],attivo(){return this.types.filter(t=>t.attivo)}};
chk(!GDRB.visible(),'blocco spento: nascosto anche se tipo GDR attivo');
GDRB.v=GDRB.norm({attivo:true});
sandbox.TT.types[0].attivo=false;
chk(!GDRB.visible(),'tipo GDR non attivo: record e badge nascosti');
sandbox.TT.types[0].attivo=true;
chk(GDRB.visible(),'tipo GDR attivo + blocco on: visibile');

const bad=GDRB.errors({attivo:true,rec:{sessioni:{nome:'<script>'}},badge:{}});
chk(bad.some(x=>/</.test(x)||/nome/.test(x)),'validazione: nome con < rifiutato');
const long=GDRB.norm({badge:{gs5:{nome:'AB',desc:'ok desc',soglia:0}}});
chk(long.badge.gs5.soglia===5,'soglia 0 ripristina il default');
chk(GDRB.norm({rec:{sessioni:{nome:'Sessioni RPG'}}}).rec.sessioni.nome==='Sessioni RPG','nome record configurabile');

console.log(`\n${ok}/${n} controlli`);
if(ok!==n)process.exit(1);
