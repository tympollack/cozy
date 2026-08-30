'use client';

import React, { useState } from 'react';
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

  const currentGroupPts = groupPooledPoints !== undefined ? groupPooledPoints : (groupPoints ?? 0);
  const isAllThemesUnlocked = currentGroupPts >= 10000;
  const nextTheme = THEME_UNLOCK_THRESHOLDS.find((t) => currentGroupPts < t.points);
  const prevPoints = THEME_UNLOCK_THRESHOLDS.filter((t) => currentGroupPts >= t.points).slice(-1)[0]?.points ?? 0;
  const themeProgress = isAllThemesUnlocked
    ? 100
    : nextTheme && nextTheme.points > prevPoints
    ? Math.min(100, Math.max(0, Math.round(((currentGroupPts - prevPoints) / (nextTheme.points - prevPoints)) * 100)))
    : 100;

  async function handleComplete(chId: string, mult: number) {
    if (completedIds.has(chId)) return;

    const bonusGroupPts = Math.round(25 * mult);

    // Optimistic UI update
    setCompletedIds((prev) => new Set(prev).add(chId));
    addPoints(15);
    addGroupPoints(bonusGroupPts);

    try {
      const res = await completeGroupChallenge(groupId, chId);
      if (res.success) {
        if (res.newPersonalPoints !== undefined) setPointsInStore(res.newPersonalPoints);
        if (res.newGroupPoints !== undefined) setGroupPoints(res.newGroupPoints);
      } else {
        // Rollback optimistic state on rejected action
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(chId);
          return next;
        });
        addPoints(-15);
        addGroupPoints(-bonusGroupPts);
      }
    } catch {
      // Rollback optimistic state on error
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(chId);
        return next;
      });
      addPoints(-15);
      addGroupPoints(-bonusGroupPts);
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

      {/* Challenges List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {challenges.map((ch) => {
          const isDone = completedIds.has(ch.id);
          return (
            <motion.div
              key={ch.id}
              whileHover={{ y: -2 }}
              className="p-4 rounded-2xl border-2 flex flex-col justify-between relative shadow-sm"
              style={{
                background: isFuturistic
                  ? 'rgba(15,29,54,0.70)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(254,249,235,0.90) 100%)',
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
                  className="text-sm font-800 mt-2 leading-snug"
                  style={{ color: isFuturistic ? '#e0f4ff' : 'var(--cozy-bark)' }}
                >
                  {ch.title}
                </h4>
                <p
                  className="text-xs font-500 mt-1 leading-relaxed opacity-90"
                  style={{ color: isFuturistic ? '#90c0d8' : 'var(--cozy-muted)' }}
                >
                  {ch.description}
                </p>
              </div>

              {/* Action / Completion Button */}
              <div className="pt-3 mt-3 border-t border-[--cozy-amber]/20 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] font-700 text-[--cozy-bark]">
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
