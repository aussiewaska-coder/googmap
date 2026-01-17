'use client';

import { ControllerProfile } from '@/app/lib/gamepad/types';

interface SettingsPanelProps {
    settings: ControllerProfile['settings'];
    onChange: (settings: ControllerProfile['settings']) => void;
}

export default function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
    const updateSetting = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
        onChange({ ...settings, [key]: value });
    };

    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="text-blue-500 font-bold text-xs uppercase tracking-wider mb-4">
                Control Settings
            </div>

            {/* Deadzone */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <div className="text-white text-sm font-bold">Deadzone</div>
                        <div className="text-white/40 text-xs">Prevents stick drift</div>
                    </div>
                    <span className="text-blue-400 font-mono text-sm font-bold">
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
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-0"
                />
                <div className="flex justify-between text-xs text-white/30 mt-1">
                    <span>0.00</span>
                    <span>0.15</span>
                    <span>0.30</span>
                </div>
            </div>

            {/* Sensitivity */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <div className="text-white text-sm font-bold">Sensitivity</div>
                        <div className="text-white/40 text-xs">Control responsiveness</div>
                    </div>
                    <span className="text-blue-400 font-mono text-sm font-bold">
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
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-0"
                />
                <div className="flex justify-between text-xs text-white/30 mt-1">
                    <span>0.50 Slow</span>
                    <span>1.25 Normal</span>
                    <span>2.00 Fast</span>
                </div>
            </div>

            {/* Invert Y */}
            <div className="pt-4 border-t border-white/5">
                <div className="text-white text-sm font-bold mb-3">Invert Y-Axis</div>
                <div className="grid grid-cols-4 gap-2">
                    {(['none', 'left', 'right', 'both'] as const).map((option) => (
                        <button
                            key={option}
                            onClick={() => updateSetting('invertY', option)}
                            className={`h-9 text-xs font-bold rounded-lg transition-all ${
                                settings.invertY === option
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                            }`}
                        >
                            {option === 'none' ? 'None' : option === 'both' ? 'Both' : option.charAt(0).toUpperCase() + option.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Speed Settings */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                    <div className="text-white/60 text-xs font-bold mb-2">Pan Speed</div>
                    <input
                        type="number"
                        min="100"
                        max="2000"
                        step="50"
                        value={settings.panSpeedPxPerSec}
                        onChange={(e) => updateSetting('panSpeedPxPerSec', parseInt(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    />
                </div>
                <div>
                    <div className="text-white/60 text-xs font-bold mb-2">Rotate Speed</div>
                    <input
                        type="number"
                        min="10"
                        max="300"
                        step="10"
                        value={settings.rotateDegPerSec}
                        onChange={(e) => updateSetting('rotateDegPerSec', parseInt(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    />
                </div>
                <div>
                    <div className="text-white/60 text-xs font-bold mb-2">Pitch Speed</div>
                    <input
                        type="number"
                        min="10"
                        max="200"
                        step="10"
                        value={settings.pitchDegPerSec}
                        onChange={(e) => updateSetting('pitchDegPerSec', parseInt(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    />
                </div>
                <div>
                    <div className="text-white/60 text-xs font-bold mb-2">Zoom Speed</div>
                    <input
                        type="number"
                        min="0.1"
                        max="3.0"
                        step="0.1"
                        value={settings.zoomUnitsPerSec}
                        onChange={(e) => updateSetting('zoomUnitsPerSec', parseFloat(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    />
                </div>
            </div>
        </div>
    );
}
