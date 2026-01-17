'use client';

import { Context, ControllerProfileV2, CommandDefinition, COMMAND_DEFINITIONS, Binding } from '@/app/lib/gamepad/types-v2';
import { formatBindingWithLabel } from '@/app/lib/gamepad/label-helpers';
import { Trash2 } from 'lucide-react';

interface AnalogBindingsListProps {
    context: Context;
    profile: ControllerProfileV2;
    onBind: (commandKey: string) => void;
    onClear: (commandKey: string) => void;
}

export default function AnalogBindingsList({ context, profile, onBind, onClear }: AnalogBindingsListProps) {
    // Get analog commands for this context (axes only)
    const commands = COMMAND_DEFINITIONS.filter(
        cmd => cmd.context === context && cmd.type === 'axis'
    );

    if (commands.length === 0) {
        return null; // Don't show section if no analog commands
    }

    return (
        <div className="space-y-3 mt-6">
            <h3 className="text-lg font-bold text-white mb-4">Analog Controls (Axes)</h3>

            {commands.map((command) => {
                const binding = profile.bindings[context]?.[command.key];
                const isBound = binding !== undefined;

                return (
                    <div
                        key={command.key}
                        className="p-4 bg-white/5 hover:bg-white/[0.07] rounded-lg border border-white/10 transition-colors"
                    >
                        <div className="flex items-center justify-between gap-4">
                            {/* Command Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-white">{command.label}</h4>
                                    {isBound && (
                                        <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-300 font-medium">
                                            Bound
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-white/60 mt-1">{command.description}</p>

                                {/* Binding Display */}
                                <div className="mt-2">
                                    {isBound ? (
                                        <span className="text-sm text-blue-400 font-mono">
                                            {formatBindingWithLabel(binding, profile)}
                                        </span>
                                    ) : (
                                        <span className="text-sm text-white/40">Not bound</span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={() => onBind(command.key)}
                                    className={`
                                        px-4 py-2 rounded-lg font-medium transition-colors
                                        ${isBound
                                            ? 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300'
                                            : 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300'
                                        }
                                    `}
                                >
                                    {isBound ? 'Rebind' : 'Bind'}
                                </button>

                                {isBound && (
                                    <button
                                        onClick={() => onClear(command.key)}
                                        className="p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-300 transition-colors"
                                        title="Clear binding"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
