'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ControllerProfile } from '@/app/lib/gamepad/types';
import { loadSessionProfile, saveSessionProfile } from '@/app/lib/gamepad/storage';
import { applyTacticalPreset, DEFAULT_PROFILE } from '@/app/lib/gamepad/defaults';
import ControllerHeader from './ControllerHeader';
import LiveVisualization from './LiveVisualization';
import BindingsList from './BindingsList';
import SettingsPanel from './SettingsPanel';
import BindModal from './BindModal';

interface ControllerModalProps {
    onClose: () => void;
    onSave: (profile: ControllerProfile) => void;
}

export default function ControllerModal({ onClose, onSave }: ControllerModalProps) {
    const [profile, setProfile] = useState<ControllerProfile>(() => {
        return loadSessionProfile() || applyTacticalPreset();
    });
    const [bindingAction, setBindingAction] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSaveClose = () => {
        saveSessionProfile(profile);
        onSave(profile);
    };

    const handlePreset = () => {
        const presetProfile = applyTacticalPreset();
        setProfile(presetProfile);
        // Immediately apply to MapController
        onSave(presetProfile);
    };

    const handleReset = () => {
        // Clear sessionStorage and reset to default profile
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('controllerMapping.v1');
        }
        const resetProfile = DEFAULT_PROFILE;
        setProfile(resetProfile);
        // Immediately apply to MapController
        onSave(resetProfile);
    };

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            {/* Modal Container */}
            <div className="bg-zinc-900/95 border border-white/10 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <ControllerHeader
                    profile={profile}
                    onClose={onClose}
                    onSaveClose={handleSaveClose}
                    onPreset={handlePreset}
                    onReset={handleReset}
                    onImport={(imported) => {
                        setProfile(imported);
                        // Immediately apply to MapController
                        onSave(imported);
                    }}
                />

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Left: Live Visualization + Settings */}
                        <div className="space-y-6">
                            <LiveVisualization />
                            <SettingsPanel
                                settings={profile.settings}
                                onChange={(settings) => setProfile(prev => ({ ...prev, settings }))}
                            />
                        </div>

                        {/* Right: Bindings */}
                        <BindingsList
                            profile={profile}
                            onBind={(action) => setBindingAction(action)}
                            onClear={(action) => {
                                setProfile(prev => ({
                                    ...prev,
                                    bindings: { ...prev.bindings, [action]: undefined }
                                }));
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Bind Modal Overlay */}
            {bindingAction && (
                <BindModal
                    action={bindingAction}
                    onCapture={(binding) => {
                        setProfile(prev => ({
                            ...prev,
                            bindings: { ...prev.bindings, [bindingAction]: binding }
                        }));
                        setBindingAction(null);
                    }}
                    onCancel={() => setBindingAction(null)}
                />
            )}
        </div>,
        document.body
    );
}
