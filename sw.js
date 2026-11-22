// Service worker: guarda la app para abrirla sin señal y sirve las fotos desde el teléfono.
const VER="ci-v124", SHELL=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VER).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER&&k!=="ci-fonts"&&k!=="ci-thumbs").map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
function blobDe(id){return new Promise(ok=>{const r=indexedDB.open("inspecciones",1);r.onsuccess=()=>{try{const g=r.result.transaction("blobs").objectStore("blobs").get(id);g.onsuccess=()=>ok(g.result||null);g.onerror=()=>ok(null)}catch(e){ok(null)}};r.onerror=()=>ok(null)})}
// miniaturas de las fotos (se hacen una por una y se guardan): las casillas no cargan la foto completa
let cola=Promise.resolve();
function miniatura(id){const k=new Request("./_thumb/"+id);
  return caches.open("ci-thumbs").then(async c=>{const hit=await c.match(k);if(hit)return hit;
    const b=await blobDe(id);if(!b)return new Response("",{status:404});
    const hacer=async()=>{try{const bm=await createImageBitmap(b);const f=Math.min(1,512/Math.max(bm.width,bm.height));
      const oc=new OffscreenCanvas(Math.max(1,Math.round(bm.width*f)),Math.max(1,Math.round(bm.height*f)));oc.getContext("2d").drawImage(bm,0,0,oc.width,oc.height);bm.close&&bm.close();
      const t=await oc.convertToBlob({type:"image/jpeg",quality:0.8});const r=new Response(t,{headers:{"Content-Type":"image/jpeg"}});await c.put(k,r.clone());return r}
      catch(e){return new Response(b,{headers:{"Content-Type":b.type||"image/jpeg"}})}};
    const p=cola.then(hacer,hacer);cola=p.catch(()=>{});return p})}
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  const mt=u.pathname.match(/\/_thumb\/([0-9a-f]+)$/);
  if(mt){e.respondWith(miniatura(mt[1]));return}
  const m=u.pathname.match(/\/_blob\/([0-9a-f]+)$/);
  if(m){e.respondWith(blobDe(m[1]).then(b=>b?new Response(b,{headers:{"Content-Type":b.type||"image/jpeg"}}):new Response("",{status:404})));return}
  if(e.request.method!=="GET")return;
  if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    e.respondWith(caches.open("ci-fonts").then(async c=>{const hit=await c.match(e.request);const net=fetch(e.request).then(r=>{c.put(e.request,r.clone());return r}).catch(()=>hit);return hit||net}));return}
  if(u.origin===location.origin){
    // la app: primero la red (para recibir actualizaciones), si no hay señal la copia guardada
    e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(VER).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match("./index.html"))))}
});
