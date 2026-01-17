// /map/ui/TargetOverlay.tsx
// Tactical targeting overlay with Orbit/Satellite options
// Rendered via React portal, anchored to screenXY

'use client';

import React, { useEffect, useState } from 'react';
import { Orbit, Satellite } from 'lucide-react';
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
  const [backdropActive, setBackdropActive] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);

  useEffect(() => {
    // Delay backdrop activation to prevent immediate dismissal from long-press release
    const backdropTimer = setTimeout(() => {
      setBackdropActive(true);
    }, 200);

    // Animate buttons in
    const buttonTimer = setTimeout(() => {
      setButtonsVisible(true);
    }, 100);

    // Auto-dismiss after 5 seconds
    const hideTimer = setTimeout(() => {
      console.log('⏱️ [TargetOverlay] Auto-hiding after 5s');
      onDismiss();
    }, 5000);

    setAutoHideTimer(hideTimer);

    return () => {
      clearTimeout(backdropTimer);
      clearTimeout(buttonTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [onDismiss]);

  // Click-away handler
  const handleBackdropClick = () => {
    if (!backdropActive) return; // Ignore if backdrop not active yet
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
      {backdropActive && (
        <div
          className="fixed inset-0 z-[15000] animate-fadeIn"
          onClick={handleBackdropClick}
        />
      )}

      {/* Target indicator + buttons */}
      <div
        className="fixed z-[15001] pointer-events-none"
        style={{
          left: screenXY.x,
          top: screenXY.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Tactical Crosshair */}
        <div className="relative">
          {/* Center dot */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse" />

          {/* Crosshair lines */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2">
            {/* Horizontal line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-green-400/80 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
            {/* Vertical line */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-12 w-0.5 bg-green-400/80 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
          </div>

          {/* Outer ring - pulsing */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-green-400/60 rounded-full animate-ping-slow shadow-[0_0_12px_rgba(74,222,128,0.4)]" />

          {/* Middle ring - static */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-green-400/40 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.3)]" />

          {/* Corner brackets - tactical feel */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2 w-20 h-20">
            {/* Top-left */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-green-400/80" />
            {/* Top-right */}
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-green-400/80" />
            {/* Bottom-left */}
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-green-400/80" />
            {/* Bottom-right */}
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-green-400/80" />
          </div>

          {/* Buttons - animate pop-out */}
          <div
            className={`absolute top-24 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto transition-all duration-300 ${
              buttonsVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
          >
            <button
              onClick={handleOrbit}
              className="group relative p-3 bg-black/80 backdrop-blur-xl border border-blue-500/50 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] hover:border-blue-400 transition-all hover:scale-110 active:scale-95"
            >
              <Orbit size={20} className="text-blue-400 group-hover:rotate-180 transition-transform duration-500" strokeWidth={2} />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider text-blue-400/80">
                ORBIT
              </div>
            </button>

            <button
              onClick={handleSatellite}
              className="group relative p-3 bg-black/80 backdrop-blur-xl border border-purple-500/50 rounded-lg shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_rgba(147,51,234,0.6)] hover:border-purple-400 transition-all hover:scale-110 active:scale-95"
            >
              <Satellite size={20} className="text-purple-400 group-hover:scale-110 transition-transform" strokeWidth={2} />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider text-purple-400/80">
                SAT
              </div>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes ping-slow {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.3;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0;
          }
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </>
  );

  return createPortal(overlay, document.body);
};
