'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Pin, Plus, Sparkles, Trophy } from 'lucide-react';
import {
  completeGroupChallenge,
  createGroupChallenge,
} from '@/app/actions/challengeActions';
import {
  DEFAULT_CHALLENGES,
  type GroupChallenge,
} from '@/lib/challengeDefaults';
import { useCozyStore } from '@/store/useCozyStore';

interface CommunityBulletinBoardProps {
  groupId: string;
  groupPooledPoints?: number;
  isFuturistic?: boolean;
  isAdmin: boolean;
}

const THEME_UNLOCK_THRESHOLDS = [
  { points: 500, name: 'Campsite Theme', emoji: '🏕️' },
  { points: 1200, name: 'Castle Theme', emoji: '🏰' },
  { points: 2500, name: 'Greenhouse Theme', emoji: '🌿' },
  { points: 5000, name: 'Solar Haven Theme', emoji: '☀️' },
  { points: 10000, name: 'Cosmic Station Theme', emoji: '🌌' },
];

export interface VillageMilestone {
  id: string;
  points: number;
  name: string;
  emoji: string;
  category: 'lighting' | 'nature' | 'civic';
  transformationLabel: string;
  description: string;
}

export const VILLAGE_COMMUNAL_MILESTONES: VillageMilestone[] = [
  {
    id: 'milestone-fairy-lights',
    points: 150,
    name: 'Fairy Lights Strung Across Commons',
    emoji: '✨',
    category: 'lighting',
    transformationLabel: 'Fairy Lights Glowing',
    description: 'Delicate warm string lights illuminated across the town square.',
  },
  {
    id: 'milestone-streetlamps',
    points: 350,
    name: 'Streetlamps Lit Along Village Paths',
    emoji: '🏮',
    category: 'lighting',
    transformationLabel: 'Cobblestone Streetlamps Lit',
    description: 'Antique brass lanterns casting a warm amber glow on evening strolls.',
  },
  {
    id: 'milestone-garden',
    points: 750,
    name: 'Communal Herb & Flower Garden Blooming',
    emoji: '🌷',
    category: 'nature',
    transformationLabel: 'Communal Garden Blooming',
    description: 'Shared raised beds of chamomile, lavender, and sweet mint in full bloom.',
  },
  {
    id: 'milestone-tea-hearth',
    points: 1500,
    name: 'Village Tea Pavilion & Hearth Restored',
    emoji: '☕',
    category: 'civic',
    transformationLabel: 'Village Tea Hearth Warm',
    description: 'A stone hearth where anyone can brew a hot pot of herbal tea together.',
  },
  {
    id: 'milestone-fountain',
    points: 3000,
    name: 'Town Square Fountain & Conservatory',
    emoji: '⛲',
    category: 'civic',
    transformationLabel: 'Fountain Bubbling',
    description: 'Crystal-clear bubbling water fountain surrounded by peaceful reading benches.',
  },
];

export function CommunityBulletinBoard({
  groupId,
  groupPooledPoints,
  isFuturistic = false,
  isAdmin,
}: CommunityBulletinBoardProps) {
  const [challenges, setChallenges] = useState<GroupChallenge[]>(
    DEFAULT_CHALLENGES.map((c) => ({ ...c, groupId, createdBy: 'admin' }))
  );
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newMult, setNewMult] = useState(1.5);

  const { addPoints, addGroupPoints, groupPoints, setGroupPoints } = useCozyStore();

  const [localGroupPoints, setLocalGroupPoints] = useState<number>(
    groupPooledPoints !== undefined ? groupPooledPoints : (groupPoints ?? 0)
  );

  const prevGroupPooledPointsRef = useRef<{
    groupId: string;
    points: number | undefined;
  }>({
    groupId,
    points: groupPooledPoints,
  });

  useEffect(() => {
    const isGroupChanged = groupId !== prevGroupPooledPointsRef.current.groupId;
    const isPointsChanged =
      groupPooledPoints !== undefined &&
      groupPooledPoints !== prevGroupPooledPointsRef.current.points;

    if (isGroupChanged || isPointsChanged) {
      prevGroupPooledPointsRef.current = {
        groupId,
        points: groupPooledPoints,
      };

      if (isGroupChanged) {
        setChallenges(DEFAULT_CHALLENGES.map((c) => ({ ...c, groupId, createdBy: 'admin' })));
        setCompletedIds(new Set());
      }

      setLocalGroupPoints(
        groupPooledPoints !== undefined ? groupPooledPoints : (groupPoints ?? 0)
      );
    } else if (groupPooledPoints === undefined) {
      // REV-COZY-01: Reset prevGroupPooledPointsRef points on undefined returns to avoid stale points
      prevGroupPooledPointsRef.current = {
        groupId,
        points: undefined,
      };
      if (typeof groupPoints === 'number') {
        setLocalGroupPoints(groupPoints);
      }
    }
  }, [groupId, groupPooledPoints, groupPoints]);

  const currentGroupPts = localGroupPoints;
  const isAllThemesUnlocked = currentGroupPts >= 10000;
  const nextTheme = THEME_UNLOCK_THRESHOLDS.find((t) => currentGroupPts < t.points);
  const prevPoints = THEME_UNLOCK_THRESHOLDS.filter((t) => currentGroupPts >= t.points).slice(-1)[0]?.points ?? 0;
  const themeProgress = isAllThemesUnlocked
    ? 100
    : nextTheme && nextTheme.points > prevPoints
    ? Math.min(100, Math.max(0, Math.round(((currentGroupPts - prevPoints) / (nextTheme.points - prevPoints)) * 100)))
    : 100;

  const currentGroupIdRef = useRef(groupId);
  currentGroupIdRef.current = groupId;

  async function handleComplete(chId: string, mult: number) {
    if (completedIds.has(chId)) return;

    const targetGroupId = groupId;
    const bonusGroupPts = Math.round(25 * mult);

    // Optimistic UI update
    setCompletedIds((prev) => new Set(prev).add(chId));
    setLocalGroupPoints((prev) => prev + bonusGroupPts);
    addPoints(15);
    addGroupPoints(bonusGroupPts);

    try {
      const res = await completeGroupChallenge(targetGroupId, chId);
      // User-wide personal points are always reconciled on success
      if (res.success && res.newPersonalPoints !== undefined) {
        setPointsInStore(res.newPersonalPoints);
      }

      const isStillCurrentGroup = currentGroupIdRef.current === targetGroupId;

      if (res.success) {
        if (isStillCurrentGroup && res.newGroupPoints !== undefined) {
          setLocalGroupPoints(res.newGroupPoints);
          setGroupPoints(res.newGroupPoints);
        }
      } else {
        // Rollback optimistic state on rejected action
        addPoints(-15);
        if (isStillCurrentGroup) {
          setCompletedIds((prev) => {
            const next = new Set(prev);
            next.delete(chId);
            return next;
          });
          setLocalGroupPoints((prev) => Math.max(0, prev - bonusGroupPts));
          addGroupPoints(-bonusGroupPts);
        }
      }
    } catch {
      // Rollback optimistic state on error
      addPoints(-15);
      if (currentGroupIdRef.current === targetGroupId) {
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(chId);
          return next;
        });
        setLocalGroupPoints((prev) => Math.max(0, prev - bonusGroupPts));
        addGroupPoints(-bonusGroupPts);
      }
    }
  }

  function setPointsInStore(pts: number) {
    useCozyStore.getState().setPoints(pts);
  }

  async function handleCreateChallenge() {
    if (!newTitle.trim() || !newDesc.trim()) return;

    const newCh: GroupChallenge = {
      id: `ch-${Date.now()}`,
      groupId,
      title: newTitle.trim(),
      description: newDesc.trim(),
      multiplier: newMult,
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      completedUserIds: [],
    };

    setChallenges((prev) => [newCh, ...prev]);
    setShowCreateModal(false);
    setNewTitle('');
    setNewDesc('');

    try {
      await createGroupChallenge(groupId, newTitle, newDesc, newMult);
    } catch {
      // Retain optimistic state
    }
  }

  return (
    <div
      className="w-full rounded-3xl p-5 border-2 shadow-xl relative overflow-hidden space-y-4"
      style={{
        background: isFuturistic
          ? 'linear-gradient(160deg, #091428 0%, #060d1a 100%)'
          : 'linear-gradient(160deg, #fffcf5 0%, #f7ebd9 100%)',
        borderColor: isFuturistic ? 'rgba(0,220,255,0.30)' : 'rgba(217,119,54,0.35)',
        boxShadow: '0 8px 30px rgba(84, 50, 32, 0.12)',
      }}
    >
      <style>{`
        @keyframes fairyLightGlow {
          0% { opacity: 0.75; transform: translateY(0); filter: drop-shadow(0 0 3px rgba(245, 158, 11, 0.4)); }
          100% { opacity: 1; transform: translateY(-1px); filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.95)); }
        }
      `}</style>

      {/* Fairy Lights Garland (unlocked at 150 pooled points) */}
      {currentGroupPts >= 150 && (
        <div
          data-testid="fairy-lights-garland"
          className="w-full flex items-center justify-around py-1 px-3 -mt-2 -mb-2 select-none pointer-events-none"
          style={{ animation: 'fairyLightGlow 2.2s ease-in-out infinite alternate' }}
          title="Fairy lights strung across the town square"
        >
          {['✨', '💡', '🏮', '✨', '💡', '🏮', '✨', '💡', '🏮', '✨'].map((light, i) => (
            <span key={i} className="text-xs">
              {light}
            </span>
          ))}
        </div>
      )}

      {/* Board Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[--cozy-amber]/20">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-md border"
            style={{
              background: isFuturistic
                ? 'linear-gradient(135deg, #1e1060, #0d3060)'
                : 'linear-gradient(135deg, var(--cozy-gold), var(--cozy-amber))',
              borderColor: isFuturistic ? '#00dcff' : 'var(--cozy-rust)',
              color: isFuturistic ? '#00dcff' : 'var(--cozy-bark)',
            }}
          >
            <Pin className="w-5 h-5 -rotate-45" />
          </div>
          <div>
            <h3
              className="text-base font-800 leading-tight"
              style={{ color: isFuturistic ? '#00dcff' : 'var(--cozy-bark)' }}
            >
              Town Square Bulletin Board
            </h3>
            <p
              className="text-xs font-500 mt-0.5"
              style={{ color: isFuturistic ? '#80c8e0' : 'var(--cozy-muted)' }}
            >
              Admin Pinned Weekly Positive Challenges · Group Point Multiplier
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-800 transition-all hover:scale-105 active:scale-95 shadow-md border"
            style={{
              background: isFuturistic ? 'rgba(0,220,255,0.18)' : 'rgba(240,192,96,0.30)',
              color: isFuturistic ? '#00dcff' : 'var(--cozy-bark)',
              borderColor: isFuturistic ? '#00dcff' : 'var(--cozy-amber)',
            }}
          >
            <Plus size={14} /> Pin Challenge
          </button>
        )}
      </div>

      {/* Group Theme Unlock Progress Tracker */}
      <div
        className="p-3.5 rounded-2xl border"
        style={{
          background: isFuturistic ? 'rgba(0,220,255,0.06)' : 'rgba(255,255,255,0.70)',
          borderColor: isFuturistic ? 'rgba(0,220,255,0.20)' : 'rgba(217,119,54,0.20)',
        }}
      >
        <div className="flex items-center justify-between text-xs font-700">
          <span className="flex items-center gap-1.5" style={{ color: isFuturistic ? '#80c8e0' : 'var(--cozy-bark)' }}>
            <span>🎨 Theme Unlock Progress:</span>
            {isAllThemesUnlocked ? (
              <span className="font-800 text-[--cozy-amber]">✨ All Themes Unlocked!</span>
            ) : (
              <span className="font-800 text-[--cozy-amber]">{nextTheme?.emoji} {nextTheme?.name}</span>
            )}
          </span>
          <span className="font-800 text-[--cozy-gold]">
            {isAllThemesUnlocked
              ? `${currentGroupPts.toLocaleString()} pts (Max Tier)`
              : `${currentGroupPts.toLocaleString()} / ${nextTheme?.points.toLocaleString()} pts`}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-black/10 mt-2 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: isFuturistic
                ? 'linear-gradient(90deg, #00dcff, #a855f7)'
                : 'linear-gradient(90deg, var(--cozy-gold), var(--cozy-amber))',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${themeProgress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Visual Communal Milestones (Lighting lamps, Garden, Fairy Lights) */}
      <div
        data-testid="communal-village-milestones"
        className={`p-4 rounded-2xl border space-y-3 ${
          isFuturistic
            ? 'bg-cyan-950/20 border-cyan-400/20'
            : 'bg-white/80 dark:bg-stone-900/80 border-amber-600/20 dark:border-stone-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏡</span>
            <div>
              <h4
                className={`text-xs font-800 leading-tight ${
                  isFuturistic ? 'text-cyan-400' : 'text-stone-900 dark:text-stone-100'
                }`}
              >
                Village Communal Transformations
              </h4>
              <p
                className={`text-[10px] font-500 mt-0.5 ${
                  isFuturistic ? 'text-cyan-200' : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Pooled community milestones transforming shared village spaces
              </p>
            </div>
          </div>
          <span className="text-[10px] font-700 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30">
            {VILLAGE_COMMUNAL_MILESTONES.filter((m) => currentGroupPts >= m.points).length} / {VILLAGE_COMMUNAL_MILESTONES.length} Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {VILLAGE_COMMUNAL_MILESTONES.map((milestone) => {
            const isUnlocked = currentGroupPts >= milestone.points;
            const progressPct = isUnlocked
              ? 100
              : Math.min(100, Math.round((currentGroupPts / milestone.points) * 100));

            return (
              <div
                key={milestone.id}
                data-testid={`village-milestone-${milestone.id}`}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  isUnlocked
                    ? isFuturistic
                      ? 'bg-cyan-500/10 border-cyan-400/30'
                      : 'bg-amber-100/90 dark:bg-amber-950/70 border-amber-300 dark:border-amber-600/50'
                    : isFuturistic
                    ? 'bg-[#0f1d36]/40 border-cyan-400/15'
                    : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-base">{milestone.emoji}</span>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${
                        isUnlocked
                          ? 'bg-amber-300 dark:bg-amber-800 text-amber-950 dark:text-amber-100 shadow-xs'
                          : 'bg-stone-200/90 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {isUnlocked ? '✨ Transformed' : `${milestone.points.toLocaleString()} pts`}
                    </span>
                  </div>

                  <h5
                    className={`text-[11px] font-semibold mt-1.5 leading-snug ${
                      isUnlocked
                        ? 'text-amber-950 dark:text-amber-100'
                        : 'text-stone-800 dark:text-stone-100'
                    }`}
                  >
                    {milestone.name}
                  </h5>
                  <p
                    className={`text-[10px] font-medium leading-tight mt-0.5 line-clamp-2 ${
                      isUnlocked
                        ? 'text-amber-900 dark:text-amber-200/90'
                        : 'text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {milestone.description}
                  </p>
                </div>

                <div
                  className={`mt-2 pt-1.5 border-t ${
                    isUnlocked
                      ? 'border-amber-300/40 dark:border-amber-700/40'
                      : 'border-stone-200 dark:border-stone-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] font-medium mb-1">
                    <span
                      className={
                        isUnlocked
                          ? 'text-amber-950 dark:text-amber-200'
                          : 'text-stone-600 dark:text-stone-400'
                      }
                    >
                      {isUnlocked ? milestone.transformationLabel : `${currentGroupPts} / ${milestone.points} pts`}
                    </span>
                    <span
                      className={
                        isUnlocked
                          ? 'text-amber-950 dark:text-amber-200 font-semibold'
                          : 'text-stone-700 dark:text-stone-300 font-medium'
                      }
                    >
                      {isUnlocked ? 'Active' : `${milestone.points - currentGroupPts} pts left`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-amber-500"
                      style={{
                        width: `${progressPct}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Challenges List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {challenges.map((ch) => {
          const isDone = completedIds.has(ch.id);
          return (
            <motion.div
              key={ch.id}
              whileHover={{ y: -2 }}
              className={`p-4 rounded-2xl border-2 flex flex-col justify-between relative shadow-sm ${
                isFuturistic
                  ? 'bg-[#0f1d36]/70'
                  : 'bg-stone-50 dark:bg-stone-900'
              }`}
              style={{
                borderColor: isDone
                  ? '#22c55e'
                  : isFuturistic
                  ? 'rgba(0,220,255,0.25)'
                  : 'rgba(217,119,54,0.28)',
              }}
            >
              {/* Pushpin visual icon */}
              <div className="absolute top-2.5 right-3 opacity-40">
                <Pin size={14} className="text-[--cozy-rust] -rotate-12" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-800 px-2 py-0.5 rounded-full border"
                    style={{
                      background: isFuturistic ? 'rgba(0,220,255,0.12)' : 'rgba(240,192,96,0.25)',
                      color: isFuturistic ? '#00dcff' : 'var(--cozy-rust)',
                      borderColor: isFuturistic ? '#00dcff' : 'var(--cozy-amber)',
                    }}
                  >
                    {ch.multiplier}x Multiplier
                  </span>
                </div>
                <h4
                  className={`text-sm font-800 mt-2 leading-snug ${
                    isFuturistic ? 'text-cyan-100' : 'text-stone-800 dark:text-stone-100'
                  }`}
                >
                  {ch.title}
                </h4>
                <p
                  className={`text-xs font-500 mt-1 leading-relaxed ${
                    isFuturistic ? 'text-cyan-200/90' : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {ch.description}
                </p>
              </div>

              {/* Action / Completion Button */}
              <div className="pt-3 mt-3 border-t border-[--cozy-amber]/20 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] font-700 text-stone-800 dark:text-stone-200">
                  <Trophy size={13} className="text-[--cozy-gold]" />
                  <span>+15 pts & Group Boost</span>
                </div>

                <button
                  onClick={() => handleComplete(ch.id, ch.multiplier)}
                  disabled={isDone}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-800 transition-all ${
                    isDone
                      ? 'bg-green-100 text-green-800 border border-green-300 opacity-90 cursor-default'
                      : 'bg-[--cozy-amber] hover:brightness-105 active:scale-95 text-white shadow-sm'
                  }`}
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 size={14} className="text-green-700" /> Completed
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} /> Complete Challenge
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Communal Garden Blooming Vine Ribbon (unlocked at 750 points) */}
      {currentGroupPts >= 750 && (
        <div
          data-testid="communal-garden-blooming"
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-700 text-emerald-800 dark:text-emerald-300 select-none shadow-xs"
        >
          <span>🌷</span>
          <span>🌿 Communal Garden in Full Bloom: Chamomile & Lavender Blossoming 🌿</span>
          <span>🌸</span>
        </div>
      )}

      {/* Admin Pin Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-amber-50 rounded-3xl p-5 border-2 border-[--cozy-amber]/40 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[--cozy-amber]/20">
                <h4 className="text-base font-800 text-[--cozy-bark]">Pin Weekly Challenge</h4>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-[--cozy-muted] hover:text-[--cozy-bark] font-800"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="text-xs font-700 text-[--cozy-bark]">Challenge Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Clean & organize kitchen shelf 🍲"
                  className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[--cozy-amber]/30 text-xs font-500 text-[--cozy-bark] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-700 text-[--cozy-bark]">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe the therapeutic cleaning or wellness task..."
                  className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[--cozy-amber]/30 text-xs font-500 text-[--cozy-bark] focus:outline-none h-20 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-700 text-[--cozy-bark]">Multiplier (1.25x to 2.0x)</label>
                <select
                  value={newMult}
                  onChange={(e) => setNewMult(parseFloat(e.target.value))}
                  className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[--cozy-amber]/30 text-xs font-700 text-[--cozy-bark] focus:outline-none"
                >
                  <option value={1.25}>1.25x Standard Boost</option>
                  <option value={1.5}>1.50x Cozy Clean Boost</option>
                  <option value={2.0}>2.00x Mega Community Boost</option>
                </select>
              </div>

              <button
                onClick={handleCreateChallenge}
                disabled={!newTitle.trim() || !newDesc.trim()}
                className="w-full py-3 rounded-2xl bg-[--cozy-amber] hover:brightness-105 active:scale-95 text-white font-800 text-xs shadow-md transition-all mt-2"
              >
                Pin Challenge to Town Square
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
