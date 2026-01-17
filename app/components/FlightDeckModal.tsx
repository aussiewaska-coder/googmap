'use client';

import React from 'react';
import { X, MapPin } from 'lucide-react';
import { FLIGHT_DECK_DESTINATIONS } from '../lib/constants';

interface FlightDeckModalProps {
  onClose: () => void;
  onSelectDestination: (coords: [number, number], name: string) => void;
}

export const FlightDeckModal: React.FC<FlightDeckModalProps> = ({
  onClose,
  onSelectDestination,
}) => {
  return (
    <div
      className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] bg-gradient-to-b from-black/95 to-black/90 backdrop-blur-3xl border-2 border-green-500/30 rounded-2xl shadow-[0_0_60px_rgba(34,197,94,0.4)] overflow-hidden animate-slideDown"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 p-4 border-b border-white/10 bg-black/80 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="text-green-400" size={24} strokeWidth={2.5} />
            <h2 className="text-white font-black text-xl uppercase tracking-wider">
              Flight Deck
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Destinations - Scrollable */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)] custom-scrollbar">
          {Object.entries(FLIGHT_DECK_DESTINATIONS).map(([state, cities]) => (
            <div key={state} className="p-4 border-b border-white/5 last:border-none">
              {/* State Header */}
              <div className="text-green-400 font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
                {state}
              </div>

              {/* Cities Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(cities).map(([city, coords]) => (
                  <button
                    key={city}
                    onClick={() => {
                      onSelectDestination(coords as [number, number], city);
                      onClose();
                    }}
                    className="group text-left p-3 bg-white/5 hover:bg-green-600/20 border border-white/10 hover:border-green-500/30 rounded-lg transition-all flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_4px_rgba(96,165,250,0.6)] group-hover:bg-green-400 group-hover:shadow-[0_0_6px_rgba(74,222,128,0.8)] transition-all" />
                    <div className="flex-1">
                      <div className="text-white/90 group-hover:text-white text-sm font-bold">
                        {city}
                      </div>
                      <div className="text-white/40 text-[10px] font-mono">
                        {coords[1].toFixed(4)}°, {coords[0].toFixed(4)}°
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};
