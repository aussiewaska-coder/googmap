// Tile Cache Service Worker - Next-Gen Map Tile Caching
// Implements intelligent client-side tile caching with storage quota management

const CACHE_NAME = 'tile-cache-v1';
const TILE_CACHE_NAME = 'map-tiles-v1';
const MIN_FREE_STORAGE_BYTES = 1 * 1024 * 1024 * 1024; // 1GB minimum free storage
const MAX_TILE_CACHE_SIZE = 500 * 1024 * 1024; // 500MB max tile cache size
const TILE_URL_PATTERN = /\/api\/tiles\/(satellite|terrain)\/\d+\/\d+\/\d+$/;

console.log('[TileWorker] Service worker loading...');

// Storage quota check - respects user's device storage
async function hasEnoughStorage() {
    if (!navigator.storage || !navigator.storage.estimate) {
        console.log('[TileWorker] Storage API not available, skipping quota check');
        return true; // Fallback to allowing caching if API unavailable
    }

    try {
        const estimate = await navigator.storage.estimate();
        const availableBytes = (estimate.quota || 0) - (estimate.usage || 0);

        // Helper to format bytes intelligently
        const formatBytes = (bytes) => {
            const gb = bytes / 1024 / 1024 / 1024;
            const mb = bytes / 1024 / 1024;
            return gb >= 1 ? `${gb.toFixed(2)}GB` : `${mb.toFixed(2)}MB`;
        };

        console.log('[TileWorker] Storage:', {
            total: formatBytes(estimate.quota || 0),
            used: formatBytes(estimate.usage || 0),
            available: formatBytes(availableBytes),
            minRequired: `${(MIN_FREE_STORAGE_BYTES / 1024 / 1024 / 1024).toFixed(2)}GB`,
        });

        return availableBytes >= MIN_FREE_STORAGE_BYTES;
    } catch (error) {
        console.error('[TileWorker] Error checking storage:', error);
        return false;
    }
}

// Manage cache size - LRU eviction
async function manageCacheSize() {
    try {
        const cache = await caches.open(TILE_CACHE_NAME);
        const keys = await cache.keys();

        if (keys.length === 0) return;

        // Estimate total cache size
        let totalSize = 0;
        const entries = [];

        for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                const size = blob.size;
                totalSize += size;

                // Extract timestamp from cache (stored in custom header)
                const cachedTime = response.headers.get('x-sw-cached-time');
                entries.push({
                    request,
                    size,
                    timestamp: cachedTime ? parseInt(cachedTime, 10) : Date.now(),
                });
            }
        }

        console.log(
            `[TileWorker] Cache size: ${(totalSize / 1024 / 1024).toFixed(2)}MB, ${keys.length} tiles`
        );

        // If over limit, evict oldest tiles (LRU)
        if (totalSize > MAX_TILE_CACHE_SIZE) {
            // Sort by timestamp (oldest first)
            entries.sort((a, b) => a.timestamp - b.timestamp);

            let evictedSize = 0;
            let evictedCount = 0;

            for (const entry of entries) {
                if (totalSize - evictedSize <= MAX_TILE_CACHE_SIZE * 0.8) {
                    // Target 80% to avoid thrashing
                    break;
                }

                await cache.delete(entry.request);
                evictedSize += entry.size;
                evictedCount++;
            }

            console.log(
                `[TileWorker] Evicted ${evictedCount} tiles (${(evictedSize / 1024 / 1024).toFixed(2)}MB)`
            );
        }
    } catch (error) {
        console.error('[TileWorker] Error managing cache size:', error);
    }
}

// Install event - prepare cache
self.addEventListener('install', (event) => {
    console.log('[TileWorker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(() => {
            console.log('[TileWorker] Cache opened');
            return self.skipWaiting(); // Activate immediately
        })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[TileWorker] Activating...');
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            // Delete old cache versions
                            return name !== CACHE_NAME && name !== TILE_CACHE_NAME;
                        })
                        .map((name) => {
                            console.log('[TileWorker] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim()) // Take control immediately
    );
});

// Fetch event - intelligent tile caching
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only intercept tile requests
    if (!TILE_URL_PATTERN.test(url.pathname)) {
        return; // Let browser handle normally
    }

    event.respondWith(
        (async () => {
            // LAYER 1: Check service worker cache (fastest)
            const cache = await caches.open(TILE_CACHE_NAME);
            const cachedResponse = await cache.match(request);

            if (cachedResponse) {
                console.log('[TileWorker] Cache HIT:', url.pathname);
                return cachedResponse;
            }

            // LAYER 2: Fetch from network (goes through our Redis-backed API)
            console.log('[TileWorker] Cache MISS, fetching:', url.pathname);

            try {
                const networkResponse = await fetch(request);

                // Only cache successful responses
                if (networkResponse.ok) {
                    // Check storage before caching
                    const hasStorage = await hasEnoughStorage();

                    if (hasStorage) {
                        // Clone response and add cache timestamp
                        const responseToCache = new Response(networkResponse.clone().body, {
                            status: networkResponse.status,
                            statusText: networkResponse.statusText,
                            headers: new Headers(networkResponse.headers),
                        });

                        // Add timestamp for LRU eviction
                        responseToCache.headers.set('x-sw-cached-time', Date.now().toString());

                        // Cache asynchronously (don't block response)
                        cache.put(request, responseToCache).then(() => {
                            console.log('[TileWorker] Cached:', url.pathname);
                            // Periodically manage cache size
                            if (Math.random() < 0.1) {
                                // 10% chance to run cleanup
                                manageCacheSize();
                            }
                        });
                    } else {
                        console.warn(
                            '[TileWorker] Insufficient storage, skipping cache for:',
                            url.pathname
                        );
                    }
                }

                return networkResponse;
            } catch (error) {
                console.error('[TileWorker] Fetch failed:', url.pathname, error);

                // Return cached response if available, even if stale
                if (cachedResponse) {
                    console.log('[TileWorker] Serving stale cache due to network error');
                    return cachedResponse;
                }

                // Return error response
                return new Response('Tile fetch failed', {
                    status: 503,
                    statusText: 'Service Unavailable',
                });
            }
        })()
    );
});

// Message event - for cache management commands from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CLEAR_TILE_CACHE') {
        event.waitUntil(
            caches.delete(TILE_CACHE_NAME).then(() => {
                console.log('[TileWorker] Tile cache cleared');
                return caches.open(TILE_CACHE_NAME); // Recreate empty cache
            })
        );
    }

    if (event.data && event.data.type === 'GET_CACHE_STATS') {
        event.waitUntil(
            (async () => {
                const cache = await caches.open(TILE_CACHE_NAME);
                const keys = await cache.keys();
                const estimate = await navigator.storage.estimate();

                event.ports[0].postMessage({
                    tileCount: keys.length,
                    storageUsed: estimate.usage,
                    storageQuota: estimate.quota,
                });
            })()
        );
    }

    if (event.data && event.data.type === 'PREFETCH_TILES') {
        const { tiles } = event.data;
        event.waitUntil(
            (async () => {
                const hasStorage = await hasEnoughStorage();
                if (!hasStorage) {
                    console.warn('[TileWorker] Insufficient storage for prefetch');
                    return;
                }

                const cache = await caches.open(TILE_CACHE_NAME);

                for (const tileUrl of tiles) {
                    try {
                        const response = await fetch(tileUrl);
                        if (response.ok) {
                            await cache.put(tileUrl, response);
                            console.log('[TileWorker] Prefetched:', tileUrl);
                        }
                    } catch (error) {
                        console.error('[TileWorker] Prefetch failed:', tileUrl, error);
                    }
                }
            })()
        );
    }
});

console.log('[TileWorker] Service worker loaded successfully');
