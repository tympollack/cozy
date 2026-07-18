'use client';

import React, { useState } from 'react';
import type { ItemPin } from '@/store/useCozyStore';
import { ShoppingBag } from 'lucide-react';

interface ShoppableImageProps {
  itemPins: ItemPin[];
  className?: string;
  children: React.ReactNode;
}

export function ShoppableImage({ itemPins, className = '', children }: ShoppableImageProps) {
  const [activePinId, setActivePinId] = useState<string | null>(null);

  const togglePin = (pinId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePinId(activePinId === pinId ? null : pinId);
  };

  return (
    <div 
      className={`relative w-full h-full overflow-hidden ${className}`}
      onClick={() => setActivePinId(null)}
    >
      {/* Base Content (Images, Sliders, etc) */}
      {children}

      {/* Shoppable Pins Overlay */}
      {itemPins?.map((pin) => {
        const isActive = activePinId === pin.id;

        return (
          <div
            key={pin.id}
            className="absolute z-20"
            style={{
              left: `${pin.x_percent}%`,
              top: `${pin.y_percent}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* The pulsing dot */}
            <button
              onClick={(e) => togglePin(pin.id, e)}
              className="relative group focus:outline-none"
              aria-label={`View details for ${pin.title}`}
            >
              <div className="absolute inset-0 w-4 h-4 bg-white/80 rounded-full animate-ping opacity-75 backdrop-blur-sm" />
              <div className="relative w-4 h-4 bg-white rounded-full shadow-lg border border-zinc-200 flex items-center justify-center transition-transform hover:scale-110" />
            </button>

            {/* Popover / Tooltip */}
            {isActive && (
              <div 
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-max max-w-[200px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-700/50 rounded-2xl p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight">
                    {pin.title}
                  </p>
                  <a
                    href={pin.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded-full hover:scale-105 active:scale-95 transition-transform"
                  >
                    <ShoppingBag size={12} />
                    Shop
                  </a>
                </div>
                {/* Tooltip triangle indicator */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-white/90 dark:bg-zinc-900/90 border-r border-b border-zinc-200/50 dark:border-zinc-700/50" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
