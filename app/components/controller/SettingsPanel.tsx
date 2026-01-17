'use client';

import { ControllerProfile, FlightMode, GlideEasing, FlyEasing } from '@/app/lib/gamepad/types';
import { applyFlightModePreset, detectFlightMode } from '@/app/lib/gamepad/flight-modes';

interface SettingsPanelProps {
    settings: ControllerProfile['settings'];
    onChange: (settings: ControllerProfile['settings']) => void;
    currentPitch?: number;
    onPitchChange?: (pitch: number) => void;
}

export default function SettingsPanel({ settings, onChange, currentPitch = 0, onPitchChange }: SettingsPanelProps) {
    const updateSetting = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
        onChange({ ...settings, [key]: value });
    };

    const handleFlightModeChange = (mode: FlightMode) => {
        // Apply the flight mode preset
        const updatedSettings = applyFlightModePreset(mode, settings);
        onChange(updatedSettings);
    };

    // Detect the actual active mode (null = custom)
    const activeMode = detectFlightMode(settings);
    const isCustom = activeMode === null;

    return (
        <div className="bg-gradient-to-br from-zinc-900/80 to-black/80 border border-blue-500/20 rounded-2xl p-6 shadow-2xl shadow-blue-500/10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                <div className="text-blue-400 font-bold text-sm uppercase tracking-wider">
                    Tactical Control Settings
                </div>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-blue-500/30 to-transparent"></div>
            </div>

            {/* Flight Mode Selection */}
            <div className="mb-8 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">🚁</span>
                    <div>
                        <div className="text-purple-400 font-bold text-sm uppercase tracking-wider">Flight Mode</div>
                        <div className="text-white/40 text-[10px]">
                            {isCustom ? 'Custom settings active' : 'Select your control feel preset'}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <button
                        onClick={() => handleFlightModeChange('joyflight')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                            activeMode === 'joyflight'
                                ? 'bg-gradient-to-br from-purple-600 to-blue-600 border-purple-500 shadow-lg shadow-purple-500/50'
                                : 'bg-black/40 border-white/10 hover:border-purple-500/50 hover:bg-purple-900/20'
                        }`}
                    >
                        <div className="text-white font-bold text-sm mb-1">🎮 Joyflight</div>
                        <div className="text-white/60 text-[10px]">Smooth, gentle</div>
                    </button>
                    <button
                        onClick={() => handleFlightModeChange('fighter')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                            activeMode === 'fighter'
                                ? 'bg-gradient-to-br from-red-600 to-orange-600 border-red-500 shadow-lg shadow-red-500/50'
                                : 'bg-black/40 border-white/10 hover:border-red-500/50 hover:bg-red-900/20'
                        }`}
                    >
                        <div className="text-white font-bold text-sm mb-1">✈️ Fighter Jet</div>
                        <div className="text-white/60 text-[10px]">Snappy, fast</div>
                    </button>
                    <button
                        onClick={() => handleFlightModeChange('ufo')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                            activeMode === 'ufo'
                                ? 'bg-gradient-to-br from-green-600 to-cyan-600 border-green-500 shadow-lg shadow-green-500/50'
                                : 'bg-black/40 border-white/10 hover:border-green-500/50 hover:bg-green-900/20'
                        }`}
                    >
                        <div className="text-white font-bold text-sm mb-1">🛸 UFO</div>
                        <div className="text-white/60 text-[10px]">Fast, floaty</div>
                    </button>
                    <button
                        onClick={() => handleFlightModeChange('satellite')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                            activeMode === 'satellite'
                                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-500 shadow-lg shadow-blue-500/50'
                                : 'bg-black/40 border-white/10 hover:border-blue-500/50 hover:bg-blue-900/20'
                        }`}
                    >
                        <div className="text-white font-bold text-sm mb-1">🛰️ Satellite</div>
                        <div className="text-white/60 text-[10px]">Slow, precise</div>
                    </button>
                    {/* Custom Mode Indicator */}
                    <button
                        disabled
                        className={`p-4 rounded-xl border-2 transition-all ${
                            isCustom
                                ? 'bg-gradient-to-br from-yellow-600 to-amber-600 border-yellow-500 shadow-lg shadow-yellow-500/50'
                                : 'bg-black/40 border-white/10 opacity-50'
                        }`}
                    >
                        <div className="text-white font-bold text-sm mb-1">⚙️ Custom</div>
                        <div className="text-white/60 text-[10px]">Your settings</div>
                    </button>
                </div>
            </div>

            {/* 2-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* LEFT COLUMN: Input Control */}
                <div className="space-y-6">
                    {/* Unified Input Control Box */}
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                        <div className="text-white text-sm font-bold mb-4 flex items-center gap-2">
                            <span className="text-cyan-400">⚡</span>
                            Input Control
                        </div>

                        {/* Deadzone */}
                        <div className="mb-4 pb-4 border-b border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <div className="text-white text-xs font-bold">Deadzone</div>
                                    <div className="text-white/40 text-[9px] uppercase tracking-wide">Drift Prevention</div>
                                </div>
                                <span className="text-cyan-400 font-mono text-xs font-bold px-2 py-1 bg-cyan-500/10 rounded border border-cyan-500/20">
                                    {settings.deadzone.toFixed(2)}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="0.3"
                                step="0.01"
                                value={settings.deadzone}
                                onChange={(e) => updateSetting('deadzone', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-500/50"
                            />
                        </div>

                        {/* Sensitivity */}
                        <div className="mb-4 pb-4 border-b border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <div className="text-white text-xs font-bold">Sensitivity</div>
                                    <div className="text-white/40 text-[9px] uppercase tracking-wide">Response Curve</div>
                                </div>
                                <span className="text-cyan-400 font-mono text-xs font-bold px-2 py-1 bg-cyan-500/10 rounded border border-cyan-500/20">
                                    {settings.sensitivity.toFixed(2)}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.05"
                                value={settings.sensitivity}
                                onChange={(e) => updateSetting('sensitivity', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-500/50"
                            />
                        </div>

                        {/* Smoothing */}
                        <div className="mb-4 pb-4 border-b border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <div className="text-white text-xs font-bold">Smoothing (Inertia)</div>
                                    <div className="text-white/40 text-[9px] uppercase tracking-wide">Flight Feel</div>
                                </div>
                                <span className="text-cyan-400 font-mono text-xs font-bold px-2 py-1 bg-cyan-500/10 rounded border border-cyan-500/20">
                                    {settings.smoothing.toFixed(2)}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="0.30"
                                step="0.01"
                                value={settings.smoothing}
                                onChange={(e) => updateSetting('smoothing', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-500/50"
                            />
                        </div>

                        {/* Axis Inversion */}
                        <div className="text-white/80 text-xs font-bold mb-3">Axis Inversion</div>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Left Stick */}
                            <div className="bg-gradient-to-br from-blue-600/5 to-transparent rounded-lg p-3 border border-blue-500/10">
                                <div className="text-blue-400 text-[10px] font-bold mb-3 text-center uppercase tracking-wider">Left Stick</div>
                                <div className="space-y-2">
                                    {/* Invert X */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="text-white/60 text-[10px] font-mono">←→</div>
                                            <div className="text-white/70 text-[10px] font-bold">X</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={settings.leftStickInvertX}
                                                onChange={(e) => updateSetting('leftStickInvertX', e.target.checked)}
                                            />
                                            <div className="w-8 h-[18px] bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[14px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[14px] after:w-[14px] after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-600 peer-checked:shadow-lg peer-checked:shadow-blue-500/50"></div>
                                        </label>
                                    </div>

                                    {/* Invert Y */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="text-white/60 text-[10px] font-mono">↑↓</div>
                                            <div className="text-white/70 text-[10px] font-bold">Y</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={settings.leftStickInvertY}
                                                onChange={(e) => updateSetting('leftStickInvertY', e.target.checked)}
                                            />
                                            <div className="w-8 h-[18px] bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[14px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[14px] after:w-[14px] after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-600 peer-checked:shadow-lg peer-checked:shadow-blue-500/50"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Right Stick */}
                            <div className="bg-gradient-to-br from-cyan-600/5 to-transparent rounded-lg p-3 border border-cyan-500/10">
                                <div className="text-cyan-400 text-[10px] font-bold mb-3 text-center uppercase tracking-wider">Right Stick</div>
                                <div className="space-y-2">
                                    {/* Invert X */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="text-white/60 text-[10px] font-mono">←→</div>
                                            <div className="text-white/70 text-[10px] font-bold">X</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={settings.rightStickInvertX}
                                                onChange={(e) => updateSetting('rightStickInvertX', e.target.checked)}
                                            />
                                            <div className="w-8 h-[18px] bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[14px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[14px] after:w-[14px] after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-600 peer-checked:shadow-lg peer-checked:shadow-blue-500/50"></div>
                                        </label>
                                    </div>

                                    {/* Invert Y */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="text-white/60 text-[10px] font-mono">↑↓</div>
                                            <div className="text-white/70 text-[10px] font-bold">Y</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={settings.rightStickInvertY}
                                                onChange={(e) => updateSetting('rightStickInvertY', e.target.checked)}
                                            />
                                            <div className="w-8 h-[18px] bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[14px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[14px] after:w-[14px] after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-600 peer-checked:shadow-lg peer-checked:shadow-blue-500/50"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Movement Speeds */}
                <div className="space-y-6">
                    {/* Pan Speed */}
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <div className="text-white text-sm font-bold">Pan Speed</div>
                                <div className="text-white/40 text-[10px] uppercase tracking-wide">Horizontal Movement</div>
                            </div>
                            <span className="text-cyan-400 font-mono text-sm font-bold px-3 py-1 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                                {settings.panSpeedPxPerSec < 600 ? 'SLOW' : settings.panSpeedPxPerSec < 1200 ? 'NORMAL' : 'FAST'}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="100"
                            max="2000"
                            step="50"
                            value={settings.panSpeedPxPerSec}
                            onChange={(e) => updateSetting('panSpeedPxPerSec', parseInt(e.target.value))}
                            className="w-full h-2 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-500/50 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-cyan-400 [&::-moz-range-thumb]:to-blue-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:shadow-blue-500/50"
                        />
                        <div className="flex justify-between text-[9px] text-white/30 mt-2 font-mono uppercase">
                            <span>SLUGGISH</span>
                            <span>NORMAL</span>
                            <span>BLAZING</span>
                        </div>
                    </div>

                    {/* Rotate Speed */}
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <div className="text-white text-sm font-bold">Rotate Speed</div>
                                <div className="text-white/40 text-[10px] uppercase tracking-wide">Bearing Control</div>
                            </div>
                            <span className="text-cyan-400 font-mono text-sm font-bold px-3 py-1 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                                {settings.rotateDegPerSec < 100 ? 'SLOW' : settings.rotateDegPerSec < 180 ? 'NORMAL' : 'FAST'}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="300"
                            step="10"
                            value={settings.rotateDegPerSec}
                            onChange={(e) => updateSetting('rotateDegPerSec', parseInt(e.target.value))}
                            className="w-full h-2 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-500/50 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-cyan-400 [&::-moz-range-thumb]:to-blue-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:shadow-blue-500/50"
                        />
                        <div className="flex justify-between text-[9px] text-white/30 mt-2 font-mono uppercase">
                            <span>CRAWL</span>
                            <span>NORMAL</span>
                            <span>SPIN</span>
                        </div>
                    </div>

                    {/* Pitch Speed */}
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <div className="text-white text-sm font-bold">Pitch Speed</div>
                                <div className="text-white/40 text-[10px] uppercase tracking-wide">Camera Tilt Speed</div>
                            </div>
                            <span className="text-cyan-400 font-mono text-sm font-bold px-3 py-1 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                                {settings.pitchDegPerSec < 70 ? 'SLOW' : settings.pitchDegPerSec < 130 ? 'NORMAL' : 'FAST'}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="200"
                            step="10"
                            value={settings.pitchDegPerSec}
                            onChange={(e) => updateSetting('pitchDegPerSec', parseInt(e.target.value))}
                            className="w-full h-2 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-500/50 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-cyan-400 [&::-moz-range-thumb]:to-blue-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:shadow-blue-500/50"
                        />
                        <div className="flex justify-between text-[9px] text-white/30 mt-2 font-mono uppercase">
                            <span>GENTLE</span>
                            <span>NORMAL</span>
                            <span>SNAP</span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                            <div>
                                <div className="text-white/80 text-xs font-bold">Unlock Max Pitch</div>
                                <div className="text-white/40 text-[9px] uppercase tracking-wide">Allow 85° near-overhead view</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.unlockMaxPitch || false}
                                    onChange={(e) => updateSetting('unlockMaxPitch', e.target.checked)}
                                />
                                <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[16px] after:w-[16px] after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-600 peer-checked:shadow-lg peer-checked:shadow-orange-500/50"></div>
                            </label>
                        </div>
                        <div className="text-[8px] text-white/20 mt-1 text-center italic">
                            {(settings.unlockMaxPitch || false) ? '⚠️ Max pitch unlocked (85° - near overhead)' : 'Tilt angle maxes at 60°'}
                        </div>
                    </div>

                    {/* Current Pitch Angle Slider */}
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <div className="text-white text-sm font-bold">Camera Tilt Angle</div>
                                <div className="text-white/40 text-[10px] uppercase tracking-wide">Direct Pitch Control</div>
                            </div>
                            <span className="text-cyan-400 font-mono text-sm font-bold px-3 py-1 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                                {currentPitch.toFixed(0)}°
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max={(settings.unlockMaxPitch || false) ? "85" : "60"}
                            step="1"
                            value={currentPitch}
                            onChange={(e) => onPitchChange?.(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-500/50 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-cyan-400 [&::-moz-range-thumb]:to-blue-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:shadow-blue-500/50"
                        />
                        <div className="flex justify-between text-[9px] text-white/30 mt-2 font-mono uppercase">
                            <span>0° FLAT</span>
                            <span>45° ANGLED</span>
                            <span>{(settings.unlockMaxPitch || false) ? '85° TOP' : '60° MAX'}</span>
                        </div>
                    </div>

                    {/* Zoom Speed */}
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <div className="text-white text-sm font-bold">Zoom Speed</div>
                                <div className="text-white/40 text-[10px] uppercase tracking-wide">Altitude Control</div>
                            </div>
                            <span className="text-cyan-400 font-mono text-sm font-bold px-3 py-1 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                                {settings.zoomUnitsPerSec < 1.0 ? 'SLOW' : settings.zoomUnitsPerSec < 2.0 ? 'NORMAL' : 'FAST'}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="3.0"
                            step="0.1"
                            value={settings.zoomUnitsPerSec}
                            onChange={(e) => updateSetting('zoomUnitsPerSec', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-500/50 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-cyan-400 [&::-moz-range-thumb]:to-blue-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:shadow-blue-500/50"
                        />
                        <div className="flex justify-between text-[9px] text-white/30 mt-2 font-mono uppercase">
                            <span>SMOOTH</span>
                            <span>NORMAL</span>
                            <span>ROCKET</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced Animation Settings */}
            <div className="mt-8 bg-gradient-to-br from-orange-900/20 to-yellow-900/20 border border-orange-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-5">
                    <span className="text-2xl">⚙️</span>
                    <div>
                        <div className="text-orange-400 font-bold text-sm uppercase tracking-wider">Advanced Animation</div>
                        <div className="text-white/40 text-[10px]">Fine-tune camera motion feel</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Glide Animation (Continuous) */}
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                        <div className="text-white text-sm font-bold mb-4 flex items-center gap-2">
                            <span className="text-cyan-400">〰️</span>
                            Continuous Motion (Glide)
                        </div>

                        {/* Glide Duration */}
                        <div className="mb-4 pb-4 border-b border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <div className="text-white text-xs font-bold">Glide Duration</div>
                                    <div className="text-white/40 text-[9px] uppercase tracking-wide">Motion Smoothness</div>
                                </div>
                                <span className="text-cyan-400 font-mono text-xs font-bold px-2 py-1 bg-cyan-500/10 rounded border border-cyan-500/20">
                                    {settings.glideMs}ms
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="80"
                                step="5"
                                value={settings.glideMs}
                                onChange={(e) => updateSetting('glideMs', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-500/50"
                            />
                        </div>

                        {/* Glide Easing */}
                        <div>
                            <div className="text-white text-xs font-bold mb-2">Glide Easing</div>
                            <select
                                value={settings.glideEasing}
                                onChange={(e) => updateSetting('glideEasing', e.target.value as GlideEasing)}
                                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                            >
                                <option value="linear">Linear</option>
                                <option value="easeOut">Ease Out</option>
                                <option value="easeInOut">Ease In-Out</option>
                            </select>
                        </div>
                    </div>

                    {/* Fly Animation (Discrete) */}
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                        <div className="text-white text-sm font-bold mb-4 flex items-center gap-2">
                            <span className="text-orange-400">🎯</span>
                            Discrete Actions (FlyTo)
                        </div>

                        {/* Fly Speed */}
                        <div className="mb-4 pb-4 border-b border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <div className="text-white text-xs font-bold">Fly Speed</div>
                                    <div className="text-white/40 text-[9px] uppercase tracking-wide">Jump Speed</div>
                                </div>
                                <span className="text-orange-400 font-mono text-xs font-bold px-2 py-1 bg-orange-500/10 rounded border border-orange-500/20">
                                    {settings.flySpeed.toFixed(1)}x
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0.4"
                                max="2.2"
                                step="0.1"
                                value={settings.flySpeed}
                                onChange={(e) => updateSetting('flySpeed', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-orange-400 [&::-webkit-slider-thumb]:to-red-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-orange-500/50"
                            />
                        </div>

                        {/* Fly Curve */}
                        <div className="mb-4 pb-4 border-b border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <div className="text-white text-xs font-bold">Fly Curve</div>
                                    <div className="text-white/40 text-[9px] uppercase tracking-wide">Arc Height</div>
                                </div>
                                <span className="text-orange-400 font-mono text-xs font-bold px-2 py-1 bg-orange-500/10 rounded border border-orange-500/20">
                                    {settings.flyCurve.toFixed(1)}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0.8"
                                max="2.0"
                                step="0.1"
                                value={settings.flyCurve}
                                onChange={(e) => updateSetting('flyCurve', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-orange-400 [&::-webkit-slider-thumb]:to-red-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-orange-500/50"
                            />
                        </div>

                        {/* Fly Easing */}
                        <div>
                            <div className="text-white text-xs font-bold mb-2">Fly Easing</div>
                            <select
                                value={settings.flyEasing}
                                onChange={(e) => updateSetting('flyEasing', e.target.value as FlyEasing)}
                                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                            >
                                <option value="easeOut">Ease Out</option>
                                <option value="easeInOut">Ease In-Out</option>
                                <option value="easeInCubic">Ease In Cubic</option>
                                <option value="easeOutQuint">Ease Out Quint</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
