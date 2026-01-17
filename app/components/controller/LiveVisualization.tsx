'use client';

import { useEffect, useState } from 'react';
import { getActiveGamepad } from '@/app/lib/gamepad/gamepad-reader';

export default function LiveVisualization() {
    const [axes, setAxes] = useState<number[]>([0, 0, 0, 0]);
    const [buttons, setButtons] = useState<boolean[]>(Array(32).fill(false));

    useEffect(() => {
        let frameId: number;
        const poll = () => {
            const gp = getActiveGamepad();
            if (gp) {
                setAxes(Array.from(gp.axes));
                setButtons(Array.from(gp.buttons).map(b => b.pressed));
            }
            frameId = requestAnimationFrame(poll);
        };
        poll();
        return () => cancelAnimationFrame(frameId);
    }, []);

    const renderStick = (label: string, xAxis: number, yAxis: number, xValue: number, yValue: number) => (
        <div className="flex-1">
            <div className="text-white/60 text-xs font-bold mb-2 text-center">{label}</div>
            <div className="relative w-32 h-32 mx-auto">
                {/* Stick Background Circle */}
                <div className="absolute inset-0 bg-white/5 border-2 border-white/20 rounded-full" />

                {/* Center Crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4">
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
                </div>

                {/* Moving Nub */}
                <div
                    className="absolute w-6 h-6 bg-blue-500 border-2 border-white rounded-full shadow-lg transition-all duration-75"
                    style={{
                        left: `${50 + xValue * 40}%`,
                        top: `${50 + yValue * 40}%`,
                        transform: 'translate(-50%, -50%)',
                    }}
                />
            </div>

            {/* Axis Values */}
            <div className="mt-2 text-center">
                <div className="text-xs font-mono text-white/40">
                    X: <span className="text-blue-400">{xValue.toFixed(2)}</span>
                </div>
                <div className="text-xs font-mono text-white/40">
                    Y: <span className="text-blue-400">{yValue.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="text-blue-500 font-bold text-xs uppercase tracking-wider mb-4">
                Live Input
            </div>

            {/* Sticks */}
            <div className="flex gap-8 justify-center">
                {renderStick('Left Stick', 0, 1, axes[0] || 0, axes[1] || 0)}
                {renderStick('Right Stick', 2, 3, axes[2] || 0, axes[3] || 0)}
            </div>

            {/* Buttons */}
            <div>
                <div className="text-white/60 text-xs font-bold mb-3 text-center">
                    Buttons (0-31)
                    <span className="ml-2 text-white/40 text-[10px]">
                        Note: Home/Guide buttons are system-reserved
                    </span>
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                    {buttons.map((pressed, i) => (
                        <div
                            key={i}
                            className={`h-8 rounded-lg border-2 flex items-center justify-center text-[10px] font-bold transition-all ${
                                pressed
                                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                                    : 'bg-white/5 border-white/20 text-white/40'
                            }`}
                        >
                            {i}
                        </div>
                    ))}
                </div>
                <div className="mt-2 text-[10px] text-white/40 text-center italic">
                    If a button doesn't light up when pressed, it may be reserved by the OS
                </div>
            </div>

            {/* Axes Display */}
            <div className="border-t border-white/5 pt-4">
                <div className="text-white/60 text-xs font-bold mb-2 text-center">All Axes</div>
                <div className="grid grid-cols-4 gap-2">
                    {axes.slice(0, 8).map((value, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-2 text-center">
                            <div className="text-xs text-white/40">Axis {i}</div>
                            <div className="text-sm font-mono text-blue-400 font-bold">{value.toFixed(2)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
