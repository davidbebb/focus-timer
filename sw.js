// A unique name for the cache. Changing this version number will trigger
// the service worker to update and re-cache all the files.
const CACHE_NAME = 'focus-timer-cache-v1';

// A list of all the files and resources the app needs to work offline.
const urlsToCache = [
  '/',                // The root of the app (the main page)
  'index.html',       // The main HTML file
  'manifest.json',    // The PWA manifest file
  'https://cdn.tailwindcss.com', // Tailwind CSS
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' // Google Fonts
];

// --- INSTALL Event ---
// This event fires when the service worker is first installed.
// It's where we pre-cache all the essential app files.
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  // waitUntil() ensures that the service worker isn't considered
  // installed until the caching is complete.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        // Add all the specified URLs to the newly opened cache.
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache app shell:', error);
      })
  );
});

// --- ACTIVATE Event ---
// This event fires after the service worker has been installed and is a good
// place to clean up any old, unused caches.
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    // If a cache's name is different from our current CACHE_NAME,
                    // it's an old cache that we should delete.
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});


// --- FETCH Event ---
// This event intercepts every network request made by the page.
// This allows us to serve cached files when offline.
self.addEventListener('fetch', event => {
  // We use respondWith() to take control of the response.
  event.respondWith(
    // Check if the requested resource exists in our cache.
    caches.match(event.request)
      .then(response => {
        // If a cached version is found, return it immediately.
        if (response) {
          return response;
        }

        // If the resource is not in the cache, fetch it from the network as normal.
        return fetch(event.request);
      })
  );
});
