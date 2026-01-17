// Service Worker Registration and Management

export async function registerTileServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        console.log('[SW] Service workers not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/tile-service-worker.js', {
            scope: '/',
        });

        console.log('[SW] Tile service worker registered:', registration.scope);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('[SW] Update found, new worker installing');

            newWorker?.addEventListener('statechange', () => {
                console.log('[SW] Worker state changed to:', newWorker.state);
            });
        });

        return registration;
    } catch (error) {
        console.error('[SW] Registration failed:', error);
        return null;
    }
}

export async function clearTileCache(): Promise<void> {
    if (!navigator.serviceWorker?.controller) {
        console.warn('[SW] No active service worker to send message to');
        return;
    }

    const controller = navigator.serviceWorker.controller;

    controller.postMessage({
        type: 'CLEAR_TILE_CACHE',
    });

    console.log('[SW] Sent clear cache message');
}

export async function getCacheStats(): Promise<{
    tileCount: number;
    storageUsed: number;
    storageQuota: number;
} | null> {
    if (!navigator.serviceWorker?.controller) {
        console.warn('[SW] No active service worker');
        return null;
    }

    const controller = navigator.serviceWorker.controller;

    return new Promise((resolve) => {
        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = (event) => {
            resolve(event.data);
        };

        controller.postMessage(
            {
                type: 'GET_CACHE_STATS',
            },
            [messageChannel.port2]
        );

        // Timeout after 5 seconds
        setTimeout(() => resolve(null), 5000);
    });
}

export async function prefetchTiles(tileUrls: string[]): Promise<void> {
    if (!navigator.serviceWorker?.controller) {
        console.warn('[SW] No active service worker');
        return;
    }

    const controller = navigator.serviceWorker.controller;

    controller.postMessage({
        type: 'PREFETCH_TILES',
        tiles: tileUrls,
    });

    console.log(`[SW] Sent prefetch request for ${tileUrls.length} tiles`);
}
