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
        <div className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-zinc-900 border-2 border-blue-500 rounded-3xl shadow-2xl p-8 max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Radio className="text-blue-500 animate-pulse" size={24} />
                        <div>
                            <div className="text-white font-bold text-lg">Listening...</div>
                            <div className="text-white/60 text-xs">
                                Binding: <span className="text-blue-400">{actionDef?.label}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="h-8 w-8 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-lg transition-all flex items-center justify-center"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Preview Box */}
                <div className="bg-black/50 border border-blue-500/30 rounded-2xl p-6 mb-6">
                    <div className="text-center">
                        <div className="text-blue-400 text-sm font-mono mb-2">Live Preview</div>
                        <div className="text-white text-lg font-bold">{preview}</div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="text-white/40 text-xs text-center space-y-2">
                    <p>Move a stick or press a button to bind it to this action.</p>
                    <p className="text-white/60 font-bold">
                        Expected: {actionDef?.type === 'axis' ? 'Analog Stick' : 'Button Press'}
                    </p>
                </div>

                {/* Cancel Button */}
                <button
                    onClick={onCancel}
                    className="w-full mt-6 h-10 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold rounded-lg transition-all"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
