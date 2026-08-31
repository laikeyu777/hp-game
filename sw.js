const CACHE='ash-corridor-v32';
const ASSETS=['./','./index.html','./styles.css?v=11','./challenge-system.js?v=1','./combat-logic.js?v=15','./room-logic.js?v=1','./tower-data.js?v=1','./build-system.js?v=1','./skill-progression.js?v=1','./boss-mechanics.js?v=1','./ascension.js?v=1','./achievements.js?v=1','./arena-backgrounds.js?v=1','./pixel-art.js?v=17','./reference-sprite-sheet.png','./combat-visual-state.js?v=13','./game.js?v=22','./manifest.json'];

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match('./index.html')))));
