// /map/ui/ModeIndicatorLED.tsx
// LED indicator for active camera modes
// Shows glow when orbit/satellite is active

'use client';

import React from 'react';
import { Orbit, Satellite } from 'lucide-react';

export interface ModeIndicatorLEDProps {
  mode: 'orbit' | 'satellite' | 'idle';
}

export const ModeIndicatorLED: React.FC<ModeIndicatorLEDProps> = ({ mode }) => {
  if (mode === 'idle') return null;

  const isOrbit = mode === 'orbit';
  const isSatellite = mode === 'satellite';

  return (
    <div className="fixed top-6 right-6 z-[10000] pointer-events-none">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-xl border-2 ${
          isOrbit
            ? 'bg-gradient-to-br from-blue-600/30 to-cyan-600/30 border-blue-400/50 shadow-[0_0_25px_rgba(59,130,246,0.6)]'
            : 'bg-gradient-to-br from-purple-600/30 to-pink-600/30 border-purple-400/50 shadow-[0_0_25px_rgba(147,51,234,0.6)]'
        }`}
      >
        {/* LED indicator */}
        <div
          className={`w-3 h-3 rounded-full animate-pulse ${
            isOrbit
              ? 'bg-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.9)]'
              : 'bg-purple-400 shadow-[0_0_12px_rgba(147,51,234,0.9)]'
          }`}
        />

        {/* Icon */}
        {isOrbit ? (
          <Orbit
            size={20}
            className="text-white animate-spin-slow"
            strokeWidth={2.5}
          />
        ) : (
          <Satellite
            size={20}
            className="text-white"
            strokeWidth={2.5}
          />
        )}

        {/* Label */}
        <span className="text-white text-sm font-black uppercase tracking-wider">
          {isOrbit ? 'Orbit Active' : 'Satellite View'}
        </span>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};
