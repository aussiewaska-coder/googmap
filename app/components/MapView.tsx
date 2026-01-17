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
    Radio,
    Gamepad2
} from 'lucide-react';

import { MapController } from '../lib/gamepad/map-controller';
import { ControllerProfileV2, CommandContext } from '../lib/gamepad/types-v2';
import { loadSessionProfile } from '../lib/gamepad/storage';
import { applyTacticalPresetV2 } from '../lib/gamepad/defaults-v2';
import { ContextManager } from '../lib/gamepad/context-manager';
import ControllerModal from './controller/ControllerModal';
import DebugModal from './controller/DebugModal';
import DebugLogModal from './DebugLogModal';

import { CITIES, AUSTRALIA_CENTER, MAP_SOURCES, MAP_STYLES } from '../lib/constants';
import { prefetchTiles } from '../lib/service-worker';

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
    const [currentStyle, setCurrentStyle] = useState('satellite');
    const [terrainEnabled, setTerrainEnabled] = useState(true);
    const [terrainExaggeration, setTerrainExaggeration] = useState(1.5);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isMapReady, setIsMapReady] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [wazeData, setWazeData] = useState<any>(null);
    const [isWazeLoading, setIsWazeLoading] = useState(false);
    const [isWazeEnabled, setIsWazeEnabled] = useState(false);
    const [timeHorizon, setTimeHorizon] = useState(1); // in hours
    const [showControllerModal, setShowControllerModal] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const controllerRef = useRef<MapController | null>(null);
    const [currentProfile, setCurrentProfile] = useState<ControllerProfileV2>(() => {
        return loadSessionProfile() || applyTacticalPresetV2();
    });

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        // Initialize Map with all sources (raster + tactical vector)
        map.current = new maplibregl.Map({
            container: mapContainer.current,
            maxPitch: 85, // Override default 60° limit (MapLibre GL max is 85°)
            minZoom: 1.5, // Prevent zooming out beyond globe view
            maxZoom: 24, // Allow maximum zoom to ground level (street view detail)
            style: {
                version: 8,
                sources: {
                    'satellite-source': MAP_SOURCES.satellite as any,
                    'terrain-source': MAP_SOURCES.terrain as any,
                    'streets-source': MAP_SOURCES.streets as any,
                    'topo-source': MAP_SOURCES.topo as any,
                    'dark-source': MAP_SOURCES.dark as any,
                    'voyager-source': MAP_SOURCES.voyager as any,
                    'labels-source': MAP_SOURCES.labels as any,
                },
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
                layers: [
                    {
                        id: 'satellite-layer',
                        type: 'raster',
                        source: 'satellite-source',
                        minzoom: 0,
                        maxzoom: 22,
                        layout: { visibility: 'visible' },
                    },
                    {
                        id: 'streets-layer',
                        type: 'raster',
                        source: 'streets-source',
                        minzoom: 0,
                        maxzoom: 22,
                        layout: { visibility: 'none' },
                    },
                    {
                        id: 'topo-layer',
                        type: 'raster',
                        source: 'topo-source',
                        minzoom: 0,
                        maxzoom: 22,
                        layout: { visibility: 'none' },
                    },
                    {
                        id: 'dark-layer',
                        type: 'raster',
                        source: 'dark-source',
                        minzoom: 0,
                        maxzoom: 22,
                        layout: { visibility: 'none' },
                    },
                    {
                        id: 'voyager-layer',
                        type: 'raster',
                        source: 'voyager-source',
                        minzoom: 0,
                        maxzoom: 22,
                        layout: { visibility: 'none' },
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
                    {
                        id: 'labels-layer',
                        type: 'raster',
                        source: 'labels-source',
                        minzoom: 0,
                        maxzoom: 22,
                        layout: { visibility: 'none' },
                    },
                ],
            },
            center: [AUSTRALIA_CENTER.lng, AUSTRALIA_CENTER.lat],
            zoom: AUSTRALIA_CENTER.zoom,
            pitch: AUSTRALIA_CENTER.pitch,
            bearing: AUSTRALIA_CENTER.bearing,
            // CRITICAL: Explicitly enable all touch/finger interactions
            interactive: true,
            dragPan: true,
            scrollZoom: true,
            boxZoom: true,
            dragRotate: true,
            touchZoomRotate: true,
            touchPitch: true,
            doubleClickZoom: true,
            keyboard: true,
        });

        console.log('🗺️ [MapView] Map initialized with ALL interactions enabled');
        console.log('🗺️ DragPan:', map.current.dragPan.isEnabled());
        console.log('🗺️ ScrollZoom:', map.current.scrollZoom.isEnabled());
        console.log('🗺️ TouchZoomRotate:', map.current.touchZoomRotate.isEnabled());
        console.log('🗺️ TouchPitch:', map.current.touchPitch.isEnabled());

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

    // Initialize MapController for gamepad controls
    useEffect(() => {
        if (!map.current || !isMapReady) return;

        // Command handlers for UI interactions
        const handleReportTraffic = () => {
            console.log('[MapView] Report traffic triggered - Waze-like report workflow');
            // TODO: Implement Waze-like report modal/workflow
        };

        const handleMenuNavigate = (direction: 'up' | 'down' | 'left' | 'right') => {
            console.log('[MapView] Menu navigate:', direction);
            // TODO: Implement focus management for settings panel
        };

        const handleMenuSelect = () => {
            console.log('[MapView] Menu select triggered');
            // TODO: Activate focused control in settings panel
        };

        const handleMenuBack = () => {
            console.log('[MapView] Menu back triggered');
            setIsSettingsOpen(false);
        };

        // Create CommandContext for dispatcher
        const commandContext: CommandContext = {
            map: map.current,
            ui: {
                openSettings: () => setIsSettingsOpen(true),
                closeSettings: () => setIsSettingsOpen(false),
                toggleSettings: () => setIsSettingsOpen(prev => !prev),
                isSettingsOpen: () => isSettingsOpen,
                menuNavigate: handleMenuNavigate,
                menuSelect: handleMenuSelect,
                menuBack: handleMenuBack,
            },
            integrations: {
                reportTrafficPolice: handleReportTraffic,
            },
        };

        // Create ContextManager for context switching
        const contextManager = new ContextManager();

        // Initialize MapController with v2 context
        const controller = new MapController(map.current, commandContext, contextManager);
        controllerRef.current = controller;

        return () => {
            controller.cleanup();
            controllerRef.current = null;
        };
    }, [isMapReady, isSettingsOpen]);

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

    // Map Style Switching (includes terrain and hillshade based on user toggles)
    useEffect(() => {
        if (!map.current || !isMapReady) return;

        const style = MAP_STYLES.find((s) => s.id === currentStyle);
        if (!style) return;

        const allRasterLayers = [
            'satellite-layer', 'streets-layer', 'topo-layer', 'dark-layer', 'voyager-layer'
        ];

        // Hide all base raster layers
        allRasterLayers.forEach((layerId) => {
            if (map.current!.getLayer(layerId)) {
                map.current!.setLayoutProperty(layerId, 'visibility', 'none');
            }
        });

        // Show selected base layer
        const baseLayerId = `${style.baseLayer}-layer`;
        if (map.current.getLayer(baseLayerId)) {
            map.current.setLayoutProperty(baseLayerId, 'visibility', 'visible');
        }

        // Toggle labels (style default or user preference)
        if (map.current.getLayer('labels-layer')) {
            map.current.setLayoutProperty(
                'labels-layer',
                'visibility',
                style.showLabels ? 'visible' : 'none'
            );
        }

        // Toggle hillshade (combined with terrain control)
        if (map.current.getLayer('hillshade-layer')) {
            map.current.setLayoutProperty(
                'hillshade-layer',
                'visibility',
                terrainEnabled ? 'visible' : 'none'
            );
        }

        // Toggle 3D terrain (combined with hillshade control)
        if (terrainEnabled) {
            map.current.setTerrain({ source: 'terrain-source', exaggeration: terrainExaggeration });
        } else {
            map.current.setTerrain(null);
        }
    }, [currentStyle, isMapReady, terrainEnabled, terrainExaggeration]);



    const flyToLocation = (center: [number, number], zoom = 12, source = 'unknown') => {
        if (!map.current) return;

        console.log('');
        console.log('🛫 ===== FLY TO LOCATION =====');
        console.log('🛫 Source:', source);
        console.log('🛫 Target center:', center);
        console.log('🛫 Target zoom:', zoom);
        console.log('🛫 Current center:', map.current.getCenter());
        console.log('🛫 Current zoom:', map.current.getZoom());
        console.log('🛫 Map is currently moving?', map.current.isMoving());
        console.log('🛫 Map is currently easing?', map.current.isEasing());

        const flyOptions = {
            center,
            zoom,
            duration: 1800,
            curve: 1.4,
            speed: 0.8,
            easing: (t: number) => {
                // easeInOutCubic
                return t < 0.5
                    ? 4 * t * t * t
                    : 1 - Math.pow(-2 * t + 2, 3) / 2;
            },
            essential: true,
        };

        console.log('🛫 Flying with graceful easing...');
        console.log('🛫 Duration:', flyOptions.duration, 'ms');
        console.log('🛫 Speed:', flyOptions.speed);
        console.log('🛫 Curve:', flyOptions.curve);

        const onMoveEnd = () => {
            console.log('✅ [FlyTo] Flight completed!');
            console.log('🛫 Final center:', map.current?.getCenter());
            console.log('🛫 Final zoom:', map.current?.getZoom());
            console.log('🛫 ===== FLY TO COMPLETE =====');
            console.log('');
            map.current?.off('moveend', onMoveEnd);
        };
        map.current.once('moveend', onMoveEnd);

        map.current.flyTo(flyOptions);
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) return;

        console.log('📍 [Locate Me Button] Requesting geolocation...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { longitude, latitude } = position.coords;
                console.log('📍 [Locate Me Button] Position received:', latitude, longitude);

                // Jump to location
                flyToLocation([longitude, latitude], 15, 'Locate Me Button');

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
                flyToLocation([parseFloat(first.lon), parseFloat(first.lat)], 12, 'Search Query');
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

    // Intelligent tile prefetching - predictively cache adjacent tiles
    useEffect(() => {
        if (!map.current || !isMapReady) return;

        let prefetchTimeout: NodeJS.Timeout;

        const handleMoveEnd = () => {
            // Debounce prefetching to avoid excessive requests during active panning
            clearTimeout(prefetchTimeout);
            prefetchTimeout = setTimeout(() => {
                const zoom = Math.floor(map.current!.getZoom());
                const center = map.current!.getCenter();

                // Convert lat/lng to tile coordinates
                const lat2tile = (lat: number, zoom: number) =>
                    Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, zoom));
                const lng2tile = (lng: number, zoom: number) =>
                    Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));

                const centerTileX = lng2tile(center.lng, zoom);
                const centerTileY = lat2tile(center.lat, zoom);

                // Prefetch 1 tile in each direction (3x3 grid around center)
                const tilesToPrefetch: string[] = [];
                const radius = 1;

                for (let dx = -radius; dx <= radius; dx++) {
                    for (let dy = -radius; dy <= radius; dy++) {
                        const tileX = centerTileX + dx;
                        const tileY = centerTileY + dy;

                        // Prefetch tiles for current base layer
                        const style = MAP_STYLES.find((s) => s.id === currentStyle);
                        const baseLayer = style?.baseLayer || 'satellite';
                        tilesToPrefetch.push(`/api/tiles/${baseLayer}/${zoom}/${tileX}/${tileY}`);

                        // Also prefetch labels if enabled
                        if (style?.showLabels) {
                            tilesToPrefetch.push(`/api/tiles/labels/${zoom}/${tileX}/${tileY}`);
                        }

                        // Also prefetch terrain tiles if terrain is enabled
                        if (terrainEnabled) {
                            tilesToPrefetch.push(`/api/tiles/terrain/${zoom}/${tileX}/${tileY}`);
                        }
                    }
                }

                // Send prefetch request to service worker
                prefetchTiles(tilesToPrefetch).catch(err => {
                    console.error('[Prefetch] Error:', err);
                });

                console.log(`[Prefetch] Queued ${tilesToPrefetch.length} tiles for background caching`);
            }, 1000); // Wait 1 second after user stops moving
        };

        map.current.on('moveend', handleMoveEnd);

        return () => {
            map.current?.off('moveend', handleMoveEnd);
            clearTimeout(prefetchTimeout);
        };
    }, [isMapReady, currentStyle, terrainEnabled]);

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
            <div className={`fixed top-0 left-0 h-full z-[10000] transition-all duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-[400px]' : '-translate-x-full w-[400px] pointer-events-none'}`}>
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
                                                flyToLocation([parseFloat(r.lon), parseFloat(r.lat)], 12, 'Search Result Click');
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
                                        onClick={() => flyToLocation(coords as [number, number], 12, `City Button: ${name}`)}
                                        className="h-10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-[11px] font-bold rounded-lg border border-white/5 transition-all flex items-center justify-center gap-2"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        {name}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => flyToLocation([AUSTRALIA_CENTER.center[0], AUSTRALIA_CENTER.center[1]], AUSTRALIA_CENTER.zoom, 'Global View Reset')}
                                className="w-full mt-4 h-12 bg-red-600/20 hover:bg-red-600/30 text-red-500 hover:text-red-400 text-xs font-black rounded-xl border border-red-500/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                            >
                                <Maximize size={14} /> Global View Reset
                            </button>
                        </section>

                        {/* MAP STYLES: Selector */}
                        <section>
                            <div className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <MapIcon size={12} /> Map Style
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {MAP_STYLES.map((style) => (
                                    <button
                                        key={style.id}
                                        onClick={() => setCurrentStyle(style.id)}
                                        className={`p-3 rounded-xl border transition-all text-left ${
                                            currentStyle === style.id
                                                ? 'bg-blue-600 border-blue-500 text-white'
                                                : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">{style.emoji}</span>
                                            <span className="text-xs font-bold">{style.name}</span>
                                        </div>
                                        <div className="text-[9px] text-white/50 leading-tight">
                                            {style.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* TERRAIN EFFECTS: Single Toggle + Slider */}
                        <section>
                            <div className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Mountain size={12} /> Terrain Effects
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                                {/* Single Toggle for 3D Terrain + Hillshade */}
                                <div className="flex items-center justify-between p-4 px-5">
                                    <div className="flex-1">
                                        <div className="text-white/80 text-xs font-bold flex items-center gap-2">
                                            <span className="text-blue-500"><Mountain size={14} /></span>
                                            3D Terrain
                                        </div>
                                        <div className="text-white/40 text-[9px] mt-0.5">Elevation + hillshade effects</div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={terrainEnabled}
                                            onChange={(e) => setTerrainEnabled(e.target.checked)}
                                        />
                                        <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {/* Terrain Intensity Slider */}
                                {terrainEnabled && (
                                    <div className="p-4 px-5 bg-white/[0.02]">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <div className="text-white/80 text-xs font-bold">Terrain Intensity</div>
                                                <div className="text-white/40 text-[9px] mt-0.5">Elevation exaggeration</div>
                                            </div>
                                            <div className="text-blue-400 font-mono text-xs font-bold">
                                                {terrainExaggeration.toFixed(1)}×
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="3.0"
                                                step="0.1"
                                                value={terrainExaggeration}
                                                onChange={(e) => setTerrainExaggeration(parseFloat(e.target.value))}
                                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex justify-between text-[8px] text-white/30 mt-1.5 font-mono">
                                            <span>0.5× Subtle</span>
                                            <span>1.5× Normal</span>
                                            <span>3.0× Dramatic</span>
                                        </div>
                                    </div>
                                )}
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

                        {/* CAMERA DEBUG: View State */}
                        <section>
                            <div className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Settings size={12} /> Camera Debug
                            </div>
                            <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5 space-y-3 font-mono">
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-white/40 uppercase">Zoom</span>
                                    <span className="text-blue-400 font-bold tabular-nums">{viewState.zoom.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-white/40 uppercase">Pitch</span>
                                    <span className="text-green-400 font-bold tabular-nums">{viewState.pitch.toFixed(0)}°</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-white/40 uppercase">Bearing</span>
                                    <span className="text-yellow-400 font-bold tabular-nums">{viewState.bearing.toFixed(0)}°</span>
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
                    onClick={() => setShowControllerModal(true)}
                    className="h-12 w-12 bg-black/80 backdrop-blur-lg border border-white/10 rounded-2xl flex items-center justify-center text-white/60 hover:text-white hover:bg-blue-600 transition-all shadow-xl group"
                    title="Controller Mapping"
                >
                    <Gamepad2 size={20} className="group-hover:scale-110 transition-transform" />
                </button>
                <button
                    onClick={handleLocateMe}
                    className="h-12 w-12 bg-black/80 backdrop-blur-lg border border-white/10 rounded-2xl flex items-center justify-center text-white/60 hover:text-white hover:bg-blue-600 transition-all shadow-xl group"
                    title="Find My Location"
                >
                    <Locate size={20} className="group-hover:scale-110 transition-transform" />
                </button>
            </div>

            {/* Controller Modal */}
            {showControllerModal && (
                <ControllerModal
                    onClose={() => setShowControllerModal(false)}
                    onSave={(profile: ControllerProfileV2) => {
                        controllerRef.current?.updateProfile(profile);
                        setCurrentProfile(profile);
                    }}
                    onSaveClose={(profile: ControllerProfileV2) => {
                        controllerRef.current?.updateProfile(profile);
                        setCurrentProfile(profile);
                        setShowControllerModal(false);
                    }}
                    mapRef={map.current || undefined}
                />
            )}

            {/* Debug Modal - Always available */}
            <DebugModal
                profile={currentProfile}
                mapRef={map.current || undefined}
            />

            {/* Debug Log Modal - Right side console logs */}
            <DebugLogModal />

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
