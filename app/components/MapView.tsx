'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
    Search,
    Map as MapIcon,
    Mountain,
    Sun,
    ChevronLeft,
    ChevronRight,
    Settings,
    Navigation,
    Activity,
    Maximize,
    Locate
} from 'lucide-react';

import { CITIES, AUSTRALIA_CENTER, MAP_SOURCES } from '../lib/constants';

interface ViewState {
    lng: number;
    lat: number;
    zoom: number;
    pitch: number;
    bearing: number;
}

export default function MapView() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const userMarker = useRef<maplibregl.Marker | null>(null);

    const [viewState, setViewState] = useState<ViewState>(AUSTRALIA_CENTER);
    const [layers, setLayers] = useState({
        imagery: true,
        hillshade: true,
        terrain: true,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isMapReady, setIsMapReady] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        // Initialize Map
        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    'esri-imagery': MAP_SOURCES.imagery as any,
                    'terrain-source': MAP_SOURCES.terrain as any,
                },
                layers: [
                    {
                        id: 'esri-imagery-layer',
                        type: 'raster',
                        source: 'esri-imagery',
                        minzoom: 0,
                        maxzoom: 22,
                    },
                    {
                        id: 'hillshade-layer',
                        type: 'hillshade',
                        source: 'terrain-source',
                        paint: {
                            'hillshade-exaggeration': 0.6,
                            'hillshade-shadow-color': '#000000',
                            'hillshade-highlight-color': '#FFFFFF',
                            'hillshade-accent-color': '#000000',
                        },
                        layout: { visibility: 'visible' },
                    },
                ],
            },
            center: [AUSTRALIA_CENTER.lng, AUSTRALIA_CENTER.lat],
            zoom: AUSTRALIA_CENTER.zoom,
            pitch: AUSTRALIA_CENTER.pitch,
            bearing: AUSTRALIA_CENTER.bearing,
            maxBounds: [
                [100, -50], // Southwest
                [170, -5], // Northeast
            ],
        });

        const m = map.current;

        // Custom control positioning handled by our sidebar or standard controls
        m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
        m.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');
        m.addControl(new maplibregl.FullscreenControl(), 'top-right');

        m.on('load', () => {
            setIsMapReady(true);
        });

        m.on('move', () => {
            setViewState({
                lng: parseFloat(m.getCenter().lng.toFixed(4)),
                lat: parseFloat(m.getCenter().lat.toFixed(4)),
                zoom: parseFloat(m.getZoom().toFixed(2)),
                pitch: parseFloat(m.getPitch().toFixed(0)),
                bearing: parseFloat(m.getBearing().toFixed(0)),
            });
        });

        return () => {
            m.remove();
            map.current = null;
        };
    }, []);

    // Terrain Updates
    useEffect(() => {
        if (!map.current || !isMapReady) return;
        if (layers.terrain) {
            map.current.setTerrain({ source: 'terrain-source', exaggeration: 1.5 });
        } else {
            map.current.setTerrain(null);
        }
    }, [layers.terrain, isMapReady]);

    // Hillshade Updates
    useEffect(() => {
        if (!map.current || !map.current.getLayer('hillshade-layer') || !isMapReady) return;
        map.current.setLayoutProperty(
            'hillshade-layer',
            'visibility',
            layers.hillshade ? 'visible' : 'none'
        );
    }, [layers.hillshade, isMapReady]);

    // Imagery Updates
    useEffect(() => {
        if (!map.current || !map.current.getLayer('esri-imagery-layer') || !isMapReady) return;
        map.current.setLayoutProperty(
            'esri-imagery-layer',
            'visibility',
            layers.imagery ? 'visible' : 'none'
        );
    }, [layers.imagery, isMapReady]);



    const flyToLocation = (center: [number, number], zoom = 12) => {
        if (!map.current) return;
        console.log(`[MapView] Flying to ${center}`);
        map.current.flyTo({
            center,
            zoom,
            essential: true,
        });
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { longitude, latitude } = position.coords;

                // Jump to location
                flyToLocation([longitude, latitude], 15);

                // Create or move marker
                if (map.current) {
                    if (!userMarker.current) {
                        const el = document.createElement('div');
                        el.className = 'user-location-marker';
                        userMarker.current = new maplibregl.Marker({ element: el })
                            .setLngLat([longitude, latitude])
                            .addTo(map.current);
                    } else {
                        userMarker.current.setLngLat([longitude, latitude]);
                    }
                }
            },
            (error) => {
                console.error('[MapView] Error obtaining location:', error.message);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const res = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            setSearchResults(data);
            if (data.length > 0) {
                const first = data[0];
                flyToLocation([parseFloat(first.lon), parseFloat(first.lat)]);
            }
        } catch (e) {
            console.error('[Search] Error', e);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black font-sans antialiased">
            {/* Map Container */}
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

            {/* SIDEBAR OVERLAY */}
            <div className={`fixed top-0 left-0 h-full z-[10000] transition-all duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-[400px]' : '-translate-x-full w-[400px]'}`}>
                <div className="h-full bg-black/80 backdrop-blur-xl border-r border-white/10 overflow-y-auto custom-scrollbar flex flex-col shadow-2xl">

                    {/* SIDEBAR HEADER: Search & Logo */}
                    <div className="p-6 border-b border-white/10 space-y-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-white font-black text-2xl tracking-tighter italic flex items-center gap-2">
                                <Activity className="text-blue-500" size={28} />
                                AUS.MAPPING
                            </h1>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="text-white/40 hover:text-white transition-colors"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        </div>

                        {/* SEARCH COMPONENT */}
                        <div className="relative group">
                            <form onSubmit={handleSearch} className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-400 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search location..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-white/20"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {isSearching && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                )}
                            </form>

                            {searchResults.length > 0 && searchQuery && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-zinc-900/95 border border-white/10 rounded-2xl overflow-hidden z-[100] shadow-2xl backdrop-blur-md">
                                    {searchResults.map((r, i) => (
                                        <button
                                            key={i}
                                            className="w-full text-left p-4 hover:bg-white/5 border-b border-white/5 last:border-none transition group"
                                            onClick={() => {
                                                flyToLocation([parseFloat(r.lon), parseFloat(r.lat)]);
                                                setSearchResults([]);
                                                setSearchQuery('');
                                            }}
                                        >
                                            <div className="text-white font-bold text-sm tracking-tight">{r.display_name.split(',')[0]}</div>
                                            <div className="text-white/40 text-[10px] truncate group-hover:text-white/60">{r.display_name}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SIDBAR BODY: Sections */}
                    <div className="flex-1 p-6 space-y-8">

                        {/* FLIGHT DECK: Predefined Cities */}
                        <section>
                            <div className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Navigation size={12} /> Flight Deck
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(CITIES).map(([name, coords]) => (
                                    <button
                                        key={name}
                                        onClick={() => flyToLocation(coords as [number, number])}
                                        className="h-10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-[11px] font-bold rounded-lg border border-white/5 transition-all flex items-center justify-center gap-2"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        {name}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => map.current?.flyTo({ ...AUSTRALIA_CENTER, essential: true })}
                                className="w-full mt-4 h-12 bg-red-600/20 hover:bg-red-600/30 text-red-500 hover:text-red-400 text-xs font-black rounded-xl border border-red-500/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                            >
                                <Maximize size={14} /> Global View Reset
                            </button>
                        </section>

                        {/* ATMOSPHERIC LAYERS: Toggles */}
                        <section>
                            <div className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Settings size={12} /> Atmospheric Layers
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                                {[
                                    { id: 'imagery', label: 'Sat Imagery', icon: <MapIcon size={14} /> },
                                    { id: 'hillshade', label: 'Shaded Relief', icon: <Sun size={14} /> },
                                    { id: 'terrain', label: '3D Elevation', icon: <Mountain size={14} /> }
                                ].map(layer => (
                                    <div key={layer.id} className="flex items-center justify-between p-4 px-5">
                                        <span className="text-white/80 text-xs font-bold flex items-center gap-2">
                                            <span className="text-blue-500">{layer.icon}</span>
                                            {layer.label}
                                        </span>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={layers[layer.id as keyof typeof layers]}
                                                onChange={e => setLayers(l => ({ ...l, [layer.id]: e.target.checked }))}
                                            />
                                            <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* SYSTEM DIAGNOSTICS: Coordinates */}
                        <section>
                            <div className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Activity size={12} /> System Diagnostics
                            </div>
                            <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5 space-y-3 font-mono">
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-white/40 uppercase">Latitude</span>
                                    <span className="text-white font-bold tabular-nums">{viewState.lat.toFixed(6)}°</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-white/40 uppercase">Longitude</span>
                                    <span className="text-white font-bold tabular-nums">{viewState.lng.toFixed(6)}°</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-white/40 uppercase">Altitude</span>
                                    <span className="text-blue-400 font-black tabular-nums">{viewState.zoom} LVEL</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* SIDEBAR FOOTER */}
                    <div className="p-6 pt-0 opacity-40 hover:opacity-100 transition-opacity">
                        <div className="text-[10px] text-white/40 italic font-mono uppercase tracking-tighter">
                            // SECURE.ENDPOINT:0391-AUS
                        </div>
                    </div>
                </div>
            </div>

            {/* SIDEBAR OPEN BUTTON (When closed) */}
            {!isSidebarOpen && (
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="fixed top-6 left-6 z-[10001] bg-black/80 backdrop-blur-lg border border-white/10 p-3 rounded-2xl text-white shadow-2xl hover:bg-blue-600 transition-all group scale-100 active:scale-95"
                >
                    <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
            )}

            {/* QUICK ACTIONS OVERLAY (Bottom Right for map tools) */}
            <div className="fixed bottom-8 right-8 z-[9000] flex flex-col gap-2">
                <button
                    onClick={handleLocateMe}
                    className="h-12 w-12 bg-black/80 backdrop-blur-lg border border-white/10 rounded-2xl flex items-center justify-center text-white/60 hover:text-white hover:bg-blue-600 transition-all shadow-xl group"
                    title="Find My Location"
                >
                    <Locate size={20} className="group-hover:scale-110 transition-transform" />
                </button>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .user-location-marker {
                    width: 20px;
                    height: 20px;
                    background-color: #22c55e;
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 0 15px rgba(34, 197, 94, 0.8);
                    animation: pulse-green 2s infinite;
                }

                @keyframes pulse-green {
                    0% {
                        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
                    }
                    70% {
                        box-shadow: 0 0 0 20px rgba(34, 197, 94, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
                    }
                }
            `}</style>
        </div>
    );
}
