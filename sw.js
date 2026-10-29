const C='pergioco-v10';
const CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const A=['./','./index.html','./styles.css','./config.js','./data.js','./sb.js','./app.js','./manifest.json','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A).then(()=>c.add(CDN).catch(()=>{}))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
// solo i file dell'app e la libreria Supabase vanno in cache; le chiamate al database no
self.addEventListener('fetch',e=>{const u=e.request.url;if(e.request.method!=='GET'||!(u.startsWith(self.location.origin)||u===CDN))return;
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{const cp=n.clone();caches.open(C).then(c=>c.put(e.request,cp));return n}).catch(()=>caches.match('./index.html'))))});
