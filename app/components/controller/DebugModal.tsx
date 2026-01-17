'use client';

import { useState, useEffect } from 'react';
import { ControllerProfileV2 } from '@/app/lib/gamepad/types-v2';
import { getActiveGamepad, readBindingValue, applyDeadzone } from '@/app/lib/gamepad/gamepad-reader';
import maplibregl from 'maplibre-gl';

interface DebugModalProps {
    profile: ControllerProfileV2;
    mapRef?: maplibregl.Map;
}

export default function DebugModal({ profile, mapRef }: DebugModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [gamepadState, setGamepadState] = useState<{
        panX: number;
        panY: number;
        rotate: number;
        pitch: number;
        rawPanX: number;
        rawPanY: number;
        rawRotate: number;
        rawPitch: number;
    }>({
        panX: 0,
        panY: 0,
        rotate: 0,
        pitch: 0,
        rawPanX: 0,
        rawPanY: 0,
        rawRotate: 0,
        rawPitch: 0,
    });
    const [mapState, setMapState] = useState({
        bearing: 0,
        pitch: 0,
        zoom: 0,
        center: [0, 0] as [number, number],
    });

    // Update gamepad state
    useEffect(() => {
        const interval = setInterval(() => {
            const gp = getActiveGamepad();
            if (gp && profile.bindings && profile.bindings.map) {
                const rawPanX = readBindingValue(gp, profile.bindings.map['MAP.PAN_X']);
                const rawPanY = readBindingValue(gp, profile.bindings.map['MAP.PAN_Y']);
                const rawRotate = readBindingValue(gp, profile.bindings.map['MAP.ROTATE_X']);
                const rawPitch = readBindingValue(gp, profile.bindings.map['MAP.PITCH_Y']);

                setGamepadState({
                    rawPanX,
                    rawPanY,
                    rawRotate,
                    rawPitch,
                    panX: applyDeadzone(rawPanX, profile.settings.deadzone),
                    panY: applyDeadzone(rawPanY, profile.settings.deadzone),
                    rotate: applyDeadzone(rawRotate, profile.settings.deadzone),
                    pitch: applyDeadzone(rawPitch, profile.settings.deadzone),
                });
            }
        }, 50);

        return () => clearInterval(interval);
    }, [profile]);

    // Update map state
    useEffect(() => {
        if (!mapRef) return;

        const updateMapState = () => {
            setMapState({
                bearing: mapRef.getBearing(),
                pitch: mapRef.getPitch(),
                zoom: mapRef.getZoom(),
                center: [mapRef.getCenter().lng, mapRef.getCenter().lat],
            });
        };

        updateMapState();
        mapRef.on('move', updateMapState);

        return () => {
            mapRef.off('move', updateMapState);
        };
    }, [mapRef]);

    return (
        <>
            {/* Toggle Button - Fixed position on right side */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed top-20 right-2 z-[1001] bg-purple-600 text-white px-3 py-2 rounded-lg shadow-lg text-xs font-bold"
            >
                {isOpen ? '✕' : '🐛'}
            </button>

            {/* Debug Panel - Slide in from right */}
            <div
                className={`fixed top-0 right-0 h-full w-80 bg-black/95 text-white z-[1000] overflow-y-auto transition-transform duration-300 ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="p-4 pt-20 space-y-4">
                    <h2 className="text-lg font-bold text-purple-400 mb-4">🐛 Controller Debug</h2>

                    {/* Flight Mode */}
                    <Section title="Flight Mode">
                        <Value label="Active Mode" value={profile.settings.flightMode} />
                    </Section>

                    {/* Input Processing */}
                    <Section title="Input Processing">
                        <Value label="Deadzone" value={profile.settings.deadzone.toFixed(2)} />
                        <Value label="Smoothing" value={profile.settings.smoothing.toFixed(2)} />
                        <Value label="Sensitivity (Global ×)" value={`${profile.settings.sensitivity.toFixed(2)}×`} />
                        <Value label="Zoom Intensity" value={profile.settings.zoomIntensity.toFixed(1)} />
                    </Section>

                    {/* Movement Speeds (per second) */}
                    <Section title="Base Speeds (preset)">
                        <Value label="Pan" value={`${profile.settings.panSpeedPxPerSec} px/s`} />
                        <Value label="Rotate" value={`${profile.settings.rotateDegPerSec}°/s`} />
                        <Value label="Pitch" value={`${profile.settings.pitchDegPerSec}°/s`} />
                        <Value label="Zoom" value={`${profile.settings.zoomUnitsPerSec} u/s`} />
                    </Section>

                    {/* Effective Speeds (base × sensitivity) */}
                    <Section title="Effective Speeds (×sensitivity)">
                        <Value
                            label="Pan"
                            value={`${Math.round(profile.settings.panSpeedPxPerSec * profile.settings.sensitivity)} px/s`}
                        />
                        <Value
                            label="Rotate"
                            value={`${Math.round(profile.settings.rotateDegPerSec * profile.settings.sensitivity)}°/s`}
                        />
                        <Value
                            label="Pitch"
                            value={`${Math.round(profile.settings.pitchDegPerSec * profile.settings.sensitivity)}°/s`}
                        />
                        <Value
                            label="Zoom"
                            value={`${(profile.settings.zoomUnitsPerSec * profile.settings.sensitivity).toFixed(1)} u/s`}
                        />
                    </Section>

                    {/* Button Animation Settings */}
                    <Section title="Button Animation (flyTo)">
                        <Value label="Fly Speed" value={profile.settings.flySpeed.toFixed(2)} />
                        <Value label="Fly Curve" value={profile.settings.flyCurve.toFixed(2)} />
                        <Value label="Fly Easing" value={profile.settings.flyEasing} />
                    </Section>

                    {/* Camera Limits */}
                    <Section title="Camera Limits">
                        <Value
                            label="Max Pitch"
                            value={profile.settings.unlockMaxPitch ? '85°' : '60°'}
                        />
                    </Section>

                    {/* Real-time Gamepad Input */}
                    <Section title="Gamepad Input (Raw)">
                        <ProgressBar label="Pan X" value={gamepadState.rawPanX} />
                        <ProgressBar label="Pan Y" value={gamepadState.rawPanY} />
                        <ProgressBar label="Rotate" value={gamepadState.rawRotate} />
                        <ProgressBar label="Pitch" value={gamepadState.rawPitch} />
                    </Section>

                    {/* Processed Input */}
                    <Section title="Processed Input">
                        <ProgressBar label="Pan X" value={gamepadState.panX} />
                        <ProgressBar label="Pan Y" value={gamepadState.panY} />
                        <ProgressBar label="Rotate" value={gamepadState.rotate} />
                        <ProgressBar label="Pitch" value={gamepadState.pitch} />
                    </Section>

                    {/* Map State */}
                    <Section title="Map Camera State">
                        <Value label="Bearing" value={`${mapState.bearing.toFixed(1)}°`} />
                        <Value label="Pitch" value={`${mapState.pitch.toFixed(1)}°`} />
                        <Value label="Zoom" value={mapState.zoom.toFixed(2)} />
                        <Value
                            label="Center"
                            value={`${mapState.center[0].toFixed(4)}, ${mapState.center[1].toFixed(4)}`}
                        />
                    </Section>

                    {/* MapLibre API Reference */}
                    <Section title="MapLibre Camera Methods">
                        <div className="text-xs space-y-1 text-gray-400">
                            <div><span className="text-green-400">panBy()</span> - instant pan</div>
                            <div><span className="text-green-400">panTo()</span> - animated pan</div>
                            <div><span className="text-green-400">rotateTo()</span> - animated rotate</div>
                            <div><span className="text-green-400">easeTo()</span> - smooth camera</div>
                            <div><span className="text-green-400">flyTo()</span> - arc transition</div>
                            <div><span className="text-green-400">jumpTo()</span> - instant move</div>
                            <div className="mt-2 pt-2 border-t border-gray-700">
                                <div><span className="text-blue-400">duration</span> - ms (0 = instant)</div>
                                <div><span className="text-blue-400">easing</span> - timing function</div>
                                <div><span className="text-blue-400">around</span> - pivot point</div>
                            </div>
                        </div>
                    </Section>
                </div>
            </div>
        </>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border-b border-gray-700 pb-3">
            <h3 className="text-sm font-bold text-gray-300 mb-2">{title}</h3>
            <div className="space-y-1.5">
                {children}
            </div>
        </div>
    );
}

function Value({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex justify-between text-xs">
            <span className="text-gray-400">{label}:</span>
            <span className="font-mono text-green-400">{value}</span>
        </div>
    );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
    const percentage = Math.abs(value) * 100;
    const isNegative = value < 0;

    return (
        <div className="space-y-0.5">
            <div className="flex justify-between text-xs">
                <span className="text-gray-400">{label}:</span>
                <span className="font-mono text-green-400">{value.toFixed(2)}</span>
            </div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all ${isNegative ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                />
            </div>
        </div>
    );
}
