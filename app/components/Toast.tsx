'use client';

import React, { useEffect } from 'react';
import { X, Orbit, Satellite } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'orbit' | 'satellite';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const isOrbit = type === 'orbit';

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[25000] animate-slideDown">
      <div className="bg-gradient-to-r from-black/95 to-green-950/95 backdrop-blur-xl border-2 border-green-500/50 rounded-lg shadow-[0_0_30px_rgba(34,197,94,0.6)] px-6 py-4 flex items-center gap-4 min-w-[320px]">
        {/* Icon */}
        <div className="flex-shrink-0">
          {isOrbit ? (
            <div className="w-10 h-10 bg-blue-500/20 border border-blue-400/50 rounded-lg flex items-center justify-center">
              <Orbit size={20} className="text-blue-400 animate-spin-slow" strokeWidth={2.5} />
            </div>
          ) : (
            <div className="w-10 h-10 bg-purple-500/20 border border-purple-400/50 rounded-lg flex items-center justify-center">
              <Satellite size={20} className="text-purple-400" strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* Message */}
        <div className="flex-1">
          <div className="text-green-400 font-black text-xs uppercase tracking-wider mb-0.5">
            {isOrbit ? 'ORBIT MODE ACTIVE' : 'SATELLITE VIEW ACTIVE'}
          </div>
          <div className="text-white/80 text-sm font-medium">
            {message}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X size={16} className="text-white/60 hover:text-white" />
        </button>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500/20 overflow-hidden rounded-b-lg">
          <div className="h-full bg-green-500 animate-progress-bar" />
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes progress-bar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .animate-progress-bar {
          animation: progress-bar 4s linear;
        }
      `}</style>
    </div>
  );
};
