'use client';

import { useState, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, TrendingUp, Sparkles, ChevronRight, ArrowUpCircle, X } from 'lucide-react';
import { contributeToGroup, upgradeGroupTier } from '@/app/actions/groupActions';
import type { GroupRow } from '@/app/actions/groupActions';
import { GROUP_TYPE_META } from '@/config/groupDefinitions';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { useModalBackButton } from '@/hooks/useModalBackButton';

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

import { useCozyStore } from '@/store/useCozyStore';

// ---------------------------------------------------------------------------
// Contribute Points Modal
// ---------------------------------------------------------------------------

interface ContributeModalProps {
  groupId: string;
  isFuturistic: boolean;
  onClose: () => void;
  onSuccess: (newPersonal: number, newPooled: number) => void;
}

function ContributeModal({ groupId, isFuturistic, onClose, onSuccess }: ContributeModalProps) {
  const userPoints = useCozyStore((s) => s.points);
  const setPoints = useCozyStore((s) => s.setPoints);

  const [amount, setAmount] = useState(10);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useModalBackButton({ isOpen: true, onClose });

  const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

  function handleContribute() {
    setError(null);
    startTransition(async () => {
      const result = await contributeToGroup(groupId, amount);
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.');
        return;
      }
      if (result.newPersonalPoints !== undefined) {
        setPoints(result.newPersonalPoints);
      }
      onSuccess(result.newPersonalPoints!, result.newPooledPoints!);
      onClose();
    });
  }

  const isInsufficient = typeof userPoints === 'number' && userPoints < amount;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm rounded-3xl p-6 space-y-5"
        style={{
          background: isFuturistic ? 'rgba(8,15,30,0.95)' : 'rgba(250,247,242,0.96)',
          border: isFuturistic ? '1px solid rgba(0,220,255,0.25)' : '1px solid rgba(232,168,124,0.35)',
          backdropFilter: 'blur(24px)',
          boxShadow: isFuturistic
            ? '0 0 40px rgba(0,220,255,0.12), 0 20px 60px rgba(0,0,0,0.60)'
            : '0 20px 60px rgba(122,79,58,0.25)',
        }}
        initial={{ y: 40, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins size={20} className={isFuturistic ? 'text-cyan-400' : 'text-[--cozy-gold]'} />
            <h3
              className="text-base font-800"
              style={{ color: isFuturistic ? '#e0f4ff' : '#7a4f3a' }}
            >
              Contribute to Group Bank
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ color: isFuturistic ? '#60b4cc' : '#8a7060' }}
          >
            <X size={18} />
          </button>
        </div>

        <p
          className="text-sm"
          style={{ color: isFuturistic ? '#60a0bc' : '#8a7060' }}
        >
          Transfer your personal points into the shared group bank to unlock cosmetic upgrades for the whole group.
        </p>

        {/* User personal point balance pill */}
        <div
          className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-2xl"
          style={{
            background: isFuturistic ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border: isFuturistic ? '1px solid rgba(0,220,255,0.15)' : '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <span style={{ color: isFuturistic ? '#8ab4c4' : '#8a7060' }}>Your personal balance</span>
          <span className="font-800 flex items-center gap-1" style={{ color: isFuturistic ? '#00dcff' : '#c4704a' }}>
            <Coins size={14} />
            {userPoints ?? 0} pts
          </span>
        </div>

        {/* Quick select buttons */}
        <div className="flex gap-2 flex-wrap">
          {QUICK_AMOUNTS.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(q)}
              className="px-3 py-1.5 rounded-full text-xs font-700 transition-all cursor-pointer"
              style={{
                background: amount === q
                  ? (isFuturistic ? 'rgba(0,220,255,0.20)' : 'rgba(240,192,96,0.25)')
                  : (isFuturistic ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                border: amount === q
                  ? (isFuturistic ? '1px solid rgba(0,220,255,0.60)' : '1px solid rgba(240,192,96,0.70)')
                  : (isFuturistic ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.10)'),
                color: amount === q
                  ? (isFuturistic ? '#00dcff' : '#c4704a')
                  : (isFuturistic ? '#8ab4c4' : '#8a7060'),
              }}
            >
              {q} pts
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div>
          <label
            className="block text-xs font-600 mb-1.5"
            style={{ color: isFuturistic ? '#60a0bc' : '#8a7060' }}
          >
            Custom amount
          </label>
          <input
            type="number"
            min={1}
            max={9999}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-600 outline-none"
            style={{
              background: isFuturistic ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              border: isFuturistic ? '1px solid rgba(0,220,255,0.20)' : '1px solid rgba(0,0,0,0.12)',
              color: isFuturistic ? '#e0f4ff' : '#1a1410',
            }}
          />
        </div>

        {isInsufficient && !error && (
          <p className="text-xs text-amber-500 font-500">
            You only have {userPoints} pts available.
          </p>
        )}

        {error && (
          <p className="text-xs text-rose-400 font-500">{error}</p>
        )}

        {/* Confirm button */}
        <button
          onClick={handleContribute}
          disabled={isPending || amount < 1 || isInsufficient}
          className="w-full py-3 rounded-2xl text-sm font-800 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          style={{
            background: isFuturistic
              ? 'linear-gradient(135deg, rgba(0,100,180,0.8), rgba(80,0,160,0.8))'
              : 'linear-gradient(135deg, #c4704a, #e8a87c)',
            color: '#fff',
            boxShadow: isFuturistic
              ? '0 0 24px rgba(0,220,255,0.25)'
              : '0 4px 16px rgba(196,112,74,0.30)',
          }}
        >
          <Coins size={16} />
          {isPending ? 'Transferring…' : `Contribute ${amount} pts`}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// GroupBank — main export
// ---------------------------------------------------------------------------

interface GroupBankProps {
  group: GroupRow;
  currentUserRole: 'admin' | 'member' | null;
  memberCount: number;
}

export function GroupBank({ group, currentUserRole, memberCount }: GroupBankProps) {
  const [pooledPoints, setPooledPoints] = useState(group?.pooled_points ?? 0);

  useEffect(() => {
    if (group?.pooled_points !== undefined) {
      setPooledPoints(group.pooled_points);
    }
  }, [group?.pooled_points]);

  const [showContribute, setShowContribute] = useState(false);
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
      : 'var(--cozy-glass-bg, rgba(255,252,247,0.88))',
    border: isFuturistic
      ? '1px solid rgba(0,220,255,0.18)'
      : '1px solid var(--cozy-glass-border, rgba(217,119,54,0.22))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: isFuturistic
      ? '0 0 30px rgba(0,220,255,0.08), 0 8px 32px rgba(0,0,0,0.40)'
      : '0 4px 24px rgba(122,79,58,0.12)',
  };

  const textPrimary = isFuturistic ? '#e0f4ff' : 'var(--cozy-text-primary, #1a1410)';
  const textSecondary = isFuturistic ? '#60a0bc' : 'var(--cozy-text-muted, #8a7060)';
  const accentColor = isFuturistic ? '#00dcff' : '#f0c060';
  const accentBg = isFuturistic ? 'rgba(0,220,255,0.12)' : 'rgba(240,192,96,0.15)';
  const accentBorder = isFuturistic ? 'rgba(0,220,255,0.30)' : 'rgba(240,192,96,0.45)';

  return (
    <>
      <div className="rounded-3xl p-5 space-y-4" style={cardStyle}>
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
            >
              <Coins size={18} style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="text-sm font-800" style={{ color: textPrimary }}>
                Group Bank
              </h3>
              <p className="text-[11px] font-500" style={{ color: textSecondary }}>
                Shared point treasury
              </p>
            </div>
          </div>

          {/* Pooled points counter */}
          <div className="text-right">
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-800" style={{ color: accentColor }}>
                <AnimatedCounter value={pooledPoints} />
              </span>
              <span className="text-xs font-600" style={{ color: textSecondary }}>
                pts
              </span>
            </div>
            <p className="text-[10px]" style={{ color: textSecondary }}>
              {unlockedCount} / {UNLOCK_TIERS.length} unlocked
            </p>
          </div>
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

        {/* Unlock tiers list (compact) */}
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
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

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {/* Contribute button */}
          <button
            onClick={() => setShowContribute(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-800 transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: isFuturistic
                ? 'linear-gradient(135deg, rgba(0,100,180,0.70), rgba(80,0,160,0.70))'
                : 'linear-gradient(135deg, #c4704a, #e8a87c)',
              color: '#fff',
              boxShadow: isFuturistic
                ? '0 0 20px rgba(0,220,255,0.20)'
                : '0 4px 12px rgba(196,112,74,0.25)',
            }}
          >
            <TrendingUp size={13} />
            Contribute
          </button>

          {/* Upgrade tier button — admin only, if not max tier */}
          {currentUserRole === 'admin' && nextMeta && (
            <button
              onClick={() => setShowUpgrade(true)}
              disabled={isPendingUpgrade || upgradeSuccess}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-800 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isFuturistic ? 'rgba(168,85,247,0.20)' : 'rgba(240,192,96,0.18)',
                border: isFuturistic ? '1px solid rgba(168,85,247,0.45)' : '1px solid rgba(240,192,96,0.50)',
                color: isFuturistic ? '#c084fc' : '#c4704a',
              }}
            >
              <ArrowUpCircle size={13} />
              {upgradeSuccess ? 'Upgraded!' : `Upgrade to ${nextMeta.emoji} ${nextMeta.label}`}
            </button>
          )}
        </div>

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
                  className="flex-1 py-2 rounded-xl text-xs font-800 disabled:opacity-50 transition-all"
                  style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accentColor }}
                >
                  {isPendingUpgrade ? 'Upgrading…' : 'Confirm'}
                </button>
                <button
                  onClick={() => { setShowUpgrade(false); setUpgradeError(null); }}
                  className="flex-1 py-2 rounded-xl text-xs font-600 transition-all"
                  style={{ color: textSecondary }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Contribute Modal */}
      <AnimatePresence>
        {showContribute && (
          <ContributeModal
            groupId={group.id}
            isFuturistic={isFuturistic}
            onClose={() => setShowContribute(false)}
            onSuccess={(newPersonal, newPooled) => {
              setPooledPoints(newPooled);
              // Could also update a Zustand slice with newPersonal here
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
