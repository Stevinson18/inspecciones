// Service worker: guarda la app para abrirla sin señal y sirve las fotos desde el teléfono.
const VER="ci-v73", SHELL=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VER).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER&&k!=="ci-fonts").map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
function blobDe(id){return new Promise(ok=>{const r=indexedDB.open("inspecciones",1);r.onsuccess=()=>{try{const g=r.result.transaction("blobs").objectStore("blobs").get(id);g.onsuccess=()=>ok(g.result||null);g.onerror=()=>ok(null)}catch(e){ok(null)}};r.onerror=()=>ok(null)})}
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  const m=u.pathname.match(/\/_blob\/([0-9a-f]+)$/);
  if(m){e.respondWith(blobDe(m[1]).then(b=>b?new Response(b,{headers:{"Content-Type":b.type||"image/jpeg"}}):new Response("",{status:404})));return}
  if(e.request.method!=="GET")return;
  if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    e.respondWith(caches.open("ci-fonts").then(async c=>{const hit=await c.match(e.request);const net=fetch(e.request).then(r=>{c.put(e.request,r.clone());return r}).catch(()=>hit);return hit||net}));return}
  if(u.origin===location.origin){
    // la app: primero la red (para recibir actualizaciones), si no hay señal la copia guardada
    e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(VER).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match("./index.html"))))}
});
