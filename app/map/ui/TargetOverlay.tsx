// /map/ui/TargetOverlay.tsx
// Targeting overlay with Orbit/Satellite buttons
// Rendered via React portal, anchored to screenXY

'use client';

import React, { useEffect, useState } from 'react';
import { Target, Orbit, Satellite } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface TargetOverlayProps {
  screenXY: { x: number; y: number };
  onOrbit: () => void;
  onSatellite: () => void;
  onDismiss: () => void;
}

export const TargetOverlay: React.FC<TargetOverlayProps> = ({
  screenXY,
  onOrbit,
  onSatellite,
  onDismiss,
}) => {
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      console.log('⏱️ [TargetOverlay] Auto-hiding after 5s');
      onDismiss();
    }, 5000);

    setAutoHideTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [onDismiss]);

  // Click-away handler
  const handleBackdropClick = () => {
    if (autoHideTimer) clearTimeout(autoHideTimer);
    onDismiss();
  };

  const handleOrbit = () => {
    if (autoHideTimer) clearTimeout(autoHideTimer);
    onOrbit();
  };

  const handleSatellite = () => {
    if (autoHideTimer) clearTimeout(autoHideTimer);
    onSatellite();
  };

  const overlay = (
    <>
      {/* Backdrop for click-away */}
      <div
        className="fixed inset-0 z-[15000]"
        onClick={handleBackdropClick}
      />

      {/* Target indicator + buttons */}
      <div
        className="fixed z-[15001] pointer-events-none"
        style={{
          left: screenXY.x,
          top: screenXY.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Crosshair target */}
        <div className="relative">
          <div className="absolute -translate-x-1/2 -translate-y-1/2">
            <Target
              size={48}
              className="text-green-400 animate-pulse drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]"
              strokeWidth={2.5}
            />
          </div>

          {/* Buttons */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-auto">
            <button
              onClick={handleOrbit}
              className="group flex flex-col items-center gap-1 px-4 py-3 bg-gradient-to-br from-blue-600/90 to-cyan-600/90 backdrop-blur-xl border-2 border-blue-400/50 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.8)] hover:scale-105 transition-all"
            >
              <Orbit size={24} className="text-white group-hover:rotate-180 transition-transform duration-500" strokeWidth={2.5} />
              <span className="text-white text-xs font-black uppercase tracking-wider">
                Orbit
              </span>
            </button>

            <button
              onClick={handleSatellite}
              className="group flex flex-col items-center gap-1 px-4 py-3 bg-gradient-to-br from-purple-600/90 to-pink-600/90 backdrop-blur-xl border-2 border-purple-400/50 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.5)] hover:shadow-[0_0_30px_rgba(147,51,234,0.8)] hover:scale-105 transition-all"
            >
              <Satellite size={24} className="text-white group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              <span className="text-white text-xs font-black uppercase tracking-wider">
                Satellite
              </span>
            </button>
          </div>

          {/* Hint text */}
          <div className="absolute top-32 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
            <div className="text-white/60 text-xs font-bold bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20">
              Tap outside to cancel
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(overlay, document.body);
};
