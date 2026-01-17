'use client';

import { useState, useEffect } from 'react';
import { X, Gamepad2, Download, Upload, RefreshCw, Save } from 'lucide-react';
import { getActiveGamepad } from '@/app/lib/gamepad/gamepad-reader';
import { ControllerProfileV2 } from '@/app/lib/gamepad/types-v2';
import { exportProfile, importProfile } from '@/app/lib/gamepad/storage';

interface ControllerHeaderProps {
    profile: ControllerProfileV2;
    onClose: () => void;
    onSaveClose: () => void;
    onPreset: () => void;
    onReset: () => void;
    onImport: (profile: ControllerProfileV2) => void;
}

export default function ControllerHeader({ profile, onClose, onSaveClose, onPreset, onReset, onImport }: ControllerHeaderProps) {
    const [gamepadConnected, setGamepadConnected] = useState(false);
    const [gamepadName, setGamepadName] = useState('');

    useEffect(() => {
        let frameId: number;
        const poll = () => {
            const gp = getActiveGamepad();
            setGamepadConnected(!!gp);
            setGamepadName(gp?.id || '');
            frameId = requestAnimationFrame(poll);
        };
        poll();
        return () => cancelAnimationFrame(frameId);
    }, []);

    return (
        <div className="bg-zinc-900/95 border-b border-white/10 p-6 flex items-center justify-between">
            {/* Left: Title + Status */}
            <div className="flex items-center gap-4">
                <Gamepad2 className="text-blue-500" size={32} />
                <div>
                    <h2 className="text-white font-black text-xl tracking-tight">Controller Mapping</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${gamepadConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-xs text-white/60 font-mono">
                            {gamepadConnected ? gamepadName.split('(')[0].trim() : 'No controller detected'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => exportProfile(profile)}
                    className="h-10 px-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                    title="Export profile to file"
                >
                    <Download size={14} />
                    Export
                </button>
                <button
                    onClick={async () => {
                        try {
                            const imported = await importProfile();
                            onImport(imported);
                        } catch (err) {
                            console.error('Import failed:', err);
                        }
                    }}
                    className="h-10 px-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                    title="Import profile from file"
                >
                    <Upload size={14} />
                    Import
                </button>
                <button
                    onClick={onPreset}
                    className="h-10 px-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                    title="Apply Tactical Preset"
                >
                    <RefreshCw size={14} />
                    Preset
                </button>
                <button
                    onClick={onReset}
                    className="h-10 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-bold rounded-lg transition-all"
                    title="Reset to Default"
                >
                    Reset
                </button>
                <button
                    onClick={onSaveClose}
                    className="h-10 px-4 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                >
                    <Save size={14} />
                    Save & Close
                </button>
                <button
                    onClick={onClose}
                    className="h-10 w-10 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-lg transition-all flex items-center justify-center"
                    title="Close without saving"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}
