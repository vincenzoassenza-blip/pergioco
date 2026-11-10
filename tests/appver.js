// Lettura di APP_VERSION e della cache SW dal codice, senza pin fissi.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const APP_VERSION=(read('brand.js').match(/APP_VERSION='([^']+)'/)||[])[1]||'';
const esc=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const swTxt=()=>read('sw.js');
const idxTxt=()=>read('index.html');
const swCache=()=>new RegExp(`const C='pergioco-v${esc(APP_VERSION)}'`).test(swTxt());
const hasAsset=name=>{const re=new RegExp(esc(name)+'\\?v=');return re.test(idxTxt())&&re.test(swTxt())};
const cssBlock=ver=>{
  const css=read('styles.css');
  const i=css.search(new RegExp('/\\*\\s*'+esc(ver)));
  if(i<0)return '';
  const n=css.slice(i+4).search(/\/\*\s*v[0-9]/);
  return n<0?css.slice(i):css.slice(i,i+4+n);
};
module.exports={ROOT,read,APP_VERSION,esc,swCache,hasAsset,cssBlock,swTxt,idxTxt};
