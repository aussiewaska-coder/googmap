'use client';

import { ButtonLabel } from '@/app/lib/gamepad/types-v2';
import { formatButtonLabel } from '@/app/lib/gamepad/label-helpers';
import { Circle, Check } from 'lucide-react';

interface WizardStepProps {
    label: ButtonLabel;
    detectedIndex: number | null;
    isListening: boolean;
    hasLabel: boolean;
    capturedIndex?: number;
}

// Button icon components for visual representation
function ButtonIcon({ label, className = '' }: { label: ButtonLabel; className?: string }) {
    const baseClass = `flex items-center justify-center rounded-lg font-bold ${className}`;

    // Face buttons (A/B/X/Y)
    if (['A', 'B', 'X', 'Y'].includes(label)) {
        const colors: Record<string, string> = {
            'A': 'bg-green-500/20 border-green-500/50 text-green-400',
            'B': 'bg-red-500/20 border-red-500/50 text-red-400',
            'X': 'bg-blue-500/20 border-blue-500/50 text-blue-400',
            'Y': 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
        };
        return (
            <div className={`${baseClass} w-20 h-20 border-2 ${colors[label] || 'bg-white/10 border-white/30 text-white'}`}>
                <span className="text-3xl">{label}</span>
            </div>
        );
    }

    // Shoulder buttons (L1/R1/L2/R2)
    if (['L1', 'R1', 'L2', 'R2'].includes(label)) {
        return (
            <div className={`${baseClass} w-24 h-16 bg-white/10 border-2 border-white/30 text-white`}>
                <span className="text-2xl">{label}</span>
            </div>
        );
    }

    // D-pad
    if (label.startsWith('DPAD_')) {
        const arrows: Record<string, string> = {
            'DPAD_UP': '↑',
            'DPAD_DOWN': '↓',
            'DPAD_LEFT': '←',
            'DPAD_RIGHT': '→',
        };
        return (
            <div className={`${baseClass} w-20 h-20 bg-white/10 border-2 border-white/30 text-white`}>
                <span className="text-4xl">{arrows[label]}</span>
            </div>
        );
    }

    // Start/Select
    if (['START', 'SELECT'].includes(label)) {
        return (
            <div className={`${baseClass} w-20 h-12 bg-white/10 border-2 border-white/30 text-white`}>
                <span className="text-xl">{label}</span>
            </div>
        );
    }

    // L3/R3 (stick buttons)
    if (['L3', 'R3'].includes(label)) {
        return (
            <div className={`${baseClass} w-20 h-20 rounded-full bg-white/10 border-2 border-white/30 text-white`}>
                <span className="text-2xl">{label}</span>
            </div>
        );
    }

    // Default
    return (
        <div className={`${baseClass} w-20 h-20 bg-white/10 border-2 border-white/30 text-white`}>
            <span className="text-xl">{label}</span>
        </div>
    );
}

export default function WizardStep({
    label,
    detectedIndex,
    isListening,
    hasLabel,
    capturedIndex,
}: WizardStepProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-8">
            {/* Button Icon */}
            <div className="relative">
                <ButtonIcon label={label} />

                {/* Status indicator */}
                {hasLabel && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-zinc-900 shadow-lg">
                        <Check className="w-5 h-5 text-white" />
                    </div>
                )}
            </div>

            {/* Instruction Text */}
            <div className="text-center">
                <h3 className="text-3xl font-bold text-white mb-2">
                    Press <span className="text-cyan-400">{formatButtonLabel(label)}</span>
                </h3>
                {hasLabel ? (
                    <p className="text-white/60">
                        Captured: Button {capturedIndex} • Press "Retry" to capture again
                    </p>
                ) : (
                    <p className="text-white/60">
                        Press the button on your controller to identify it
                    </p>
                )}
            </div>

            {/* Detection Status */}
            <div className="min-h-[80px] flex items-center justify-center">
                {detectedIndex !== null && (
                    <div className="px-6 py-3 bg-cyan-500/20 border border-cyan-500/50 rounded-lg animate-pulse">
                        <p className="text-cyan-300 font-medium">
                            Detected: Button {detectedIndex}
                        </p>
                    </div>
                )}

                {isListening && detectedIndex === null && !hasLabel && (
                    <div className="px-6 py-3 bg-white/5 border border-white/20 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Circle className="w-5 h-5 text-cyan-400 animate-ping absolute" />
                                <Circle className="w-5 h-5 text-cyan-400" />
                            </div>
                            <p className="text-white/70 font-medium">Listening for input...</p>
                        </div>
                    </div>
                )}

                {!isListening && !hasLabel && detectedIndex === null && (
                    <div className="px-6 py-3 bg-white/5 border border-white/20 rounded-lg">
                        <p className="text-white/50">Paused</p>
                    </div>
                )}

                {hasLabel && !isListening && (
                    <div className="px-6 py-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-400" />
                            <p className="text-green-300 font-medium">Button {capturedIndex} assigned</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Help Text */}
            <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10 max-w-md">
                <p className="text-sm text-white/60 text-center">
                    {label === 'A' && 'Usually the bottom face button (green on Xbox, cross on PlayStation)'}
                    {label === 'B' && 'Usually the right face button (red on Xbox, circle on PlayStation)'}
                    {label === 'X' && 'Usually the left face button (blue on Xbox, square on PlayStation)'}
                    {label === 'Y' && 'Usually the top face button (yellow on Xbox, triangle on PlayStation)'}
                    {label === 'L1' && 'Left bumper / shoulder button (top)'}
                    {label === 'R1' && 'Right bumper / shoulder button (top)'}
                    {label === 'L2' && 'Left trigger (bottom shoulder button)'}
                    {label === 'R2' && 'Right trigger (bottom shoulder button)'}
                    {label.startsWith('DPAD_') && 'Directional pad button'}
                    {label === 'START' && 'Start button (often has ☰ or ▶ symbol)'}
                    {label === 'SELECT' && 'Select button (often has ⧉ or ⏸ symbol)'}
                    {label === 'L3' && 'Left stick press (click the left analog stick)'}
                    {label === 'R3' && 'Right stick press (click the right analog stick)'}
                </p>
            </div>
        </div>
    );
}
