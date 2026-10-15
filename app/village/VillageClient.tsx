'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { VillageMacroPlot } from '@/src/components/village/VillageMacroPlot';
import { DollhouseStage } from '@/src/components/dollhouse/DollhouseStage';
import type { VillagePlotAnchor } from '@/src/components/village/types';
import type { DollhouseRoomTheme } from '@/src/components/dollhouse/types';
import { ArrowLeft, Sparkles, Moon, Sun } from 'lucide-react';

interface VillageClientProps {
  currentUserId: string;
}

export function VillageClient({ currentUserId }: VillageClientProps) {
  const [selectedPlot, setSelectedPlot] = useState<VillagePlotAnchor | null>(null);
  const [roomTheme, setRoomTheme] = useState<DollhouseRoomTheme>('cottage');
  const [nightMode, setNightMode] = useState(false);

  return (
    <div className="min-h-screen cozy-page-bg px-4 py-6 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/groups"
            className="inline-flex items-center gap-1.5 text-xs font-800 text-stone-700 dark:text-amber-200 hover:text-amber-600 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Groups</span>
          </Link>

          <button
            onClick={() => setNightMode((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-800 bg-white/80 dark:bg-stone-900 border border-amber-900/15 dark:border-amber-500/30 shadow-xs cursor-pointer hover:scale-105 active:scale-95 transition-all"
            title="Toggle Night Mode"
            aria-label={nightMode ? 'Switch to Day Mode' : 'Switch to Night Mode'}
          >
            {nightMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-400" />}
            <span>{nightMode ? 'Day Mode' : 'Night Mode'}</span>
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-900 text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <span>🏡</span>
            <span>2.5D Cozy Village & Dollhouse</span>
          </h1>
          <p className="text-xs font-600 text-stone-600 dark:text-amber-200/80 mt-1">
            Tap any member plot or structure in the village to explore dollhouse rooms.
          </p>
        </div>

        {/* 2.5D Isometric Village Macro-Plot */}
        <div className="space-y-2">
          <h2 className="text-sm font-800 text-stone-800 dark:text-amber-100 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            <span>Village Macro-Plot Viewport</span>
          </h2>
          <VillageMacroPlot
            villageName="Mossy Hearth Village"
            vibeStatus="sunshine"
            onSelectPlot={(plot) => {
              setSelectedPlot(plot);
            }}
          />
        </div>

        {/* 2.5D Dollhouse Interior Stage */}
        <div className="space-y-3 pt-4 border-t border-amber-900/15 dark:border-amber-500/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-800 text-stone-800 dark:text-amber-100">
                {selectedPlot ? `${selectedPlot.label} — Room Interior` : 'Dollhouse Room Interior'}
              </h2>
              <p className="text-xs text-stone-600 dark:text-amber-300/70">
                {selectedPlot?.occupiedByName ? `Resident: ${selectedPlot.occupiedByName}` : 'Miniature room staging'}
              </p>
            </div>

            {/* Theme switcher */}
            <div className="flex items-center gap-1.5">
              {(['cottage', 'campsite', 'castle', 'modern'] as DollhouseRoomTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setRoomTheme(t)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-800 capitalize transition-all cursor-pointer ${
                    roomTheme === t
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-white/80 dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-amber-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <DollhouseStage
            theme={roomTheme}
            vibeStatus="sunshine"
            nightMode={nightMode}
          />
        </div>
      </div>
    </div>
  );
}
