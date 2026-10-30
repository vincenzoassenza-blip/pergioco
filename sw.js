const C='pergioco-v33';
const CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const A=['./','./index.html','./styles.css?v=33','./config.js?v=33','./data.js?v=33','./sb.js?v=33','./app.js?v=33','./libri.js?v=33','./giochi.js?v=33','./consigliere.js?v=33','./equilibrio.js?v=33','./eventi.js?v=33','./xp.js?v=33','./sicurezza.js?v=33','./desktop.js?v=33','./stats.js?v=33','./antero.js?v=33','./vendor/xlsx.full.min.js','./manifest.json','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A.map(u=>new Request(u,{cache:'reload'}))).then(()=>c.add(CDN).catch(()=>{}))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
// solo i file dell'app e la libreria Supabase vanno in cache; le chiamate al database no
self.addEventListener('fetch',e=>{const u=e.request.url;if(e.request.method!=='GET'||!(u.startsWith(self.location.origin)||u===CDN))return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match('./index.html')));return}
 if(u===CDN||/\/vendor\/|\/icons\//.test(u)){e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));return}
 e.respondWith(fetch(e.request,{cache:'no-cache'}).then(n=>{if(n.ok){const cp=n.clone();caches.open(C).then(c=>c.put(e.request,cp))}return n}).catch(()=>caches.match(e.request).then(r=>r||caches.match(e.request,{ignoreSearch:true}))))});
