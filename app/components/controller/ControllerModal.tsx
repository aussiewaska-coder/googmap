'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import { ControllerProfileV2 } from '@/app/lib/gamepad/types-v2';
import { loadSessionProfile, saveSessionProfile } from '@/app/lib/gamepad/storage';
import { applyTacticalPresetV2, makeDefaultProfileV2 } from '@/app/lib/gamepad/defaults-v2';
import ControllerHeader from './ControllerHeader';
import LiveVisualization from './LiveVisualization';
import BindingsList from './BindingsList';
import SettingsPanel from './SettingsPanel';
import BindModal from './BindModal';
import ButtonWizard from './ButtonWizard';

interface ControllerModalProps {
    onClose: () => void;
    onSave: (profile: ControllerProfileV2) => void;
    onSaveClose: (profile: ControllerProfileV2) => void;
    mapRef?: maplibregl.Map;
}

export default function ControllerModal({ onClose, onSave, onSaveClose, mapRef }: ControllerModalProps) {
    const [profile, setProfile] = useState<ControllerProfileV2>(() => {
        return loadSessionProfile() || applyTacticalPresetV2();
    });
    const [bindingAction, setBindingAction] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [currentPitch, setCurrentPitch] = useState(0);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Update current pitch from map
    useEffect(() => {
        if (!mapRef) return;
        
        const updatePitch = () => {
            setCurrentPitch(mapRef.getPitch());
        };
        
        updatePitch(); // Initial value
        mapRef.on('pitch', updatePitch);
        
        return () => {
            mapRef.off('pitch', updatePitch);
        };
    }, [mapRef]);

    const handleSaveClose = () => {
        saveSessionProfile(profile);
        onSaveClose(profile);
    };

    const handlePreset = () => {
        const presetProfile = applyTacticalPresetV2();
        setProfile(presetProfile);
        // Save to sessionStorage and apply to MapController
        saveSessionProfile(presetProfile);
        onSave(presetProfile);
    };

    const handleReset = () => {
        // Clear sessionStorage and reset to default profile
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('controllerMapping.v1');
            sessionStorage.removeItem('controllerMapping.v2');
        }
        const resetProfile = makeDefaultProfileV2();
        setProfile(resetProfile);
        // Immediately apply to MapController
        onSave(resetProfile);
    };

    const handleWizardComplete = (updatedProfile: ControllerProfileV2) => {
        setProfile(updatedProfile);
        saveSessionProfile(updatedProfile);
        onSave(updatedProfile);
        setShowWizard(false);
    };

    const handlePitchChange = (pitch: number) => {
        if (mapRef) {
            // Rotate around a point 70% down the viewport (closer to camera position)
            const container = mapRef.getContainer();
            const centerPoint = { x: container.offsetWidth / 2, y: container.offsetHeight * 0.7 };
            mapRef.setPitch(pitch, { around: mapRef.unproject([centerPoint.x, centerPoint.y]) });
        }
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
                    {/* Button Wizard Section */}
                    <div className="mb-8 p-6 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Button Label Wizard</h3>
                                <p className="text-sm text-white/60">
                                    {Object.keys(profile.labels || {}).length > 0
                                        ? `${Object.keys(profile.labels).length} buttons labeled • Click to update`
                                        : 'Identify your controller buttons for better binding display'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowWizard(true)}
                                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg text-white font-bold transition-all shadow-lg shadow-cyan-500/20"
                            >
                                {Object.keys(profile.labels || {}).length > 0 ? 'Update Labels' : 'Identify Buttons'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Left: Live Visualization */}
                        <LiveVisualization />

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

                    {/* Full Width: Settings Panel */}
                    <div className="mt-8">
                        <SettingsPanel
                            settings={profile.settings}
                            onChange={(settings) => {
                                const updatedProfile = { ...profile, settings };
                                setProfile(updatedProfile);
                                // Auto-save and apply to MapController when settings change
                                saveSessionProfile(updatedProfile);
                                onSave(updatedProfile);
                            }}
                            currentPitch={currentPitch}
                            onPitchChange={handlePitchChange}
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

            {/* Button Wizard */}
            {showWizard && (
                <ButtonWizard
                    profile={profile}
                    onComplete={handleWizardComplete}
                    onCancel={() => setShowWizard(false)}
                />
            )}
        </div>,
        document.body
    );
}
