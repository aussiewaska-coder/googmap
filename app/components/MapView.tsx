'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
    Locate,
    AlertTriangle,
    Radio
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
    const [wazeData, setWazeData] = useState<any>(null);
    const [isWazeLoading, setIsWazeLoading] = useState(false);
    const [isWazeEnabled, setIsWazeEnabled] = useState(false);
    const [timeHorizon, setTimeHorizon] = useState(1); // in hours
    const [gamepadConnected, setGamepadConnected] = useState(false);
    const [gamepadName, setGamepadName] = useState<string>('');

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
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
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
        });

        const m = map.current;

        // Custom control positioning handled by our sidebar or standard controls
        m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
        m.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');
        m.addControl(new maplibregl.FullscreenControl(), 'top-right');

        // Enable globe projection and space atmosphere
        m.on('style.load', () => {
            (m as any).setProjection({ type: 'globe' });

            try {
                // @ts-ignore - MapLibre fog API
                m.setFog({
                    range: [-1, 1.5],
                    'horizon-blend': 0.1,
                    color: '#242b4b',
                    'high-color': '#161b36',
                    'space-color': '#0B0B19',
                    'star-intensity': 0.8,
                } as any);
            } catch (e) {
                console.log('Fog API not available');
            }
        });

        m.on('load', () => {
            setIsMapReady(true);
            
            // Start globe rotation immediately
            m.easeTo({
                center: [128.335700, -27.082600],
                zoom: 3.93,
                duration: 6000,
                easing: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
            });
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

    // Gamepad Controls
    useEffect(() => {
        let gamepadIndex: number | null = null;
        let animationFrameId: number;
        let zoomDiff = 0;
        let bearingDiff = 0;
        let pitchDiff = 0;

        const handleGamepadConnected = (e: GamepadEvent) => {
            console.log('Gamepad connected:', e.gamepad.id);
            setGamepadConnected(true);
            setGamepadName(e.gamepad.id);
            gamepadIndex = e.gamepad.index;
        };

        const handleGamepadDisconnected = () => {
            console.log('Gamepad disconnected');
            setGamepadConnected(false);
            setGamepadName('');
            gamepadIndex = null;
        };

        const scaleClamp = (value: number, scale: number, threshold: number) => {
            return Math.abs(value) < threshold ? 0 : value * scale;
        };

        const pollGamepad = () => {
            if (!map.current) {
                animationFrameId = requestAnimationFrame(pollGamepad);
                return;
            }

            if (gamepadIndex !== null) {
                const gamepads = navigator.getGamepads();
                const gamepad = gamepads[gamepadIndex];

                if (gamepad) {
                    // Left stick: Pan (axes 0 and 1)
                    const leftX = gamepad.axes[0] || 0;
                    const leftY = gamepad.axes[1] || 0;

                    // Right stick (axes 2 and 3)
                    const rightX = gamepad.axes[2] || 0;
                    const rightY = gamepad.axes[3] || 0;

                    // Pan speed scales with zoom
                    const currentZoom = map.current.getZoom();
                    const panScale = (currentZoom / 30) * 100;

                    const panX = scaleClamp(leftX, panScale, 0.15);
                    const panY = scaleClamp(leftY, panScale, 0.15);

                    if (panX !== 0 || panY !== 0) {
                        map.current.panBy([panX, panY], { animate: false });
                    }

                    // Zoom (right stick Y)
                    zoomDiff += scaleClamp(-rightY, 0.05, 0.15);
                    if (Math.abs(zoomDiff) > 0.1) {
                        map.current.setZoom(currentZoom + zoomDiff);
                        zoomDiff = 0;
                    }

                    // Bearing (right stick X)
                    bearingDiff += scaleClamp(rightX, 2, 0.15);
                    if (Math.abs(bearingDiff) > 1) {
                        map.current.setBearing(map.current.getBearing() + bearingDiff);
                        bearingDiff = 0;
                    }

                    // Pitch (L2/R2 triggers)
                    const l2 = gamepad.buttons[6]?.pressed ? 1 : 0;
                    const r2 = gamepad.buttons[7]?.pressed ? 1 : 0;

                    if (l2 || r2) {
                        pitchDiff += (r2 - l2) * 1.5;
                        if (Math.abs(pitchDiff) > 1) {
                            const currentPitch = map.current.getPitch();
                            const newPitch = Math.max(0, Math.min(60, currentPitch + pitchDiff));
                            map.current.setPitch(newPitch);
                            pitchDiff = 0;
                        }
                    }
                }
            }

            animationFrameId = requestAnimationFrame(pollGamepad);
        };

        window.addEventListener('gamepadconnected', handleGamepadConnected);
        window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

        // Check for already connected gamepads
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                handleGamepadConnected({ gamepad: gamepads[i] } as GamepadEvent);
                break;
            }
        }

        pollGamepad();

        return () => {
            window.removeEventListener('gamepadconnected', handleGamepadConnected);
            window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, []);

    // Waze Layers Initialization & Updates
    useEffect(() => {
        if (!map.current || !isMapReady) return;
        const m = map.current;

        if (!m.getSource('waze-source')) {
            m.addSource('waze-source', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });

            m.addLayer({
                id: 'waze-heat-circles',
                type: 'circle',
                source: 'waze-source',
                paint: {
                    'circle-radius': [
                        'interpolate', ['linear'], ['zoom'],
                        10, 4,
                        15, 12
                    ],
                    'circle-color': [
                        'match', ['get', 'type'],
                        'POLICE', '#2563eb', // Blue
                        'ACCIDENT', '#dc2626', // Red
                        'JAM', '#ea580c', // Orange
                        'HAZARD', '#facc15', // Yellow
                        '#8b5cf6' // Purple/Others
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                    'circle-opacity': 0.8
                }
            });

            m.addLayer({
                id: 'waze-labels',
                type: 'symbol',
                source: 'waze-source',
                layout: {
                    'text-field': ['get', 'type'],
                    'text-font': ['Open Sans Bold'],
                    'text-size': 10,
                    'text-offset': [0, 1.5],
                    'text-anchor': 'top'
                },
                paint: {
                    'text-color': '#ffffff',
                    'text-halo-color': '#000000',
                    'text-halo-width': 1
                }
            });

            // Popup on click
            m.on('click', 'waze-heat-circles', (e) => {
                if (!e.features || e.features.length === 0) return;
                const feature = e.features[0];
                const props = feature.properties;
                const coords = (feature.geometry as any).coordinates.slice();

                const timeAgo = (dateStr: string) => {
                    const date = new Date(dateStr);
                    const now = new Date();
                    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
                    const minutes = Math.floor(seconds / 60);
                    if (minutes < 1) return 'Just now';
                    if (minutes < 60) return `${minutes}m ago`;
                    const hours = Math.floor(minutes / 60);
                    if (hours < 24) return `${hours}h ago`;
                    return date.toLocaleDateString();
                };

                const formatType = (type: string, subtype: string) => {
                    let text = type;
                    if (subtype) {
                        text += ` • ${subtype.replace(/_/g, ' ')}`;
                    }
                    return text;
                };

                const getColor = (value: number, type: 'conf' | 'rel') => {
                    // Logic: High confidence/reliability = Red (Verified/Major), Low = Yellow
                    // Confidence is 0-1, Reliability is typically 1-10
                    const normalized = type === 'conf' ? value * 10 : value;
                    return normalized >= 5 ? 'text-red-500' : 'text-yellow-400';
                };

                const confValue = Math.round(props.confidence * 100); // 0-100%
                const relValue = props.reliability; // Raw score 1-10

                new maplibregl.Popup({ className: 'custom-popup' })
                    .setLngLat(coords as [number, number])
                    .setHTML(`
                        <div class="px-4 py-3 bg-black/90 text-white rounded-xl border border-white/10 shadow-2xl backdrop-blur-md min-w-[240px]">
                            <div class="flex items-center justify-between mb-3">
                                <span class="bg-blue-600 text-[10px] font-black px-2 py-0.5 rounded italic uppercase tracking-wider">${formatType(props.type, props.subtype)}</span>
                            </div>
                            <div class="font-bold text-sm mb-0.5">${props.street || 'Unknown Street'}</div>
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-xs text-white/40 uppercase font-bold tracking-wider">${props.city || 'NEARBY'}</span>
                                <span class="text-white/20">|</span>
                                <span class="text-white text-xs font-mono font-bold">${timeAgo(props.publishedAt)}</span>
                            </div>
                            ${props.description ? `<div class="text-xs text-white/60 italic mt-2 border-t border-white/5 pt-2 leading-relaxed">"${props.description}"</div>` : ''}
                            <div class="flex gap-4 mt-3 text-[9px] uppercase tracking-widest font-bold pt-2 border-t border-white/5">
                                <div title="Number of drivers who confirmed this alert" class="cursor-help group relative">
                                    <span class="text-white/40 border-b border-white/20 border-dotted">Confidence:</span> 
                                    <span class="${getColor(props.confidence, 'conf')}">${confValue}%</span>
                                </div>
                                <div title="Reputation score of the reporter (1-10)" class="cursor-help group relative">
                                    <span class="text-white/40 border-b border-white/20 border-dotted">Reliability:</span> 
                                    <span class="${getColor(props.reliability, 'rel')}">${relValue}/10</span>
                                </div>
                            </div>
                        </div>
                    `)
                    .addTo(m);
            });

            m.on('mouseenter', 'waze-heat-circles', () => { m.getCanvas().style.cursor = 'pointer'; });
            m.on('mouseleave', 'waze-heat-circles', () => { m.getCanvas().style.cursor = ''; });
        }

        // Visibility toggle
        m.setLayoutProperty('waze-heat-circles', 'visibility', isWazeEnabled ? 'visible' : 'none');
        m.setLayoutProperty('waze-labels', 'visibility', isWazeEnabled ? 'visible' : 'none');

        // Update data
        if (wazeData?.geojson) {
            (m.getSource('waze-source') as maplibregl.GeoJSONSource).setData(wazeData.geojson);
        }
    }, [isMapReady, isWazeEnabled, wazeData]);

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

    const fetchDatabaseAlerts = useCallback(async () => {
        setIsWazeLoading(true);
        try {
            const res = await fetch(`/api/alerts?hours=${timeHorizon}`);
            if (!res.ok) throw new Error('API error');
            const data = await res.json();
            setWazeData(data);
        } catch (err) {
            console.error('[Database Alerts] Fetch Error', err);
        } finally {
            setIsWazeLoading(false);
        }
    }, [timeHorizon]);

    // Fetch database alerts when enabled or time horizon changes
    useEffect(() => {
        if (isWazeEnabled) {
            fetchDatabaseAlerts();
        }
    }, [isWazeEnabled, fetchDatabaseAlerts]);

    const fetchWazeData = async () => {
        if (!map.current) return;
        setIsWazeLoading(true);
        setIsWazeEnabled(true);
        try {
            const bounds = map.current.getBounds();
            const bbox = {
                w: bounds.getWest(),
                s: bounds.getSouth(),
                e: bounds.getEast(),
                n: bounds.getNorth(),
            };

            const res = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bbox }),
            });

            if (!res.ok) throw new Error('API error');
            const data = await res.json();
            setWazeData(data);
        } catch (err) {
            console.error('[Waze] Scan Error', err);
        } finally {
            setIsWazeLoading(false);
        }
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black font-sans antialiased">
            {/* Map Container */}
            <div ref={mapContainer} className="absolute inset-0 w-full h-full map-fade-in" />

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
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={layers[layer.id as keyof typeof layers]}
                                                onChange={e => setLayers(l => ({ ...l, [layer.id]: e.target.checked }))}
                                            />
                                            <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* WAZE TRAFFIC: Alerts & Jams */}
                        <section>
                            <div className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Radio size={12} className={isWazeLoading ? 'animate-pulse' : ''} /> Waze Traffic System
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isWazeEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/20'}`}>
                                            <AlertTriangle size={18} />
                                        </div>
                                        <div>
                                            <div className="text-white text-xs font-bold">Live Traffic Alerts</div>
                                            <div className="text-white/40 text-[10px]">Real-time community reports</div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={isWazeEnabled}
                                            onChange={e => setIsWazeEnabled(e.target.checked)}
                                        />
                                        <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {isWazeEnabled && (
                                    <div className="space-y-3 pt-2 border-t border-white/5">
                                        {/* Time Horizon Selector */}
                                        <div>
                                            <div className="text-white/60 text-[10px] font-bold uppercase mb-2">Time Horizon</div>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {[
                                                    { label: '15m', value: 0.25 },
                                                    { label: '30m', value: 0.5 },
                                                    { label: '1h', value: 1 },
                                                    { label: '2h', value: 2 },
                                                    { label: '6h', value: 6 },
                                                    { label: '12h', value: 12 },
                                                    { label: '24h', value: 24 },
                                                    { label: '48h', value: 48 },
                                                    { label: '72h', value: 72 },
                                                ].map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => setTimeHorizon(option.value)}
                                                        className={`h-8 text-[10px] font-bold rounded-lg transition-all ${
                                                            timeHorizon === option.value
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                                        }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Step Controls */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const options = [0.25, 0.5, 1, 2, 6, 12, 24, 48, 72];
                                                    const currentIndex = options.indexOf(timeHorizon);
                                                    if (currentIndex > 0) {
                                                        setTimeHorizon(options[currentIndex - 1]);
                                                    }
                                                }}
                                                disabled={timeHorizon === 0.25}
                                                className="flex-1 h-8 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white text-[10px] font-bold rounded-lg transition-all"
                                            >
                                                ← Down
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const options = [0.25, 0.5, 1, 2, 6, 12, 24, 48, 72];
                                                    const currentIndex = options.indexOf(timeHorizon);
                                                    if (currentIndex < options.length - 1) {
                                                        setTimeHorizon(options[currentIndex + 1]);
                                                    }
                                                }}
                                                disabled={timeHorizon === 72}
                                                className="flex-1 h-8 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white text-[10px] font-bold rounded-lg transition-all"
                                            >
                                                Up →
                                            </button>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={fetchDatabaseAlerts}
                                                disabled={isWazeLoading}
                                                className="flex-1 h-10 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest cursor-pointer"
                                            >
                                                {isWazeLoading ? (
                                                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <>Refresh</>
                                                )}
                                            </button>
                                            <button
                                                onClick={fetchWazeData}
                                                disabled={isWazeLoading}
                                                className="flex-1 h-10 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest cursor-pointer"
                                            >
                                                {isWazeLoading ? (
                                                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <>Scan</>
                                                )}
                                            </button>
                                        </div>

                                        {/* Stats Display */}
                                        {wazeData && (
                                            <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5 text-center">
                                                <div className="text-white/40 text-[8px] uppercase font-bold mb-1">
                                                    Alerts ({timeHorizon >= 1 ? `${timeHorizon}h` : `${timeHorizon * 60}m`})
                                                </div>
                                                <div className="text-white font-black text-xl">{wazeData.count ?? 0}</div>
                                            </div>
                                        )}
                                    </div>
                                )}
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

            {/* GAMEPAD STATUS */}
            {gamepadConnected && (
                <div className="fixed top-6 right-6 z-[9000] bg-black/90 backdrop-blur-lg border border-green-500/30 rounded-xl px-4 py-2 shadow-2xl flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-green-400 text-xs font-bold">🎮 {gamepadName.split('(')[0].trim()}</span>
                </div>
            )}

            {/* CAMERA DEBUG PANEL */}
            <div className="fixed top-20 right-6 z-[9000] bg-black/90 backdrop-blur-lg border border-white/20 rounded-xl p-4 shadow-2xl font-mono text-xs">
                <div className="text-blue-400 font-bold mb-3 uppercase tracking-wider">Camera Debug</div>
                <div className="space-y-2 text-white/80">
                    <div className="flex justify-between gap-4">
                        <span className="text-white/50">Latitude:</span>
                        <span className="text-white font-bold">{viewState.lat.toFixed(6)}°</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-white/50">Longitude:</span>
                        <span className="text-white font-bold">{viewState.lng.toFixed(6)}°</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-white/50">Zoom:</span>
                        <span className="text-blue-400 font-bold">{viewState.zoom.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-white/50">Pitch:</span>
                        <span className="text-green-400 font-bold">{viewState.pitch.toFixed(0)}°</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-white/50">Bearing:</span>
                        <span className="text-yellow-400 font-bold">{viewState.bearing.toFixed(0)}°</span>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .map-fade-in {
                    animation: fadeIn 2s ease-in;
                }
                
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                
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

                .custom-popup .maplibregl-popup-content {
                    background: none;
                    padding: 0;
                    box-shadow: none;
                    border: none;
                }
                .custom-popup .maplibregl-popup-tip {
                    border-top-color: rgba(0, 0, 0, 0.9);
                    border-bottom-color: rgba(0, 0, 0, 0.9);
                    opacity: 0.9;
                }
                .custom-popup .maplibregl-popup-close-button {
                    color: white;
                    padding: 8px;
                    font-size: 16px;
                    right: 4px;
                    top: 4px;
                    z-index: 10;
                }
            `}</style>
        </div>
    );
}
