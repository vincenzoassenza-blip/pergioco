#!/usr/bin/env node
// v41.15 — GDR in collezione: ricerca RPGGeek riusata, scheda rpginfo, import, filtri, testi.
const fs=require('fs');const path=require('path');const vm=require('vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let n=0,ok=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};

const meta=read('supabase/functions/bgg-meta/index.ts');
const coll=read('supabase/functions/bgg-collection/index.ts');
const shared=read('supabase/functions/_shared/bgg.ts');
const gdr=read('gdr-coll.js');
const gio=read('giochi.js');
const imp=read('import-bgg.js');
const sb=read('sb.js');
const brand=read('brand.js');
const app=read('app.js');
const mig=read('supabase/migrate-v41.15.sql');
const idx=read('index.html');
const sw=read('sw.js');
const tt=read('tavoli-tipi.js');

chk(/mode === "rpg"/.test(meta)&&/type=rpg,rpgitem/.test(meta)&&/rpgsearch-v2:/.test(meta),'ricerca v41.14.2 invariata (mode rpg, type rpg,rpgitem, cache v2)');
chk(/mode === "rpginfo"/.test(meta)&&/parseRpgThing/.test(meta)&&/xmlapi2\/thing\?id=/.test(meta),'bgg-meta mode rpginfo legge la scheda via XML API2');
chk(/rpgthing:/.test(meta),'cache scheda rpgthing:');
chk(/mode === "rpg"/.test(coll)&&/subtype=rpgitem/.test(coll)&&/rpgcollection:/.test(coll),'bgg-collection mode rpg: own=1 subtype=rpgitem, cache dedicata');
chk(/is_admin/.test(coll),'collection (anche rpg) resta solo admin');
chk(/export function parseRpgThing/.test(shared),'parseRpgThing nello shared server');
chk(!/api\.geekdo\.com/.test(gdr+imp)&&!/xmlapi2\//.test(gdr+imp),'client GDR/import senza XML API2 e senza API non ufficiale');
chk(/mode:'rpg'/.test(gdr)&&/mode:'rpginfo'/.test(gdr),'GDRC riusa bgg-meta rpg e rpginfo');
chk(/GDRC\.search/.test(tt)&&!/type=rpg,rpgitem/.test(tt),'tavoli GDR riusano GDRC.search, niente ricerca duplicata');
chk(/gdr-coll\.js\?v=/.test(idx)&&/gdr-coll\.js\?v=/.test(sw),'gdr-coll.js in index e cache SW');
const iIdx=idx.indexOf('gdr-coll.js'),iGio=idx.indexOf('giochi.js');
chk(iIdx>=0&&iGio>iIdx,'gdr-coll.js è caricato prima di giochi.js');

chk(/kind text not null default 'gdt'/.test(mig)&&/games_kind_chk/.test(mig)&&/games_rpg_chk/.test(mig),'migrazione: kind + vincoli rpg');
chk(/grant select \(kind,rpg_system,rpg_genre,rpg_publisher,rpg_lang\)/.test(mig)&&/grant insert \(kind/.test(mig)&&/grant update \(kind/.test(mig),'GRANT per colonna delle nuove campi');
chk(/g->>'kind'='gdr'/.test(mig)&&/rpgSystem/.test(mig)&&/bgg_id/.test(mig),'games_import_bgg accetta kind e campi GDR, dedup su bgg_id');
chk(/"gm_tutto":\[2,20\]/.test(mig)&&/"irpg_titolo":\[2,60\]/.test(mig)&&/"tt_ora_lab":\[2,40\]/.test(mig),'testi_valid con gm_* e irpg_*');

chk(/kind:g.kind==='gdr'\?'gdr':'gdt'/.test(sb)&&/rpg_system:g.kind==='gdr'/.test(sb),'sb.js to: kind e rpg_*');
chk(/kind:r.kind==='gdr'\?'gdr':'gdt'/.test(sb)&&/rpgSystem:r.rpg_system/.test(sb),'sb.js from: kind e rpg_*');
chk(/data-gm/.test(gio)&&/id="gmac"/.test(gio)&&/id="gdtf"/.test(gio)&&/id="gdrf"/.test(gio),'filtri macro Tutto/GDT/GDR e pannelli');
chk(/f.g==='gdr'\?isR\(g\)/.test(gio)&&/\(f.g!=='gdt'\|\|!isR\(g\)\)/.test(gio),'GDT nasconde i GDR, GDR mostra solo i GDR');
chk(/rpgSystem/.test(gio)&&/rpgGenre/.test(gio)&&/rpgPublisher/.test(gio)&&/rpgLang/.test(gio),'filtri GDR: sistema, genere, editore, lingua');
chk(/GDRC\.bind/.test(gio)&&/GDRC\.html/.test(gio),'form admin: inserimento GDR da RPGGeek');
chk(/textFromFile/.test(imp)&&/loadXLSX/.test(imp)&&/sheet_to_csv/.test(imp),'import legge anche Excel via loadXLSX');
chk(/mode:'rpg'/.test(imp)&&/kind:rpg\?'gdr'/.test(imp),'import utente RPGGeek marca kind=gdr');
chk(/irpg_titolo/.test(brand)&&/gm_tutto/.test(brand)&&/gm_gdt/.test(brand)&&/gm_gdr/.test(brand),'testi default: filtri e import RPGGeek');
chk(/gm_tutto/.test(app)&&/irpg_titolo/.test(app),'testi in Configurazione');
chk(!/innerHTML|insertAdjacentHTML/.test(imp),'import-bgg.js: solo textContent');
chk(!/innerHTML|insertAdjacentHTML/.test(gdr),'gdr-coll.js: solo textContent');
chk(!/club|ludoteca/i.test(gdr.replace(/'ludoteca'/g,''))&&!/club|ludoteca/i.test(imp.replace(/'ludoteca'/g,'')),'niente «club» o «ludoteca» nei testi nuovi');

// parseRpgThing
function loadParse(){
  let src=shared;
  const aStart=src.indexOf('function attr(');
  const aEnd=src.indexOf('function pollNums');
  const pStart=src.indexOf('export function parseRpgThing');
  if(aStart<0||aEnd<0||pStart<0) throw new Error('non trovo attr/parseRpgThing');
  let fns=src.slice(aStart,aEnd)+'\n'+src.slice(pStart);
  fns=fns.replace(/export function /g,'function ');
  fns=fns.replace(/:\s*string\[\]/g,'').replace(/:\s*string/g,'').replace(/:\s*number/g,'').replace(/new Set<[^>]+>/g,'new Set');
  const body=`
    function txt(s,max=80){return String(s??"").normalize("NFC").replace(/[\\u0000-\\u001F\\u007F]/g,"").replace(/[<>"\`]/g,"").trim().slice(0,max)}
    function int(v,lo,hi){const n=Number(v);return Number.isInteger(n)&&n>=lo&&n<=hi?n:null}
    function decodeXml(s){return s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">")}
    function thumbOk(u){const s=String(u||"");return /^https:\\/\\/cf\\.geekdo-images\\.com\\/[A-Za-z0-9_./%=:()-]+$/.test(s)&&s.length<=400?s:null}
    ${fns}
    this.parseRpgThing=parseRpgThing;
  `;
  const ctx={};
  vm.runInNewContext(body,ctx);
  return ctx.parseRpgThing;
}
const parseRpgThing=loadParse();
const xmlRpg=`<items><item type="rpg" id="17181">
  <name type="primary" value="Dungeons &amp; Dragons (5th Edition)"/>
  <name type="alternate" value="D&amp;D 5e"/>
  <yearpublished value="2014"/>
  <thumbnail>https://cf.geekdo-images.com/abc/dd5e.jpg</thumbnail>
  <link type="rpggenre" id="1" value="Fantasy"/>
  <link type="rpgpublisher" id="2" value="Wizards of the Coast"/>
</item></items>`;
const sys=parseRpgThing(xmlRpg,17181);
chk(!!sys&&sys.nome==='Dungeons & Dragons (5th Edition)'&&sys.tipo==='rpg','parser rpg: nome primary e tipo');
chk(sys.sistema.includes('Dungeons & Dragons (5th Edition)')&&sys.genere.includes('Fantasy')&&sys.editore.includes('Wizards of the Coast'),'parser rpg: sistema=nome, genere e editore dai link');
const xmlItem=`<items><item type="rpgitem" id="216437">
  <name value="Dungeons &amp; Dragons Starter Set (5th Edition)" type="primary"/>
  <yearpublished value="2014"/>
  <link type="rpg" id="17181" value="Dungeons &amp; Dragons (5th Edition)"/>
  <link type="rpggenre" id="1" value="Fantasy"/>
  <link type="rpggenre" id="8" value="Adventure"/>
  <link type="rpgpublisher" id="2" value="Wizards of the Coast"/>
  <link type="language" id="7" value="English"/>
</item></items>`;
const it=parseRpgThing(xmlItem,216437);
chk(it&&it.tipo==='rpgitem'&&it.sistema[0]==='Dungeons & Dragons (5th Edition)','parser rpgitem: sistema dal link type=rpg');
chk(it.genere.includes('Fantasy')&&it.genere.includes('Adventure')&&it.lingua.includes('English'),'parser rpgitem: genere e lingua');
chk(parseRpgThing('<items></items>',1)===null,'parser: xml vuoto → null');

// rowsFromCsv (BGG invariato + GDR)
function loadIBGG(){
  const ctx={window:{},views:{},document:{createElement:()=>({append(){},setAttribute(){}})},TXT:undefined,TXT_DEF:undefined,adminMode:()=>true,isMod:()=>false,toast(){},go(){},DB:{games:async()=>[],remote:null},V:{replaceChildren(){},append(){},querySelector(){return null}},loadXLSX:undefined};
  vm.runInNewContext(imp+'\nthis.IBGG=window.IBGG;',ctx);
  return ctx.IBGG;
}
const IBGG=loadIBGG();
const bgg=read('tests/fixtures/bgg-collection-sample.csv');
const br=IBGG.rowsFromCsv(bgg);
chk(Array.isArray(br)&&br.length===9&&br.every(r=>r.kind==='gdt'||!r.kind||r.kind==='gdt'),'CSV BGG: 9 giochi kind gdt');
chk(br.some(r=>r.bggId===13&&r.name==='Catan'),'CSV BGG: Catan invariato');
const rpg=read('tests/fixtures/rpggeek-collection-sample.csv');
const rr=IBGG.rowsFromCsv(rpg,'gdr');
chk(rr.length===3&&rr.every(r=>r.kind==='gdr'),'CSV RPGGeek con kind gdr: 3 GDR');
const dnd=rr.find(r=>r.bggId===216437);
chk(dnd&&dnd.rpgSystem.includes('Dungeons & Dragons (5th Edition)')&&dnd.rpgGenre.includes('Fantasy')&&dnd.rpgPublisher.includes('Wizards of the Coast')&&dnd.rpgLang.includes('English'),'CSV GDR: sistema/genere/editore/lingua');
const xss=rr.find(r=>r.bggId===999002);
chk(xss&&xss.name==='XSS RPG'&&!/<?b>/.test(xss.name),'CSV GDR: XSS come testo, tag strappati');
const auto=IBGG.rowsFromCsv(rpg);
chk(auto.every(r=>r.kind==='gdr'),'CSV con itemtype rpgitem: kind gdr anche senza forzatura');

console.log(`${ok}/${n}`);
if(ok!==n)process.exit(1);
