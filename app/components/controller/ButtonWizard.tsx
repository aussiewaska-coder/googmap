'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, SkipForward, RotateCcw, Check } from 'lucide-react';
import { ButtonLabel, ControllerProfileV2 } from '@/app/lib/gamepad/types-v2';
import { detectLabelConflict, formatButtonLabel } from '@/app/lib/gamepad/label-helpers';
import { applyDefaultCommandBindings } from '@/app/lib/gamepad/defaults-v2';
import { getActiveGamepad } from '@/app/lib/gamepad/gamepad-reader';
import WizardStep from './WizardStep';

interface ButtonWizardProps {
    profile: ControllerProfileV2;
    onComplete: (profile: ControllerProfileV2) => void;
    onCancel: () => void;
}

// Wizard step sequence (14 steps total)
const WIZARD_STEPS: ButtonLabel[] = [
    'A',
    'B',
    'X',
    'Y',
    'L2',
    'R2',
    'DPAD_UP',
    'DPAD_DOWN',
    'DPAD_LEFT',
    'DPAD_RIGHT',
    'START',
    'SELECT',
    // Optional (can skip):
    'L3',
    'R3',
    'L1',
    'R1',
];

interface GamepadSnapshot {
    buttons: boolean[];
}

function createSnapshot(gamepad: Gamepad | null): GamepadSnapshot {
    if (!gamepad) {
        return { buttons: [] };
    }

    return {
        buttons: Array.from(gamepad.buttons).map(b => b.pressed),
    };
}

function detectButtonPress(prev: GamepadSnapshot, curr: GamepadSnapshot): number | null {
    for (let i = 0; i < curr.buttons.length; i++) {
        const was = prev.buttons[i] || false;
        const now = curr.buttons[i] || false;
        if (!was && now) {
            return i; // Edge detected: false → true
        }
    }
    return null;
}

export default function ButtonWizard({ profile, onComplete, onCancel }: ButtonWizardProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [labels, setLabels] = useState<Partial<Record<ButtonLabel, number>>>(profile.labels || {});
    const [capturedIndices, setCapturedIndices] = useState<Set<number>>(
        new Set(Object.values(profile.labels || {}).filter((idx): idx is number => idx !== undefined))
    );
    const [isListening, setIsListening] = useState(true);
    const [detectedIndex, setDetectedIndex] = useState<number | null>(null);
    const [conflictWarning, setConflictWarning] = useState<{
        existingLabel: ButtonLabel;
        index: number;
    } | null>(null);
    const [mounted, setMounted] = useState(false);

    const prevSnapshotRef = useRef<GamepadSnapshot>(createSnapshot(null));
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Gamepad polling loop
    useEffect(() => {
        if (!isListening) return;

        const loop = () => {
            const gamepad = getActiveGamepad();
            const currSnapshot = createSnapshot(gamepad);

            const buttonIndex = detectButtonPress(prevSnapshotRef.current, currSnapshot);

            if (buttonIndex !== null) {
                setDetectedIndex(buttonIndex);

                // Check for conflict
                const currentLabel = WIZARD_STEPS[currentStepIndex];
                const conflictingLabel = detectLabelConflict(labels, buttonIndex, currentLabel);

                if (conflictingLabel) {
                    // Show conflict warning
                    setConflictWarning({
                        existingLabel: conflictingLabel,
                        index: buttonIndex,
                    });
                    setIsListening(false);
                } else {
                    // Capture immediately
                    handleCapture(buttonIndex);
                }
            }

            prevSnapshotRef.current = currSnapshot;
            animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isListening, currentStepIndex, labels]);

    const handleCapture = (index: number) => {
        const currentLabel = WIZARD_STEPS[currentStepIndex];

        // Update labels
        const newLabels = { ...labels, [currentLabel]: index };
        setLabels(newLabels);

        // Update captured indices
        setCapturedIndices(prev => new Set([...prev, index]));

        // Reset detection
        setDetectedIndex(null);
        setIsListening(false);

        // Auto-advance after short delay
        setTimeout(() => {
            if (currentStepIndex < WIZARD_STEPS.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
                setIsListening(true);
            }
        }, 300);
    };

    const handleConflictReplace = () => {
        if (!conflictWarning || detectedIndex === null) return;

        const currentLabel = WIZARD_STEPS[currentStepIndex];

        // Remove old label assignment
        const newLabels = { ...labels };
        delete newLabels[conflictWarning.existingLabel];
        newLabels[currentLabel] = detectedIndex;

        setLabels(newLabels);
        setConflictWarning(null);
        setDetectedIndex(null);
        setIsListening(false);

        // Auto-advance
        setTimeout(() => {
            if (currentStepIndex < WIZARD_STEPS.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
                setIsListening(true);
            }
        }, 300);
    };

    const handleConflictCancel = () => {
        setConflictWarning(null);
        setDetectedIndex(null);
        setIsListening(true);
    };

    const handleSkip = () => {
        setDetectedIndex(null);
        setIsListening(false);

        setTimeout(() => {
            if (currentStepIndex < WIZARD_STEPS.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
                setIsListening(true);
            }
        }, 200);
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
            setDetectedIndex(null);
            setIsListening(true);
        }
    };

    const handleRetry = () => {
        const currentLabel = WIZARD_STEPS[currentStepIndex];

        // Clear current label
        const newLabels = { ...labels };
        const oldIndex = newLabels[currentLabel];
        delete newLabels[currentLabel];

        setLabels(newLabels);

        // Remove from captured indices if this was the only label using it
        if (oldIndex !== undefined) {
            const stillUsed = Object.values(newLabels).includes(oldIndex);
            if (!stillUsed) {
                setCapturedIndices(prev => {
                    const next = new Set(prev);
                    next.delete(oldIndex);
                    return next;
                });
            }
        }

        setDetectedIndex(null);
        setIsListening(true);
    };

    const handleFinish = () => {
        // Apply labels to profile
        let updatedProfile: ControllerProfileV2 = {
            ...profile,
            labels,
        };

        // Apply default command bindings based on labels
        updatedProfile = applyDefaultCommandBindings(updatedProfile);

        console.log('[Wizard] Completed with', Object.keys(labels).length, 'labels');
        onComplete(updatedProfile);
    };

    const currentLabel = WIZARD_STEPS[currentStepIndex];
    const progress = ((currentStepIndex + 1) / WIZARD_STEPS.length) * 100;
    const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;
    const hasCurrentLabel = labels[currentLabel] !== undefined;

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[20000] bg-black/98 backdrop-blur-xl flex items-center justify-center p-4">
            {/* Wizard Container */}
            <div className="bg-zinc-900/95 border border-white/10 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Identify Controller Buttons</h2>
                        <p className="text-sm text-white/60 mt-1">
                            Step {currentStepIndex + 1} of {WIZARD_STEPS.length}
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-white/70" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-8 py-4 border-b border-white/10">
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <WizardStep
                        label={currentLabel}
                        detectedIndex={detectedIndex}
                        isListening={isListening}
                        hasLabel={hasCurrentLabel}
                        capturedIndex={labels[currentLabel]}
                    />
                </div>

                {/* Conflict Warning */}
                {conflictWarning && (
                    <div className="mx-8 mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                        <p className="text-orange-400 text-sm font-medium mb-3">
                            Button {conflictWarning.index} is already assigned to{' '}
                            <span className="font-bold">{formatButtonLabel(conflictWarning.existingLabel)}</span>.
                            Replace?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleConflictReplace}
                                className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Replace
                            </button>
                            <button
                                onClick={handleConflictCancel}
                                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="px-8 py-6 border-t border-white/10 flex items-center justify-between gap-4">
                    <div className="flex gap-3">
                        <button
                            onClick={handleBack}
                            disabled={currentStepIndex === 0}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </button>

                        <button
                            onClick={handleRetry}
                            disabled={!hasCurrentLabel}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Retry
                        </button>

                        <button
                            onClick={handleSkip}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
                        >
                            <SkipForward className="w-4 h-4" />
                            Skip
                        </button>
                    </div>

                    {isLastStep ? (
                        <button
                            onClick={handleFinish}
                            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg text-white font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
                        >
                            <Check className="w-5 h-5" />
                            Finish & Apply Defaults
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setCurrentStepIndex(prev => prev + 1);
                                setDetectedIndex(null);
                                setIsListening(true);
                            }}
                            className="px-6 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 rounded-lg text-white font-medium flex items-center gap-2 transition-all"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
