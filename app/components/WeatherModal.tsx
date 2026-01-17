'use client';

import React from 'react';
import { X, Cloud, CloudRain, Sun, Wind } from 'lucide-react';

interface WeatherModalProps {
  onClose: () => void;
}

export const WeatherModal: React.FC<WeatherModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gradient-to-b from-black/95 to-blue-950/95 backdrop-blur-3xl border-2 border-blue-500/30 rounded-2xl shadow-[0_0_60px_rgba(59,130,246,0.4)] overflow-hidden animate-slideDown"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-black/80 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cloud className="text-blue-400" size={28} strokeWidth={2.5} />
            <h2 className="text-white font-black text-xl uppercase tracking-wider">
              Weather Integration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Weather Icons */}
          <div className="flex justify-center gap-4 mb-6">
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <Sun size={32} className="text-yellow-400" strokeWidth={2} />
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <Cloud size={32} className="text-blue-300" strokeWidth={2} />
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <CloudRain size={32} className="text-cyan-400" strokeWidth={2} />
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <Wind size={32} className="text-white" strokeWidth={2} />
            </div>
          </div>

          {/* Message */}
          <div className="text-center mb-6">
            <div className="text-green-400 font-black text-sm uppercase tracking-wider mb-3">
              Coming Soon
            </div>
            <p className="text-white/80 text-base leading-relaxed">
              Real-time weather data, forecasts, and radar overlays are currently in development.
            </p>
          </div>

          {/* Features List */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <div className="text-white/60 text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              Current conditions
            </div>
            <div className="text-white/60 text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              7-day forecasts
            </div>
            <div className="text-white/60 text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              Weather radar overlay
            </div>
            <div className="text-white/60 text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              Severe weather alerts
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
