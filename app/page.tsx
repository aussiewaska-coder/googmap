'use client';

import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('./components/MapView'), {
    ssr: false,
    loading: () => <div className="w-full h-screen bg-black text-white flex items-center justify-center">Loading 3D Map...</div>
});

export default function Home() {
    return (
        <main className="w-screen h-screen overflow-hidden">
            <MapView />
        </main>
    );
}
