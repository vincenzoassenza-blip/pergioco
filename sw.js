const C='pergioco-v41.0';
const CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const A=['./','./index.html','./styles.css?v=41.0','./config.js?v=41.0','./data.js?v=41.0','./sb.js?v=41.0','./brand.js?v=41.0','./app.js?v=41.0','./picker.js?v=41.0','./errori.js?v=41.0','./libri.js?v=41.0','./giochi.js?v=41.0','./consigliere.js?v=41.0','./equilibrio.js?v=41.0','./eventi.js?v=41.0','./xp.js?v=41.0','./sicurezza.js?v=41.0','./desktop.js?v=41.0','./stats.js?v=41.0','./antero.js?v=41.0','./coppa.js?v=41.0','./desideri.js?v=41.0','./wrapped.js?v=41.0','./ig.js?v=41.0','./ux40.js?v=41.0','./vendor/xlsx.full.min.js','./manifest.json','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A.map(u=>new Request(u,{cache:'reload'}))).then(()=>c.add(CDN).catch(()=>{}))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
// solo i file dell'app e la libreria Supabase vanno in cache; le chiamate al database no
self.addEventListener('fetch',e=>{const u=e.request.url;if(e.request.method!=='GET'||!(u.startsWith(self.location.origin)||u===CDN))return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match('./index.html')));return}
 if(u===CDN||/\/vendor\/|\/icons\//.test(u)){e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));return}
 e.respondWith(fetch(e.request,{cache:'no-cache'}).then(n=>{if(n.ok){const cp=n.clone();caches.open(C).then(c=>c.put(e.request,cp))}return n}).catch(()=>caches.match(e.request).then(r=>r||caches.match(e.request,{ignoreSearch:true}))))});
