'use client';

import { Trash2 } from 'lucide-react';
import { ControllerProfile, ACTION_DEFINITIONS, Binding } from '@/app/lib/gamepad/types';

interface BindingsListProps {
    profile: ControllerProfile;
    onBind: (action: string) => void;
    onClear: (action: string) => void;
}

export default function BindingsList({ profile, onBind, onClear }: BindingsListProps) {
    const formatBinding = (binding?: Binding): string => {
        if (!binding) return 'Not bound';
        if (binding.type === 'button') {
            return `Button ${binding.index}`;
        }
        if (binding.type === 'axis') {
            return `Axis ${binding.index} (${binding.sign > 0 ? '+' : '-'})`;
        }
        return 'Unknown';
    };

    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
            <div className="text-blue-500 font-bold text-xs uppercase tracking-wider mb-4">
                Action Bindings
            </div>

            <div className="space-y-2">
                {ACTION_DEFINITIONS.map((action) => {
                    const binding = profile.bindings[action.key];
                    const isBound = !!binding;

                    return (
                        <div
                            key={action.key}
                            className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all"
                        >
                            <div className="flex-1">
                                <div className="text-white text-sm font-bold">{action.label}</div>
                                <div className="text-white/40 text-xs">{action.description}</div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className={`px-3 py-1 rounded-lg text-xs font-mono ${
                                    isBound
                                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                        : 'bg-white/5 text-white/40 border border-white/10'
                                }`}>
                                    {formatBinding(binding)}
                                </div>

                                {isBound && (
                                    <button
                                        onClick={() => onClear(action.key)}
                                        className="h-8 w-8 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg transition-all flex items-center justify-center"
                                        title="Clear binding"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}

                                <button
                                    onClick={() => onBind(action.key)}
                                    className="h-8 px-4 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-xs font-bold rounded-lg transition-all"
                                >
                                    {isBound ? 'Rebind' : 'Bind'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
