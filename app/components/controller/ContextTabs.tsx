'use client';

import { Context, ControllerProfileV2, COMMAND_DEFINITIONS } from '@/app/lib/gamepad/types-v2';
import { Globe, Map, Menu, Plane } from 'lucide-react';

interface ContextTabsProps {
    activeContext: Context;
    onContextChange: (context: Context) => void;
    profile: ControllerProfileV2;
}

const CONTEXT_ICONS: Record<Context, React.ComponentType<{ className?: string }>> = {
    'global': Globe,
    'map': Map,
    'menu': Menu,
    'drone_gimbal': Plane,
};

const CONTEXT_LABELS: Record<Context, string> = {
    'global': 'Global',
    'map': 'Map',
    'menu': 'Menu',
    'drone_gimbal': 'Drone',
};

const CONTEXT_DESCRIPTIONS: Record<Context, string> = {
    'global': 'Always active commands',
    'map': 'Map navigation',
    'menu': 'Settings navigation',
    'drone_gimbal': 'Drone gimbal mode',
};

export default function ContextTabs({ activeContext, onContextChange, profile }: ContextTabsProps) {
    const handleTabClick = (context: Context) => {
        onContextChange(context);
    };

    // Count bindings for each context
    const getBindingCount = (context: Context): number => {
        return Object.keys(profile.bindings[context] || {}).filter(
            key => profile.bindings[context][key] !== undefined
        ).length;
    };

    // Get available commands for each context
    const getCommandCount = (context: Context): number => {
        return COMMAND_DEFINITIONS.filter(cmd => cmd.context === context).length;
    };

    const contexts: Context[] = ['global', 'map', 'menu', 'drone_gimbal'];

    return (
        <div className="flex flex-col gap-4">
            {/* Tab Headers */}
            <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
                {contexts.map((context) => {
                    const Icon = CONTEXT_ICONS[context];
                    const isActive = activeContext === context;
                    const bindingCount = getBindingCount(context);
                    const totalCommands = getCommandCount(context);

                    return (
                        <button
                            key={context}
                            onClick={() => handleTabClick(context)}
                            className={`
                                flex items-center gap-2 px-4 py-3 font-medium transition-all relative
                                ${isActive
                                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10'
                                    : 'text-white/60 hover:text-white/90 hover:bg-white/5 border-b-2 border-transparent'
                                }
                            `}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="whitespace-nowrap">{CONTEXT_LABELS[context]}</span>
                            {bindingCount > 0 && (
                                <span className={`
                                    text-xs px-2 py-0.5 rounded-full
                                    ${isActive
                                        ? 'bg-cyan-500/20 text-cyan-300'
                                        : 'bg-white/10 text-white/60'
                                    }
                                `}>
                                    {bindingCount}/{totalCommands}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab Description */}
            <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-white/70">
                    {CONTEXT_DESCRIPTIONS[activeContext]}
                </p>
            </div>
        </div>
    );
}
