#!/usr/bin/env node
// Ricerca GDR su RPGGeek: sistemi (type=rpg) + prodotti (rpgitem),
// ordinati così «Dungeons & Dragons (5th Edition)» (id 17181) risulta visibile.
const fs=require('fs');const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let n=0,ok=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};

const meta=read('supabase/functions/bgg-meta/index.ts');
const shared=read('supabase/functions/_shared/bgg.ts');

chk(/mode === "rpg"/.test(meta),'bgg-meta espone mode rpg');
chk(/type=rpg,rpgitem/.test(meta),'cerca su type=rpg,rpgitem (sistemi + prodotti)');
chk(!/type=rpgitem&/.test(meta),'non interroga più solo rpgitem');
chk(/encodeURIComponent\(q\)/.test(meta),'query passata con encodeURIComponent (la & non spezza l\'URL)');
chk(/rpgsearch-v2:/.test(meta),'cache v2 (i payload vecchi erano solo rpgitem)');
chk(/rankRpgSearch/.test(meta)&&/export function rankRpgSearch/.test(shared),'ordinamento dedicato lato server');
chk(/export function parseSearch/.test(shared)&&/tipo/.test(shared),'parseSearch conserva il tipo dell\'oggetto');
chk(/xmlapi2\/search/.test(meta)&&/BGG_HOST/.test(shared),'solo XML API2 server-side');
chk(!/https:\/\/api\.geekdo\.com/.test(meta)&&/xmlapi2\/search/.test(meta),'niente chiamata a API non ufficiale');

// Estrae le funzioni di parse/rank da bgg.ts (toglie solo le annotazioni di tipo usate lì).
function loadFns(){
  let src=shared;
  src=src.replace(/export type SearchHit[\s\S]*?;\n/,'');
  src=src.replace(/:\s*SearchHit\[\]/g,'').replace(/:\s*SearchHit/g,'').replace(/:\s*string/g,'');
  src=src.replace(/new Set<[^>]+>/g,'new Set');
  src=src.replace(/export function /g,'function ');
  const start=src.indexOf('function parseSearch');
  const end=src.indexOf('function attr(');
  if(start<0||end<0) throw new Error('non trovo parseSearch/rankRpgSearch in bgg.ts');
  const body=`
    function txt(s,max=80){return String(s??"").normalize("NFC").replace(/[\\u0000-\\u001F\\u007F]/g,"").replace(/[<>"\`]/g,"").trim().slice(0,max)}
    function int(v,lo,hi){const n=Number(v);return Number.isInteger(n)&&n>=lo&&n<=hi?n:null}
    function decodeXml(s){return s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">")}
    ${src.slice(start,end)}
    module.exports={parseSearch,rpgNorm,rankRpgSearch};
  `;
  const m={exports:{}};
  require('vm').runInNewContext(body, {module:m, exports:m.exports});
  return m.exports;
}

const {parseSearch,rpgNorm,rankRpgSearch}=loadFns();

chk(rpgNorm('Dungeons & Dragons (5th Edition)')==='dungeons dragons 5th edition','rpgNorm toglie & e parentesi');
chk(rpgNorm('dungeons & dragons 5th edition')==='dungeons dragons 5th edition','query e titolo 5e si allineano');

const fixture=`<items total="10">
  <item id="355720" type="rpgitem"><name type="primary" value="Las Arenas del Destino"/><yearpublished value="1998"/></item>
  <item id="153208" type="rpgitem"><name type="primary" value="Advanced Dungeons &amp; Dragons (3rd Edition): Dungeon Masters Guide (2013)"/><yearpublished value="2013"/></item>
  <item id="162994" type="rpgitem"><name type="primary" value="Player's Handbook (D&amp;D 5e)"/><yearpublished value="2014"/></item>
  <item id="243" type="rpg"><name type="primary" value="Dungeons &amp; Dragons (3.5 Edition)"/></item>
  <item id="221" type="rpg"><name type="primary" value="Dungeons &amp; Dragons (3rd Edition)"/></item>
  <item id="190" type="rpg"><name type="primary" value="Dungeons &amp; Dragons (4th Edition)"/></item>
  <item id="25424" type="rpg"><name type="primary" value="Dungeons &amp; Dragons (5th Edition, Playtest &amp; Promotional Docs)"/></item>
  <item id="17181" type="rpg"><name type="primary" value="Dungeons &amp; Dragons (5th Edition)"/><name type="alternate" value="D&amp;D 5e"/></item>
  <item id="66974" type="rpgitem"><name type="primary" value="Advanced Dungeons &amp; Dragons (3rd Edition): Players Handbook"/><yearpublished value="2009"/></item>
  <item id="238233" type="rpgitem"><name type="primary" value="1,000 Rooms of Chaos"/><yearpublished value="2017"/></item>
</items>`;

const parsed=parseSearch(fixture);
chk(parsed.length===10,'parser: 10 oggetti');
const sys=parsed.find(x=>x.bgg_id===17181);
chk(!!sys&&sys.tipo==='rpg'&&sys.nome==='Dungeons & Dragons (5th Edition)','parser: 17181 usa il nome primary, non l\'alternativo D&D 5e');
chk(parsed.find(x=>x.bgg_id===162994)?.tipo==='rpgitem','parser: il PHB è rpgitem');
const mixed=`<items><item id="17181" type="rpg"><name type="alternate" value="D&amp;D 5e"/><name value="Dungeons &amp; Dragons (5th Edition)" type="primary"/></item></items>`;
chk(parseSearch(mixed)[0]?.nome==='Dungeons & Dragons (5th Edition)','parser: nome primary anche se l\'alternativo sta prima e value precede type');


function top(q){return rankRpgSearch(parsed,q).slice(0,10)}
function ids(q){return top(q).map(x=>x.bgg_id)}
function first(q){return top(q)[0]}

chk(first('dungeons & dragons 5th edition').bgg_id===17181,'«dungeons & dragons 5th edition» → 17181 in cima');
chk(first('dungeons & dragons').bgg_id===17181,'«dungeons & dragons» → 17181 in cima (non 3.5/4e/playtest)');
chk(first('D&D 5e').bgg_id===17181,'«D&D 5e» → 17181 in cima');
chk(ids('dungeons dragons').includes(17181),'«dungeons dragons» (senza &) trova 17181');
chk(first('dungeons & dragons 5th edition').tipo==='rpg','il risultato principale è un sistema, non un rpgitem');

// Comportamento precedente: solo rpgitem, primi 10 nell'ordine API, 17181 assente.
const onlyItems=parsed.filter(x=>x.tipo==='rpgitem');
chk(!onlyItems.some(x=>x.bgg_id===17181),'prima: tra i soli rpgitem 17181 non c\'è');
chk(onlyItems[0].bgg_id!==17181,'prima: in cima non compariva la 5e');

// encodeURIComponent: la & della query non deve diventare un secondo parametro
const q='dungeons & dragons 5th edition';
const url=`/xmlapi2/search?type=rpg,rpgitem&query=${encodeURIComponent(q)}`;
chk(url.includes('query=dungeons%20%26%20dragons%205th%20edition'),'URL: & della query è %26');
chk((url.match(/&/g)||[]).length===1,'URL: un solo & di sintassi, la & della query è %26');

console.log(`\n${ok}/${n} controlli`);
if(ok!==n)process.exit(1);
