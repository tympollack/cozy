'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { VillageMacroPlot } from '@/src/components/village/VillageMacroPlot';
import { DollhouseStage } from '@/src/components/dollhouse/DollhouseStage';
import type { VillagePlotAnchor } from '@/src/components/village/types';
import type { DollhouseRoomTheme } from '@/src/components/dollhouse/types';
import type { GroupWithMembers } from '@/app/actions/groupActions';
import { ArrowLeft, Sparkles, Moon, Sun, ArrowRight } from 'lucide-react';

interface VillageClientProps {
  currentUserId: string;
  initialGroup: GroupWithMembers | null;
  userGroups?: Array<{ id: string; name: string }>;
}

const PLOT_TEMPLATES = [
  { id: 'plot-0', col: 2, row: 1, label: 'Meadow Nook' },
  { id: 'plot-1', col: 5, row: 1, label: 'Sunnyside Plot' },
  { id: 'plot-2', col: 1, row: 4, label: 'Hearth Plot' },
  { id: 'plot-3', col: 6, row: 4, label: 'Riverside Plot' },
  { id: 'plot-4', col: 4, row: 6, label: 'Windmill View' },
  { id: 'plot-5', col: 2, row: 6, label: 'Garden Edge' },
  { id: 'plot-6', col: 4, row: 1, label: 'Blossom Ridge' },
  { id: 'plot-7', col: 1, row: 5, label: 'Clover Patch' },
  { id: 'plot-8', col: 6, row: 2, label: 'Orchard Corner' },
  { id: 'plot-9', col: 5, row: 6, label: 'Whispering Pines' },
  { id: 'plot-10', col: 3, row: 6, label: 'Brookside Corner' },
  { id: 'plot-11', col: 6, row: 3, label: 'Starlight Terrace' },
  { id: 'plot-12', col: 0, row: 3, label: 'West Gate Plot' },
  { id: 'plot-13', col: 0, row: 4, label: 'Fern Glade' },
  { id: 'plot-14', col: 2, row: 2, label: 'Bramble Nook' },
  { id: 'plot-15', col: 4, row: 2, label: 'Sunrise Terrace' },
  { id: 'plot-16', col: 2, row: 5, label: 'Mossy Way' },
  { id: 'plot-17', col: 5, row: 5, label: 'South Path Plot' },
  { id: 'plot-18', col: 7, row: 3, label: 'East Hill' },
  { id: 'plot-19', col: 7, row: 4, label: 'Forest Edge' },
  { id: 'plot-20', col: 3, row: 1, label: 'North Gate' },
  { id: 'plot-21', col: 3, row: 5, label: 'Central Green' },
  { id: 'plot-22', col: 1, row: 3, label: 'Shady Grove' },
  { id: 'plot-23', col: 5, row: 3, label: 'Sunny Banks' },
];

export const PLOTS_PER_PAGE = 12;

function getPlotTemplate(idx: number): { id: string; col: number; row: number; label: string } {
  if (idx < PLOT_TEMPLATES.length) {
    return PLOT_TEMPLATES[idx];
  }
  const page = Math.floor(idx / PLOTS_PER_PAGE);
  const baseTmpl = PLOT_TEMPLATES[idx % PLOTS_PER_PAGE];
  return {
    id: `plot-${idx}`,
    col: baseTmpl.col,
    row: baseTmpl.row,
    label: `${baseTmpl.label} (${page + 1})`,
  };
}

export function VillageClient({ currentUserId, initialGroup, userGroups = [] }: VillageClientProps) {
  const [nightMode, setNightMode] = useState(false);
  const [customRoomTheme, setCustomRoomTheme] = useState<DollhouseRoomTheme | null>(null);
  const [plotPage, setPlotPage] = useState(0);

  const allPlotAnchors = useMemo<VillagePlotAnchor[]>(() => {
    if (!initialGroup) return [];
    const members = initialGroup.members;
    const maxCapacity = initialGroup.group.max_members || 8;
    const totalSlots = Math.max(members.length, Math.min(24, maxCapacity));

    const anchors: VillagePlotAnchor[] = [];
    for (let idx = 0; idx < totalSlots; idx++) {
      const tmpl = getPlotTemplate(idx);
      const member = members[idx];
      if (member) {
        const isYou = member.user_id === currentUserId;
        anchors.push({
          id: `plot-${member.user_id}`,
          label: isYou ? `${tmpl.label} (You)` : `${tmpl.label} (${member.display_name})`,
          col: tmpl.col,
          row: tmpl.row,
          occupiedByUserId: member.user_id,
          occupiedByName: isYou ? 'You' : member.display_name,
          avatarUrl: member.avatar_url || undefined,
          vibeStatus: member.vibe_status || 'sunshine',
          shellType: member.shell_type || 'cottage',
        });
      } else if (idx < maxCapacity) {
        // Render vacant anchors only where there is actual available capacity
        anchors.push({
          id: tmpl.id,
          label: `${tmpl.label} (Vacant)`,
          col: tmpl.col,
          row: tmpl.row,
        });
      }
    }
    return anchors;
  }, [initialGroup, currentUserId]);

  const totalPages = Math.max(1, Math.ceil(allPlotAnchors.length / PLOTS_PER_PAGE));

  const visiblePlotAnchors = useMemo(() => {
    const start = plotPage * PLOTS_PER_PAGE;
    return allPlotAnchors.slice(start, start + PLOTS_PER_PAGE);
  }, [allPlotAnchors, plotPage]);

  const [selectedPlot, setSelectedPlot] = useState<VillagePlotAnchor | null>(() => {
    if (!initialGroup) return null;
    return (
      allPlotAnchors.find((p) => p.occupiedByUserId === currentUserId) ||
      allPlotAnchors.find((p) => Boolean(p.occupiedByUserId)) ||
      allPlotAnchors[0] ||
      null
    );
  });

  // Re-synchronize selectedPlot when active group or members change
  useEffect(() => {
    if (!initialGroup) {
      setSelectedPlot(null);
      return;
    }
    const you = allPlotAnchors.find((p) => p.occupiedByUserId === currentUserId);
    const firstOccupied = allPlotAnchors.find((p) => Boolean(p.occupiedByUserId));
    setSelectedPlot(you || firstOccupied || allPlotAnchors[0] || null);
    setPlotPage(0);
  }, [initialGroup?.group.id, allPlotAnchors, currentUserId]);

  if (!initialGroup) {
    return (
      <div className="min-h-screen cozy-page-bg px-4 py-6 pb-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Link
              href="/groups"
              className="inline-flex items-center gap-1.5 text-xs font-800 text-stone-700 dark:text-amber-200 hover:text-amber-600 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to Groups</span>
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-900 text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>🏡</span>
              <span>2.5D Cozy Village & Dollhouse</span>
            </h1>
            <p className="text-xs font-600 text-stone-600 dark:text-amber-200/80 mt-1">
              Join or create a village group to explore neighborhood plots and dollhouse rooms.
            </p>
          </div>

          <div className="text-center py-16 space-y-4 bg-white/70 dark:bg-[#1f1713] rounded-3xl border border-amber-900/15 dark:border-amber-500/25 p-8 shadow-sm">
            <div className="text-5xl animate-bounce" role="img" aria-label="Village">
              🏡
            </div>
            <h2 className="text-lg font-900 text-stone-900 dark:text-stone-100">No Village Joined Yet</h2>
            <p className="text-xs font-700 text-stone-700 dark:text-stone-300 max-w-sm mx-auto">
              You haven't joined a village group yet. Join or create a village with your friends to claim your plot and explore your neighbors' dollhouses!
            </p>
            <Link
              href="/groups"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-800 text-stone-950 bg-amber-400 hover:bg-amber-300 shadow-md hover:scale-105 active:scale-95 transition-all border border-amber-500/50"
            >
              <span>Explore Villages ✨</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isSelectedVacant = selectedPlot && !selectedPlot.occupiedByUserId;
  const activeRoomTheme = customRoomTheme || selectedPlot?.shellType || 'cottage';
  const activeVibe = selectedPlot?.vibeStatus || 'sunshine';

  return (
    <div className="min-h-screen cozy-page-bg px-4 py-6 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link
            href="/groups"
            className="inline-flex items-center gap-1.5 text-xs font-800 text-stone-700 dark:text-amber-200 hover:text-amber-600 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Groups</span>
          </Link>

          {/* Multi-Village Selector */}
          {userGroups.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Village:</span>
              {userGroups.map((g) => (
                <Link
                  key={g.id}
                  href={`/village?groupId=${g.id}`}
                  className={`px-2.5 py-1 rounded-xl text-xs font-800 transition-all ${
                    initialGroup.group.id === g.id
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'bg-white/80 dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-amber-100'
                  }`}
                >
                  {g.name}
                </Link>
              ))}
            </div>
          )}

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
            Tap any member plot or structure in {initialGroup.group.name} to explore dollhouse rooms.
          </p>
        </div>

        {/* 2.5D Isometric Village Macro-Plot */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-800 text-stone-800 dark:text-amber-100 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              <span>{initialGroup.group.name} — Macro-Plot Viewport</span>
            </h2>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-amber-200">
                <button
                  onClick={() => setPlotPage((p) => Math.max(0, p - 1))}
                  disabled={plotPage === 0}
                  className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-stone-900 border border-amber-900/15 dark:border-amber-500/25 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-100 dark:hover:bg-stone-800"
                >
                  ←
                </button>
                <span>
                  Plots {plotPage * PLOTS_PER_PAGE + 1}–
                  {Math.min((plotPage + 1) * PLOTS_PER_PAGE, allPlotAnchors.length)} of {allPlotAnchors.length}
                </span>
                <button
                  onClick={() => setPlotPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={plotPage >= totalPages - 1}
                  className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-stone-900 border border-amber-900/15 dark:border-amber-500/25 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-100 dark:hover:bg-stone-800"
                >
                  →
                </button>
              </div>
            )}
          </div>
          <VillageMacroPlot
            villageName={initialGroup.group.name}
            vibeStatus={
              initialGroup.members.find((m) => m.user_id === currentUserId)?.vibe_status ||
              initialGroup.members[0]?.vibe_status ||
              'sunshine'
            }
            plotAnchors={visiblePlotAnchors}
            onSelectPlot={(plot) => {
              setSelectedPlot(plot);
              setCustomRoomTheme(null);
            }}
          />

          {/* Comprehensive Resident Plot Selection Strip */}
          <div className="flex items-center gap-2 overflow-x-auto py-2">
            <span className="text-xs font-800 text-stone-600 dark:text-amber-200 shrink-0">Residents:</span>
            {allPlotAnchors.map((plot, pIdx) => {
              const isSelected = selectedPlot?.id === plot.id;
              return (
                <button
                  key={plot.id}
                  onClick={() => {
                    setSelectedPlot(plot);
                    setCustomRoomTheme(null);
                    const targetPage = Math.floor(pIdx / PLOTS_PER_PAGE);
                    if (targetPage !== plotPage) {
                      setPlotPage(targetPage);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-800 shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 shadow-xs ring-2 ring-amber-400'
                      : 'bg-white/80 dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-amber-100'
                  }`}
                >
                  <span>
                    {plot.occupiedByName
                      ? plot.occupiedByName === 'You'
                        ? '👤 You'
                        : `🏡 ${plot.occupiedByName}`
                      : '🌱 Vacant'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2.5D Dollhouse Interior Stage */}
        <div className="space-y-3 pt-4 border-t border-amber-900/15 dark:border-amber-500/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-800 text-stone-800 dark:text-amber-100">
                {selectedPlot ? `${selectedPlot.label} — Room Interior` : 'Dollhouse Room Interior'}
              </h2>
              <p className="text-xs text-stone-600 dark:text-amber-300/70">
                {selectedPlot?.occupiedByName
                  ? `Resident: ${selectedPlot.occupiedByName} • Vibe: ${activeVibe}`
                  : selectedPlot
                  ? 'Vacant Space Plot'
                  : 'Miniature room staging'}
              </p>
            </div>

            {/* Theme switcher */}
            {!isSelectedVacant && (
              <div className="flex items-center gap-1.5">
                {(['cottage', 'campsite', 'castle', 'modern'] as DollhouseRoomTheme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCustomRoomTheme(t)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-800 capitalize transition-all cursor-pointer ${
                      activeRoomTheme === t ||
                      (t === 'campsite' && activeRoomTheme === 'cozy_campsite') ||
                      (t === 'castle' && activeRoomTheme === 'stone_castle')
                        ? 'bg-amber-500 text-stone-950 shadow-sm'
                        : 'bg-white/80 dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-amber-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isSelectedVacant ? (
            <div className="flex flex-col items-center justify-center p-12 bg-amber-50/50 dark:bg-stone-900/40 rounded-2xl border border-dashed border-amber-900/20 dark:border-amber-500/30 text-center">
              <div className="text-3xl mb-2">🌱</div>
              <h3 className="text-sm font-800 text-stone-800 dark:text-amber-100">Vacant Space Plot</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mt-1">
                No resident has claimed this lot yet. Invite friends to join {initialGroup.group.name} and build their cozy dollhouse here!
              </p>
            </div>
          ) : (
            <DollhouseStage
              theme={activeRoomTheme}
              vibeStatus={activeVibe}
              nightMode={nightMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}
