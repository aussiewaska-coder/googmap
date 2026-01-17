'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Gamepad2, AlertCircle } from 'lucide-react';

export default function GamepadMapPage() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [gamepadConnected, setGamepadConnected] = useState(false);
    const [gamepadIndex, setGamepadIndex] = useState<number | null>(null);
    const [status, setStatus] = useState('Press a button on your gamepad to begin...');
    const [viewState, setViewState] = useState({
        lng: 133.7751,
        lat: -25.2744,
        zoom: 4,
        pitch: 0,
        bearing: 0,
    });

    // Initialize map
    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    'esri-imagery': {
                        type: 'raster',
                        tiles: [
                            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                        ],
                        tileSize: 256,
                        attribution: '© Esri',
                    },
                },
                layers: [
                    {
                        id: 'esri-imagery-layer',
                        type: 'raster',
                        source: 'esri-imagery',
                    },
                ],
            },
            center: [viewState.lng, viewState.lat],
            zoom: viewState.zoom,
        });

        const m = map.current;

        m.addControl(new maplibregl.NavigationControl(), 'top-right');
        m.addControl(new maplibregl.ScaleControl(), 'bottom-left');

        m.on('move', () => {
            const center = m.getCenter();
            setViewState({
                lng: parseFloat(center.lng.toFixed(4)),
                lat: parseFloat(center.lat.toFixed(4)),
                zoom: parseFloat(m.getZoom().toFixed(2)),
                pitch: parseFloat(m.getPitch().toFixed(0)),
                bearing: parseFloat(m.getBearing().toFixed(0)),
            });
        });

        return () => {
            m.remove();
        };
    }, []);

    // Gamepad connection handlers
    useEffect(() => {
        const handleGamepadConnected = (e: GamepadEvent) => {
            console.log('Gamepad connected:', e.gamepad.id);
            setGamepadConnected(true);
            setGamepadIndex(e.gamepad.index);
            setStatus(`Gamepad connected: ${e.gamepad.id}`);
        };

        const handleGamepadDisconnected = (e: GamepadEvent) => {
            console.log('Gamepad disconnected');
            setGamepadConnected(false);
            setGamepadIndex(null);
            setStatus('Gamepad disconnected. Reconnect to continue.');
        };

        window.addEventListener('gamepadconnected', handleGamepadConnected);
        window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

        return () => {
            window.removeEventListener('gamepadconnected', handleGamepadConnected);
            window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
        };
    }, []);

    // Gamepad polling loop
    useEffect(() => {
        let animationFrameId: number;
        let zoomDiff = 0;
        let pitchDiff = 0;
        let bearingDiff = 0;

        const scaleClamp = (x: number, scale: number, threshold: number) => {
            return Math.abs(x) < threshold ? 0 : x * scale;
        };

        const pollGamepad = () => {
            if (!map.current) {
                animationFrameId = requestAnimationFrame(pollGamepad);
                return;
            }

            const gamepads = navigator.getGamepads();
            const gamepad = gamepadIndex !== null ? gamepads[gamepadIndex] : null;

            if (gamepad) {
                // Left stick: Pan (axes 0 and 1)
                const leftX = gamepad.axes[0] || 0;
                const leftY = gamepad.axes[1] || 0;

                // Right stick: Zoom and bearing (axes 2 and 3)
                const rightX = gamepad.axes[2] || 0;
                const rightY = gamepad.axes[3] || 0;

                // Pan speed depends on zoom depth
                const currentZoom = map.current.getZoom();
                const panScale = currentZoom / 30 * 100;

                const panX = scaleClamp(leftX, panScale, 0.15);
                const panY = scaleClamp(leftY, panScale, 0.15);

                if (panX !== 0 || panY !== 0) {
                    map.current.panBy([panX, panY], { animate: false });
                }

                // Zoom control (right stick Y-axis)
                zoomDiff += scaleClamp(-rightY, 0.05, 0.15);
                if (Math.abs(zoomDiff) > 0.1) {
                    const newZoom = currentZoom + zoomDiff;
                    map.current.setZoom(newZoom);
                    zoomDiff = 0;
                }

                // Bearing control (right stick X-axis)
                bearingDiff += scaleClamp(rightX, 2, 0.15);
                if (Math.abs(bearingDiff) > 1) {
                    const currentBearing = map.current.getBearing();
                    map.current.setBearing(currentBearing + bearingDiff);
                    bearingDiff = 0;
                }

                // Pitch control (triggers/shoulder buttons)
                // L2/LT = axes[6] or buttons[6]
                // R2/RT = axes[7] or buttons[7]
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

                // Button controls (optional - add more as needed)
                // A button (button 0) - Reset view
                if (gamepad.buttons[0]?.pressed) {
                    map.current.flyTo({
                        center: [133.7751, -25.2744],
                        zoom: 4,
                        pitch: 0,
                        bearing: 0,
                    });
                }
            }

            animationFrameId = requestAnimationFrame(pollGamepad);
        };

        pollGamepad();

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [gamepadIndex]);

    return (
        <div className="relative w-full h-screen bg-black">
            {/* Map Container */}
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

            {/* Crosshairs */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
                <div className="w-8 h-8 border-2 border-white/40">
                    <div className="absolute top-0 left-1/2 w-px h-full bg-white/40" />
                    <div className="absolute left-0 top-1/2 w-full h-px bg-white/40" />
                </div>
            </div>

            {/* Status Panel */}
            <div className="fixed top-6 left-6 bg-black/90 backdrop-blur-lg border border-white/20 rounded-xl p-6 shadow-2xl z-20 max-w-md">
                <div className="flex items-center gap-3 mb-4">
                    <Gamepad2
                        className={gamepadConnected ? 'text-green-400' : 'text-white/40'}
                        size={24}
                    />
                    <h1 className="text-white font-bold text-xl">Gamepad Map Control</h1>
                </div>

                <div className={`flex items-start gap-2 mb-4 p-3 rounded-lg ${
                    gamepadConnected ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'
                }`}>
                    <AlertCircle className={gamepadConnected ? 'text-green-400' : 'text-yellow-400'} size={16} />
                    <p className="text-sm text-white/80">{status}</p>
                </div>

                {gamepadConnected && (
                    <div className="space-y-3">
                        <div className="text-white/60 text-xs font-bold uppercase mb-2">Controls</div>
                        <div className="space-y-1.5 text-xs text-white/80">
                            <div className="flex justify-between">
                                <span className="text-white/50">Left Stick:</span>
                                <span>Pan map</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Right Stick Y:</span>
                                <span>Zoom in/out</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Right Stick X:</span>
                                <span>Rotate bearing</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">L2/R2 Triggers:</span>
                                <span>Tilt pitch</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">A Button:</span>
                                <span>Reset view</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Camera Info */}
            <div className="fixed bottom-6 left-6 bg-black/90 backdrop-blur-lg border border-white/20 rounded-xl p-4 shadow-2xl z-20 font-mono text-xs">
                <div className="text-blue-400 font-bold mb-3 uppercase tracking-wider">Camera</div>
                <div className="space-y-2 text-white/80">
                    <div className="flex justify-between gap-6">
                        <span className="text-white/50">Lat:</span>
                        <span className="text-white">{viewState.lat.toFixed(4)}°</span>
                    </div>
                    <div className="flex justify-between gap-6">
                        <span className="text-white/50">Lng:</span>
                        <span className="text-white">{viewState.lng.toFixed(4)}°</span>
                    </div>
                    <div className="flex justify-between gap-6">
                        <span className="text-white/50">Zoom:</span>
                        <span className="text-blue-400">{viewState.zoom.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                        <span className="text-white/50">Pitch:</span>
                        <span className="text-green-400">{viewState.pitch}°</span>
                    </div>
                    <div className="flex justify-between gap-6">
                        <span className="text-white/50">Bearing:</span>
                        <span className="text-yellow-400">{viewState.bearing}°</span>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            {!gamepadConnected && (
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className="text-center">
                        <Gamepad2 className="mx-auto mb-4 text-white/20" size={64} />
                        <p className="text-white/60 text-lg font-medium">
                            Connect a gamepad to begin
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
