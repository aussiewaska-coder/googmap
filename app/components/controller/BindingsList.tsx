'use client';

import { useState } from 'react';
import { ControllerProfileV2, Context } from '@/app/lib/gamepad/types-v2';
import ContextTabs from './ContextTabs';
import CommandBindingsList from './CommandBindingsList';
import AnalogBindingsList from './AnalogBindingsList';

interface BindingsListProps {
    profile: ControllerProfileV2;
    onBind: (commandKey: string) => void;
    onClear: (commandKey: string) => void;
}

export default function BindingsList({ profile, onBind, onClear }: BindingsListProps) {
    const [activeContext, setActiveContext] = useState<Context>('global');

    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
            {/* Context Tabs */}
            <div className="border-b border-white/5">
                <ContextTabs
                    profile={profile}
                    activeContext={activeContext}
                    onContextChange={setActiveContext}
                />
            </div>

            {/* Bindings Content */}
            <div className="p-6">
                {/* Command Bindings (Buttons) */}
                <CommandBindingsList
                    context={activeContext}
                    profile={profile}
                    onBind={onBind}
                    onClear={onClear}
                />

                {/* Analog Bindings (Axes) - Only shown in Map/Drone contexts */}
                {(activeContext === 'map' || activeContext === 'drone_gimbal') && (
                    <AnalogBindingsList
                        context={activeContext}
                        profile={profile}
                        onBind={onBind}
                        onClear={onClear}
                    />
                )}
            </div>
        </div>
    );
}
