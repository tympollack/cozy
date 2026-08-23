'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Sparkles, ArrowUpCircle, Info } from 'lucide-react';
import { upgradeGroupTier } from '@/app/actions/groupActions';
import type { GroupRow } from '@/app/actions/groupActions';
import { GROUP_TYPE_META } from '@/config/groupDefinitions';
import { AnimatedCounter } from '@/components/AnimatedCounter';

// ---------------------------------------------------------------------------
// Tier unlock thresholds for cosmetic rewards
// ---------------------------------------------------------------------------

const UNLOCK_TIERS = [
  { points: 100,  label: 'Cozy Lanterns',     emoji: '🏮', description: 'Warm ambient lighting for your map' },
  { points: 300,  label: 'Garden Plots',       emoji: '🌱', description: 'Decorative flora between tiles'    },
  { points: 500,  label: 'Sky Dome',           emoji: '🌅', description: 'Dynamic sky background themes'    },
  { points: 1200, label: 'Neon Signage',       emoji: '💡', description: 'Glowing name banners on plots'    },
  { points: 2500, label: 'Orbital Rings',      emoji: '💫', description: 'Animated particle rings around your station' },
  { points: 5000, label: 'Legendary Aura',     emoji: '👑', description: 'Golden halo on all member avatars' },
];

// Next group tier upgrade path
const UPGRADE_PATH: Record<string, string> = {
  household:    'building',
  building:     'neighborhood',
  neighborhood: 'village',
  village:      'town',
  town:         'city',
  city:         'island',
  island:       'space_station',
  space_station: '', // max tier
};

// ---------------------------------------------------------------------------
// GroupBank — Main Component
// ---------------------------------------------------------------------------

interface GroupBankProps {
  group: GroupRow;
  currentUserRole: 'admin' | 'member' | null;
  memberCount: number;
}

export function GroupBank({ group, currentUserRole, memberCount }: GroupBankProps) {
  const pooledPoints = group?.pooled_points ?? 0;
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isPendingUpgrade, startUpgradeTransition] = useTransition();
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const groupType = group?.type || 'household';
  const meta = GROUP_TYPE_META[groupType] ?? GROUP_TYPE_META['household'];
  const isFuturistic = meta.palette === 'futuristic';

  // Find next tier
  const nextType = UPGRADE_PATH[groupType];
  const nextMeta = nextType ? GROUP_TYPE_META[nextType] : null;

  // Determine unlocked cosmetics
  const currentPoints = pooledPoints ?? 0;
  const unlockedCount = UNLOCK_TIERS.filter((t) => currentPoints >= t.points).length;
  const nextUnlock = UNLOCK_TIERS.find((t) => currentPoints < t.points);
  const progressToNext = nextUnlock
    ? Math.min((currentPoints / nextUnlock.points) * 100, 100)
    : 100;

  function handleUpgrade() {
    if (!nextType || !nextMeta) return;
    setUpgradeError(null);
    startUpgradeTransition(async () => {
      const result = await upgradeGroupTier(group.id, nextType, nextMeta.minToUpgrade);
      if (!result.success) {
        setUpgradeError(result.error ?? 'Upgrade failed.');
        return;
      }
      setUpgradeSuccess(true);
    });
  }

  const cardStyle = {
    background: isFuturistic
      ? 'linear-gradient(135deg, rgba(8,15,30,0.92) 0%, rgba(10,20,45,0.95) 100%)'
      : 'rgba(250,247,242,0.80)',
    border: isFuturistic
      ? '1px solid rgba(0,220,255,0.18)'
      : '1px solid rgba(232,168,124,0.30)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: isFuturistic
      ? '0 0 30px rgba(0,220,255,0.08), 0 8px 32px rgba(0,0,0,0.40)'
      : '0 4px 24px rgba(122,79,58,0.12)',
  };

  const textPrimary = isFuturistic ? '#e0f4ff' : '#1a1410';
  const textSecondary = isFuturistic ? '#60a0bc' : '#8a7060';
  const accentColor = isFuturistic ? '#00dcff' : '#f0c060';
  const accentBg = isFuturistic ? 'rgba(0,220,255,0.12)' : 'rgba(240,192,96,0.15)';
  const accentBorder = isFuturistic ? 'rgba(0,220,255,0.30)' : 'rgba(240,192,96,0.45)';

  return (
    <div className="rounded-3xl p-5 space-y-4" style={cardStyle}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner"
            style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
          >
            <Coins size={20} style={{ color: accentColor }} />
          </div>
          <div>
            <h3 className="text-sm font-800 leading-tight" style={{ color: textPrimary }}>
              Group Treasury
            </h3>
            <p className="text-[11px] font-600 mt-0.5" style={{ color: textSecondary }}>
              Shared Co-Op Point Pool
            </p>
          </div>
        </div>

        {/* Pooled points counter */}
        <div className="text-right">
          <div className="flex items-baseline gap-0.5 justify-end">
            <span className="text-2xl font-800" style={{ color: accentColor }}>
              <AnimatedCounter value={pooledPoints} />
            </span>
            <span className="text-xs font-700 ml-1" style={{ color: textSecondary }}>
              pts
            </span>
          </div>
          <p className="text-[10px] font-600" style={{ color: textSecondary }}>
            {unlockedCount} / {UNLOCK_TIERS.length} unlocked
          </p>
        </div>
      </div>

      {/* Co-Op Point Mirroring Explanation Pill */}
      <div
        className="flex items-start gap-2 p-3 rounded-2xl border text-xs leading-relaxed"
        style={{
          background: isFuturistic ? 'rgba(0,220,255,0.06)' : 'rgba(240,192,96,0.10)',
          borderColor: isFuturistic ? 'rgba(0,220,255,0.20)' : 'rgba(232,168,124,0.30)',
          color: textSecondary,
        }}
      >
        <Sparkles size={14} className="flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
        <p className="text-[11px]">
          <strong style={{ color: textPrimary }}>Automated Co-Op Mirroring:</strong> All points earned by members across Cozy automatically mirror into your group pool! Personal and group points are separate pools.
        </p>
      </div>

      {/* Progress bar toward next unlock */}
      {nextUnlock && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span style={{ color: textSecondary }}>
              Next: {nextUnlock.emoji} {nextUnlock.label}
            </span>
            <span style={{ color: accentColor }} className="font-700">
              {pooledPoints} / {nextUnlock.points}
            </span>
          </div>
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: isFuturistic ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: isFuturistic
                  ? 'linear-gradient(90deg, #00dcff, #a855f7)'
                  : 'linear-gradient(90deg, #f0c060, #e8a87c)',
                boxShadow: isFuturistic ? '0 0 8px rgba(0,220,255,0.60)' : 'none',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
        </div>
      )}

      {/* Unlock tiers list */}
      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
        {UNLOCK_TIERS.map((tier) => {
          const unlocked = pooledPoints >= tier.points;
          return (
            <motion.div
              key={tier.label}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
              style={{
                background: unlocked
                  ? (isFuturistic ? 'rgba(0,220,255,0.08)' : 'rgba(240,192,96,0.10)')
                  : (isFuturistic ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                border: unlocked
                  ? `1px solid ${accentBorder}`
                  : `1px solid ${isFuturistic ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
              }}
              initial={false}
              animate={{ opacity: unlocked ? 1 : 0.5 }}
            >
              <span className="text-lg w-7 text-center flex-shrink-0">{tier.emoji}</span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-700 truncate"
                  style={{ color: unlocked ? textPrimary : textSecondary }}
                >
                  {tier.label}
                </p>
                <p className="text-[10px] truncate" style={{ color: textSecondary }}>
                  {unlocked ? '✓ Unlocked' : `${tier.points.toLocaleString()} pts needed`}
                </p>
              </div>
              {unlocked && (
                <Sparkles size={13} style={{ color: accentColor, flexShrink: 0 }} />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Upgrade Tier Button (Admins only, if not max scale) */}
      {currentUserRole === 'admin' && nextMeta && (
        <div className="pt-1">
          <button
            onClick={() => setShowUpgrade(true)}
            disabled={isPendingUpgrade || upgradeSuccess}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-800 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
            style={{
              background: isFuturistic ? 'rgba(168,85,247,0.22)' : 'rgba(240,192,96,0.22)',
              border: isFuturistic ? '1px solid rgba(168,85,247,0.45)' : '1px solid rgba(240,192,96,0.50)',
              color: isFuturistic ? '#c084fc' : '#9a441e',
            }}
          >
            <ArrowUpCircle size={14} />
            <span>{upgradeSuccess ? 'Scale Upgraded!' : `Upgrade Scale to ${nextMeta.emoji} ${nextMeta.label}`}</span>
          </button>
        </div>
      )}

      {/* Upgrade error / success inline */}
      <AnimatePresence>
        {(upgradeError || upgradeSuccess) && (
          <motion.p
            className="text-xs text-center font-500 rounded-xl px-3 py-2"
            style={{
              background: upgradeSuccess
                ? (isFuturistic ? 'rgba(0,220,100,0.12)' : 'rgba(100,200,100,0.12)')
                : 'rgba(220,50,50,0.10)',
              color: upgradeSuccess ? '#4ade80' : '#f87171',
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {upgradeSuccess ? `✓ Group upgraded to ${nextMeta?.label ?? 'next tier'}!` : upgradeError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Upgrade confirm inline panel */}
      <AnimatePresence>
        {showUpgrade && nextMeta && !upgradeSuccess && (
          <motion.div
            className="rounded-2xl p-4 space-y-3"
            style={{
              background: isFuturistic ? 'rgba(0,220,255,0.06)' : 'rgba(240,192,96,0.10)',
              border: `1px solid ${accentBorder}`,
            }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-xs font-600" style={{ color: textPrimary }}>
              Upgrade to <strong>{nextMeta.emoji} {nextMeta.label}</strong>?
              Requires at least <strong>{nextMeta.minToUpgrade}</strong> members
              (current: {memberCount}).
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleUpgrade}
                disabled={isPendingUpgrade}
                className="flex-1 py-2 rounded-xl text-xs font-800 disabled:opacity-50 transition-all cursor-pointer"
                style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accentColor }}
              >
                {isPendingUpgrade ? 'Upgrading…' : 'Confirm'}
              </button>
              <button
                onClick={() => { setShowUpgrade(false); setUpgradeError(null); }}
                className="flex-1 py-2 rounded-xl text-xs font-600 transition-all cursor-pointer"
                style={{ color: textSecondary }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
