'use client';

import { useEffect, useState } from 'react';
import { X, Radio } from 'lucide-react';
import { Binding, COMMAND_DEFINITIONS } from '@/app/lib/gamepad/types-v2';
import { getActiveGamepad } from '@/app/lib/gamepad/gamepad-reader';
import { createSnapshot, detectNewBinding } from '@/app/lib/gamepad/binding-capture';

interface BindModalProps {
    action: string;
    onCapture: (binding: Binding) => void;
    onCancel: () => void;
}

export default function BindModal({ action, onCapture, onCancel }: BindModalProps) {
    const [listening, setListening] = useState(true);
    const [preview, setPreview] = useState<string>('Waiting for input...');

    const actionDef = COMMAND_DEFINITIONS.find(a => a.key === action);

    useEffect(() => {
        let frameId: number;
        let prevSnapshot: ReturnType<typeof createSnapshot> = null;

        const poll = () => {
            if (!listening) return;

            const gp = getActiveGamepad();
            const currSnapshot = createSnapshot(gp);

            const binding = detectNewBinding(prevSnapshot, currSnapshot, 0.12);
            if (binding) {
                setListening(false);
                onCapture(binding);
                return;
            }

            // Update preview
            if (currSnapshot) {
                const strongestAxis = currSnapshot.axes.reduce((max, val, i) => {
                    return Math.abs(val) > Math.abs(currSnapshot.axes[max]) ? i : max;
                }, 0);
                const pressedButtons = currSnapshot.buttons
                    .map((b, i) => ({ i, pressed: b.pressed }))
                    .filter(b => b.pressed);

                if (pressedButtons.length > 0) {
                    setPreview(`Button ${pressedButtons[0].i} pressed`);
                } else if (Math.abs(currSnapshot.axes[strongestAxis]) > 0.3) {
                    setPreview(`Axis ${strongestAxis}: ${currSnapshot.axes[strongestAxis].toFixed(2)}`);
                } else {
                    setPreview('Move stick or press button...');
                }
            } else {
                setPreview('No controller detected!');
            }

            prevSnapshot = currSnapshot;
            frameId = requestAnimationFrame(poll);
        };

        poll();

        return () => {
            if (frameId) cancelAnimationFrame(frameId);
        };
    }, [listening, onCapture]);

    return (
        <div className="fixed inset-0 z-[10001] bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-gradient-to-br from-zinc-900 to-black border-4 border-blue-500 rounded-3xl shadow-2xl shadow-blue-500/50 p-8 max-w-lg w-full animate-in zoom-in-95 duration-300">
                {/* HUGE Listening Indicator */}
                <div className="mb-8 text-center">
                    <div className="relative inline-block">
                        <Radio className="text-blue-500 animate-pulse" size={64} />
                        <div className="absolute inset-0 animate-ping">
                            <Radio className="text-blue-500/50" size={64} />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-white font-black text-3xl uppercase tracking-wider animate-pulse">
                            🎮 LISTENING...
                        </div>
                        <div className="text-blue-400 text-sm mt-2 font-bold">
                            Binding: {actionDef?.label}
                        </div>
                        <div className="text-white/40 text-xs mt-1">
                            {actionDef?.description}
                        </div>
                    </div>
                </div>

                {/* MASSIVE Preview Box with Animation */}
                <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-2 border-blue-500/50 rounded-2xl p-8 mb-6 shadow-inner">
                    <div className="text-center">
                        <div className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-3">
                            ⚡ LIVE DETECTION ⚡
                        </div>
                        <div className="text-white text-2xl font-black mb-2 min-h-[32px] animate-pulse">
                            {preview}
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-4">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse w-full"></div>
                        </div>
                    </div>
                </div>

                {/* Clear Instructions */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                    <div className="text-yellow-300 text-sm font-bold text-center space-y-2">
                        <p className="text-xl">👆 {actionDef?.type === 'axis' ? 'MOVE A STICK' : 'PRESS A BUTTON'}</p>
                        <p className="text-xs text-yellow-200/80">
                            {actionDef?.type === 'axis'
                                ? 'Move any analog stick to capture axis input'
                                : 'Press any button on your controller to bind it'
                            }
                        </p>
                    </div>
                </div>

                {/* Cancel Button */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 h-12 bg-red-600/20 hover:bg-red-600/30 border-2 border-red-500/50 text-red-300 text-sm font-black rounded-xl transition-all uppercase tracking-wider"
                    >
                        ✕ Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
