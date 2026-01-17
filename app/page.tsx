'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { registerTileServiceWorker } from './lib/service-worker';

const MapView = dynamic(() => import('./components/MapView'), {
    ssr: false,
    loading: () => <div className="w-full h-screen bg-black text-white flex items-center justify-center">Loading Globe...</div>
});

export default function Home() {
    // Register service worker for tile caching
    useEffect(() => {
        registerTileServiceWorker().then((registration) => {
            if (registration) {
                console.log('[App] Tile caching service worker active');
            }
        });
    }, []);

    return (
        <main className="w-screen h-screen overflow-hidden">
            <MapView />
        </main>
    );
}
