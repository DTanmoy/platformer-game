const CACHE_NAME="dino-v8";self.addEventListener("activate",(e=>{e.waitUntil(caches.keys().then((e=>Promise.all(e.map((e=>{if("dino-v8"!==e)return caches.delete(e)}))))))})),self.addEventListener("fetch",(e=>{e.respondWith(fetch(e.request).then((t=>{try{if(!t||200!==t.status||"basic"!==t.type)return t;const c=t.clone();caches.open("dino-v8").then((t=>{t.put(e.request,c)})).catch((e=>{console.log("SW: error caching",e)}))}catch(e){}finally{return t}})).catch((()=>{caches.match(e.request).then((e=>e))})))}));